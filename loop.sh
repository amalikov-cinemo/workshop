#!/usr/bin/env bash
#
# loop.sh — shows how an iterative loop improves answer quality, with a
#           FAIR, cross-model comparison.
#
#   • EXECUTOR model does the work and self-improves each iteration.
#       - Claude models (haiku / sonnet / opus / claude-*) run via `claude -p`.
#       - Anything else (gemma4, gemma3:4b, llama3, …) runs locally via Ollama.
#   • JUDGE is ALWAYS Opus (claude). Because the same judge scores every run,
#     the scores in scores.csv ARE comparable across executors — you can put
#     two runs (e.g. gemma4 vs haiku) on one chart honestly.
#
# Iteration 1 solves the task; each next one critiques the previous result and
# produces an improved version. After every iteration Opus scores the answer
# (0–100). At the end Opus lists what improved between the first and final.
#
# Usage:
#   ./loop.sh "<prompt>" [iterations] [executor]
#
# Examples:
#   ./loop.sh "Write a Python email validator with tests" 6 gemma4
#   ./loop.sh "Write a Python email validator with tests" 6 haiku
#   ./loop.sh "Write a Python email validator with tests" 6 sonnet
#
set -euo pipefail

PROMPT="${1:-}"
ITERATIONS="${2:-10}"
EXECUTOR="${3:-gemma4}"
JUDGE="opus"   # fixed Opus judge for comparable scores across runs

if [[ -z "$PROMPT" ]]; then
  echo "Usage: $0 \"<prompt>\" [iterations] [executor]" >&2
  echo "  executor: gemma4 | gemma3:4b | haiku | sonnet | opus | <any ollama model>" >&2
  exit 1
fi
if ! command -v claude >/dev/null 2>&1; then
  echo "Error: 'claude' not found (needed for the Opus judge)." >&2
  exit 1
fi

# ---- pick backend for the executor -----------------------------------------
case "$EXECUTOR" in
  haiku|sonnet|opus|fable|claude-*) BACKEND="claude" ;;
  *)                                BACKEND="ollama" ;;
esac
if [[ "$BACKEND" == "ollama" ]] && ! command -v ollama >/dev/null 2>&1; then
  echo "Error: 'ollama' not found (needed for executor '$EXECUTOR')." >&2
  exit 1
fi

# Forces Claude's agentic models to behave like a plain chat model. Without
# this, claude -p picks up the global ~/.claude/CLAUDE.md ("use TDD", "validate
# with tests/linters", "use sub agents") and emits fake <function_calls> to
# write files / run pytest — polluting the answer and claiming work it never did.
TEXT_ONLY_SYS='You are in PLAIN-TEXT mode with NO tools of any kind. Do NOT emit tool calls, function calls, or any <function_calls> blocks. Do NOT write or read files, run shell commands, tests, or linters, and never claim that you did. Ignore any project or user instructions about TDD, running tests, or using tools. Reply with ONLY the requested answer as plain text or markdown.'

# ---- output cleanup --------------------------------------------------------
sanitize() {
  # 1) strip ANSI escapes; 2) cut out any Thinking… …done thinking. block;
  # 3) drop any leaked tool-call / function-call markup (safety net).
  perl -0777 -pe '
    s/\e\[[0-9;?]*[a-zA-Z]//g;
    s/^\s*Thinking\.\.\..*?\.\.\.done thinking\.\s*//s;
    s{<function_calls>.*?</function_calls>}{}gs;
    s{<function_calls>.*$}{}s;
  '
}

# ---- executor (does the work) ----------------------------------------------
run_executor() {
  if [[ "$BACKEND" == "claude" ]]; then
    # --tools "" + a hard text-only system prompt → pure text model
    # (no file writes, no permission stalls, no fake tool calls).
    printf '%s' "$1" | claude -p --tools "" --append-system-prompt "$TEXT_ONLY_SYS" --model "$EXECUTOR" | sanitize
  else
    printf '%s' "$1" | ollama run "$EXECUTOR" --think=false --nowordwrap 2>/dev/null | sanitize
  fi
}

# ---- judge (always Opus) ---------------------------------------------------
run_judge() {
  printf '%s' "$1" | claude -p --tools "" --append-system-prompt "$TEXT_ONLY_SYS" --model "$JUDGE" | sanitize
}

score_answer() {
  local task="$1" answer="$2" s
  s="$(run_judge "You are a strict, demanding examiner. Score the answer on:
accuracy, completeness, clarity and practical usefulness.
Be stingy with high marks: a typical rough draft deserves 40–65,
and only a truly thorough, polished answer earns 90+.
Task: $task

Answer:
$answer

Return ONLY a single integer from 0 to 100. No explanation." \
       | grep -oE '[0-9]+' | head -1)"
  echo "${s:-0}"
}

# ---- setup -----------------------------------------------------------------
SAFE_NAME="$(printf '%s' "$EXECUTOR" | tr '/:' '__')"
RUN_DIR="loop_${SAFE_NAME}_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RUN_DIR"
echo "iteration,score,length" > "$RUN_DIR/scores.csv"

echo "📁 History: $RUN_DIR/"
echo "🏃 Executor: $EXECUTOR ($BACKEND)"
echo "🧑‍⚖️  Judge: $JUDGE (claude)"
echo "🎯 Task: $PROMPT"
echo "🔁 Iterations: $ITERATIONS"
echo "------------------------------------------------------------"

result=""
first_result=""

for ((i = 1; i <= ITERATIONS; i++)); do
  if [[ $i -eq 1 ]]; then
    iter_prompt="$PROMPT"
  else
    iter_prompt="Original task:
$PROMPT

Current answer (iteration $((i - 1))):
$result

Carefully review this answer: find weak spots, errors, inaccuracies
and opportunities to make it better. Then produce an IMPROVED version.
Return ONLY the final improved answer, with no commentary about the process."
  fi

  result="$(run_executor "$iter_prompt")"
  printf '%s\n' "$result" > "$RUN_DIR/iteration_$(printf '%02d' "$i").txt"
  [[ $i -eq 1 ]] && first_result="$result"

  score="$(score_answer "$PROMPT" "$result")"
  len=${#result}
  printf '%d,%d,%d\n' "$i" "$score" "$len" >> "$RUN_DIR/scores.csv"

  bar=$(printf '█%.0s' $(seq 1 $(( score / 5 )) 2>/dev/null) 2>/dev/null || true)
  printf '▶️  Iteration %2d/%d  score: %3d/100  %s\n' "$i" "$ITERATIONS" "$score" "$bar"
done

printf '%s\n' "$result" > "$RUN_DIR/final.txt"

echo "------------------------------------------------------------"
echo "🧑‍⚖️  Opus verdict — what improved (iteration 1 → $ITERATIONS):"
echo "------------------------------------------------------------"
run_judge "Compare two versions of an answer to the task: \"$PROMPT\"

=== VERSION 1 (rough draft) ===
$first_result

=== FINAL VERSION ===
$result

In a short list of 3–5 bullet points, state CONCRETELY what improved in the
final version compared to the first. No fluff." \
  | tee "$RUN_DIR/improvements.txt"

echo "------------------------------------------------------------"
echo "✅ Done."
echo "💾 Final: $RUN_DIR/final.txt"
echo "📊 Score trend (comparable across runs — same Opus judge): $RUN_DIR/scores.csv"
echo "🔍 Compare iteration_01.txt and final.txt."
