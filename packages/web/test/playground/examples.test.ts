// The examples (spec US3, SC-008, SC-014): the panel lists them by group;
// choosing one replaces the code and options with Undo; every example checks
// with no diagnostics and every one that runs to its end finishes with no
// uncaught error; from a fresh open, an example runs in three actions.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { fill, siteText } from '../../src/site-text.ts';
import { examples } from '../../src/apps/playground/examples/index.ts';
import { chooseExample, editorText, MESSAGE, onMac, openPlaygroundPage, PLAYGROUND, readErrors, readLogs, run, RUN_STATE, setCode, stop, TOOLBAR, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 600_000 });

const words = siteText.playground.examples;
const PANEL = `${PLAYGROUND} section.examples-panel`;

const firstLine = (code: string) => code.split('\n')[0]!;

describe('008-typescript-playground-FR-027: the examples panel lists the examples, and one replaces the code with Undo', () => {
  test('the panel lists every example by group, with its title and description, and the note', async () => {
    const page = await openPlaygroundPage();
    const list = examples(await onMac(page));
    await page.locator(`${TOOLBAR} button.examples`).click();
    await page.waitForSelector(PANEL);
    expect(await page.locator(`${TOOLBAR} button.examples`).getAttribute('aria-expanded')).toBe('true');
    expect(await page.locator(`${PANEL} h3`).allTextContents()).toEqual([words.groups.start, words.groups.types, words.groups.running, words.groups.cv]);
    expect(await page.locator(`${PANEL} button.example .example-title`).allTextContents()).toEqual(list.map((example) => example.title));
    expect(await page.locator(`${PANEL} button.example .example-description`).allTextContents()).toEqual(list.map((example) => example.description));
    expect(await page.locator(`${PANEL} button.example[aria-current="true"] .example-title`).allTextContents()).toEqual([list[0]!.title]);
    expect(await page.locator(`${PANEL} .examples-foot`).textContent()).toBe(words.note);
    expect(await page.evaluate(() => document.activeElement?.classList.contains('example'))).toBe(true);
    await page.keyboard.press('Escape');
    await expect.poll(() => page.locator(PANEL).count()).toBe(0);
    await expect.poll(() => page.evaluate(() => document.activeElement?.classList.contains('examples'))).toBe(true);
  });

  test('choosing one replaces the code, says so, and Undo brings the code back', async () => {
    const page = await openPlaygroundPage();
    const mine = 'const mine = "my code";';
    await setCode(page, mine);
    await waitForCode(page, mine);
    const example = examples(await onMac(page)).find((entry) => entry.id === 'generics')!;
    await chooseExample(page, example.title);
    await waitForCode(page, firstLine(example.code));
    expect((await page.locator(MESSAGE).textContent())?.trim()).toContain(fill(siteText.playground.messages.exampleReplaced, { title: example.title }));
    await page.locator(`${TOOLBAR} button.examples`).click();
    expect(await page.locator(`${PANEL} button.example[aria-current="true"] .example-title`).allTextContents()).toEqual([example.title]);
    await page.keyboard.press('Escape');
    await page.locator(MESSAGE).getByRole('button', { name: siteText.playground.messages.actions.undo }).click();
    await expect.poll(() => editorText(page)).toBe(mine);
  });

  test('from a fresh open, Examples, an example and Run are three actions (SC-014)', async () => {
    const page = await openPlaygroundPage();
    await page.locator(`${TOOLBAR} button.examples`).click();
    await page.locator(`${PANEL} button.example`).filter({ hasText: 'Catching errors' }).click();
    await waitChecked(page);
    await run(page);
    expect((await readLogs(page)).some((row) => row.level === 'error')).toBe(true);
  });
});

describe('008-typescript-playground-FR-030: every example checks with no errors, and runs as it says (SC-008)', () => {
  test('every example shows no diagnostics with the defaults and the current CV, and each that runs to its end finishes with no uncaught error', async () => {
    const page = await openPlaygroundPage();
    for (const example of examples(await onMac(page))) {
      await chooseExample(page, example.title);
      await waitForCode(page, firstLine(example.code));
      await waitChecked(page);
      expect(await readErrors(page), example.title).toEqual([]);
      if (example.runs === 'to-end') {
        await run(page, { timeout: 30_000 });
        const state = (await page.locator(RUN_STATE).textContent())?.trim() ?? '';
        expect(state, example.title).toMatch(new RegExp(`^${fill(siteText.playground.runState.finished, { s: '[\\d.]+' })}$`));
        expect((await readLogs(page)).filter((row) => row.line !== null), example.title).toEqual([]);
      } else {
        await run(page, { wait: 'start' });
        await page.waitForTimeout(1_500);
        await stop(page);
      }
    }
  });
});
