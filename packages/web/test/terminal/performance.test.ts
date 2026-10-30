// The Terminal's speed (SC-002, research R21): for every command `help`
// lists, `cv` included, the time from pressing Enter to the frame that shows
// its output. It is measured in the page, from the Enter key's event to the
// first animation frame after the output is in the document, so the test's
// own round trips don't count. The line runs in the shell's worker, so its
// output is in once its run is no longer busy (FR-070).
import type { Page } from 'playwright';
import { describe, expect, test, vi } from 'vitest';
import { COMMANDS } from '../../src/apps/terminal/engine/commands.ts';
import { COMMAND_LINE, openTerminalPage, quitVim, vimView } from '../helpers/terminal.ts';
import type { TerminalShell } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 240_000 });

// `exit` last, since it closes the Terminal.
const NAMES = COMMANDS.map((command) => command.name);

declare global {
  interface Window {
    __terminalTiming?: { start: number; shown: number | null };
  }
}

// Watches for the next Enter in the command line, and for what it changes in
// the Terminal once the line has run: a run added or removed, the vim view,
// or the Terminal gone.
function watchNextEnter(page: Page): Promise<void> {
  return page.evaluate((selector) => {
    const timing: { start: number; shown: number | null } = { start: 0, shown: null };
    window.__terminalTiming = timing;
    const shell = document.querySelector('#os')!;
    const state = () => `${document.querySelectorAll('.terminal section.run').length} ${document.querySelector('.terminal .vim-text') !== null} ${document.querySelector('.terminal') !== null}`;
    const before = state();
    const running = () => document.querySelector('.terminal section.run[aria-busy="true"]') !== null;
    const observer = new MutationObserver(() => {
      if (timing.start === 0 || state() === before || running()) return;
      observer.disconnect();
      requestAnimationFrame(() => {
        timing.shown = performance.now();
      });
    });
    window.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Enter' && (event.target as Element).matches(selector)) {
          timing.start = performance.now();
          observer.observe(shell, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-busy'] });
        }
      },
      { capture: true, once: true },
    );
  }, COMMAND_LINE);
}

// Each command's time, in milliseconds, in the order `help` lists them.
async function timeEveryCommand(page: Page): Promise<Record<string, number>> {
  const times: Record<string, number> = {};
  for (const name of NAMES) {
    const input = page.locator(COMMAND_LINE);
    await input.focus();
    await input.fill('');
    await page.keyboard.type(name);
    await watchNextEnter(page);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__terminalTiming?.shown !== null && window.__terminalTiming?.shown !== undefined);
    times[name] = await page.evaluate(() => Math.round(window.__terminalTiming!.shown! - window.__terminalTiming!.start));
    if (await vimView(page).count()) await quitVim(page);
  }
  return times;
}

const slower = (times: Record<string, number>, limit: number) => Object.fromEntries(Object.entries(times).filter(([, ms]) => ms >= limit));

const RUNS: { shell: TerminalShell; name: string; cpuThrottling?: number; limit: number }[] = [
  { shell: 'desktop', name: 'at 1440 px, every command shows its output within 100 ms of Enter', limit: 100 },
  { shell: 'mobile', name: "at 375 px with the CPU four times slower, as Lighthouse's mobile profile, within 300 ms", cpuThrottling: 4, limit: 300 },
];

describe('performance (SC-002)', () => {
  test.each(RUNS)('$name', async ({ shell, cpuThrottling, limit }) => {
    const page = await openTerminalPage(shell, cpuThrottling === undefined ? {} : { cpuThrottling });
    const times = await timeEveryCommand(page);
    expect(Object.keys(times)).toEqual(NAMES);
    expect(slower(times, limit)).toEqual({});
  });
});

describe('006-terminal-FR-079: Tab and typing in the editor are quick', () => {
  test('at 1440 px, the line after Tab changes within 100 ms of the key, over a folder of a few dozen names', async () => {
    const page = await openTerminalPage('desktop');
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type('mkdir h && touch h/name{1..36}');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.terminal section.run[aria-busy="true"]') === null);
    await page.locator(COMMAND_LINE).fill('cat h/');
    // Waits for the line's change, from the key's own event.
    const timing = page.evaluate(
      (selector) =>
        new Promise<number>((resolve) => {
          const input = document.querySelector<HTMLInputElement>(selector)!;
          let start = 0;
          input.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') start = performance.now();
          });
          input.addEventListener('input', () => resolve(performance.now() - start), { once: true });
        }),
      COMMAND_LINE,
    );
    await page.keyboard.press('Tab');
    const spent = await timing;
    expect(spent).toBeLessThanOrEqual(100);
  });

  test('in insert mode on cv’s JSON each key is drawn within the next frame, and only the changed line is drawn again', async () => {
    const page = await openTerminalPage('desktop');
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type('cv');
    await page.keyboard.press('Enter');
    await vimView(page).waitFor();
    await page.locator('.terminal .vim-text').focus();
    await page.keyboard.press('z');
    await page.keyboard.press('R');
    await page.keyboard.press('i');
    await page.locator('.terminal textarea.vim-insert').waitFor();
    const result = await page.evaluate(
      () =>
        new Promise<{ frames: number; changed: number }>((resolve) => {
          const text = document.querySelector('.terminal .vim-text')!;
          const area = document.querySelector<HTMLTextAreaElement>('.terminal textarea.vim-insert')!;
          const changed = new Set<Element>();
          const observer = new MutationObserver((records) => {
            for (const record of records) {
              const line = (record.target instanceof Element ? record.target : record.target.parentElement)?.closest('.vim-line');
              if (line) changed.add(line);
            }
          });
          observer.observe(text, { childList: true, subtree: true, characterData: true });
          area.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: 'x', bubbles: true, cancelable: true }));
          let frames = 0;
          const look = () => {
            frames += 1;
            observer.disconnect();
            resolve({ frames, changed: changed.size });
          };
          requestAnimationFrame(look);
        }),
    );
    expect(result.frames).toBe(1);
    expect(result.changed).toBeLessThanOrEqual(1);
    expect(await page.locator('.terminal .vim-line:has(.vim-insert-bar) .vim-code').textContent()).toContain('x');
  });
});
