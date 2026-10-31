// The shell offline and through updates (005 contracts/site.md Service
// worker, research R14). As in 004's offline tests, one server at one
// address serves each version in turn, and pages are checked with the site
// check's readers: every field of the CV document in order, and text drawn
// in the site's fonts.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { BrowserContext, Page } from 'playwright';
import { resume } from '@cv/content';
import fonts from '../../src/fonts/fonts.json' with { type: 'json' };
import { expectedFields } from '../../../../tools/site-check/src/expected.ts';
import type { ExpectedField } from '../../../../tools/site-check/src/expected.ts';
import { unservedFonts } from '../../../../tools/site-check/src/parts/fonts.ts';
import { fieldProblems, mainSequence } from '../../../../tools/site-check/src/parts/no-script.ts';
import { waitForWorker } from '../../../../tools/site-check/src/parts/offline.ts';
import { buildCopy, repoCopy } from '../helpers/copy.ts';
import { cacheNames, firstPage, goOffline, keptRecord, switchableServer, until } from '../helpers/offline.ts';
import { builtSite } from '../helpers/site.ts';
import type { BuiltSite } from '../helpers/site.ts';
import { settle, waitForReady } from '../helpers/shell.ts';

vi.setConfig({ testTimeout: 240_000 });

const FAMILIES = fonts.families.map((entry) => entry.family);

const SIZES = [
  { shell: 'mobile', width: 375, height: 812 },
  { shell: 'desktop', width: 1440, height: 900 },
] as const;

// `/` in a new page of the context, at a size, once hydrated.
async function openRoot(context: BrowserContext, url: string, size: { width: number; height: number }): Promise<Page> {
  const page = await context.newPage();
  await page.setViewportSize(size);
  await page.goto(`${url}/`, { waitUntil: 'load' });
  await waitForReady(page);
  return page;
}

// Opens the CV app: on the phone from its icon; on the desktop the window
// is open from the first load.
async function openCvApp(page: Page, shell: 'mobile' | 'desktop'): Promise<void> {
  if (shell === 'mobile') {
    await page.locator('#os .app-icon[data-view="cv"]').click();
    await page.locator('#os .full-screen[data-view="cv"] .cv').waitFor();
  } else {
    await page.locator('#os .window[data-view="cv"] .cv').waitFor();
  }
  await settle(page);
}

// What's missing from the shell: its icons, and its wallpaper, which only
// the shell's style sheet draws.
function shellProblems(page: Page, shell: 'mobile' | 'desktop'): Promise<string[]> {
  return page.evaluate((name) => {
    const found: string[] = [];
    if (document.documentElement.getAttribute('data-shell') !== name) found.push(`data-shell is ${document.documentElement.getAttribute('data-shell')}`);
    const icons = [...document.querySelectorAll(name === 'mobile' ? '#os .app-icon svg' : '#os .dock-icon svg')];
    if (icons.length === 0 || icons.some((icon) => icon.getBoundingClientRect().width === 0)) found.push('icons missing');
    const wallpaper = document.querySelector(name === 'mobile' ? '#os .home' : '#os .desktop');
    if (wallpaper === null || getComputedStyle(wallpaper).backgroundImage === 'none') found.push('no wallpaper');
    return found;
  }, shell);
}

const CV_APP = { mobile: '#os .full-screen[data-view="cv"] .cv', desktop: '#os .window[data-view="cv"] .cv' } as const;

async function cvAppProblems(page: Page, shell: 'mobile' | 'desktop', fields: readonly ExpectedField[]): Promise<string[]> {
  const problems = fieldProblems(await mainSequence(page, CV_APP[shell]), fields, '').map(({ type, subject }) => `${type} ${subject}`);
  for (const { selector, family, drawnIn } of await unservedFonts(page, FAMILIES)) problems.push(`${selector} in ${drawnIn}, not ${family}`);
  return problems;
}

// A version of the whole site with the CV's name changed: the shell's page
// and script read the CV at build time, so it is a build of a copy of the
// repository.
function shellVersion(name: string): BuiltSite {
  const cv = structuredClone(resume);
  cv.basics = { ...cv.basics, name };
  const root = repoCopy();
  fs.writeFileSync(path.join(root, 'packages/content/resume.json'), `${JSON.stringify(cv, null, 2)}\n`);
  const build = buildCopy(root);
  if (build.site === null) throw new Error(`the copy's build failed:\n${build.stderr}`);
  return build.site;
}

// Console errors, uncaught errors and dialogs from a context's pages.
function watch(context: BrowserContext): string[] {
  const seen: string[] = [];
  context.on('dialog', (dialog) => {
    seen.push(`dialog: ${dialog.message()}`);
    void dialog.dismiss();
  });
  context.on('console', (message) => {
    if (message.type() === 'error') seen.push(`console: ${message.text()}`);
  });
  context.on('weberror', (error) => seen.push(`error: ${error.error().message}`));
  return seen;
}

describe('005-os-shell-FR-052: after one visit to / or /cv, the shell and the CV app open offline', () => {
  const fields = expectedFields(resume);
  for (const first of ['/', '/cv']) {
    test(`after one visit to ${first} only, / opens offline in both shells with the CV app complete, in the site's fonts`, async () => {
      const server = await switchableServer();
      await server.serve(builtSite());
      const page = await firstPage(`${server.url}${first}`);
      expect(await waitForWorker(page)).toBe(true);
      await server.close();
      await goOffline(page.context());
      for (const { shell, width, height } of SIZES) {
        const root = await openRoot(page.context(), server.url, { width, height });
        expect(await shellProblems(root, shell), shell).toEqual([]);
        await openCvApp(root, shell);
        expect(await cvAppProblems(root, shell, fields), shell).toEqual([]);
        const failed = await root.evaluate(async () => {
          await document.fonts.ready;
          return [...document.fonts].filter((face) => face.status === 'error').map((face) => `${face.family} ${face.weight} ${face.style}`);
        });
        expect(failed, shell).toEqual([]);
        await root.close();
      }
    });
  }
});

describe('005-os-shell-FR-053: an update never interrupts an open shell, and the next visit shows it', () => {
  test('with A open and B installed, nothing reloads, the CV window stays open, a font first used after it loads, and the next visit shows B', async () => {
    const original = resume.basics?.name ?? '';
    const b = shellVersion('Version Bee Name');
    const server = await switchableServer();
    await server.serve(builtSite());
    const a = await firstPage(`${server.url}/`, { width: 1440, height: 900 });
    const context = a.context();
    await waitForReady(a);
    expect(await waitForWorker(a)).toBe(true);
    const [storedA] = await cacheNames(a);
    await a.evaluate(() => {
      (window as Window & { stillHere?: boolean }).stillHere = true;
    });

    // B, published and installed by a visit in another tab. With A open at
    // B's activation, A's cache stays beside B's (006 research R35).
    await server.serve(b);
    const other = await context.newPage();
    await other.goto(`${server.url}/cv`, { waitUntil: 'load' });
    expect(await until(async () => (await keptRecord(other)) !== null)).toBe(true);
    const names = await cacheNames(other);
    expect(names).toHaveLength(2);
    expect(names).toContain(storedA);
    await other.close();

    // A is still the page it was, with the CV window open.
    expect(await a.evaluate(() => (window as Window & { stillHere?: boolean }).stillHere)).toBe(true);
    expect(await a.locator('#os .window[data-view="cv"]').getAttribute('aria-current')).toBe('true');
    expect(await a.locator('#os .window[data-view="cv"] .cv h1').textContent()).toBe(original);

    // Every font face A declares, used for the first time now, with the
    // network failing: each still loads.
    server.setMode('drop');
    await a.locator('#menu-title-site').click();
    await a.getByRole('menuitem', { name: 'About this site' }).click();
    await a.locator('#os .window[data-view="about"]').waitFor();
    const faces = await a.evaluate(async () => {
      const all = [...document.fonts];
      await Promise.all(all.map((face) => face.load().catch(() => undefined)));
      return all.map((face) => `${face.family} ${face.weight} ${face.style}: ${face.status}`);
    });
    expect(faces.length).toBeGreaterThan(0);
    expect(faces.filter((face) => !face.endsWith(': loaded'))).toEqual([]);
    expect(await unservedFonts(a, FAMILIES)).toEqual([]);

    // The next visit shows B.
    server.setMode('normal');
    const next = await context.newPage();
    await next.goto(`${server.url}/`, { waitUntil: 'load' });
    await waitForReady(next);
    expect(await next.locator('#os .window[data-view="cv"] .cv h1').textContent()).toBe('Version Bee Name');

    // Once A closes, the next visit leaves B's cache alone.
    await a.close();
    await next.close();
    const later = await context.newPage();
    await later.goto(`${server.url}/cv`, { waitUntil: 'load' });
    expect(
      await until(async () => {
        const left = await cacheNames(later);
        return left.length === 1 && left[0] !== storedA;
      }),
    ).toBe(true);
  });

  test('with service workers blocked, the shell works in both shells and shows no error', async () => {
    const server = await switchableServer();
    await server.serve(builtSite());
    let seen: string[] = [];
    const page = await firstPage(`${server.url}/`, { serviceWorkers: 'block' }, (context) => {
      seen = watch(context);
    });
    await waitForReady(page);
    // The registration runs after `load`: give it time to fail.
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 1_000)));
    for (const { shell, width, height } of SIZES) {
      const root = await openRoot(page.context(), server.url, { width, height });
      expect(await shellProblems(root, shell), shell).toEqual([]);
      await openCvApp(root, shell);
      expect(await cvAppProblems(root, shell, expectedFields(resume)), shell).toEqual([]);
    }
    expect(seen).toEqual([]);
  });
});
