// Kept code (spec US1): a fresh browser holds Welcome and stores nothing;
// after that the visitor's code and options come back after closing the
// window, a reload and a new page; a browser that can't keep them says so
// once; a kept option this version doesn't know is left out and named.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { fill, siteText } from '../../src/site-text.ts';
import { welcome } from '../../src/apps/playground/examples/index.ts';
import { settle, waitForReady } from '../helpers/shell.ts';
import { chooseExample, editorText, focusEditor, freshProfile, MESSAGE, onMac, openPlayground, PLAYGROUND, setCode, TOOLBAR, waitChecked, waitForCode, waitReady } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

const KEY = 'cv-playground';
const OPTION = 'noUncheckedIndexedAccess';
const WINDOW = '#os .window[data-view="playground"]';
const messages = siteText.playground.messages;

const kept = (page: Page) => page.evaluate((key) => localStorage.getItem(key), KEY);

// The editor shows the start of `code`, as far as it is on screen.
async function showsStartOf(page: Page, code: string): Promise<void> {
  await expect
    .poll(async () => {
      const shown = await editorText(page);
      return code.split('\n').slice(0, shown.split('\n').length).join('\n') === shown;
    })
    .toBe(true);
}

const option = (page: Page) => page.locator(`${PLAYGROUND} section.options-panel #playground-option-${OPTION}`);

async function openOptions(page: Page): Promise<void> {
  if ((await page.locator(`${TOOLBAR} button.options`).getAttribute('aria-pressed')) !== 'true') await page.locator(`${TOOLBAR} button.options`).click();
  await page.waitForSelector(`${PLAYGROUND} section.options-panel`);
}

async function closeWindow(page: Page): Promise<void> {
  await page.getByRole('button', { name: `Close ${siteText.os.views.playground}` }).click();
  await expect.poll(() => page.locator(WINDOW).count()).toBe(0);
}

async function reopen(page: Page): Promise<void> {
  await openPlayground(page);
  await waitReady(page);
}

describe('008-typescript-playground-FR-019: the starting example first, then the visitor\'s code, kept in this browser', () => {
  test('a fresh browser holds Welcome with the defaults and stores nothing', async () => {
    const page = await freshProfile();
    await reopen(page);
    await showsStartOf(page, welcome(await onMac(page)).code);
    await openOptions(page);
    expect(await page.locator(`${PLAYGROUND} .options-foot`).textContent()).toBe(siteText.playground.options.changedNone);
    await page.waitForTimeout(1_000);
    expect(await kept(page)).toBeNull();
    await closeWindow(page);
    expect(await kept(page)).toBeNull();
  });

  test('after an edit and an option change, closing the window, a reload and a new page hold both', async () => {
    const page = await freshProfile();
    await reopen(page);
    const code = 'const kept: string[] = ["one"];';
    await setCode(page, code);
    await waitForCode(page, code);
    await openOptions(page);
    await option(page).check();
    await page.waitForTimeout(500);
    expect(JSON.parse((await kept(page))!)).toEqual({ format: 1, code, options: { [OPTION]: true } });

    const holdsBoth = async (target: Page, step: string) => {
      await expect.poll(() => editorText(target), { message: step }).toBe(code);
      await openOptions(target);
      expect(await option(target).isChecked(), step).toBe(true);
    };
    await closeWindow(page);
    await reopen(page);
    await holdsBoth(page, 'closed and opened');
    await page.reload();
    await page.waitForSelector('#os[data-ready]', { state: 'attached' });
    await settle(page);
    await reopen(page);
    await holdsBoth(page, 'reloaded');
    const second = await page.context().newPage();
    await second.goto(page.url());
    await second.waitForSelector('#os[data-ready]', { state: 'attached' });
    await settle(second);
    await reopen(second);
    await holdsBoth(second, 'new page');
  });

  test("with localStorage throwing, cantKeepCode shows once and the code stays while the page is open", async () => {
    const page = await freshProfile({
      beforeGoto: async (target) => {
        await target.addInitScript(() => {
          const refuse = () => {
            throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
          };
          Storage.prototype.getItem = refuse;
          Storage.prototype.setItem = refuse;
        });
      },
    });
    await reopen(page);
    const code = 'let stays = 1;';
    await setCode(page, code);
    await waitForCode(page, code);
    await expect.poll(async () => (await page.locator(MESSAGE).textContent())?.trim() ?? '').toContain(messages.cantKeepCode);
    await page.locator(`${MESSAGE} button.dismiss`).click();
    await focusEditor(page);
    await page.keyboard.press('End');
    await page.keyboard.type(' ');
    await waitChecked(page);
    await page.waitForTimeout(800);
    expect(await page.locator(MESSAGE).count()).toBe(0);
    await closeWindow(page);
    await reopen(page);
    await expect.poll(() => editorText(page)).toBe(`${code} `);
  });

  test('a kept option this version doesn\'t know is left out and named', async () => {
    const page = await freshProfile({
      beforeGoto: async (target) => {
        await target.addInitScript((key) => {
          if (sessionStorage.getItem('planted') === null) {
            sessionStorage.setItem('planted', '1');
            localStorage.setItem(key, JSON.stringify({ format: 1, code: 'let older = 1;', options: { oldOption: true, removeComments: true } }));
          }
        }, KEY);
      },
    });
    await reopen(page);
    await expect.poll(() => editorText(page)).toBe('let older = 1;');
    const expected = fill(messages.unknownKeptOptions.one, { n: 1, names: 'oldOption' });
    await expect.poll(async () => (await page.locator(MESSAGE).textContent())?.trim() ?? '').toContain(expected);
    await openOptions(page);
    expect(await page.locator(`${PLAYGROUND} section.options-panel #playground-option-removeComments`).isChecked()).toBe(true);
  });
});

describe('008-typescript-playground-FR-026: the compiler options are kept as the code is', () => {
  test('choosing Welcome or editing back to it keeps nothing, so a reload shows Welcome; Undo keeps the code again', async () => {
    const page = await freshProfile();
    await reopen(page);
    const start = welcome(await onMac(page));
    const code = 'console.log("older code");';
    await setCode(page, code);
    await waitForCode(page, code);
    await expect.poll(() => kept(page)).toContain('older code');
    await chooseExample(page, start.title);
    await showsStartOf(page, start.code);
    await expect.poll(() => kept(page)).toBeNull();
    await page.locator(`${MESSAGE} button`).filter({ hasText: messages.actions.undo }).click();
    await waitForCode(page, code);
    await expect.poll(() => kept(page)).toContain('older code');
    await chooseExample(page, start.title);
    await expect.poll(() => kept(page)).toBeNull();
    await page.reload();
    await waitForReady(page);
    await settle(page);
    await reopen(page);
    await showsStartOf(page, start.code);
  });

  test('an option changed alone is kept and comes back after a reload', async () => {
    const page = await freshProfile();
    await reopen(page);
    await openOptions(page);
    await option(page).check();
    await page.waitForTimeout(500);
    expect(JSON.parse((await kept(page))!).options).toEqual({ [OPTION]: true });
    await page.reload();
    await page.waitForSelector('#os[data-ready]', { state: 'attached' });
    await settle(page);
    await reopen(page);
    await openOptions(page);
    expect(await option(page).isChecked()).toBe(true);
  });
});
