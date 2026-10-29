// The prompt's mark, `❯`, drawn rather than set in a font, as the site's
// font subsets don't promise it (006 research R16). It follows the text
// color, forced colors included.

export function PromptMark() {
  return (
    <svg className="prompt-mark" viewBox="0 0 10 10" aria-hidden="true" focusable="false" fill="none" stroke="currentColor">
      <path d="M3 1.5 7 5 3 8.5" />
    </svg>
  );
}
