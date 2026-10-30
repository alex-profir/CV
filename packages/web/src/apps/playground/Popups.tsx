// The popups inside the Playground's window (FR-080; the stuck and keys
// popups come with their stories): a scrim over the Playground only, never
// the shell or another window (FR-050), and a dialog that isn't modal to the
// rest of the page.
import { useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { siteText } from '../../site-text.ts';
import { focusEditor, resetPlayground } from './controller.ts';
import { session, useSession } from './session.ts';

const words = siteText.playground.popups;

// Back to the menu bar's title, as 005's menu rule sets for a command that
// was cancelled.
const focusMenuTitle = () => requestAnimationFrame(() => document.querySelector<HTMLElement>('#os #menu-title-app')?.focus());

function ResetPopup() {
  const confirm = useRef<HTMLButtonElement>(null);
  useEffect(() => confirm.current?.focus(), []);
  const cancel = () => {
    session.update({ popup: 'none' });
    focusMenuTitle();
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    cancel();
  };
  return (
    <div className="playground-scrim">
      <section className="playground-popup" role="dialog" aria-modal="false" aria-labelledby="playground-reset-heading" aria-describedby="playground-reset-text" onKeyDown={onKeyDown} data-req="008-typescript-playground-FR-080">
        <h2 id="playground-reset-heading">{words.reset.heading}</h2>
        <p id="playground-reset-text">{words.reset.text}</p>
        <div className="popup-actions">
          <button
            ref={confirm}
            type="button"
            className="button danger"
            onClick={() => {
              session.update({ popup: 'none' });
              resetPlayground();
              requestAnimationFrame(focusEditor);
            }}
          >
            {words.reset.confirm}
          </button>
          <button type="button" className="button" onClick={cancel}>
            {words.reset.cancel}
          </button>
        </div>
      </section>
    </div>
  );
}

export function Popups() {
  const popup = useSession((state) => state.popup);
  return popup === 'reset' ? <ResetPopup /> : null;
}
