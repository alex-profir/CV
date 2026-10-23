#!/usr/bin/env bash
# PostToolUse hook: once the session's context passes CONTEXT_BUDGET_PCT of the
# window, tell Claude to finish the task in progress, write a handoff and stop,
# so the runner can start the next session with a clean context.
#
# Inert unless CONTEXT_BUDGET_PCT is set, which only tools/speckit-auto/env.sh
# does. Interactive sessions are never affected.
set -euo pipefail

[ -n "${CONTEXT_BUDGET_PCT:-}" ] || exit 0
command -v jq >/dev/null || exit 0

input=$(cat)
transcript=$(jq -r '.transcript_path // empty' <<<"$input")
session=$(jq -r '.session_id // "unknown"' <<<"$input")
[ -n "$transcript" ] && [ -f "$transcript" ] || exit 0

# Fire once per session; the reminder is not repeated on every later tool call.
# Checked first, so later tool calls skip parsing the transcript.
marker="${TMPDIR:-/tmp}/speckit-context-budget-$session"
[ -e "$marker" ] && exit 0

# Context in use = the input side of the latest main-conversation API call,
# the same formula the status line uses for context_window.used_percentage.
used=$(tail -n 400 "$transcript" | jq -s '
  [ .[] | select(.type == "assistant" and (.isSidechain | not)) | .message.usage | select(. != null) ]
  | last // {}
  | (.input_tokens // 0) + (.cache_creation_input_tokens // 0) + (.cache_read_input_tokens // 0)
' 2>/dev/null || echo 0)

window=${CONTEXT_WINDOW_TOKENS:-1000000}
pct=$(( used * 100 / window ))
[ "$pct" -ge "$CONTEXT_BUDGET_PCT" ] || exit 0

# Only sessions that a later session can continue are cut short. A one-shot
# step such as /speckit-plan has to finish in its session, so it is left alone.
# The session's command is the <command-name> of its first prompt.
command=$(head -n 50 "$transcript" | jq -r '
  select(.type == "user") | .message.content | strings
  | capture("<command-name>/?(?<name>[^<]+)</command-name>").name
' 2>/dev/null | head -n 1 || true)
case " ${CONTEXT_BUDGET_COMMANDS:-speckit-implement} " in
  *" $command "*) ;;
  *) exit 0 ;;
esac

touch "$marker"

handoff=${SPECKIT_HANDOFF_FILE:-.specify/handoff.md}
jq -n --arg pct "$pct" --arg budget "$CONTEXT_BUDGET_PCT" --arg handoff "$handoff" '{
  decision: "block",
  reason: ("Context budget reached: " + $pct + "% used, budget " + $budget + "%. "
    + "A fresh session will continue the work. Now: finish only the task in progress "
    + "(or leave it cleanly unstarted), mark finished tasks [X] in tasks.md, "
    + "overwrite " + $handoff + " with what is done, what is next and anything the next "
    + "session must know, commit the work, then end your turn. Do not start another task.")
}'
