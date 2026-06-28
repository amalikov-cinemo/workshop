#!/usr/bin/env bash
# Hands-on lab runner (BUILDERS track).
#
# Runs the CI-triage agent on the "export personal data" scenario in OFFLINE
# replay mode — no Claude Code, no network, no API key needed.
#
# The point of the exercise: with the SHIPPED policy this PR slips through as a
# draft-PR (exit 10) — the agent would happily auto-draft a change that exports
# customer email + billing address. Your job is to add ONE guardrail to
# policies/ci-triage.json so the harness escalates it instead (exit 20).
#
#   ./scripts/lab.sh        # run the scenario (run it before AND after your edit)
#
# Exit codes:  0 = report-only   10 = draft-PR eligible   20 = escalate
set -euo pipefail
cd "$(dirname "$0")/.."

A=packages/agent-ci-triage
[ -f "$A/dist/cli.js" ] || { echo "Building..."; npm run build >/dev/null; }

echo "═══════════════════════════════════════════════════════════════════"
echo "  LAB · export personal data — should this auto-draft, or escalate?"
echo "═══════════════════════════════════════════════════════════════════"

set +e
node "$A/dist/cli.js" \
  --diff examples/pr-export-personal-data.diff \
  --ci-log examples/failed-ci-export.log \
  --mode fix \
  --replay "$A/fixtures/model-verdict-export.json"
code=$?
set -e

echo
case "$code" in
  10) echo "➡  EXIT 10 — DRAFT PR ELIGIBLE. The agent would auto-draft a PII export."
      echo "   The model rated it low and the harness did NOT stop it. Close the gap:"
      echo "   add a high-risk path rule for personal data in policies/ci-triage.json,"
      echo "   then run ./scripts/lab.sh again." ;;
  20) echo "✅ EXIT 20 — ESCALATED. Your guardrail caught it: the harness overrode the"
      echo "   model and routed it to a human owner. That's defense-in-depth working." ;;
  0)  echo "ℹ  EXIT 0 — report-only." ;;
  *)  echo "Unexpected exit code: $code" ;;
esac
echo
echo "See handouts/lab.md for the full exercise, and handouts/lab-solution.md to check yourself."
