#!/usr/bin/env bash
# Fails when a step that exited cleanly did not leave its output behind, so the
# workflow stops instead of carrying on without a plan or tasks.
# Usage: expect.sh plan|tasks specs/<feature>
set -euo pipefail

what=${1:?usage: expect.sh plan|tasks specs/<feature>}
dir=${2:?usage: expect.sh plan|tasks specs/<feature>}
fail() { echo "Missing output: $*" >&2; exit 1; }

case "$what" in
  plan)
    [ -s "$dir/plan.md" ] || fail "$dir/plan.md was not written."
    if grep -Eq '^# Implementation Plan: \[FEATURE\]|ACTION REQUIRED' "$dir/plan.md"; then
      fail "$dir/plan.md is still the unfilled template."
    fi
    ;;
  tasks)
    [ -s "$dir/tasks.md" ] || fail "$dir/tasks.md was not written."
    grep -Eq '^[[:space:]]*- \[[ xX]\] T[0-9]+' "$dir/tasks.md" || fail "$dir/tasks.md lists no tasks."
    ;;
  *) fail "unknown output '$what'" ;;
esac
echo "Found the $what for $dir."
