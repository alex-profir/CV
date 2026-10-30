// The popups inside the Playground's window (FR-048 to FR-051, FR-080; the
// keys popup comes with its story): a scrim over the Playground only, never
// the shell or another window (FR-050), and a dialog that isn't modal to the
// rest of the page.
import { useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { fill, siteText } from '../../site-text.ts';
import { focusEditor, resetPlayground, stopCode } from './controller.ts';
import { STUCK_SECONDS, keepWaiting } from './running.ts';
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

// The stuck popup (FR-048 to FR-051): an alert dialog named by its heading.
// It takes focus, to Stop, only when focus was in the Playground's window,
// so it never takes focus from another window; Escape keeps waiting and
// focus goes back where it was. It closes by itself when the code pauses or
// the run ends.
function StuckPopup() {
  const stop = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLElement>(null);
  const back = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const window = popup.current?.closest('.window, .full-screen');
    const active = document.activeElement;
    if (window !== null && window !== undefined && active instanceof HTMLElement && window.contains(active)) {
      back.current = active;
      stop.current?.focus();
    }
    // Closed by itself with focus in it: focus goes back where it was, as
    // the removed popup leaves it on the page's body.
    return () => {
      const lost = document.activeElement === null || document.activeElement === document.body;
      if (lost && back.current?.isConnected === true) back.current.focus();
    };
  }, []);
  const wait = () => {
    const to = back.current;
    keepWaiting();
    if (to?.isConnected === true) requestAnimationFrame(() => to.focus());
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    wait();
  };
  return (
    <div className="playground-scrim">
      <section
        ref={popup}
        className="playground-popup"
        role="alertdialog"
        aria-modal="false"
        aria-labelledby="playground-stuck-heading"
        aria-describedby="playground-stuck-text"
        onKeyDown={onKeyDown}
        data-req="008-typescript-playground-FR-048 008-typescript-playground-FR-049 008-typescript-playground-FR-050 008-typescript-playground-FR-051"
      >
        <h2 id="playground-stuck-heading">{words.stuck.heading}</h2>
        <p id="playground-stuck-text">{fill(words.stuck.text, { seconds: STUCK_SECONDS })}</p>
        <div className="popup-actions">
          <button
            ref={stop}
            type="button"
            className="button danger"
            onClick={() => {
              const to = back.current;
              stopCode();
              if (to?.isConnected === true) requestAnimationFrame(() => to.focus());
            }}
          >
            {words.stuck.stop}
          </button>
          <button type="button" className="button" onClick={wait}>
            {words.stuck.keepWaiting}
          </button>
        </div>
      </section>
    </div>
  );
}

export function Popups() {
  const popup = useSession((state) => state.popup);
  const stuck = useSession((state) => state.run?.stuck === 'shown');
  if (stuck) return <StuckPopup />;
  return popup === 'reset' ? <ResetPopup /> : null;
}
