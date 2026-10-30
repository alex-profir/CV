// The site stays responsive during a run (spec US2, SC-005): an endless
// loop, a printing loop and a loop growing memory each leave the dock, the
// editor and Stop answering within 100 ms.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { focusEditor, openPlaygroundPage, run, setCode, stop, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

// Each click's and key's input delay in the page, in milliseconds.
const watchInput = (page: Page) =>
  page.evaluate(() => {
    const delays: { type: string; ms: number }[] = [];
    (window as unknown as { inputDelays: typeof delays }).inputDelays = delays;
    for (const type of ['click', 'keydown']) document.addEventListener(type, (event) => delays.push({ type, ms: performance.now() - event.timeStamp }), true);
  });

const LOOPS = {
  endless: 'let n = 0;\nwhile (true) n++;',
  printing: 'let n = 0;\nwhile (true) console.log(n++);',
  // Memory grows to some 200 MB and stays there, so the loop never ends but
  // the test machine keeps its memory (FR-045's limit is memory.test.ts's).
  memory: 'const kept: number[][] = [];\nwhile (true) {\n  if (kept.length < 200) kept.push(new Array(131_072).fill(kept.length));\n}',
};

describe('008-typescript-playground-FR-040: the site keeps responding while code runs', () => {
  for (const [name, code] of Object.entries(LOOPS)) {
    test(`during a ${name} loop, the dock, a key in the editor and Stop respond within 100 ms (SC-005)`, async () => {
      const page = await openPlaygroundPage();
      await setCode(page, code);
      await waitForCode(page, code);
      await waitChecked(page);
      await watchInput(page);
      await run(page, { wait: 'start' });
      await page.waitForTimeout(1_500);
      await focusEditor(page);
      await page.keyboard.press('ArrowRight');
      await page.locator('#os .dock-item[data-app="playground"]').click();
      await stop(page);
      const delays = await page.evaluate(() => (window as unknown as { inputDelays: { type: string; ms: number }[] }).inputDelays);
      expect(delays.length).toBeGreaterThanOrEqual(4);
      for (const delay of delays) expect(delay.ms, delay.type).toBeLessThan(100);
    });
  }
});
