// The Terminal's own words (FR-030): site text in English with no CV fact,
// every word it shows from the CV, the spec list or site text, and every
// character of its site text in a served subset of its font (research R16).
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { resume } from '@cv/content';
import fonts from '../../src/fonts/fonts.json' with { type: 'json' };
import { siteText } from '../../src/site-text.ts';
import { COMMANDS } from '../../src/apps/terminal/engine/commands.ts';
import { readSpecList } from '../../scripts/spec-list.ts';
import { openTerminalPage, openVimView, runGroup } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 120_000 });

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

// Every key of an object, at any depth: `cv.json`'s keys show in the vim view.
function keys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(keys);
  if (value !== null && typeof value === 'object') return Object.entries(value).flatMap(([key, child]) => [key, ...keys(child)]);
  return [];
}

const TERMINAL_TEXT = strings(siteText.terminal);

const ENGLISH = /^[\x20-\x7E–—·’↗…•]*$/u;

// Each `U+XXXX` or `U+XXXX-YYYY` of a `unicodeRange`, as code point bounds.
const ranges = (unicodeRange: string) =>
  unicodeRange.split(',').map((part) => {
    const [from, to] = part.trim().replace(/^U\+/i, '').split('-');
    return [Number.parseInt(from!, 16), Number.parseInt(to ?? from!, 16)] as const;
  });

// Every text node in the Terminal, prompts and the vim view included.
const shownText = (page: Page) =>
  page.evaluate(() => {
    const seen: string[] = [];
    const walker = document.createTreeWalker(document.querySelector('#os .terminal')!, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const text = node.textContent!.trim();
      if (text !== '') seen.push(text);
    }
    for (const element of document.querySelectorAll('#os .terminal [aria-label]')) seen.push(element.getAttribute('aria-label')!);
    return seen;
  });

describe('006-terminal-FR-030: the Terminal’s words are site text, CV text or the spec list', () => {
  test('every value under siteText.terminal is English and holds no key fact of the real CV', () => {
    expect(TERMINAL_TEXT.length).toBeGreaterThan(60);
    const facts = [
      resume.basics?.name,
      resume.basics?.email,
      resume.basics?.location?.city,
      ...(resume.basics?.profiles ?? []).map((profile) => profile.username),
      ...(resume.work ?? []).map((work) => work.name),
      ...(resume.projects ?? []).map((project) => project.name),
      ...(resume.education ?? []).map((entry) => entry.institution),
    ].filter((fact): fact is string => typeof fact === 'string' && fact !== '');
    expect(facts.length).toBeGreaterThan(5);
    for (const value of TERMINAL_TEXT) {
      expect(value, value).toMatch(ENGLISH);
      for (const fact of facts) expect(value.toLowerCase(), value).not.toContain(fact.toLowerCase());
    }
  });

  test('every character of siteText.terminal is in a served subset of the Terminal’s font', () => {
    const mono = fonts.families.find((entry) => entry.token === 'font.family.mono')!;
    const covered = mono.files.flatMap((file) => ranges(file.unicodeRange));
    const characters = [...new Set(TERMINAL_TEXT.join(''))];
    const missing = characters.filter((character) => {
      const point = character.codePointAt(0)!;
      return !covered.some(([from, to]) => point >= from && point <= to);
    });
    expect(missing).toEqual([]);
  });

  test('after help, work and cv, every text the Terminal shows comes from site text, the CV or the spec list', async () => {
    // What a text node may be made of: site text's fixed parts, the CV's
    // values (with and without a link's scheme) and keys, the spec list, the
    // command names, the fixed file name `cv.json` and its type in the vim
    // view (data-model.md File system), numbers, punctuation and symbols.
    const pieces = [
      ...strings(siteText).flatMap((value) => value.split(/\{\w+\}/)),
      ...strings(resume).flatMap((value) => [value, value.replace(/^https?:\/\//, '').replace(/\/$/, '')]),
      ...keys(resume),
      ...readSpecList().flatMap((spec) => strings(spec)),
      ...COMMANDS.flatMap((command) => [command.name, ...command.aliases]),
      'cv.json',
      'json',
      ...siteText.monthsShort,
      ...siteText.monthsLong,
    ]
      .map((piece) => piece.trim())
      .filter((piece) => piece.length > 1)
      .sort((a, b) => b.length - a.length);
    const rest = (text: string) => pieces.reduce((left, piece) => left.split(piece).join(' '), text).replace(/[\s\d\p{P}\p{S}]/gu, '');

    const page = await openTerminalPage('desktop');
    await runGroup(page, 'help');
    await runGroup(page, 'work');
    const seen = await shownText(page);
    await openVimView(page);
    seen.push(...(await shownText(page)));
    expect(seen.length).toBeGreaterThan(50);
    expect([...new Set(seen)].filter((text) => rest(text) !== '')).toEqual([]);
  });
});
