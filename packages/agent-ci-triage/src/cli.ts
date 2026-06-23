#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { loadPolicy } from "./policy.js";
import { triage } from "./triage.js";
import { runClaudeFix } from "./claude.js";
import type { Mode } from "./types.js";

interface Args {
  diff: string;
  ciLog: string;
  policy: string;
  policyRules: string;
  mode: Mode;
  replay?: string;
  model?: string;
  maxBudgetUsd?: number;
  out?: string;
  apply: boolean;
  repo?: string;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const has = (flag: string) => argv.includes(flag);

  const diff = get("--diff");
  const ciLog = get("--ci-log");
  if (!diff || !ciLog) {
    throw new Error(
      "Usage: agent-ci-triage --diff <file> --ci-log <file> [--mode review|fix]\n" +
        "  [--policy <md>] [--policy-rules <json>] [--replay <verdict.json>]\n" +
        "  [--model <name>] [--max-budget-usd <n>] [--out <dir>] [--apply --repo <dir>]",
    );
  }
  const mode = (get("--mode") as Mode) ?? "review";
  if (mode !== "review" && mode !== "fix") throw new Error(`--mode must be 'review' or 'fix', got '${mode}'`);

  const budget = get("--max-budget-usd");
  return {
    diff,
    ciLog,
    policy: get("--policy") ?? "policies/ci-triage.md",
    policyRules: get("--policy-rules") ?? "policies/ci-triage.json",
    mode,
    replay: get("--replay"),
    model: get("--model") ?? process.env.AGENT_MODEL,
    maxBudgetUsd: budget ? Number(budget) : undefined,
    out: get("--out"),
    apply: has("--apply"),
    repo: get("--repo"),
  };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  const result = triage({
    diff: readFileSync(args.diff, "utf8"),
    ciLog: readFileSync(args.ciLog, "utf8"),
    policyText: readFileSync(args.policy, "utf8"),
    policy: loadPolicy(args.policyRules),
    mode: args.mode,
    claude: {
      replayFile: args.replay,
      model: args.model,
      maxBudgetUsd: args.maxBudgetUsd,
    },
  });

  // 1. The human-facing report (would be posted as a PR comment).
  process.stdout.write(result.report + "\n");

  // 2. Audit trail — every run is reproducible: inputs, model verdict, enforced
  //    verdict, cost. This is the "all actions must be auditable" guardrail.
  const audit = {
    inputs: { diff: args.diff, ciLog: args.ciLog, policy: args.policy, mode: args.mode },
    model_self_assessment: {
      risk_level: result.verdict.risk_level,
      recommended_action: result.verdict.recommended_action,
      confidence: result.verdict.confidence,
      injection_detected_by_model: result.claude.verdict.injection_detected,
    },
    enforced_verdict: result.verdict,
    cost_usd: result.claude.costUsd,
    duration_ms: result.claude.durationMs,
  };
  if (args.out) {
    mkdirSync(args.out, { recursive: true });
    writeFileSync(resolve(args.out, "report.md"), result.report);
    writeFileSync(resolve(args.out, "verdict.json"), JSON.stringify(result.verdict, null, 2));
    writeFileSync(resolve(args.out, "audit.json"), JSON.stringify(audit, null, 2));
    process.stderr.write(`\nAudit trail written to ${args.out}\n`);
  }

  // 3. Exit code signals the decided action to the surrounding pipeline.
  //    0 = report only, 10 = draft PR eligible, 20 = escalate.
  const v = result.verdict;
  process.stderr.write(
    `\n[decision] risk=${v.final_risk_level} action=${v.final_action} ` +
      `approvers=${v.required_approvers.join(",") || "-"} cost=$${result.claude.costUsd.toFixed(4)}\n`,
  );

  // 4. Optional L2 fix path — only when policy left the action as open_draft_pr.
  if (v.final_action === "open_draft_pr" && args.apply) {
    if (args.mode !== "fix") throw new Error("--apply requires --mode fix");
    if (!args.repo) throw new Error("--apply requires --repo <dir> (the checked-out PR branch)");
    process.stderr.write("[fix] low-risk + eligible: invoking constrained fix agent (no git/push allowed)...\n");
    const fix = runClaudeFix(
      `CI is failing on a low-risk change. ${v.proposed_fix}\n` +
        `Make the smallest change to turn the tests green, then stop. Do not touch billing logic.`,
      resolve(args.repo),
      { model: args.model, maxBudgetUsd: args.maxBudgetUsd },
    );
    process.stderr.write(
      `[fix] done (cost $${fix.costUsd.toFixed(4)}). Review the working tree, then open a DRAFT PR for human approval.\n`,
    );
  }

  process.exit(v.final_action === "escalate" ? 20 : v.final_action === "open_draft_pr" ? 10 : 0);
}

main();
