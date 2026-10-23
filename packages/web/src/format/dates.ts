// CV dates as the page shows and speaks them (FR-009 to FR-011, research R7,
// data-model.md Date value and Date range). Month names and words come from
// site text, never Intl, so output can't change with the ICU version.
import { siteText } from '../site-text.ts';

export type Precision = 'year' | 'month' | 'day';

export type DateValue = { raw: string; precision: Precision; visible: string; spoken: string };

export type DateRange = {
  start?: DateValue;
  end?: DateValue;
  ongoing: boolean;
  visible: string;
  spoken: string;
};

const DATE = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/;

const RANK: Record<Precision, number> = { year: 0, month: 1, day: 2 };

// One CV date string, `YYYY`, `YYYY-MM` or `YYYY-MM-DD`, at its own
// precision. Nothing is added: a year stays a year.
export function dateValue(raw: string): DateValue {
  const match = DATE.exec(raw);
  const month = match?.[2] === undefined ? undefined : Number(match[2]);
  const day = match?.[3] === undefined ? undefined : Number(match[3]);
  if (match === null || (month !== undefined && (month < 1 || month > 12)) || (day !== undefined && (day < 1 || day > 31))) {
    throw new Error(`${JSON.stringify(raw)} is not a date of the form YYYY, YYYY-MM or YYYY-MM-DD`);
  }
  const year = match[1]!;
  if (month === undefined) return { raw, precision: 'year', visible: year, spoken: year };
  const short = `${siteText.monthsShort[month - 1]} ${year}`;
  const long = `${siteText.monthsLong[month - 1]} ${year}`;
  if (day === undefined) return { raw, precision: 'month', visible: short, spoken: long };
  return { raw, precision: 'day', visible: `${day} ${short}`, spoken: `${day} ${long}` };
}

// The date parts down to a precision, for comparing two dates.
function truncated(value: DateValue, precision: Precision): string {
  return value.raw.slice(0, { year: 4, month: 7, day: 10 }[precision]);
}

// An entry's dates as one line, or null when it has none (FR-010). Start and
// end equal at the coarser of their precisions give one date, the coarser
// one. Otherwise each side keeps its own precision.
export function dateRange(start: string | undefined, end: string | undefined): DateRange | null {
  const from = start === undefined ? undefined : dateValue(start);
  const to = end === undefined ? undefined : dateValue(end);
  if (from === undefined && to === undefined) return null;
  if (from === undefined) return { end: to!, ongoing: false, visible: to!.visible, spoken: to!.spoken };
  if (to === undefined) {
    return {
      start: from,
      ongoing: true,
      visible: `${from.visible}${siteText.rangeSeparator}${siteText.present.visible}`,
      spoken: `${from.spoken} ${siteText.to} ${siteText.present.spoken}`,
    };
  }
  const coarser = RANK[from.precision] <= RANK[to.precision] ? from.precision : to.precision;
  if (truncated(from, coarser) === truncated(to, coarser)) {
    const shown = RANK[to.precision] < RANK[from.precision] ? to : from;
    return { start: shown, ongoing: false, visible: shown.visible, spoken: shown.spoken };
  }
  return {
    start: from,
    end: to,
    ongoing: false,
    visible: `${from.visible}${siteText.rangeSeparator}${to.visible}`,
    spoken: `${from.spoken} ${siteText.to} ${to.spoken}`,
  };
}
