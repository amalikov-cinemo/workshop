#!/usr/bin/env bash
# One-step demo of the CI-triage agent. Runs the three scenarios in OFFLINE
# replay mode (no Claude Code, no network needed) so it always works in a room.
#
#   ./scripts/demo.sh            # offline, recorded model verdicts
#   ./scripts/demo.sh --live     # real claude -p (uses your Claude Code auth)
#
set -euo pipefail
cd "$(dirname "$0")/.."

A=packages/agent-ci-triage
LIVE=0
[ "${1:-}" = "--live" ] && LIVE=1

if [ "$LIVE" = 1 ]; then SUFFIX="(LIVE claude -p)"; else SUFFIX="(offline replay)"; fi

[ -f "$A/dist/cli.js" ] || { echo "Building..."; npm run build >/dev/null; }

run () {
  local title="$1" mode="$2" diff="$3" log="$4" replay="$5"
  echo
  echo "═══════════════════════════════════════════════════════════════════"
  echo "  $title  [mode=$mode]  $SUFFIX"
  echo "═══════════════════════════════════════════════════════════════════"
  local flags=(--diff "examples/$diff" --ci-log "examples/$log" --mode "$mode")
  if [ "$LIVE" = 1 ]; then
    flags+=(--model "${AGENT_MODEL:-sonnet}" --max-budget-usd 0.50)
  else
    flags+=(--replay "$A/fixtures/$replay")
  fi
  node "$A/dist/cli.js" "${flags[@]}" || true
}

run "1) LOW-RISK formatting — agent may draft a fix" fix pr-low-risk.diff   failed-ci-low.log       model-verdict-low.json
run "2) BILLING (VAT) — agent MUST escalate"        fix pr-vat-change.diff failed-ci-vat.log       model-verdict-vat.json
run "3) PROMPT INJECTION in the log — ignored"      fix pr-low-risk.diff   failed-ci-injection.log model-verdict-injection.json

echo
echo "Exit codes: 0=report-only  10=draft-PR-eligible  20=escalate"
echo "Same agent, same policy — the OUTCOME differs because of WHAT changed."
