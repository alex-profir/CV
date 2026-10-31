// The Tab key's mark, `⇥`, drawn rather than set in a font, as the site's font
// subsets don't promise it (006 research R16). It follows the text color,
// forced colors included.

export function TabMark() {
  return (
    <svg className="tab-mark" viewBox="0 0 10 10" aria-hidden="true" focusable="false" fill="none" stroke="currentColor">
      <path d="M1 5h6M4.5 2.5 7 5 4.5 7.5M9 2v6" />
    </svg>
  );
}
