// Research R17 and R24, verified first in implementation: the runner's frame
// (contracts/runner.md) on a fixture page, in the engine `PLAYGROUND_ENGINE`
// chooses (Chromium by default; `npm run test:engines` runs Firefox and
// WebKit). Structural: the runner's own tests cover the requirements.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import type { Page } from 'playwright';
import { openPage } from '../helpers/browser.ts';
import { startOtherSite } from '../helpers/other-site.ts';
import { engine } from '../helpers/playground.ts';

const PROBE = fs.readFileSync(path.join(import.meta.dirname, '__fixtures__/probe.html'), 'utf8');

// The memory case stops growing here and fails, so an engine with no limit
// below it can't take the test machine down with it.
const MEMORY_CAP_MB = 6144;

type RunState = { status: string | null; values: unknown[]; errors: string[]; cookie: string | null; sinceMessage: number; sincePong: number; loads: number };

// The fixture page, served as the site at 127.0.0.1.
async function openProbe(): Promise<{ page: Page; site: string }> {
  const site = await startOtherSite({ name: '127.0.0.1', pages: { '/probe.html': PROBE } });
  const page = await openPage(`${site.url}/probe.html`, { width: 1024, height: 768, engine: engine() });
  return { page, site: site.url };
}

const startRun = (page: Page, code: string) => page.evaluate((source) => (window as unknown as { startRun: (code: string) => Promise<number> }).startRun(source), code);

const runState = (page: Page, index: number) => page.evaluate((at) => (window as unknown as { runState: (index: number) => RunState }).runState(at), index);

async function firstValue(page: Page, index: number, timeout = 15_000): Promise<unknown> {
  await expect.poll(async () => (await runState(page, index)).values.length, { timeout }).toBeGreaterThan(0);
  return (await runState(page, index)).values[0];
}

// What a run finds of the site's storage, and leaves behind: the site's
// IndexedDB database and cache are never listed; a database the run makes
// is written to, for the next run to look for.
const STORAGE_PROBE = `async function main(send) {
  const result = { origin: String(self.origin), document: typeof document, window: typeof window };
  result.localStorage = typeof localStorage === 'undefined' ? 'missing' : 'present';
  try {
    result.databases = (await indexedDB.databases()).map((database) => database.name);
  } catch (error) {
    result.databases = 'throws: ' + error.name;
  }
  try {
    const request = indexedDB.open('probe', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('left');
    const database = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const stores = [...database.objectStoreNames];
    result.left = stores.includes('left') ? await new Promise((resolve) => {
      const read = database.transaction('left').objectStore('left').get('run');
      read.onsuccess = () => resolve(read.result ?? null);
      read.onerror = () => resolve(null);
    }) : null;
    await new Promise((resolve) => {
      const write = database.transaction('left', 'readwrite');
      write.objectStore('left').put('earlier run', 'run');
      write.oncomplete = resolve;
      write.onerror = resolve;
    });
    result.indexedDB = 'opened';
  } catch (error) {
    result.indexedDB = 'throws: ' + (error && error.name);
  }
  try {
    result.caches = await caches.keys();
  } catch (error) {
    result.caches = 'throws: ' + error.name;
  }
  send(result);
}`;

describe('the runner frame (research R17)', () => {
  test('the blob worker starts in the sandboxed frame, and the code gets none of the site\'s storage, cookies or page, and keeps nothing', { timeout: 60_000 }, async () => {
    const { page } = await openProbe();
    await page.context().addCookies([{ name: 'site', value: 'kept', domain: '127.0.0.1', path: '/' }]);
    // The site's own stored data, which no run may see.
    await page.evaluate(async () => {
      localStorage.setItem('site', 'kept');
      await (await caches.open('site-cache')).put('/kept', new Response('kept'));
      await new Promise((resolve) => {
        const request = indexedDB.open('site-data', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('kept');
        request.onsuccess = () => resolve(request.result.close());
      });
    });
    const first = await startRun(page, STORAGE_PROBE);
    const result = (await firstValue(page, first)) as Record<string, unknown>;
    expect((await runState(page, first)).status).toBe('started');
    expect(result['origin']).toBe('null');
    expect(result['document']).toBe('undefined');
    expect(result['window']).toBe('undefined');
    expect(result['localStorage']).toBe('missing');
    expect(JSON.stringify(result['databases'])).not.toContain('site-data');
    expect(JSON.stringify(result['caches'])).not.toContain('site-cache');
    expect(result['left'] ?? null).toBeNull();

    await page.evaluate((at) => (window as unknown as { askCookie: (index: number) => void }).askCookie(at), first);
    await expect.poll(async () => (await runState(page, first)).cookie).not.toBeNull();
    expect((await runState(page, first)).cookie).not.toContain('kept');

    // A new frame for the next run: nothing the first one stored is there.
    await page.evaluate((at) => (window as unknown as { stopRun: (index: number) => void }).stopRun(at), first);
    const second = await startRun(page, STORAGE_PROBE);
    expect(((await firstValue(page, second)) as Record<string, unknown>)['left'] ?? null).toBeNull();
  });

  test('a request to another site carries Origin null and no cookie, a request to the site\'s host none of its cookies, and importScripts fetches nothing', { timeout: 60_000 }, async () => {
    const { page } = await openProbe();
    const other = await startOtherSite();
    // Another origin on the site's own host, where the site's cookies apply.
    const sameHost = await startOtherSite({ name: '127.0.0.1' });
    await page.context().addCookies([
      { name: 'site', value: 'kept', domain: '127.0.0.1', path: '/' },
      { name: 'other', value: 'kept', domain: 'localhost', path: '/' },
    ]);
    const index = await startRun(
      page,
      `const OTHER = ${JSON.stringify(other.url)};
      const SAME_HOST = ${JSON.stringify(sameHost.url)};
      async function main(send) {
        const status = (request) => request.then((response) => response.status, (error) => 'failed: ' + error);
        const plain = await status(fetch(OTHER + '/data'));
        const credentials = await status(fetch(SAME_HOST + '/data', { credentials: 'include' }));
        let imported;
        try {
          importScripts(OTHER + '/script.js');
          imported = 'loaded';
        } catch (error) {
          imported = 'throws: ' + error.name;
        }
        let dynamic;
        try {
          await import(OTHER + '/module.js');
          dynamic = 'loaded';
        } catch (error) {
          dynamic = 'throws: ' + error.name;
        }
        send({ plain, credentials, imported, dynamic });
      }`,
    );
    const result = (await firstValue(page, index)) as Record<string, unknown>;
    expect(result['plain']).toBe(200);
    expect(result['imported']).not.toBe('loaded');
    expect(result['dynamic']).not.toBe('loaded');
    const data = other.requests.filter((request) => request.path.startsWith('/data'));
    expect(data).toHaveLength(1);
    expect(data[0]!.headers.origin).toBe('null');
    expect(data[0]!.headers.cookie).toBeUndefined();
    for (const request of sameHost.requests) {
      expect(request.headers.origin).toBe('null');
      expect(request.headers.cookie ?? '').not.toContain('site=kept');
    }
    expect(other.requests.filter((request) => /\/(?:script|module)\.js/.test(request.path))).toEqual([]);
  });
});

describe('a run that runs out of memory (research R24)', () => {
  test('code that grows memory until it fails ends only its run: the page answers within 100 ms, and a new frame runs', { timeout: 180_000 }, async () => {
    const { page } = await openProbe();
    let crashed = false;
    page.on('crash', () => (crashed = true));
    const index = await startRun(
      page,
      `async function main(send) {
        const kept = [];
        let mb = 0;
        for (;;) {
          const chunk = new Array(1 << 20);
          for (let i = 0; i < chunk.length; i += 1) chunk[i] = i + 0.5;
          kept.push(chunk);
          mb += 8;
          if (mb % 256 === 0) send({ mb });
          if (mb >= ${MEMORY_CAP_MB}) {
            send({ cap: mb });
            return;
          }
        }
      }`,
    );
    // The run is over when the code's error reached the page, the worker's
    // error event did, or the worker went quiet: no message for 5 s.
    const started = Date.now();
    let state = await runState(page, index);
    let reached = 0;
    while (Date.now() - started < 150_000) {
      await page.click('#answer');
      state = await runState(page, index);
      const last = state.values.at(-1) as { mb?: number; cap?: number; uncaught?: string } | undefined;
      reached = last?.mb ?? reached;
      if (last?.cap !== undefined) break;
      if (last?.uncaught !== undefined || state.errors.length > 0 || state.loads > 0 || (state.values.length > 0 && state.sinceMessage > 5_000)) break;
      await page.waitForTimeout(500);
    }
    expect(crashed, 'the page was lost').toBe(false);
    const last = state.values.at(-1) as { cap?: number } | undefined;
    expect(last?.cap, `the worker grew to ${MEMORY_CAP_MB} MB without failing`).toBeUndefined();
    expect(state.values.length, 'the worker never reported').toBeGreaterThan(0);
    expect(reached).toBeGreaterThan(0);

    const delays = await page.evaluate(() => (window as unknown as { delays: number[] }).delays);
    expect(delays.length).toBeGreaterThan(0);
    expect(Math.max(...delays), `click delays: ${delays.map(Math.round).join(', ')} ms`).toBeLessThan(100);

    await page.evaluate((at) => (window as unknown as { stopRun: (index: number) => void }).stopRun(at), index);
    const next = await startRun(page, 'async function main(send) { send(1 + 1); }');
    expect(await firstValue(page, next)).toBe(2);
  });
});
