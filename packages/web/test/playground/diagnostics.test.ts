// Live errors (spec US1): every error TypeScript reports is marked within a
// second of a pause, with its message on hover and after the cursor's line,
// and a slow check shows it is still checking rather than old results.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { bundled } from '../helpers/bundled-typescript.ts';
import { EDITOR, editorText, errorMarks, openPlaygroundPage, PLAYGROUND, readErrors, setCode, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

const STATUS_CHECK = `${PLAYGROUND} .playground-status .check`;

async function emptyEditor(page: Page): Promise<void> {
  await setCode(page, ' ');
  await page.keyboard.press('Backspace');
  await expect.poll(() => editorText(page)).toBe('');
  await waitChecked(page);
}

describe('008-typescript-playground-FR-016: errors are marked within a second of a pause, with their messages (SC-002)', () => {
  test('const n: number = "one" is marked within 1 s of the last key, with its message on hover and after the line', async () => {
    const page = await openPlaygroundPage();
    await emptyEditor(page);
    const code = 'const n: number = "one";';
    const [expected] = bundled(code).diagnostics();
    expect(expected?.code).toBe(2322);
    await page.keyboard.type(code);
    const lastKey = Date.now();
    await page.waitForSelector(`${EDITOR} .squiggly-error`, { timeout: 5_000 });
    const ms = Date.now() - lastKey;
    expect(ms, `${ms} ms`).toBeLessThanOrEqual(1_000);
    expect(await editorText(page)).toBe(code);

    const inline = () => page.locator(`${EDITOR} .playground-inline-message`).evaluateAll((list) => list.map((item) => (item.textContent ?? '').replace(/\u00a0/g, ' ')).join(''));
    await expect.poll(inline).toBe(expected!.message);

    const mark = (await page.locator(`${EDITOR} .squiggly-error`).first().boundingBox())!;
    await page.mouse.move(mark.x + mark.width / 2, mark.y + mark.height / 2);
    await expect.poll(() => page.locator(`${EDITOR} .monaco-hover:not(.hidden)`).first().textContent(), { timeout: 10_000 }).toContain(expected!.message);
  });

  test('every error of a fixture is marked, and the Errors pane lists each as TypeScript gives it', async () => {
    const page = await openPlaygroundPage();
    const code = ['const a: number = "one";', 'let b: string = 2;', 'missing(3);', 'const c = { x: 1 };', 'c.y;', 'function f(x: number): string { return x; }'].join('\n');
    const expected = bundled(code).diagnostics();
    expect(expected.length).toBeGreaterThanOrEqual(5);
    await setCode(page, code);
    await waitForCode(page, code);
    await waitChecked(page);
    expect(await errorMarks(page)).toBeGreaterThanOrEqual(expected.length);
    const shown = await readErrors(page);
    expect(shown).toHaveLength(expected.length);
    for (const [index, entry] of expected.entries()) {
      const text = shown[index]!.replace(/\s+/g, ' ');
      expect(text).toContain(`${entry.line}:${entry.column}`);
      expect(text).toContain(entry.message.replace(/\s+/g, ' '));
      expect(text).toContain(`TS${entry.code}`);
    }
  });

  test('with checking slowed by a 2,000-line paste, the status reads Checking… and the marks and the Errors pane dim until the result', async () => {
    const page = await openPlaygroundPage();
    await setCode(page, 'const n: number = "one";');
    await waitChecked(page);
    await page.locator(`${PLAYGROUND} .pane-tabs [role="tab"]`).nth(2).click();
    const lines = Array.from({ length: 2_000 }, (_, i) => `const v${i} = [${Array.from({ length: 40 }, (_, j) => j).join(', ')}].map((x) => ({ k: x * ${i}, s: String(x) })).filter((y) => y.k > 2).reduce((a, b) => a + b.k, 0);`);
    const code = ['const n: number = "one";', ...lines].join('\n');
    const seen = page.waitForFunction(
      ({ status, editor }) => (document.querySelector(status)?.textContent ?? '').includes('Checking…') && document.querySelector(`${editor}.is-checking`) !== null && document.querySelector('#os section.playground .pane.is-checking') !== null,
      { status: STATUS_CHECK, editor: EDITOR },
      { polling: 'raf', timeout: 20_000 },
    );
    await setCode(page, code);
    await seen;
    await page.waitForFunction((status) => !(document.querySelector(status)?.textContent ?? '').includes('Checking…'), STATUS_CHECK, { timeout: 60_000 });
    expect(await page.locator(`${EDITOR}.is-checking`).count()).toBe(0);
    expect(await page.locator(`${PLAYGROUND} .pane.is-checking`).count()).toBe(0);
  });
});
