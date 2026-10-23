// The stored copy (research R4, R21, contracts/site.md Service worker). One
// server, at one address, serves each version of the site in turn: the real
// build (A), a copy with one text changed (B), and a copy with another text
// changed whose first font file answers 500 (C). It can also drop every
// connection, or hold every request for 5 seconds. Pages are checked with
// the site check's own readers: every shown field of the CV document, the
// style sheet applied, and text drawn in served fonts.
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { describe, expect, onTestFinished, test, vi } from 'vitest';
import type { BrowserContext, Page } from 'playwright';
import { resume } from '@cv/content';
import type { Resume } from '@cv/content';
import fonts from '../src/fonts/fonts.json' with { type: 'json' };
import { expectedFields } from '../../../tools/site-check/src/expected.ts';
import type { ExpectedField } from '../../../tools/site-check/src/expected.ts';
import { unservedFonts } from '../../../tools/site-check/src/parts/fonts.ts';
import { fieldProblems, mainSequence, unstyledDetail } from '../../../tools/site-check/src/parts/no-script.ts';
import { waitForWorker } from '../../../tools/site-check/src/parts/offline.ts';
import { startServer } from '../../../tools/site-check/src/server.ts';
import type { RunningServer } from '../../../tools/site-check/src/server.ts';
import { openHtml, openPage } from './helpers/browser.ts';
import type { OpenPageOptions } from './helpers/browser.ts';
import { builtSite, fixtureSite } from './helpers/site.ts';
import type { BuiltSite } from './helpers/site.ts';

vi.setConfig({ testTimeout: 180_000 });

const FAMILIES = fonts.families.map((entry) => entry.family);

// How long the slow server holds each request, and how long a test waits
// for the browser to finish installing a new worker.
const HANG_MS = 5_000;

const INSTALL_WAIT_MS = 20_000;

type Mode = 'normal' | 'drop' | 'hang';

type SwitchableServer = {
  url: string;
  // Serves `site` from now on, at the same address.
  serve: (site: BuiltSite) => Promise<void>;
  setMode: (mode: Mode) => void;
  // Paths answered with a 500 from now on.
  fail: (pathname: string) => void;
  // Every path requested so far, in order.
  requested: string[];
  close: () => Promise<void>;
};

// A front server whose files can be switched: it passes each request to the
// local server of the current version. Closed when the current test
// finishes.
async function switchableServer(): Promise<SwitchableServer> {
  let backend: RunningServer | undefined;
  let mode: Mode = 'normal';
  const failing = new Set<string>();
  const requested: string[] = [];
  const timers = new Set<NodeJS.Timeout>();

  const forward = (request: http.IncomingMessage, response: http.ServerResponse) => {
    if (backend === undefined) {
      response.writeHead(503).end();
      return;
    }
    const target = new URL(request.url ?? '/', backend.url);
    const upstream = http.request(target, { method: request.method, headers: request.headers }, (answer) => {
      response.writeHead(answer.statusCode ?? 502, answer.headers);
      answer.pipe(response);
    });
    upstream.on('error', () => response.destroy());
    request.pipe(upstream);
  };

  const front = http.createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    requested.push(pathname);
    if (mode === 'drop') {
      request.socket.destroy();
      return;
    }
    if (failing.has(pathname)) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' }).end('failed\n');
      return;
    }
    if (mode === 'hang') {
      const timer = setTimeout(() => {
        timers.delete(timer);
        forward(request, response);
      }, HANG_MS);
      timers.add(timer);
      return;
    }
    forward(request, response);
  });
  await new Promise<void>((resolve) => front.listen(0, '127.0.0.1', resolve));
  const { port } = front.address() as AddressInfo;

  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    for (const timer of timers) clearTimeout(timer);
    await new Promise<void>((resolve) => {
      front.close(() => resolve());
      front.closeAllConnections();
    });
    await backend?.close();
  };
  onTestFinished(close);

  return {
    url: `http://127.0.0.1:${port}`,
    serve: async (site) => {
      const previous = backend;
      backend = await startServer({ siteDir: site.dir, manifest: site.manifest });
      await previous?.close();
    },
    setMode: (next) => {
      mode = next;
    },
    fail: (pathname) => failing.add(pathname),
    requested,
    close,
  };
}

// A copy of the site with the CV's name changed, removed when the current
// test finishes.
function version(name: string): { site: BuiltSite; cv: Resume } {
  const cv: Resume = structuredClone(resume);
  cv.basics = { ...cv.basics, name };
  const { remove, ...site } = fixtureSite(cv);
  onTestFinished(remove);
  return { site, cv };
}

// A page at `url`, in a context of its own, once the page has loaded.
// Listeners can be added to the context before it navigates.
async function firstPage(url: string, options: Partial<OpenPageOptions> = {}, before?: (context: BrowserContext) => void): Promise<Page> {
  const page = await openPage('about:blank', { width: 375, ...options });
  before?.(page.context());
  await page.goto(url, { waitUntil: 'load' });
  return page;
}

async function visit(context: BrowserContext, url: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'load' });
  return page;
}

// Empties the browser's HTTP cache, so only the worker's stored copy can
// answer, and sets the context offline.
async function goOffline(context: BrowserContext): Promise<void> {
  const page = context.pages()[0] ?? (await context.newPage());
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.clearBrowserCache');
  await cdp.detach();
  await context.setOffline(true);
}

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

const cacheNames = (page: Page) => page.evaluate(() => caches.keys());

// Polls `test` until it holds or `ms` pass.
async function until(test: () => Promise<boolean>, ms = INSTALL_WAIT_MS): Promise<boolean> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await test()) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return test();
}

// Whether the registration is settled: no worker installing or waiting.
const settled = (page: Page) =>
  page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration !== undefined && registration.installing === null && registration.waiting === null && registration.active !== null;
  });

// Every page, opened offline, shows what it shows online. The root
// redirects to /cv keeping its query string, as the server does.
async function expectOfflineCopy(context: BrowserContext, url: string, fields: readonly ExpectedField[], notFoundText: string): Promise<void> {
  for (const target of ['/cv', '/cv/', '/cv?utm_source=x', '/', '/?utm_source=x']) {
    const page = await visit(context, `${url}${target}`);
    const shown = new URL(page.url());
    if (target.startsWith('/?') || target === '/') expect(`${shown.pathname}${shown.search}`, target).toBe(`/cv${target.slice(1)}`);
    expect(await cvPageProblems(page, fields), target).toEqual([]);
  }
  const page = await visit(context, `${url}/nope`);
  expect(await notFoundProblems(page, notFoundText), '/nope').toEqual([]);
}

describe('004-cv-page-FR-038: after one visit, every page opens with no network', () => {
  const fields = expectedFields(resume);

  test('after one visit to /cv, with the server stopped, /cv, /cv/, /cv with a query, / with and without a query and an unknown path show their full pages', async () => {
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
    expect(new URL(page.url()).pathname).toBe('/cv');
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
    // stored copy.
    await server.serve(b.site);
    const second = await visit(context, `${server.url}/cv`);
    expect(await second.locator('h1').textContent()).toBe('Version Bee Name');
    expect(await until(async () => {
      const names = await cacheNames(second);
      return names.length === 1 && names[0] !== storedA;
    })).toBe(true);
    const [storedB] = await cacheNames(second);

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
    expect(await until(async () => {
      const names = await cacheNames(second);
      return names.length === 1 && names[0] !== storedA;
    })).toBe(true);
    expect(await bodyHtml(second)).toBe(loaded);
    expect(await bodyHtml(first)).toBe(before);
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
