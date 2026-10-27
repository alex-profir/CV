// The site mark on the site menu's title: two offset squares, the mockup's
// own drawing (005 design/review.md, FR-044). Its fills come from the style
// sheet.
export function SiteMark() {
  return (
    <svg className="site-mark" viewBox="0 0 16 16" aria-hidden="true" focusable="false" data-req="005-os-shell-FR-044">
      <rect className="shadow" x="4" y="4" width="11" height="11" />
      <rect className="face" x="1" y="1" width="11" height="11" />
    </svg>
  );
}
