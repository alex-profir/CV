#!/usr/bin/env bash
# Unattended Spec Kit runs on Opus at high effort, with a fresh session each
# time a session's context passes the budget in env.sh.
#
#   tools/speckit-auto/run.sh spec  "<feature description>"
#   tools/speckit-auto/run.sh build specs/<feature> [--review | --implement-only] [--guidance "<text>"]
#   tools/speckit-auto/run.sh resume <run_id> [-i key=value ...]
#
# spec   drafts spec.md and stops. Review it, set Status: Approved and, for UI,
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

usage() { sed -n '5,14p' "$0" | sed 's/^# \{0,1\}//'; exit 2; }

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
    exec specify workflow run "$here/workflows/speckit-spec.yml" -i spec="$1"
    ;;
  build)
    feature=${1:-}; shift || true
    [ -d "$feature" ] || { echo "No such feature directory: $feature" >&2; usage; }
    feature=${feature%/}
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
    summary
    exit "$status"
    ;;
  resume)
    [ -n "${1:-}" ] || usage
    inputs=".specify/workflows/runs/$1/inputs.json"
    feature=""
    if [ -f "$inputs" ] && feature=$(jq -er '.inputs.feature // .feature // empty' "$inputs"); then
      export SPECIFY_FEATURE_DIRECTORY="$root/$feature"
    fi
    status=0
    specify workflow resume "$@" || status=$?
    [ -z "$feature" ] || summary
    exit "$status"
    ;;
  *) usage ;;
esac
