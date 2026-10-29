// The Terminal's speed (SC-002, research R21): for every command `help`
// lists, `cv` included, the time from pressing Enter to the frame that shows
// its output. It is measured in the page, from the Enter key's event to the
// first animation frame after the output is in the document, so the test's
// own round trips don't count.
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
// the Terminal: a run added or removed, the vim view, or the Terminal gone.
function watchNextEnter(page: Page): Promise<void> {
  return page.evaluate((selector) => {
    const timing: { start: number; shown: number | null } = { start: 0, shown: null };
    window.__terminalTiming = timing;
    const shell = document.querySelector('#os')!;
    const state = () => `${document.querySelectorAll('.terminal section.run').length} ${document.querySelector('.terminal .vim-text') !== null} ${document.querySelector('.terminal') !== null}`;
    const before = state();
    const observer = new MutationObserver(() => {
      if (timing.start === 0 || state() === before) return;
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
          observer.observe(shell, { childList: true, subtree: true });
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
