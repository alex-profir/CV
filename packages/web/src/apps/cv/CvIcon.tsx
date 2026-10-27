// The CV app's icon: an original glyph, a timeline of three dots and text
// bars on an indigo tile (005 design/review.md, FR-044). Its colors come
// from the style sheet, through classes. The gradient's id is unique per
// icon, as the dock and the home screen are both in the page before
// hydration.
import { useId } from 'react';

export function CvIcon() {
  const gradient = `cv-icon-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  return (
    <svg className="app-glyph" viewBox="0 0 64 64" aria-hidden="true" focusable="false" data-req="005-os-shell-FR-044">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="icon-top" />
          <stop offset="1" className="icon-bottom" />
        </linearGradient>
      </defs>
      <rect className="tile" width="64" height="64" fill={`url(#${gradient})`} />
      <path className="line" d="M19 16v32" />
      <circle className="ink" cx="19" cy="18" r="4.5" />
      <circle className="ink" cx="19" cy="32" r="4.5" />
      <circle className="ink" cx="19" cy="46" r="4.5" />
      <rect className="ink" x="29" y="15" width="20" height="3" />
      <rect className="faint" x="29" y="20" width="13" height="3" />
      <rect className="ink" x="29" y="29" width="16" height="3" />
      <rect className="faint" x="29" y="34" width="11" height="3" />
      <rect className="ink" x="29" y="43" width="18" height="3" />
      <rect className="faint" x="29" y="48" width="9" height="3" />
    </svg>
  );
}
