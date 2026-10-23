#!/usr/bin/env bash
# Puts the spec /speckit-specify just drafted on its own branch and commits it.
# Spec Kit 1.2 leaves branch creation to its git extension, which this
# repository does not install, so the draft would otherwise sit uncommitted on
# main. The branch is named after the feature directory, which is the branch
# run.sh build expects.
# Usage: spec-branch.sh   (reads the feature from .specify/feature.json)
set -euo pipefail

fail() { echo "spec-branch: $*" >&2; exit 1; }

dir=$(jq -er '.feature_directory // empty' .specify/feature.json 2>/dev/null) \
  || fail ".specify/feature.json names no feature directory; did /speckit-specify run?"
dir=${dir#"$(pwd -P)"/}
[[ $dir == specs/* ]] || fail "$dir is not under specs/."
[ -f "$dir/spec.md" ] || fail "$dir/spec.md was not written."
# A feature.json left by an earlier feature would point at committed files.
[ -z "$(git ls-files -- "$dir")" ] || fail "$dir is already committed, so it is not a new draft."

branch=$(basename "$dir")
git show-ref --verify --quiet "refs/heads/$branch" && fail "branch $branch already exists."

git switch -q -c "$branch"
git add -- "$dir"
git commit -q -m "docs: draft the spec (${branch%%-*})"
echo "Drafted $dir on branch $branch."
