// "What's this?"'s glyph: a question mark in a circle (007 design). Original.
export function QuestionGlyph() {
  return (
    <svg className="question-glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M6.25 6.25a1.75 1.75 0 1 1 2.5 1.6c-.5.25-.75.6-.75 1.15v.5" />
      <path d="M8 11.5v.25" />
    </svg>
  );
}
