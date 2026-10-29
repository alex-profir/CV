// The command line (006 research R15, contracts/terminal.md): a real text
// input named "Command", under the prompt. Enter runs the line, Up and Down
// step through the history, and every other key, Tab and the modified ones
// included, is left to the browser, the screen reader and the shell
// (FR-026). Its own caret is hidden: an `aria-hidden` mirror over it draws
// the text and the design's steady block cursor (FR-032).
import { useState } from 'react';
import type { ClipboardEvent, FormEvent, KeyboardEvent, RefObject, SyntheticEvent } from 'react';
import { siteText } from '../../site-text.ts';
import { TERMINAL } from '../../os/metrics.ts';
import { formatPrompt } from './engine/output-map.ts';
import { clock } from './session.ts';
import { Clock } from './glyphs/Clock.tsx';
import { PromptMark } from './glyphs/PromptMark.tsx';

const BREAKS = /\r\n|\r|\n/g;

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
};

export function CommandLine({ draft, cwd, showTime, inputRef, onDraft, onSubmit, onStep }: Props) {
  const [caret, setCaret] = useState(draft.length);
  const at = Math.min(caret, draft.length);

  const track = (event: SyntheticEvent<HTMLInputElement>) => setCaret(event.currentTarget.selectionStart ?? event.currentTarget.value.length);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(draft);
  };

  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
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
      <span className="command-field">
        <input
          ref={inputRef}
          id="terminal-command-line"
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
          data-req="006-terminal-FR-004 006-terminal-FR-006 006-terminal-FR-007 006-terminal-FR-017 006-terminal-FR-018 006-terminal-FR-020 006-terminal-FR-026 006-terminal-FR-027"
        />
        <span className="cursor-mirror" aria-hidden="true" data-req="006-terminal-FR-032">
          {draft.slice(0, at)}
          <span className="cursor-block">{draft[at] ?? ' '}</span>
          {draft.slice(at + 1)}
        </span>
      </span>
    </form>
  );
}
