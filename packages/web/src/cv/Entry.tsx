// One work, project or education entry on the timeline (contracts/page.md):
// in DOM order, the date line, the h3, the organization or project details,
// the text paragraphs, the highlights and the chips. Nothing is reordered by
// CSS (FR-027).
import type { ReactNode } from 'react';
import { DateParts, DateRange } from './DateRange.tsx';
import type { DateRange as DateRangeValue } from '../format/dates.ts';
import { siteText } from '../site-text.ts';
import { Arrow } from './Arrow.tsx';
import { Chips } from './Chips.tsx';
import { joined, present } from './join.tsx';

export type EntryParts = {
  range: DateRangeValue | null;
  // The h3's content, or null when the entry has no field for it: the h3
  // then holds the date (contracts/page.md).
  heading: ReactNode | null;
  // `p.org` for work and education, `p.meta` for projects.
  detailsClass: 'org' | 'meta';
  details: ReactNode[];
  texts: (string | undefined)[];
  highlights: string[] | undefined;
  chips: string[] | undefined;
};

export function Entry({ range, heading, detailsClass, details, texts, highlights, chips }: EntryParts) {
  const dateHeading = heading === null && range !== null;
  const shownHighlights = (highlights ?? []).filter(present);
  return (
    <li>
      {!dateHeading && <DateRange range={range} />}
      {heading !== null ? <h3>{heading}</h3> : dateHeading && <h3>{<DateParts range={range} />}</h3>}
      {details.length > 0 && <p className={detailsClass}>{joined(details, siteText.metaSeparator)}</p>}
      {texts.filter(present).map((text, index) => (
        <p key={index} className="text">
          {text}
        </p>
      ))}
      {shownHighlights.length > 0 && (
        <ul className="highlights">
          {shownHighlights.map((highlight, index) => (
            <li key={index}>
              <span className="marker">
                <Arrow kind="right" />
              </span>
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      )}
      <Chips items={chips} />
    </li>
  );
}
