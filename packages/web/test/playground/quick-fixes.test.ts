// Quick fixes (spec US1): the lightbulb on a fixable line, the fixes from
// the keyboard, TypeScript's change when one is chosen, Undo taking it
// back, and no fix that would import a package.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { bundled, CODE_FILE, ts } from '../helpers/bundled-typescript.ts';
import { EDITOR, editorText, onMac, openPlaygroundPage, PLAYGROUND, setCode, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

const CODE = 'interface Job { title: string; years: number }\nconst job: Job = {};';
const MENU = '.action-widget';

const status = (page: Page) => page.locator(`${PLAYGROUND} .playground-status span`).first().textContent();

async function onLine(page: Page, code: string, line: number, column: number): Promise<void> {
  await setCode(page, code);
  await waitForCode(page, code);
  await waitChecked(page);
  await page.keyboard.press('Control+KeyG');
  await page.keyboard.type(`${line}:${column}`);
  await page.keyboard.press('Enter');
  await expect.poll(() => status(page)).toBe(`Ln ${line}, Col ${column}`);
}

const fixes = (page: Page) => page.locator(`${MENU} .action-widget-action-label, ${MENU} .monaco-list-row .title`).allTextContents();

async function openFixes(page: Page): Promise<void> {
  await page.keyboard.press(`${(await onMac(page)) ? 'Meta' : 'Control'}+Period`);
  await page.waitForSelector(MENU, { timeout: 10_000 });
}

describe('008-typescript-playground-FR-082: quick fixes as TypeScript offers them, without package imports', () => {
  test('the lightbulb shows on a fixable line, and Ctrl+. lists Add missing properties', async () => {
    const page = await openPlaygroundPage();
    await onLine(page, CODE, 2, 7);
    const bulb = page.locator(`${EDITOR} :is(.lightBulbWidget, [class*="codicon-gutter-lightbulb"], [class*="codicon-light-bulb"])`);
    await expect.poll(async () => (await bulb.evaluateAll((list) => list.filter((item) => item.getClientRects().length > 0 && getComputedStyle(item).visibility !== 'hidden').length)) > 0, { timeout: 10_000 }).toBe(true);
    await openFixes(page);
    await expect.poll(() => fixes(page)).toContain('Add missing properties');
  });

  test("choosing it changes the code as TypeScript sets, and Undo reverts", async () => {
    const page = await openPlaygroundPage();
    await onLine(page, CODE, 2, 7);
    const service = bundled(CODE);
    const start = service.offset(2, 7);
    const [diagnostic] = service.diagnostics();
    const format = { ...ts.getDefaultFormatCodeSettings('\n'), indentSize: 2, tabSize: 2, convertTabsToSpaces: true };
    const fix = service.service.getCodeFixesAtPosition(CODE_FILE, start, start + 3, [diagnostic!.code], format, {}).find((entry: { description: string }) => entry.description === 'Add missing properties');
    const edits = fix.changes.flatMap((change: { textChanges: unknown[] }) => change.textChanges) as { span: { start: number; length: number }; newText: string }[];
    const expected = edits.sort((a, b) => b.span.start - a.span.start).reduce((text, edit) => text.slice(0, edit.span.start) + edit.newText + text.slice(edit.span.start + edit.span.length), CODE);
    await openFixes(page);
    await page.locator(MENU).getByText('Add missing properties', { exact: true }).click();
    await expect.poll(() => editorText(page)).toBe(expected);
    await page.keyboard.press(`${(await onMac(page)) ? 'Meta' : 'Control'}+KeyZ`);
    await expect.poll(() => editorText(page)).toBe(CODE);
  });

  test('no fix imports a package for a missing name', async () => {
    const page = await openPlaygroundPage();
    await onLine(page, 'const value = readFileSync("a.txt");', 1, 15);
    await openFixes(page).catch(() => undefined);
    const offered = await fixes(page);
    expect(offered.filter((title) => /import/i.test(title))).toEqual([]);
  });
});
