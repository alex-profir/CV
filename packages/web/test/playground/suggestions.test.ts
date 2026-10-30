// Suggestions while typing (spec US1): a value's properties with their
// types, chosen with Enter, Tab or a click, opened with Ctrl+Space, and the
// parameters card inside a call marking the current parameter.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { EDITOR, editorText, openPlaygroundPage, setCode, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

const BASE = 'const job = { title: "Engineer", years: 3 };\nfunction pay(rate: number, hours: number): number { return rate * hours; }\n';
const SUGGEST = `${EDITOR} .suggest-widget.visible`;

const rows = (page: Page) => page.locator(`${SUGGEST} .monaco-list-row`).evaluateAll((list) => list.map((row) => (row.textContent ?? '').replace(/ /g, ' ')));

// The code, with the cursor at its end.
async function ready(page: Page, tail = ''): Promise<void> {
  const code = `${BASE}${tail}`;
  await setCode(page, code);
  await waitForCode(page, code);
  await waitChecked(page);
}

async function suggestAfterDot(page: Page): Promise<void> {
  await ready(page);
  await page.keyboard.type('job.');
  await page.waitForSelector(SUGGEST, { timeout: 10_000 });
  await expect.poll(() => rows(page)).toEqual(expect.arrayContaining([expect.stringContaining('title'), expect.stringContaining('years')]));
}

const lastLine = async (page: Page) => (await editorText(page)).split('\n').at(-1);

describe('008-typescript-playground-FR-018: suggestions with names and types, chosen by key or pointer, and the parameters card', () => {
  test('job. lists its properties with their types', async () => {
    const page = await openPlaygroundPage();
    await suggestAfterDot(page);
    await expect.poll(() => page.locator(`${SUGGEST} .monaco-list-row.focused`).textContent()).toMatch(/title.*string|years.*number/);
  });

  test('Enter, Tab and a click insert the suggestion', async () => {
    const page = await openPlaygroundPage();
    await suggestAfterDot(page);
    await page.keyboard.type('ti');
    await page.keyboard.press('Enter');
    await expect.poll(() => lastLine(page)).toBe('job.title');

    await page.keyboard.press('Enter');
    await page.keyboard.type('job.ye');
    await page.waitForSelector(SUGGEST);
    await page.keyboard.press('Tab');
    await expect.poll(() => lastLine(page)).toBe('job.years');

    await page.keyboard.press('Enter');
    await page.keyboard.type('job.');
    await page.waitForSelector(SUGGEST);
    await page.locator(`${SUGGEST} .monaco-list-row`).filter({ hasText: 'title' }).click();
    await expect.poll(() => lastLine(page)).toBe('job.title');
  });

  test('Ctrl+Space opens them', async () => {
    const page = await openPlaygroundPage();
    await ready(page, 'job.');
    await page.keyboard.press('Escape');
    expect(await page.locator(SUGGEST).count()).toBe(0);
    await page.keyboard.press('Control+Space');
    await page.waitForSelector(SUGGEST, { timeout: 10_000 });
    await expect.poll(() => rows(page)).toEqual(expect.arrayContaining([expect.stringContaining('title')]));
  });

  test('inside a call the parameters card marks the current parameter', async () => {
    const page = await openPlaygroundPage();
    await ready(page);
    const card = `${EDITOR} .parameter-hints-widget.visible`;
    await page.keyboard.type('pay(');
    await page.waitForSelector(card, { timeout: 10_000 });
    await expect.poll(() => page.locator(`${card} .signature .parameter.active`).textContent()).toBe('rate: number');
    await page.keyboard.type('20, ');
    await expect.poll(() => page.locator(`${card} .signature .parameter.active`).textContent()).toBe('hours: number');
  });
});
