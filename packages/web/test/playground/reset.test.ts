// Reset (spec US1): asked in a popup; confirming puts Welcome and the
// defaults back and stops keeping the code; Undo brings the code back;
// Cancel and Escape change nothing.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { siteText } from '../../src/site-text.ts';
import { welcome } from '../../src/apps/playground/examples/index.ts';
import { editorText, focusEditor, menu, MESSAGE, onMac, openPlaygroundPage, PLAYGROUND, POPUP, run, RUNNER, running, setCode, TOOLBAR, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

const words = siteText.playground.popups.reset;
const CODE = 'const mine = "kept";';

async function edited(page: Page): Promise<void> {
  await setCode(page, CODE);
  await waitForCode(page, CODE);
  await page.locator(`${TOOLBAR} button.options`).click();
  await page.locator(`${PLAYGROUND} #playground-option-removeComments`).check();
  await page.keyboard.press('Escape');
  await waitChecked(page);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => localStorage.getItem('cv-playground'))).not.toBeNull();
}

async function startsWith(page: Page, code: string): Promise<boolean> {
  const shown = await editorText(page);
  return code.split('\n').slice(0, shown.split('\n').length).join('\n') === shown;
}

describe('008-typescript-playground-FR-080: Reset puts the starting example and the defaults back, and Undo brings the code back', () => {
  test('Reset… asks in a popup, with focus on Reset', async () => {
    const page = await openPlaygroundPage();
    await menu(page, siteText.playground.menu.reset);
    await page.waitForSelector(POPUP);
    expect(await page.locator(`${POPUP} h2`).textContent()).toBe(words.heading);
    expect(await page.locator(POPUP).getAttribute('role')).toBe('dialog');
    expect(await page.evaluate(() => document.activeElement?.textContent)).toBe(words.confirm);
  });

  test('confirming restores Welcome and the defaults and removes the kept code; Undo brings the code back', async () => {
    const page = await openPlaygroundPage();
    await edited(page);
    await menu(page, siteText.playground.menu.reset);
    await page.locator(POPUP).getByRole('button', { name: words.confirm }).click();
    await expect.poll(() => startsWith(page, welcome(true).code) .then(async (mac) => mac || startsWith(page, welcome(false).code))).toBe(true);
    expect(await startsWith(page, welcome(await onMac(page)).code)).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem('cv-playground'))).toBeNull();
    await page.locator(`${TOOLBAR} button.options`).click();
    expect(await page.locator(`${PLAYGROUND} .options-foot`).textContent()).toBe(siteText.playground.options.changedNone);
    await page.keyboard.press('Escape');
    expect((await page.locator(MESSAGE).textContent())?.trim()).toContain(siteText.playground.messages.resetDone);
    await page.locator(MESSAGE).getByRole('button', { name: siteText.playground.messages.actions.undo }).click();
    await expect.poll(() => editorText(page)).toBe(CODE);
  });

  test('Reset during an interval stops it', async () => {
    const page = await openPlaygroundPage();
    await setCode(page, 'setInterval(() => console.log("tick"), 100);');
    await waitChecked(page);
    await run(page, { wait: 'start' });
    await menu(page, siteText.playground.menu.reset);
    await page.locator(POPUP).getByRole('button', { name: words.confirm }).click();
    await expect.poll(() => running(page)).toBe(false);
    expect(await page.locator(RUNNER).count()).toBe(0);
  });

  test('Cancel and Escape change nothing', async () => {
    const page = await openPlaygroundPage();
    await setCode(page, CODE);
    await waitForCode(page, CODE);
    await menu(page, siteText.playground.menu.reset);
    await page.locator(POPUP).getByRole('button', { name: words.cancel }).click();
    await expect.poll(() => page.locator(POPUP).count()).toBe(0);
    expect(await editorText(page)).toBe(CODE);
    await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('menu-title-app');
    await menu(page, siteText.playground.menu.reset);
    await page.waitForSelector(POPUP);
    await page.keyboard.press('Escape');
    await expect.poll(() => page.locator(POPUP).count()).toBe(0);
    expect(await editorText(page)).toBe(CODE);
  });

  test('the first edit after Reset takes Undo off the message', async () => {
    const page = await openPlaygroundPage();
    await menu(page, siteText.playground.menu.reset);
    await page.locator(`${POPUP} button.danger`).click();
    const undo = page.locator(MESSAGE).getByRole('button', { name: siteText.playground.messages.actions.undo });
    await undo.waitFor();
    await focusEditor(page);
    await page.keyboard.type('x');
    await undo.waitFor({ state: 'detached' });
  });
});
