// The stored copy (research R4, R21, contracts/site.md Service worker). One
// server, at one address, serves each version of the site in turn: the real
// build (A), a copy with one text changed (B), and a copy with another text
// changed whose first font file answers 500 (C). It can also drop every
// connection, or hold every request for 5 seconds. Pages are checked with
// the site check's own readers: every shown field of the CV document, the
// style sheet applied, and text drawn in served fonts.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { BrowserContext, Page } from 'playwright';
import { resume } from '@cv/content';
import fonts from '../src/fonts/fonts.json' with { type: 'json' };
import { expectedFields } from '../../../tools/site-check/src/expected.ts';
import type { ExpectedField } from '../../../tools/site-check/src/expected.ts';
import { unservedFonts } from '../../../tools/site-check/src/parts/fonts.ts';
import { fieldProblems, mainSequence, unstyledDetail } from '../../../tools/site-check/src/parts/no-script.ts';
import { waitForWorker } from '../../../tools/site-check/src/parts/offline.ts';
import { openHtml } from './helpers/browser.ts';
import { HANG_MS, cacheNames, firstPage, goOffline, keptRecord, settled, switchableServer, until, version, visit } from './helpers/offline.ts';
import { builtSite } from './helpers/site.ts';
import type { BuiltSite } from './helpers/site.ts';

vi.setConfig({ testTimeout: 180_000 });

const FAMILIES = fonts.families.map((entry) => entry.family);

const mainText = (page: Page) => page.evaluate(() => (document.querySelector('main')?.textContent ?? '').replace(/\s+/g, ' ').trim());

// What's wrong with a CV page: missing fields, no styles, or text drawn in
// a font the site doesn't serve.
async function cvPageProblems(page: Page, fields: readonly ExpectedField[]): Promise<string[]> {
  const problems = fieldProblems(await mainSequence(page), fields, '').map(({ type, subject }) => `${type} ${subject}`);
  const unstyled = await unstyledDetail(page);
  if (unstyled !== null) problems.push(`unstyled: ${unstyled}`);
  for (const { selector, family, drawnIn } of await unservedFonts(page, FAMILIES)) problems.push(`${selector} in ${drawnIn}, not ${family}`);
  return problems;
}

async function notFoundProblems(page: Page, expectedText: string): Promise<string[]> {
  const problems: string[] = [];
  if ((await mainText(page)) !== expectedText) problems.push(`main text: ${await mainText(page)}`);
  const unstyled = await unstyledDetail(page);
  if (unstyled !== null) problems.push(`unstyled: ${unstyled}`);
  for (const { selector, family, drawnIn } of await unservedFonts(page, FAMILIES)) problems.push(`${selector} in ${drawnIn}, not ${family}`);
  return problems;
}

// The not-found page's main text, read from the built file.
async function builtNotFoundText(site: BuiltSite): Promise<string> {
  const page = await openHtml(fs.readFileSync(path.join(site.dir, site.manifest.routes.notFound.file), 'utf8'));
  return mainText(page);
}

// Every page but the root, opened offline, shows what it shows online. The
// root is the shell, and 005's shell/offline.test.ts covers it.
async function expectOfflineCopy(context: BrowserContext, url: string, fields: readonly ExpectedField[], notFoundText: string): Promise<void> {
  for (const target of ['/cv', '/cv/', '/cv?utm_source=x']) {
    const page = await visit(context, `${url}${target}`);
    expect(await cvPageProblems(page, fields), target).toEqual([]);
  }
  const page = await visit(context, `${url}/nope`);
  expect(await notFoundProblems(page, notFoundText), '/nope').toEqual([]);
}

describe('004-cv-page-FR-059: after one visit, /cv and unknown paths open with no network', () => {
  const fields = expectedFields(resume);

  test('after one visit to /cv, with the server stopped, /cv, /cv/, /cv with a query and an unknown path show their full pages', async () => {
    const site = builtSite();
    const notFoundText = await builtNotFoundText(site);
    const server = await switchableServer();
    await server.serve(site);
    const page = await firstPage(`${server.url}/cv`);
    expect(await waitForWorker(page)).toBe(true);
    await server.close();
    await goOffline(page.context());
    await expectOfflineCopy(page.context(), server.url, fields, notFoundText);
  });

  test('after one visit to / only, the same pages open with no network', async () => {
    const site = builtSite();
    const notFoundText = await builtNotFoundText(site);
    const server = await switchableServer();
    await server.serve(site);
    const page = await firstPage(`${server.url}/`);
    expect(await waitForWorker(page)).toBe(true);
    await server.close();
    await goOffline(page.context());
    await expectOfflineCopy(page.context(), server.url, fields, notFoundText);
  });
});

describe('004-cv-page-FR-039: a new version shows on the next visit and replaces the stored copy whole', () => {
  test('B replaces A on the next online visit; C, whose font fails to download, leaves B stored whole', async () => {
    const original = resume.basics?.name ?? '';
    expect(original).not.toBe('');
    const b = version('Version Bee Name');
    const c = version('Version Sea Name');
    const server = await switchableServer();

    // A, stored.
    await server.serve(builtSite());
    const first = await firstPage(`${server.url}/cv`);
    const context = first.context();
    expect(await waitForWorker(first)).toBe(true);
    const [storedA, ...othersA] = await cacheNames(first);
    expect(othersA).toEqual([]);

    // B, published: the next visit shows it, and its worker replaces A's
    // stored copy once the pages open at its activation have closed (006
    // research R35).
    await server.serve(b.site);
    const second = await visit(context, `${server.url}/cv`);
    expect(await second.locator('h1').textContent()).toBe('Version Bee Name');
    expect(await until(async () => (await cacheNames(second)).some((name) => name !== storedA))).toBe(true);
    expect(await until(async () => (await keptRecord(second)) !== null)).toBe(true);
    await first.close();
    await second.close();
    const later = await visit(context, `${server.url}/cv`);
    expect(await until(async () => {
      const names = await cacheNames(later);
      return names.length === 1 && names[0] !== storedA;
    })).toBe(true);
    const [storedB] = await cacheNames(later);

    await goOffline(context);
    const offlineB = await visit(context, `${server.url}/cv`);
    expect(await cvPageProblems(offlineB, expectedFields(b.cv))).toEqual([]);
    expect(await mainText(offlineB)).not.toContain(original);

    // C, published, with a font answering 500: the visit shows C from the
    // network, its worker fails to install, and B stays stored whole.
    await context.setOffline(false);
    const font = c.site.manifest.files.find((file) => file.type === 'font/woff2');
    if (font === undefined) throw new Error('the build has no font file');
    server.fail(font.path);
    await server.serve(c.site);
    const third = await visit(context, `${server.url}/cv`);
    expect(await third.locator('h1').textContent()).toBe('Version Sea Name');
    expect(await until(async () => server.requested.includes(font.path))).toBe(true);
    expect(await until(() => settled(third))).toBe(true);
    expect(await cacheNames(third)).toEqual([storedB]);

    await goOffline(context);
    const offlineC = await visit(context, `${server.url}/cv`);
    expect(await cvPageProblems(offlineC, expectedFields(b.cv))).toEqual([]);
    expect(await mainText(offlineC)).not.toContain('Version Sea Name');
  });
});

describe('004-cv-page-FR-040: with a stored copy, a failing or silent network shows the stored copy', () => {
  test('a server that drops the connection, and one that does not answer for 5 s, both give the stored /cv', async () => {
    const fields = expectedFields(resume);
    const server = await switchableServer();
    await server.serve(builtSite());
    const first = await firstPage(`${server.url}/cv`);
    const context = first.context();
    expect(await waitForWorker(first)).toBe(true);

    const cdp = await context.newCDPSession(first);
    await cdp.send('Network.clearBrowserCache');
    await cdp.detach();

    server.setMode('drop');
    const dropped = await visit(context, `${server.url}/cv`);
    expect(await cvPageProblems(dropped, fields), 'dropped').toEqual([]);

    server.setMode('hang');
    const started = Date.now();
    const slow = await visit(context, `${server.url}/cv`);
    expect(Date.now() - started).toBeLessThan(HANG_MS);
    expect(await cvPageProblems(slow, fields), 'slow').toEqual([]);
  });
});

describe('004-cv-page-FR-041: offline support adds no step, prompt or error', () => {
  // Dialogs, console errors and uncaught errors from the pages and the
  // worker of a context.
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
    context.on('serviceworker', (worker) =>
      worker.on('console', (message) => {
        if (message.type() === 'error') seen.push(`worker console: ${message.text()}`);
      }),
    );
    return seen;
  }

  const bodyHtml = (page: Page) => page.evaluate(() => document.body.innerHTML);

  test('installing and updating the worker shows no dialog, banner or console error, and declares no web app manifest', async () => {
    const b = version('Version Bee Name');
    const server = await switchableServer();
    await server.serve(builtSite());
    let seen: string[] = [];
    const first = await firstPage(`${server.url}/cv`, {}, (context) => {
      seen = watch(context);
    });
    const context = first.context();
    const before = await bodyHtml(first);
    expect(await waitForWorker(first)).toBe(true);
    expect(await bodyHtml(first)).toBe(before);
    expect(await first.locator('link[rel="manifest"]').count()).toBe(0);
    const [storedA] = await cacheNames(first);

    await server.serve(b.site);
    const second = await visit(context, `${server.url}/cv`);
    const loaded = await bodyHtml(second);
    expect(await until(async () => (await cacheNames(second)).some((name) => name !== storedA))).toBe(true);
    expect(await bodyHtml(second)).toBe(loaded);
    expect(await bodyHtml(first)).toBe(before);
    // A's copy goes once the pages open at B's activation close (006
    // research R35).
    expect(await until(async () => (await keptRecord(second)) !== null)).toBe(true);
    await first.close();
    await second.close();
    const later = await visit(context, `${server.url}/cv`);
    expect(await until(async () => {
      const names = await cacheNames(later);
      return names.length === 1 && names[0] !== storedA;
    })).toBe(true);
    expect(seen).toEqual([]);
  });

  test('with service workers blocked, /cv loads in full with no console error', async () => {
    const server = await switchableServer();
    await server.serve(builtSite());
    let seen: string[] = [];
    const page = await firstPage(`${server.url}/cv`, { serviceWorkers: 'block' }, (context) => {
      seen = watch(context);
    });
    // The registration runs after `load`: give it time to fail.
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 1_000)));
    expect(await cvPageProblems(page, expectedFields(resume))).toEqual([]);
    expect(await page.evaluate(async () => ('serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0))).toBe(0);
    expect(seen).toEqual([]);
  });
});

describe('006-terminal-FR-070: a page from an older version still loads its shell (research R35)', () => {
  async function openTerminalIn(page: Page): Promise<string> {
    await page.locator('#os .dock-item[data-app="terminal"]').click();
    await page.waitForSelector('.terminal:is([data-shell-state="ready"], [data-shell-state="failed"])');
    const state = (await page.locator('.terminal').getAttribute('data-shell-state'))!;
    if (state === 'ready') {
      await page.locator('.terminal input.command-line').fill('echo hi');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('.terminal section.run[aria-busy="true"]') === null && document.querySelectorAll('.terminal section.run').length > 0);
    }
    return state;
  }

  test('with pages from A open, B activates; they open the Terminal online and offline; A’s cache goes once they close', async () => {
    const b = version('Version Bee Name');
    const server = await switchableServer();
    await server.serve(builtSite());
    const first = await firstPage(`${server.url}/`, { width: 1440, height: 900 });
    const context = first.context();
    expect(await waitForWorker(first)).toBe(true);
    const [storedA] = await cacheNames(first);
    const second = await visit(context, `${server.url}/`);

    // B, published, found by A's page checking for an update.
    await server.serve(b.site);
    await first.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
    expect(await until(async () => (await keptRecord(first)) !== null)).toBe(true);
    const names = await cacheNames(first);
    expect(names).toHaveLength(2);
    expect(names).toContain(storedA);

    // A's pages still load their own shell, online and offline.
    expect(await openTerminalIn(first)).toBe('ready');
    expect(await first.locator('.terminal section.run').last().locator('p.out-line').allTextContents()).toEqual(['hi']);
    await goOffline(context);
    expect(await openTerminalIn(second)).toBe('ready');

    // Every cache is one complete version: A's holds A's files, B's B's and
    // its record.
    const files = (site: BuiltSite) => site.manifest.files.filter((file) => file.path !== '/sw.js').length;
    const sizes = await first.evaluate(async () => Object.fromEntries(await Promise.all((await caches.keys()).map(async (name) => [name, (await (await caches.open(name)).keys()).length] as const))));
    expect(sizes[storedA!]).toBe(files(builtSite()));
    expect(sizes[names.find((name) => name !== storedA)!]).toBe(files(b.site) + 1);

    // Once they close, the next request deletes A's cache.
    await first.close();
    await second.close();
    await context.setOffline(false);
    const after = await visit(context, `${server.url}/`);
    expect(await until(async () => {
      const left = await cacheNames(after);
      return left.length === 1 && left[0] !== storedA;
    })).toBe(true);
    await server.close();
  });

  test('with no page open, B’s activation deletes A’s cache at once', async () => {
    const b = version('Version Bee Name');
    const server = await switchableServer();
    await server.serve(builtSite());
    const first = await firstPage(`${server.url}/`);
    const context = first.context();
    expect(await waitForWorker(first)).toBe(true);
    const [storedA] = await cacheNames(first);
    await server.serve(b.site);
    await first.evaluate(() => void navigator.serviceWorker.getRegistration().then((registration) => registration?.update()));
    await first.close();
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    const later = await visit(context, `${server.url}/`);
    const left = await cacheNames(later);
    expect(left).toHaveLength(1);
    expect(left[0]).not.toBe(storedA);
    await server.close();
  });
});
