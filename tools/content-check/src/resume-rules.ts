import { ENTRY_KINDS, entriesOf, identityKey } from './entries.ts';
import { COUNTRY_CODE, FORMAT_RULES, WEB_ADDRESS } from './formats.ts';
import type { FormatRule } from './formats.ts';
import { formatPath, locate } from './json.ts';
import type { DocumentRead, FieldPath } from './json.ts';
import type { Problem } from './report.ts';
import { valuesAt } from './schema.ts';
import type { Pattern } from './schema.ts';

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

// The sample CV's `meta` values (research R6).
const SAMPLE_META: Record<string, (value: string) => boolean> = {
  canonical: (value) => value.startsWith('https://raw.githubusercontent.com/jsonresume/resume-schema/'),
  version: (value) => value === 'v1.0.0',
  lastModified: (value) => value === '2017-12-24T15:53:00',
};

const EXAMPLE_DOMAINS = ['example.com', 'example.org', 'example.net'];

function isExampleDomain(value: string): boolean {
  const hostname = URL.parse(value)?.hostname;
  if (hostname === undefined) return false;
  return EXAMPLE_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

// Every string value at any depth, with its path.
function strings(value: unknown, at: FieldPath = []): { path: FieldPath; value: string }[] {
  if (typeof value === 'string') return [{ path: at, value }];
  if (Array.isArray(value)) return value.flatMap((child, index) => strings(child, [...at, index]));
  if (value !== null && typeof value === 'object') return Object.entries(value).flatMap(([key, child]) => strings(child, [...at, key]));
  return [];
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

// The CV rules the schema can't express (research R6). Values of the wrong
// type were reported by the schema and are skipped here, and so are dates
// already found invalid.
export function resumeRules(read: DocumentRead, options: { datePatterns: Pattern[]; formats: { pattern: Pattern; format: string }[] }): Problem[] {
  const problems: Problem[] = [];
  const resume = read.value;
  const atValue = (fieldPath: FieldPath, type: Problem['type'], detail: string) =>
    problems.push({ type, subject: formatPath(fieldPath), location: locate(read, fieldPath, 'value'), detail });
  const atEntry = (fieldPath: FieldPath, type: Problem['type'], detail: string) =>
    problems.push({ type, subject: formatPath(fieldPath), location: locate(read, fieldPath, 'entry'), detail });

  // Dates (FR-009). A bad form is the schema's pattern error, so only dates
  // that don't exist are reported here.
  for (const pattern of options.datePatterns) {
    for (const { path: fieldPath, value } of valuesAt(resume, pattern)) {
      if (typeof value === 'string' && parseDate(value) === 'not-real') {
        atValue(fieldPath, 'invalid-date', `${JSON.stringify(value)} is not a real date`);
      }
    }
  }
  const dateOf = (entry: Record<string, unknown>, field: string): DateParts | undefined => {
    const value = entry[field];
    if (typeof value !== 'string') return undefined;
    const parsed = parseDate(value);
    return typeof parsed === 'object' ? parsed.parts : undefined;
  };

  for (const kind of Object.values(ENTRY_KINDS)) {
    const entries = entriesOf(resume, kind).flatMap(({ path: entryPath, entry }) => {
      const fields = record(entry);
      return fields === undefined ? [] : [{ path: entryPath, fields }];
    });

    // End before start (FR-010), at shared precision.
    if (kind.dating?.range) {
      for (const { path: entryPath, fields } of entries) {
        const start = dateOf(fields, 'startDate');
        const end = dateOf(fields, 'endDate');
        if (start !== undefined && end !== undefined && compareDates(end, start) < 0) {
          atValue([...entryPath, 'endDate'], 'end-before-start', `${JSON.stringify(fields.endDate)} is before the start date ${JSON.stringify(fields.startDate)}`);
        }
      }
    }

    // Order, newest first with ongoing entries before the rest (FR-011,
    // FR-036). Equal at shared precision isn't transitive, so every pair is
    // compared.
    const dating = kind.dating;
    if (dating !== null) {
      const dated = entries.flatMap(({ path: entryPath, fields }) => {
        const date = dateOf(fields, dating.range ? 'startDate' : dating.field);
        if (date === undefined) return [];
        return [{ path: entryPath, date, ongoing: dating.range && !Object.hasOwn(fields, 'endDate') }];
      });
      dated.forEach((later, index) => {
        const earlier = dated
          .slice(0, index)
          .find((other) => (later.ongoing && !other.ongoing) || (later.ongoing === other.ongoing && compareDates(later.date, other.date) > 0));
        if (earlier !== undefined) atEntry(later.path, 'out-of-order', `should come before ${formatPath(earlier.path)} (newest first)`);
      });
    }

    // Duplicates (FR-014, FR-021).
    const groups = new Map<string, FieldPath[]>();
    for (const { path: entryPath, fields } of entries) {
      const key = identityKey(fields, kind);
      groups.set(key, [...(groups.get(key) ?? []), entryPath]);
    }
    for (const paths of groups.values()) {
      if (paths.length > 1) {
        atEntry(paths[0]!, 'duplicate-entry', `the same entry is listed ${paths.length} times: ${paths.map(formatPath).join(', ')}`);
      }
    }
  }

  // Untrimmed text (FR-015) and placeholders (FR-016), in every string.
  for (const { path: fieldPath, value } of strings(resume)) {
    if (value !== value.trim()) atValue(fieldPath, 'untrimmed-text', `${JSON.stringify(value)} has leading or trailing whitespace`);
    if (isExampleDomain(value)) atValue(fieldPath, 'placeholder', `${JSON.stringify(value)} is on a reserved example domain`);
  }
  const meta = record(record(resume)?.meta);
  for (const [key, isSample] of Object.entries(SAMPLE_META)) {
    const value = meta?.[key];
    if (typeof value === 'string' && isSample(value)) {
      atValue(['meta', key], 'placeholder', `${JSON.stringify(value)} is copied from the JSON Resume sample CV`);
    }
  }

  // Formats (FR-012): the schema's formats, plus the image URL and the country
  // code, which have none.
  const rules: { pattern: Pattern; rule: FormatRule | undefined }[] = [
    ...options.formats.map(({ pattern, format }) => ({ pattern, rule: FORMAT_RULES[format] })),
    { pattern: ['basics', 'image'], rule: WEB_ADDRESS },
    { pattern: ['basics', 'location', 'countryCode'], rule: COUNTRY_CODE },
  ];
  for (const { pattern, rule } of rules) {
    if (rule === undefined) continue;
    for (const { path: fieldPath, value } of valuesAt(resume, pattern)) {
      if (typeof value === 'string' && !rule.test(value)) atValue(fieldPath, 'invalid-format', rule.detail(value));
    }
  }
  return problems;
}
