// The one message under the toolbar (data-model.md Message, FR-014, FR-019,
// FR-052, FR-053, FR-055 to FR-057): its sentence, its actions or the link
// field, and Dismiss. A new message replaces the shown one and is announced
// through the shell's polite region (research R23).
import { useEffect, useRef } from 'react';
import { siteText } from '../../site-text.ts';
import { announce } from '../../os/announce.ts';
import { copyCode, dismissMessage, retryDownload, runCode, shareWith, undoReplacement } from './controller.ts';
import { CloseGlyph, ErrorMark, InfoMark, OkMark, WarnMark } from './Glyphs.tsx';
import { useSession } from './session.ts';
import { messageText } from './text.ts';
import type { MessageAction } from './types.ts';

const words = siteText.playground.messages;

const MARKS = { done: OkMark, warn: WarnMark, error: ErrorMark, info: InfoMark };

// What each action does; the stories that add an action add it here.
const ACTIONS: Partial<Record<MessageAction, () => void>> = {
  undo: undoReplacement,
  retry: retryDownload,
  run: runCode,
  'share-with': shareWith,
  'copy-code': () => void copyCode(),
};

export function Message() {
  const message = useSession((state) => state.message);
  const text = message === null ? '' : messageText(message);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (message !== null) announce(text);
    // The link to copy by hand shows selected (FR-052).
    field.current?.select();
  }, [message?.id]);
  if (message === null) return null;
  const Mark = MARKS[message.kind];
  return (
    <div
      className="playground-message"
      role="status"
      data-kind={message.kind}
      data-req="008-typescript-playground-FR-014 008-typescript-playground-FR-019 008-typescript-playground-FR-052 008-typescript-playground-FR-053 008-typescript-playground-FR-055 008-typescript-playground-FR-056 008-typescript-playground-FR-057"
    >
      <Mark />
      <p>{text}</p>
      <div className="message-actions">
        {message.link !== undefined && <input ref={field} className="message-link" type="text" readOnly value={message.link} aria-label={words.linkFieldName} />}
        {message.actions.map((action) => (
          <button key={action} type="button" className="text-button" onClick={() => ACTIONS[action]?.()}>
            {words.actions[action]}
          </button>
        ))}
        <button type="button" className="icon-button dismiss" aria-label={words.dismiss} onClick={dismissMessage}>
          <CloseGlyph />
        </button>
      </div>
    </div>
  );
}
