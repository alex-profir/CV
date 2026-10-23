#!/usr/bin/env bash
# Prints {"remaining": N, "blocked": N, "done": N, "idle": N, "stalled": bool} for the
# feature's tasks.md. idle counts consecutive calls in which no task was
# ticked; stalled means idle reached STALL_LIMIT (default 2), so one session
# that only reads its way in does not end the build. converge can add unticked
# tasks, so progress is measured by ticked tasks only.
# Always exits 0 so the workflow branches on the result instead of failing.
# Usage: tasks-status.sh specs/<feature> [--reset | --peek]
#   --reset  start counting from the current state (start of a build)
#   --peek   report without recording, so the next call compares to the last one
set -euo pipefail

dir=${1:?usage: tasks-status.sh specs/<feature> [--reset | --peek]}
mode=${2:-}
state=".specify/handoff.progress"
limit=${STALL_LIMIT:-2}

# A task's block runs from its "- [ ] T###" line to the next task or heading.
# An unticked task marked "BLOCKED:" waits for the owner, so it is reported as
# blocked rather than remaining, and the loop can finish. The marker counts on
# the task line itself, or at the start of a note under it, not wherever the
# word appears in the task's text.
read -r remaining blocked done_ < <(awk '
  /^[[:space:]]*- \[ \] T[0-9]+/   { open = 1; isblocked = 0; nopen++
                                      if (/BLOCKED:/) { isblocked = 1; nblocked++ }
                                      next }
  /^[[:space:]]*- \[[xX]\] T[0-9]+/ { open = 0; ndone++; next }
  /^#/                              { open = 0; next }
  open && !isblocked && /^[[:space:]]*([-*>][[:space:]]+)?(\*\*)?BLOCKED:/ { isblocked = 1; nblocked++ }
  END { printf "%d %d %d\n", nopen - nblocked, nblocked, ndone }
' "$dir/tasks.md" 2>/dev/null || echo "0 0 0")

previous=-1 idle=0
if [ "$mode" != "--reset" ] && [ -f "$state" ]; then
  read -r previous idle < "$state" || true
  previous=${previous:--1} idle=${idle:-0}
fi

if [ "$mode" != "--peek" ]; then
  if [ "$mode" = "--reset" ]; then idle=0
  elif [ "$previous" -ge 0 ] && [ "$done_" -le "$previous" ]; then idle=$((idle + 1))
  else idle=0
  fi
  echo "$done_ $idle" > "$state"
fi

stalled=false
[ "$idle" -ge "$limit" ] && stalled=true
printf '{"remaining": %d, "blocked": %d, "done": %d, "idle": %d, "stalled": %s}\n' \
  "$remaining" "$blocked" "$done_" "$idle" "$stalled"
