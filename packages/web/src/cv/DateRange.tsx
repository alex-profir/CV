// An entry's date line (contracts/page.md Dates): the short form shown and
// hidden from screen readers, with each date a `time` carrying the CV
// string, then the spoken form for screen readers only.
import type { DateRange as DateRangeValue } from '../format/dates.ts';
import { siteText } from '../site-text.ts';
import { VisuallyHidden } from './VisuallyHidden.tsx';

export function DateParts({ range }: { range: DateRangeValue }) {
  const { start, end, ongoing } = range;
  return (
    <>
      <span aria-hidden="true">
        {start !== undefined && <time dateTime={start.raw}>{start.visible}</time>}
        {ongoing && `${siteText.rangeSeparator}${siteText.present.visible}`}
        {start !== undefined && end !== undefined && siteText.rangeSeparator}
        {end !== undefined && <time dateTime={end.raw}>{end.visible}</time>}
      </span>
      <VisuallyHidden>{range.spoken}</VisuallyHidden>
    </>
  );
}

export function DateRange({ range }: { range: DateRangeValue | null }) {
  if (range === null) return null;
  return (
    <p className="date" data-req="004-cv-page-FR-009 004-cv-page-FR-010 004-cv-page-FR-011">
      <DateParts range={range} />
    </p>
  );
}
