// Every target in contracts/playground.md's `data-req` table carries exactly
// its 008 IDs in the rendered Playground, and the Playground's spec view lists
// the requirements its source carries (FR-074). The list of keys' popup joins
// the table's rows here with T071.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { siteText } from '../../src/site-text.ts';
import { REPO_ROOT } from '../helpers/copy.ts';
import { openShell, PHONE_USER_AGENT } from '../helpers/shell.ts';
import { freshProfile, holdEngine, LOADING, menu, openPlayground, openPlaygroundPage, PLAYGROUND, POPUP, run, setCode, showPane, TOOLBAR, waitChecked, waitReady } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 240_000 });

const ids = (...numbers: number[]) =>
  numbers
    .map((number) => `008-typescript-playground-FR-${String(number).padStart(3, '0')}`)
    .sort()
    .join(' ');

// Each matching element's 008 IDs, sorted.
const idsOf = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((list) => list.map((element) => (element.getAttribute('data-req') ?? '').split(/\s+/).filter((id) => id.startsWith('008-')).sort().join(' ')));

async function expectRows(page: Page, rows: [string, string][], label: string): Promise<void> {
  for (const [selector, expected] of rows) {
    const found = await idsOf(page, selector);
    expect(found.length, `${label}: ${selector}`).toBeGreaterThan(0);
    for (const value of found) expect(value, `${label}: ${selector}`).toBe(expected);
  }
}

// The files of the Playground's source, for the IDs they carry.
function sourceFiles(dir: string): string[] {
  return fs.readdirSync(path.join(REPO_ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const file = `${dir}/${entry.name}`;
    return entry.isDirectory() ? sourceFiles(file) : /\.tsx?$/.test(entry.name) ? [file] : [];
  });
}

const CARRIED = new Set(sourceFiles('packages/web/src/apps/playground').flatMap((file) => [...fs.readFileSync(path.join(REPO_ROOT, file), 'utf8').matchAll(/008-typescript-playground-FR-\d{3}/g)].map((match) => match[0])));

describe('008-typescript-playground-FR-074: every Playground target carries its requirement IDs', () => {
  test('the download and its offline state', async () => {
    const page = await freshProfile();
    await holdEngine(page);
    await openPlayground(page);
    await page.waitForSelector(LOADING);
    await expectRows(page, [[LOADING, ids(7, 65, 69)]], 'downloading');
    const offline = await freshProfile();
    await offline.context().setOffline(true);
    await openPlayground(offline);
    await offline.waitForSelector(`${LOADING} button.playground-retry`, { timeout: 30_000 });
    await expectRows(offline, [[`${LOADING} button.playground-retry`, ids(11)]], 'offline');
  });

  test('the window: the tools, the editor, the panes, the status bar and the popups', async () => {
    const page = await openPlaygroundPage();
    await setCode(page, 'const n: number = "one";\nconsole.log(n);');
    await waitChecked(page);
    await expectRows(
      page,
      [
        [PLAYGROUND, ids(3, 68, 71, 72, 74)],
        [`${TOOLBAR} button.run`, ids(32, 33, 83)],
        [`${TOOLBAR} button.stop`, ids(38)],
        [`${TOOLBAR} button.examples`, ids(27, 28, 31)],
        [`${TOOLBAR} button.share`, ids(52, 55)],
        [`${PLAYGROUND} .playground-editor`, ids(15, 16, 17, 18, 62, 63, 81, 82, 83, 84)],
        [`${PLAYGROUND} .pane-tabs`, ids(20, 64)],
        [`${PLAYGROUND} .pane-javascript`, ids(21, 23)],
        [`${PLAYGROUND} span.ts-version`, ids(12)],
        [`${PLAYGROUND} .playground-status`, ids(16, 62)],
      ],
      'ready',
    );
    await showPane(page, 'declarations');
    await expectRows(page, [[`${PLAYGROUND} .pane-declarations`, ids(21, 23)]], 'declarations');
    await showPane(page, 'errors');
    await expectRows(page, [[`${PLAYGROUND} .pane-errors`, ids(16, 22)]], 'errors');
    await run(page);
    await showPane(page, 'logs');
    await expectRows(
      page,
      [
        [`${PLAYGROUND} .pane-logs`, ids(34, 35, 43, 44, 47)],
        [`${TOOLBAR} p.run-state`, ids(36, 66)],
      ],
      'logs',
    );
    await page.locator(`${TOOLBAR} button.options`).click();
    await expectRows(page, [[`${PLAYGROUND} section.options-panel`, ids(24, 25, 26)]], 'options');
    await page.keyboard.press('Escape');
    await page.locator(`${TOOLBAR} button.examples`).click();
    await expectRows(page, [[`${PLAYGROUND} section.examples-panel`, ids(27, 28, 31)]], 'examples');
    await page.keyboard.press('Escape');
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator(`${TOOLBAR} button.share`).click();
    await page.waitForSelector(`${PLAYGROUND} .playground-message`);
    await expectRows(page, [[`${PLAYGROUND} .playground-message`, ids(14, 19, 52, 53, 55, 56, 57)]], 'message');
    await menu(page, siteText.playground.menu.reset);
    await page.waitForSelector(POPUP);
    await expectRows(page, [[POPUP, ids(80)]], 'reset');
    await page.keyboard.press('Escape');
    await setCode(page, 'while (true) {}');
    await waitChecked(page);
    await run(page, { wait: 'start' });
    await page.waitForSelector(POPUP, { timeout: 20_000 });
    await expectRows(page, [[POPUP, ids(48, 49, 50, 51)]], 'stuck');
  });

  test("the menu's items: each carries FR-003 and the requirement it acts on", async () => {
    const page = await openPlaygroundPage();
    await page.click('#menu-title-app');
    const items = await idsOf(page, '#menu-app [role="menuitem"][data-req*="008-typescript-playground-"]');
    expect(items).toEqual([ids(3, 32), ids(3, 38), ids(3, 27), ids(3, 24), ids(3, 52), ids(3, 85), ids(3, 80)]);
  });

  test('the phone: the screen and its buttons; the dock item and the home icon', async () => {
    const page = await openShell({ width: 375, height: 812, hasTouch: true, userAgent: PHONE_USER_AGENT });
    await expectRows(page, [['#os .home .app-icon[data-view="playground"] [data-req*="008-typescript-playground-"]', ids(1)]], 'home');
    await page.locator('#os .home .app-icon[data-view="playground"]').tap();
    const screen = '#os .full-screen[data-view="playground"] section.playground-mobile';
    await page.waitForSelector(screen);
    await expectRows(
      page,
      [
        [screen, ids(58, 59, 60)],
        [`${screen} button.share-link`, ids(58, 59, 60)],
        [`${screen} button.copy-link`, ids(58, 59, 60)],
      ],
      'phone',
    );
    const desktop = await freshProfile();
    await expectRows(desktop, [['#os .dock-item[data-app="playground"] [data-req*="008-typescript-playground-"]', ids(1)]], 'dock');
  });

  test("the Playground's spec view lists the requirements its source carries", async () => {
    const page = await openPlaygroundPage();
    await waitReady(page);
    await menu(page, siteText.inspector.show);
    const view = '#os section.spec-view[data-view="playground"]';
    await page.locator(`${view} section.spec-group`).first().waitFor();
    const shown = await page.locator(`${view} section.spec-group[data-feature="008-typescript-playground"]`).innerText();
    const listed = [...CARRIED].map((id) => id.replace('008-typescript-playground-', '')).filter((id) => !shown.includes(id));
    expect(listed).toEqual([]);
  });
});
