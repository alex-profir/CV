// The Terminal's content (006 contracts/terminal.md Structure): the greeting,
// a run per command, and the prompt line, or the vim view in their place.
// The session lives outside the component (research R5), so unmounting on
// mobile Home or a shell switch keeps it (FR-021).
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import type { AppOs, AppProps } from '../index.ts';
import { fill, siteText } from '../../site-text.ts';
import { CommandLine, focusCommandLine, Prompt } from './CommandLine.tsx';
import { Output } from './Output.tsx';
import type { RunControl } from './Output.tsx';
import { session } from './session.ts';
import type { VimInput } from './engine/vim.ts';
import { VimView } from './VimView.tsx';

const words = siteText.terminal;

// The greeting's intro, its `{help}` an inline control.
function Intro({ pattern, run }: { pattern: string; run: RunControl }) {
  return (
    <p className="greeting-intro">
      {pattern.split(/(\{help\})/).map((part, index) =>
        part === '{help}' ? (
          <button key={index} type="button" className="command-inline" aria-label="help" onClick={(event) => run('help', event.nativeEvent instanceof PointerEvent && event.nativeEvent.pointerType === 'touch')} data-req="006-terminal-FR-015 006-terminal-FR-034">
            help
          </button>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </p>
  );
}

// Runs a line as typed, and does what it asks of the shell (FR-014). Gives
// back whether focus stays with the Terminal: after `open` and `exit` the
// shell moves it.
export function runInShell(line: string, os: AppOs): boolean {
  const result = session.run(line, os.shell);
  if (result?.kind !== 'os') return true;
  if ('open' in result.action) os.open(result.action.open);
  else os.exit();
  return false;
}

export function Terminal({ resume, os }: AppProps) {
  const state = useSyncExternalStore(session.subscribe, session.get, session.get);
  const screen = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const desktop = os.shell === 'desktop';
  const { name, label } = resume.basics ?? {};

  const focusLine = useCallback(() => input.current?.focus({ preventScroll: true }), []);

  const run = useCallback((line: string) => runInShell(line, os), [os]);

  // A control or key runs its line as typed, and focus comes back to the
  // command line, with no phone keyboard when it was tapped (FR-015).
  const runControl: RunControl = useCallback(
    (line, touch) => {
      if (run(line)) requestAnimationFrame(() => focusCommandLine(input.current, touch));
    },
    [run],
  );

  const sendVim = useCallback((vimInput: VimInput) => session.vim(vimInput), []);

  // Back from the vim view: the command line takes focus (FR-064).
  const vimOpen = state.vim !== null;
  const wasOpen = useRef(vimOpen);
  useEffect(() => {
    if (wasOpen.current && !vimOpen) focusLine();
    if (!wasOpen.current && vimOpen) screen.current?.closest('.terminal')?.querySelector<HTMLElement>('.vim-text')?.focus();
    wasOpen.current = vimOpen;
  }, [vimOpen, focusLine]);

  // The output scrolls inside the screen, never the page (research R14):
  // after a run, its heading at the top of the view, as far as it goes.
  const entries = state.entries.length;
  const shown = useRef(entries);
  useLayoutEffect(() => {
    const view = screen.current;
    if (view === null) return;
    if (entries > shown.current) {
      const last = view.querySelector<HTMLElement>(':scope > section.run:last-of-type');
      if (last !== null) view.scrollTop = Math.min(last.offsetTop - view.offsetTop, view.scrollHeight - view.clientHeight);
    }
    shown.current = entries;
  }, [entries]);

  // Coming back to a kept session: the scroll position it had, when the
  // screen is drawn again, and when a minimized window is shown again, as a
  // hidden element loses its scroll position (FR-021). Not when the vim view
  // closes: its run was just added and is scrolled to (FR-064).
  const vimShown = useRef(vimOpen);
  useLayoutEffect(() => {
    const fromVim = vimShown.current && !vimOpen;
    vimShown.current = vimOpen;
    const view = screen.current;
    if (view === null) return undefined;
    if (!fromVim) view.scrollTop = session.scrollFor(os.shell);
    let hidden = view.clientHeight === 0;
    const observer = new ResizeObserver(() => {
      const now = view.clientHeight === 0;
      if (hidden && !now) view.scrollTop = session.scrollFor(os.shell);
      hidden = now;
    });
    observer.observe(view);
    return () => observer.disconnect();
  }, [vimOpen, os.shell]);

  return (
    <div className="terminal" data-shell-look={desktop ? 'desktop' : 'pocket'} data-req="006-terminal-FR-019 006-terminal-FR-023 006-terminal-FR-031 006-terminal-FR-032 006-terminal-FR-033 006-terminal-FR-035">
      <h1 className="visually-hidden" data-req="006-terminal-FR-029">
        {siteText.os.views.terminal}
      </h1>
      {state.vim === null ? (
        <div ref={screen} className="terminal-screen" onScroll={(event) => event.currentTarget.clientHeight > 0 && session.saveScroll(event.currentTarget.scrollTop, os.shell)}>
          {state.greeting && (
            <div className="greeting" data-req="006-terminal-FR-005 006-terminal-FR-030">
              <p className="greeting-status">{desktop ? words.greeting.desktop.status : words.greeting.phone.status}</p>
              <p className="greeting-name">{name === undefined || name === '' ? siteText.siteHeading : label === undefined || label === '' ? fill(words.greeting.nameAlone, { name }) : fill(words.greeting.name, { name, label })}</p>
              <Intro pattern={desktop ? words.greeting.desktop.intro : words.greeting.phone.intro} run={runControl} />
              <div className="chips">
                {words.greeting.commands.map((line) => (
                  <button key={line} type="button" className="command-chip" aria-label={line} onClick={(event) => runControl(line, (event.nativeEvent as PointerEvent).pointerType === 'touch')} data-req="006-terminal-FR-015 006-terminal-FR-034">
                    {line}
                  </button>
                ))}
              </div>
            </div>
          )}
          {state.entries.map((entry) => (
            <section key={entry.id} className="run" aria-labelledby={`run-${entry.id}`} data-req="006-terminal-FR-006 006-terminal-FR-029">
              <h2 className="run-command" id={`run-${entry.id}`}>
                <Prompt folder={entry.folder} time={desktop ? entry.time : null} />
                <span className="run-line">{entry.line}</span>
              </h2>
              {entry.block !== null && entry.block.length > 0 && (
                <div className="run-output" data-req="006-terminal-FR-009 006-terminal-FR-010 006-terminal-FR-011 006-terminal-FR-018">
                  <Output block={entry.block} run={runControl} />
                </div>
              )}
            </section>
          ))}
          <CommandLine
            draft={state.draft}
            folder={state.folder}
            showTime={desktop}
            inputRef={input}
            onDraft={session.setDraft}
            onSubmit={run}
            onStep={session.step}
          />
        </div>
      ) : (
        <VimView state={state.vim} shell={os.shell} send={sendVim} />
      )}
      <div className="terminal-status visually-hidden" role="status" data-req="006-terminal-FR-028">
        {state.announcement !== null && <span key={state.announcement.id}>{state.announcement.text}</span>}
      </div>
    </div>
  );
}
