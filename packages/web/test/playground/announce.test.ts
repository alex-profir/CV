// What screen readers hear without focus moving (spec US6, FR-064 to
// FR-066): the panes are named tabs; the error count after a pause; new
// logs summed at most once a second; the download's steps; a run's start,
// its timers and its end; and every message.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { counted, fill, siteText } from '../../src/site-text.ts';
import { focusedElement } from '../helpers/shell.ts';
import { editorText, focusEditor, freshProfile, MESSAGE, openPlayground, openPlaygroundPage, PLAYGROUND, setCode, TOOLBAR, waitChecked, waitForCode, waitReady } from '../helpers/playground.ts';
import type { ShellOptions } from '../helpers/shell.ts';

vi.setConfig({ testTimeout: 240_000 });

const words = siteText.playground.announce;

// Records every text the shell's status region shows, in order, from the
// page's first script on.
const RECORD = () => {
  const heard: string[] = [];
  (window as unknown as { heard: string[] }).heard = heard;
  new MutationObserver(() => {
    const region = document.querySelector('#os [role="status"].visually-hidden');
    const text = region?.textContent ?? '';
    if (text !== '' && heard.at(-1) !== text) heard.push(text);
  }).observe(document, { subtree: true, childList: true, characterData: true });
};

const recording = (options: Partial<ShellOptions> = {}): Partial<ShellOptions> => ({
  ...options,
  beforeGoto: async (page) => {
    await page.addInitScript(RECORD);
    await options.beforeGoto?.(page);
  },
});

const heard = (page: Page) => page.evaluate(() => (window as unknown as { heard: string[] }).heard.slice());
// Everything heard, in order, as one text: announcements close together are
// read as one.
const transcript = async (page: Page) => (await heard(page)).join(' ');
// Clears what was heard once the page has gone quiet.
const clearHeard = async (page: Page) => {
  await page.waitForTimeout(1_200);
  await page.evaluate(() => void (window as unknown as { heard: string[] }).heard.splice(0));
};

// Whether `phrases` were heard in this order.
function inOrder(text: string, phrases: readonly string[]): boolean {
  let at = 0;
  for (const phrase of phrases) {
    const found = text.indexOf(phrase, at);
    if (found < 0) return false;
    at = found + phrase.length;
  }
  return true;
}

const occurrences = (text: string, found: RegExp) => [...text.matchAll(new RegExp(found.source, 'g'))].map((match) => match[0]);

// Run's key in the editor, so focus stays where it is.
async function runByKey(page: Page): Promise<void> {
  await focusEditor(page);
  await page.keyboard.press((await page.evaluate(() => /Macintosh|Mac OS X/.test(navigator.userAgent))) ? 'Meta+Enter' : 'Control+Enter');
}


describe('008-typescript-playground-FR-064: the panes are named tabs; errors and logs are told without moving focus', () => {
  test('the panes are a tab list named Panes, each tab named', async () => {
    const page = await openPlaygroundPage();
    const list = page.locator(`${PLAYGROUND} .pane-tabs`);
    expect(await list.getAttribute('role')).toBe('tablist');
    expect(await list.getAttribute('aria-label')).toBe(siteText.playground.panes.label);
    const names = await list.locator('[role="tab"]').evaluateAll((tabs) => tabs.map((tab) => (tab.textContent ?? '').trim()));
    expect(names).toHaveLength(4);
    for (const name of names) expect(name).not.toBe('');
  });

  test('the error count is told once, after typing pauses, not at every key', async () => {
    const page = await openPlaygroundPage(recording());
    await setCode(page, 'let ok = 1;');
    await waitForCode(page, 'let ok = 1;');
    await waitChecked(page);
    await clearHeard(page);
    await focusEditor(page);
    await page.keyboard.press((await page.evaluate(() => /Macintosh|Mac OS X/.test(navigator.userAgent))) ? 'Meta+ArrowDown' : 'Control+End');
    await page.keyboard.press('End');
    await page.keyboard.type(' let a: number = 2; a = "x"; let b: string = a;', { delay: 40 });
    await waitChecked(page);
    await page.waitForTimeout(1_500);
    // 47 keys: the count is told after the pause, and not per key (a check
    // may run while the browser is slow to deliver a key).
    const told = occurrences(await transcript(page), /\b(?:No|\d+) errors?\b/);
    expect(told.at(-1), await editorText(page)).toBe(fill(words.errors.other, { n: 2 }));
    expect(told.length).toBeLessThanOrEqual(2);
    expect(await focusedElement(page)).toMatch(/^textarea/);
  });

  test('200 log lines in a second are told at most twice, summed, with focus unmoved', async () => {
    const page = await openPlaygroundPage(recording());
    await setCode(page, 'for (let i = 0; i < 200; i += 1) console.log(i);');
    await waitChecked(page);
    await clearHeard(page);
    await runByKey(page);
    await page.waitForTimeout(2_500);
    const told = occurrences(await transcript(page), /\d+ new log entr(?:y|ies)/);
    expect(told.length).toBeGreaterThan(0);
    expect(told.length).toBeLessThanOrEqual(2);
    const sum = told.map((text) => Number(/(\d+) new log/.exec(text)![1])).reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThanOrEqual(200);
    expect(await focusedElement(page)).toMatch(/^textarea/);
  });
});

describe("008-typescript-playground-FR-065: the download's start, steps, end and failure are told without moving focus", () => {
  test('a slow download tells its start, 25%, 50%, 75% and its end, with focus on the window title', async () => {
    const page = await freshProfile(
      recording({
        serviceWorkers: 'block',
        beforeGoto: async (target) => {
          const cdp = await target.context().newCDPSession(target);
          await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: 1_500_000, uploadThroughput: -1 });
        },
      }),
    );
    await openPlayground(page);
    const focus = await focusedElement(page);
    expect(focus).toMatch(/window-title-playground/);
    await waitReady(page, 120_000);
    const text = await transcript(page);
    expect(inOrder(text, [words.downloadStarted, ...[25, 50, 75].map((percent) => fill(words.downloadStep, { percent })), words.downloadDone]), text).toBe(true);
    expect(text).not.toContain(words.downloadFailed);
  });

  test('a failed download tells its start and its failure', async () => {
    const page = await freshProfile(recording({ serviceWorkers: 'block' }));
    let served = 0;
    await page.route(/\/playground\//, async (route) => {
      served += 1;
      if (served > 1) await route.abort('internetdisconnected');
      else await route.continue();
    });
    await openPlayground(page);
    await page.waitForSelector(`${PLAYGROUND} button.playground-retry`, { timeout: 60_000 });
    const text = await transcript(page);
    expect(inOrder(text, [words.downloadStarted, words.downloadFailed]), text).toBe(true);
    expect(text).not.toContain(words.downloadDone);
    expect(await focusedElement(page)).toMatch(/window-title-playground/);
  });
});

describe("008-typescript-playground-FR-066: a run's start, its timers and its end are told without a message per timer", () => {
  test('100 timers over three seconds: the start, timer counts at most once a second, and the end', async () => {
    const page = await openPlaygroundPage(recording());
    await setCode(page, 'for (let i = 0; i < 100; i += 1) setTimeout(() => {}, 30 * i);');
    await waitChecked(page);
    await clearHeard(page);
    const started = Date.now();
    await runByKey(page);
    await expect.poll(async () => (await transcript(page)).includes('Finished'), { timeout: 30_000 }).toBe(true);
    const seconds = (Date.now() - started) / 1000;
    await page.waitForTimeout(1_200);
    const all = await transcript(page);
    const text = all.slice(all.indexOf(words.runStarted));
    expect(text.startsWith(words.runStarted), all).toBe(true);
    const timers = occurrences(text, /(?:No|\d+) timers? left\./);
    expect(timers.length).toBeGreaterThan(0);
    expect(timers.length).toBeLessThanOrEqual(Math.ceil(seconds) + 1);
    expect(occurrences(text, /Finished in [\d.]+ s/)).toHaveLength(1);
    expect(text.indexOf('Finished')).toBeGreaterThan(text.lastIndexOf('timers left'));
    expect(await focusedElement(page)).toMatch(/^textarea/);
  });

  test('no timer left is told in words', async () => {
    const page = await openPlaygroundPage(recording());
    await setCode(page, 'setTimeout(() => {}, 1500);\nsetTimeout(() => {}, 3000);');
    await waitChecked(page);
    await clearHeard(page);
    await runByKey(page);
    await expect.poll(async () => (await transcript(page)).includes('Finished'), { timeout: 30_000 }).toBe(true);
    const text = await transcript(page);
    expect(text).toContain(fill(counted(words.timers, 1), { n: 1 }));
    expect(text).not.toMatch(/\b0 timers/);
  });
});

describe('008-typescript-playground-FR-064: every message is told', () => {
  test('an example and Share each tell their message', async () => {
    const page = await openPlaygroundPage(recording({ permissions: ['clipboard-read', 'clipboard-write'] }));
    await clearHeard(page);
    await page.locator(`${TOOLBAR} button.share`).click();
    await page.waitForSelector(MESSAGE);
    const linkCopied = ((await page.locator(`${MESSAGE} p`).textContent()) ?? '').trim();
    await expect.poll(async () => (await heard(page)).join('\n')).toContain(linkCopied);
    await setCode(page, 'let mine = 1;');
    await waitForCode(page, 'let mine = 1;');
    await page.locator(`${TOOLBAR} button.examples`).click();
    await page.locator(`${PLAYGROUND} section.examples-panel button.example`).nth(1).click();
    await page.waitForSelector(MESSAGE);
    const replaced = ((await page.locator(`${MESSAGE} p`).textContent()) ?? '').trim();
    await expect.poll(async () => (await heard(page)).join('\n')).toContain(replaced);
  });
});
