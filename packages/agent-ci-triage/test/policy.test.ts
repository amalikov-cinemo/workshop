import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { enforcePolicy, loadPolicy, parseDiffPaths, detectInjection } from "../src/policy.js";
import type { ModelVerdict, Mode, TriageInputs } from "../src/types.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const read = (p: string) => readFileSync(resolve(repoRoot, p), "utf8");
const policy = loadPolicy(resolve(repoRoot, "policies/ci-triage.json"));
const policyText = read("policies/ci-triage.md");

function inputsFor(diffFile: string, logFile: string, mode: Mode): TriageInputs {
  const diff = read(`examples/${diffFile}`);
  return {
    diff,
    ciLog: read(`examples/${logFile}`),
    policyText,
    policy,
    mode,
    diffPaths: parseDiffPaths(diff),
  };
}

function modelVerdict(name: string): ModelVerdict {
  return JSON.parse(read(`packages/agent-ci-triage/fixtures/${name}`)) as ModelVerdict;
}

describe("parseDiffPaths", () => {
  it("extracts touched file paths from a unified diff", () => {
    const diff = read("examples/pr-vat-change.diff");
    expect(parseDiffPaths(diff)).toContain("packages/invoice-service/src/billing.ts");
  });
});

describe("detectInjection", () => {
  it("flags injection text in the CI log", () => {
    const log = read("examples/failed-ci-injection.log");
    expect(detectInjection(log, policy.injectionPatterns).length).toBeGreaterThan(0);
  });
  it("does not flag a clean log", () => {
    const log = read("examples/failed-ci-low.log");
    expect(detectInjection(log, policy.injectionPatterns)).toHaveLength(0);
  });
});

describe("enforcePolicy — golden cases", () => {
  it("low-risk (format) in fix mode → keeps open_draft_pr", () => {
    const v = enforcePolicy(modelVerdict("model-verdict-low.json"), inputsFor("pr-low-risk.diff", "failed-ci-low.log", "fix"));
    expect(v.final_risk_level).toBe("low");
    expect(v.final_action).toBe("open_draft_pr");
    expect(v.overridden).toBe(false);
  });

  it("low-risk in review mode (L1) → downgraded to comment_only", () => {
    const v = enforcePolicy(modelVerdict("model-verdict-low.json"), inputsFor("pr-low-risk.diff", "failed-ci-low.log", "review"));
    expect(v.final_action).toBe("comment_only");
    expect(v.overridden).toBe(true);
  });

  it("billing (VAT) → harness forces high + escalate even though the model said medium/open_draft_pr", () => {
    const model = modelVerdict("model-verdict-vat.json");
    expect(model.recommended_action).toBe("open_draft_pr"); // model under-estimated
    const v = enforcePolicy(model, inputsFor("pr-vat-change.diff", "failed-ci-vat.log", "fix"));
    expect(v.final_risk_level).toBe("high");
    expect(v.final_action).toBe("escalate");
    expect(v.overridden).toBe(true);
    expect(v.required_approvers).toContain("@billing");
    expect(v.requires_human_approval).toBe(true);
  });

  it("injection → harness catches it even though the model missed it, and never drafts a PR", () => {
    const model = modelVerdict("model-verdict-injection.json");
    expect(model.injection_detected).toBe(false); // model was fooled
    const v = enforcePolicy(model, inputsFor("pr-low-risk.diff", "failed-ci-injection.log", "fix"));
    expect(v.injection_detected).toBe(true);
    expect(v.final_action).not.toBe("open_draft_pr");
    expect(v.enforcement_notes.join(" ")).toMatch(/injection/i);
  });

  it("low confidence → never auto-drafts a PR", () => {
    const model = { ...modelVerdict("model-verdict-low.json"), confidence: 0.4 };
    const v = enforcePolicy(model, inputsFor("pr-low-risk.diff", "failed-ci-low.log", "fix"));
    expect(v.final_action).toBe("comment_only");
  });
});
