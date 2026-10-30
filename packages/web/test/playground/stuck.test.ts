// The stuck popup (spec US2, SC-004): code that runs 5 s without a pause
// gets a popup inside its window offering Stop and Keep waiting; waiting
// code never does; the popup asks again, closes by itself, takes focus only
// from inside its window, and waits while the window is off screen.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { fill, siteText } from '../../src/site-text.ts';
import { box, focusedElement } from '../helpers/shell.ts';
import { focusEditor, menu, openPlaygroundPage, PLAYGROUND, POPUP, RUNNER, readLogs, run, running, setCode, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

const words = siteText.playground.popups.stuck;
const ENDLESS = 'let n = 0;\nwhile (true) n++;';

async function start(page: Page, code: string): Promise<number> {
  await setCode(page, code);
  await waitForCode(page, code.split('\n')[0]!);
  await waitChecked(page);
  await run(page, { wait: 'start' });
  return Date.now();
}

// What the shell's status region says, in order, from now on.
const recordAnnouncements = (page: Page) =>
  page.evaluate(() => {
    const said: string[] = [];
    (window as unknown as { said: string[] }).said = said;
    const region = document.querySelector('#os [role="status"][data-req="005-os-shell-FR-041"]')!;
    new MutationObserver(() => said.push(region.textContent ?? '')).observe(region, { childList: true, subtree: true, characterData: true });
  });
const announcements = (page: Page) => page.evaluate(() => (window as unknown as { said: string[] }).said);

const popupShown = (page: Page) => page.locator(POPUP).count();

describe('008-typescript-playground-FR-048: code that runs 5 s without a pause gets the stuck popup', () => {
  test('an endless loop shows the popup between 5 and 6 s, with its text, Stop and Keep waiting', async () => {
    const page = await openPlaygroundPage();
    const started = await start(page, ENDLESS);
    await page.waitForSelector(POPUP, { timeout: 8_000 });
    const after = Date.now() - started;
    expect(after).toBeGreaterThanOrEqual(5_000);
    expect(after).toBeLessThan(6_000);
    expect(await page.locator(`${POPUP} h2`).textContent()).toBe(words.heading);
    expect(await page.locator(`${POPUP} p`).textContent()).toBe(fill(words.text, { seconds: 5 }));
    expect(await page.locator(`${POPUP} button`).allTextContents()).toEqual([words.stop, words.keepWaiting]);
  });

  test('a microtask chain that never yields gets it too', async () => {
    const page = await openPlaygroundPage();
    await start(page, 'const spin = (): Promise<void> => Promise.resolve().then(spin);\nawait spin();');
    await page.waitForSelector(POPUP, { timeout: 8_000 });
  });

  test('code that closes its own worker ends the run and says so, with no popup', async () => {
    const page = await openPlaygroundPage();
    await start(page, 'console.log("before");\nself.close();');
    await expect.poll(() => running(page), { timeout: 3_000 }).toBe(false);
    const logs = await readLogs(page);
    expect(logs.map((row) => row.text)).toContain('before');
    expect(logs.map((row) => row.text)).toContain(siteText.playground.logs.closed);
    await page.waitForTimeout(6_000);
    expect(await popupShown(page)).toBe(0);
    expect(await page.locator(RUNNER).count()).toBe(0);
  });

  test('a 60 s timer and a pending request never get it', async () => {
    const page = await openPlaygroundPage();
    await start(page, 'setTimeout(() => {}, 60_000);\nawait new Promise((done) => setTimeout(done, 60_000));');
    await page.waitForTimeout(7_000);
    expect(await popupShown(page)).toBe(0);
    expect(await running(page)).toBe(true);
  });
});

describe('008-typescript-playground-FR-049: Keep waiting asks again, and the popup closes by itself when the code pauses', () => {
  test('Keep waiting closes it and it returns 5 s later', async () => {
    const page = await openPlaygroundPage();
    await start(page, ENDLESS);
    await page.waitForSelector(POPUP, { timeout: 8_000 });
    await page.locator(POPUP).getByRole('button', { name: words.keepWaiting }).click();
    const kept = Date.now();
    await expect.poll(() => popupShown(page)).toBe(0);
    await page.waitForSelector(POPUP, { timeout: 8_000 });
    expect(Date.now() - kept).toBeGreaterThanOrEqual(4_500);
  });

  test('a loop that ends after 7 s closes it by itself, and says the code is running again', async () => {
    const page = await openPlaygroundPage();
    await recordAnnouncements(page);
    await start(page, 'const until = Date.now() + 7_000;\nwhile (Date.now() < until) {}\nsetTimeout(() => console.log("after"), 2_000);');
    await page.waitForSelector(POPUP, { timeout: 8_000 });
    await expect.poll(() => popupShown(page), { timeout: 5_000 }).toBe(0);
    expect(await running(page)).toBe(true);
    expect(await announcements(page)).toContain(siteText.playground.announce.runningAgain);
  });
});

describe('008-typescript-playground-FR-050: the popup stays inside its window and never takes over the site', () => {
  test("the popup is inside the window; the CV window, dock and menu bar are uncovered and take clicks", async () => {
    const page = await openPlaygroundPage();
    await start(page, ENDLESS);
    await page.waitForSelector(POPUP, { timeout: 8_000 });
    const window = (await box(page, '#os .window[data-view="playground"]'))!;
    const popup = (await box(page, POPUP))!;
    const scrim = (await box(page, `${PLAYGROUND} .playground-scrim`))!;
    for (const inner of [popup, scrim]) {
      expect(inner.x).toBeGreaterThanOrEqual(window.x);
      expect(inner.y).toBeGreaterThanOrEqual(window.y);
      expect(inner.x + inner.width).toBeLessThanOrEqual(window.x + window.width);
      expect(inner.y + inner.height).toBeLessThanOrEqual(window.y + window.height);
    }
    await page.locator('#os .dock-item[data-app="cv"]').click();
    await expect.poll(() => page.evaluate(() => document.activeElement?.closest('.window')?.querySelector('.window-title')?.textContent ?? '')).toContain(siteText.os.views.cv);
    await page.click('#menu-title-app');
    await expect.poll(() => page.locator('#os .menu[role="menu"]:visible').count()).toBeGreaterThan(0);
  });

  test('due while the CV window is focused, it neither brings the window to the front nor takes focus', async () => {
    const page = await openPlaygroundPage();
    await start(page, ENDLESS);
    await page.locator('#os .dock-item[data-app="cv"]').click();
    const focused = await focusedElement(page);
    await page.waitForSelector(POPUP, { timeout: 8_000 });
    expect(await focusedElement(page)).toBe(focused);
    const front = await page.evaluate(() => document.activeElement?.closest('.window')?.querySelector('.window-title')?.textContent ?? '');
    expect(front).toContain(siteText.os.views.cv);
  });

  test('while minimized or showing its specs it waits, then shows', async () => {
    const page = await openPlaygroundPage();
    await start(page, ENDLESS);
    await page.getByRole('button', { name: fill(siteText.desktop.controls.minimize, { window: siteText.os.views.playground }), exact: true }).click();
    await page.waitForTimeout(6_500);
    expect(await popupShown(page)).toBe(0);
    await page.locator('#os .dock-item[data-app="playground"]').click();
    await page.waitForSelector(POPUP, { timeout: 2_000 });
    await page.locator(POPUP).getByRole('button', { name: words.keepWaiting }).click();
    await menu(page, siteText.inspector.show);
    await page.waitForTimeout(6_000);
    expect(await popupShown(page)).toBe(0);
    await menu(page, fill(siteText.inspector.back, { view: siteText.os.views.playground }));
    await page.waitForSelector(POPUP, { timeout: 2_000 });
  });
});

describe('008-typescript-playground-FR-051: the popup is an alert dialog with focus on Stop, and Escape keeps waiting', () => {
  test('it is an alertdialog named by its heading, focus moves to Stop, and Stop ends the run', async () => {
    const page = await openPlaygroundPage();
    await start(page, ENDLESS);
    await focusEditor(page);
    await page.waitForSelector(POPUP, { timeout: 8_000 });
    expect(await page.locator(POPUP).getAttribute('role')).toBe('alertdialog');
    expect(await page.getByRole('alertdialog', { name: words.heading }).count()).toBe(1);
    await expect.poll(() => page.evaluate(() => document.activeElement?.textContent)).toBe(words.stop);
    await page.keyboard.press('Enter');
    await expect.poll(() => running(page)).toBe(false);
    expect((await readLogs(page)).at(-1)!.text).toMatch(new RegExp(`^${fill(siteText.playground.runState.stopped, { s: '[\\d.]+' })}$`));
  });

  test('Escape keeps waiting and returns focus to the editor; the menu bar shortcut works meanwhile', async () => {
    const page = await openPlaygroundPage();
    await start(page, ENDLESS);
    await focusEditor(page);
    await page.waitForSelector(POPUP, { timeout: 8_000 });
    await page.keyboard.press('Escape');
    await expect.poll(() => popupShown(page)).toBe(0);
    await expect.poll(() => page.evaluate(() => document.activeElement?.closest('.playground-editor') !== null)).toBe(true);
    expect(await running(page)).toBe(true);
    await page.keyboard.press('Alt+Shift+KeyM');
    await expect.poll(() => page.evaluate(() => document.activeElement?.closest('[role="menubar"]') !== null)).toBe(true);
  });
});
