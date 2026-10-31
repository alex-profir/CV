// A name's type and documentation (spec US1): pointing at it, or asking with
// the keyboard, shows TypeScript's quick info for it.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { bundled, CODE_FILE, ts } from '../helpers/bundled-typescript.ts';
import { EDITOR, onMac, openPlaygroundPage, setCode, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

const CODE = ['/** Says hello to someone, by name. */', 'function greet(name: string, times = 1): string {', '  return `Hello, ${name}`.repeat(times);', '}', 'greet("Ada");'].join('\n');

// What TypeScript's quick info says of the name at a line and column.
function quickInfo(line: number, column: number): { signature: string; documentation: string } {
  const service = bundled(CODE);
  const info = service.service.getQuickInfoAtPosition(CODE_FILE, service.offset(line, column));
  return { signature: ts.displayPartsToString(info.displayParts), documentation: ts.displayPartsToString(info.documentation) };
}

const hoverText = (page: Page) => page.locator(`${EDITOR} .monaco-hover:not(.hidden)`).first().evaluate((hover) => (hover.textContent ?? '').replace(/ /g, ' '));

async function ready(page: Page): Promise<void> {
  await setCode(page, CODE);
  await waitForCode(page, CODE);
  await waitChecked(page);
}

describe('008-typescript-playground-FR-017: a name shows its type and documentation, as TypeScript describes it', () => {
  test('pointing at a name shows its quick info', async () => {
    const page = await openPlaygroundPage();
    await ready(page);
    const expected = quickInfo(5, 1);
    expect(expected.documentation).toBe('Says hello to someone, by name.');
    const name = page.locator(`${EDITOR} .view-line`).filter({ hasText: /^greet\(/ }).locator('span span').first();
    const at = (await name.boundingBox())!;
    await page.mouse.move(at.x + 4, at.y + at.height / 2);
    await expect.poll(() => hoverText(page), { timeout: 10_000 }).toContain(expected.signature);
    expect(await hoverText(page)).toContain(expected.documentation);
  });

  test('Ctrl+K Ctrl+I on the name under the cursor shows the same', async () => {
    const page = await openPlaygroundPage();
    await ready(page);
    const expected = quickInfo(5, 1);
    const primary = (await onMac(page)) ? 'Meta' : 'Control';
    await page.keyboard.press(`${primary}+End`);
    await page.keyboard.press('Home');
    await page.keyboard.press(`${primary}+KeyK`);
    await page.keyboard.press(`${primary}+KeyI`);
    await expect.poll(() => hoverText(page), { timeout: 10_000 }).toContain(expected.signature);
    expect(await hoverText(page)).toContain(expected.documentation);
  });
});
