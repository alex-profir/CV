// The compiler options (spec US1): the design's options by group, each with
// its name and description; a change applies at once to the marks and the
// panes; Reset to defaults puts every one back; the panel names what
// differs from the defaults.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { counted, fill, siteText } from '../../src/site-text.ts';
import { OPTIONS } from '../../src/apps/playground/options.ts';
import type { OptionGroup } from '../../src/apps/playground/options.ts';
import { bundled } from '../helpers/bundled-typescript.ts';
import { errorMarks, openPlaygroundPage, outputText, PLAYGROUND, readErrors, setCode, TOOLBAR, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

const words = siteText.playground.options;
const PANEL = `${PLAYGROUND} section.options-panel`;
const GROUPS: OptionGroup[] = ['language', 'strict', 'checks', 'output'];
const control = (page: Page, name: string) => page.locator(`${PANEL} #playground-option-${name}`);

async function openOptions(page: Page): Promise<void> {
  await page.locator(`${TOOLBAR} button.options`).click();
  await page.waitForSelector(PANEL);
}

async function ready(page: Page, code: string): Promise<void> {
  await setCode(page, code);
  await waitForCode(page, code);
  await waitChecked(page);
}

// Every control's value: checked for a flag, the chosen value for target.
const values = (page: Page) =>
  page.locator(`${PANEL} :is(input[type="checkbox"], select)`).evaluateAll((controls) => Object.fromEntries(controls.map((item) => [item.id.replace('playground-option-', ''), item instanceof HTMLSelectElement ? item.value : (item as HTMLInputElement).checked])));

describe('008-typescript-playground-FR-024: the panel lists the design\'s options by group, with names and descriptions', () => {
  test('a fieldset per group, each option with its name in code and its description as the control\'s description', async () => {
    const page = await openPlaygroundPage();
    await openOptions(page);
    const fieldsets = page.locator(`${PANEL} fieldset`);
    expect(await fieldsets.locator('legend').allTextContents()).toEqual(GROUPS.map((group) => words.groups[group]));
    for (const [index, group] of GROUPS.entries()) {
      const names = await fieldsets.nth(index).locator('label code').allTextContents();
      expect(names).toEqual(OPTIONS.filter((option) => option.group === group).map((option) => option.name));
    }
    for (const option of OPTIONS) {
      const described = await control(page, option.name).evaluate((item) => document.getElementById(item.getAttribute('aria-describedby') ?? '')?.textContent ?? '');
      expect(described, option.name).toBe(option.description);
    }
    expect(await page.locator(`${PANEL} select#playground-option-target option`).count()).toBe(OPTIONS.find((option) => option.name === 'target')!.kind === 'choice' ? (OPTIONS.find((option) => option.name === 'target') as { values: readonly string[] }).values.length : 0);
  });
});

describe('008-typescript-playground-FR-025: a change applies at once, and Reset to defaults puts every option back', () => {
  test('turning strict off removes a strict-only error from the editor and the Errors pane, with no reload', async () => {
    const page = await openPlaygroundPage();
    const code = 'function twice(x) {\n  return x * 2;\n}';
    expect(bundled(code).diagnostics().map((entry) => entry.code)).toEqual([7006]);
    expect(bundled(code, { strict: false, noImplicitAny: false, strictNullChecks: false, strictFunctionTypes: false, strictBindCallApply: false, strictPropertyInitialization: false, strictBuiltinIteratorReturn: false, noImplicitThis: false, useUnknownInCatchVariables: false }).diagnostics()).toEqual([]);
    await ready(page, code);
    await page.evaluate(() => ((window as unknown as { stayed: boolean }).stayed = true));
    expect(await errorMarks(page)).toBeGreaterThan(0);
    expect(await readErrors(page)).toHaveLength(1);
    await openOptions(page);
    await control(page, 'strict').uncheck();
    expect(await control(page, 'noImplicitAny').isChecked()).toBe(false);
    await page.keyboard.press('Escape');
    await waitChecked(page);
    await expect.poll(() => errorMarks(page)).toBe(0);
    expect(await readErrors(page)).toEqual([]);
    expect(await page.evaluate(() => (window as unknown as { stayed?: boolean }).stayed)).toBe(true);
  });

  test('the target changes the JavaScript at once', async () => {
    const page = await openPlaygroundPage();
    const code = 'const total = 2 ** 3;\nconst name = undefined ?? "none";';
    await ready(page, code);
    await openOptions(page);
    await control(page, 'target').selectOption('ES2015');
    await page.locator(`${TOOLBAR} button.options`).click();
    await waitChecked(page);
    await expect.poll(async () => (await outputText(page, 'javascript')).trim()).toBe(bundled(code, { target: 'ES2015' }).emit().javascript.trim());
  });

  test('Reset to defaults restores each option, and the sentence names what differs', async () => {
    const page = await openPlaygroundPage();
    await openOptions(page);
    const defaults = await values(page);
    expect(await page.locator(`${PANEL} .options-foot`).textContent()).toBe(words.changedNone);
    await control(page, 'target').selectOption('ES2020');
    await control(page, 'noUnusedLocals').check();
    await control(page, 'declaration').uncheck();
    expect(await page.locator(`${PANEL} .options-foot`).textContent()).toBe(fill(counted(words.changed, 3), { names: 'target, noUnusedLocals, declaration' }));
    await page.locator(`${PANEL} button.options-defaults`).click();
    expect(await values(page)).toEqual(defaults);
    expect(await page.locator(`${PANEL} .options-foot`).textContent()).toBe(words.changedNone);
    await control(page, 'removeComments').check();
    expect(await page.locator(`${PANEL} .options-foot`).textContent()).toBe(fill(counted(words.changed, 1), { names: 'removeComments' }));
  });

  test('opening the panel focuses its first control; Escape closes it and returns to Options', async () => {
    const page = await openPlaygroundPage();
    await openOptions(page);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('playground-option-target');
    await page.keyboard.press('Escape');
    await expect.poll(() => page.locator(PANEL).count()).toBe(0);
    await expect.poll(() => page.evaluate(() => document.activeElement?.matches('.playground-toolbar button.options') ?? false)).toBe(true);
    await page.click('#menu-title-app');
    await page.getByRole('menuitem', { name: siteText.playground.menu.options, exact: true }).click();
    await page.waitForSelector(PANEL);
  });
});
