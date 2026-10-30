// Show specs and Back (spec US1): the Playground's content unmounts while
// the window shows its specs, and comes back as it was: the code, the
// cursor, the selection, the scroll, the open pane and the options.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { fill, siteText } from '../../src/site-text.ts';
import { EDITOR, editorText, menu, openPlaygroundPage, paneTab, PLAYGROUND, readLogs, run, RUNNER, running, setCode, showPane, stop, TOOLBAR, waitChecked, waitForCode } from '../helpers/playground.ts';

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
