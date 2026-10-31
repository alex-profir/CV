// The command line (006 research R15, contracts/terminal.md): a real text
// input named "Command", under the prompt. Enter runs the line, Up and Down
// step through the history, and the system's editing keys are the field's
// own. The Terminal adds only what a field doesn't do (research R37, R44):
// the readline keys on macOS, select all of the Terminal's text, Ctrl+C and
// Tab's completion, only where FR-026 lets it. Every other key, the browser's
// and screen readers' included, is left to them. It has no box: its own caret is hidden, and an
// `aria-hidden` mirror over it draws the text, its selection and a
// terminal's block cursor, filled and blinking with focus, hollow without,
// so the cursor is its focus indicator (FR-032, FR-072, FR-074, R36).
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ClipboardEvent, FormEvent, KeyboardEvent, RefObject, SyntheticEvent } from 'react';
import { siteText } from '../../site-text.ts';
import { TERMINAL } from '../../os/metrics.ts';
import { formatPrompt } from './engine/output-map.ts';
import { clock, session } from './session.ts';
import type { CompletionMatch } from './shell/protocol.ts';
import { Clock } from './glyphs/Clock.tsx';
import { PromptMark } from './glyphs/PromptMark.tsx';

const BREAKS = /\r\n|\r|\n/g;

// readline's completion-query-items.
const COMPLETION_QUERY = 100;

type Navigator = globalThis.Navigator & { userAgentData?: { platform?: string } };

// macOS, from the platform the browser reports (research R37).
export const isMac = () => /^mac/i.test((navigator as Navigator).userAgentData?.platform ?? navigator.platform ?? '');

// Whether text outside the command line is selected on the page.
export const pageSelected = (input: HTMLInputElement) => {
  const selection = document.getSelection();
  return selection !== null && !selection.isCollapsed && !input.parentElement!.contains(selection.anchorNode);
};

// The start of the word before `at`, as readline's Ctrl+W finds it: past
// any spaces, then to the space before the word.
const wordStart = (text: string, at: number) => {
  let start = at;
  while (start > 0 && /\s/.test(text[start - 1]!)) start -= 1;
  while (start > 0 && !/\s/.test(text[start - 1]!)) start -= 1;
  return start;
};

// Deletes a range of the field so the system's undo can bring it back.
function deleteRange(input: HTMLInputElement, start: number, end: number) {
  if (start === end) return;
  input.setSelectionRange(start, end);
  if (!document.execCommand('delete')) {
    input.setRangeText('', start, end, 'end');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// Tab's state (data-model.md Completion), one for the command line and the
// pocket's Tab key: the line and cursor after the last Tab, so the next counts
// as the second in a row, and the matches a question waits on.
let tabbed: { line: string; cursor: number } | null = null;
let asked: { matches: readonly CompletionMatch[] } | null = null;

export const forgetTab = () => {
  tabbed = null;
  asked = null;
};

// Replaces a range through the field's own editing, so its undo takes it back.
function replaceRange(input: HTMLInputElement, start: number, end: number, text: string) {
  input.setSelectionRange(start, end);
  if (!document.execCommand('insertText', false, text)) {
    input.setRangeText(text, start, end, 'end');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// Tab's completion from the field's text and caret (FR-076, FR-078). The
// answer is applied only if the line and caret are as they were: a key typed
// meanwhile wins.
export async function tabComplete(input: HTMLInputElement) {
  const line = input.value;
  const cursor = input.selectionStart ?? line.length;
  if (line.slice(0, cursor).trim() === '') return;
  const second = tabbed !== null && tabbed.line === line && tabbed.cursor === cursor;
  // Noted now, so a second Tab ahead of the first's answer still counts.
  tabbed = { line, cursor };
  const answer = await session.complete(line, cursor);
  if (answer === null || input.value !== line || (input.selectionStart ?? line.length) !== cursor) return;
  if (answer.insert !== '') {
    replaceRange(input, answer.start, answer.end, answer.insert);
    tabbed = { line: input.value, cursor: input.selectionStart ?? input.value.length };
    session.announce(input.value);
    return;
  }
  if (!second || answer.matches.length < 2) return;
  tabbed = null;
  if (answer.matches.length < COMPLETION_QUERY) session.showList(line, answer.matches);
  else {
    asked = { matches: answer.matches };
    session.askList(line, answer.matches.length);
  }
}

// Whether `text[at]` is the second half of a surrogate pair.
const isLowSurrogate = (text: string, at: number) => {
  const code = text.charCodeAt(at);
  return code >= 0xdc00 && code <= 0xdfff;
};

// The mirror's text: runs of the line, plain or selected, and the cursor's
// block, which draws no text past the line's end.
type Part = { text: string; kind: 'plain' | 'selected' | 'cursor' };
function parts(text: string, start: number, end: number, cursor: number): Part[] {
  const out: Part[] = [];
  const push = (value: string, kind: Part['kind']) => {
    const last = out.at(-1);
    if (last !== undefined && last.kind === kind && kind !== 'cursor') last.text += value;
    else out.push({ text: value, kind });
  };
  // By code point, so a character outside the BMP stays whole.
  for (let at = 0; at <= text.length; ) {
    const char = at < text.length ? String.fromCodePoint(text.codePointAt(at)!) : '';
    if (at === cursor || (cursor > at && cursor < at + char.length)) push(char, 'cursor');
    else if (at < text.length) push(char, at >= start && at < end ? 'selected' : 'plain');
    at += Math.max(1, char.length);
  }
  return out;
}

// `guest ~/work ◷ 18:25 ❯`, the time on desktop only. Screen readers skip
// it: the command line is named, and each run's heading is its line
// (FR-027).
export function Prompt({ cwd, time }: { cwd: string; time: string | null }) {
  return (
    <span className="prompt" aria-hidden="true" data-req="006-terminal-FR-027 006-terminal-FR-046">
      <span className="prompt-user">{siteText.terminal.prompt.user}</span>
      <span className="prompt-path">{formatPrompt(cwd)}</span>
      {time !== null && (
        <span className="prompt-time">
          <Clock />
          {time}
        </span>
      )}
      <PromptMark />
    </span>
  );
}

// Focuses the command line after a control or key. After a tap it first
// asks for no on-screen keyboard; the next pointer down on the line itself
// asks for it again (research R15, FR-015).
export function focusCommandLine(input: HTMLInputElement | null, touch: boolean) {
  if (input === null) return;
  if (touch) input.setAttribute('inputmode', 'none');
  input.focus({ preventScroll: true });
}

type Props = {
  draft: string;
  cwd: string;
  showTime: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onDraft: (draft: string) => void;
  onSubmit: (line: string) => void;
  onStep: (direction: 'up' | 'down') => void;
  // Select all, Ctrl+C with nothing selected, and macOS's Ctrl+L.
  onSelectAll: () => void;
  onCancel: () => void;
  onClear: () => void;
};

export function CommandLine({ draft, cwd, showTime, inputRef, onDraft, onSubmit, onStep, onSelectAll, onCancel, onClear }: Props) {
  // The field's selection; the cursor is at its moving end.
  const [range, setRange] = useState({ start: draft.length, end: draft.length, backward: false });
  const start = Math.min(range.start, draft.length);
  const end = Math.min(range.end, draft.length);
  const at = range.backward ? start : end;
  const [focused, setFocused] = useState(false);
  // The cursor blinks from focus or a key press until `cursorIdle` after the
  // last; each press starts the blink again, with the cursor shown.
  const [wakes, setWakes] = useState(0);
  const [blinking, setBlinking] = useState(false);
  const idle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const wake = () => {
    setBlinking(true);
    setWakes((count) => count + 1);
    clearTimeout(idle.current);
    idle.current = setTimeout(() => setBlinking(false), TERMINAL.cursorIdle);
  };

  const sleep = () => {
    clearTimeout(idle.current);
    setBlinking(false);
  };

  // Drawn again with focus already in it, as after a shell switch.
  useLayoutEffect(() => {
    if (inputRef.current !== null && document.activeElement === inputRef.current) {
      setFocused(true);
      wake();
    }
  }, []);

  useEffect(() => () => clearTimeout(idle.current), []);

  const read = (input: HTMLInputElement) => {
    const length = input.value.length;
    setRange({ start: input.selectionStart ?? length, end: input.selectionEnd ?? length, backward: input.selectionDirection === 'backward' });
  };
  const track = (event: SyntheticEvent<HTMLInputElement>) => read(event.currentTarget);
  const setCaret = (caret: number) => setRange({ start: caret, end: caret, backward: false });

  // The selection as it changes, by keys, the pointer or the system; and
  // after select all, the next typed text first clears the page's
  // selection (research R37).
  useEffect(() => {
    const input = inputRef.current;
    if (input === null) return undefined;
    const changed = () => {
      if (document.activeElement === input) read(input);
    };
    const typing = () => {
      if (pageSelected(input)) document.getSelection()!.collapse(input.parentElement, 0);
    };
    document.addEventListener('selectionchange', changed);
    input.addEventListener('beforeinput', typing);
    return () => {
      document.removeEventListener('selectionchange', changed);
      input.removeEventListener('beforeinput', typing);
    };
  }, [inputRef]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(draft);
  };

  // The keys research R37's table adds; true when one was handled.
  const added = (event: KeyboardEvent<HTMLInputElement>): boolean => {
    const input = event.currentTarget;
    const key = event.key.toLowerCase();
    const mac = isMac();
    const only = (modifier: 'ctrlKey' | 'metaKey') => event[modifier] && !event.altKey && !event.shiftKey && !(modifier === 'ctrlKey' ? event.metaKey : event.ctrlKey);
    if (key === 'a' && only(mac ? 'metaKey' : 'ctrlKey')) {
      onSelectAll();
      return true;
    }
    if (key === 'c' && only('ctrlKey')) {
      // With text selected, in the field or the page, it is the browser's.
      if (input.selectionStart !== input.selectionEnd || pageSelected(input)) return false;
      onCancel();
      return true;
    }
    if (!mac || !only('ctrlKey')) return false;
    const length = input.value.length;
    const caret = input.selectionStart ?? length;
    const move = (to: number) => {
      input.setSelectionRange(to, to);
      setCaret(to);
    };
    switch (key) {
      case 'a':
        move(0);
        return true;
      case 'e':
        move(length);
        return true;
      case 'b':
        move(Math.max(0, caret - (caret >= 2 && isLowSurrogate(input.value, caret - 1) ? 2 : 1)));
        return true;
      case 'f': {
        const from = input.selectionEnd ?? caret;
        move(Math.min(length, from + (isLowSurrogate(input.value, from + 1) ? 2 : 1)));
        return true;
      }
      case 'k':
        deleteRange(input, caret, length);
        return true;
      case 'u':
        deleteRange(input, 0, caret);
        return true;
      case 'w':
        deleteRange(input, wordStart(input.value, caret), caret);
        return true;
      case 'l':
        onClear();
        return true;
      default:
        return false;
    }
  };

  // Escape since the last key: the next Tab leaves (FR-026, research R44).
  const escaped = useRef(false);

  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    wake();
    // Keys that pick or end an IME's composition are the IME's.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    const plain = !event.ctrlKey && !event.altKey && !event.metaKey;
    // A question takes one key: y lists, any other adds nothing.
    // Shift+Tab still leaves (SC-016); Shift+Y answers as y does.
    if (asked !== null && plain && event.key !== 'Shift' && !(event.shiftKey && event.key === 'Tab')) {
      const { matches } = asked;
      asked = null;
      if (event.key !== 'Escape') event.preventDefault();
      if (event.key.toLowerCase() === 'y') session.answerList(matches);
      if (event.key === 'Escape') escaped.current = true;
      return;
    }
    if (event.key === 'Tab') {
      if (!plain || event.shiftKey || escaped.current) {
        escaped.current = false;
        return;
      }
      const input = event.currentTarget;
      const typed = input.value.slice(0, input.selectionStart ?? input.value.length);
      if (typed.trim() === '') return;
      event.preventDefault();
      void tabComplete(input);
      return;
    }
    if (!['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) {
      escaped.current = event.key === 'Escape';
      tabbed = null;
    }
    if (added(event)) {
      event.preventDefault();
      return;
    }
    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    onStep(event.key === 'ArrowUp' ? 'up' : 'down');
    setCaret(Number.POSITIVE_INFINITY);
  };

  // Pasted line breaks become spaces, and nothing runs until Enter (FR-018).
  const paste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text');
    if (!/[\r\n]/.test(pasted)) return;
    event.preventDefault();
    const input = event.currentTarget;
    const start = input.selectionStart ?? draft.length;
    const end = input.selectionEnd ?? start;
    const next = (draft.slice(0, start) + pasted.replace(BREAKS, ' ') + draft.slice(end)).slice(0, TERMINAL.maxLength);
    onDraft(next);
    setCaret(Math.min(next.length, start + pasted.length));
  };

  return (
    <form className="prompt-line" onSubmit={submit}>
      <Prompt cwd={cwd} time={showTime ? clock(new Date()) : null} />
      <label className="visually-hidden" htmlFor="terminal-command-line">
        {siteText.terminal.commandLine}
      </label>
      <span className="visually-hidden" id="terminal-command-hint">
        {siteText.terminal.commandLineHint}
      </span>
      <span className="command-field">
        <input
          ref={inputRef}
          id="terminal-command-line"
          aria-describedby="terminal-command-hint"
          className="command-line"
          type="text"
          value={draft}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          maxLength={TERMINAL.maxLength}
          data-focus-home=""
          onChange={(event) => {
            onDraft(event.currentTarget.value);
            track(event);
          }}
          onSelect={track}
          onKeyUp={track}
          onPointerUp={track}
          onPointerDown={(event) => event.currentTarget.removeAttribute('inputmode')}
          onKeyDown={keyDown}
          onPaste={paste}
          onFocus={() => {
            setFocused(true);
            wake();
          }}
          onBlur={() => {
            setFocused(false);
            sleep();
            escaped.current = false;
            forgetTab();
          }}
          data-req="006-terminal-FR-004 006-terminal-FR-006 006-terminal-FR-007 006-terminal-FR-017 006-terminal-FR-018 006-terminal-FR-020 006-terminal-FR-026 006-terminal-FR-027 006-terminal-FR-072 006-terminal-FR-074 006-terminal-FR-075 006-terminal-FR-076 006-terminal-FR-077"
        />
        <span className="cursor-mirror" aria-hidden="true" data-focused={focused ? '' : undefined} data-blinking={focused && blinking ? '' : undefined} data-req="006-terminal-FR-032 006-terminal-FR-072 006-terminal-FR-074">
          {parts(draft, start, end, at).map((part, index) =>
            part.kind === 'cursor' ? (
              <span key={`cursor-${wakes}`} className="cursor-block" data-end={part.text === '' ? '' : undefined}>
                {part.text}
              </span>
            ) : part.kind === 'selected' ? (
              <span key={index} className="cursor-selected">
                {part.text}
              </span>
            ) : (
              part.text
            ),
          )}
        </span>
      </span>
    </form>
  );
}
