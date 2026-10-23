// The timeline sections: work, projects and education (contracts/page.md).
// Each entry keeps the CV document's order (FR-001), and an entry holding
// nothing shown isn't rendered. An entry's address is a link around the
// field it belongs to, or, when that field is missing, a link of its own at
// the start of the details line, so it's never dropped.
import type { ReactNode } from 'react';
import type { ResumeEducation, ResumeProject, ResumeWork } from '@cv/content';
import { dateRange } from '../format/dates.ts';
import { siteText } from '../site-text.ts';
import { CvLink, withoutScheme } from './CvLink.tsx';
import { Entry } from './Entry.tsx';
import type { EntryParts } from './Entry.tsx';
import { present } from './join.tsx';

// The text, as a link when the entry has an address.
const linked = (text: string, url: string | undefined): ReactNode => (present(url) ? <CvLink href={url!}>{text}</CvLink> : text);

// The address as its own link, or null when there's none.
const address = (url: string | undefined): ReactNode | null => (present(url) ? <CvLink href={url!}>{withoutScheme(url!)}</CvLink> : null);

const has = (entry: object, fields: readonly string[]) => fields.some((field) => present((entry as Record<string, unknown>)[field]));

export function workParts(work: ResumeWork): EntryParts | null {
  if (!has(work, ['name', 'position', 'location', 'url', 'startDate', 'endDate', 'description', 'summary', 'highlights'])) return null;
  const { name, position, location, url } = work;
  // The h3 is the position, or the organization when there's none.
  const heading = present(position) ? position! : present(name) ? linked(name!, url) : null;
  const organization = present(name) ? (present(position) ? linked(name!, url) : null) : address(url);
  const details = [organization, present(location) ? location! : null].filter((part) => part !== null);
  return {
    range: dateRange(work.startDate, work.endDate),
    heading,
    detailsClass: 'org',
    details,
    texts: [work.summary, work.description],
    highlights: work.highlights,
    chips: undefined,
  };
}

export function projectParts(project: ResumeProject): EntryParts | null {
  if (!has(project, ['name', 'description', 'entity', 'type', 'roles', 'url', 'startDate', 'endDate', 'highlights', 'keywords'])) return null;
  const { name, entity, type, roles, url } = project;
  const heading = present(name) ? linked(name!, url) : present(entity) ? linked(entity!, url) : null;
  const details = [
    present(name) || present(entity) ? null : address(url),
    present(name) && present(entity) ? entity! : null,
    present(type) ? type! : null,
    present(roles) ? roles!.filter(present).join(siteText.listSeparator) : null,
  ].filter((part) => part !== null);
  return {
    range: dateRange(project.startDate, project.endDate),
    heading,
    detailsClass: 'meta',
    details,
    texts: [project.description],
    highlights: project.highlights,
    chips: project.keywords,
  };
}

export function educationParts(entry: ResumeEducation): EntryParts | null {
  if (!has(entry, ['institution', 'area', 'studyType', 'url', 'startDate', 'endDate', 'score', 'courses'])) return null;
  const { institution, area, studyType, url, score } = entry;
  const title = [studyType, area].filter(present).join(siteText.listSeparator);
  const heading = title !== '' ? title : present(institution) ? linked(institution!, url) : null;
  const organization = present(institution) ? (title !== '' ? linked(institution!, url) : null) : address(url);
  const details = [organization, present(score) ? score! : null].filter((part) => part !== null);
  return {
    range: dateRange(entry.startDate, entry.endDate),
    heading,
    detailsClass: 'org',
    details,
    texts: [],
    highlights: undefined,
    chips: entry.courses,
  };
}

export function Timeline({ entries }: { entries: EntryParts[] }) {
  return (
    <ol className="timeline">
      {entries.map((parts, index) => (
        <Entry key={index} {...parts} />
      ))}
    </ol>
  );
}
