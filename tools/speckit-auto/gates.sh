#!/usr/bin/env bash
# Owner gates from the constitution that must pass before planning starts:
#   I.  spec.md reads "Status: Approved" (only the owner sets it)
#   II. a UI feature has wireframes, mockup exports and a review.md sign-off
# Usage: gates.sh specs/<feature>
set -euo pipefail

dir=${1:?usage: gates.sh specs/<feature>}
spec="$dir/spec.md"
fail() { echo "Gate failed: $*" >&2; exit 1; }

[ -f "$spec" ] || fail "$spec does not exist."
grep -Eq '^\*\*Status\*\*: *Approved' "$spec" \
  || fail "$spec is not Approved. Review it, run /speckit-clarify if needed, then set **Status**: Approved (Constitution I)."

if grep -Eq '^\*\*No UI\*\*' "$spec"; then
  echo "Gates passed: spec Approved, feature declares No UI."
  exit 0
fi

design="$dir/design"
[ -f "$design/review.md" ] \
  || fail "$design/review.md is missing. A UI feature needs the design gate signed off first (Constitution II)."
ls "$design"/wireframe* >/dev/null 2>&1 \
  || fail "$design has no wireframes (Constitution II)."
echo "Gates passed: spec Approved, design signed off."
