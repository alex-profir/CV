// Where focus goes when the Playground opens (spec US1): the window's title
// while TypeScript downloads, the editor once it is ready, unless the
// visitor has moved on to another window meanwhile.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { siteText } from '../../src/site-text.ts';
import { axNodes } from '../helpers/ax.ts';
import { settle } from '../helpers/shell.ts';
import { EDITOR, freshProfile, holdEngine, onMac, openPlayground, waitReady } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

const WINDOW = '#os .window[data-view="playground"]';
const CV = '#os .window[data-view="cv"]';

const editorFocused = (page: Page) => page.evaluate((selector) => document.activeElement?.closest(selector) !== null && document.activeElement?.tagName === 'TEXTAREA', EDITOR);

describe('008-typescript-playground-FR-004: focus goes to the editor once it is ready, and is never taken back', () => {
  test("while TypeScript downloads, focus is on the window's title; when ready, on the editor", async () => {
    const page = await freshProfile();
    const held = await holdEngine(page);
    await openPlayground(page);
    expect(await page.evaluate((selector) => document.activeElement?.matches(`${selector} .window-title`) ?? false, WINDOW)).toBe(true);
    held.release();
    await waitReady(page);
    await expect.poll(() => editorFocused(page)).toBe(true);
  });

  test('the editor is announced with the window, its name and its description', async () => {
    const page = await freshProfile();
    await openPlayground(page);
    await waitReady(page);
    await expect.poll(() => editorFocused(page)).toBe(true);
    const [window] = await axNodes(page, WINDOW);
    expect(window?.name).toMatch(new RegExp(`^${siteText.os.views.playground}`));
    const [input] = await axNodes(page, `${EDITOR} textarea`);
    expect(input?.name).toBe(siteText.playground.editor.name);
    const description = await page.evaluate((selector) => {
      const input = document.querySelector(`${selector} textarea`);
      const ids = (input?.getAttribute('aria-describedby') ?? '').split(/\s+/).filter((id) => id !== '');
      return ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
    }, EDITOR);
    const words = siteText.playground.editor.description;
    expect(description).toContain((await onMac(page)) ? words.mac : words.other);
  });

  test('with focus moved to the CV window during the download, it stays there when the editor is ready', async () => {
    const page = await freshProfile();
    const held = await holdEngine(page);
    await openPlayground(page);
    await page.mouse.click(300, 300);
    await settle(page);
    await expect.poll(() => page.locator(CV).getAttribute('aria-current')).toBe('true');
    held.release();
    await waitReady(page);
    await page.waitForTimeout(500);
    expect(await editorFocused(page)).toBe(false);
    expect(await page.locator(CV).getAttribute('aria-current')).toBe('true');
  });
});
