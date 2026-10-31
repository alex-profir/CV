// The inspector's speed (SC-005, research R10 Verify): with the CPU four
// times slower, as Lighthouse's mobile profile slows it, the time from the
// click on "Show specs" to the frame after the last spec group is in the
// document, and from the click on Back to the frame after the app is back.
// Measured in the page, from the click's event, so the test's own round
// trips don't count. The data file is in before the click, as it is once
// the shell has been ready a moment (research R9).
import type { Page } from 'playwright';
import { describe, expect, test, vi } from 'vitest';
import { openView, specViewSelector, viewSelector } from '../helpers/inspector.ts';
import type { InspectorShell, InspectorView } from '../helpers/inspector.ts';
import { openShell, settle } from '../helpers/shell.ts';
import { SHELL_PAGE } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 240_000 });

const SHOW_MS = 300;

const BACK_MS = 100;

declare global {
  interface Window {
    __specTiming?: { start: number; last: number };
  }
}

// Watches the next click on `control`, and stamps the frame after each
// change to what `state` reads, so `last` is the frame after the final one.
function watchNextClick(page: Page, control: string, state: string): Promise<void> {
  return page.evaluate(
    ({ control, state }) => {
      const timing = { start: 0, last: 0 };
      window.__specTiming = timing;
      // The fading copy of the old content (R11) is for the eye alone: the
      // view is what is live.
      const read = () => {
        const view = [...document.querySelectorAll(state)].find((element) => element.closest('[data-spec-swap]') === null);
        return view === undefined ? 'gone' : String(view.querySelectorAll('section.spec-group').length);
      };
      let seen = read();
      const observer = new MutationObserver(() => {
        if (timing.start === 0) return;
        const now = read();
        if (now === seen) return;
        seen = now;
        requestAnimationFrame(() => {
          timing.last = performance.now();
        });
      });
      window.addEventListener(
        'click',
        (event) => {
          if (!(event.target as Element).closest(control)) return;
          timing.start = performance.now();
          observer.observe(document.querySelector('#os')!, { childList: true, subtree: true });
        },
        { capture: true, once: true },
      );
    },
    { control, state },
  );
}

async function timeClick(page: Page, shell: InspectorShell, control: string, state: string): Promise<number> {
  await watchNextClick(page, control, state);
  if (shell === 'desktop') await page.click(control);
  else await page.tap(control);
  await page.waitForFunction(() => (window.__specTiming?.last ?? 0) > 0);
  // Any later group, as with R10's fallback, stamps a later frame.
  await settle(page);
  return page.evaluate(() => Math.round(window.__specTiming!.last - window.__specTiming!.start));
}

const RUNS: { shell: InspectorShell; view: InspectorView }[] = [
  { shell: 'mobile', view: 'about' },
  { shell: 'mobile', view: 'cv' },
  { shell: 'desktop', view: 'about' },
  { shell: 'desktop', view: 'cv' },
];

describe('performance (SC-005)', () => {
  test.each(RUNS)('$shell, $view: with the CPU four times slower, the specs show within 300 ms of the click and the app is back within 100 ms', async ({ shell, view }) => {
    const page = await openShell({ ...SHELL_PAGE[shell], cpuThrottling: 4 });
    await page.waitForLoadState('networkidle');
    await openView(page, view, shell);
    const spec = specViewSelector(view);
    const show = await timeClick(page, shell, `${viewSelector(view, shell)} button.show-specs`, spec);
    expect(await page.locator(`${spec} section.spec-group`).count()).toBeGreaterThan(0);
    const back = await timeClick(page, shell, `${spec} button.spec-back`, spec);
    expect(await page.locator(spec).count()).toBe(0);
    console.log(`SC-005 ${shell} ${view}: show ${show} ms, back ${back} ms`);
    // The budget is for a machine Lighthouse's slowdown is meant for. CI's
    // shared runners start slower, so there the times are only logged, as
    // the other checks' timing tests do.
    if (!process.env.CI) {
      expect(show).toBeLessThan(SHOW_MS);
      expect(back).toBeLessThan(BACK_MS);
    }
  });
});
