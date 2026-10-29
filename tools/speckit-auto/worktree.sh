#!/usr/bin/env bash
# Builds features side by side, each in its own worktree with its own loop,
# and removes worktrees and local branches once their pull request is merged.
#
#   tools/speckit-auto/run.sh worktree start <feature> [build options]
#   tools/speckit-auto/run.sh worktree resume <feature> <run_id> [-i key=value ...]
#   tools/speckit-auto/run.sh worktree list
#   tools/speckit-auto/run.sh worktree clean [--dry-run]
#
# start   checks out the feature's branch (create it, spec and all, beforehand)
#         in <repo>-worktrees/<feature> next to the main checkout, installs
#         packages and runs `run.sh build specs/<feature>` there. The worktree is
#         locked while the loop runs and the output is kept in .logs/<feature>.log.
#         An amendment's branch builds the spec folder with its number instead.
# resume  runs `run.sh resume <run_id>` in the feature's worktree.
# list    shows each worktree, whether its loop is running and its pull request.
# clean   removes the worktrees whose pull request is merged, and deletes local
#         branches whose pull request is merged. start and resume run it first.
set -euo pipefail

usage() { sed -n '5,8p' "$0" | sed 's/^# \{0,1\}//'; exit 2; }

git rev-parse --show-toplevel >/dev/null
# The checkout this was run from, which clean never removes.
here_abs=$(cd "$(git rev-parse --show-toplevel)" && pwd -P)
main_wt=$(git worktree list --porcelain | sed -n '1s/^worktree //p')
home=${SPECKIT_WORKTREES:-$(dirname "$main_wt")/$(basename "$main_wt")-worktrees}
mkdir -p "$home/.logs"
home=$(cd "$home" && pwd -P)
# The loop, relative to the worktree, so each feature runs its own branch's copy.
loop=${SPECKIT_AUTO_RUN:-tools/speckit-auto/run.sh}

# Worktrees as "path<TAB>branch<TAB>lock reason", with "-" for no branch or no
# lock and "?" for a lock without a reason.
worktrees() {
  git worktree list --porcelain | awk '
    /^worktree / { p = substr($0, 10); b = "-"; l = "-" }
    /^branch refs\/heads\// { b = substr($0, 19) }
    /^locked/ { l = length($0) > 7 ? substr($0, 8) : "?" }
    /^$/ { print p "\t" b "\t" l }'
}

# The worktrees in $home, with their paths resolved.
ours() {
  local path branch lock
  while IFS=$'\t' read -r path branch lock; do
    path=$(cd "$path" 2>/dev/null && pwd -P) || continue
    case "$path" in "$home"/*) printf '%s\t%s\t%s\n' "$path" "$branch" "$lock" ;; esac
  done < <(worktrees)
}

# The pid in a lock this script took, if that process is still running.
live_pid() {
  local pid
  pid=$(sed -nE 's/^speckit-auto pid=([0-9]+).*/\1/p' <<<"$1")
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null && echo "$pid"
}

# Every pull request, fetched once per command. Fails if GitHub can't be reached.
prs=""
load_prs() {
  [ -n "$prs" ] || prs=$(gh pr list --state all --limit 1000 \
    --json number,headRefName,state,headRefOid,mergedAt 2>/dev/null) && [ -n "$prs" ]
}

# Whether a branch is done: its last pull request is merged, none is open, and
# its tip is part of what was merged, so deleting it loses nothing. Otherwise
# prints why it is kept.
merged() {
  local branch=$1 tip=$2 open last oid
  open=$(jq -r --arg b "$branch" '[.[] | select(.headRefName == $b and .state == "OPEN") | .number][0] // empty' <<<"$prs")
  [ -z "$open" ] || { echo "pull request #$open is open"; return 1; }
  last=$(jq -r --arg b "$branch" '[.[] | select(.headRefName == $b and .state == "MERGED")]
    | sort_by(.mergedAt) | last // empty | "\(.number) \(.headRefOid)"' <<<"$prs")
  [ -n "$last" ] || { echo "no merged pull request"; return 1; }
  oid=${last#* }
  [ "$tip" = "$oid" ] && return 0
  git cat-file -e "$oid^{commit}" 2>/dev/null || git fetch -q origin "$oid" 2>/dev/null || true
  git merge-base --is-ancestor "$tip" "$oid" 2>/dev/null && return 0
  echo "has commits that pull request #${last%% *} did not merge"
  return 1
}

clean() {
  local dry=$1 path branch lock pid why name checked_out
  git fetch -q --prune origin 2>/dev/null || echo "worktree: could not fetch origin; using what is known locally." >&2
  load_prs || { echo "worktree: GitHub could not be reached, so nothing was cleaned." >&2; return 0; }
  [ -n "$dry" ] || git worktree prune

  while IFS=$'\t' read -r path branch lock; do
    name=${path#"$home"/}
    if [ "$path" = "$here_abs" ]; then echo "kept $name: it is the checkout this ran from"; continue; fi
    if [ "$branch" = - ]; then echo "kept $name: no branch checked out"; continue; fi
    if [ "$lock" != - ]; then
      if pid=$(live_pid "$lock"); then echo "kept $name: its loop is running (pid $pid)"; continue; fi
      case "$lock" in speckit-auto\ pid=*) ;; *) echo "kept $name: locked ($lock)"; continue ;; esac
    fi
    why=$(merged "$branch" "$(git -C "$path" rev-parse HEAD)") || { echo "kept $name: $why"; continue; }
    [ -z "$(git -C "$path" status --porcelain)" ] || { echo "kept $name: it has uncommitted changes"; continue; }
    if [ -n "$dry" ]; then echo "would remove $name: its pull request is merged"; continue; fi
    if { [ "$lock" = - ] || git worktree unlock "$path"; } && git worktree remove "$path" && git branch -q -D "$branch"; then
      rm -f "$home/.logs/${branch//\//-}.log"
      echo "removed $name: its pull request is merged"
    else
      echo "worktree: could not remove $name" >&2
    fi
  done < <(ours)

  # Local branches with no worktree. Those checked out anywhere are left alone.
  checked_out=$(worktrees | cut -f2)
  while read -r branch; do
    [ "$branch" != main ] && ! grep -qxF -- "$branch" <<<"$checked_out" || continue
    why=$(merged "$branch" "$(git rev-parse "refs/heads/$branch")") || continue
    if [ -n "$dry" ]; then echo "would delete branch $branch: its pull request is merged"
    elif git branch -q -D "$branch"; then echo "deleted branch $branch: its pull request is merged"
    fi
  done < <(git for-each-ref --format='%(refname:short)' refs/heads)

  for path in "$home"/*; do
    [ -d "$path" ] || continue
    path=$(cd "$path" && pwd -P)
    ours | cut -f1 | grep -qxF -- "$path" || echo "left ${path#"$home"/}: not a worktree of this repository"
  done
}

list() {
  local path branch lock pid state pr
  load_prs || prs='[]'
  while IFS=$'\t' read -r path branch lock; do
    if [ "$lock" = - ]; then state=idle
    elif pid=$(live_pid "$lock"); then state="running (pid $pid)"
    else state="locked ($lock)"
    fi
    pr=$(jq -r --arg b "$branch" '[.[] | select(.headRefName == $b)] | sort_by(.number) | last
      | if . == null then "no pull request" else "#\(.number) \(.state | ascii_downcase)" end' <<<"$prs")
    [ -z "$(git -C "$path" status --porcelain)" ] || state="$state, uncommitted changes"
    printf '%s\t%s\t%s\n' "${path#"$home"/}" "$state" "$pr"
  done < <(ours)
}

# A port no other running loop holds and nothing listens on, for `npm run serve`.
free_port() {
  local port=4174 taken
  taken=$(ours | cut -f3 | sed -nE 's/.* port=([0-9]+).*/\1/p')
  while grep -qxF "$port" <<<"$taken" || (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; do
    port=$((port + 1))
  done
  echo "$port"
}

# The spec folder a branch builds: specs/<branch>, or for an amendment of a
# shipped feature, the one folder with the branch's number (001-local-verify
# builds specs/001-requirement-traceability). Otherwise specs/<branch>, which
# the loop then refuses.
spec_dir() {
  local branch=$1 ref dirs
  ref=$(git rev-parse -q --verify "refs/heads/$branch" || git rev-parse -q --verify "refs/remotes/origin/$branch") \
    && [[ $branch =~ ^[0-9]+- ]] \
    && dirs=$(git ls-tree -d --name-only "$ref:specs" 2>/dev/null) \
    && ! grep -qxF -- "$branch" <<<"$dirs" \
    && dirs=$(grep -- "^${branch%%-*}-" <<<"$dirs") \
    && [ "$(wc -l <<<"$dirs")" -eq 1 ] \
    && { echo "specs/$dirs"; return; }
  echo "specs/$branch"
}

# Checks out the feature's branch in its worktree and runs the loop there.
launch() {
  local feature=$1 path lock pid status=0 elsewhere
  shift
  [[ $feature =~ ^[[:alnum:]._-]+$ ]] || { echo "Not a feature name: $feature" >&2; exit 2; }
  path="$home/$feature"

  clean "" || true

  lock=$(ours | awk -F'\t' -v p="$path" '$1 == p { print $3 }')
  if [ -n "$lock" ] && [ "$lock" != - ]; then
    if pid=$(live_pid "$lock"); then echo "The loop for $feature is already running (pid $pid)." >&2; exit 1; fi
    case "$lock" in speckit-auto\ pid=*) git worktree unlock "$path" ;; *) echo "$feature is locked: $lock" >&2; exit 1 ;; esac
  fi
  if [ -z "$lock" ]; then
    elsewhere=$(worktrees | awk -F'\t' -v b="$feature" '$2 == b { print $1 }')
    [ -z "$elsewhere" ] || { echo "$feature is checked out in $elsewhere. Switch that checkout to another branch first." >&2; exit 1; }
    git show-ref -q --verify "refs/heads/$feature" || git show-ref -q --verify "refs/remotes/origin/$feature" \
      || { echo "No branch $feature here or on origin. Create it with its spec first." >&2; exit 1; }
    git worktree add -q "$path" "$feature"
    echo "Checked out $feature in $path."
  fi
  [ -d "$path/node_modules" ] || (cd "$path" && npm ci --no-audit --no-fund)

  export PORT=${PORT:-$(free_port)}
  git worktree lock --reason "speckit-auto pid=$$ port=$PORT" "$path"
  # Expanded now: $path is gone by the time the shell exits. A lock left by a
  # killed run names a dead pid, which start, resume and clean treat as stale.
  trap "git worktree unlock $(printf %q "$path") 2>/dev/null || true" EXIT
  echo "Running the loop for $feature (PORT=$PORT); output in $home/.logs/$feature.log."
  set +e
  (
    cd "$path"
    if command -v caffeinate >/dev/null; then exec caffeinate -i "$loop" "$@"; else exec "$loop" "$@"; fi
  ) 2>&1 | tee -a "$home/.logs/$feature.log"
  status=${PIPESTATUS[0]}
  set -e
  git worktree unlock "$path"
  trap - EXIT
  return "$status"
}

cmd=${1:-}; shift || true
case "$cmd" in
  start)
    [ -n "${1:-}" ] || usage
    feature=$1; shift
    launch "$feature" build "$(spec_dir "$feature")" "$@"
    ;;
  resume)
    [ -n "${1:-}" ] && [ -n "${2:-}" ] || usage
    feature=$1; shift
    launch "$feature" resume "$@"
    ;;
  list) list ;;
  clean)
    case "${1:-}" in
      "") clean "" ;;
      --dry-run) clean dry ;;
      *) usage ;;
    esac
    ;;
  *) usage ;;
esac
