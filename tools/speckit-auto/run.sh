#!/usr/bin/env bash
# Unattended Spec Kit runs on Opus at high effort, with a fresh session each
# time a session's context passes the budget in env.sh.
#
#   tools/speckit-auto/run.sh spec  "<feature description>"
#   tools/speckit-auto/run.sh build specs/<feature> [--review | --implement-only] [--guidance "<text>"]
#   tools/speckit-auto/run.sh resume <run_id> [-i key=value ...]
#
# spec   run on main: drafts spec.md, commits it on a new branch named after the
#        feature directory and stops. Review it, set Status: Approved and, for UI,
#        pass the design gate before building (Constitution I and II).
# build  checks those gates, then plans, writes tasks, analyzes and implements.
#        --review pauses after plan, tasks and analyze for your approval;
#        resume with: run.sh resume <run_id> -i plan_verdict=approve
#        --implement-only skips planning and builds from the existing plan and tasks.
set -euo pipefail

root=$(git rev-parse --show-toplevel)
cd "$root"
here=tools/speckit-auto
# shellcheck source=env.sh
. "$here/env.sh"

usage() { sed -n '5,15p' "$0" | sed 's/^# \{0,1\}//'; exit 2; }

# The feature directory relative to the repository root, given either way.
root_abs=$(cd "$root" && pwd -P)
relative() {
  local abs
  abs=$(cd "$1" 2>/dev/null && pwd -P) || return 1
  case "$abs" in
    "$root_abs"/*) echo "${abs#"$root_abs"/}" ;;
    *) return 1 ;;
  esac
}

# Implement sessions commit as they go, so HEAD must be the feature's branch.
on_branch() {
  local want branch
  want=$(basename "$1")
  branch=$(git branch --show-current)
  [ "$branch" = "$want" ] \
    || { echo "On ${branch:-a detached HEAD}, not $want. Run: git switch $want" >&2; exit 1; }
}

# The engine keeps a failed shell step's stderr in the run state but prints
# only "Shell command exited with code N", so show why the step failed.
why_failed() {
  local state=".specify/workflows/runs/$1/state.json"
  [ -f "$state" ] || return 0
  jq -r '[.step_results[] | select(.status == "failed") | .output.stderr // empty
          | select(. != "")] | unique[]' "$state" 2>/dev/null | tail -n 20 >&2 || true
}

# A session that hits the usage limit or a passing API error fails its step,
# and the engine records only the exit code, so the output is kept to tell why.
# Prints the seconds to wait before resuming, or fails if the cause is anything else.
retry_wait() {
  local tail reset tz at now
  tail=$(tail -n 40 "$1")
  if grep -Eqi "(session|usage|weekly|[0-9]+-hour) limit|limit reached" <<<"$tail"; then
    reset=$(grep -Eio "resets [0-9]{1,2}(:[0-9]{2})?[ap]m( \([^)]+\))?" <<<"$tail" | tail -n 1 || true)
    # No time of day (a weekly limit can name a date): check again in half an hour.
    [ -n "$reset" ] || { echo 1800; return 0; }
    tz=$(sed -nE 's/.*\(([^)]+)\)$/\1/p' <<<"$reset")
    at=$(sed -E 's/^resets ([0-9:]+[apAP][mM]).*/\1/' <<<"$reset" | tr '[:lower:]' '[:upper:]')
    case $at in *:*) at=${at/AM/:00AM}; at=${at/PM/:00PM} ;; *) at=${at/AM/:00:00AM}; at=${at/PM/:00:00PM} ;; esac
    now=$(date +%s)
    at=$(TZ=${tz:-$(date +%Z)} date -j -f %I:%M:%S%p "$at" +%s 2>/dev/null) || { echo 1800; return 0; }
    [ "$at" -gt "$now" ] || at=$((at + 86400))
    echo $((at - now + 120))
  elif grep -Eqi "API Error: (429|5[0-9][0-9])|overloaded|rate_limit_error|ECONNRESET|socket hang up" <<<"$tail"; then
    echo 0   # backoff() picks the wait
  else
    return 1
  fi
}

# Runs a workflow command, resuming the run after a usage limit or a passing
# API error until it pauses, succeeds or fails for another reason.
# SPECKIT_AUTO_RESUME_MAX caps the resumes (default 30; 0 turns it off).
with_resume() {
  local out status wait run="" tries=0 backoff=60
  # A resume names its run; `workflow run` prints the new run's ID when it stops.
  [ "${3:-}" != resume ] || run=$4
  out=$(mktemp -t speckit-auto)
  while :; do
    set +e; "$@" 2>&1 | tee "$out"; status=${PIPESTATUS[0]}; set -e
    [ "$status" -ne 0 ] || break
    [ -n "$run" ] || run=$(sed -nE 's/^Run ID: ([[:alnum:]_-]+).*/\1/p' "$out" | tail -n 1)
    [ -n "$run" ] || run=$(basename "$(ls -td .specify/workflows/runs/*/ 2>/dev/null | head -n 1)")
    [ "$tries" -lt "${SPECKIT_AUTO_RESUME_MAX:-30}" ] && wait=$(retry_wait "$out") || break
    if [ "$wait" -eq 0 ]; then
      wait=$backoff; backoff=$((backoff * 2 > 900 ? 900 : backoff * 2))
    else
      backoff=60
    fi
    tries=$((tries + 1))
    echo "speckit-auto: resuming run $run at $(date -r $(($(date +%s) + wait)) '+%H:%M %Z') (resume $tries)" >&2
    sleep "$wait"
    set -- specify workflow resume "$run"
  done
  rm -f "$out"
  [ "$status" -eq 0 ] || [ -z "$run" ] || why_failed "$run"
  return "$status"
}

# What the owner needs to look at after a build.
summary() {
  [ -f "$feature/tasks.md" ] || return 0
  echo
  echo "Tasks in $feature: $("$here/tasks-status.sh" "$feature" --peek)"
  grep -n 'BLOCKED:' "$feature/tasks.md" | sed 's/^/  tasks.md:/' || true
}

cmd=${1:-}; shift || true
case "$cmd" in
  spec)
    [ -n "${1:-}" ] || usage
    # The draft is committed on a new branch cut from HEAD (spec-branch.sh).
    on_branch main
    exec specify workflow run "$here/workflows/speckit-spec.yml" -i spec="$1"
    ;;
  build)
    feature=${1:-}; shift || true
    rel=$(relative "${feature:-.}") && [[ $rel == specs/* ]] \
      || { echo "No such feature directory in this repository: $feature" >&2; usage; }
    feature=$rel
    on_branch "$feature"
    verdict=approve guidance="" from=plan
    while [ $# -gt 0 ]; do
      case "$1" in
        --review) verdict="" ;;
        --implement-only) from=implement ;;
        --guidance) guidance=${2:?--guidance needs text}; shift ;;
        *) usage ;;
      esac
      shift
    done
    # Spec Kit's scripts find the feature through this, not the branch name.
    export SPECIFY_FEATURE_DIRECTORY="$root/$feature"
    status=0
    with_resume specify workflow run "$here/workflows/speckit-build.yml" \
      -i feature="$feature" -i from="$from" -i plan_verdict="$verdict" -i guidance="$guidance" \
      || status=$?
    summary
    exit "$status"
    ;;
  resume)
    [ -n "${1:-}" ] || usage
    inputs=".specify/workflows/runs/$1/inputs.json"
    feature=""
    if [ -f "$inputs" ] && feature=$(jq -er '.inputs.feature // .feature // empty' "$inputs"); then
      feature=$(relative "$feature") \
        || { echo "Run $1 is for a feature directory that no longer exists." >&2; exit 1; }
      on_branch "$feature"
      export SPECIFY_FEATURE_DIRECTORY="$root/$feature"
    fi
    status=0
    with_resume specify workflow resume "$@" || status=$?
    [ -z "$feature" ] || summary
    exit "$status"
    ;;
  *) usage ;;
esac
