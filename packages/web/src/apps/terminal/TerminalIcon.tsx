// The Terminal's icon in the dock and on the home screen: an original glyph,
// a mint prompt mark and a periwinkle underscore on a dark tile with a
// hairline edge (006 design/wireframes.md, FR-031). Its colors come from the
// style sheet, through classes. Like every app icon it is one of the
// shell's own SVG components (005 FR-044).

export function TerminalIcon() {
  return (
    <svg className="app-glyph terminal-glyph" viewBox="0 0 64 64" aria-hidden="true" focusable="false" data-req="005-os-shell-FR-044 006-terminal-FR-001">
      <rect className="terminal-tile" x="0.5" y="0.5" width="63" height="63" />
      <path className="terminal-mark" d="M18 22l10 10-10 10" />
      <path className="terminal-underscore" d="M32 43h14" />
    </svg>
  );
}
