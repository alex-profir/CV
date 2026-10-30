// Waiting is not being stuck (spec US2): a run waiting on a long timer or a
// slow request is pending, never blocking, and gets no stuck popup.
import { afterEach, describe, expect, test, vi } from 'vitest';
import { counted, fill, siteText } from '../../src/site-text.ts';
import { startOtherSite } from '../helpers/other-site.ts';
import type { OtherSite } from '../helpers/other-site.ts';
import { openPlaygroundPage, POPUP, readLogs, run, RUN_STATE, running, setCode, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 240_000 });

let other: OtherSite | null = null;
afterEach(async () => {
  await other?.close();
  other = null;
});

describe('008-typescript-playground-FR-037: a run waiting on a timer or a request is waiting, not stuck', () => {
  // Playwright's clock doesn't reach the sandboxed frame's worker, so the
  // test waits the real 60 s.
  test('a 60 s timer waits with no popup, and the run ends after it fires', async () => {
    const page = await openPlaygroundPage();
    const code = 'console.log("waiting");\nsetTimeout(() => console.log("fired"), 60_000);';
    await setCode(page, code);
    await waitForCode(page, code);
    await waitChecked(page);
    await run(page, { wait: 'start' });
    await page.waitForTimeout(8_000);
    expect(await page.locator(POPUP).count()).toBe(0);
    expect((await page.locator(RUN_STATE).textContent())?.trim()).toMatch(new RegExp(`^${fill(counted(siteText.playground.runState.running, 1), { n: 1, s: '[\\d.]+' })}$`));
    await page.waitForFunction(() => document.querySelector('#os section.playground .playground-toolbar button.stop')?.getAttribute('aria-disabled') === 'true', null, { timeout: 70_000 });
    expect(await page.locator(POPUP).count()).toBe(0);
    expect((await readLogs(page)).filter((row) => row.level === 'log').map((row) => row.text)).toEqual(['waiting', 'fired']);
  });

  test('a slow request counts as pending and never as blocking', async () => {
    other = await startOtherSite({ delay: 7_000 });
    const page = await openPlaygroundPage();
    const code = `const reply = await fetch(${JSON.stringify(`${other.url}/slow`)});\nconsole.log("status", reply.status);`;
    await setCode(page, code);
    await waitForCode(page, code);
    await waitChecked(page);
    await run(page, { wait: 'start' });
    await page.waitForTimeout(6_500);
    expect(await running(page)).toBe(true);
    expect(await page.locator(POPUP).count()).toBe(0);
    await page.waitForFunction(() => document.querySelector('#os section.playground .playground-toolbar button.stop')?.getAttribute('aria-disabled') === 'true', null, { timeout: 20_000 });
    expect((await readLogs(page)).filter((row) => row.level === 'log').map((row) => row.text)).toEqual(['status 200']);
  });

  // The browser's own promises settle in a later task, so a run that looked
  // only at timers and requests ended before they did.
  test("a run waits for the browser's own promises: a blob, a digest where it's offered, the caches", async () => {
    const page = await openPlaygroundPage();
    const code = `console.log("blob", await new Blob(["four"]).text());
// A sandboxed frame isn't always a secure context.
const subtle = (crypto as any).subtle;
if (subtle !== undefined) await subtle.digest("SHA-256", new TextEncoder().encode("x"));
console.log("digest done");
try {
  await caches.keys();
} catch {
  // Refused, in an opaque origin.
}
console.log("caches done");`;
    await setCode(page, code);
    await waitForCode(page, 'console.log("caches done");');
    await waitChecked(page);
    await run(page);
    expect((await readLogs(page)).filter((row) => row.level === 'log').map((row) => row.text)).toEqual(['blob four', 'digest done', 'caches done']);
  });
});
