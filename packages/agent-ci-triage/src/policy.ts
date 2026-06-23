import { readFileSync } from "node:fs";
import type {
  FinalVerdict,
  ModelVerdict,
  PathRule,
  Policy,
  TriageInputs,
} from "./types.js";

export function loadPolicy(jsonPath: string): Policy {
  const raw = JSON.parse(readFileSync(jsonPath, "utf8")) as Policy;
  return raw;
}

/** Extract the file paths a unified diff touches (the `+++ b/...` lines). */
export function parseDiffPaths(diff: string): string[] {
  const paths = new Set<string>();
  for (const line of diff.split("\n")) {
    const m = line.match(/^\+\+\+ b\/(.+)$/);
    if (m && m[1] !== "/dev/null") paths.add(m[1].trim());
  }
  return [...paths];
}

function matchRules(paths: string[], rules: PathRule[]): Array<{ path: string; rule: PathRule }> {
  const hits: Array<{ path: string; rule: PathRule }> = [];
  for (const rule of rules) {
    const re = new RegExp(rule.pattern, "i");
    for (const path of paths) {
      if (re.test(path)) hits.push({ path, rule });
    }
  }
  return hits;
}

/** Find injection-looking text in untrusted input. Returns the matched snippets. */
export function detectInjection(text: string, patterns: string[]): string[] {
  const found: string[] = [];
  for (const pattern of patterns) {
    const re = new RegExp(pattern, "i");
    const m = text.match(re);
    if (m) found.push(m[0]);
  }
  return found;
}

const RISK_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2 };

/**
 * Apply policy in code, AFTER the model has answered. The model's risk_level
 * and recommended_action are starting points only — these rules can override
 * them. This is "defense in depth": even a confidently-wrong or manipulated
 * model cannot get the harness to take an unsafe action.
 */
export function enforcePolicy(model: ModelVerdict, inputs: TriageInputs): FinalVerdict {
  const { policy, mode, diffPaths } = inputs;
  const notes: string[] = [];
  const approvers = new Set<string>();

  let risk = model.risk_level;
  let action = model.recommended_action;

  // 1. Independent injection scan over ALL untrusted input (model may have missed it).
  const injected = detectInjection(`${inputs.ciLog}\n${inputs.diff}`, policy.injectionPatterns);
  const injectionDetected = model.injection_detected || injected.length > 0;
  if (injected.length > 0) {
    notes.push(
      `Injection attempt detected in untrusted input and ignored: "${injected[0]}". Treated as data; no instruction followed.`,
    );
    // Never take an automated write action when inputs are trying to manipulate us.
    if (action === "open_draft_pr") action = "comment_only";
  }

  // 2. High-risk path override (billing / auth / migrations).
  const highHits = matchRules(diffPaths, policy.highRiskPaths);
  if (highHits.length > 0) {
    if (RISK_ORDER[risk] < RISK_ORDER.high) risk = "high";
    action = "escalate";
    for (const { path, rule } of highHits) {
      (rule.owners ?? []).forEach((o) => approvers.add(o));
      notes.push(
        `High-risk path touched: ${path} (${rule.component}). ${rule.reason ?? ""} -> escalate to ${(rule.owners ?? []).join(", ") || "a human"}.`,
      );
    }
  } else {
    // Record low-risk owners for the report when nothing high-risk is involved.
    for (const { rule } of matchRules(diffPaths, policy.lowRiskPaths)) {
      (rule.owners ?? []).forEach((o) => approvers.add(o));
    }
  }

  // 3. Confidence gate: below threshold we never auto-draft a fix.
  if (model.confidence < policy.confidenceThreshold && action === "open_draft_pr") {
    action = "comment_only";
    notes.push(
      `Confidence ${model.confidence} below threshold ${policy.confidenceThreshold}; downgraded to comment_only.`,
    );
  }

  // 4. Autonomy cap: review mode (L1) is read-only, it can never draft a PR.
  if (mode === "review" && action === "open_draft_pr") {
    action = "comment_only";
    notes.push("Run mode is 'review' (L1, read-only): a draft PR is not permitted; downgraded to comment_only.");
  }

  const overridden = risk !== model.risk_level || action !== model.recommended_action;

  return {
    ...model,
    injection_detected: injectionDetected,
    mode,
    final_risk_level: risk,
    final_action: action,
    requires_human_approval: action !== "open_draft_pr" || model.requires_human_approval,
    overridden,
    enforcement_notes: notes,
    required_approvers: [...approvers],
  };
}
