// The Terminal's content (006 contracts/terminal.md Structure): the starter
// chips, a run per command, and the prompt line, or the vim view in their place.
// The session lives outside the component (research R5), so unmounting on
// mobile Home or a shell switch keeps it (FR-021).
import { useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import type { MouseEvent as ScreenMouseEvent, PointerEvent as ScreenPointerEvent } from 'react';
import type { AppOs, AppProps } from '../index.ts';
import { siteText } from '../../site-text.ts';
import { CommandLine, focusCommandLine, isMac, Prompt } from './CommandLine.tsx';
import { Output } from './Output.tsx';
import type { RunControl } from './Output.tsx';
import { session } from './session.ts';
import type { Entry } from './session.ts';
import type { VimInput } from './engine/vim.ts';
import { VimView } from './VimView.tsx';

const words = siteText.terminal;

// The page's selection, so a pointer up can tell whether a drag changed it.
type Selected = { text: string; anchor: Node | null; anchorOffset: number; focus: Node | null; focusOffset: number } | null;

function selected(): Selected {
  const selection = document.getSelection();
  if (selection === null || selection.isCollapsed) return null;
  return { text: selection.toString(), anchor: selection.anchorNode, anchorOffset: selection.anchorOffset, focus: selection.focusNode, focusOffset: selection.focusOffset };
}

const same = (a: Selected, b: Selected) =>
  a === b || (a !== null && b !== null && a.text === b.text && a.anchor === b.anchor && a.anchorOffset === b.anchorOffset && a.focus === b.focus && a.focusOffset === b.focusOffset);

// What a click on the screen leaves alone: links, controls, inputs and the
// vim view (FR-071).
const OWN_TARGETS = 'a, button, input, section.vim';

// Runs a line as typed, in the shell worker, and does what it asks of the
// desktop or phone shell once it has run (FR-014). Gives back whether focus
// stays with the Terminal: it does until the line has run, and `open` and
// `exit` move it then.
export function runInShell(line: string, os: AppOs): boolean {
  session.run(line, os.shell, { open: (view) => os.open(view), exit: () => os.exit() });
  return true;
}

// A line entered, as its heading shows it, and its output once it has run;
// busy while it waits for the shell or runs (FR-070).
function Run({ entry, desktop, run, pending = false }: { entry: Entry; desktop: boolean; run: RunControl; pending?: boolean }) {
  return (
    <section className="run" aria-labelledby={`run-${entry.id}`} aria-busy={pending ? 'true' : undefined} data-req="006-terminal-FR-006 006-terminal-FR-029">
      <h2 className="run-command" id={`run-${entry.id}`}>
        <Prompt cwd={entry.cwd} time={desktop ? entry.time : null} />
        <span className="run-line">{entry.line}</span>
        {entry.cancelled === true && <span className="run-cancel">{words.replies.cancelMark}</span>}
      </h2>
      {entry.block !== null && entry.block.length > 0 && (
        <div className="run-output" data-req="006-terminal-FR-009 006-terminal-FR-010 006-terminal-FR-011 006-terminal-FR-018">
          <Output block={entry.block} run={run} />
        </div>
      )}
    </section>
  );
}

export function Terminal({ os }: AppProps) {
  const state = useSyncExternalStore(session.subscribe, session.get, session.get);
  const screen = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const desktop = os.shell === 'desktop';

  const focusLine = useCallback(() => input.current?.focus({ preventScroll: true }), []);

  // A click on the output's text or empty space puts focus back in the
  // command line, without scrolling or changing its text; a drag that
  // selects text keeps its selection. On touch, the keyboard opens
  // (FR-071, research R36).
  const downSelection = useRef<Selected>(null);
  const pointerDown = useCallback(() => {
    downSelection.current = selected();
  }, []);
  const focusFrom = useCallback((target: EventTarget) => {
    if (target instanceof Element && target.closest(OWN_TARGETS) !== null) return;
    const now = selected();
    if (now !== null && !same(now, downSelection.current)) return;
    const line = input.current;
    if (line === null) return;
    // After a control or key the line has focus with no keyboard asked
    // for: focused again without `inputmode="none"`, it opens.
    const quiet = line.hasAttribute('inputmode');
    line.removeAttribute('inputmode');
    if (document.activeElement === line && quiet) line.blur();
    if (document.activeElement !== line) line.focus({ preventScroll: true });
  }, []);
  // A tap's compatibility mousedown comes after its pointerup and moves
  // focus to the page, so a tap focuses on its click.
  const pointerUp = useCallback((event: ScreenPointerEvent<HTMLDivElement>) => event.pointerType !== 'touch' && focusFrom(event.target), [focusFrom]);
  const click = useCallback((event: ScreenMouseEvent<HTMLDivElement>) => (event.nativeEvent as PointerEvent).pointerType === 'touch' && focusFrom(event.target), [focusFrom]);

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

  // Select all: the Terminal's text and nothing else, with focus kept in
  // the command line (FR-075, research R37).
  const selectAll = useCallback(() => {
    if (screen.current !== null) document.getSelection()?.selectAllChildren(screen.current);
  }, []);

  // Cmd+A or Ctrl+A from the output, focus being on the page or a control
  // in it, does the same.
  useEffect(() => {
    const view = screen.current;
    if (view === null) return undefined;
    const keyDown = (event: KeyboardEvent) => {
      if (event.target === input.current || event.key.toLowerCase() !== 'a' || event.altKey || event.shiftKey) return;
      if (isMac() ? !event.metaKey || event.ctrlKey : !event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      selectAll();
    };
    view.addEventListener('keydown', keyDown);
    return () => view.removeEventListener('keydown', keyDown);
  }, [selectAll, state.vim === null]);

  // The shell starts loading the first time the Terminal opens (FR-070).
  useEffect(() => session.start(), []);

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
    <div className="terminal" data-shell-look={desktop ? 'desktop' : 'pocket'} data-shell-state={state.shell} data-req="006-terminal-FR-019 006-terminal-FR-023 006-terminal-FR-031 006-terminal-FR-032 006-terminal-FR-033 006-terminal-FR-035">
      <h1 className="visually-hidden" data-req="006-terminal-FR-029">
        {siteText.os.views.terminal}
      </h1>
      {state.vim === null ? (
        <div ref={screen} className="terminal-screen" onPointerDown={pointerDown} onPointerUp={pointerUp} onClick={click} data-req="006-terminal-FR-071 006-terminal-FR-075" onScroll={(event) => event.currentTarget.clientHeight > 0 && session.saveScroll(event.currentTarget.scrollTop, os.shell)}>
          {state.starter && (
            <div className="starter" data-req="006-terminal-FR-005 006-terminal-FR-030">
              {words.starter.map((line) => (
                <button key={line} type="button" className="command-chip" aria-label={line} onClick={(event) => runControl(line, (event.nativeEvent as PointerEvent).pointerType === 'touch')} data-req="006-terminal-FR-015 006-terminal-FR-034">
                  {line}
                </button>
              ))}
            </div>
          )}
          {state.shell === 'loading' && (
            <p className="shell-loading" data-req="006-terminal-FR-070">
              {words.shellLoading}
            </p>
          )}
          {state.shell === 'failed' && (
            <p className="shell-failed" data-req="006-terminal-FR-070">
              {words.shellFailed}{' '}
              <button type="button" className="command-chip" onClick={() => session.retry()} data-req="006-terminal-FR-070">
                {words.tryAgain}
              </button>
            </p>
          )}
          {state.entries.map((entry) => (
            <Run key={entry.id} entry={entry} desktop={desktop} run={runControl} />
          ))}
          {state.running !== null && <Run key={state.running.id} entry={state.running} desktop={desktop} run={runControl} pending />}
          {state.waiting.map((entry) => (
            <Run key={entry.id} entry={entry} desktop={desktop} run={runControl} pending={entry.cancelled !== true} />
          ))}
          <CommandLine
            draft={state.draft}
            cwd={state.cwd}
            showTime={desktop}
            inputRef={input}
            onDraft={session.setDraft}
            onSubmit={run}
            onStep={session.step}
            onSelectAll={selectAll}
            onCancel={session.cancel}
            onClear={session.clear}
          />
        </div>
      ) : (
        <VimView state={state.vim} shell={os.shell} send={sendVim} />
      )}
      <div className="terminal-status visually-hidden" role="status" data-req="006-terminal-FR-028 006-terminal-FR-077">
        {state.announcement !== null && <span key={state.announcement.id}>{state.announcement.text}</span>}
      </div>
    </div>
  );
}
