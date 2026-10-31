// Show specs and Back (spec US1): the Playground's content unmounts while
// the window shows its specs, and comes back as it was: the code, the
// cursor, the selection, the scroll, the open pane and the options.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { fill, siteText } from '../../src/site-text.ts';
import { openShell, PHONE_USER_AGENT, settle } from '../helpers/shell.ts';
import { EDITOR, editorText, linkFrom, menu, openPlaygroundPage, paneTab, PLAYGROUND, readLogs, run, RUNNER, running, setCode, showPane, stop, TOOLBAR, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

const CODE = Array.from({ length: 80 }, (_, i) => `const line${i} = ${i};`).join('\n');

const status = (page: Page) => page.locator(`${PLAYGROUND} .playground-status span`).first().textContent();
const scrollTop = (page: Page) => page.locator(`${EDITOR} .monaco-scrollable-element`).first().evaluate((element) => element.querySelector('.lines-content')?.getBoundingClientRect().top ?? 0);
const selected = (page: Page) => page.locator(`${EDITOR} .selected-text`).count();

describe('008-typescript-playground-FR-005: Show specs and Back keep everything the Playground showed', () => {
  test('the code, cursor, selection, scroll, Declarations pane and a changed option come back', async () => {
    const page = await openPlaygroundPage();
    await setCode(page, CODE);
    await page.keyboard.press('Control+KeyG');
    await page.keyboard.type('1');
    await page.keyboard.press('Enter');
    await waitForCode(page, CODE);
    await waitChecked(page);
    await page.keyboard.press('Control+KeyG');
    await page.keyboard.type('40:7');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Shift+End');
    await page.locator(EDITOR).hover();
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(300);
    await page.locator(`${TOOLBAR} button.options`).click();
    await page.locator(`${PLAYGROUND} #playground-option-removeComments`).check();
    await page.locator(`${TOOLBAR} button.options`).click();
    await showPane(page, 'declarations');

    const before = { text: await editorText(page), status: await status(page), scroll: await scrollTop(page), selected: await selected(page) };
    expect(before.selected).toBeGreaterThan(0);

    await menu(page, siteText.inspector.show);
    await expect.poll(() => page.locator(PLAYGROUND).count()).toBe(0);
    await menu(page, fill(siteText.inspector.back, { view: siteText.os.views.playground }));
    await page.waitForSelector(`${EDITOR} .monaco-editor`);
    await page.waitForTimeout(300);

    expect(await editorText(page)).toBe(before.text);
    expect(await status(page)).toBe(before.status);
    expect(await scrollTop(page)).toBe(before.scroll);
    expect(await selected(page)).toBe(before.selected);
    expect(await paneTab(page, 'declarations').getAttribute('aria-selected')).toBe('true');
    await page.locator(`${TOOLBAR} button.options`).click();
    expect(await page.locator(`${PLAYGROUND} #playground-option-removeComments`).isChecked()).toBe(true);
  });
});

describe('008-typescript-playground-FR-005: Show specs and Back keep the logs and a run going', () => {
  test("the logs stay, the run's time keeps counting, and its runner frame is the same element, outside the window", async () => {
    const page = await openPlaygroundPage();
    await setCode(page, 'let n = 0;\nsetInterval(() => console.log("tick", ++n), 200);');
    await waitChecked(page);
    await run(page, { wait: 'start' });
    await expect.poll(async () => (await readLogs(page)).length).toBeGreaterThan(3);
    const frame = await page.locator(RUNNER).elementHandle();
    expect(await frame!.evaluate((element) => element.closest('section.playground') === null)).toBe(true);
    const before = (await readLogs(page)).length;
    await menu(page, siteText.inspector.show);
    await expect.poll(() => page.locator(PLAYGROUND).count()).toBe(0);
    await page.waitForTimeout(1_500);
    await menu(page, fill(siteText.inspector.back, { view: siteText.os.views.playground }));
    await page.waitForSelector(`${EDITOR} .monaco-editor`);
    expect(await running(page)).toBe(true);
    expect((await readLogs(page)).length).toBeGreaterThan(before + 4);
    expect(await frame!.evaluate((element) => element.isConnected && element.closest('section.playground') === null)).toBe(true);
    expect(await page.locator(RUNNER).count()).toBe(1);
    await stop(page);
  });
});

describe('008-typescript-playground-FR-005: Show specs and Back from the phone\'s screen', () => {
  test('at 375, Specs shows the specs and Back brings the "best on desktop" screen back', async () => {
    const SCREEN = '#os .full-screen[data-view="playground"] section.playground-mobile';
    const page = await openShell({ width: 375, height: 812, hasTouch: true, userAgent: PHONE_USER_AGENT });
    await page.locator('#os .home .app-icon[data-view="playground"]').tap();
    await page.waitForSelector(SCREEN);
    await settle(page);
    await page.locator('#os .full-screen[data-view="playground"] button.show-specs').tap();
    await page.waitForSelector('#os section.spec-view[data-view="playground"]');
    expect(await page.locator(SCREEN).count()).toBe(0);
    await page.locator('#os section.spec-view[data-view="playground"] button.spec-back').tap();
    await page.waitForSelector(SCREEN);
    expect((await page.locator(`${SCREEN} h2`).textContent())?.trim()).toBe(siteText.playground.mobile.app.heading);
    expect(await page.locator('#os .full-screen[data-view="playground"] button.show-specs').isVisible()).toBe(true);
  });
});

describe('008-typescript-playground-FR-005: a link opened during the specs leaves the rest as it was', () => {
  test('the Playground shows again, with the pane, logs and run that were going', async () => {
    const page = await openPlaygroundPage();
    const code = 'console.log("kept");\nsetInterval(() => {}, 1000);';
    await setCode(page, code);
    await waitForCode(page, code);
    await waitChecked(page);
    await run(page, { wait: 'start' });
    await expect.poll(async () => (await readLogs(page)).some((row) => row.text === 'kept')).toBe(true);
    await menu(page, siteText.inspector.show);
    await expect.poll(() => page.locator(PLAYGROUND).count()).toBe(0);
    await page.evaluate((hash) => void (location.hash = hash), new URL(`http://site${linkFrom('', JSON.stringify({ c: 'const shared = 1;' }))}`).hash);
    await waitForCode(page, 'const shared = 1;');
    expect(await page.locator('#os .window[data-view="playground"] .spec-heading').count()).toBe(0);
    expect(await paneTab(page, 'logs').getAttribute('aria-selected')).toBe('true');
    expect((await readLogs(page)).some((row) => row.text === 'kept')).toBe(true);
    expect(await running(page)).toBe(true);
    await stop(page);
  });
});

describe('008-typescript-playground-FR-085: the menu offers only what can show while the specs show', () => {
  test('what opens inside the Playground is off while its specs show, and on again after Back', async () => {
    const page = await openPlaygroundPage();
    const words = siteText.playground.menu;
    const items = [words.examples, words.options, words.palette, words.keys, words.reset];
    const states = async () => {
      await page.click('#menu-title-app');
      const found = await Promise.all(items.map((item) => page.getByRole('menuitem').filter({ hasText: item }).getAttribute('aria-disabled')));
      await page.keyboard.press('Escape');
      return found;
    };
    expect(await states()).toEqual(items.map(() => null));
    await menu(page, siteText.inspector.show);
    await expect.poll(() => page.locator(PLAYGROUND).count()).toBe(0);
    expect(await states()).toEqual(items.map(() => 'true'));
    await menu(page, fill(siteText.inspector.back, { view: siteText.os.views.playground }));
    await page.waitForSelector(`${EDITOR} .monaco-editor`);
    expect(await states()).toEqual(items.map(() => null));
  });
});
