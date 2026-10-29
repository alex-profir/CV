// "What's this?" (007 contracts/inspector.md, FR-009): a disclosure in the
// spec view's bar, and the panel it opens above the heading, the same in
// every spec view. It is closed whenever the view shows.
import type { SiteData } from '@cv/content';
import type { ViewId } from '@cv/os-core';
import { siteText } from '../site-text.ts';
import { QuestionGlyph } from './glyphs/QuestionGlyph.tsx';

const panelId = (view: ViewId) => `whats-this-${view}`;
const headingId = (view: ViewId) => `whats-this-heading-${view}`;

export function WhatsThisButton({ view, open, onToggle }: { view: ViewId; open: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="whats-this" aria-expanded={open} aria-controls={panelId(view)} onClick={onToggle} data-req="007-requirement-inspector-FR-009">
      <QuestionGlyph />
      {siteText.inspector.whatsThis.button}
    </button>
  );
}

export function WhatsThisPanel({ view, open, siteData }: { view: ViewId; open: boolean; siteData: SiteData }) {
  const text = siteText.inspector.whatsThis;
  const repository = siteData.repository;
  return (
    <section className="whats-this-panel" id={panelId(view)} aria-labelledby={headingId(view)} hidden={!open} data-req="007-requirement-inspector-FR-009">
      <h2 id={headingId(view)}>{text.heading}</h2>
      <p>{text.paragraphs[0]}</p>
      <p className="chain">
        <span aria-hidden="true">
          {text.chain.map((step, index) => (
            <span key={step} className="chain-step">
              {index > 0 && <span className="chain-arrow">{text.chainArrow}</span>}
              {step}
            </span>
          ))}
        </span>
        <span className="visually-hidden">{text.chainSpoken}</span>
      </p>
      <p>{text.paragraphs[1]}</p>
      {repository !== undefined && repository !== '' && <a href={repository}>{text.repository}</a>}
    </section>
  );
}
