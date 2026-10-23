// The fields /cv must show, read from the CV document (research R14,
// FR-052). Never a hand-written list: the sections and fields come from the
// site's own Key Entities table (`supported.ts`), so a field added to the CV
// document is expected at once.
//
// Each field is found in `<main>` in this order, which is the page's reading
// order:
// - `text`: the CV string after NFC, as the page writes it;
// - `datetime`: a date, by the `time` element carrying the CV string;
// - `href`: an address the page shows as a link's target, found where the
//   link starts. Apart from the basics' website, whose text is the address
//   without its scheme, an address is only a link's target, never text.
import type { Resume } from '@cv/content';
import { dateRange } from '../../../packages/web/src/format/dates.ts';
import { countryName } from '../../../packages/web/src/format/location.ts';
import { SHOWN_FIELDS, SUPPORTED_SECTIONS } from '../../../packages/web/src/supported.ts';

export type ExpectedField = { path: string; text: string } | { path: string; datetime: string } | { path: string; href: string };

type Entry = Record<string, unknown>;

const present = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

const text = (path: string, value: unknown): ExpectedField[] => (present(value) ? [{ path, text: value.normalize('NFC') }] : []);

const href = (path: string, value: unknown): ExpectedField[] => (present(value) ? [{ path, href: value }] : []);

const list = (path: string, value: unknown): ExpectedField[] => (Array.isArray(value) ? value.flatMap((item, index) => text(`${path}[${index}]`, item)) : []);

// The dates the page shows: both sides of a range, or the one it keeps when
// the two fall in the same period (data-model.md Date range).
function dates(path: string, entry: Entry): ExpectedField[] {
  const start = present(entry.startDate) ? entry.startDate : undefined;
  const end = present(entry.endDate) ? entry.endDate : undefined;
  const range = dateRange(start, end);
  if (range === null) return [];
  const shown = [range.start?.raw, range.end?.raw].filter((raw): raw is string => raw !== undefined);
  return shown.map((raw) => ({ path: `${path}.${raw === start ? 'startDate' : 'endDate'}`, datetime: raw }));
}

// Each field of an entry, in the page's order. A field the table doesn't
// list for its section is never expected: the content part reports it.
const FIELD_ORDER: Record<string, (path: string, entry: Entry) => ExpectedField[]> = {
  // The date line, the position, the organization (a link when there's an
  // address), its location, the text, then the highlights.
  work: (path, entry) => [
    ...dates(path, entry),
    ...text(`${path}.position`, entry.position),
    ...href(`${path}.url`, entry.url),
    ...text(`${path}.name`, entry.name),
    ...text(`${path}.location`, entry.location),
    ...text(`${path}.summary`, entry.summary),
    ...text(`${path}.description`, entry.description),
    ...list(`${path}.highlights`, entry.highlights),
  ],
  projects: (path, entry) => [
    ...dates(path, entry),
    ...href(`${path}.url`, entry.url),
    ...text(`${path}.name`, entry.name),
    ...text(`${path}.entity`, entry.entity),
    ...text(`${path}.type`, entry.type),
    ...list(`${path}.roles`, entry.roles),
    ...text(`${path}.description`, entry.description),
    ...list(`${path}.highlights`, entry.highlights),
    ...list(`${path}.keywords`, entry.keywords),
  ],
  skills: (path, entry) => [...text(`${path}.name`, entry.name), ...text(`${path}.level`, entry.level), ...list(`${path}.keywords`, entry.keywords)],
  education: (path, entry) => [
    ...dates(path, entry),
    ...text(`${path}.studyType`, entry.studyType),
    ...text(`${path}.area`, entry.area),
    ...href(`${path}.url`, entry.url),
    ...text(`${path}.institution`, entry.institution),
    ...text(`${path}.score`, entry.score),
    ...list(`${path}.courses`, entry.courses),
  ],
  languages: (path, entry) => [...text(`${path}.language`, entry.language), ...text(`${path}.fluency`, entry.fluency)],
  interests: (path, entry) => [...text(`${path}.name`, entry.name), ...list(`${path}.keywords`, entry.keywords)],
};

// The order above must name exactly the table's fields, so a field added to
// the table can't be left out of the expected list: an entry holding every
// field, as text and as a list, must yield each of them.
for (const [section, order] of Object.entries(FIELD_ORDER)) {
  const shown = SHOWN_FIELDS[section as keyof typeof SHOWN_FIELDS];
  const probe = (value: unknown) => Object.fromEntries(shown.map((name) => [name, name === 'startDate' ? '2000' : name === 'endDate' ? '2001' : value]));
  const named = new Set([...order('x', probe('x')), ...order('x', probe(['x']))].map((field) => /^x\.(\w+)/.exec(field.path)?.[1]));
  const missing = shown.filter((name) => !named.has(name));
  if (missing.length > 0) throw new Error(`expected.ts doesn't place ${section} fields ${missing.join(', ')}`);
}

function basicsFields(basics: Entry): ExpectedField[] {
  const location = (typeof basics.location === 'object' && basics.location !== null ? basics.location : {}) as Entry;
  const profiles = Array.isArray(basics.profiles) ? (basics.profiles as Entry[]) : [];
  return [
    ...text('basics.label', basics.label),
    ...text('basics.name', basics.name),
    ...text('basics.summary', basics.summary),
    ...text('basics.location.city', location.city),
    ...text('basics.location.region', location.region),
    ...(present(location.countryCode) ? [{ path: 'basics.location.countryCode', text: countryName(location.countryCode) }] : []),
    ...text('basics.email', basics.email),
    ...href('basics.url', basics.url),
    // The network's label, then the link, then the username in it.
    ...profiles.flatMap((profile, index) => {
      const path = `basics.profiles[${index}]`;
      return [...text(`${path}.network`, profile.network), ...href(`${path}.url`, profile.url), ...text(`${path}.username`, profile.username)];
    }),
  ];
}

// Every shown field the CV document holds, in the page's order: the basics,
// then each supported section in `SUPPORTED_SECTIONS` order.
export function expectedFields(resume: Resume): ExpectedField[] {
  const document = resume as Record<string, unknown>;
  const basics = typeof document.basics === 'object' && document.basics !== null ? (document.basics as Entry) : {};
  const fields = basicsFields(basics);
  for (const section of SUPPORTED_SECTIONS) {
    const entries = document[section];
    if (!Array.isArray(entries)) continue;
    const order = FIELD_ORDER[section]!;
    entries.forEach((entry, index) => {
      if (typeof entry === 'object' && entry !== null) fields.push(...order(`${section}[${index}]`, entry as Entry));
    });
  }
  return fields;
}
