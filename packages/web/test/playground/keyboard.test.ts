// The Playground by keys alone (spec US6, FR-062): every action, with focus
// always visible; Tab indents in the editor until its key makes Tab move
// focus, which the editor's description names; and the shell's shortcuts
// work from inside the editor.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { siteText } from '../../src/site-text.ts';
import { focusedElement, focusIndicator, frontWindow, press } from '../helpers/shell.ts';
import { EDITOR, editorText, focusEditor, MESSAGE, openPlaygroundPage, paneTab, PLAYGROUND, POPUP, running, setCode, TOOLBAR, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 240_000 });

const words = siteText.playground;
const INPUT = `${EDITOR} textarea`;

const inEditor = (page: Page) => page.evaluate((selector) => document.activeElement?.closest(selector) !== null, EDITOR);
const focusedIs = (page: Page, selector: string) => page.evaluate((target) => document.activeElement?.matches(target) ?? false, selector);

async function expectIndicator(page: Page, step: string): Promise<void> {
  const indicator = await focusIndicator(page);
  expect(indicator.ok, `${step}: ${await focusedElement(page)} ${JSON.stringify(indicator)}`).toBe(true);
}

// The editor reads the system from the user agent, the page's labels from
// the platform: a faked system fakes both.
const USER_AGENTS = {
  Windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  macOS: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
} as const;

// Whether the editor takes the system for a Mac.
const editorOnMac = (page: Page) => page.evaluate(() => /Macintosh|Mac OS X/.test(navigator.userAgent));

// The editor's key that makes Tab move focus (FR-083).
const tabKey = async (page: Page) => ((await editorOnMac(page)) ? 'Control+Shift+KeyM' : 'Control+KeyM');

// Replaces the code by keys: select all, then the text as one input, so a
// faked system needs no clipboard shortcut of the real one.
async function replaceByKeys(page: Page, code: string): Promise<void> {
  await focusEditor(page);
  await press(page, (await editorOnMac(page)) ? 'Meta+KeyA' : 'Control+KeyA');
  await page.keyboard.insertText(code);
  await waitForCode(page, code.split('\n')[0]!);
}

// Presses Tab until focus is on `selector`, at most `limit` times.
async function tabTo(page: Page, selector: string, limit = 30): Promise<void> {
  for (let step = 0; step < limit; step += 1) {
    if (await focusedIs(page, selector)) return;
    await press(page, 'Tab');
  }
  expect(await focusedElement(page), `Tab never reached ${selector}`).toBe(selector);
}

describe('008-typescript-playground-FR-062: Tab indents in the editor, and its key makes Tab move focus', () => {
  for (const platform of ['Windows', 'macOS'] as const) {
    test(`on ${platform}, the description names the key; with it on, Tab leaves the editor and the status bar says so`, async () => {
      const page = await openPlaygroundPage({ platform, userAgent: USER_AGENTS[platform] });
      const key = await tabKey(page);
      expect(key).toBe(platform === 'macOS' ? 'Control+Shift+KeyM' : 'Control+KeyM');
      const description = words.editor.description[platform === 'macOS' ? 'mac' : 'other'];
      const describedBy = await page.locator(INPUT).first().getAttribute('aria-describedby');
      expect(describedBy).not.toBeNull();
      expect((await page.locator(`[id="${describedBy}"]`).textContent())?.trim()).toBe(description);
      expect(description).toContain(platform === 'macOS' ? 'Ctrl+Shift+M' : 'Ctrl+M');

      await replaceByKeys(page, 'let a = 1;');
      await press(page, 'Home', 'Tab');
      await waitForCode(page, '  let a = 1;');
      expect(await inEditor(page)).toBe(true);

      await press(page, key);
      await expect.poll(() => page.locator(`${PLAYGROUND} .playground-status .chip`).textContent()).toBe(words.status.tabMovesFocus);
      await press(page, 'Tab');
      expect(await inEditor(page)).toBe(false);
      expect(await editorText(page)).toBe('  let a = 1;');
      await expectIndicator(page, 'after leaving the editor');

      await focusEditor(page);
      await press(page, key);
      await expect.poll(() => page.locator(`${PLAYGROUND} .playground-status .chip`).count()).toBe(0);
    });
  }
});

describe("008-typescript-playground-FR-062: the shell's shortcuts work from inside the editor and type nothing", () => {
  test('Alt+Shift+M, D, N and W from the editor', async () => {
    const page = await openPlaygroundPage();
    const code = 'let a = 1;';
    await setCode(page, code);
    await waitForCode(page, code);
    for (const [keys, target] of [
      ['Alt+Shift+KeyM', '#menu-title-site'],
      ['Alt+Shift+KeyD', '#os .dock-item'],
      ['Alt+Shift+KeyN', '#os .window .window-title'],
    ] as const) {
      await focusEditor(page);
      await press(page, keys);
      await expect.poll(() => focusedIs(page, target)).toBe(true);
      await expectIndicator(page, keys);
      expect(await editorText(page), keys).toBe(code);
      await press(page, 'Escape');
    }
    // Alt+Shift+N brought the CV to the front: it again brings the Playground back.
    await press(page, 'Alt+Shift+KeyN');
    await expect.poll(() => frontWindow(page)).toBe('playground');
    await focusEditor(page);
    await press(page, 'Alt+Shift+KeyW');
    await expect.poll(() => page.locator('#os .window[data-view="playground"]').count()).toBe(0);
  });
});

describe('008-typescript-playground-FR-062: every action of the Playground by keys alone, with focus visible', () => {
  test('the toolbar, an example, an option, the panes, Run, the popup, Stop, Share and Show specs', async () => {
    const page = await openPlaygroundPage({ permissions: ['clipboard-read', 'clipboard-write'] });

    // Tab moves focus once its key is pressed, so the page can be walked by Tab.
    await focusEditor(page);
    await press(page, await tabKey(page));
    await expect.poll(() => page.locator(`${PLAYGROUND} .playground-status .chip`).count()).toBe(1);

    // The toolbar's controls, each with its indicator.
    await press(page, 'Shift+Tab');
    for (const control of ['share', 'options', 'examples', 'stop', 'run']) {
      if (!(await focusedIs(page, `${TOOLBAR} button.${control}`))) await press(page, 'Shift+Tab');
      expect(await focusedIs(page, `${TOOLBAR} button.${control}`), `${control}: ${await focusedElement(page)}`).toBe(true);
      await expectIndicator(page, control);
    }

    // An example: the panel takes focus, Enter chooses, Undo is a key away.
    await tabTo(page, `${TOOLBAR} button.examples`);
    await press(page, 'Enter');
    await expect.poll(() => focusedIs(page, `${PLAYGROUND} section.examples-panel button.example`)).toBe(true);
    await expectIndicator(page, 'the first example');
    const narrowing = page.locator(`${PLAYGROUND} section.examples-panel button.example`).filter({ has: page.locator('.example-title', { hasText: /^Narrowing$/ }) });
    while (!(await narrowing.evaluate((element) => element === document.activeElement))) await press(page, 'Tab');
    await press(page, 'Enter');
    await expect.poll(() => page.locator(`${MESSAGE} p`).textContent()).toContain('Narrowing');
    await waitChecked(page);

    // An option: Space toggles it, Escape closes the panel and returns to its button.
    await tabTo(page, `${TOOLBAR} button.options`);
    await press(page, 'Enter');
    await expect.poll(() => page.locator(`${PLAYGROUND} section.options-panel`).count()).toBe(1);
    const option = page.locator(`${PLAYGROUND} section.options-panel #playground-option-noUnusedLocals`);
    while (!(await option.evaluate((element) => element === document.activeElement))) await press(page, 'Tab');
    await expectIndicator(page, 'an option');
    await press(page, 'Space');
    expect(await option.isChecked()).toBe(true);
    await press(page, 'Escape');
    await expect.poll(() => focusedIs(page, `${TOOLBAR} button.options`)).toBe(true);

    // The panes: a tab list moved through by arrows.
    await tabTo(page, `${PLAYGROUND} .pane-tabs [role="tab"][aria-selected="true"]`);
    await expectIndicator(page, 'the pane tabs');
    await press(page, 'End');
    await expect.poll(() => paneTab(page, 'logs').getAttribute('aria-selected')).toBe('true');
    await press(page, 'Home');
    await expect.poll(() => paneTab(page, 'javascript').getAttribute('aria-selected')).toBe('true');

    // Run from the editor; the popup takes focus on Stop; Enter stops.
    await setCode(page, 'while (true) {}');
    await waitChecked(page);
    await focusEditor(page);
    await press(page, (await editorOnMac(page)) ? 'Meta+Enter' : 'Control+Enter');
    await expect.poll(() => running(page)).toBe(true);
    await page.waitForSelector(POPUP, { timeout: 20_000 });
    await expect.poll(() => focusedIs(page, `${POPUP} button`)).toBe(true);
    await expectIndicator(page, "the popup's Stop");
    await press(page, 'Enter');
    await expect.poll(() => running(page)).toBe(false);

    // Run, then Stop from the toolbar.
    await setCode(page, 'setInterval(() => {}, 1000);');
    await waitChecked(page);
    await tabTo(page, `${TOOLBAR} button.run`);
    await press(page, 'Enter');
    await expect.poll(() => running(page)).toBe(true);
    await tabTo(page, `${TOOLBAR} button.stop`);
    await press(page, 'Enter');
    await expect.poll(() => running(page)).toBe(false);

    // Share, then the message's Dismiss.
    await tabTo(page, `${TOOLBAR} button.share`);
    await press(page, 'Enter');
    await page.waitForSelector(MESSAGE);
    await tabTo(page, `${MESSAGE} button.dismiss`);
    await expectIndicator(page, "the message's Dismiss");
    await press(page, 'Enter');
    await expect.poll(() => page.locator(MESSAGE).count()).toBe(0);

    // Show specs, from the menu bar.
    await press(page, 'Alt+Shift+KeyM', 'ArrowRight', 'Enter');
    for (let step = 0; step < 25 && !/Show specs/.test(await focusedElement(page)); step += 1) await press(page, 'ArrowDown');
    expect(await focusedElement(page)).toMatch(new RegExp(siteText.inspector.show));
    await press(page, 'Enter');
    await page.waitForSelector('#os section.spec-view[data-view="playground"]');
  });
});
