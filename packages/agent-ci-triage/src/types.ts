/** The bounded unit of work this agent performs: triage one CI failure. */

export type FailureCategory =
  | "test_outdated"
  | "code_bug"
  | "flaky"
  | "dependency"
  | "environment";

export type RiskLevel = "low" | "medium" | "high";

export type Action = "comment_only" | "open_draft_pr" | "escalate";

/** Autonomy level of the run. review = L1 (read-only), fix = L2 (may draft a PR). */
export type Mode = "review" | "fix";

/**
 * What the model returns — validated against the JSON schema by `claude -p
 * --json-schema`. This is the model's *self-assessment*; the harness does not
 * trust it for risk gating.
 */
export interface ModelVerdict {
  summary: string;
  failure_category: FailureCategory;
  risk_level: RiskLevel;
  confidence: number;
  affected_components: string[];
  root_cause_hypothesis: string;
  proposed_fix: string;
  recommended_action: Action;
  requires_human_approval: boolean;
  injection_detected: boolean;
  citations: string[];
}

/** A path-based rule from the policy. */
export interface PathRule {
  pattern: string;
  component: string;
  owners?: string[];
  reason?: string;
}

export interface Policy {
  confidenceThreshold: number;
  maxDraftPrsPerFailure: number;
  highRiskPaths: PathRule[];
  lowRiskPaths: PathRule[];
  injectionPatterns: string[];
}

/**
 * The model verdict after the harness has enforced policy in code. The final
 * fields are what the workflow acts on; the model's originals are preserved for
 * the audit trail.
 */
export interface FinalVerdict extends ModelVerdict {
  mode: Mode;
  final_risk_level: RiskLevel;
  final_action: Action;
  /** True when the harness overrode the model's risk or action. */
  overridden: boolean;
  /** Human-readable reasons for each override / enforcement decision. */
  enforcement_notes: string[];
  /** Owners that must approve, derived from CODEOWNERS-style path rules. */
  required_approvers: string[];
}

export interface TriageInputs {
  diff: string;
  ciLog: string;
  policyText: string;
  policy: Policy;
  mode: Mode;
  /** File paths touched by the diff (parsed from the diff). */
  diffPaths: string[];
}
