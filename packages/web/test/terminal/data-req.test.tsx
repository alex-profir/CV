// Every target in contracts/terminal.md's `data-req` table carries exactly
// its 006 IDs in the rendered Terminal, the 2026-10-29 amendment's
// included, and every 006 ID in a `data-req`, in the source and the page,
// names a requirement of the spec (FR-037).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { REPO_ROOT } from '../helpers/copy.ts';
import { openShell, settle } from '../helpers/shell.ts';
import { linesRun, openTerminalLoading, openTerminalPage, openVimView, runGroup, SHELL_PAGE, typeLine, vimEntry } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 180_000 });

const ids = (...numbers: number[]) =>
  numbers
    .map((number) => `006-terminal-FR-${String(number).padStart(3, '0')}`)
    .sort()
    .join(' ');

// The table's rows, as selectors, with the IDs each must carry.
const DESKTOP: [string, string][] = [
  ['#os .terminal', ids(19, 23, 31, 32, 33, 35)],
  ['#os .terminal h1', ids(29)],
  ['#os .terminal section.run', ids(6, 29)],
  ['#os .terminal div.run-output', ids(9, 10, 11, 18)],
  ['#os .terminal input.command-line', ids(4, 6, 7, 17, 18, 20, 26, 27, 72, 74, 75, 76, 77)],
  ['#os .terminal span.cursor-mirror', ids(32, 72, 74)],
  ['#os .terminal div.terminal-screen', ids(71, 75)],
  ['#os .terminal ul.out-standard', ids(8, 68)],
  ['#os .terminal p.out-standard-heading', ids(8, 68)],
  ['#os .terminal .terminal-status', ids(28, 77)],
  ['#os .terminal span.prompt', ids(27, 46)],
  ['#os .window[data-view="terminal"] .window-title span[data-req]', ids(46)],
  ['#os .terminal .out-help', ids(8)],
  ['#os .terminal .out-help button', ids(15, 34)],
  ['#os .terminal .starter', ids(5, 30)],
  ['#os .terminal .starter button', ids(15, 34)],
  ['#os .terminal .out-columns:not(.out-standard)', ids(43, 50)],
  ['#os .terminal .out-columns:not(.out-standard) button', ids(15, 34, 50)],
  ['#os .terminal ul.out-standard button', ids(15, 34)],
  ['#os .terminal .out-specs', ids(13)],
  ['#os .terminal .out-json', ids(56)],
  ['#os .dock-item[data-app="terminal"] [data-req*="006-terminal-"]', ids(1)],
];

const VIM: [string, string][] = [
  ['#os .terminal section.vim', ids(58, 59, 65)],
  ['#os .terminal div.vim-text', ids(60, 63, 79)],
  ['#os .terminal button.vim-fold', ids(34, 61)],
  ['#os .terminal section.vim mark', ids(62)],
  ['#os .terminal div.vim-help', ids(64)],
  ['#os .terminal .vim-chips button', ids(64)],
];

const MOBILE: [string, string][] = [
  ['#os .pocket', ids(24, 25, 52, 53)],
  ['#os .pocket-case', ids(54)],
  ['#os .pocket-foot', ids(54)],
  ['#os .pocket-keys', ids(51, 66, 78)],
  ['#os .home .app-icon[data-view="terminal"] [data-req*="006-terminal-"]', ids(1)],
];

// Each matching element's 006 IDs, sorted.
const idsOf = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((list) => list.map((element) => (element.getAttribute('data-req') ?? '').split(/\s+/).filter((id) => id.startsWith('006-')).sort().join(' ')));

async function expectRows(page: Page, rows: [string, string][], label: string): Promise<void> {
  for (const [selector, expected] of rows) {
    const found = await idsOf(page, selector);
    expect(found.length, `${label}: ${selector}`).toBeGreaterThan(0);
    for (const value of found) expect(value, `${label}: ${selector}`).toBe(expected);
  }
}

// The controls in the last run's output, by their IDs.
const lastControls = (page: Page) => idsOf(page, '#os .terminal section.run:last-of-type .run-output button');

const spec = fs.readFileSync(path.join(REPO_ROOT, 'specs/006-terminal/spec.md'), 'utf8');
const REQUIREMENTS = new Set([...spec.matchAll(/^- \*\*(FR-\d{3})\*\*/gm)].map((match) => `006-terminal-${match[1]}`));

describe('006-terminal-FR-037: every Terminal target carries its requirement IDs', () => {
  test('desktop: after help, ls, specs, cat cv.json | jq and cd work, an unknown command and a missing path, and the vim view searched with its help open', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, 'help');
    await runGroup(page, 'ls');
    await runGroup(page, 'specs');
    await runGroup(page, 'cat cv.json | jq');
    await runGroup(page, 'cd work');
    await runGroup(page, 'pwd');
    await expectRows(page, DESKTOP, 'desktop');
    expect((await page.locator('#os .window[data-view="terminal"] .window-title span[data-req]').textContent())?.trim()).toBe('Terminal — ~/work');

    // Suggestions after an unknown command; a missing path's reply, which
    // offers nothing to run; and a folder given to cat, which offers ls.
    await runGroup(page, 'wrok');
    expect(await lastControls(page)).toContain(ids(15, 16, 34));
    await runGroup(page, 'cat nothing-here');
    expect(await idsOf(page, '#os .terminal section.run:last-of-type div.run-output')).toEqual([ids(9, 10, 11, 18)]);
    await runGroup(page, 'cat ~/work');
    const replies = await lastControls(page);
    expect(replies.length).toBeGreaterThan(0);
    for (const value of replies) expect(value).toBe(ids(15, 34, 48));

    await openVimView(page);
    await expectRows(page, VIM.filter(([selector]) => !/mark|vim-help/.test(selector)), 'desktop vim');
    await vimEntry(page, '/', 'e');
    await expectRows(page, VIM.filter(([selector]) => selector.endsWith('mark')), 'desktop vim searched');
    await vimEntry(page, ':', 'help');
    await expectRows(page, VIM.filter(([selector]) => /vim-help|vim-chips/.test(selector)), 'desktop vim help');

    // The Terminal menu's Clear output.
    await page.locator('.terminal .vim-text').focus();
    await vimEntry(page, ':', 'q');
    await page.click('#menu-title-app');
    expect(await idsOf(page, '#menu-app [role="menuitem"][data-req*="006-terminal-"]')).toEqual([ids(3, 19)]);
  });

  test('the shell’s states: loading, failed with its try again control, and a stopped line', async () => {
    const loading = await openShell(SHELL_PAGE.desktop);
    const release = await openTerminalLoading(loading, 'desktop');
    await expectRows(loading, [['#os .terminal p.shell-loading', ids(70)]], 'loading');
    await release();
    await runGroup(loading, 'while true; do :; done');
    await expectRows(loading, [['#os .terminal p.run-stopped', ids(69, 75)]], 'stopped');
    const failed = await openShell({ ...SHELL_PAGE.desktop, beforeGoto: async (opened) => void (await opened.route('**/assets/shell-*.js', (route) => route.fulfill({ status: 503, body: '' }))) });
    await failed.locator('#os .dock-item[data-app="terminal"]').click();
    await failed.waitForSelector('.terminal p.shell-failed');
    await expectRows(failed, [['#os .terminal p.shell-failed', ids(70)], ['#os .terminal p.shell-failed button', ids(70)]], 'failed');
  });

  test('mobile: the pocket, its keys and its vim keys', async () => {
    const page = await openTerminalPage('mobile');
    await expectRows(page, MOBILE, 'mobile');
    await page.locator('#os .pocket-keys button.pocket-key[aria-label="cv"]').tap();
    await page.locator('#os .terminal section.vim').waitFor();
    await expectRows(page, [['#os .pocket-keys', ids(51, 66, 78)], ...VIM.filter(([selector]) => !/mark|vim-help/.test(selector))], 'mobile vim');
  });

  test('the 2026-10-30 amendment’s targets: the list, the status and message lines, the text area, the Tab key and the strip', async () => {
    const page = await openTerminalPage('desktop');
    await typeLine(page, 'mkdir notes');
    await linesRun(page);
    await page.locator('.terminal input.command-line').focus();
    await page.keyboard.type('cat ~/');
    await page.keyboard.press('Tab');
    await settle(page);
    await page.keyboard.press('Tab');
    await page.locator('.terminal div.completion-list').waitFor();
    await expectRows(page, [['#os .terminal div.completion-list', ids(76)]], 'the list');
    await page.locator('.terminal input.command-line').fill('vim notes.txt');
    await page.keyboard.press('Enter');
    await page.locator('.terminal section.vim').waitFor();
    await page.locator('.terminal .vim-text').focus();
    await page.keyboard.press('i');
    await page.locator('.terminal textarea.vim-insert').waitFor();
    await expectRows(
      page,
      [
        ['#os .terminal textarea.vim-insert', ids(65, 79)],
        ['#os .terminal div.vim-status', ids(58, 81)],
        ['#os .terminal div.vim-message', ids(60, 80)],
      ],
      'insert mode',
    );
    const phone = await openTerminalPage('mobile');
    await expectRows(phone, [['#os .pocket-keys button[aria-label="Tab, complete"]', ids(78)]], 'the Tab key');
    await phone.locator('.terminal input.command-line').tap();
    await phone.setViewportSize({ width: 375, height: 512 });
    await phone.locator('#os div.pocket-strip').waitFor();
    await expectRows(phone, [['#os div.pocket-strip', ids(66, 78)]], 'the strip');
  });

  test('every 006 ID in a data-req, in the source and the rendered root, names a requirement of the spec', async () => {
    expect(REQUIREMENTS.size).toBe(81);
    const source: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(file);
        else if (/\.tsx?$/.test(entry.name)) source.push(...[...fs.readFileSync(file, 'utf8').matchAll(/data-req[^\n]*?(006-terminal-FR-\d{3}(?:\s+006-terminal-FR-\d{3})*)/g)].flatMap((match) => match[1]!.split(/\s+/)));
      }
    };
    walk(path.join(REPO_ROOT, 'packages/web/src'));
    expect(source.length).toBeGreaterThan(40);
    const page = await openTerminalPage('desktop');
    await runGroup(page, 'help');
    const rendered = await page.evaluate(() => [...document.querySelectorAll('[data-req*="006-terminal-"]')].flatMap((element) => (element.getAttribute('data-req') ?? '').split(/\s+/).filter((id) => id.startsWith('006-'))));
    expect([...new Set([...source, ...rendered])].filter((id) => !REQUIREMENTS.has(id))).toEqual([]);
  });
});
