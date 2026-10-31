// The panes beside the editor (spec US1): four tabs in the design's order,
// the JavaScript and the declarations TypeScript gives for the current
// options, read only and copyable, the errors with their places, and the
// sentences shown in place of output that isn't produced.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { fill, siteText } from '../../src/site-text.ts';
import { bundled } from '../helpers/bundled-typescript.ts';
import { EDITOR, engine, onMac, openPlaygroundPage, outputText, paneTab, paneText, PLAYGROUND, readErrors, setCode, showPane, TOOLBAR, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

const words = siteText.playground.panes;
const TABS = `${PLAYGROUND} .pane-tabs [role="tab"]`;
const CODE = ['interface Job { title: string; years: number }', 'const job: Job = { title: "Engineer", years: 3 };', 'export function describe(job: Job): string {', '  return `${job.title}, ${job.years} years`;', '}'].join('\n');

async function ready(page: Page, code: string): Promise<void> {
  await setCode(page, code);
  await waitForCode(page, code);
  await waitChecked(page);
}

const status = (page: Page) => page.locator(`${PLAYGROUND} .playground-status span`).first().textContent();

async function setOption(page: Page, name: string, on: boolean): Promise<void> {
  await page.locator(`${TOOLBAR} button.options`).click();
  await page.locator(`${PLAYGROUND} #playground-option-${name}`).setChecked(on);
  await page.keyboard.press('Escape');
  await waitChecked(page);
}

describe('008-typescript-playground-FR-020: four panes beside the editor, Errors and Logs naming their counts', () => {
  test("the tabs read JavaScript, Declarations, Errors and Logs, with JavaScript open first", async () => {
    const page = await openPlaygroundPage();
    await ready(page, 'const n: number = "one";');
    const tabs = page.locator(TABS);
    expect((await tabs.allTextContents()).map((tab) => tab.trim())).toEqual([words.javascript, `${words.errors}1`, `${words.logs}0`].length === 3 ? [words.javascript, words.declarations, `${words.errors}1`, `${words.logs}0`] : []);
    expect(await tabs.first().getAttribute('aria-selected')).toBe('true');
    expect(await page.locator(`${PLAYGROUND} .pane-errors`).count()).toBe(0);
  });

  test('the arrow keys move between the tabs', async () => {
    const page = await openPlaygroundPage();
    await paneTab(page, 'javascript').focus();
    await page.keyboard.press('ArrowRight');
    expect(await paneTab(page, 'declarations').getAttribute('aria-selected')).toBe('true');
    expect(await paneTab(page, 'declarations').evaluate((tab) => tab === document.activeElement)).toBe(true);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    expect(await paneTab(page, 'logs').getAttribute('aria-selected')).toBe('true');
    await page.keyboard.press('Home');
    expect(await paneTab(page, 'javascript').getAttribute('aria-selected')).toBe('true');
  });
});

describe('008-typescript-playground-FR-021: the JavaScript and Declarations panes show what TypeScript produces, read only and copyable', () => {
  test('both equal the emit for the code with the current options, and follow a change', async () => {
    const page = await openPlaygroundPage();
    await ready(page, CODE);
    const expected = bundled(CODE).emit();
    await expect.poll(async () => (await outputText(page, 'javascript')).trim()).toBe(expected.javascript.trim());
    await expect.poll(async () => (await outputText(page, 'declarations')).trim()).toBe(expected.declarations!.trim());

    const changed = `${CODE}\nexport const total = 2 + 3;`;
    await ready(page, changed);
    await expect.poll(async () => (await outputText(page, 'declarations')).trim()).toBe(bundled(changed).emit().declarations!.trim());
    await setOption(page, 'removeComments', true);
    const commented = '// a comment\nconst one = 1;';
    await ready(page, commented);
    await expect.poll(async () => (await outputText(page, 'javascript')).trim()).toBe(bundled(commented, { removeComments: true }).emit().javascript.trim());
  });

  test('they are read only, colored, and copy their selection', async () => {
    const page = await openPlaygroundPage();
    await ready(page, CODE);
    const pane = await showPane(page, 'javascript');
    await expect.poll(async () => (await outputText(page, 'javascript')).trim()).not.toBe('');
    const before = (await outputText(page, 'javascript')).trim();
    await pane.locator('.view-lines').click();
    await page.keyboard.type('typed');
    expect((await outputText(page, 'javascript')).trim()).toBe(before);
    const classes = await pane.locator('.view-line span span').evaluateAll((spans) => new Set(spans.map((span) => span.className)).size);
    expect(classes).toBeGreaterThan(2);
    if (engine() === 'chromium') {
      const primary = (await onMac(page)) ? 'Meta' : 'Control';
      await page.keyboard.press(`${primary}+KeyA`);
      await page.keyboard.press(`${primary}+KeyC`);
      expect((await page.evaluate(() => navigator.clipboard.readText())).trim()).toBe(bundled(CODE).emit().javascript.trim());
    }
  });
});

describe('008-typescript-playground-FR-022: the Errors pane lists each error with its place, message and number', () => {
  test('each error reads line:column, message and TS number, and activating one moves the cursor there', async () => {
    const page = await openPlaygroundPage();
    const code = 'const a = 1;\nconst n: number = "one";\nlet s: string = 2;';
    await ready(page, code);
    const expected = bundled(code).diagnostics();
    const shown = await readErrors(page);
    expect(shown).toHaveLength(expected.length);
    for (const [index, entry] of expected.entries()) {
      const text = shown[index]!.replace(/\s+/g, ' ');
      expect(text).toContain(`${entry.line}:${entry.column}`);
      expect(text).toContain(entry.message);
      expect(text).toContain(`TS${entry.code}`);
    }
    const last = expected.at(-1)!;
    await page.locator(`${PLAYGROUND} .pane-errors li > button.error`).last().click();
    await expect.poll(() => status(page)).toBe(`Ln ${last.line}, Col ${last.column}`);
    expect(await page.evaluate((selector) => document.activeElement?.closest(selector) !== null, EDITOR)).toBe(true);
  });

  test('with none, the pane says so', async () => {
    const page = await openPlaygroundPage();
    await ready(page, 'const fine = 1;');
    expect(await paneText(page, 'errors')).toBe(words.noErrors);
  });
});

describe('008-typescript-playground-FR-023: a pane with no output says why', () => {
  test("with declaration off, the Declarations pane gives the design's sentence", async () => {
    const page = await openPlaygroundPage();
    await ready(page, CODE);
    await setOption(page, 'declaration', false);
    await expect.poll(async () => (await showPane(page, 'declarations')).locator('p.empty').textContent()).toBe(fill(words.noDeclarations, { option: 'declaration' }));
  });

  test('with noEmitOnError and an error, both panes give their sentences', async () => {
    const page = await openPlaygroundPage();
    await setOption(page, 'noEmitOnError', true);
    await ready(page, 'const n: number = "one";');
    await expect.poll(async () => (await showPane(page, 'javascript')).locator('p.empty').textContent()).toBe(fill(words.noJavaScript, { option: 'noEmitOnError' }));
    await expect.poll(async () => (await showPane(page, 'declarations')).locator('p.empty').textContent()).toBe(fill(words.noDeclarationsOnError, { option: 'noEmitOnError' }));
  });
});
