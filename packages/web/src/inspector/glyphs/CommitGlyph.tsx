// The uncommitted-changes note's glyph: a commit dot and an open ring on a
// line (007 design). Original.
export function CommitGlyph() {
  return (
    <svg className="commit-glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M1 8h3.5M11.5 8H15" />
      <circle cx="8" cy="8" r="3" />
      <path d="M8 8h0" />
    </svg>
  );
}
