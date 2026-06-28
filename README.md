# Building Agentic AI SDLC Pipelines — Workshop

A hands-on workshop on designing **safe, event-driven AI workflows** for software
delivery. The running example is a small `invoice-service` and a **CI failure
triage agent** that is driven by the **local Claude Code CLI** the participants
already have installed — **no API keys are distributed**.

> Central frame: **Agentic SDLC = Loop + Harness + Trigger + Guardrails + Human Gates.**
> The agent does one bounded, verifiable unit of work. Humans own risk.

## Why the Claude Code CLI (and not raw API keys)

The reference agent is a thin wrapper around `claude -p` (non-interactive mode).
This means the abstract workshop concepts map onto real flags participants can run:

| Concept | Real `claude -p` flag |
| --- | --- |
| Non-interactive agent | `-p --output-format json` |
| Structured output contract | `--json-schema '{...}'` |
| Read-only by default (L1) | `--permission-mode plan` |
| Allowed / forbidden actions | `--allowedTools` / `--disallowedTools` |
| What the agent can see (harness) | `--add-dir`, `--mcp-config`, `--settings` |
| Policy over untrusted input | `--append-system-prompt` |
| Bounded execution | `--max-budget-usd` + wrapper timeout |

## Repository layout

```
packages/invoice-service/   Toy billing service (VAT logic) — the harness under test
packages/agent-ci-triage/   CI-triage agent: wraps `claude -p` (built in a later step)
examples/                   Recorded diffs / CI logs / agent outputs for offline demo
policies/                   Risk rules + forbidden actions for the agent
slides/                     Marp theory slides
handouts/                   Design template, trigger matrix, challenge questions
.github/workflows/          Real CI + agent-triage trigger
```

## Quick start

```bash
npm install
npm run build
npm test          # all green on main
```

## The teaching scenario

Two prepared pull requests both make CI fail, but they are **not** the same risk:

- **Low-risk PR** — breaks a trivial summary/formatting test. Safe for the agent to
  propose a fix as a **draft PR** (autonomy level L2).
- **VAT-change PR** — changes the VAT rate (19% → 20%). The fix looks trivial, but
  this is **billing logic**: the agent must **escalate to a human**, never auto-fix.

The contrast between these two PRs is the entire lesson: *AI prepares, humans own
billing/security/privacy risk.*

## Run the demo

```bash
./scripts/demo.sh          # offline (recorded verdicts — no Claude Code needed)
./scripts/demo.sh --live   # real claude -p, using your installed Claude Code
```

Three scenarios, one agent, one policy — the **outcome** differs because of
**what** each PR changes:

| Scenario | Touches | Verdict | Exit |
| --- | --- | --- | --- |
| Summary formatting | `format.ts` | 🟢 LOW → draft PR | 10 |
| VAT 19% → 20% | `billing.ts` | 🔴 HIGH → escalate | 20 |
| Prompt injection in the log | — | caught, report-only | 0 |

See `packages/agent-ci-triage/README.md` for the agent, and `handouts/` for the
workshop material — start with `handouts/lab.md`.

## Hands-on lab

```bash
./scripts/lab.sh           # run the lab scenarios (offline)
```

`lab.sh` shows where the shipped policy lets a risky change slip through; you
close the gap by editing `policies/ci-triage.json`. Full walkthrough (builders +
designers tracks) in `handouts/lab.md`; answers in `handouts/lab-solution.md`.

## Enabling the AI CI Triage trigger (optional)

`.github/workflows/agent-triage.yml` runs the agent automatically when **CI
fails on a pull request** and posts a triage comment. It stays off until you
give it Claude Code auth — by design, no keys are shipped:

1. Create a long-lived token locally: `claude setup-token`.
2. Add it as a repo secret `CLAUDE_CODE_OAUTH_TOKEN`
   (Settings → Secrets and variables → Actions).
3. Open a PR that fails CI (e.g. the VAT change) and watch the agent comment.

Without the secret the workflow just **skips** on green runs and no-ops on red
ones — that's expected, not a failure. The lab itself runs fully offline and
needs none of this.

## What's in here

| Path | What |
| --- | --- |
| `packages/invoice-service` | Toy billing service (the harness under test) |
| `packages/agent-ci-triage` | The CI-triage agent (wraps `claude -p`) + golden eval |
| `examples/` | Recorded diffs, CI logs (incl. injection), for offline demo |
| `policies/` | Agent policy: human narrative (`.md`) + enforced rules (`.json`) |
| `.github/workflows/` | Real CI + the `AI CI Triage` trigger |
| `.github/CODEOWNERS` | Service ownership map (drives risk) |
| `handouts/` | Lab guide, design template, matrices, challenge questions, golden rules |
| `scripts/demo.sh` | Instructor demo (3 scenarios) |
| `scripts/lab.sh` | Hands-on lab runner (the gaps you close) |

## Verify

```bash
npm install && npm run build && npm test    # 19 tests: invoice-service + agent eval
```
