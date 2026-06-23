import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { triage } from "../src/triage.js";
import { loadPolicy } from "../src/policy.js";
import type { Mode } from "../src/types.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const read = (p: string) => readFileSync(resolve(repoRoot, p), "utf8");
const policy = loadPolicy(resolve(repoRoot, "policies/ci-triage.json"));
const policyText = read("policies/ci-triage.md");
const fixture = (n: string) => resolve(repoRoot, `packages/agent-ci-triage/fixtures/${n}`);

function run(diffFile: string, logFile: string, mode: Mode, replay: string) {
  return triage({
    diff: read(`examples/${diffFile}`),
    ciLog: read(`examples/${logFile}`),
    policyText,
    policy,
    mode,
    claude: { replayFile: fixture(replay) },
  });
}

// Full pipeline (analyze via replay -> enforce -> render), offline & deterministic.
describe("triage pipeline (replay)", () => {
  it("billing → escalate, report shows the override and required approvers", () => {
    const { verdict, report } = run("pr-vat-change.diff", "failed-ci-vat.log", "fix", "model-verdict-vat.json");
    expect(verdict.final_action).toBe("escalate");
    expect(report).toContain("Escalate");
    expect(report).toContain("@finance-approver");
    expect(report).toContain("overrode the model");
  });

  it("low-risk fix → draft PR, no override", () => {
    const { verdict, report } = run("pr-low-risk.diff", "failed-ci-low.log", "fix", "model-verdict-low.json");
    expect(verdict.final_action).toBe("open_draft_pr");
    expect(report).toContain("Open draft PR");
  });

  it("injection → report only and an explicit injection warning", () => {
    const { verdict, report } = run("pr-low-risk.diff", "failed-ci-injection.log", "fix", "model-verdict-injection.json");
    expect(verdict.final_action).toBe("comment_only");
    expect(report).toContain("injection detected");
  });
});
