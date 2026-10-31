// Moving around the code (spec US1): F12 goes to a definition, Alt+F12
// peeks at it in place, Shift+F12 lists every use and F2 renames every use,
// each as TypeScript works them out.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { bundled, CODE_FILE } from '../helpers/bundled-typescript.ts';
import { EDITOR, editorText, openPlaygroundPage, PLAYGROUND, setCode, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

const CODE = ['function area(width: number, height: number): number {', '  return width * height;', '}', 'const small = area(2, 3);', 'const large = area(10, 20);'].join('\n');
// The call on line 4, at `area`.
const USE = { line: 4, column: 15 };

const status = (page: Page) => page.locator(`${PLAYGROUND} .playground-status span`).first().textContent();

// The code, with the cursor on the use of `area` on line 4.
async function ready(page: Page): Promise<void> {
  await setCode(page, CODE);
  await waitForCode(page, CODE);
  await waitChecked(page);
  await page.keyboard.press('Control+KeyG');
  await page.keyboard.type(`${USE.line}:${USE.column}`);
  await page.keyboard.press('Enter');
  await expect.poll(() => status(page)).toBe(`Ln ${USE.line}, Col ${USE.column}`);
}

// A 1-based place from an offset in the code.
function place(offset: number): { line: number; column: number } {
  const before = CODE.slice(0, offset).split('\n');
  return { line: before.length, column: before.at(-1)!.length + 1 };
}

describe('008-typescript-playground-FR-081: definitions, uses and renames, as TypeScript works them out', () => {
  test('F12 goes to the definition', async () => {
    const page = await openPlaygroundPage();
    await ready(page);
    const service = bundled(CODE);
    const [definition] = service.service.getDefinitionAtPosition(CODE_FILE, service.offset(USE.line, USE.column));
    const target = place(definition.textSpan.start);
    await page.keyboard.press('F12');
    await expect.poll(() => status(page)).toBe(`Ln ${target.line}, Col ${target.column}`);
  });

  test('Alt+F12 peeks at the definition in place, leaving the cursor where it was', async () => {
    const page = await openPlaygroundPage();
    await ready(page);
    await page.keyboard.press('Alt+F12');
    await page.waitForSelector(`${EDITOR} .peekview-widget`, { timeout: 10_000 });
    expect(await page.locator(`${EDITOR} .peekview-widget`).textContent()).toContain('function area(');
    await page.keyboard.press('Escape');
    await expect.poll(() => status(page)).toBe(`Ln ${USE.line}, Col ${USE.column}`);
  });

  test('Shift+F12 lists every use', async () => {
    const page = await openPlaygroundPage();
    await ready(page);
    const service = bundled(CODE);
    const references = service.service.getReferencesAtPosition(CODE_FILE, service.offset(USE.line, USE.column));
    expect(references).toHaveLength(3);
    await page.keyboard.press('Shift+F12');
    await page.waitForSelector(`${EDITOR} .peekview-widget .ref-tree`, { timeout: 10_000 });
    const rows = page.locator(`${EDITOR} .peekview-widget .ref-tree .monaco-list-row`);
    await expect.poll(async () => (await rows.allTextContents()).filter((row) => row.includes('area(')).length).toBe(references.length);
  });

  test('F2 renames every use', async () => {
    const page = await openPlaygroundPage();
    await ready(page);
    const service = bundled(CODE);
    const locations = service.service.findRenameLocations(CODE_FILE, service.offset(USE.line, USE.column), false, false, {});
    const expected = [...locations].sort((a: { textSpan: { start: number } }, b: { textSpan: { start: number } }) => b.textSpan.start - a.textSpan.start).reduce((text: string, location: { textSpan: { start: number; length: number } }) => text.slice(0, location.textSpan.start) + 'surface' + text.slice(location.textSpan.start + location.textSpan.length), CODE);
    await page.keyboard.press('F2');
    const input = page.locator(`${EDITOR} .rename-box input`);
    await input.waitFor({ timeout: 10_000 });
    // Monaco focuses the box 100 ms after showing it. An Enter sent before
    // that is lost about once in 150 times, and a visitor can't be that quick.
    await page.waitForFunction((selector) => document.activeElement === document.querySelector(selector), `${EDITOR} .rename-box input`, { timeout: 10_000 });
    await input.fill('surface');
    await page.keyboard.press('Enter');
    await expect.poll(() => editorText(page)).toBe(expected);
  });
});

describe('008-typescript-playground-FR-081: going to a definition outside the code shows it in place', () => {
  test.each([
    ['cv', 'const n = cv.basics.name;', 11, 'cv'],
    ['console', 'console.log(1);', 1, 'console'],
  ])('F12 on %s peeks at its definition, and the cursor stays', async (_name, code, column, shown) => {
    const page = await openPlaygroundPage();
    await setCode(page, code);
    await waitForCode(page, code);
    await waitChecked(page);
    await page.keyboard.press('Control+KeyG');
    await page.keyboard.type(`1:${column}`);
    await page.keyboard.press('Enter');
    await expect.poll(() => status(page)).toBe(`Ln 1, Col ${column}`);
    await page.keyboard.press('F12');
    await page.waitForSelector(`${EDITOR} .peekview-widget`, { timeout: 10_000 });
    expect(await page.locator(`${EDITOR} .peekview-widget`).textContent()).toContain(shown);
    expect(await status(page)).toBe(`Ln 1, Col ${column}`);
    expect(await editorText(page)).toContain(code.split(' ')[0]);
  });
});
