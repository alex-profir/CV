// The sandbox (spec US2, SC-006), in the engine `PLAYGROUND_ENGINE` chooses
// (Chromium by default; `npm run test:engines` runs Firefox and WebKit): the
// code reads none of the site's storage, cookies, page or windows, can't
// open or navigate, and nothing it stores outlasts its run.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { openPlaygroundPage, readLogs, run, setCode, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

// What the code finds, logged as one JSON line.
const PROBE = `const seen: Record<string, unknown> = {};
const scope = globalThis as any;
for (const name of ["localStorage", "sessionStorage", "document", "window", "parent", "top", "opener", "open"]) seen[name] = typeof scope[name];
seen.location = String(location.href);
try {
  seen.caches = await caches.keys();
} catch (error) {
  seen.caches = "throws";
}
try {
  seen.databases = (await indexedDB.databases()).map((database) => database.name);
} catch (error) {
  seen.databases = "throws";
}
try {
  (location as any).href = "https://example.com/";
} catch (error) {
  // A worker's location can't be set.
}
seen.before = scope.saved ?? null;
scope.saved = "kept";
console.log(JSON.stringify(seen));`;

// The site's own storage and cookies, as the page sees them.
const siteStorage = (page: Page) =>
  page.evaluate(async () => ({
    local: Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)])),
    cookie: document.cookie,
    caches: (await caches.keys()).sort(),
  }));

async function probe(page: Page): Promise<Record<string, unknown>> {
  await run(page);
  const line = (await readLogs(page)).find((row) => row.level === 'log');
  return JSON.parse(line!.text) as Record<string, unknown>;
}

describe("008-typescript-playground-FR-039: the code runs apart from the site and reads none of its storage", () => {
  test("the code finds no storage, cookies, page or windows of the site's, and can't open or navigate", async () => {
    const page = await openPlaygroundPage();
    await page.evaluate(() => {
      document.cookie = 'site=kept; path=/';
      localStorage.setItem('site-key', 'site-value');
    });
    await setCode(page, PROBE);
    await waitForCode(page, PROBE.split('\n')[0]!);
    await waitChecked(page);
    const url = page.url();
    const before = await siteStorage(page);
    const seen = await probe(page);
    for (const name of ['localStorage', 'sessionStorage', 'document', 'window', 'parent', 'top', 'opener', 'open']) expect(seen[name], name).toBe('undefined');
    expect(String(seen['location']).startsWith(new URL(url).origin)).toBe(false);
    expect(seen['caches'] === 'throws' || (Array.isArray(seen['caches']) && seen['caches'].length === 0)).toBe(true);
    expect(seen['databases'] === 'throws' || (Array.isArray(seen['databases']) && seen['databases'].length === 0)).toBe(true);
    expect(page.url()).toBe(url);
    expect(await siteStorage(page)).toEqual(before);
  });

  test('a value stored in a run is gone in the next', async () => {
    const page = await openPlaygroundPage();
    await setCode(page, PROBE);
    await waitForCode(page, PROBE.split('\n')[0]!);
    await waitChecked(page);
    expect((await probe(page))['before']).toBeNull();
    expect((await probe(page))['before']).toBeNull();
  });
});
