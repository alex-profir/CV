// The CV commands show what /cv shows, by /cv's rules (006 research R4,
// data-model.md CV fields per section).
import { describe, expect, test } from 'vitest';
import type { Resume } from '@cv/content';
import { CV_FIELDS } from '../../../src/apps/terminal/engine/cv.ts';
import type { FieldRule } from '../../../src/apps/terminal/engine/cv.ts';
import { plainText } from '../../../src/apps/terminal/engine/block.ts';
import type { Block } from '../../../src/apps/terminal/engine/block.ts';
import { dateRange } from '../../../src/format/dates.ts';
import { locationLine } from '../../../src/format/location.ts';
import { siteText } from '../../../src/site-text.ts';
import { expectedFields } from '../../../../../tools/site-check/src/expected.ts';
import { fixture } from '../../helpers/fixtures.ts';
import type { FixtureName } from '../../helpers/fixtures.ts';
import { contextFor, contextOf, nodes, output, run } from './context.ts';

type Entry = Record<string, unknown>;

const SECTION_COMMANDS = { basics: 'about', contact: 'contact', work: 'work', projects: 'projects', education: 'education', skills: 'skills', languages: 'languages', interests: 'interests' } as const;

const FIXTURES: FixtureName[] = ['every-field', 'nothing-optional', 'partial-dates', 'non-ascii', 'three-projects'];

const present = (value: unknown): value is string => typeof value === 'string' && value !== '';
const strings = (value: unknown) => (Array.isArray(value) ? value.filter(present) : []);

// What a field rule shows of an entry, in order: texts to find in the
// output's text, links' targets and dates' datetimes.
type Shown = { texts: string[]; hrefs: string[]; datetimes: string[] };

function shownBy(rule: FieldRule, entry: Entry): Shown {
  const shown: Shown = { texts: [], hrefs: [], datetimes: [] };
  const value = entry[rule.path];
  switch (rule.as) {
    case 'text':
      if (present(value)) shown.texts.push(value);
      break;
    case 'list':
      shown.texts.push(...strings(value));
      break;
    case 'keywords':
      if (strings(value).length > 0) shown.texts.push(strings(value).join(siteText.listSeparator));
      break;
    case 'location': {
      const line = typeof value === 'object' && value !== null ? locationLine(value) : null;
      if (line !== null) shown.texts.push(line);
      break;
    }
    case 'date-range': {
      const range = dateRange(present(entry.startDate) ? entry.startDate : undefined, present(entry.endDate) ? entry.endDate : undefined);
      if (range !== null) {
        shown.texts.push(range.visible);
        shown.datetimes.push(...[range.start?.raw, range.end?.raw].filter(present));
      }
      break;
    }
    case 'url':
      if (present(value)) shown.hrefs.push(value);
      break;
    case 'email':
      if (present(value)) {
        shown.texts.push(value);
        shown.hrefs.push(`mailto:${value}`);
      }
      break;
    case 'profiles':
      for (const profile of (Array.isArray(value) ? value : []) as Entry[]) {
        if (present(profile.username)) shown.texts.push(profile.username);
        if (present(profile.url)) shown.hrefs.push(profile.url);
      }
      break;
  }
  return shown;
}

const entriesOf = (resume: Resume, section: keyof typeof SECTION_COMMANDS): Entry[] => {
  if (section === 'basics' || section === 'contact') return [(resume.basics ?? {}) as Entry];
  return ((resume as Record<string, unknown>)[section] as Entry[] | undefined) ?? [];
};

// Each needle found in the haystack after the one before it.
function inOrder(haystack: string, needles: string[]): string | null {
  let from = 0;
  for (const needle of needles) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) return needle;
    from = at;
  }
  return null;
}

async function checkSection(resume: Resume, section: keyof typeof SECTION_COMMANDS, label: string) {
  const block = output(await run(SECTION_COMMANDS[section], contextOf(resume)));
  const text = plainText(block);
  const all = nodes(block);
  const hrefs = all.flatMap((node) => (node.kind === 'link' ? [node.href] : []));
  const datetimes = all.flatMap((node) => (node.kind === 'time' ? [node.datetime] : []));
  const expected: Shown = { texts: [], hrefs: [], datetimes: [] };
  for (const entry of entriesOf(resume, section)) {
    const forEntry: Shown = { texts: [], hrefs: [], datetimes: [] };
    for (const rule of CV_FIELDS[section]) {
      const shown = shownBy(rule, entry);
      forEntry.texts.push(...shown.texts);
      forEntry.hrefs.push(...shown.hrefs);
      forEntry.datetimes.push(...shown.datetimes);
    }
    expect(inOrder(text, forEntry.texts), `${label} ${section}: a field out of order or missing\n${text}`).toBeNull();
    expected.texts.push(...forEntry.texts);
    expected.hrefs.push(...forEntry.hrefs);
    expected.datetimes.push(...forEntry.datetimes);
  }
  expect(inOrder(text, expected.texts), `${label} ${section}`).toBeNull();
  expect(hrefs, `${label} ${section} links`).toEqual(expected.hrefs);
  expect(datetimes, `${label} ${section} dates`).toEqual(expected.datetimes);
  return { text, block };
}

describe("006-terminal-FR-009: each CV command shows /cv's fields for its section, in order, by /cv's rules", () => {
  for (const name of FIXTURES) {
    test(`${name}: about, contact, work, projects, education, skills, languages and interests`, async () => {
      const resume = fixture(name);
      for (const section of Object.keys(SECTION_COMMANDS) as (keyof typeof SECTION_COMMANDS)[]) {
        const entries = entriesOf(resume, section);
        if (entries.length === 0) continue;
        await checkSection(resume, section, name);
      }
    });
  }

  test('ongoing entries end in Present, and absent fields leave no label', async () => {
    const { text } = await checkSection(fixture('partial-dates'), 'work', 'partial-dates');
    expect(text).toContain(`${siteText.rangeSeparator}${siteText.present.visible}`);
    const bare = plainText(output(await run('about', contextFor('nothing-optional'))));
    expect(bare).not.toMatch(new RegExp(`${siteText.basedIn}|${siteText.email}|${siteText.website}`));
    const contact = plainText(output(await run('contact', contextFor('every-field'))));
    expect(contact).toContain(siteText.email);
  });

  test('contact links are named as /cv names them: the address, the website without its scheme, network: username', async () => {
    const block = output(await run('contact', contextFor('every-field')));
    const links = nodes(block).flatMap((node) => (node.kind === 'link' ? [{ href: node.href, text: plainText(node.children) }] : []));
    expect(links).toEqual([
      { href: 'mailto:fixture.person@example.org', text: 'fixture.person@example.org' },
      { href: 'https://fixture-person.example.org', text: 'fixture-person.example.org' },
      { href: 'https://network-a.example.org/fixture-user-a', text: 'FixtureNetworkA: fixture-user-a' },
      { href: 'https://network-b.example.org/profile-b', text: 'FixtureNetworkB: network-b.example.org/profile-b' },
    ]);
    for (const node of nodes(block)) if (node.kind === 'link') expect(node.external, node.href).toBe(!node.href.startsWith('mailto:'));
  });

  test("CV_FIELDS names the fields 004's expectedFields does, section by section, on every-field", () => {
    const resume = fixture('every-field');
    const fromCv = new Set<string>();
    for (const [section, rules] of Object.entries(CV_FIELDS)) {
      const prefix = section === 'basics' || section === 'contact' ? 'basics' : section;
      for (const rule of rules) {
        if (rule.as === 'date-range') ['startDate', 'endDate'].forEach((field) => fromCv.add(`${prefix}.${field}`));
        else if (rule.as === 'location') ['city', 'region', 'countryCode'].forEach((field) => fromCv.add(`basics.location.${field}`));
        else if (rule.as === 'profiles') ['network', 'username', 'url'].forEach((field) => fromCv.add(`basics.profiles.${field}`));
        else fromCv.add(`${prefix}.${rule.path}`);
      }
    }
    const from004 = new Set(expectedFields(resume).map((field) => field.path.replace(/\[\d+\]/g, '')));
    expect([...fromCv].sort()).toEqual([...from004].sort());
  });
});

describe('006-terminal-FR-010: a CV fact changes in the Terminal with one edit, in the CV document', () => {
  test('changing one fact in a fixture CV changes the output, with no other edit', async () => {
    const before = fixture('every-field');
    const after = fixture('every-field');
    after.work![0]!.position = 'A Changed Position';
    after.skills![0]!.level = 'A Changed Level';
    after.basics!.summary = 'A changed summary.';
    const text = async (resume: Resume, line: string) => plainText(output(await run(line, contextOf(resume))));
    expect(await text(before, 'work')).not.toContain('A Changed Position');
    expect(await text(after, 'work')).toContain('A Changed Position');
    expect(await text(after, 'skills')).toContain('A Changed Level');
    expect(await text(after, 'about')).toContain('A changed summary.');
    expect(await text(after, 'projects')).toBe(await text(before, 'projects'));
  });
});

describe('006-terminal-FR-011: an empty or absent section says the CV lists none, with no heading or list', () => {
  const SECTIONS = { work: 'work', projects: 'projects', education: 'education', skills: 'skills', languages: 'languages', interests: 'interests' } as const;

  test('empty-sections: each empty command gives The CV lists no {section}., and help still lists it', async () => {
    const context = contextFor('empty-sections');
    const resume = fixture('empty-sections');
    for (const [section, command] of Object.entries(SECTIONS)) {
      const entries = ((resume as Record<string, unknown>)[section] as unknown[] | undefined) ?? [];
      const block: Block = output(await run(command, context));
      if (entries.length > 0) continue;
      const name = siteText.sections[section as keyof typeof siteText.sections].toLowerCase();
      expect(plainText(block), command).toBe(`The CV lists no ${name}.`);
      expect(nodes(block).some((node) => node.kind === 'heading' || node.kind === 'list'), command).toBe(false);
      expect(plainText(output(await run('help', context)))).toContain(command);
    }
    expect(plainText(output(await run('contact', context)))).toBe('The CV lists no contact details.');
    expect(plainText(output(await run('about', contextOf({}))))).toBe('The CV lists no basics.');
  });
});
