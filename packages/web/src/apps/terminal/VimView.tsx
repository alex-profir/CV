// The vim view as an editor (006 research R47 to R50, contracts/terminal.md
// The vim view): the model in engine/vim.ts, drawn. In normal mode the text
// takes unmodified printable keys, Enter, Escape, Page Up and Down, Home, End,
// the arrows, and Ctrl+R on macOS only. In insert mode a real text area, laid
// transparent over the text, takes the typing, so a phone's keyboard opens and
// a screen reader reads it as a field (R48); its `beforeinput` is turned into
// the reducer's inputs, so the reducer's text is the only text. Tab, Shift+Tab
// and every other Ctrl, Alt or Meta key stay the browser's (FR-060, FR-065).
import { memo, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { fill, siteText } from '../../site-text.ts';
import { isMac } from './CommandLine.tsx';
import { rowIndent } from './engine/block.ts';
import type { JsonToken } from './engine/block.ts';
import { lexLine } from './engine/json.ts';
import { shownLines } from './engine/vim.ts';
import type { Match, VimInput, VimSource, VimState } from './engine/vim.ts';
import { messageText, messageTone } from './session.ts';

type Props = { state: VimState; shell: 'desktop' | 'mobile'; send: (input: VimInput) => void };

const KEYS = new Set(['Enter', 'Escape', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const INSERT_KEYS = new Set(['Escape', 'Tab', 'Home', 'End', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

const words = siteText.terminal.vim;

// The name the view and its text go by (FR-065).
function labelOf({ file }: VimSource): string {
  const form = file.new ? words.labels.new : file.readonly ? words.labels.readonly : words.labels.plain;
  return fill(form, { file: file.name });
}

const tokensOf = (text: string, type: VimSource['type']): readonly JsonToken[] => (type === 'json' ? lexLine(text) : text === '' ? [] : [{ kind: 'string', text }]);

type Caret = { at: number; bar: boolean } | null;

// The cursor: a box on its character, or in insert mode a bar before it.
const Bar = () => <span className="vim-insert-bar" aria-hidden="true" />;

// A run of a line's text, its tokens' classes kept.
function tokenRuns(tokens: readonly JsonToken[], from: number, to: number, caret: Caret): ReactNode[] {
  const runs: ReactNode[] = [];
  let at = 0;
  for (const [index, token] of tokens.entries()) {
    const start = Math.max(at, from);
    const end = Math.min(at + token.text.length, to);
    if (start < end) {
      const piece = (a: number, b: number, key: string) => (
        <span key={key} className={`json-${token.kind}`}>
          {token.text.slice(a - at, b - at)}
        </span>
      );
      if (caret !== null && caret.at >= start && caret.at < end) {
        if (caret.at > start) runs.push(piece(start, caret.at, `${index}a`));
        if (caret.bar) {
          runs.push(<Bar key={`${index}c`} />);
          runs.push(piece(caret.at, end, `${index}b`));
        } else {
          runs.push(
            <span key={`${index}c`} className="vim-cursor">
              {piece(caret.at, caret.at + 1, `${index}b`)}
            </span>,
          );
          if (caret.at + 1 < end) runs.push(piece(caret.at + 1, end, `${index}d`));
        }
      } else runs.push(piece(start, end, `${index}`));
    }
    at += token.text.length;
  }
  return runs;
}

// A line's code: its tokens, each search match a `mark` and the cursor on its
// character (FR-062).
function Code({ tokens, matches, current, caret }: { tokens: readonly JsonToken[]; matches: readonly Match[]; current: Match | null; caret: Caret }) {
  const length = tokens.reduce((sum, token) => sum + token.text.length, 0);
  const parts: ReactNode[] = [];
  let at = 0;
  for (const [index, match] of matches.entries()) {
    if (match.start > at) parts.push(...tokenRuns(tokens, at, match.start, caret));
    const runs = tokenRuns(tokens, match.start, match.end, caret);
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
    at = match.end;
  }
  if (at < length) parts.push(...tokenRuns(tokens, at, length, caret));
  if (caret !== null && caret.at >= length)
    parts.push(
      caret.bar ? (
        <Bar key="end" />
      ) : (
        <span key="end" className="vim-cursor">
          {' '}
        </span>
      ),
    );
  return <>{parts}</>;
}

type LineProps = {
  line: number;
  text: string;
  type: VimSource['type'];
  numbers: boolean;
  caret: Caret;
  matches: readonly Match[];
  current: Match | null;
  fold: { start: number; lines: number; key: string; closed: boolean } | null;
  send: (input: VimInput) => void;
};

const sameMatches = (a: readonly Match[], b: readonly Match[]) => a.length === b.length && a.every((match, index) => match.start === b[index]!.start && match.end === b[index]!.end);

// One shown line; only a line that changed is drawn again (plan Performance
// Goals, FR-079).
const VimLine = memo(
  function VimLine({ line, text, type, numbers, caret, matches, current, fold, send }: LineProps) {
    const tokens = useMemo(() => tokensOf(text, type), [text, type]);
    const indent = /^ */.exec(text)![0].length;
    const code = <Code tokens={tokens} matches={matches} current={current} caret={caret} />;
    const shown = fold?.closed === true ? fill(words.fold, { n: fold.lines, key: fold.key, bracket: text.trim().slice(-1) }) : '';
    return (
      <div key={line} className="vim-line" data-line={line} style={{ ...rowIndent(indent), '--indent': '0ch' } as CSSProperties}>
        {numbers && (
          <span className="vim-number" aria-hidden="true">
            {line + 1}
          </span>
        )}
        <span className="vim-code">
          {fold === null ? (
            code
          ) : (
            <button type="button" className="vim-fold" tabIndex={-1} aria-expanded={!fold.closed} onClick={() => send({ fold: fold.start })} data-req="006-terminal-FR-061 006-terminal-FR-034">
              {fold.closed ? (
                <>
                  {caret !== null && <span className="vim-cursor">{shown.slice(0, 1)}</span>}
                  {shown.slice(caret === null ? 0 : 1)}
                </>
              ) : (
                code
              )}
            </button>
          )}
        </span>
      </div>
    );
  },
  (a, b) =>
    a.line === b.line &&
    a.text === b.text &&
    a.type === b.type &&
    a.numbers === b.numbers &&
    a.send === b.send &&
    a.caret?.at === b.caret?.at &&
    a.caret?.bar === b.caret?.bar &&
    a.current?.start === b.current?.start &&
    sameMatches(a.matches, b.matches) &&
    a.fold?.start === b.fold?.start &&
    a.fold?.lines === b.fold?.lines &&
    a.fold?.key === b.fold?.key &&
    a.fold?.closed === b.fold?.closed,
);

// How far through the file the view is, as vim's ruler says it: All when
// every shown line is in view, Top when the first is, Bot when the last is,
// else the lines above the view as a share of those out of it (FR-058).
function position(view: HTMLElement): string {
  const box = view.getBoundingClientRect();
  const top = box.top + view.clientTop;
  const bottom = top + view.clientHeight;
  let above = 0;
  let below = 0;
  for (const line of view.querySelectorAll<HTMLElement>('.vim-line')) {
    const rect = line.getBoundingClientRect();
    if (rect.top < top - 1) above += 1;
    else if (rect.bottom > bottom + 1) below += 1;
  }
  if (above === 0) return below === 0 ? words.positions.all : words.positions.top;
  if (below === 0) return words.positions.bottom;
  return `${Math.floor((100 * above) / (above + below))}%`;
}

function Help({ source }: { source: VimSource }) {
  const { file } = source;
  const suffix = file.path === null ? words.keysSuffix.piped : file.readonly ? words.keysSuffix.readonly : '';
  const heading = `${fill(words.keysHeading, { file: file.name })}${suffix}`;
  return (
    // It scrolls on its own, so it takes focus, to be scrolled by keys.
    <div className="vim-help" role="region" tabIndex={0} aria-label={heading} data-req="006-terminal-FR-064">
      <p className="vim-help-heading">{heading}</p>
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
      <p className="vim-help-note">{words.keysNote}</p>
    </div>
  );
}

// The text's character under a point, as a line and column (FR-079): through
// `caretPositionFromPoint`, or `caretRangeFromPoint` in Safari.
type CaretDocument = Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null; caretRangeFromPoint?: (x: number, y: number) => Range | null };

function pointAt(view: HTMLElement, x: number, y: number): { line: number; column: number } | null {
  const place = view.ownerDocument as CaretDocument;
  const position = place.caretPositionFromPoint?.(x, y);
  const range = position === undefined ? place.caretRangeFromPoint?.(x, y) : null;
  const node = position?.offsetNode ?? range?.startContainer;
  const offset = position?.offset ?? range?.startOffset ?? 0;
  if (node === undefined || node === null) return null;
  const element = node instanceof Element ? node : node.parentElement;
  const row = element?.closest<HTMLElement>('.vim-line');
  const code = row?.querySelector('.vim-code');
  if (row === null || row === undefined || code === null || code === undefined || !view.contains(row)) return null;
  let column = 0;
  if (code.contains(node)) {
    const walker = view.ownerDocument.createTreeWalker(code, NodeFilter.SHOW_TEXT);
    for (let at = walker.nextNode(); at !== null; at = walker.nextNode()) {
      if (at === node) {
        // The nearest boundary may be past the character under the point.
        const range = view.ownerDocument.createRange();
        range.setStart(node, offset);
        range.collapse(true);
        const past = offset > 0 && range.getBoundingClientRect().left > x;
        return { line: Number(row.dataset.line), column: column + offset - (past ? 1 : 0) };
      }
      column += at.textContent?.length ?? 0;
    }
  }
  return { line: Number(row.dataset.line), column };
}

const offsetOf = (lines: readonly string[], cursor: { line: number; column: number }) => lines.slice(0, cursor.line).reduce((sum, line) => sum + line.length + 1, 0) + cursor.column;

export function VimView({ state, shell, send }: Props) {
  const status = useId();
  const text = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const entry = useRef<HTMLInputElement>(null);
  const { source, cursor, search, mode } = state;
  const inserting = mode === 'insert';
  const lines = shownLines(state);
  const current = search === null || search.matches.length === 0 ? null : (search.matches[search.current] ?? null);
  const label = labelOf(source);
  const buffer = state.lines.join('\n');

  // `/` and `:` move focus to their entry, and back when it closes.
  const entering = state.entry !== null;
  useEffect(() => {
    if (entering) entry.current?.focus();
    else if (text.current !== null && text.current.ownerDocument.activeElement === text.current.ownerDocument.body) text.current.focus();
  }, [entering]);

  // Into insert mode focus goes to the text area, and back to the text after
  // Escape (FR-065, research R48).
  const wasInserting = useRef(inserting);
  useLayoutEffect(() => {
    if (inserting && !wasInserting.current) area.current?.focus({ preventScroll: true });
    if (!inserting && wasInserting.current) text.current?.focus({ preventScroll: true });
    wasInserting.current = inserting;
  }, [inserting]);

  // The text area holds the buffer, with its caret at the cursor.
  useLayoutEffect(() => {
    const field = area.current;
    if (field === null) return;
    if (field.value !== buffer) field.value = buffer;
    const at = offsetOf(state.lines, cursor);
    if (field.selectionStart !== at || field.selectionEnd !== at) field.setSelectionRange(at, at);
  });

  // Typing, turned into the reducer's inputs, so its text is the only text.
  // What can't be cancelled, a composition or autocorrect, is read on `input`
  // by comparing with the buffer, then replaced by the buffer's text.
  useEffect(() => {
    const field = area.current;
    if (field === null) return undefined;
    const before = (event: InputEvent) => {
      if (event.isComposing || !event.cancelable) return;
      const typed = event.data ?? event.dataTransfer?.getData('text/plain') ?? null;
      if (event.inputType === 'insertLineBreak' || event.inputType === 'insertParagraph') send({ lineBreak: true });
      else if (event.inputType === 'deleteContentBackward') send({ delete: 'backward' });
      else if (event.inputType === 'deleteContentForward') send({ delete: 'forward' });
      else if (event.inputType.startsWith('insert') && typed !== null) send({ text: typed.replace(/\r\n?/g, '\n') });
      else return;
      event.preventDefault();
    };
    const reconcile = () => {
      const held = field.dataset.buffer ?? '';
      const value = field.value;
      if (value === held) return;
      let start = 0;
      while (start < value.length && start < held.length && value[start] === held[start]) start += 1;
      let tail = 0;
      while (tail < value.length - start && tail < held.length - start && value[value.length - 1 - tail] === held[held.length - 1 - tail]) tail += 1;
      const removed = held.length - start - tail;
      const upTo = held.slice(0, start + removed).split('\n');
      send({ point: { line: upTo.length - 1, column: upTo.at(-1)!.length } });
      for (let times = 0; times < removed; times += 1) send({ delete: 'backward' });
      const added = value.slice(start, value.length - tail);
      if (added !== '') send({ text: added });
    };
    const input = (event: Event) => {
      if (!(event as InputEvent).isComposing) reconcile();
    };
    field.addEventListener('beforeinput', before);
    field.addEventListener('input', input);
    field.addEventListener('compositionend', reconcile);
    return () => {
      field.removeEventListener('beforeinput', before);
      field.removeEventListener('input', input);
      field.removeEventListener('compositionend', reconcile);
    };
  }, [inserting, send]);

  // Keep the cursor's line in the view, by the view's own scroll.
  useLayoutEffect(() => {
    const view = text.current;
    const line = view?.querySelector<HTMLElement>(`[data-line="${cursor.line}"]`);
    if (view === null || view === undefined || line === null || line === undefined) return;
    const top = line.offsetTop - view.offsetTop;
    if (top < view.scrollTop) view.scrollTop = top;
    else if (top + line.offsetHeight > view.scrollTop + view.clientHeight) view.scrollTop = top + line.offsetHeight - view.clientHeight;
  }, [cursor.line]);

  // The status line's position, read from the laid-out view after each
  // render, scroll and resize.
  const [scroll, setScroll] = useState<string>(words.positions.all);
  const measure = () => {
    if (text.current !== null) setScroll(position(text.current));
  };
  useLayoutEffect(measure);
  useEffect(() => {
    const view = text.current;
    if (view === null) return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(view);
    return () => observer.disconnect();
  }, []);

  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    // Ctrl+R redoes on macOS only: other systems' browsers reload with it.
    if (event.ctrlKey && !event.altKey && !event.metaKey && event.key === 'r' && isMac()) {
      event.preventDefault();
      send({ key: 'r', ctrl: true });
      return;
    }
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.key.length !== 1 && !KEYS.has(event.key)) return;
    event.preventDefault();
    const row = event.currentTarget.querySelector<HTMLElement>('.vim-line');
    const page = row === null || row.offsetHeight === 0 ? undefined : Math.max(1, Math.floor(event.currentTarget.clientHeight / row.offsetHeight) - 1);
    send(page === undefined ? { key: event.key } : { key: event.key, page });
  };

  const insertKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || !INSERT_KEYS.has(event.key)) return;
    event.preventDefault();
    send({ key: event.key });
  };

  // A click or tap on the text moves the cursor there (FR-079); a drag that
  // selects text keeps its selection.
  const pointer = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest('button') !== null) return;
    const selection = event.currentTarget.ownerDocument.getSelection();
    if (selection !== null && !selection.isCollapsed) return;
    const point = pointAt(event.currentTarget, event.clientX, event.clientY);
    if (point !== null) send({ point });
    if (inserting) area.current?.focus({ preventScroll: true });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send({ submit: entry.current?.value ?? '' });
  };

  // A `/` or `:` being typed is dropped first, or the command would go to it.
  const chip = (command: string) => () => {
    send({ cancel: true });
    if (inserting) send({ key: 'Escape' });
    send({ key: ':' });
    send({ submit: command });
    text.current?.focus();
  };

  const modeWord = state.help ? words.modes.help : inserting ? words.modes.insert : words.modes.normal;

  return (
    <section className="vim" aria-label={label} data-req="006-terminal-FR-058 006-terminal-FR-059 006-terminal-FR-065">
      <div className="vim-body">
        <div
          ref={text}
          className="vim-text"
          tabIndex={inserting ? -1 : 0}
          role="document"
          aria-label={label}
          aria-roledescription={words.roleDescription}
          aria-describedby={status}
          data-focus-home={inserting ? undefined : ''}
          data-numbers={state.numbers ? '' : undefined}
          onKeyDown={keyDown}
          onScroll={measure}
          onMouseDown={(event) => {
            if (inserting) event.preventDefault();
          }}
          onClick={pointer}
          data-req="006-terminal-FR-060 006-terminal-FR-063 006-terminal-FR-079"
        >
          {lines.map((line) => {
            const fold = state.folds.find((each) => each.start === line);
            return (
              <VimLine
                key={line}
                line={line}
                text={state.lines[line]!}
                type={source.type}
                numbers={state.numbers}
                caret={line === cursor.line ? { at: cursor.column, bar: inserting } : null}
                matches={search?.matches.filter((match) => match.line === line) ?? []}
                current={current !== null && current.line === line ? current : null}
                fold={fold === undefined ? null : { start: fold.start, lines: fold.end - fold.start + 1, key: fold.key, closed: state.closed.has(fold.key) }}
                send={send}
              />
            );
          })}
        </div>
        {inserting && (
          <textarea
            ref={area}
            className="vim-insert"
            aria-label={label}
            aria-describedby={status}
            defaultValue={buffer}
            data-buffer={buffer}
            data-focus-home=""
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            onKeyDown={insertKeyDown}
            data-req="006-terminal-FR-065 006-terminal-FR-079"
          />
        )}
      </div>
      {state.help && <Help source={source} />}
      <div className="vim-status" id={status} data-req="006-terminal-FR-058 006-terminal-FR-081">
        <span className={state.help ? 'vim-mode is-help' : 'vim-mode'}>{modeWord}</span>
        <span className="vim-file">{source.file.name}</span>
        {source.file.readonly && <span className="vim-ro">{words.readOnlyMark}</span>}
        {state.modified && <span className="vim-modified">{words.modifiedMark}</span>}
        {source.pipe !== null && <span className="vim-pipe">{source.pipe}</span>}
        <span className="vim-type">{source.type}</span>
        <span className="vim-position">
          {cursor.line + 1},{cursor.column + 1}
        </span>
        <span className="vim-scroll">{scroll}</span>
      </div>
      <div className="vim-message" data-req="006-terminal-FR-060 006-terminal-FR-080">
        {state.entry === null ? (
          <span className="vim-message-text" data-tone={messageTone(state.message)}>
            {messageText(state.message, state, shell)}
          </span>
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
