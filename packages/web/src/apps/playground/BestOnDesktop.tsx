// The Playground on a phone (FR-058 to FR-060, contracts/playground.md
// Mobile): it needs a keyboard and room, so the phone shows what it is and
// passes on a link that opens it on a desktop. Opened from a shared link,
// it says so and passes that link on unchanged; the code is never decoded,
// TypeScript isn't downloaded and nothing runs.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { siteText } from '../../site-text.ts';
import { announce } from '../../os/announce.ts';
import { phoneLink } from './controller.ts';
import { CopyGlyph, ShareGlyph } from './Glyphs.tsx';
import { PlaygroundIcon } from './PlaygroundIcon.tsx';
import { holdsCode } from './share.ts';

const words = siteText.playground.mobile;
const linkField = siteText.playground.messages.linkField;

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
  // The link to copy by hand, when the clipboard refuses it (FR-052).
  const [field, setField] = useState<string | null>(null);
  const fieldInput = useRef<HTMLInputElement>(null);
  const frame = useRef(0);
  useEffect(() => {
    setNote(text.note);
    setField(null);
  }, [text]);
  useEffect(() => {
    if (field === null) return;
    fieldInput.current?.select();
    announce(linkField);
  }, [field]);

  // The note is a status region: cleared, then set on the next frame, so the
  // same words twice are read twice.
  const say = (sentence: string) => {
    setField(null);
    cancelAnimationFrame(frame.current);
    setNote('');
    frame.current = requestAnimationFrame(() => setNote(sentence));
  };

  // Copies the link, or the code when its link would be too long (FR-055).
  async function copy(): Promise<void> {
    const made = await phoneLink();
    const text = 'link' in made ? made.link : made.code;
    try {
      await navigator.clipboard.writeText(text);
      say('link' in made ? words.copied : words.tooLongCopied);
    } catch {
      if ('link' in made) setField(made.link);
      else say(words.tooLongRefused);
    }
  }

  async function share(): Promise<void> {
    const made = await phoneLink();
    if ('link' in made && canShare(made.link)) {
      // A cancel says nothing; any other failure copies instead (FR-058).
      const failed = await navigator.share({ url: made.link }).then(
        () => false,
        (error: unknown) => !(error instanceof DOMException && error.name === 'AbortError'),
      );
      if (!failed) return;
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
        {field !== null ? (
          <label className="playground-mobile-link">
            <span>{linkField}</span>
            <input ref={fieldInput} type="text" readOnly value={field} />
          </label>
        ) : (
          <p className="playground-mobile-note" role="status">
            {note}
          </p>
        )}
      </div>
    </section>
  );
}
