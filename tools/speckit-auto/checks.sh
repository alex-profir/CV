#!/usr/bin/env bash
# The repository's own checks, run once the build loop ends.
# CI runs the site check on the pull request (001 FR-032).
set -euo pipefail

# env.sh, sourced by run.sh, puts the Node version in .nvmrc on PATH, and
# workflow shell steps inherit it.
want=$(cat .nvmrc)
have=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo none)
[ "$have" = "$want" ] \
  || { echo "checks.sh needs Node $want (.nvmrc), found $have. Source tools/speckit-auto/env.sh first." >&2; exit 1; }

# CI's required checks, minus the site check, with every test in place of CI's
# fast set.
npm run content-check
npm run token-check
npm run traceability
npm run typecheck
npm test
