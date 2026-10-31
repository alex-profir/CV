// TypeScript's download (spec US1): its progress against the engine's real
// size, the editor only once it is complete, a closed window not losing it,
// and every later open, reload and offline reload served from the copy the
// browser keeps.
import { describe, expect, test, vi } from 'vitest';
import type { Page, Route } from 'playwright';
import { fill, siteText } from '../../src/site-text.ts';
import { megabytes } from '../../src/apps/playground/text.ts';
import { builtSite } from '../helpers/site.ts';
import { settle, waitForReady } from '../helpers/shell.ts';
import { EDITOR, engineManifest, freshProfile, holdEngine, LOADING, openPlayground, waitReady } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 240_000 });

const WINDOW = '#os .window[data-view="playground"]';
const PROGRESS = `${LOADING} progress.playground-progress`;

// Whether the engine's cache holds the marker that says its copy is complete.
function markerKept(page: Page, folder: string): Promise<boolean> {
  return page.evaluate(async (path) => {
    const hash = /\/playground\/([^/]+)$/.exec(path)![1];
    const cache = await caches.open(`playground-${hash}`);
    return (await cache.match(`${path}/complete`)) !== undefined;
  }, folder);
}

const engineFolder = () => {
  const manifest = engineManifest(builtSite());
  return /^(.*)\/[^/]+$/.exec(manifest.entry)![1]!;
};

async function closePlayground(page: Page): Promise<void> {
  await page.getByRole('button', { name: `Close ${siteText.os.views.playground}` }).click();
  await expect.poll(() => page.locator(WINDOW).count()).toBe(0);
}

describe('008-typescript-playground-FR-007: the first open downloads TypeScript with its progress, and the editor waits for the end', () => {
  test("the loading state shows '[n] MB of [total] MB' from files.json, its value rises, and no editor exists until the end", async () => {
    const manifest = engineManifest(builtSite());
    const page = await freshProfile();
    // Each engine file arrives 250 ms late, so the progress can be read.
    await page.route(/\/playground\/[^/]+\/(?!files\.json)/, async (route: Route) => {
      await new Promise((resolve) => setTimeout(resolve, 250));
      await route.continue();
    });
    await openPlayground(page);
    const seen: { value: number; text: string; editor: number }[] = [];
    while ((await page.locator(LOADING).count()) > 0) {
      const sample = await page.evaluate(({ progress, editor }) => {
        const bar = document.querySelector<HTMLProgressElement>(progress);
        return bar === null ? null : { value: bar.value, text: bar.getAttribute('aria-valuetext') ?? '', editor: document.querySelectorAll(`${editor} .monaco-editor`).length };
      }, { progress: PROGRESS, editor: EDITOR });
      if (sample !== null) seen.push(sample);
      await page.waitForTimeout(100);
    }
    const total = megabytes(manifest.total);
    const shown = seen.filter((sample) => sample.text !== '');
    expect(shown.length).toBeGreaterThan(1);
    for (const sample of shown) expect(sample.text).toMatch(new RegExp(`^\\d+\\.\\d MB of ${total.replace('.', '\\.')} MB$`));
    expect(shown.at(-1)!.value).toBeGreaterThan(shown[0]!.value);
    for (const [index, sample] of shown.entries()) if (index > 0) expect(sample.value).toBeGreaterThanOrEqual(shown[index - 1]!.value);
    expect(seen.every((sample) => sample.editor === 0)).toBe(true);
    expect(fill(siteText.playground.loading.progress, { received: total, total })).toBe(`${total} MB of ${total} MB`);
    await waitReady(page);
  });
});

describe('008-typescript-playground-FR-008: TypeScript downloads once, and is kept for every later open', () => {
  test('the cache lacks the marker while incomplete; closing the window mid-download and opening it again completes it', async () => {
    const folder = engineFolder();
    const page = await freshProfile();
    const held = await holdEngine(page);
    await openPlayground(page);
    await page.waitForTimeout(500);
    expect(await markerKept(page, folder)).toBe(false);
    await closePlayground(page);
    held.release();
    await openPlayground(page);
    await waitReady(page);
    await expect.poll(() => markerKept(page, folder)).toBe(true);
  });

  test('a second open in the visit, a reload, and a reload offline are answered without the network, within 2 s', async () => {
    const page = await freshProfile();
    await openPlayground(page);
    await waitReady(page);
    await expect.poll(() => markerKept(page, engineFolder())).toBe(true);
    const context = page.context();
    const answered: string[] = [];
    await context.route(/\/playground\//, async (route: Route) => {
      answered.push(route.request().url());
      await route.abort();
    });

    const timed = async (step: string) => {
      const started = Date.now();
      await openPlayground(page);
      await waitReady(page, 10_000);
      const ms = Date.now() - started;
      expect(ms, `${step}: ${ms} ms`).toBeLessThanOrEqual(2_000);
    };

    await closePlayground(page);
    await timed('second open');
    await page.reload();
    await page.waitForSelector('#os[data-ready]', { state: 'attached' });
    await settle(page);
    await timed('reload');
    await context.setOffline(true);
    await page.reload();
    await page.waitForSelector('#os[data-ready]', { state: 'attached' });
    await settle(page);
    await timed('reload offline');
    expect(answered).toEqual([]);
    expect(await page.locator(`${EDITOR} .monaco-editor`).count()).toBe(1);
  });
});

describe('008-typescript-playground-FR-008: an open from a stored copy never says it is downloading', () => {
  test('a later open shows no download words, and a first open does', async () => {
    const page = await freshProfile();
    const held = await holdEngine(page);
    await openPlayground(page);
    await expect.poll(() => page.locator(`${LOADING} h2`).textContent()).toBe(siteText.playground.loading.downloading);
    held.release();
    await waitReady(page);
    await expect.poll(() => markerKept(page, engineFolder())).toBe(true);
    await page.reload();
    await page.waitForSelector('#os[data-ready]', { state: 'attached' });
    await settle(page);
    await page.evaluate(() => {
      const scope = window as unknown as { saidDownloading: boolean };
      scope.saidDownloading = false;
      new MutationObserver(() => {
        if (document.querySelector('#os .playground-loading h2, #os .playground-loading progress') !== null) scope.saidDownloading = true;
      }).observe(document.body, { subtree: true, childList: true });
    });
    await openPlayground(page);
    await waitReady(page);
    expect(await page.evaluate(() => (window as unknown as { saidDownloading: boolean }).saidDownloading)).toBe(false);
  });
});

describe('008-typescript-playground-FR-011: a file cut short stops the download, and an engine that never starts is given up', () => {
  const words = siteText.playground.loading;
  const RETRY = `${LOADING} button.playground-retry`;

  test('the worker answered 200 at half its size: stopped, with Retry, no marker, and Retry opens the editor', async () => {
    const manifest = engineManifest(builtSite());
    const worker = manifest.files.find((file) => /ts\.worker/.test(file.path))!;
    const page = await freshProfile();
    let cut = true;
    await page.route(`**${worker.path}`, async (route: Route) => {
      if (!cut) return route.continue();
      const response = await route.fetch();
      const body = await response.body();
      await route.fulfill({ response, body: body.subarray(0, body.length >> 1) });
    });
    await openPlayground(page);
    await page.waitForSelector(RETRY, { timeout: 60_000 });
    expect(await page.locator(`${LOADING} h2`).textContent()).toBe(words.stopped);
    expect(await markerKept(page, engineFolder())).toBe(false);
    cut = false;
    await page.locator(RETRY).click();
    await waitReady(page);
    await expect.poll(() => markerKept(page, engineFolder())).toBe(true);
  });

  test('a stored worker cut short, with its marker, as an earlier visit could leave it, is given up and downloaded whole on Retry', async () => {
    const manifest = engineManifest(builtSite());
    const worker = manifest.files.find((file) => /ts\.worker/.test(file.path))!;
    const page = await freshProfile();
    await openPlayground(page);
    await waitReady(page);
    await expect.poll(() => markerKept(page, engineFolder())).toBe(true);
    await page.evaluate(
      async ({ path, name }) => {
        const cache = await caches.open(name);
        const whole = await (await cache.match(path))!.arrayBuffer();
        await cache.put(path, new Response(whole.slice(0, whole.byteLength >> 1), { headers: { 'content-type': 'text/javascript' } }));
      },
      { path: worker.path, name: `playground-${/\/playground\/([^/]+)$/.exec(engineFolder())![1]}` },
    );
    await page.clock.install();
    await page.reload();
    await waitForReady(page);
    await settle(page);
    await openPlayground(page);
    await expect.poll(async () => {
      await page.clock.fastForward(5_000);
      return page.locator(RETRY).count();
    }, { timeout: 60_000 }).toBe(1);
    expect(await page.locator(`${LOADING} h2`).textContent()).toBe(words.wontOpen);
    await page.locator(RETRY).click();
    await waitReady(page);
    await expect.poll(() => markerKept(page, engineFolder())).toBe(true);
  });

  test('an engine that never starts: past the limit, "TypeScript won\'t open", no marker, and Retry opens the editor', async () => {
    const manifest = engineManifest(builtSite());
    const page = await freshProfile();
    let broken = true;
    await page.route(`**${manifest.entry}*`, async (route: Route) => {
      const bytes = manifest.files.find((file) => file.path === manifest.entry)!.bytes;
      if (broken) await route.fulfill({ status: 200, contentType: 'text/javascript', body: 'export const api = 1; export function createEngine() { return new Promise(() => {}); }'.padEnd(bytes) });
      else await route.continue();
    });
    await page.clock.install();
    await openPlayground(page);
    await expect.poll(async () => {
      await page.clock.fastForward(5_000);
      return page.locator(RETRY).count();
    }, { timeout: 60_000 }).toBe(1);
    expect(await page.locator(`${LOADING} h2`).textContent()).toBe(words.wontOpen);
    expect(await markerKept(page, engineFolder())).toBe(false);
    broken = false;
    await page.locator(RETRY).click();
    await waitReady(page);
  });
});

describe('008-typescript-playground-FR-011: an engine that won\'t open says so, and Retry starts over', () => {
  const words = siteText.playground.loading;
  const RETRY = `${LOADING} button.playground-retry`;
  // Answers the engine's entry with this script until released.
  async function brokenEntry(page: Page, script: string): Promise<() => void> {
    const manifest = engineManifest(builtSite());
    let broken = true;
    await page.route(`**${manifest.entry}*`, async (route: Route) => {
      // At the file's real size, as a download checks that.
      const bytes = manifest.files.find((file) => file.path === manifest.entry)!.bytes;
      if (broken) await route.fulfill({ status: 200, contentType: 'text/javascript', body: script.padEnd(bytes) });
      else await route.continue();
    });
    return () => {
      broken = false;
    };
  }

  test.each([
    ['fails to import', 'throw new Error("broken engine");'],
    ['fails to start', 'export const api = 1; export async function createEngine() { throw new Error("broken engine"); }'],
  ])('an engine that %s: "TypeScript won\'t open" with its size and Retry, no marker, and Retry opens the editor', async (_name, script) => {
    const page = await freshProfile();
    await page.evaluate(() => localStorage.setItem('cv-playground', JSON.stringify({ format: 1, code: 'console.log("kept through the failure");', options: {} })));
    const release = await brokenEntry(page, script);
    await openPlayground(page);
    await page.waitForSelector(RETRY, { timeout: 60_000 });
    expect(await page.locator(`${LOADING} h2`).textContent()).toBe(words.wontOpen);
    const [before, after] = words.wontOpenText.split('{total}');
    const text = (await page.locator(`${LOADING} p`).first().textContent()) ?? '';
    expect(text.startsWith(before!) && text.endsWith(after!) && /\d\.\d/.test(text), text).toBe(true);
    expect(await markerKept(page, engineFolder())).toBe(false);
    release();
    await page.locator(RETRY).click();
    await waitReady(page);
    await expect.poll(() => page.locator(EDITOR).textContent()).toContain('kept');
    expect(await page.evaluate(() => localStorage.getItem('cv-playground'))).toContain('kept through the failure');
  });

  test('a stored copy that won\'t open is downloaded again, and the editor opens', async () => {
    const page = await freshProfile();
    await openPlayground(page);
    await waitReady(page);
    await expect.poll(() => markerKept(page, engineFolder())).toBe(true);
    const { entry } = engineManifest(builtSite());
    await page.evaluate(
      async ({ path, name }) => {
        const cache = await caches.open(name);
        await cache.put(path, new Response('throw new Error("broken copy");', { headers: { 'content-type': 'text/javascript' } }));
      },
      { path: entry, name: `playground-${/\/playground\/([^/]+)$/.exec(engineFolder())![1]}` },
    );
    await page.reload();
    await waitForReady(page);
    await settle(page);
    await openPlayground(page);
    await waitReady(page);
    await expect.poll(() => markerKept(page, engineFolder())).toBe(true);
  });
});
