// The pocket terminal (006 contracts/terminal.md The pocket terminal,
// research R18): on a phone, the Terminal in a drawn case, with 8 big keys
// below its screen. A command key runs its command as a control does; with
// the vim view open the keys are vim's, and act on the view (FR-051,
// FR-066). The case is decoration only (FR-054).
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import type { AppProps } from '../index.ts';
import { fill, siteText } from '../../site-text.ts';
import { focusCommandLine } from './CommandLine.tsx';
import { session } from './session.ts';
import { runInShell, Terminal } from './Terminal.tsx';
import { useOnScreenKeyboard } from './useOnScreenKeyboard.ts';

const words = siteText.terminal.pocket;

// What a vim key sends to the view.
function vimKey(key: string) {
  if (key === ':q') {
    // A `/` or `:` being typed would take the `q`: drop it first (FR-066).
    session.vim({ cancel: true });
    session.vim({ key: ':' });
    session.vim({ submit: 'q' });
    return;
  }
  for (const each of key) session.vim({ key: each });
}

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
  const vim = useSyncExternalStore(session.subscribe, () => session.get().vim !== null, () => session.get().vim !== null);
  const [active, setActive] = useState(0);
  const name = props.resume.basics?.name;
  const keys = vim ? words.vim.map((each) => ({ line: each.key, label: fill(words.vimKeyName, { name: each.name, key: each.key }) })) : words.commands.map((line) => ({ line, label: line }));

  const press = (line: string) => (event: MouseEvent) => {
    const touch = (event.nativeEvent as PointerEvent).pointerType === 'touch';
    const terminal = root.current?.querySelector('.terminal');
    if (!vim) {
      if (runInShell(line, props.os)) requestAnimationFrame(() => focusCommandLine(terminal?.querySelector<HTMLInputElement>('input.command-line') ?? null, touch));
      return;
    }
    vimKey(line);
    // `/` moves focus to the search entry itself; every other key keeps it
    // in the view, and `:q` hands it to the command line.
    if (line !== '/') requestAnimationFrame(() => terminal?.querySelector<HTMLElement>('.vim-text, input.command-line')?.focus({ preventScroll: true }));
  };

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
    <div ref={root} className="pocket" data-keyboard={keyboard ? '' : undefined} data-req="006-terminal-FR-024 006-terminal-FR-025 006-terminal-FR-052 006-terminal-FR-053">
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
      <div className="pocket-keys" role="toolbar" aria-label={vim ? words.vimKeys : words.commandKeys} onKeyDown={move} data-req="006-terminal-FR-051 006-terminal-FR-066">
        {keys.map((key, index) => (
          <button
            key={key.line}
            type="button"
            className="pocket-key"
            tabIndex={index === Math.min(active, keys.length - 1) ? 0 : -1}
            aria-label={key.label}
            onFocus={() => setActive(index)}
            onClick={press(key.line)}
          >
            {key.line}
          </button>
        ))}
      </div>
      <div className="pocket-foot" aria-hidden="true" data-req="006-terminal-FR-054">
        <span className="pocket-grille" />
        {name !== undefined && name !== '' && <p className="pocket-name">{name}</p>}
      </div>
    </div>
  );
}
