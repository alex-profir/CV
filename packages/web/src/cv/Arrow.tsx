// The design's arrows, drawn as inline SVG rather than font glyphs: Google's
// subsets don't promise arrow glyphs, and the stroke follows the text color
// in every mode, forced colors included (research R5). Size and stroke width
// come from the style sheet.

const PATHS = {
  // →, after "Go to the CV" and before each highlight.
  right: 'M1 5h8M5.5 1.5 9 5 5.5 8.5',
  // ↗, after a link that leaves the site.
  'up-right': 'M2 8 8 2M3 2h5v5',
} as const;

export type ArrowKind = keyof typeof PATHS;

export function Arrow({ kind, className }: { kind: ArrowKind; className?: string }) {
  return (
    <svg className={className === undefined ? `arrow arrow-${kind}` : `arrow arrow-${kind} ${className}`} aria-hidden="true" focusable="false" viewBox="0 0 10 10" fill="none" stroke="currentColor">
      <path d={PATHS[kind]} />
    </svg>
  );
}
