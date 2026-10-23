#!/usr/bin/env bash
# The repository's own checks, run once the build loop ends.
# A UI feature should also get npm run site-check before its pull request.
set -euo pipefail

# env.sh, sourced by run.sh, puts the Node version in .nvmrc on PATH, and
# workflow shell steps inherit it.
want=$(cat .nvmrc)
have=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo none)
[ "$have" = "$want" ] \
  || { echo "checks.sh needs Node $want (.nvmrc), found $have. Source tools/speckit-auto/env.sh first." >&2; exit 1; }

# The checks CI requires, minus site-check, which needs a browser and a build.
npm run content-check
npm run token-check
npm run traceability
npm run typecheck
npm test
