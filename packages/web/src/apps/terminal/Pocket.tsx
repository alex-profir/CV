// The pocket terminal (006 contracts/terminal.md The pocket terminal,
// research R18, R46): on a phone, the Terminal in a drawn case, with 8 big keys
// below its screen. A command key runs its command as a control does, and the
// Tab key completes as Tab does; with the vim view open the keys are vim's, and
// act on the view (FR-051, FR-066, FR-078). With the phone's keyboard open a
// strip keeps the Tab key, or Esc in insert mode. The case is decoration only
// (FR-054).
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import type { KeyboardEvent, MouseEvent, SyntheticEvent } from 'react';
import type { AppProps } from '../index.ts';
import { fill, siteText } from '../../site-text.ts';
import { focusCommandLine, tabComplete } from './CommandLine.tsx';
import { TabMark } from './glyphs/TabMark.tsx';
import { session } from './session.ts';
import { runInShell, Terminal } from './Terminal.tsx';
import { useOnScreenKeyboard } from './useOnScreenKeyboard.ts';

const words = siteText.terminal.pocket;

// A vim key is a normal mode key: from insert mode it leaves it first.
function vimKey(key: string) {
  if (session.get().vim?.mode === 'insert') session.vim({ key: 'Escape' });
  // A `/` or `:` being typed would take the key: drop it first (FR-066).
  if (key.startsWith(':') || session.get().vim?.entry != null) session.vim({ cancel: true });
  if (key.startsWith(':')) {
    session.vim({ key: ':' });
    session.vim({ submit: key.slice(1) });
    return;
  }
  for (const each of key) session.vim({ key: each });
}

// Focus stays where it is, so a phone's keyboard stays open (research R46).
const keepFocus = (event: SyntheticEvent) => event.preventDefault();

export function Pocket(props: AppProps) {
  const root = useRef<HTMLDivElement>(null);
  const keyboard = useOnScreenKeyboard(root);

  // The keyboard open: once the keys have made room, the screen shows the
  // command line at its foot, with the newest output above it (FR-053).
  useEffect(() => {
    if (!keyboard) return undefined;
    const frame = requestAnimationFrame(() => {
      const screen = root.current?.querySelector<HTMLElement>('.terminal-screen');
      if (screen) screen.scrollTop = screen.scrollHeight - screen.clientHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [keyboard]);
  const mode = () => session.get().vim?.mode ?? null;
  const vimMode = useSyncExternalStore(session.subscribe, mode, mode);
  const vim = vimMode !== null;
  const [active, setActive] = useState(0);
  const name = props.resume.basics?.name;
  const keys = vim ? words.vim.map((each) => ({ line: each.key, label: fill(words.vimKeyName, { name: each.name, key: each.key }) })) : [...words.commands.map((line) => ({ line, label: line })), { line: words.tabKey.key, label: words.tabKey.name }];

  const press = (line: string) => (event: MouseEvent) => {
    const touch = (event.nativeEvent as PointerEvent).pointerType === 'touch';
    const terminal = root.current?.querySelector('.terminal');
    if (!vim) {
      if (runInShell(line, props.os)) requestAnimationFrame(() => focusCommandLine(terminal?.querySelector<HTMLInputElement>('input.command-line') ?? null, touch));
      return;
    }
    // `i` opens the text area and the phone's keyboard, which takes focus in
    // the tap's own handler (research R48).
    if (line === 'i') {
      flushSync(() => vimKey(line));
      return;
    }
    vimKey(line);
    // `/` moves focus to the search entry itself; every other key keeps it
    // in the view, and `:q` hands it to the command line.
    if (line !== '/') requestAnimationFrame(() => terminal?.querySelector<HTMLElement>('.vim-text, input.command-line')?.focus({ preventScroll: true }));
  };

  // The Tab key: Tab's completion, from the command line's text and caret
  // (FR-078). From the keyboard or the toolbar, focus goes back to the line.
  const complete = (event: MouseEvent) => {
    const input = root.current?.querySelector<HTMLInputElement>('input.command-line') ?? null;
    if (input === null) return;
    if (document.activeElement !== input) focusCommandLine(input, (event.nativeEvent as PointerEvent).pointerType === 'touch');
    void tabComplete(input);
  };
  const tabKey = (props: { tabIndex?: number; onFocus?: () => void }) => (
    <button key={words.tabKey.key} type="button" className="pocket-key" aria-label={words.tabKey.name} onPointerDown={keepFocus} onMouseDown={keepFocus} onClick={complete} data-req="006-terminal-FR-078" {...props}>
      {words.tabKey.key}
      <TabMark />
    </button>
  );

  // One Tab stop; the arrows, Home and End move between keys.
  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = keys.length - 1;
    const next = { ArrowRight: active + 1, ArrowDown: active + 1, ArrowLeft: active - 1, ArrowUp: active - 1, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const index = (next + keys.length) % keys.length;
    setActive(index);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('.pocket-key')[index]?.focus();
  };

  return (
    <div ref={root} className="pocket" data-keyboard={keyboard ? '' : undefined} data-vim={vim ? '' : undefined} data-req="006-terminal-FR-024 006-terminal-FR-025 006-terminal-FR-052 006-terminal-FR-053">
      {/* The drawn case, above the screen and below the keys, in the
          page in the order it is seen (004 FR-027). */}
      <div className="pocket-case" aria-hidden="true" data-req="006-terminal-FR-054">
        <p className="pocket-brand">
          <span className="pocket-light" />
          {vim ? words.vimBrand : words.brand}
        </p>
      </div>
      <div className="pocket-screen">
        <Terminal {...props} />
      </div>
      <div className="pocket-keys" role="toolbar" aria-label={vim ? words.vimKeys : words.commandKeys} onKeyDown={move} data-req="006-terminal-FR-051 006-terminal-FR-066 006-terminal-FR-078">
        {keys.map((key, index) => {
          const roving = { tabIndex: index === Math.min(active, keys.length - 1) ? 0 : -1, onFocus: () => setActive(index) };
          return key.line === words.tabKey.key ? (
            tabKey(roving)
          ) : (
            <button key={key.line} type="button" className="pocket-key" aria-label={key.label} onClick={press(key.line)} {...roving}>
              {key.line}
            </button>
          );
        })}
      </div>
      {keyboard && vimMode !== 'normal' && (
        <div className="pocket-strip" data-req="006-terminal-FR-066 006-terminal-FR-078">
          {vim ? (
            <button type="button" className="pocket-key" aria-label={words.escKey.name} onPointerDown={keepFocus} onMouseDown={keepFocus} onClick={() => session.vim({ key: 'Escape' })}>
              {words.escKey.key}
            </button>
          ) : (
            tabKey({})
          )}
        </div>
      )}
      <div className="pocket-foot" aria-hidden="true" data-req="006-terminal-FR-054">
        <span className="pocket-grille" />
        {name !== undefined && name !== '' && <p className="pocket-name">{name}</p>}
      </div>
    </div>
  );
}
