import type { FinalVerdict } from "./types.js";

const RISK_BADGE: Record<string, string> = {
  low: "🟢 LOW",
  medium: "🟡 MEDIUM",
  high: "🔴 HIGH",
};

const ACTION_LABEL: Record<string, string> = {
  comment_only: "💬 Report only — human decides",
  open_draft_pr: "📝 Open draft PR (for human review)",
  escalate: "🚨 Escalate to a human owner",
};

/** Render the final verdict as a Markdown PR comment. */
export function renderReport(v: FinalVerdict): string {
  const lines: string[] = [];
  lines.push("## 🤖 CI Failure Triage");
  lines.push("");
  lines.push(`**Risk:** ${RISK_BADGE[v.final_risk_level]}  |  **Confidence:** ${(v.confidence * 100).toFixed(0)}%  |  **Category:** \`${v.failure_category}\``);
  lines.push(`**Recommended action:** ${ACTION_LABEL[v.final_action]}`);
  lines.push("");
  lines.push(`**Summary.** ${v.summary}`);
  lines.push("");
  lines.push(`**Root cause hypothesis.** ${v.root_cause_hypothesis}`);
  lines.push("");
  lines.push(`**Proposed fix.** ${v.proposed_fix}`);

  if (v.affected_components.length) {
    lines.push("");
    lines.push(`**Affected components:** ${v.affected_components.map((c) => `\`${c}\``).join(", ")}`);
  }
  if (v.required_approvers.length) {
    lines.push(`**Required approvers:** ${v.required_approvers.join(", ")}`);
  }

  if (v.injection_detected) {
    lines.push("");
    lines.push("> ⚠️ **Prompt injection detected in the inputs.** The agent treated it as data and did not act on it.");
  }

  if (v.overridden) {
    lines.push("");
    lines.push("<details><summary>🔒 Harness overrode the model's self-assessment</summary>");
    lines.push("");
    lines.push(`- Model said: risk \`${v.risk_level}\`, action \`${v.recommended_action}\``);
    lines.push(`- Enforced:  risk \`${v.final_risk_level}\`, action \`${v.final_action}\``);
    lines.push("");
    for (const note of v.enforcement_notes) lines.push(`- ${note}`);
    lines.push("</details>");
  }

  if (v.citations.length) {
    lines.push("");
    lines.push(`<sub>Citations: ${v.citations.map((c) => `\`${c}\``).join(", ")}</sub>`);
  }

  lines.push("");
  lines.push("<sub>🔒 Read-only triage. No merge, no push, no production access. Generated non-interactively.</sub>");
  return lines.join("\n");
}
