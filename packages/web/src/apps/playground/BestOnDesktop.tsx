// The Playground on a phone (FR-058 to FR-060, contracts/playground.md
// Mobile): it needs a keyboard and room, so the phone shows what it is and
// passes on a link that opens it on a desktop. Opened from a shared link,
// it says so and passes that link on unchanged; the code is never decoded,
// TypeScript isn't downloaded and nothing runs.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { siteText } from '../../site-text.ts';
import { phoneLink } from './controller.ts';
import { CopyGlyph, ShareGlyph } from './Glyphs.tsx';
import { PlaygroundIcon } from './PlaygroundIcon.tsx';
import { holdsCode } from './share.ts';

const words = siteText.playground.mobile;

// Whether the page was opened with a link that holds code.
const fromLink = () => holdsCode(location.href);

// The address changes with no load when a link is pasted into this tab.
const onAddress = (listener: () => void) => {
  addEventListener('hashchange', listener);
  return () => removeEventListener('hashchange', listener);
};

const canShare = (url: string) => typeof navigator.share === 'function' && (typeof navigator.canShare !== 'function' || navigator.canShare({ url }));

export function BestOnDesktop() {
  const linked = useSyncExternalStore(onAddress, fromLink, () => false);
  const text = linked ? words.link : words.app;
  const [note, setNote] = useState<string>(text.note);
  const frame = useRef(0);
  useEffect(() => setNote(text.note), [text]);

  // The note is a status region: cleared, then set on the next frame, so the
  // same words twice are read twice.
  const say = (sentence: string) => {
    cancelAnimationFrame(frame.current);
    setNote('');
    frame.current = requestAnimationFrame(() => setNote(sentence));
  };

  // Copies the link, or the code when its link would be too long (FR-055).
  async function copy(): Promise<void> {
    const made = await phoneLink();
    try {
      if ('link' in made) {
        await navigator.clipboard.writeText(made.link);
        say(words.copied);
      } else {
        await navigator.clipboard.writeText(made.code);
        say(siteText.playground.messages.codeCopied);
      }
    } catch {
      // The clipboard refused; the note stays as it was.
    }
  }

  async function share(): Promise<void> {
    const made = await phoneLink();
    if ('link' in made && canShare(made.link)) {
      await navigator.share({ url: made.link }).catch(() => undefined);
      return;
    }
    await copy();
  }

  return (
    <section className="playground-mobile" aria-labelledby="playground-mobile-heading" data-req="008-typescript-playground-FR-058 008-typescript-playground-FR-059 008-typescript-playground-FR-060">
      <div className="playground-mobile-card">
        <PlaygroundIcon />
        <h2 id="playground-mobile-heading">{text.heading}</h2>
        <p>{text.text}</p>
        <div className="playground-mobile-actions">
          <button type="button" className="button primary share-link" onClick={() => void share()} data-req="008-typescript-playground-FR-058 008-typescript-playground-FR-059 008-typescript-playground-FR-060">
            <ShareGlyph />
            <span>{words.shareLink}</span>
          </button>
          <button type="button" className="button copy-link" onClick={() => void copy()} data-req="008-typescript-playground-FR-058 008-typescript-playground-FR-059 008-typescript-playground-FR-060">
            <CopyGlyph />
            <span>{words.copyLink}</span>
          </button>
        </div>
        <p className="playground-mobile-note" role="status">
          {note}
        </p>
      </div>
    </section>
  );
}
