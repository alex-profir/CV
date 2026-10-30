// Forced colors (spec US7, FR-070, wireframes Accessibility): with forced
// colors active, the Playground's error marks, log levels, cursor,
// selection, focus, controls and popups show by their borders, underlines,
// text or system colors, and none by a background alone.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { forcedColorsProblems } from '../../../../tools/site-check/src/parts/modes.ts';
import { siteText } from '../../src/site-text.ts';
import { press } from '../helpers/shell.ts';
import { EDITOR, focusEditor, menu, onMac, openPlaygroundPage, PLAYGROUND, POPUP, readLogs, run, running, setCode, showPane, TOOLBAR, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 240_000 });

const words = siteText.playground;
const WINDOW = '#os .window[data-view="playground"]';

// A system color as the browser computes it.
const systemColor = (page: Page, color: string) =>
  page.evaluate((value) => {
    const probe = document.createElement('div');
    probe.style.color = value;
    document.body.append(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();
    return computed;
  }, color);

type Side = { width: number; style: string; color: string };
type Edges = { name: string; top: Side; right: Side; bottom: Side; left: Side; mask: string; background: string };

// Each shown element's borders, mask and background, or its pseudo
// element's.
const edges = (page: Page, selector: string, pseudo: '' | '::before' = '') =>
  page.locator(selector).evaluateAll(
    (list, which) =>
      list
        .filter((element) => element.getClientRects().length > 0)
        .map((element) => {
          const style = getComputedStyle(element, which || null);
          const side = (name: string) => ({ width: Number.parseFloat(style.getPropertyValue(`border-${name}-width`)), style: style.getPropertyValue(`border-${name}-style`), color: style.getPropertyValue(`border-${name}-color`) });
          return { name: `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}${which}`, top: side('top'), right: side('right'), bottom: side('bottom'), left: side('left'), mask: style.maskImage, background: style.backgroundColor };
        }),
    pseudo,
  ) as Promise<Edges[]>;

const shown = (side: Side) => side.width > 0 && side.style !== 'none' && side.color !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(side.color);

async function expectBordered(page: Page, selector: string, label: string, minimum = 1): Promise<Edges[]> {
  const list = await edges(page, selector);
  expect(list.length, `${label}: shown`).toBeGreaterThan(0);
  for (const each of list) {
    const widest = Math.max(...[each.top, each.right, each.bottom, each.left].filter(shown).map((side) => side.width), 0);
    expect(widest, `${label}: ${each.name}`).toBeGreaterThanOrEqual(minimum);
  }
  return list;
}

// Focus moved as by the keyboard, so `:focus-visible` applies, after a blur
// in case the element already has focus from a click; then the outline of
// the focused element, or of `ring` around it (the editor's).
async function expectFocusRing(page: Page, selector: string, label: string, ring?: string): Promise<void> {
  await page.locator(selector).first().evaluate((element) => {
    (element as HTMLElement).blur();
    (element as HTMLElement).focus({ focusVisible: true } as FocusOptions);
  });
  const outline = await page.evaluate((around) => {
    const shown = around === null ? document.activeElement! : document.activeElement!.closest(around)!;
    const style = getComputedStyle(shown);
    return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth), what: `${shown.tagName.toLowerCase()}.${[...shown.classList].join('.')}` };
  }, ring ?? null);
  expect(outline.style, `${label}: ${outline.what}`).not.toBe('none');
  expect(outline.width, `${label}: ${outline.what}`).toBeGreaterThan(0);
}

// 004's forced-colors check over the page. It tabs through the links, which
// brings the CV's window to the front, so the Playground's is brought back
// from the dock.
async function problems(page: Page): Promise<unknown[]> {
  const found = await forcedColorsProblems(page, '/');
  await page.locator('#os .dock-item[data-app="playground"]').click();
  await page.waitForSelector(`${WINDOW}[aria-current="true"]`);
  return found;
}

const forcedPage = () => openPlaygroundPage({ forcedColors: 'active' });

async function showCode(page: Page, code: string): Promise<void> {
  await setCode(page, code);
  await waitForCode(page, code.split('\n')[0]!);
  await waitChecked(page);
}

describe('008-typescript-playground-FR-070: with forced colors every mark, level, cursor, selection, focus, control and popup shows', () => {
  test("the editor: the error's wavy line in LinkText, the cursor line's message with its cross, the cursor and the selection by their lines", async () => {
    const page = await forcedPage();
    await showCode(page, "const n: number = 'one';\nconsole.log(n);");
    const mod = (await onMac(page)) ? 'Meta' : 'Control';
    await focusEditor(page);
    await press(page, `${mod}+ArrowUp`, 'End');
    const link = await systemColor(page, 'LinkText');
    const text = await systemColor(page, 'CanvasText');
    for (const mark of await edges(page, `${EDITOR} .squiggly-error`)) {
      expect(mark.bottom.width, mark.name).toBeGreaterThan(0);
      expect(mark.bottom.color, mark.name).toBe(link);
      expect(mark.mask, mark.name).toContain('wavy');
    }
    expect(await page.locator(`${EDITOR} .squiggly-error`).count()).toBeGreaterThan(0);
    const message = page.locator(`${EDITOR} .playground-inline-message`).first();
    await expect.poll(() => message.textContent()).toMatch(/not\s+assignable/);
    const [cross] = await edges(page, `${EDITOR} .playground-inline-message`, '::before');
    expect(cross?.mask).toContain('error');
    expect(cross === undefined ? 0 : Math.max(cross.top.width, cross.left.width)).toBeGreaterThan(0);
    const [cursor] = await expectBordered(page, `${EDITOR} .cursors-layer > .cursor`, 'cursor');
    expect(cursor?.left.color).toBe(text);
    const colors = await page.locator(`${EDITOR} .view-line span span`).evaluateAll((list) => [...new Set(list.map((each) => getComputedStyle(each).color))]);
    expect(colors, 'the syntax colors').toEqual([text]);
    await press(page, 'Shift+Home');
    await expect.poll(() => page.locator(`${EDITOR} .selected-text`).count()).toBeGreaterThan(0);
    await expectBordered(page, `${EDITOR} .selected-text`, 'selection');
    expect(await problems(page), 'with an error and a selection').toEqual([]);
    await expectFocusRing(page, `${EDITOR} textarea, ${EDITOR} .native-edit-context`, 'the editor', '.playground-editor');
  });

  test('the logs: each level by its word, the selected tab by its 2 px line, the toolbar and tabs with focus outlines', async () => {
    const page = await forcedPage();
    await showCode(page, "console.log('a');\nconsole.info('b');\nconsole.warn('c');\nconsole.error('d');\nconsole.debug('e');");
    await run(page);
    const logged = ['log', 'info', 'warn', 'error', 'debug'] as const;
    const logs = (await readLogs(page)).filter((row) => row.level !== 'note');
    expect(logs.map((row) => row.level)).toEqual(logged);
    const levels = await page.locator(`${PLAYGROUND} li.log:not([data-level="note"]) .level`).allTextContents();
    expect(levels.map((level) => level.trim())).toEqual(logged.map((level) => words.logs.levels[level]));
    await expectBordered(page, `${PLAYGROUND} .pane-tab[aria-selected="true"]`, 'selected tab', 2);
    expect(await problems(page), 'with logs').toEqual([]);
    await expectFocusRing(page, `${TOOLBAR} button.run`, 'Run');
    await expectFocusRing(page, `${PLAYGROUND} .pane-tab[aria-selected="true"]`, 'the selected tab');
    await showPane(page, 'errors');
    expect(await problems(page), 'the errors pane').toEqual([]);
  });

  test('the examples panel, suggestions and the quick fixes: the chosen row keeps its 2 px border', async () => {
    const page = await forcedPage();
    await page.locator(`${TOOLBAR} button.examples`).click();
    await expectBordered(page, `${PLAYGROUND} .example[aria-current="true"]`, 'the current example', 2);
    expect(await problems(page), 'the examples panel').toEqual([]);
    await page.locator(`${TOOLBAR} button.examples`).click();
    await showCode(page, 'interface Job { title: string; years: number }\nconst job: Job = {};\njob.');
    const mod = (await onMac(page)) ? 'Meta' : 'Control';
    await focusEditor(page);
    await press(page, `${mod}+ArrowDown`, 'End', 'Control+Space');
    await page.waitForSelector(`${EDITOR} .suggest-widget.visible .monaco-list-row.focused`);
    await expectBordered(page, `${EDITOR} .suggest-widget .monaco-list-row.focused`, 'the chosen suggestion', 2);
    expect(await problems(page), 'suggestions').toEqual([]);
    await focusEditor(page);
    await press(page, 'Control+KeyG');
    await page.keyboard.type('2:7');
    await press(page, 'Enter', `${mod}+Period`);
    await page.waitForSelector('.action-widget .monaco-list-row.focused', { timeout: 10_000 });
    await expectBordered(page, '.action-widget .monaco-list-row.focused', 'the chosen fix', 2);
    expect(await problems(page), 'quick fixes').toEqual([]);
  });

  test('the reset popup and the stuck popup: no scrim, a 1 px border and focus outlines', async () => {
    const page = await forcedPage();
    await menu(page, words.menu.reset);
    await page.waitForSelector(POPUP);
    const scrim = await page.locator(`${PLAYGROUND} .playground-scrim`).evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(scrim).toMatch(/^transparent$|rgba\(.*,\s*0\)$/);
    await expectBordered(page, POPUP, 'the reset popup');
    await expectFocusRing(page, `${POPUP} button`, 'the reset popup');
    expect(await problems(page), 'the reset popup').toEqual([]);
    await page.locator(`${POPUP} button`).last().click();
    await page.waitForSelector(POPUP, { state: 'detached' });
    await showCode(page, 'while (true) {}');
    await run(page, { wait: 'start' });
    await page.waitForSelector(POPUP, { timeout: 20_000 });
    await expectBordered(page, POPUP, 'the stuck popup');
    await expectFocusRing(page, `${POPUP} button`, 'the stuck popup');
    expect(await problems(page), 'the stuck popup').toEqual([]);
    await page.locator(`${POPUP} button`).first().click();
    await expect.poll(() => running(page)).toBe(false);
  });
});
