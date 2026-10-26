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
    specify workflow run "$here/workflows/speckit-build.yml" \
      -i feature="$feature" -i from="$from" -i plan_verdict="$verdict" -i guidance="$guidance" \
      || status=$?
    if [ "$status" -ne 0 ]; then
      run=$(ls -td .specify/workflows/runs/*/ 2>/dev/null | head -n 1 || true)
      [ -z "$run" ] || why_failed "$(basename "$run")"
    fi
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
    specify workflow resume "$@" || status=$?
    [ "$status" -eq 0 ] || why_failed "$1"
    [ -z "$feature" ] || summary
    exit "$status"
    ;;
  *) usage ;;
esac
