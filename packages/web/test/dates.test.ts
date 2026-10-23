// Dates at the CV document's precision, ongoing ranges and words for screen
// readers (data-model.md Date value and Date range, research R7).
import { describe, expect, test } from 'vitest';
import { dateRange, dateValue } from '../src/format/dates.ts';
import { siteText } from '../src/site-text.ts';

describe('004-cv-page-FR-009: dates keep the precision the CV document gives', () => {
  test.each([
    ['2018', 'year', '2018', '2018'],
    ['2018-07', 'month', 'Jul 2018', 'July 2018'],
    ['2018-07-29', 'day', '29 Jul 2018', '29 July 2018'],
    ['2026-10-05', 'day', '5 Oct 2026', '5 October 2026'],
  ])('%s has precision %s', (raw, precision, visible, spoken) => {
    expect(dateValue(raw)).toEqual({ raw, precision, visible, spoken });
  });

  test('no output holds a month or a day the input did not give', () => {
    const year = dateValue('2018');
    for (const text of [year.visible, year.spoken]) {
      for (const month of [...siteText.monthsShort, ...siteText.monthsLong]) expect(text).not.toContain(month);
      expect(text).toBe('2018');
    }
    const month = dateValue('2018-07');
    expect(month.visible.split(' ')).toEqual(['Jul', '2018']);
    expect(month.spoken.split(' ')).toEqual(['July', '2018']);
    expect(dateRange('2018', '2019')?.visible).toBe('2018 – 2019');
    expect(dateRange('2018', undefined)?.spoken).toBe('2018 to present');
  });

  test('every month gives its short and long name from site text', () => {
    for (let month = 1; month <= 12; month += 1) {
      const raw = `2020-${String(month).padStart(2, '0')}`;
      expect(dateValue(raw).visible).toBe(`${siteText.monthsShort[month - 1]} 2020`);
      expect(dateValue(raw).spoken).toBe(`${siteText.monthsLong[month - 1]} 2020`);
    }
  });

  test('a string that is not a date in JSON Resume form is refused', () => {
    expect(() => dateValue('July 2018')).toThrow();
    expect(() => dateValue('2018-13')).toThrow();
  });
});

describe('004-cv-page-FR-010: an entry shows a range, an ongoing range, one date or no date line', () => {
  test('a start and an end that differ give a range', () => {
    const range = dateRange('2018-07', '2026-10');
    expect(range?.visible).toBe('Jul 2018 – Oct 2026');
    expect(range?.ongoing).toBe(false);
    expect(range?.start?.raw).toBe('2018-07');
    expect(range?.end?.raw).toBe('2026-10');
  });

  test('a start and no end give an ongoing range to the present (US1 scenario 8)', () => {
    const range = dateRange('2025-12', undefined);
    expect(range?.visible).toBe('Dec 2025 – Present');
    expect(range?.ongoing).toBe(true);
    expect(range?.end).toBeUndefined();
  });

  test('an end and no start give the end date alone, not an ongoing range', () => {
    const range = dateRange(undefined, '2026-10');
    expect(range?.visible).toBe('Oct 2026');
    expect(range?.spoken).toBe('October 2026');
    expect(range?.ongoing).toBe(false);
    expect(range?.start).toBeUndefined();
    expect(range?.end?.raw).toBe('2026-10');
  });

  test('a start and an end that are equal at the coarser precision give one date', () => {
    expect(dateRange('2018-07', '2018-07')?.visible).toBe('Jul 2018');
    expect(dateRange('2018-07-29', '2018-07-29')?.visible).toBe('29 Jul 2018');
    const yearToMonth = dateRange('2018', '2018-07');
    expect(yearToMonth?.visible).toBe('2018');
    expect(yearToMonth?.spoken).toBe('2018');
    expect(yearToMonth?.start?.raw).toBe('2018');
    expect(yearToMonth?.end).toBeUndefined();
  });

  test('each side keeps its own precision when they differ', () => {
    expect(dateRange('2018', '2019-03')?.visible).toBe('2018 – Mar 2019');
    expect(dateRange('2018-07-29', '2019')?.visible).toBe('29 Jul 2018 – 2019');
  });

  test('no dates give no date line (US1 scenario 12)', () => {
    expect(dateRange(undefined, undefined)).toBeNull();
  });
});

describe('004-cv-page-FR-011: dates read as words, with a word between start and end', () => {
  test('a range reads with long month names and "to" (US1 scenario 7)', () => {
    expect(dateRange('2018-07', '2026-10')?.spoken).toBe('July 2018 to October 2026');
  });

  test('an ongoing range reads "to present"', () => {
    expect(dateRange('2025-12', undefined)?.spoken).toBe('December 2025 to present');
  });

  test('every word and the separator come from site text', () => {
    const range = dateRange('2018-07', '2026-10')!;
    expect(range.visible).toBe(`${siteText.monthsShort[6]} 2018${siteText.rangeSeparator}${siteText.monthsShort[9]} 2026`);
    expect(range.spoken).toBe(`${siteText.monthsLong[6]} 2018 ${siteText.to} ${siteText.monthsLong[9]} 2026`);
    const ongoing = dateRange('2025-12', undefined)!;
    expect(ongoing.visible).toBe(`${siteText.monthsShort[11]} 2025${siteText.rangeSeparator}${siteText.present.visible}`);
    expect(ongoing.spoken).toBe(`${siteText.monthsLong[11]} 2025 ${siteText.to} ${siteText.present.spoken}`);
    expect(range.spoken).not.toMatch(/[–—-]/);
  });
});
