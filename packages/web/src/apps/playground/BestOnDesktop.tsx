// The Playground on a phone (FR-058): it needs a keyboard and room, so the
// phone shows what it is and why. Sharing the link comes with US5.
import { siteText } from '../../site-text.ts';
import { PlaygroundIcon } from './PlaygroundIcon.tsx';

const words = siteText.playground.mobile;

export function BestOnDesktop() {
  return (
    <section className="playground-mobile" aria-labelledby="playground-mobile-heading" data-req="008-typescript-playground-FR-058 008-typescript-playground-FR-059 008-typescript-playground-FR-060">
      <PlaygroundIcon />
      <h2 id="playground-mobile-heading">{words.app.heading}</h2>
      <p>{words.app.text}</p>
    </section>
  );
}
