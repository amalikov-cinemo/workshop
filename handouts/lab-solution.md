# Lab solution · Builders track

The gap: `policies/ci-triage.json` has high-risk rules for **billing**, **auth**
and **migrations** — but nothing for **personal data**. The export PR touches
`packages/invoice-service/src/customer-export.ts`, which matches none of them, so
the harness trusts the model's `low / open_draft_pr` verdict and lets it through.

## The one rule to add

Add this object to the `highRiskPaths` array in `policies/ci-triage.json`:

```json
{
  "pattern": "personal|pii|gdpr|customer-export|/export/|privacy",
  "component": "privacy",
  "owners": ["@privacy", "@dpo"],
  "reason": "Personal data (GDPR). Exporting or logging customer personal data is a privacy decision and needs DPO sign-off, even when the code fix looks trivial."
}
```

Any regex that matches the touched path works — `customer-export`, `/export/`,
`personal`, `pii`, `gdpr`. The point is that the rule lives in **code the harness
enforces**, not in the prompt the model can ignore or be talked out of.

## Expected outcome

| | Before the rule | After the rule |
| --- | --- | --- |
| Model self-assessment | `low` / `open_draft_pr` | `low` / `open_draft_pr` (unchanged) |
| Harness verdict | `low` / **draft PR** | `high` / **escalate** |
| Exit code | `10` | `20` |
| Approvers | — | `@privacy, @dpo` |
| Override block | absent | `🔒 Harness overrode the model's self-assessment` |

The model never changes its mind — it still thinks this is a trivial test fix.
**The harness changes the outcome.** That's defense-in-depth: a confidently-wrong
(or manipulated) model cannot get an unsafe action past the gate.

## Talking points for the share-out

- The fix the model proposed ("update the test assertion") would have made CI
  green while **legitimizing the PII export** — green tests are not a safety
  signal.
- This is the same mechanism as the VAT scenario: the risk is in **what the
  change means**, not in how hard the code is.
- Map `@privacy` / `@dpo` to real owners via `.github/CODEOWNERS` — the policy
  and CODEOWNERS together are your "human owns risk" guarantee.
