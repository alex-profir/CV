// The sandbox (spec US2, SC-006), in the engine `PLAYGROUND_ENGINE` chooses
// (Chromium by default; `npm run test:engines` runs Firefox and WebKit): the
// code reads none of the site's storage, cookies, page or windows, can't
// open or navigate, and nothing it stores outlasts its run.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { siteText } from '../../src/site-text.ts';
import { openPlaygroundPage, PLAYGROUND, readLogs, run, setCode, waitChecked, waitForCode } from '../helpers/playground.ts';

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

// Code that reaches for the port and the nonce through the browser's own
// functions, then sends the page what would empty `#os` if it were believed.
const FORGE = `const seen: { nonce?: unknown; port?: MessagePort } = {};
const realPost = MessagePort.prototype.postMessage;
MessagePort.prototype.postMessage = function (this: MessagePort, message: any, ...rest: any[]) {
  if (message?.nonce !== undefined) { seen.nonce = message.nonce; seen.port = this; }
  return (realPost as any).call(this, message, ...rest);
};
const dataGetter = Object.getOwnPropertyDescriptor(MessageEvent.prototype, "data")!.get!;
Object.defineProperty(MessageEvent.prototype, "data", {
  get(this: MessageEvent) {
    const data = dataGetter.call(this);
    if (data?.nonce !== undefined) { seen.nonce = data.nonce; seen.port = this.target as MessagePort; }
    return data;
  },
});
await new Promise((resolve) => setTimeout(resolve, 700));
console.log(seen.nonce === undefined ? "no nonce" : "got the nonce");
seen.port?.postMessage({ nonce: seen.nonce, logs: true, entries: [{ id: 1, level: "log", values: [{ t: "arr" }] }] });`;

describe('008-typescript-playground-FR-040: code that tries to forge the runner\'s messages changes nothing outside the logs', () => {
  test('it gets neither the nonce nor the port; the dock, the CV window and the next run keep working', async () => {
    const page = await openPlaygroundPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await setCode(page, FORGE);
    await waitForCode(page, FORGE.split('\n')[0]!);
    await waitChecked(page);
    await run(page);
    expect((await readLogs(page)).find((row) => row.level === 'log')?.text).toBe('no nonce');
    expect(errors.filter((message) => message.includes('is not a function'))).toEqual([]);
    expect(await page.locator('#os button.dock-item[data-app=cv]').count()).toBeGreaterThan(0);
    await setCode(page, 'console.log("next");');
    await waitForCode(page, 'console.log("next");');
    await waitChecked(page);
    await run(page);
    expect((await readLogs(page)).some((row) => row.text === 'next')).toBe(true);
  });
});

describe('008-typescript-playground-FR-039: a failure while rendering stays in the Playground\'s window', () => {
  test('the window says so, the rest of the site stays, and Try again brings the Playground back', async () => {
    const page = await openPlaygroundPage();
    const code = 'for (let i = 0; i < 1100; i++) console.log(i);';
    await setCode(page, code);
    await waitForCode(page, code);
    await waitChecked(page);
    // The logs' "dropped" line reads this as it renders.
    await page.evaluate(() => {
      (window as unknown as { realGroup: unknown }).realGroup = Number.prototype.toLocaleString;
      Number.prototype.toLocaleString = () => {
        throw new Error('render failure');
      };
    });
    await run(page, { wait: 'none' });
    await page.waitForSelector(`${PLAYGROUND} [role="alert"]`);
    expect(await page.locator(`${PLAYGROUND} [role="alert"] h2`).textContent()).toBe(siteText.playground.failed.heading);
    expect(await page.locator('#os button.dock-item[data-app=cv]').count()).toBeGreaterThan(0);
    await page.evaluate(() => {
      Number.prototype.toLocaleString = (window as unknown as { realGroup: () => string }).realGroup;
    });
    await page.locator(`${PLAYGROUND} [role="alert"] button`).click();
    await page.waitForSelector(`${PLAYGROUND} .playground-editor`);
    expect(await page.locator(`${PLAYGROUND} [role="alert"]`).count()).toBe(0);
  });
});
