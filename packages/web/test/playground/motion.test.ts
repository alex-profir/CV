// Reduced motion (spec US7, FR-069, SC-013): with it set, opening the
// Playground for the first time, running code with timers and an endless
// loop, the popup, switching panes and Monaco's own widgets move, scale,
// slide and fade nothing.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { press } from '../helpers/shell.ts';
import { EDITOR, focusEditor, freshProfile, holdEngine, openPlayground, paneTab, PLAYGROUND, POPUP, run, running, setCode, waitChecked, waitForCode, waitReady } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 240_000 });

type Moved = { target: string; property: string; values: string[] };

declare global {
  interface Window {
    __moved?: Moved[];
  }
}

const MOVING = ['transform', 'translate', 'scale', 'opacity', 'left', 'top', 'right', 'bottom', 'inset'];

// Samples every frame: every running animation or transition on the page
// that moves, scales or fades, and every change of transform, translate or
// scale of the Playground's own elements. Inside the editor, a transform
// that changes at once is the code scrolling, not motion, so there only
// animations and transitions count.
function watchMotion(moving: string[]): void {
  const moved: Moved[] = [];
  window.__moved = moved;
  const last = new Map<Element, Record<string, string>>();
  const name = (element: Element) => `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}`;
  const sample = () => {
    for (const animation of document.getAnimations()) {
      const effect = animation.effect as KeyframeEffect | null;
      const target = effect?.target;
      if (!(target instanceof Element) || target.closest('#os') === null) continue;
      const keys = (effect?.getKeyframes() ?? []).flatMap((frame) => Object.keys(frame));
      const transition = (animation as Animation & { transitionProperty?: string }).transitionProperty;
      const properties = [...new Set([...keys, ...(transition === undefined ? [] : [transition])])].filter((key) => moving.includes(key));
      if (properties.length > 0) moved.push({ target: name(target), property: `animation of ${properties.join(', ')}`, values: [] });
    }
    for (const element of document.querySelectorAll('#os .window[data-view="playground"] *')) {
      if (element.closest('.monaco-editor') !== null) continue;
      const style = getComputedStyle(element);
      const now = { transform: style.transform, translate: style.translate, scale: style.scale };
      const before = last.get(element);
      if (before !== undefined) {
        for (const property of Object.keys(now) as (keyof typeof now)[]) {
          if (before[property] !== now[property]) moved.push({ target: name(element), property, values: [before[property]!, now[property]] });
        }
      }
      last.set(element, now);
    }
    requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
}

const moved = (page: Page) => page.evaluate(() => window.__moved ?? []);
const clearMoved = (page: Page) => page.evaluate(() => void window.__moved?.splice(0));

async function reducedPage(): Promise<Page> {
  return freshProfile({ reducedMotion: 'reduce', beforeGoto: async (page) => void (await page.addInitScript(watchMotion, MOVING)) });
}

describe('008-typescript-playground-FR-069: with reduced motion nothing moves, scales or fades (SC-013)', () => {
  test('the first open: the download and the editor appearing', async () => {
    const page = await reducedPage();
    const held = await holdEngine(page);
    await openPlayground(page);
    await page.waitForSelector(`${PLAYGROUND} .playground-loading`);
    await clearMoved(page);
    await page.waitForTimeout(500);
    held.release();
    await waitReady(page);
    await page.waitForTimeout(500);
    expect(await moved(page)).toEqual([]);
  });

  test('a run with timers, the endless loop and its popup, Stop, and switching panes', async () => {
    const page = await reducedPage();
    await openPlayground(page);
    await waitReady(page);
    await setCode(page, 'let n = 0;\nconst id = setInterval(() => { console.log(++n); if (n === 8) clearInterval(id); }, 100);');
    await waitChecked(page);
    await clearMoved(page);
    await run(page);
    for (const pane of ['javascript', 'declarations', 'errors', 'logs'] as const) await paneTab(page, pane).click();
    await setCode(page, 'while (true) {}');
    await waitChecked(page);
    await run(page, { wait: 'start' });
    await page.waitForSelector(POPUP, { timeout: 20_000 });
    await page.waitForTimeout(500);
    // The popup covers the window: its own Stop ends the run.
    await page.locator(`${POPUP} button`).first().click();
    await expect.poll(() => running(page)).toBe(false);
    await page.waitForTimeout(500);
    expect(await moved(page)).toEqual([]);
  });

  test("Monaco's widgets: suggestions, the hover, find, the command palette, the quick fix and folding", async () => {
    const page = await reducedPage();
    await openPlayground(page);
    await waitReady(page);
    const code = 'function twice(n: number) {\n  return n * 2;\n}\nconst x: string = twice(1);\nx.';
    await setCode(page, code);
    await waitForCode(page, code.split('\n')[0]!);
    await waitChecked(page);
    await clearMoved(page);
    const mod = (await page.evaluate(() => /Macintosh|Mac OS X/.test(navigator.userAgent))) ? 'Meta' : 'Control';
    await focusEditor(page);
    await press(page, `${mod}+ArrowDown`, 'End', 'Control+Space');
    await page.waitForSelector(`${EDITOR} .suggest-widget.visible`);
    await press(page, 'Escape');
    await press(page, 'Home', `${mod}+KeyK`, `${mod}+KeyI`);
    await page.waitForSelector(`${EDITOR} .monaco-hover:not(.hidden)`);
    await press(page, 'Escape');
    await press(page, `${mod}+KeyF`);
    await page.waitForSelector(`${EDITOR} .find-widget.visible`);
    await press(page, 'Escape');
    await press(page, 'F1');
    await page.waitForSelector('.quick-input-widget:not([style*="display: none"])');
    await press(page, 'Escape');
    await press(page, `${mod}+ArrowUp`, `${mod}+Alt+BracketLeft`);
    await page.waitForTimeout(500);
    await press(page, `${mod}+Alt+BracketRight`);
    await page.waitForTimeout(800);
    expect(await moved(page)).toEqual([]);
  });
});
