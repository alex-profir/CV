// The CV document's date form, YYYY, YYYY-MM or YYYY-MM-DD (FR-009), read
// into parts. Pure, so the page's date formatter reads dates by the same
// rules the content check applies.

export type DateParts = number[];

const DATE = /^([12]\d{3})(?:-(\d{2})(?:-(\d{2}))?)?$/;

function daysIn(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// A date of the form YYYY, YYYY-MM or YYYY-MM-DD (FR-009): its parts when it
// exists, `not-real` when the form is right but there's no such date, or
// `bad-form`.
export function parseDate(text: string): { parts: DateParts } | 'not-real' | 'bad-form' {
  const match = DATE.exec(text);
  if (match === null) return 'bad-form';
  const parts = match.slice(1).filter((part) => part !== undefined).map(Number);
  const [year, month, day] = parts as [number, number?, number?];
  if (month !== undefined && (month < 1 || month > 12)) return 'not-real';
  if (day !== undefined && (day < 1 || day > daysIn(year, month!))) return 'not-real';
  return { parts };
}

// Compares two dates on the parts both have, so `2020-05` equals `2020`.
export function compareDates(a: DateParts, b: DateParts): -1 | 0 | 1 {
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    if (a[index]! !== b[index]!) return a[index]! < b[index]! ? -1 : 1;
  }
  return 0;
}
