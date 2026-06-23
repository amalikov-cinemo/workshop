# agent-ci-triage

A non-interactive **CI failure triage agent**. It reads a PR diff + the failed
CI log, asks the **local Claude Code CLI** for a structured verdict, then
**enforces policy in code** before deciding an action. No API key — it reuses
the participant's existing Claude Code auth.

## The loop

```
Observe   read diff + ci-log + policy
   │
Plan      claude -p  → structured verdict (--json-schema)   [read-only, --permission-mode plan]
   │
Check     enforcePolicy(): override risk in CODE, not prompt
   │
Report    Markdown PR comment + audit trail + exit code
   │
(Act)     optional L2: open a DRAFT PR for low-risk only
```

The model's self-assessment is **never trusted** for gating. `enforcePolicy()`:

- forces `escalate` for billing / auth / migration paths (from `policies/ci-triage.json` + CODEOWNERS),
- independently scans inputs for **prompt injection** and refuses to act if found,
- caps `review` mode (L1) to read-only `comment_only`,
- never auto-drafts a PR below the confidence threshold.

## Usage

```bash
npm run build

# Offline (recorded model verdict — no Claude Code needed):
node packages/agent-ci-triage/dist/cli.js \
  --diff examples/pr-vat-change.diff \
  --ci-log examples/failed-ci-vat.log \
  --mode fix \
  --replay packages/agent-ci-triage/fixtures/model-verdict-vat.json

# Live (uses your installed Claude Code, no API key):
node packages/agent-ci-triage/dist/cli.js \
  --diff examples/pr-low-risk.diff \
  --ci-log examples/failed-ci-low.log \
  --mode review --model sonnet --max-budget-usd 0.50 \
  --out .agent-runs/low
```

### Flags

| Flag | Meaning |
| --- | --- |
| `--diff`, `--ci-log` | the untrusted inputs |
| `--mode review\|fix` | L1 read-only vs L2 (may draft a PR) |
| `--replay <verdict.json>` | offline: use a recorded model verdict |
| `--model`, `--max-budget-usd` | passed to `claude -p` |
| `--out <dir>` | write `report.md`, `verdict.json`, `audit.json` |
| `--apply --repo <dir>` | L2 only: run the constrained fix agent on a checked-out branch |

### Exit codes

`0` report only · `10` draft-PR eligible · `20` escalate. The surrounding
pipeline (GitHub Action) branches on these.

## Tests

`npm test` runs the **golden eval** (`policy.test.ts`) and the **pipeline test**
(`triage.test.ts`, replay mode) — fully deterministic, no network. This is how
you regression-test a non-deterministic agent: pin the model output, assert the
harness behaviour.
