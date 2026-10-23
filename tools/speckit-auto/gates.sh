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

# The spec template ships both options; the author deletes the one that does
# not apply. Keeping both is ambiguous, so it does not count as No UI.
no_ui=false ui=false
grep -Eq '^\*\*No UI\*\*' "$spec" && no_ui=true
grep -Eq '^\*\*UI change\*\*' "$spec" && ui=true
if $no_ui && $ui; then
  fail "$spec has both the **No UI** line and the **UI change** block. Delete the one that does not apply (Constitution II)."
fi
if $no_ui; then
  echo "Gates passed: spec Approved, feature declares No UI."
  exit 0
fi

design="$dir/design"
ls "$design"/wireframe* >/dev/null 2>&1 \
  || fail "$design has no wireframes (Constitution II)."
find "$design" -name '*.png' 2>/dev/null | grep -q . \
  || fail "$design has no PNG mockup exports (Constitution II)."
[ -f "$design/review.md" ] \
  || fail "$design/review.md is missing. A UI feature needs the design gate signed off first (Constitution II)."
grep -Eq '^\*\*Status\*\*: *Approved' "$design/review.md" \
  || fail "$design/review.md is not Approved. Only the owner signs off the design (Constitution II)."
echo "Gates passed: spec Approved, design signed off."
