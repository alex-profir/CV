// The Playground offline (spec US8, SC-011): the first open with no network
// says why it waits and starts by itself when the network is back; a cut
// download is never used; after one open everything works offline; and a
// shared link opened before TypeScript is stored waits for it.
import { describe, expect, test, vi } from 'vitest';
import type { Page, Route } from 'playwright';
import { fill, siteText } from '../../src/site-text.ts';
import { examples } from '../../src/apps/playground/examples/index.ts';
import { megabytes } from '../../src/apps/playground/text.ts';
import { settled, until } from '../helpers/offline.ts';
import { press, settle, waitForReady } from '../helpers/shell.ts';
import { chooseExample, EDITOR, editorText, focusEditor, freshProfile, linkFrom, LOADING, MESSAGE, onMac, openPlayground, PLAYGROUND, POPUP, readErrors, readLogs, run, running, setCode, showPane, TOOLBAR, waitChecked, waitForCode, waitReady } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 400_000 });

const words = siteText.playground.loading;
const RETRY = `${LOADING} button.playground-retry`;

const heading = (page: Page) => page.locator(`${LOADING} h2`).textContent();

// The engine's size as the page states it, from the build.
const statedSize = (page: Page) => page.evaluate(() => Number(document.querySelector('[data-playground-bytes]')!.getAttribute('data-playground-bytes')));

// Reloads the page with the network off, as a visitor back offline.
async function reloadOffline(page: Page): Promise<void> {
  expect(await until(() => settled(page))).toBe(true);
  await page.context().setOffline(true);
  await page.reload();
  await waitForReady(page);
  await settle(page);
}

describe('008-typescript-playground-FR-011: offline before the download, the Playground says why and starts by itself (SC-011)', () => {
  test('a fresh profile offline shows "TypeScript needs one download" with the size and Retry; online, the download starts by itself', async () => {
    const page = await freshProfile();
    await page.context().setOffline(true);
    await openPlayground(page);
    await page.waitForSelector(RETRY, { timeout: 30_000 });
    expect(await heading(page)).toBe(words.offline);
    expect(await page.locator(`${LOADING} p`).first().textContent()).toBe(fill(words.offlineText, { total: megabytes(await statedSize(page)) }));
    expect(await page.locator(`${EDITOR} .monaco-editor`).count()).toBe(0);
    await page.context().setOffline(false);
    await waitReady(page);
  });

  test('with the requests failing and no `online` event, the download starts by itself when they stop failing', async () => {
    const page = await freshProfile();
    let down = true;
    await page.route(/\/playground\/[^/]+\/files\.json$/, async (route: Route) => {
      if (down) await route.abort('connectionfailed');
      else await route.continue();
    });
    await openPlayground(page);
    await page.waitForSelector(RETRY, { timeout: 30_000 });
    expect(await page.evaluate(() => navigator.onLine)).toBe(true);
    down = false;
    await waitReady(page);
  });

  test('a download cut part way shows "The download stopped", is never used, and completes after Retry', async () => {
    const page = await freshProfile();
    let cut = false;
    // The first engine file other than the manifest fails once.
    await page.route(/\/playground\/[^/]+\/(?!files\.json)[^/]+$/, async (route: Route) => {
      if (!cut) {
        cut = true;
        await route.abort('connectionreset');
        return;
      }
      await route.continue();
    });
    await openPlayground(page);
    await page.waitForSelector(RETRY, { timeout: 30_000 });
    expect(await heading(page)).toBe(words.stopped);
    const [before, after] = words.stoppedText.split('{total}');
    const text = (await page.locator(`${LOADING} p`).first().textContent()) ?? '';
    expect(text.startsWith(before!) && text.endsWith(after!) && /\d\.\d/.test(text), text).toBe(true);
    expect(await page.locator(`${EDITOR} .monaco-editor`).count()).toBe(0);
    await page.locator(RETRY).click();
    await waitReady(page);
  });
});

describe('008-typescript-playground-FR-073: after one open, everything works offline (SC-011)', () => {
  test('offline: open, edit, a type, an error, each pane, an option, every example, a run, the popup and Share, in the site fonts', async () => {
    const page = await freshProfile();
    await openPlayground(page);
    await waitReady(page);
    await reloadOffline(page);
    await openPlayground(page);
    await waitReady(page, 10_000);
    // Editing, an error and a type.
    const code = 'const n: number = "one";\nconst twice = (x: number) => x * 2;\nconsole.log(twice(2));';
    await setCode(page, code);
    await waitForCode(page, code.split('\n')[0]!);
    await waitChecked(page);
    expect((await readErrors(page)).length).toBe(1);
    await focusEditor(page);
    await press(page, 'Control+KeyG');
    await page.keyboard.type('2:8');
    await press(page, 'Enter');
    const mod = (await onMac(page)) ? 'Meta' : 'Control';
    await press(page, `${mod}+KeyK`, `${mod}+KeyI`);
    await page.waitForSelector(`${EDITOR} .monaco-hover:not(.hidden)`);
    expect(await page.locator(`${EDITOR} .monaco-hover`).first().textContent()).toContain('(x: number) => number');
    await press(page, 'Escape');
    // Each pane, and an option.
    for (const pane of ['javascript', 'declarations', 'errors', 'logs'] as const) await showPane(page, pane);
    await page.locator(`${TOOLBAR} button.options`).click();
    await page.locator(`${PLAYGROUND} section.options-panel #playground-option-noUncheckedIndexedAccess`).check();
    await page.locator(`${TOOLBAR} button.options`).click();
    await waitChecked(page);
    expect((await readErrors(page)).length).toBe(1);
    // Every example, the CV's included: each puts its code in the editor and
    // checks with no errors.
    for (const example of examples(await onMac(page))) {
      await chooseExample(page, example.title);
      await waitForCode(page, example.code.split('\n')[0]!);
      await waitChecked(page);
    }
    // A run, and the stuck popup.
    await setCode(page, 'console.log("offline");');
    await waitChecked(page);
    await run(page);
    expect((await readLogs(page)).map((row) => row.text)).toContain('offline');
    await setCode(page, 'while (true) {}');
    await waitChecked(page);
    await run(page, { wait: 'start' });
    await page.waitForSelector(POPUP, { timeout: 20_000 });
    await page.locator(`${POPUP} button`).first().click();
    await expect.poll(() => running(page)).toBe(false);
    // Share makes its link with no network.
    await page.locator(`${TOOLBAR} button.share`).click();
    await page.waitForSelector(MESSAGE);
    expect(await page.locator(MESSAGE).getAttribute('data-kind')).not.toBe('error');
    // The site's fonts drew it: the code's and the body's faces are loaded.
    expect(await page.evaluate(() => [...document.fonts].filter((face) => face.status === 'loaded').map((face) => face.family.replace(/"/g, '')))).toEqual(expect.arrayContaining(['JetBrains Mono', 'Schibsted Grotesk']));
  });

  test('a shared link opened offline before TypeScript is stored waits, and opens after the download', async () => {
    const page = await freshProfile();
    const shared = 'console.log("shared while offline");';
    const link = linkFrom(new URL(page.url()).origin, JSON.stringify({ c: shared }));
    // The site's worker holds the site before the network goes.
    expect(await until(() => settled(page))).toBe(true);
    await page.context().setOffline(true);
    // A new load, as following the link is.
    await page.goto('about:blank');
    await page.goto(link);
    await waitForReady(page);
    await page.waitForSelector(RETRY, { timeout: 30_000 });
    expect(await heading(page)).toBe(words.offline);
    await page.context().setOffline(false);
    await waitReady(page);
    await expect.poll(() => editorText(page)).toBe(shared);
    expect(await readLogs(page)).toEqual([]);
  });
});
