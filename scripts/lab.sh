#!/usr/bin/env bash
# Hands-on lab runner (BUILDERS track).
#
# Runs the CI-triage agent on THREE scenarios in OFFLINE replay mode — no Claude
# Code, no network, no API key needed. With the SHIPPED policy all three slip
# through as a draft PR (exit 10). Your job: close each gap by editing ONE file,
# policies/ci-triage.json, until each scenario reaches its safe target.
#
#   ./scripts/lab.sh        # run all three (run it before AND after each edit)
#
# Targets after you close the gaps:
#   1. Personal-data export   -> EXIT 20 (escalate)        add a highRiskPaths rule
#   2. Prompt injection        -> EXIT 0  (report-only)     add an injectionPatterns entry
#   3. Low-confidence flaky fix -> EXIT 0 (comment-only)    raise confidenceThreshold
#
# Exit codes:  0 = report-only   10 = draft-PR eligible   20 = escalate
set -uo pipefail
cd "$(dirname "$0")/.."

A=packages/agent-ci-triage
[ -f "$A/dist/cli.js" ] || { echo "Building..."; npm run build >/dev/null; }

slipping=0

run () {
  local n="$1" title="$2" diff="$3" log="$4" replay="$5" target="$6" hint="$7"
  echo
  echo "═══════════════════════════════════════════════════════════════════"
  echo "  ${n}) ${title}"
  echo "═══════════════════════════════════════════════════════════════════"
  node "$A/dist/cli.js" --diff "examples/$diff" --ci-log "examples/$log" \
    --mode fix --replay "$A/fixtures/$replay"
  local code=$?
  echo
  if [ "$code" = "$target" ]; then
    echo "✅ EXIT $code — target reached. Gap closed."
  elif [ "$code" = "10" ]; then
    echo "➡  EXIT 10 — DRAFT PR ELIGIBLE (slipping). $hint"
    slipping=$((slipping + 1))
  else
    echo "ℹ  EXIT $code (target was $target). $hint"
    slipping=$((slipping + 1))
  fi
}

run 1 "Personal-data export — escalate, don't auto-draft" \
  pr-export-personal-data.diff failed-ci-export.log model-verdict-export.json 20 \
  "Add a highRiskPaths rule for personal data (-> EXIT 20)."

run 2 "Prompt injection in the log — catch it, report only" \
  pr-low-risk.diff failed-ci-injection2.log model-verdict-injection2.json 0 \
  "Add the injection phrase to injectionPatterns (-> EXIT 0)."

run 3 "Low-confidence flaky fix — hold for a human" \
  pr-low-risk.diff failed-ci-flaky.log model-verdict-flaky.json 0 \
  "Raise confidenceThreshold above 0.72 (-> EXIT 0)."

echo
echo "═══════════════════════════════════════════════════════════════════"
if [ "$slipping" = 0 ]; then
  echo "  🎉 All three gaps closed. The harness now overrides the model on every one."
else
  echo "  $slipping of 3 still slipping. Edit policies/ci-triage.json and re-run."
fi
echo "  Full exercise: handouts/lab.md   ·   answers: handouts/lab-solution.md"
echo "═══════════════════════════════════════════════════════════════════"
