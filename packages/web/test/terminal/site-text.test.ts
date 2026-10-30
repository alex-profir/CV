// The Terminal's own words (FR-030): site text in English with no CV fact,
// every word it shows from the CV, the spec list or site text, and every
// character of its site text in a served subset of its font (research R16).
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { resume } from '@cv/content';
import fonts from '../../src/fonts/fonts.json' with { type: 'json' };
import { fill, siteText } from '../../src/site-text.ts';
import { COMMANDS } from '../../src/apps/terminal/engine/commands.ts';
import { STANDARD_GROUP } from '../../src/apps/terminal/shell/site-commands.ts';
import { readSpecList } from '../../scripts/spec-list.ts';
import { settle } from '../helpers/shell.ts';
import { COMMAND_LINE, linesRun, openTerminalPage, openVimView, runGroup, typeLine, vimEntry, vimView } from '../helpers/terminal.ts';

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
const shownText = (page: Page, root = '#os .terminal') =>
  page.evaluate((selector) => {
    const seen: string[] = [];
    const walker = document.createTreeWalker(document.querySelector(selector)!, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const text = node.textContent!.trim();
      if (text !== '') seen.push(text);
    }
    for (const element of document.querySelectorAll(`${selector} [aria-label]`)) seen.push(element.getAttribute('aria-label')!);
    return seen;
  }, root);

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
    // help's standard group names the shell's commands (FR-008, FR-068).
    ...STANDARD_GROUP,
    'cv.json',
    'json',
    ...siteText.monthsShort,
    ...siteText.monthsLong,
  ]
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 1)
    .sort((a, b) => b.length - a.length);
  const rest = (text: string) => pieces.reduce((left, piece) => left.split(piece).join(' '), text).replace(/[\s\d\p{P}\p{S}]/gu, '');

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

  test('the shell’s words are there, in English, with no key fact of the real CV', () => {
    const { replies, standard, shellLoading, shellFailed, tryAgain, owners, announce } = siteText.terminal;
    const added = strings({ unknown: replies.unknown, stopped: replies.stopped, cancelMark: replies.cancelMark, standard, shellLoading, shellFailed, tryAgain, owners, cancelled: announce.cancelled, loading: announce.loading });
    expect(added.length).toBe(15);
    const facts = [resume.basics?.name, resume.basics?.email, resume.basics?.label, ...(resume.work ?? []).map((work) => work.name)].filter((fact): fact is string => typeof fact === 'string' && fact !== '');
    for (const value of added) {
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
    const page = await openTerminalPage('desktop');
    await runGroup(page, 'help');
    await runGroup(page, 'work');
    const seen = await shownText(page);
    await openVimView(page);
    seen.push(...(await shownText(page)));
    expect(seen.length).toBeGreaterThan(50);
    expect([...new Set(seen)].filter((text) => rest(text) !== '')).toEqual([]);
  });

  test('006-terminal-FR-030: after a Tab list, in insert mode, after W10, E45 and a written message, and in the pocket’s Tab and vim states, every text is known', async () => {
    // What this test types, and the folder it makes: the visitor's own.
    const typed = ['notes', 'todo', 'mine', 'typed', 'readme', 'text', 'cv.json'];
    const known = (text: string) => rest(typed.reduce((left, word) => left.split(word).join(' '), text)) === '';
    // A vim key's own text, one letter of site text.
    const keyNames = new Set(siteText.terminal.pocket.vim.flatMap((key) => [key.key, fill(siteText.terminal.pocket.vimKeyName, key)]));
    const unknown = (seen: string[]) => [...new Set(seen)].filter((text) => !keyNames.has(text) && !known(text));

    const page = await openTerminalPage('desktop');
    await typeLine(page, 'mkdir notes && touch todo');
    await linesRun(page);
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type('cat ~/');
    await page.keyboard.press('Tab');
    await settle(page);
    await page.keyboard.press('Tab');
    await page.locator('.terminal div.completion-list').waitFor();
    const seen = await shownText(page);
    await page.locator(COMMAND_LINE).fill('vim mine');
    await page.keyboard.press('Enter');
    await vimView(page).waitFor();
    await page.locator('.terminal .vim-text').focus();
    await page.keyboard.press('i');
    await page.keyboard.type('typed');
    seen.push(...(await shownText(page)));
    await page.keyboard.press('Escape');
    await vimEntry(page, ':', 'wq');
    await page.locator(COMMAND_LINE).waitFor();
    await page.keyboard.type('vim cv.json');
    await page.keyboard.press('Enter');
    await vimView(page).waitFor();
    await page.locator('.terminal .vim-text').focus();
    await page.keyboard.press('x');
    seen.push(...(await shownText(page)));
    await vimEntry(page, ':', 'w');
    await settle(page);
    seen.push(...(await shownText(page)));
    await vimEntry(page, ':', 'w ~/mine');
    await settle(page);
    seen.push(...(await shownText(page)));
    expect(unknown(seen), JSON.stringify(seen.filter((one) => !known(one)))).toEqual([]);

    const phone = await openTerminalPage('mobile');
    await phone.locator(COMMAND_LINE).tap();
    await phone.keyboard.type('cat ~/');
    await phone.locator('button[aria-label="Tab, complete"]').tap();
    await settle(phone);
    await phone.locator('button[aria-label="Tab, complete"]').tap();
    await phone.locator('.terminal div.completion-list').waitFor();
    const pocketSeen = await shownText(phone, '#os .pocket');
    await phone.locator(COMMAND_LINE).fill('vim mine');
    await phone.keyboard.press('Enter');
    await vimView(phone).waitFor();
    await phone.locator('button[aria-label="i, Insert"]').tap();
    await phone.setViewportSize({ width: 375, height: 512 });
    await phone.locator('#os .pocket-strip').waitFor();
    pocketSeen.push(...(await shownText(phone, '#os .pocket')));
    expect(unknown(pocketSeen)).toEqual([]);
  });
});
