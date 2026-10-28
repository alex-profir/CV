// The read-only vim view (006 research R12, contracts/terminal.md The vim
// view): the model in engine/vim.ts, drawn. The text takes only unmodified
// printable keys, Escape, Page Up and Down, Home, End and the arrows; Tab and
// every Ctrl, Alt or Meta key stay the browser's (FR-060, FR-065).
import { useEffect, useId, useLayoutEffect, useRef } from 'react';
import type { CSSProperties, FormEvent, KeyboardEvent, ReactNode } from 'react';
import { fill, siteText } from '../../site-text.ts';
import { rowIndent } from './engine/block.ts';
import type { JsonRow } from './engine/block.ts';
import { lineText, shownLines } from './engine/vim.ts';
import type { Match, VimInput, VimState } from './engine/vim.ts';
import { messageText } from './session.ts';

type Props = { state: VimState; shell: 'desktop' | 'mobile'; send: (input: VimInput) => void };

const KEYS = new Set(['Escape', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

const words = siteText.terminal.vim;

// A run of a line's text, its tokens' classes kept.
function tokenRuns(row: JsonRow, from: number, to: number, cursor: number | null): ReactNode[] {
  const runs: ReactNode[] = [];
  let at = 0;
  for (const [index, token] of row.tokens.entries()) {
    const start = Math.max(at, from);
    const end = Math.min(at + token.text.length, to);
    if (start < end) {
      const piece = (a: number, b: number, key: string) => (
        <span key={key} className={`json-${token.kind}`}>
          {token.text.slice(a - at, b - at)}
        </span>
      );
      if (cursor !== null && cursor >= start && cursor < end) {
        if (cursor > start) runs.push(piece(start, cursor, `${index}a`));
        runs.push(
          <span key={`${index}c`} className="vim-cursor">
            {piece(cursor, cursor + 1, `${index}b`)}
          </span>,
        );
        if (cursor + 1 < end) runs.push(piece(cursor + 1, end, `${index}d`));
      } else runs.push(piece(start, end, `${index}`));
    }
    at += token.text.length;
  }
  return runs;
}

// A line's code: its tokens, each search match a `mark` and the cursor a
// box on its character (FR-062).
function Code({ row, matches, current, cursor }: { row: JsonRow; matches: readonly Match[]; current: Match | null; cursor: number | null }) {
  const length = row.tokens.reduce((sum, token) => sum + token.text.length, 0);
  const parts: ReactNode[] = [];
  let at = 0;
  for (const [index, match] of matches.entries()) {
    const start = Math.max(0, match.start - row.indent);
    const end = Math.max(start, match.end - row.indent);
    if (start > at) parts.push(...tokenRuns(row, at, start, cursor));
    const runs = tokenRuns(row, start, end, cursor);
    parts.push(
      match === current ? (
        <mark key={`m${index}`} className="vim-match is-current" aria-current="true" data-req="006-terminal-FR-062">
          {runs}
        </mark>
      ) : (
        <mark key={`m${index}`} className="vim-match" data-req="006-terminal-FR-062">
          {runs}
        </mark>
      ),
    );
    at = end;
  }
  if (at < length) parts.push(...tokenRuns(row, at, length, cursor));
  if (cursor !== null && cursor >= length)
    parts.push(
      <span key="end" className="vim-cursor">
        {' '}
      </span>,
    );
  return <>{parts}</>;
}

function position(state: VimState): string {
  const last = state.source.rows.length - 1;
  if (last <= 0) return words.positions.all;
  if (state.cursor.line === 0) return words.positions.top;
  if (state.cursor.line === last) return words.positions.bottom;
  return `${Math.round((100 * state.cursor.line) / last)}%`;
}

function Help({ file }: { file: string }) {
  return (
    // It scrolls on its own, so it takes focus, to be scrolled by keys.
    <div className="vim-help" role="region" tabIndex={0} aria-label={fill(words.helpHeading, { file })} data-req="006-terminal-FR-064">
      <p className="vim-help-heading">{fill(words.helpHeading, { file })}</p>
      <dl className="vim-help-rows">
        {words.helpRows.map((row) => (
          <div key={row.label} className="vim-help-row">
            <dt>{row.label}</dt>
            {row.keys.map((key) => (
              <dd key={key}>{key}</dd>
            ))}
          </div>
        ))}
      </dl>
      <p className="vim-help-note">{words.helpNote}</p>
    </div>
  );
}

export function VimView({ state, shell, send }: Props) {
  const status = useId();
  const text = useRef<HTMLDivElement>(null);
  const entry = useRef<HTMLInputElement>(null);
  const { source, cursor, search } = state;
  const file = source.name;
  const lines = shownLines(state);
  const current = search === null || search.matches.length === 0 ? null : (search.matches[search.current] ?? null);

  // `/` and `:` move focus to their entry, and back when it closes.
  const entering = state.entry !== null;
  useEffect(() => {
    if (entering) entry.current?.focus();
    else if (text.current !== null && text.current.ownerDocument.activeElement === text.current.ownerDocument.body) text.current.focus();
  }, [entering]);

  // Keep the cursor's line in the view, by the view's own scroll.
  useLayoutEffect(() => {
    const view = text.current;
    const line = view?.querySelector<HTMLElement>(`[data-line="${cursor.line}"]`);
    if (view === null || view === undefined || line === null || line === undefined) return;
    const top = line.offsetTop - view.offsetTop;
    if (top < view.scrollTop) view.scrollTop = top;
    else if (top + line.offsetHeight > view.scrollTop + view.clientHeight) view.scrollTop = top + line.offsetHeight - view.clientHeight;
  }, [cursor.line]);

  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.key.length !== 1 && !KEYS.has(event.key)) return;
    event.preventDefault();
    const row = event.currentTarget.querySelector<HTMLElement>('.vim-line');
    const page = row === null || row.offsetHeight === 0 ? undefined : Math.max(1, Math.floor(event.currentTarget.clientHeight / row.offsetHeight) - 1);
    send(page === undefined ? { key: event.key } : { key: event.key, page });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send({ submit: entry.current?.value ?? '' });
  };

  const chip = (command: string) => () => {
    send({ key: ':' });
    send({ submit: command });
    text.current?.focus();
  };

  return (
    <section className="vim" aria-label={fill(words.label, { file })} data-req="006-terminal-FR-058 006-terminal-FR-059 006-terminal-FR-065">
      <div
        ref={text}
        className="vim-text"
        tabIndex={0}
        role="document"
        aria-label={fill(words.label, { file })}
        aria-roledescription={words.roleDescription}
        aria-describedby={status}
        data-focus-home=""
        data-numbers={state.numbers ? '' : undefined}
        onKeyDown={keyDown}
        data-req="006-terminal-FR-060 006-terminal-FR-063"
      >
        {lines.map((line) => {
          const row = source.rows[line]!;
          const fold = source.folds.find((each) => each.start === line);
          const closed = fold !== undefined && state.closed.has(fold.start);
          const at = line === cursor.line ? Math.max(0, cursor.column - row.indent) : null;
          const matches = search?.matches.filter((match) => match.line === line) ?? [];
          const code = <Code row={row} matches={matches} current={current !== null && current.line === line ? current : null} cursor={at} />;
          return (
            <div key={line} className="vim-line" data-line={line} style={rowIndent(row.indent) as CSSProperties}>
              {state.numbers && (
                <span className="vim-number" aria-hidden="true">
                  {line + 1}
                </span>
              )}
              <span className="vim-code">
                {fold === undefined ? (
                  code
                ) : (
                  <button type="button" className="vim-fold" tabIndex={-1} aria-expanded={!closed} onClick={() => send({ fold: fold.start })} data-req="006-terminal-FR-061 006-terminal-FR-034">
                    {closed ? (
                      <>
                        {at !== null && <span className="vim-cursor">{fill(words.fold, { n: fold.end - fold.start + 1, key: fold.key, bracket: lineText(state, line).trim().slice(-1) }).slice(0, 1)}</span>}
                        {fill(words.fold, { n: fold.end - fold.start + 1, key: fold.key, bracket: lineText(state, line).trim().slice(-1) }).slice(at === null ? 0 : 1)}
                      </>
                    ) : (
                      code
                    )}
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </div>
      {state.help && <Help file={file} />}
      <div className="vim-status" id={status}>
        <span className={state.help ? 'vim-mode is-help' : 'vim-mode'}>{state.help ? words.modes.help : words.modes.normal}</span>
        <span className="vim-file">{file}</span>
        <span className="vim-ro">{words.readOnlyMark}</span>
        {source.pipe !== null && <span className="vim-pipe">{source.pipe}</span>}
        <span className="vim-type">{source.type}</span>
        <span className="vim-position">
          {cursor.line + 1},{cursor.column + 1}
        </span>
        <span className="vim-scroll">{position(state)}</span>
      </div>
      <div className="vim-message">
        {state.entry === null ? (
          <span className="vim-message-text">{messageText(state.message, state, shell)}</span>
        ) : (
          <form className="vim-entry-form" onSubmit={submit}>
            <span aria-hidden="true">{state.entry.kind}</span>
            <input
              ref={entry}
              className="vim-entry"
              type="text"
              aria-label={words.entry[state.entry.kind]}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint={state.entry.kind === '/' ? 'search' : 'go'}
              onKeyDown={(event) => {
                if (event.key !== 'Escape') return;
                event.preventDefault();
                send({ cancel: true });
                text.current?.focus();
              }}
            />
          </form>
        )}
        <span className="vim-chips">
          <button type="button" className="command-chip" aria-label={words.chips.help} onClick={chip('help')} data-req="006-terminal-FR-064">
            {words.chips.help}
          </button>
          <button type="button" className="command-chip" aria-label={words.chips.quit} onClick={chip('q')} data-req="006-terminal-FR-064">
            {words.chips.quit}
          </button>
        </span>
      </div>
    </section>
  );
}
