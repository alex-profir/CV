// The editor with a screen reader (spec US6, FR-063): it is named and
// described, its code is read line by line, the next error reaches a live
// region, the type under the cursor takes focus to be read, and suggestions
// are a list moved through by its active descendant.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { siteText } from '../../src/site-text.ts';
import { press } from '../helpers/shell.ts';
import { EDITOR, focusEditor, onMac, openPlaygroundPage, PLAYGROUND, run, setCode, showPane, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 240_000 });

const INPUT = `${EDITOR} textarea`;

// The editor's own primary key, as it reads the system from the user agent.
const mod = async (page: Page) => ((await page.evaluate(() => /Macintosh|Mac OS X/.test(navigator.userAgent))) ? 'Meta' : 'Control');

// Every live region's text on the page.
const liveText = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[aria-live], [role="alert"], [role="status"], [role="log"]')]
      .filter((element) => element.getAttribute('aria-live') !== 'off')
      .map((element) => element.textContent ?? '')
      .join('\n'),
  );

describe('008-typescript-playground-FR-063: the editor is named, read line by line, and tells errors, types and suggestions', () => {
  test('the output panes are named in site text, not by code words', async () => {
    const page = await openPlaygroundPage();
    for (const [pane, name] of [['javascript', siteText.playground.panes.javascript], ['declarations', siteText.playground.panes.declarations]] as const) {
      const shown = await showPane(page, pane);
      await expect.poll(() => shown.locator('textarea').first().getAttribute('aria-label')).toBe(name);
    }
  });

  test("the editor's input is named Code editor and described, in screen-reader mode", async () => {
    const page = await openPlaygroundPage();
    const input = page.locator(INPUT).first();
    expect(await input.getAttribute('aria-label')).toBe(siteText.playground.editor.name);
    const describedBy = await input.getAttribute('aria-describedby');
    const description = siteText.playground.editor.description[(await onMac(page)) ? 'mac' : 'other'];
    expect((await page.locator(`[id="${describedBy}"]`).textContent())?.trim()).toBe(description);
    expect(await input.getAttribute('aria-multiline')).toBe('true');
    const code = 'const first = 1;\nconst second = 2;';
    await setCode(page, code);
    await waitForCode(page, code.split('\n')[0]!);
    await focusEditor(page);
    const key = await mod(page);
    await press(page, `${key}+ArrowUp`, 'End');
    await expect.poll(() => input.inputValue()).toContain('const first = 1;');
    await press(page, 'ArrowDown');
    await expect.poll(() => input.inputValue()).toContain('const second = 2;');
  });

  test('F8 moves to the next error and its message reaches a live region', async () => {
    const page = await openPlaygroundPage();
    const code = 'const fine = 1;\nconst wrong: number = "text";\nconst also: string = 2;';
    await setCode(page, code);
    await waitForCode(page, code.split('\n')[0]!);
    await waitChecked(page);
    await focusEditor(page);
    await press(page, `${await mod(page)}+ArrowUp`);
    await press(page, 'F8');
    await expect.poll(() => page.locator(`${PLAYGROUND} .playground-status span`).first().textContent()).toMatch(/^Ln 2,/);
    await expect.poll(() => liveText(page)).toMatch(/Type 'string' is not assignable to type 'number'/);
    await press(page, 'F8');
    await expect.poll(() => page.locator(`${PLAYGROUND} .playground-status span`).first().textContent()).toMatch(/^Ln 3,/);
    await expect.poll(() => liveText(page)).toMatch(/Type 'number' is not assignable to type 'string'/);
  });

  test('the type under the cursor, shown by its key, takes focus so it is read, and Escape gives focus back', async () => {
    const page = await openPlaygroundPage();
    const code = 'const answer = { value: 42 };';
    await setCode(page, code);
    await waitForCode(page, code);
    await waitChecked(page);
    await focusEditor(page);
    await press(page, 'Home', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight');
    const key = await mod(page);
    await press(page, `${key}+KeyK`, `${key}+KeyI`);
    await expect.poll(() => page.evaluate(() => document.activeElement?.matches('.monaco-hover[role="tooltip"]') ?? false), { timeout: 10_000 }).toBe(true);
    expect(await page.evaluate(() => document.activeElement?.textContent ?? '')).toMatch(/const answer: \{\s*value: number;\s*\}/);
    await press(page, 'Escape');
    await expect.poll(() => page.evaluate((selector) => document.activeElement?.matches(selector) ?? false, INPUT)).toBe(true);
  });

  test('suggestions are a list the input moves through by its active descendant', async () => {
    const page = await openPlaygroundPage();
    await setCode(page, 'const word = "x";\nword.');
    await waitForCode(page, 'const word = "x";');
    await waitChecked(page);
    await focusEditor(page);
    await press(page, `${await mod(page)}+ArrowDown`, 'End');
    await press(page, 'Control+Space');
    const list = page.locator(`${EDITOR} .suggest-widget [role="listbox"]`);
    await list.waitFor({ timeout: 10_000 });
    const input = page.locator(INPUT).first();
    const first = await expect.poll(() => input.getAttribute('aria-activedescendant')).not.toBeNull().then(() => input.getAttribute('aria-activedescendant'));
    expect(await page.locator(`[id="${first}"]`).getAttribute('role')).toBe('option');
    await press(page, 'ArrowDown');
    await expect.poll(() => input.getAttribute('aria-activedescendant')).not.toBe(first);
    const second = await input.getAttribute('aria-activedescendant');
    expect(await page.locator(`[id="${second}"]`).getAttribute('role')).toBe('option');
    expect((await page.locator(`[id="${second}"]`).getAttribute('aria-label')) ?? '').not.toBe('');
  });
});

describe('008-typescript-playground-FR-064: each summary counts only the entries since the last', () => {
  test('the summaries add up to what was logged, rather than each giving the running total', async () => {
    const page = await openPlaygroundPage();
    const code = 'let sent = 0;\nconst timer = setInterval(() => {\n  for (let i = 0; i < 200; i++) console.log(i);\n  sent += 200;\n  if (sent === 6000) clearInterval(timer);\n}, 100);';
    await setCode(page, code);
    await waitChecked(page);
    await page.evaluate(() => {
      const said: string[] = [];
      (window as unknown as { said: string[] }).said = said;
      const region = document.querySelector('#os [role="status"][data-req="005-os-shell-FR-041"]')!;
      new MutationObserver(() => said.push(region.textContent ?? '')).observe(region, { childList: true, subtree: true, characterData: true });
    });
    await run(page, { timeout: 30_000 });
    await page.waitForTimeout(1_500);
    const said = await page.evaluate(() => (window as unknown as { said: string[] }).said);
    const counts = said.flatMap((text) => [...text.matchAll(/^([\d,]+) new log entr/g)].map((match) => Number(match[1]!.replaceAll(',', ''))));
    expect(counts.length).toBeGreaterThan(1);
    const total = counts.reduce((sum, n) => sum + n, 0);
    // The 6,000, and the notes at the start and at the end.
    expect(total).toBeGreaterThanOrEqual(6_000);
    expect(total).toBeLessThanOrEqual(6_002);
  });
});
