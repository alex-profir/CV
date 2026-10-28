// The prompt's clock, `◷`, drawn rather than set in a font (006 research
// R16). It follows the text color, forced colors included.

export function Clock() {
  return (
    <svg className="prompt-clock" viewBox="0 0 10 10" aria-hidden="true" focusable="false" fill="none" stroke="currentColor">
      <circle cx="5" cy="5" r="4" />
      <path d="M5 2.5V5h2" />
    </svg>
  );
}
