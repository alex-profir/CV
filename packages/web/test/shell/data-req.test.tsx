// Every element contracts/shell.md's structure names carries exactly its
// IDs in the rendered root, nothing else carries a 005 ID, and every ID
// names a requirement of the spec (FR-055).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { REPO_ROOT } from '../helpers/copy.ts';
import { openShell, press, settle } from '../helpers/shell.ts';

vi.setConfig({ testTimeout: 120_000 });

const ids = (...numbers: number[]) =>
  numbers
    .map((number) => `005-os-shell-FR-${String(number).padStart(3, '0')}`)
    .sort()
    .join(' ');

// The contract's rows, as selectors. The icons are one row: every shell
// icon is an `svg` carrying FR-044.
const SHARED: [string, string][] = [
  ['div.no-script', ids(49)],
  ['#os', ids(1, 2, 4)],
  ['div[role="status"]', ids(41)],
  ['div.cv-app', ids(6, 8, 9)],
  ['div.cv-app > .app-bar a.standalone, div.cv-app a.standalone[href="/cv"]', ids(7)],
  ['#os svg[data-req]', ids(44)],
];

const DESKTOP: [string, string][] = [
  ['div.desktop', ids(5, 10, 24, 25, 37)],
  ['div.menu-bar[role="menubar"]', ids(13, 39, 66)],
  ['#menu-site', ids(13, 15)],
  ['#menu-app', ids(14, 15, 27, 62, 63, 65)],
  ['#menu-window', ids(14, 25, 26, 29, 64)],
  ['section.window', ids(17, 18, 21, 30, 39, 67, 69, 70, 71)],
  ['div.title-bar', ids(16, 19)],
  ['div.window-title', ids(40)],
  ['button.control-close', ids(16, 23, 28)],
  ['button.control-minimize', ids(63)],
  ['button.control-maximize', ids(65)],
  ['div.window-content', ids(22)],
  ['div.resize-handles', ids(61)],
  ['div.pad[role="group"]', ids(20, 27, 62)],
  ['div.dock[role="toolbar"]', ids(3, 39, 68)],
  ['div.dock-lens', ids(68)],
  ['button.dock-item', ids(11, 12, 64)],
  ['div.about-view', ids(38)],
  ['div.about-shortcuts', ids(29)],
];

const MOBILE: [string, string][] = [
  ['div.mobile', ids(31, 36, 37)],
  ['section.home', ids(31, 35, 39, 66)],
  ['ul.app-grid', ids(3)],
  ['button.app-icon', ids(32)],
  ['section.home button.about', ids(38)],
  ['section.full-screen', ids(32, 34)],
  ['button.home-button', ids(33, 34)],
  ['div.app-title', ids(40)],
  ['div.view-content', ids(34)],
];

type Marked = { html: string; value: string };

// Each element with a 005 ID, and which of them the targets match. The
// open menu is read on its own, as only one shows at a time.
async function expectTargets(page: Page, targets: [string, string][], seen: Map<string, Marked>): Promise<void> {
  const found: Marked[] = await page.evaluate(() =>
    [...document.querySelectorAll('[data-req*="005-os-shell-"]')].map((element) => ({
      html: `${element.outerHTML.slice(0, 90)}`,
      value: (element.getAttribute('data-req') ?? '').split(/\s+/).filter((id) => id.startsWith('005-')).sort().join(' '),
    })),
  );
  const matched = new Set<number>();
  for (const [selector, expected] of targets) {
    const indexes: number[] = await page.evaluate((query) => {
      const all = [...document.querySelectorAll('[data-req*="005-os-shell-"]')];
      return [...document.querySelectorAll(query)].map((element) => all.indexOf(element));
    }, selector);
    if (indexes.length === 0) continue;
    seen.set(selector, { html: '', value: expected });
    for (const index of indexes) {
      expect(index, `${selector} has no 005 data-req`).toBeGreaterThanOrEqual(0);
      expect(found[index]!.value, selector).toBe(expected);
      matched.add(index);
    }
  }
  expect(found.filter((_, index) => !matched.has(index)).map((entry) => entry.html)).toEqual([]);
}

const spec = fs.readFileSync(path.join(REPO_ROOT, 'specs/005-os-shell/spec.md'), 'utf8');
const REQUIREMENTS = new Set([...spec.matchAll(/^- \*\*(FR-\d{3})\*\*/gm)].map((match) => `005-os-shell-${match[1]}`));

describe('005-os-shell-FR-055: every target in the shell carries its requirement IDs', () => {
  test('desktop with two windows, each menu and the pad, and mobile with an app open', async () => {
    const seen = new Map<string, Marked>();
    const desktop = await openShell({ width: 1440, height: 900, platform: 'Windows' });
    await desktop.click('#menu-title-site');
    await desktop.getByRole('menuitem', { name: 'About this site' }).click();
    await desktop.locator('#os .window[data-view="about"]').waitFor();
    await settle(desktop);
    for (const menu of ['site', 'app', 'window']) {
      await desktop.click(`#menu-title-${menu}`);
      await settle(desktop);
      await expectTargets(desktop, [...SHARED, ...DESKTOP], seen);
      await desktop.keyboard.press('Escape');
    }
    await press(desktop, 'Alt+Shift+P');
    await desktop.locator('#os .pad').waitFor();
    await expectTargets(desktop, [...SHARED, ...DESKTOP], seen);

    const phone = await openShell({ width: 375, height: 812, hasTouch: true });
    await phone.locator('#os .app-icon[data-view="cv"]').tap();
    await phone.locator('#os .full-screen[data-view="cv"]').waitFor();
    await settle(phone);
    await expectTargets(phone, [...SHARED, ...MOBILE], seen);

    // Every row was found in one state or another.
    expect([...SHARED, ...DESKTOP, ...MOBILE].map(([selector]) => selector).filter((selector) => !seen.has(selector))).toEqual([]);
  });

  test('every 005 ID in a data-req, in the source and the rendered root, names a requirement of the spec', async () => {
    expect(REQUIREMENTS.size).toBe(71);
    const source: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(file);
        else if (/\.tsx?$/.test(entry.name)) source.push(...[...fs.readFileSync(file, 'utf8').matchAll(/005-os-shell-FR-\d{3}/g)].map((match) => match[0]));
      }
    };
    walk(path.join(REPO_ROOT, 'packages/web/src'));
    expect(source.length).toBeGreaterThan(0);
    expect([...new Set(source)].filter((id) => !REQUIREMENTS.has(id))).toEqual([]);
    const page = await openShell({ width: 1440, height: 900 });
    const rendered: string[] = await page.evaluate(() => [...document.querySelectorAll('[data-req]')].flatMap((element) => (element.getAttribute('data-req') ?? '').split(/\s+/)).filter((id) => id.startsWith('005-')));
    expect(rendered.filter((id) => !REQUIREMENTS.has(id))).toEqual([]);
  });
});
