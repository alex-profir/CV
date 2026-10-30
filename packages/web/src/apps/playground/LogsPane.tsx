// The Logs pane (contracts/playground.md, FR-034, FR-035, FR-043, FR-044,
// FR-047): what the code logged, oldest first, each entry with its level's
// word and glyph, its values as text, and for an uncaught error a button to
// its line. Values reach the page only as React text: nothing the code
// prints is ever markup.
import { useLayoutEffect, useRef } from 'react';
import { counted, fill, siteText } from '../../site-text.ts';
import { currentEngine } from './controller.ts';
import { ErrorMark, InfoMark, WarnMark } from './Glyphs.tsx';
import { LOG_LIMITS } from './limits.ts';
import { outcomeText } from './running.ts';
import { useSession } from './session.ts';
import type { LogEntry, NoteKey, Shown } from './types.ts';

const words = siteText.playground;
const logs = words.logs;

// Numbers as the design writes them, with thousands separated.
const grouped = (n: number) => n.toLocaleString('en');

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

// How near its end, in pixels, the pane counts as scrolled to it.
const SCROLL_SLACK = 8;

// A value as text: strings bare at the top and quoted inside others.
export function shownText(value: Shown, nested = false): string {
  const more = (n: number) => (n > 0 ? [fill(logs.more, { n: grouped(n) })] : []);
  switch (value.t) {
    case 'str':
      return nested ? JSON.stringify(value.v) : value.v;
    case 'num':
    case 'bigint':
    case 'bool':
    case 'sym':
    case 'date':
      return value.v;
    case 'null':
      return 'null';
    case 'undef':
      return 'undefined';
    case 'fn':
      return fill(value.cls ? logs.className : logs.functionName, { name: value.name === '' ? logs.anonymous : value.name });
    case 'err':
      return value.message === '' ? value.name : `${value.name}: ${value.message}`;
    case 'circ':
      return logs.circular;
    case 'deep':
      return logs.deep;
    case 'arr':
      return `[${[...value.items.map((item) => shownText(item, true)), ...more(value.more)].join(', ')}]`;
    case 'set':
      return `Set(${value.items.length + value.more}) {${[...value.items.map((item) => ` ${shownText(item, true)}`), ...more(value.more).map((text) => ` ${text}`)].join(',')}${value.items.length + value.more > 0 ? ' ' : ''}}`;
    case 'map':
      return `Map(${value.entries.length + value.more}) {${[...value.entries.map(([key, item]) => ` ${shownText(key, true)} => ${shownText(item, true)}`), ...more(value.more).map((text) => ` ${text}`)].join(',')}${value.entries.length + value.more > 0 ? ' ' : ''}}`;
    case 'obj': {
      const body = [...value.entries.map(([key, item]) => ` ${IDENTIFIER.test(key) ? key : JSON.stringify(key)}: ${shownText(item, true)}`), ...more(value.more).map((text) => ` ${text}`)];
      const open = value.ctor === null ? '{' : `${value.ctor} {`;
      return body.length === 0 ? `${open}}` : `${open}${body.join(',')} }`;
    }
  }
}

function noteText(note: NoteKey): string {
  switch (note.key) {
    case 'noErrors':
      return logs.noErrors;
    case 'errorsNote':
      return fill(counted(logs.errorsNote, note.n), { n: note.n });
    case 'nothingRan':
      return note.reason === 'packages' ? words.editor.packages : fill(logs.nothingRan, { option: 'noEmitOnError' });
    case 'prompt':
    case 'confirm':
      return fill(logs[note.key], { name: note.key });
    case 'ended':
      return outcomeText(note.outcome);
  }
}

function Level({ level }: { level: LogEntry['level'] }) {
  const mark = level === 'info' || level === 'alert' ? <InfoMark /> : level === 'warn' ? <WarnMark /> : level === 'error' ? <ErrorMark /> : null;
  return (
    <span className="level">
      {mark}
      {level === 'alert' ? logs.alertPrefix : logs.levels[level]}
    </span>
  );
}

function Entry({ entry }: { entry: LogEntry }) {
  const text = entry.note !== undefined ? noteText(entry.note) : entry.values.map((value) => shownText(value)).join(' ');
  return (
    <li className="log" data-level={entry.level}>
      <Level level={entry.level} />
      <span className="value">
        {text}
        {entry.cut === true && <span className="cut"> {fill(logs.cut, { limit: grouped(LOG_LIMITS.chars) })}</span>}
      </span>
      {entry.line !== undefined && (
        <button type="button" className="log-line" aria-label={fill(logs.lineName, { n: entry.line })} onClick={() => currentEngine()?.reveal(entry.line!, 1)}>
          {fill(logs.line, { n: entry.line })}
        </button>
      )}
    </li>
  );
}

export function LogsPane() {
  const book = useSession((state) => state.logs);
  const timers = useSession((state) => (state.run !== null && state.run.outcome === null ? state.run.pending.timers : 0));
  const list = useRef<HTMLOListElement>(null);
  // The pane's height before the latest entries, to tell whether it was
  // scrolled to its end.
  const before = useRef(0);
  // The latest entries stay in view while the visitor hasn't scrolled up.
  useLayoutEffect(() => {
    const pane = list.current?.closest<HTMLElement>('.pane');
    if (pane === null || pane === undefined) return;
    if (pane.scrollTop + pane.clientHeight >= before.current - SCROLL_SLACK) pane.scrollTop = pane.scrollHeight;
    before.current = pane.scrollHeight;
  }, [book.entries]);
  if (book.entries.length === 0 && book.dropped === 0) return <p className="empty">{words.panes.noLogs}</p>;
  return (
    <div className="logs-body">
      {timers > 0 && <p className="pane-caption">{fill(counted(words.panes.waiting, timers), { n: timers })}</p>}
      {book.dropped > 0 && <p className="logs-dropped">{fill(counted(logs.dropped, book.dropped), { n: grouped(book.dropped), limit: grouped(LOG_LIMITS.entries) })}</p>}
      <ol ref={list} className="logs">
        {book.entries.map((entry) => (
          <Entry key={entry.id} entry={entry} />
        ))}
      </ol>
    </div>
  );
}
