// The Playground's icon in the dock and on the home screen: an original
// glyph, braces around a play mark, night on an amber-to-rose tile
// (design/wireframes.md, FR-001). Its colors come from the style sheet,
// through classes. Like every app icon it is one of the shell's own SVG
// components (005 FR-044).
import { useId } from 'react';

export function PlaygroundIcon() {
  // Each copy of the icon (the dock, the home screen) needs its own
  // gradient id.
  const gradient = `playground-tile-${useId().replace(/[^\w-]/g, '')}`;
  return (
    <svg className="app-glyph playground-glyph" viewBox="0 0 64 64" aria-hidden="true" focusable="false" data-req="005-os-shell-FR-044 008-typescript-playground-FR-001">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="playground-tile-top" />
          <stop offset="1" className="playground-tile-bottom" />
        </linearGradient>
      </defs>
      <rect className="playground-tile" width="64" height="64" fill={`url(#${gradient})`} />
      <path className="playground-brace" d="M22 17c-5 0-5 3-5 7v3c0 3-2 5-4 5 2 0 4 2 4 5v3c0 4 0 7 5 7" />
      <path className="playground-brace" d="M42 17c5 0 5 3 5 7v3c0 3 2 5 4 5-2 0-4 2-4 5v3c0 4 0 7-5 7" />
      <path className="playground-play" d="M27 23.5v17L40.5 32z" />
    </svg>
  );
}
