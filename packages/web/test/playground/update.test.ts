// A site update with a new engine (spec US8, FR-013, research R4): the
// stored copy keeps working offline until the new one is whole, then the old
// copy is deleted, and an open Playground isn't interrupted by the new
// service worker. Both versions are served at one address, as the engine's
// copies are kept per origin.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { buildCopy, commitAll, repoCopy } from '../helpers/copy.ts';
import { cacheNames, firstPage, goOffline, settled, switchableServer, until } from '../helpers/offline.ts';
import { waitForReady } from '../helpers/shell.ts';
import { builtSite } from '../helpers/site.ts';
import type { BuiltSite } from '../helpers/site.ts';
import { engineManifest, openPlayground, PLAYGROUND, readLogs, run, setCode, waitChecked, waitReady } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 600_000 });

// The engine's folder in a build: `/playground/<engine-hash>`.
const folderOf = (site: BuiltSite) => /^(.*)\/[^/]+$/.exec(engineManifest(site).entry)![1]!;
const cacheOf = (folder: string) => `playground-${folder.split('/').at(-1)}`;

// The site rebuilt from a copy whose engine differs by one exported name,
// so its hash differs and nothing else does.
function rebuiltEngine(): BuiltSite {
  const root = repoCopy();
  fs.appendFileSync(path.join(root, 'packages/web/src/apps/playground/engine/engine.ts'), '\nexport const rebuilt = true;\n');
  commitAll(root, 'A new engine');
  const build = buildCopy(root);
  if (build.site === null) throw new Error(`the rebuilt site failed:\n${build.stderr}`);
  return build.site as BuiltSite;
}

// The engine files the page loaded, by their folders.
const loadedFolders = (page: Page) =>
  page.evaluate(() => [...new Set(performance.getEntriesByType('resource').map((entry) => /\/playground\/[^/]+(?=\/)/.exec(new URL(entry.name).pathname)?.[0]).filter((folder): folder is string => folder !== undefined))]);

// The copy that opened, by the style sheet the loader linked for it.
const openedStyle = (page: Page) => page.locator('link[data-playground-style]').getAttribute('href');

async function shellAt(url: string): Promise<Page> {
  const page = await firstPage(url, { width: 1440, height: 900, permissions: ['clipboard-read', 'clipboard-write'] });
  await waitForReady(page);
  await until(() => settled(page));
  return page;
}

async function reloadShell(page: Page): Promise<void> {
  await page.reload();
  await waitForReady(page);
}

describe('008-typescript-playground-FR-013: a site update keeps the stored engine until the new one is whole', () => {
  test('offline, the old copy opens with its version; online, the new one downloads and the old cache goes', async () => {
    const old = builtSite();
    const next = rebuiltEngine();
    const [oldFolder, nextFolder] = [folderOf(old), folderOf(next)];
    expect(nextFolder).not.toBe(oldFolder);
    const server = await switchableServer();
    await server.serve(old);
    const page = await shellAt(server.url);
    await openPlayground(page);
    await waitReady(page);
    const version = await page.locator(`${PLAYGROUND} .playground-status span.ts-version`).textContent();
    await expect.poll(() => cacheNames(page)).toContain(cacheOf(oldFolder));

    // The update reaches the worker; then the network goes.
    await server.serve(next);
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then((registration) => registration?.update()));
    expect(await until(() => settled(page))).toBe(true);
    await goOffline(page.context());
    await reloadShell(page);
    expect(await page.locator('#os').getAttribute('data-playground')).toContain(nextFolder);
    await openPlayground(page);
    await waitReady(page, 20_000);
    expect(await page.locator(`${PLAYGROUND} .playground-status span.ts-version`).textContent()).toBe(version);
    expect(await loadedFolders(page)).not.toContain(nextFolder);
    expect(await cacheNames(page)).toContain(cacheOf(oldFolder));

    // Online again, a new visit opens the stored copy at once, with no
    // download shown, and stores the new engine behind it.
    await page.context().setOffline(false);
    await reloadShell(page);
    await openPlayground(page);
    await waitReady(page, 20_000);
    expect(await openedStyle(page)).toContain(oldFolder);
    await expect.poll(() => page.evaluate((marker) => caches.match(marker).then((found) => found !== undefined), `${nextFolder}/complete`), { timeout: 60_000 }).toBe(true);
    expect(await cacheNames(page)).toContain(cacheOf(oldFolder));

    // The next open uses it, with no download; the old copy then goes.
    await reloadShell(page);
    await openPlayground(page);
    await waitReady(page, 20_000);
    expect(await openedStyle(page)).toContain(nextFolder);
    await expect.poll(() => cacheNames(page), { timeout: 20_000 }).not.toContain(cacheOf(oldFolder));
    expect(await cacheNames(page)).toContain(cacheOf(nextFolder));
  });

  test('an open Playground keeps working when the new service worker activates', async () => {
    const next = rebuiltEngine();
    const server = await switchableServer();
    await server.serve(builtSite());
    const page = await shellAt(server.url);
    await openPlayground(page);
    await waitReady(page);
    await server.serve(next);
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then((registration) => registration?.update()));
    expect(await until(() => settled(page))).toBe(true);
    await setCode(page, 'console.log("still here");');
    await waitChecked(page);
    await run(page);
    expect((await readLogs(page)).map((row) => row.text)).toContain('still here');
  });
});
