// The CV in the Terminal (006 research R4, data-model.md CV fields per
// section): what /cv shows for each section, by /cv's rules, as blocks. An
// entry is a heading (its role or name, joined to its organization), its
// dates as `time` nodes, its details, its text, its highlights and its
// keywords. Absent fields are left out with no label (004 FR-004). Dates and
// locations are written by 004's formatters, which arrive as arguments, and
// links are named as /cv names them (004 FR-012, FR-013). `cat` uses the
// same builders, so a file can't differ from its command (FR-047).
import type { Resume, ResumeBasics, ResumeEducation, ResumeLocation, ResumeProject, ResumeWork } from '@cv/content';
import type { DateRange } from '../../../format/dates.ts';
import type { SiteText } from '../../../site-text.ts';
import { SHOWN_FIELDS } from '../../../supported.ts';
import { heading, line, link, list, text, time } from './block.ts';
import type { Block, Node } from './block.ts';

export type Formatters = {
  dateRange: (start: string | undefined, end: string | undefined) => DateRange | null;
  locationLine: (location: ResumeLocation) => string | null;
  withoutScheme: (url: string) => string;
};

export type CvInput = { resume: Resume; text: SiteText; format: Formatters };

export type Section = 'basics' | 'contact' | 'work' | 'projects' | 'education' | 'skills' | 'languages' | 'interests';

export type FieldRule = { path: string; as: 'text' | 'date-range' | 'location' | 'email' | 'url' | 'profiles' | 'list' | 'keywords' };

// The fields each command shows, in the order it shows them.
export const CV_FIELDS: Readonly<Record<Section, readonly FieldRule[]>> = Object.freeze({
  basics: [
    { path: 'name', as: 'text' },
    { path: 'label', as: 'text' },
    { path: 'location', as: 'location' },
    { path: 'summary', as: 'text' },
  ],
  contact: [
    { path: 'email', as: 'email' },
    { path: 'url', as: 'url' },
    { path: 'profiles', as: 'profiles' },
  ],
  work: [
    { path: 'position', as: 'text' },
    { path: 'name', as: 'text' },
    { path: 'url', as: 'url' },
    { path: 'startDate', as: 'date-range' },
    { path: 'location', as: 'text' },
    { path: 'summary', as: 'text' },
    { path: 'description', as: 'text' },
    { path: 'highlights', as: 'list' },
  ],
  projects: [
    { path: 'name', as: 'text' },
    { path: 'url', as: 'url' },
    { path: 'startDate', as: 'date-range' },
    { path: 'entity', as: 'text' },
    { path: 'type', as: 'text' },
    { path: 'roles', as: 'keywords' },
    { path: 'description', as: 'text' },
    { path: 'highlights', as: 'list' },
    { path: 'keywords', as: 'keywords' },
  ],
  education: [
    { path: 'studyType', as: 'text' },
    { path: 'area', as: 'text' },
    { path: 'institution', as: 'text' },
    { path: 'url', as: 'url' },
    { path: 'startDate', as: 'date-range' },
    { path: 'score', as: 'text' },
    { path: 'courses', as: 'keywords' },
  ],
  skills: [
    { path: 'name', as: 'text' },
    { path: 'level', as: 'text' },
    { path: 'keywords', as: 'keywords' },
  ],
  languages: [
    { path: 'language', as: 'text' },
    { path: 'fluency', as: 'text' },
  ],
  interests: [
    { path: 'name', as: 'text' },
    { path: 'keywords', as: 'keywords' },
  ],
});

export type EntrySection = 'work' | 'projects' | 'education';
export type ListSection = 'skills' | 'languages' | 'interests';

// Whether a CV value is shown: a non-empty string, or a list with one, as
// /cv decides (004 `join.tsx`).
export function present(value: unknown): boolean {
  if (typeof value === 'string') return value !== '';
  if (Array.isArray(value)) return value.some(present);
  return false;
}

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item !== '') : []);

const has = (entry: object, fields: readonly string[]) => fields.some((field) => present((entry as Record<string, unknown>)[field]));

// The entries of a section /cv shows: those holding a shown field.
export function shownEntries(resume: Resume, section: EntrySection | ListSection): object[] {
  const entries = ((resume as Record<string, unknown>)[section] as object[] | undefined) ?? [];
  return entries.filter((entry) => typeof entry === 'object' && entry !== null && has(entry, SHOWN_FIELDS[section]));
}

// `The CV lists no {section}.` (FR-011).
export function emptySection(input: CvInput, section: Section): Block {
  const { emptyNames } = input.text.terminal;
  const sections = Object.fromEntries(Object.entries(input.text.sections).map(([key, name]) => [key, name.toLowerCase()]));
  const names = { ...sections, basics: emptyNames.about, contact: emptyNames.contact } as Record<Section, string>;
  return [line(text(input.text.terminal.replies.emptySection.replace('{section}', names[section]), 'secondary'))];
}

// The external link to an address from the CV document.
const cvLink = (url: string, children: Block): Node => link(url, children, !url.startsWith('mailto:'));

const linked = (value: string, url: string | undefined, tone?: 'primary'): Node => (present(url) ? cvLink(url!, [text(value, tone)]) : text(value, tone));

// An entry's dates as one line of `time` nodes (004 FR-009 to FR-011).
function dateNodes(input: CvInput, range: DateRange): Node[] {
  const { rangeSeparator, present: ongoing } = input.text;
  const nodes: Node[] = [];
  if (range.start !== undefined) nodes.push(time(range.start.raw, range.start.visible, range.start.spoken));
  if (range.ongoing) nodes.push(text(`${rangeSeparator}${ongoing.visible}`, 'dim'));
  if (range.start !== undefined && range.end !== undefined) nodes.push(text(rangeSeparator, 'dim'));
  if (range.end !== undefined) nodes.push(time(range.end.raw, range.end.visible, range.end.spoken));
  return nodes;
}

const joined = (parts: Node[][], separator: string): Node[] => parts.flatMap((part, index) => (index === 0 ? part : [text(separator, 'dim'), ...part]));

type Parts = { title: Node[]; range: DateRange | null; details: Node[][]; texts: (string | undefined)[]; highlights: unknown; keywords: unknown };

function workParts(input: CvInput, work: ResumeWork): Parts {
  const { name, position, url } = work;
  const title: Node[][] = [];
  if (present(position)) title.push([text(position!, 'primary')]);
  if (present(name)) title.push([linked(name!, url, 'primary')]);
  if (title.length === 0 && present(url)) title.push([cvLink(url!, [text(input.format.withoutScheme(url!))])]);
  return {
    title: joined(title, input.text.metaSeparator),
    range: input.format.dateRange(work.startDate, work.endDate),
    details: present(work.location) ? [[text(work.location!, 'dim')]] : [],
    texts: [work.summary, work.description],
    highlights: work.highlights,
    keywords: undefined,
  };
}

function projectParts(input: CvInput, project: ResumeProject): Parts {
  const { name, entity, type, roles, url } = project;
  const title: Node[] = present(name) ? [linked(name!, url, 'primary')] : present(entity) ? [linked(entity!, url, 'primary')] : present(url) ? [cvLink(url!, [text(input.format.withoutScheme(url!))])] : [];
  const details: Node[][] = [];
  if (present(name) && present(entity)) details.push([text(entity!, 'dim')]);
  if (present(type)) details.push([text(type!, 'dim')]);
  if (present(roles)) details.push([text(strings(roles).join(input.text.listSeparator), 'dim')]);
  return { title, range: input.format.dateRange(project.startDate, project.endDate), details, texts: [project.description], highlights: project.highlights, keywords: project.keywords };
}

function educationParts(input: CvInput, entry: ResumeEducation): Parts {
  const { institution, area, studyType, url, score } = entry;
  const study = [studyType, area].filter((part): part is string => present(part)).join(input.text.listSeparator);
  const title: Node[][] = [];
  if (study !== '') title.push([text(study, 'primary')]);
  if (present(institution)) title.push([linked(institution!, url, 'primary')]);
  if (title.length === 0 && present(url)) title.push([cvLink(url!, [text(input.format.withoutScheme(url!))])]);
  return {
    title: joined(title, input.text.metaSeparator),
    range: input.format.dateRange(entry.startDate, entry.endDate),
    details: present(score) ? [[text(score!, 'dim')]] : [],
    texts: [],
    highlights: undefined,
    keywords: entry.courses,
  };
}

// One entry: a heading at `depth`, then its lines (FR-029). An entry with
// nothing to head it is headed by its dates.
export function entryBlock(input: CvInput, section: EntrySection, entry: object, depth: 1 | 2): Block {
  const parts =
    section === 'work' ? workParts(input, entry as ResumeWork) : section === 'projects' ? projectParts(input, entry as ResumeProject) : educationParts(input, entry as ResumeEducation);
  const dates = parts.range === null ? [] : dateNodes(input, parts.range);
  const block: Node[] = [];
  if (parts.title.length > 0) {
    block.push(heading(depth, ...parts.title));
    if (dates.length > 0) block.push(line(...dates));
  } else if (dates.length > 0) block.push(heading(depth, ...dates));
  if (parts.details.length > 0) block.push(line(...joined(parts.details, input.text.metaSeparator)));
  for (const value of parts.texts) if (present(value)) block.push(line(text(value!, 'secondary')));
  const highlights = strings(parts.highlights);
  if (highlights.length > 0) block.push(list(highlights.map((highlight) => [text(highlight, 'secondary')])));
  const keywords = strings(parts.keywords);
  if (keywords.length > 0) block.push(line(text(keywords.join(input.text.listSeparator), 'dim')));
  return block;
}

// A whole section, its entries headed one level below the command (FR-029).
export function entriesBlock(input: CvInput, section: EntrySection): Block {
  const entries = shownEntries(input.resume, section);
  if (entries.length === 0) return emptySection(input, section);
  return entries.flatMap((entry) => entryBlock(input, section, entry, 1));
}

// Skills, languages and interests: lists in the CV's order.
export function listBlock(input: CvInput, section: ListSection): Block {
  const entries = shownEntries(input.resume, section) as Record<string, unknown>[];
  if (entries.length === 0) return emptySection(input, section);
  const { metaSeparator, listSeparator } = input.text;
  const items = entries.map((entry): Block => {
    const keywords = strings(entry.keywords);
    const head: Node[][] = [];
    const first = section === 'languages' ? entry.language : entry.name;
    const second = section === 'skills' ? entry.level : section === 'languages' ? entry.fluency : undefined;
    if (present(first)) head.push([text(first as string, 'primary')]);
    if (present(second)) head.push([text(second as string, 'dim')]);
    const item: Node[] = [];
    if (head.length > 0) item.push(line(...joined(head, metaSeparator)));
    if (keywords.length > 0) item.push(line(text(keywords.join(listSeparator), 'dim')));
    return item;
  });
  return [list(items)];
}

// `about`'s lines: the name, the label, the location and the summary; none
// when the CV shows none of them.
export function aboutLines(input: CvInput): Node[] {
  const basics: ResumeBasics = input.resume.basics ?? {};
  const block: Node[] = [];
  if (present(basics.name)) block.push(line(text(basics.name!, 'primary')));
  if (present(basics.label)) block.push(line(text(basics.label!, 'heading')));
  const location = basics.location === undefined ? null : input.format.locationLine(basics.location);
  if (location !== null) block.push(line(text(location, 'dim')));
  if (present(basics.summary)) block.push(line(text(basics.summary!, 'secondary')));
  return block;
}

// `about`, or the empty-section line.
export function aboutBlock(input: CvInput): Block {
  const block = aboutLines(input);
  return block.length === 0 ? emptySection(input, 'basics') : block;
}

// `contact`'s lines: the email, the website and every profile, as links
// named as /cv names them; none when the CV shows none of them.
export function contactLines(input: CvInput): Node[] {
  const { email, url, profiles } = input.resume.basics ?? {};
  const { text: siteText, format } = input;
  const block: Node[] = [];
  const row = (label: string, value: Node) => line(text(label, 'dim'), text(' '), value);
  if (present(email)) block.push(row(siteText.email, cvLink(`mailto:${email}`, [text(email!)])));
  if (present(url)) block.push(row(siteText.website, cvLink(url!, [text(format.withoutScheme(url!))])));
  for (const profile of profiles ?? []) {
    const { network, username, url: address } = profile;
    if (!present(network) && !present(username) && !present(address)) continue;
    const shown = present(username) ? username! : present(address) ? format.withoutScheme(address!) : network!;
    const named = present(network) && (present(username) || present(address)) ? siteText.profileLabel.replace('{network}', network!).replace('{username}', shown) : shown;
    block.push(line(present(address) ? cvLink(address!, [text(named)]) : text(named)));
  }
  return block;
}

// `contact`, or the empty-section line.
export function contactBlock(input: CvInput): Block {
  const block = contactLines(input);
  return block.length === 0 ? emptySection(input, 'contact') : block;
}
