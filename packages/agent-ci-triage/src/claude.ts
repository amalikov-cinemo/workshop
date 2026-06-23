import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { ModelVerdict } from "./types.js";

export interface ClaudeOptions {
  model?: string;
  maxBudgetUsd?: number;
  cwd?: string;
  /** When set, skip the live call and return a recorded verdict (offline demo). */
  replayFile?: string;
}

export interface ClaudeResult {
  verdict: ModelVerdict;
  costUsd: number;
  durationMs: number;
  /** The full envelope, kept for the audit trail. */
  raw: unknown;
}

/**
 * Run the ANALYSIS step by shelling out to the local Claude Code CLI in
 * non-interactive mode. The agent never uses an API key — it reuses the
 * participant's existing Claude Code auth.
 *
 * Guardrails expressed as flags:
 *   --permission-mode plan   read-only; the model cannot edit/run/commit
 *   --json-schema            forces the structured output contract
 *   --max-budget-usd         bounded cost
 */
export function runClaudeAnalysis(
  systemPrompt: string,
  userPrompt: string,
  schema: unknown,
  opts: ClaudeOptions = {},
): ClaudeResult {
  if (opts.replayFile) {
    const verdict = JSON.parse(readFileSync(opts.replayFile, "utf8")) as ModelVerdict;
    return { verdict, costUsd: 0, durationMs: 0, raw: { replay: opts.replayFile } };
  }

  const args = [
    "-p",
    "--output-format",
    "json",
    "--json-schema",
    JSON.stringify(schema),
    "--append-system-prompt",
    systemPrompt,
    "--permission-mode",
    "plan",
    "--no-session-persistence",
  ];
  if (opts.model) args.push("--model", opts.model);
  if (opts.maxBudgetUsd) args.push("--max-budget-usd", String(opts.maxBudgetUsd));

  const res = spawnSync("claude", args, {
    input: userPrompt,
    encoding: "utf8",
    cwd: opts.cwd,
    maxBuffer: 16 * 1024 * 1024,
  });

  if (res.error) {
    throw new Error(`Failed to launch 'claude' CLI: ${res.error.message}. Is Claude Code installed and on PATH?`);
  }
  if (res.status !== 0) {
    throw new Error(`claude exited with code ${res.status}.\n${res.stderr || res.stdout}`);
  }

  let envelope: {
    is_error?: boolean;
    result?: string;
    structured_output?: ModelVerdict;
    total_cost_usd?: number;
    duration_ms?: number;
  };
  try {
    envelope = JSON.parse(res.stdout);
  } catch {
    throw new Error(`Could not parse claude output as JSON:\n${res.stdout.slice(0, 2000)}`);
  }
  if (envelope.is_error) {
    throw new Error(`claude reported an error: ${envelope.result ?? "unknown"}`);
  }
  if (!envelope.structured_output) {
    throw new Error(`claude returned no structured_output. Raw result: ${envelope.result ?? "(none)"}`);
  }

  return {
    verdict: envelope.structured_output,
    costUsd: envelope.total_cost_usd ?? 0,
    durationMs: envelope.duration_ms ?? 0,
    raw: envelope,
  };
}

/**
 * Run the optional FIX step (autonomy level L2). Only invoked for a verdict
 * that policy enforcement left as `open_draft_pr`. The model may edit files and
 * run the tests, but git/push/publish are denied — the harness, not the model,
 * decides what happens to the branch afterwards.
 */
export function runClaudeFix(
  instruction: string,
  repoDir: string,
  opts: ClaudeOptions = {},
): { costUsd: number; raw: unknown } {
  const args = [
    "-p",
    "--output-format",
    "json",
    "--append-system-prompt",
    "You are a fix agent. Make the failing tests pass with the SMALLEST possible change. " +
      "You may edit test/formatting files and run the test command. You must NOT change billing/tax logic, " +
      "and you must NOT run git, push, merge, or publish. Stop as soon as the tests pass.",
    "--permission-mode",
    "acceptEdits",
    "--allowedTools",
    "Read Edit Bash(npm test:*) Bash(npx vitest:*)",
    "--disallowedTools",
    "Bash(git:*) Bash(npm publish:*) Bash(gh:*) WebFetch WebSearch",
    "--add-dir",
    repoDir,
    "--no-session-persistence",
  ];
  if (opts.model) args.push("--model", opts.model);
  if (opts.maxBudgetUsd) args.push("--max-budget-usd", String(opts.maxBudgetUsd));

  const res = spawnSync("claude", args, {
    input: instruction,
    encoding: "utf8",
    cwd: repoDir,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (res.error) throw new Error(`Failed to launch 'claude' CLI: ${res.error.message}`);
  if (res.status !== 0) throw new Error(`claude fix exited with code ${res.status}.\n${res.stderr || res.stdout}`);

  let envelope: { total_cost_usd?: number } = {};
  try {
    envelope = JSON.parse(res.stdout);
  } catch {
    /* fix step output is not contract-bound; ignore parse errors */
  }
  return { costUsd: envelope.total_cost_usd ?? 0, raw: res.stdout };
}
