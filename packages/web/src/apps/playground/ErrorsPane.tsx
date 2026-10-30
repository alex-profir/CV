// The Errors pane (FR-016, FR-022): every diagnostic with its line, column,
// message and TS number; activating one puts the editor's cursor there and
// focuses it. With none, the site text says so.
import { siteText } from '../../site-text.ts';
import { currentEngine } from './controller.ts';
import { ErrorMark, WarnMark } from './Glyphs.tsx';
import type { Diagnostic } from './types.ts';

const words = siteText.playground.panes;

export function ErrorsList({ diagnostics }: { diagnostics: readonly Diagnostic[] }) {
  if (diagnostics.length === 0) return <p className="empty">{words.noErrors}</p>;
  return (
    <ol className="diagnostics">
      {diagnostics.map((entry, index) => (
        <li key={`${entry.line}:${entry.column}:${entry.code}:${index}`}>
          <button type="button" className={entry.category === 'error' ? 'error' : 'error is-warning'} onClick={() => currentEngine()?.reveal(entry.line, entry.column)}>
            {entry.category === 'error' ? <ErrorMark /> : <WarnMark />}
            <span className="where">
              {entry.line}:{entry.column}
            </span>
            <span className="diagnostic-message">{entry.message}</span>
            {entry.code !== 0 && <span className="code-number">TS{entry.code}</span>}
          </button>
        </li>
      ))}
    </ol>
  );
}
