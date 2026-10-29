// Motion in the Terminal (FR-032, SC-008): output shows whole, at once; the
// cursor never blinks; with reduced motion nothing moves or scales while it
// opens, runs commands or has its pocket keys pressed.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { openShell, settle } from '../helpers/shell.ts';
import { COMMAND_LINE, openTerminal, openTerminalPage, runGroup, SHELL_PAGE, typeLine } from '../helpers/terminal.ts';
import type { TerminalShell } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 180_000 });

type Moved = { target: string; property: string; values: string[] };

declare global {
  interface Window {
    __moved?: Moved[];
  }
}

// Samples, every frame, the transform, translate and scale of the
// Terminal's window or view and everything in it, and keeps each that
// changes; and keeps every running animation, anywhere in the root, that
// moves or scales. (The shell's first CV window trades its centering
// `translate` for coordinates once placed, without moving: not motion.)
function watchMotion(): void {
  const moved: Moved[] = [];
  window.__moved = moved;
  const last = new Map<Element, Record<string, string>>();
  const sample = () => {
    for (const animation of document.getAnimations()) {
      const effect = animation.effect as KeyframeEffect | null;
      const properties = (effect?.getKeyframes() ?? []).flatMap((frame) => Object.keys(frame)).filter((key) => ['transform', 'translate', 'scale'].includes(key));
      const target = effect?.target;
      if (properties.length > 0 && target instanceof Element) moved.push({ target: `${target.tagName.toLowerCase()}.${[...target.classList].join('.')}`, property: `animation of ${[...new Set(properties)].join(', ')}`, values: [] });
    }
    for (const element of document.querySelectorAll('#os :is(.window[data-view="terminal"], .full-screen[data-view="terminal"]), #os :is(.window[data-view="terminal"], .full-screen[data-view="terminal"]) *')) {
      const style = getComputedStyle(element);
      const now = { transform: style.transform, translate: style.translate, scale: style.scale };
      const before = last.get(element);
      if (before !== undefined) {
        for (const property of Object.keys(now) as (keyof typeof now)[]) {
          if (before[property] !== now[property]) moved.push({ target: `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}`, property, values: [before[property]!, now[property]] });
        }
      }
      last.set(element, now);
    }
    requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
}

const moved = (page: Page) => page.evaluate(() => window.__moved ?? []);

describe('006-terminal-FR-032: nothing blinks, types out or moves', () => {
  test('a command’s whole output is in the first frame after Enter', async () => {
    const page = await openTerminalPage('desktop');
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type('work');
    // The watch counts the runs before Enter is pressed, or a fast render
    // would already be counted and the watch would wait for ever. A run
    // waits for the shell busy and empty; its first frame is the one it has
    // run in (FR-070).
    await page.evaluate(() => {
      const before = document.querySelectorAll('.terminal section.run').length;
      (window as unknown as { firstFrame: Promise<string> }).firstFrame = new Promise<string>((resolve) => {
        const check = () => {
          const runs = document.querySelectorAll('.terminal section.run');
          const last = runs[runs.length - 1];
          if (runs.length > before && last !== undefined && !last.hasAttribute('aria-busy')) resolve(last.querySelector('.run-output')?.textContent ?? '');
          else requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      });
    });
    await page.keyboard.press('Enter');
    const atFirstFrame = await page.evaluate(() => (window as unknown as { firstFrame: Promise<string> }).firstFrame);
    await page.waitForTimeout(1_000);
    const later = await page.locator('.terminal section.run').last().locator('.run-output').textContent();
    expect(atFirstFrame.length).toBeGreaterThan(100);
    expect(atFirstFrame).toBe(later);
  });

  test('the cursor has no animation, now and 6 s later', async () => {
    const page = await openTerminalPage('desktop');
    const cursor = () =>
      page.locator('.terminal .cursor-block').evaluate((element) => ({
        animations: element.getAnimations().length,
        name: getComputedStyle(element).animationName,
        background: getComputedStyle(element).backgroundColor,
        visibility: getComputedStyle(element).visibility,
      }));
    const now = await cursor();
    expect(now.animations).toBe(0);
    expect(now.name).toBe('none');
    await page.waitForTimeout(6_000);
    expect(await cursor()).toEqual(now);
  });

  test('without reduced motion, the watch sees a pressed pocket key move, so it can see motion', async () => {
    const page = await openShell({ ...SHELL_PAGE.mobile, reducedMotion: 'no-preference', beforeGoto: async (opened) => void (await opened.addInitScript(watchMotion)) });
    await openTerminal(page, 'mobile');
    const rect = (await page.locator('#os .pocket-keys button.pocket-key').first().boundingBox())!;
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(100);
    expect((await moved(page)).some((entry) => entry.target.startsWith('button.pocket-key') && entry.property === 'translate')).toBe(true);
  });

  describe.each(['desktop', 'mobile'] as const)('with reduced motion, in the %s shell', (shell: TerminalShell) => {
    test('opening, running commands and pressing pocket keys change no transform or scale', async () => {
      const page = await openShell({ ...SHELL_PAGE[shell], reducedMotion: 'reduce', beforeGoto: async (opened) => void (await opened.addInitScript(watchMotion)) });
      await settle(page);
      await openTerminal(page, shell);
      await runGroup(page, 'help');
      await runGroup(page, 'work');
      await typeLine(page, 'clear');
      if (shell === 'mobile') {
        for (const line of ['about', 'skills', 'ls']) {
          const key = page.locator(`#os .pocket-keys button.pocket-key[aria-label="${line}"]`);
          const rect = (await key.boundingBox())!;
          await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
          await page.mouse.down();
          await page.waitForTimeout(100);
          await page.mouse.up();
        }
      }
      await page.waitForTimeout(300);
      expect(await moved(page)).toEqual([]);
    });
  });
});
