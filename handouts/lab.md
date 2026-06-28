# Hands-on Lab · Close the gate

**~40 minutes.** Two tracks running in parallel. Pick the one that fits you —
both end at the same idea and share out together.

> Part 1 recap: you saw `loop.sh` — an *executor* (maker) plus an Opus *judge*
> (checker) wired together by hand. This lab is that same shape, but as a real
> SDLC trigger: **CI fails → agent triages → policy gate decides → human or draft.**
> The whole point of today on one line:
>
> **loop → arbitration → memory → self-improvement → workflow → trigger**
>
> Here you live in **arbitration**: the gate is what makes autonomy safe.

---

## Setup (everyone, 3 min) — offline, no Claude account needed

```bash
git clone <repo> && cd workshop
npm install && npm run build && npm test     # 19 tests green
./scripts/demo.sh                            # the 3 canonical scenarios
```

`demo.sh` runs the agent on three prepared CI failures. Same agent, same
policy — the **outcome differs because of WHAT each PR changes**:

| Scenario | Touches | Verdict |
| --- | --- | --- |
| Summary formatting | `format.ts` | 🟢 LOW → draft PR |
| VAT 19% → 20% | `billing.ts` | 🔴 HIGH → escalate (harness overrides the model) |
| Prompt injection in the log | — | caught, ignored, report-only |

Read one report. Notice the `🔒 Harness overrode the model's self-assessment`
block on the VAT one — **the model said "medium, draft a PR"; the code said
"high, escalate".** That override is the lesson.

---

## Track A · Builders (you write code)

A new PR lands: **"export all invoices as CSV so customers can download their
billing history."** CI fails on a trivial header test. Run it:

```bash
./scripts/lab.sh
```

You'll get **EXIT 10 — draft PR eligible.** The model rated it `low` ("just an
outdated test"), and the harness let it through. But look at the diff
(`examples/pr-export-personal-data.diff`): the change adds **`email` and
`billing_address`** to the export. The agent is one step from auto-drafting a
**PII/GDPR leak** — and nobody flagged it.

**Your task:** add **one** guardrail to `policies/ci-triage.json` so the harness
escalates anything touching personal data, instead of trusting the model.

1. Open `policies/ci-triage.json`, find `highRiskPaths` (billing, auth, migrations are already there).
2. Add a rule for personal data — a `pattern` (regex over file paths), a `component`, and `owners`.
3. Re-run `./scripts/lab.sh`.

**Success = EXIT 20 — escalate**, with a `Harness overrode the model` block and
your owners listed as approvers. You just turned a confidently-wrong model into
a safe outcome — in code, not in the prompt.

*Stretch goals:* run `--mode review` and confirm it can never draft a PR (L1
read-only). Add a `customer-export` line to `.github/CODEOWNERS` and discuss who
that maps to. Try `./scripts/demo.sh --live` if you have Claude Code.

---

## Track B · Designers (no code — PO / PM / TL / QA)

Design the guardrails for a pipeline in **your** area, on paper.

1. Pick a case from `handouts/exercise-cases.md` (or bring one from your team).
2. Fill `handouts/design-template.md`: the bounded unit of work, input context,
   tools, permissions, **human gates**, failure modes, audit log, success metric.
3. Fill the **autonomy matrix** (`handouts/autonomy-matrix.md`): for each step,
   is it L1 report / L2 assisted / L3 unattended — and who signs off?
4. A teammate attacks it with `handouts/challenge-questions.md`.

**Success = a one-page design** where every risky decision has a named human
owner, untrusted input is named and treated as data, and there is at least one
measurable success metric.

---

## Share-out (everyone, 5 min)

Each table answers one question:

> **What did your gate catch — and what did the model get wrong on its own?**

Builders: which path did you protect, and what would have leaked without it?
Designers: where in your pipeline does a human have to own the call, and why?

The takeaway is the thesis of the whole talk: **the model proposes; the gate —
arbitration, quality gates, the human-signed artifact — is what makes it safe.
The more autonomous the trigger, the more mandatory the gate.**
