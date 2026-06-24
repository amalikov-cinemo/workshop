# Handout · AI SDLC Pipeline Design Template

The take-home artifact. Fill one of these in per pipeline. If you can't fill a
field, that's a finding — it's a hole in the design.

```
Pipeline name:
Trigger:
Business goal:
Agent task:
Input context:
Allowed tools:
Forbidden actions:
Execution environment:
Output format:
Risk classification:
Human approval gates:
Security guardrails:
Failure handling:
Audit log:
Success metrics:
```

---

## Worked example — CI Failure Triage Agent

```
Pipeline name:
  CI Failure Triage Agent

Trigger:
  GitHub Actions workflow failed on a PR.

Business goal:
  Reduce developer time spent on CI failure analysis.

Agent task:
  Analyze failed job logs and the PR diff. Classify the failure. Suggest a fix.
  Open a draft PR only for low-risk changes.

Input context:
  - PR diff
  - failed job logs / test output
  - package lock changes
  - repository guidelines + CODEOWNERS

Allowed tools:
  - read repository
  - run tests
  - create branch
  - open draft PR
  - comment on PR

Forbidden actions:
  - merge PR
  - push to protected branches
  - access production secrets
  - change infrastructure manifests without approval
  - modify billing / security / privacy logic

Execution environment:
  Ephemeral sandbox without production credentials.

Output format:
  Structured markdown comment: summary · root-cause hypothesis · confidence ·
  affected files · proposed fix · next action.   (+ machine-readable verdict JSON)

Risk classification:
  Low    — tests / docs / config only.
  Medium — application logic change.
  High   — auth, billing, security, DB migration, public API.

Human approval gates:
  - any medium/high-risk fix
  - any production-facing change
  - any dependency upgrade
  - any security-related change

Failure handling:
  If confidence < 0.7, post a report only.
  If the failure repeats after a fix, stop and escalate.
  Max 1 draft PR per CI failure.

Audit log:
  Store trigger, prompt, context references, actions, output, commit hash, cost.

Success metrics:
  - time to diagnose a CI failure
  - correct-classification rate
  - accepted-draft-fix rate
  - false positive rate
  - developer satisfaction
```

> This exact pipeline is implemented in `packages/agent-ci-triage` — run
> `./scripts/demo.sh` to see the verdicts it produces.
