// The popups inside the Playground's window (FR-048 to FR-051, FR-080,
// FR-083, FR-085): a scrim over the Playground only, never
// the shell or another window (FR-050), and a dialog that isn't modal to the
// rest of the page.
import { useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { fill, siteText } from '../../site-text.ts';
import { focusEditor, resetPlayground, stopCode } from './controller.ts';
import { CloseGlyph } from './Glyphs.tsx';
import { hoverKey, KEY_COMMANDS, keyLabel, keysFor, tabFocusKey } from './keys.ts';
import type { KeyCommand } from './keys.ts';
import { STUCK_SECONDS, keepWaiting } from './running.ts';
import { session, useSession } from './session.ts';
import { onMac } from './text.ts';

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

// Why a command's key differs from VS Code's, if it does (FR-085).
function keyNote(command: KeyCommand, mac: boolean): string | null {
  if (command.differs === undefined) return null;
  return fill(words.keys.differs[command.differs], { key: command.kept?.[mac ? 'mac' : 'other'] ?? '' });
}

function KeyTable({ commands, mac }: { commands: readonly KeyCommand[]; mac: boolean }) {
  return (
    <table className="key-table">
      <thead>
        <tr>
          <th scope="col">{words.keys.command}</th>
          <th scope="col">{words.keys.key}</th>
        </tr>
      </thead>
      <tbody>
        {commands.map((command) => {
          const note = keyNote(command, mac);
          return (
            <tr key={command.id}>
              <td>
                {keyLabel(command)}
                {note !== null && <span className="key-note">{note}</span>}
              </td>
              <td>
                <kbd>{keysFor(command, mac).join(', ')}</kbd>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// The list of keys, generated from `keys.ts` in the design's two columns.
// It goes back where it came from: the editor for `Alt+F1`, the menu bar's
// title for the menu's `Keys…`.
function KeysPopup() {
  const close = useRef<HTMLButtonElement>(null);
  const fromEditor = useRef(document.activeElement?.closest('.playground-editor') != null);
  useEffect(() => close.current?.focus(), []);
  const mac = onMac();
  const half = Math.ceil(KEY_COMMANDS.length / 2);
  const done = () => {
    session.update({ popup: 'none' });
    if (fromEditor.current) requestAnimationFrame(focusEditor);
    else focusMenuTitle();
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    done();
  };
  return (
    <div className="playground-scrim">
      <section className="playground-popup keys" role="dialog" aria-modal="false" aria-labelledby="playground-keys-heading" aria-describedby="playground-keys-text" onKeyDown={onKeyDown} data-req="008-typescript-playground-FR-083 008-typescript-playground-FR-085">
        <div className="popup-head">
          <h2 id="playground-keys-heading">{words.keys.heading}</h2>
          <button ref={close} type="button" className="icon-button" aria-label={words.keys.close} onClick={done}>
            <CloseGlyph />
          </button>
        </div>
        <div id="playground-keys-text">
          <p>{mac ? words.keys.lede.mac : words.keys.lede.other}</p>
          <p>{fill(mac ? words.keys.help.mac : words.keys.help.other, { tab: tabFocusKey(mac), hover: hoverKey(mac) })}</p>
        </div>
        <div className="key-columns">
          <KeyTable commands={KEY_COMMANDS.slice(0, half)} mac={mac} />
          <KeyTable commands={KEY_COMMANDS.slice(half)} mac={mac} />
        </div>
        <p className="popup-foot">{words.keys.footer}</p>
      </section>
    </div>
  );
}

export function Popups() {
  const popup = useSession((state) => state.popup);
  const stuck = useSession((state) => state.run?.stuck === 'shown');
  if (stuck) return <StuckPopup />;
  if (popup === 'keys') return <KeysPopup />;
  return popup === 'reset' ? <ResetPopup /> : null;
}
