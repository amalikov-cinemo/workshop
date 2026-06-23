import { runClaudeAnalysis, type ClaudeOptions, type ClaudeResult } from "./claude.js";
import { enforcePolicy, parseDiffPaths } from "./policy.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompt.js";
import { renderReport } from "./render.js";
import { verdictSchema } from "./schema.js";
import type { FinalVerdict, Mode, Policy } from "./types.js";

export interface TriageRequest {
  diff: string;
  ciLog: string;
  policyText: string;
  policy: Policy;
  mode: Mode;
  claude?: ClaudeOptions;
}

export interface TriageResult {
  verdict: FinalVerdict;
  report: string;
  claude: ClaudeResult;
}

/** The agent loop for one CI failure: Observe -> (model) Plan -> Check (enforce) -> Report. */
export function triage(req: TriageRequest): TriageResult {
  const diffPaths = parseDiffPaths(req.diff);
  const inputs = {
    diff: req.diff,
    ciLog: req.ciLog,
    policyText: req.policyText,
    policy: req.policy,
    mode: req.mode,
    diffPaths,
  };

  const systemPrompt = buildSystemPrompt(req.policyText);
  const userPrompt = buildUserPrompt(inputs);

  const claude = runClaudeAnalysis(systemPrompt, userPrompt, verdictSchema, req.claude);
  const verdict = enforcePolicy(claude.verdict, inputs);
  const report = renderReport(verdict);

  return { verdict, report, claude };
}
