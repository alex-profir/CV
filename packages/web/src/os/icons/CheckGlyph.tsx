// The Window menu's mark on the focused window (005 design/wireframes.md,
// FR-014): a check drawn as a stroke, so it needs no font glyph.
export function CheckGlyph() {
  return (
    <svg className="check" viewBox="0 0 16 16" aria-hidden="true" focusable="false" data-req="005-os-shell-FR-044">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}
