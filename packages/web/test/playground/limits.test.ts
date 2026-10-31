// The logs' limits (spec US2): the latest 1,000 entries, the dropped ones
// counted, and long entries cut, with the editor responding meanwhile.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { counted, fill, siteText } from '../../src/site-text.ts';
import { engine, focusEditor, openPlaygroundPage, PLAYGROUND, POPUP, readLogs, run, RUN_STATE, setCode, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

const logs = siteText.playground.logs;
// The memory they read comes through Chromium's own protocol.
const chromium = engine() === 'chromium';

async function start(page: Page, code: string): Promise<void> {
  await setCode(page, code);
  await waitForCode(page, code);
  await waitChecked(page);
}

// Each key's input delay in the page, in milliseconds.
const watchKeys = (page: Page) =>
  page.evaluate(() => {
    const delays: number[] = [];
    (window as unknown as { keyDelays: number[] }).keyDelays = delays;
    document.addEventListener('keydown', (event) => delays.push(performance.now() - event.timeStamp), true);
  });

describe('008-typescript-playground-FR-044: the logs keep the latest 1,000 entries and cut long ones', () => {
  test('5,000 lines keep the latest 1,000, and the note says how many were dropped', async () => {
    const page = await openPlaygroundPage();
    await start(page, 'for (let i = 0; i < 5000; i++) console.log(i);');
    await run(page);
    const rows = await readLogs(page);
    expect(rows).toHaveLength(1000);
    expect(rows.at(-2)).toMatchObject({ level: 'log', text: '4999' });
    // The code's 5,000 entries and the page's two notes, less the 1,000 kept.
    const dropped = 5000 + 2 - 1000;
    expect((await page.locator(`${PLAYGROUND} .pane-logs p.logs-dropped`).textContent())?.trim()).toBe(fill(counted(logs.dropped, dropped), { n: dropped.toLocaleString('en'), limit: '1,000' }));
  });

  test('a 3 MB string is cut at 10,000 characters with the note, and the editor responds meanwhile', async () => {
    const page = await openPlaygroundPage();
    await start(page, 'const big = "x".repeat(3_000_000);\nfor (let i = 0; i < 5; i++) console.log(big);');
    await watchKeys(page);
    await run(page, { wait: 'start' });
    await focusEditor(page);
    for (let i = 0; i < 5; i += 1) await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('#os section.playground .playground-toolbar button.stop')?.getAttribute('aria-disabled') === 'true');
    const cut = fill(logs.cut, { limit: '10,000' });
    const entries = (await readLogs(page)).filter((row) => row.level === 'log');
    expect(entries).toHaveLength(5);
    for (const entry of entries) expect(entry.text).toBe(`${'x'.repeat(10_000)} ${cut}`);
    const delays = await page.evaluate(() => (window as unknown as { keyDelays: number[] }).keyDelays);
    expect(Math.max(...delays)).toBeLessThan(100);
  });

  // Each loop stamps its entries, so the newest row shows how far behind the
  // page is: a queue that grew would show as an age that grows (it took the
  // browser down at about 5.7 GB). (SC-005)
  for (const [size, name] of chromium ? ([[10_000, '10,000'], [1_000, '1,000']] as const) : []) {
    test(`printing ${name} characters as fast as it can: the page keeps up, within its memory, and keys answer`, async () => {
      const page = await openPlaygroundPage();
      await start(page, `const s = "x".repeat(${size});\nwhile (true) console.log(Date.now() + " " + s);`);
      await watchKeys(page);
      await run(page, { wait: 'start' });
      await focusEditor(page);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Performance.enable');
      const ages: number[] = [];
      let heap = 0;
      for (let i = 0; i < 12; i += 1) {
        await page.waitForTimeout(500);
        await page.keyboard.press('ArrowRight');
        ages.push(
          await page.evaluate((selector) => {
            const rows = document.querySelectorAll(selector);
            const stamp = Number.parseInt(rows[rows.length - 1]?.textContent ?? '', 10);
            return Number.isNaN(stamp) ? 0 : Date.now() - stamp;
          }, `${PLAYGROUND} .pane-logs ol.logs > li.log[data-level="log"] .value`),
        );
        const { metrics } = await cdp.send('Performance.getMetrics');
        heap = Math.max(heap, metrics.find((metric) => metric.name === 'JSHeapUsedSize')?.value ?? 0);
      }
      const delays = await page.evaluate(() => (window as unknown as { keyDelays: number[] }).keyDelays);
      console.log(`${name}: ages ${ages.join(' ')} ms, heap ${Math.round(heap / 1e6)} MB, keys ${delays.map(Math.round).join(' ')} ms`);
      expect(Math.max(...ages.slice(4))).toBeLessThan(4_000);
      expect(heap).toBeLessThan(400e6);
      expect(Math.max(...delays)).toBeLessThan(100);
      // The stuck popup is up by now: its Stop still works and the page lived.
      await page.click(`${POPUP} button.danger`);
      await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('aria-disabled') === 'true', `${PLAYGROUND} .playground-toolbar button.stop`);
      expect((await readLogs(page)).length).toBeLessThanOrEqual(1000);
    });
  }
});

describe('008-typescript-playground-FR-044: uncaught errors keep to the same limits', () => {
  const lag = (page: Page) =>
    page.evaluate(() => {
      const scope = window as unknown as { lags: number[] };
      scope.lags = [];
      let last = performance.now();
      setInterval(() => {
        const at = performance.now();
        scope.lags.push(at - last - 50);
        last = at;
      }, 50);
    });

  // A flood the page must keep up with, for 6 s: the timers throw a tick's
  // worth, the rejections too, or both with a long message. (SC-005)
  const floods: [string, string][] = [
    ['200 throws a tick', 'function f() { for (let i = 0; i < 200; i++) setTimeout(() => { throw new Error("x"); }); setTimeout(f, 0); }\nf();'],
    ['2,000 throws a tick of 9,000 characters', 'const m = "x".repeat(9000);\nfunction f() { for (let i = 0; i < 2000; i++) setTimeout(() => { throw new Error(m); }); setTimeout(f, 0); }\nf();'],
    ['2,000 rejections a tick', 'function f() { for (let i = 0; i < 2000; i++) Promise.reject(new Error("x")); setTimeout(f, 0); }\nf();'],
    ['2,000 timers logging 9,000 characters', 'const m = "x".repeat(9000);\nfunction f() { for (let i = 0; i < 2000; i++) setTimeout(() => console.log(m)); setTimeout(f, 0); }\nf();'],
  ];
  for (const [name, code] of chromium ? floods : []) {
    test(`${name}: the page answers, within its memory, with no stuck popup`, async () => {
      const page = await openPlaygroundPage();
      await start(page, code);
      await lag(page);
      await watchKeys(page);
      await run(page, { wait: 'start' });
      await focusEditor(page);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Performance.enable');
      let heap = 0;
      for (let i = 0; i < 12; i += 1) {
        await page.waitForTimeout(500);
        await page.keyboard.press('ArrowRight');
        const { metrics } = await cdp.send('Performance.getMetrics');
        heap = Math.max(heap, metrics.find((metric) => metric.name === 'JSHeapUsedSize')?.value ?? 0);
      }
      const delays = await page.evaluate(() => (window as unknown as { keyDelays: number[] }).keyDelays);
      const lags = await page.evaluate(() => (window as unknown as { lags: number[] }).lags);
      expect(Math.max(...delays)).toBeLessThan(100);
      // Its timers answered too. Under 40 ms alone; other runs on the machine
      // can slow one, not by this much: it was 106 s before the counts' limit.
      expect(Math.max(...lags)).toBeLessThan(1_000);
      expect(heap).toBeLessThan(400e6);
      expect(await page.locator(POPUP).count()).toBe(0);
    });
  }

  test('5,000 uncaught errors keep the latest 1,000, count the rest as dropped, and all in the end\'s note', async () => {
    const page = await openPlaygroundPage();
    await start(page, 'for (let i = 0; i < 5000; i++) setTimeout(() => { throw new Error("e" + i); });');
    await run(page, { timeout: 60_000 });
    const rows = await readLogs(page);
    expect(rows).toHaveLength(1000);
    expect(rows.at(-2)).toMatchObject({ level: 'error', text: 'Error: e4999', line: 1 });
    const state = (await page.locator(RUN_STATE).textContent())?.trim() ?? '';
    expect(state).toMatch(new RegExp(`^${fill(counted(siteText.playground.runState.errors, 5000), { n: 5000, s: '[\\d.]+' })}$`));
    expect((await page.locator(`${PLAYGROUND} .pane-logs p.logs-dropped`).textContent())?.trim()).toBe(fill(counted(logs.dropped, 4002), { n: '4,002', limit: '1,000' }));
  });
});

describe('008-typescript-playground-FR-040: a flood of the worker\'s own messages reaches nothing', () => {
  for (const [name, code] of [
    ['while (true) postMessage(1)', 'while (true) postMessage(1);'],
    ['a long string, as fast as it can', 'const s = "x".repeat(1000);\nwhile (true) postMessage(s);'],
    ['through self and its prototype', 'const post = Object.getPrototypeOf(self).postMessage ?? self.postMessage;\nwhile (true) post.call(self, 1);'],
  ] as const) {
    test(`${name}: the page keeps answering, and Stop ends it`, async () => {
      const page = await openPlaygroundPage();
      await start(page, code);
      await watchKeys(page);
      await run(page, { wait: 'start' });
      await focusEditor(page);
      for (let i = 0; i < 8; i += 1) {
        await page.waitForTimeout(500);
        await page.keyboard.press('ArrowRight');
      }
      const delays = await page.evaluate(() => (window as unknown as { keyDelays: number[] }).keyDelays);
      expect(Math.max(...delays)).toBeLessThan(100);
      await page.locator(`${PLAYGROUND} .playground-toolbar button.stop`).click();
      await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('aria-disabled') === 'true', `${PLAYGROUND} .playground-toolbar button.stop`);
    });
  }

  test('two million messages in a loop take no time on the page', async () => {
    const page = await openPlaygroundPage();
    await start(page, 'for (let i = 0; i < 2e6; i++) postMessage(i);\nconsole.log("done");');
    await watchKeys(page);
    await run(page, { timeout: 30_000 });
    await focusEditor(page);
    await page.keyboard.press('ArrowRight');
    const delays = await page.evaluate(() => (window as unknown as { keyDelays: number[] }).keyDelays);
    expect(Math.max(...delays)).toBeLessThan(100);
    expect((await readLogs(page)).map((row) => row.text)).toContain('done');
  });

  test('a BroadcastChannel is an error the logs show, so its sends can\'t flood the browser', async () => {
    const page = await openPlaygroundPage();
    await start(page, 'const b = new BroadcastChannel("a");\nwhile (true) b.postMessage(1);');
    await run(page, { timeout: 10_000 });
    expect((await readLogs(page)).filter((row) => row.level === 'error')).toHaveLength(1);
  });
});

describe('008-typescript-playground-FR-040: requests start by the clock, so a loop of them leaves the page answering', () => {
  const loops: [string, string][] = [
    ['fetch of data: without end', 'while (true) fetch("data:text/plain,hi");'],
    ['2,000 fetches of data: a tick', 'function f() { for (let i = 0; i < 2000; i++) fetch("data:text/plain,hi"); setTimeout(f, 0); }\nf();'],
    ['fetch of a closed port without end', 'while (true) fetch("http://127.0.0.1:1/x");'],
    ['XMLHttpRequest of a closed port without end', 'while (true) { const x = new XMLHttpRequest(); x.open("GET", "http://127.0.0.1:1/x"); x.send(); }'],
  ];
  for (const [name, code] of loops) {
    test(`${name}: keys answer within SC-005's 100 ms`, async () => {
      const page = await openPlaygroundPage();
      await start(page, code);
      await watchKeys(page);
      await run(page, { wait: 'start' });
      await focusEditor(page);
      for (let i = 0; i < 6; i += 1) {
        await page.waitForTimeout(500);
        await page.keyboard.press('ArrowRight');
      }
      const delays = await page.evaluate(() => (window as unknown as { keyDelays: number[] }).keyDelays);
      expect(delays.length).toBeGreaterThan(0);
      if (process.env['PROBE_OUT']) (await import('node:fs')).appendFileSync(process.env['PROBE_OUT'], `${name}: ${delays.map(Math.round).join(' ')}\n`);
      expect(Math.max(...delays)).toBeLessThan(100);
    });
  }

  test('requests past the limit are all made, in order, and pending until they answer', async () => {
    const page = await openPlaygroundPage();
    await start(
      page,
      [
        'const all = [];',
        `for (let i = 0; i < 400; i++) all.push(fetch("${new URL(page.url()).origin}/held-" + i).catch(() => null));`,
        'const held = new XMLHttpRequest();',
        'held.open("GET", "data:text/plain,xhr");',
        'held.onload = () => console.log("xhr", held.responseText);',
        'held.send();',
        'try {',
        '  held.send();',
        '} catch (error) {',
        '  console.log((error as Error).name);',
        '}',
        'await Promise.all(all);',
        'console.log(all.length);',
      ].join('\n'),
    );
    const asked: number[] = [];
    page.context().on('request', (request) => {
      const found = /\/held-(\d+)$/.exec(request.url());
      if (found !== null) asked.push(Number(found[1]));
    });
    await run(page);
    const rows = (await readLogs(page)).filter((row) => row.level === 'log').map((row) => row.text).sort();
    expect(rows).toEqual(['400', 'InvalidStateError', 'xhr xhr']);
    expect(asked).toEqual(Array.from({ length: 400 }, (_, i) => i));
    expect((await page.locator(RUN_STATE).textContent())?.trim()).toMatch(/^Finished/);
  });

  test('a held XMLHttpRequest taken back never goes, says so, and holds nothing', async () => {
    const page = await openPlaygroundPage();
    await start(
      page,
      [
        'for (let i = 0; i < 100; i++) fetch("data:text/plain,hi");',
        'const taken = new XMLHttpRequest();',
        'taken.open("GET", "data:text/plain,taken");',
        'taken.onload = () => console.log("loaded");',
        'taken.onabort = () => console.log("aborted");',
        'taken.send();',
        'taken.abort();',
        'const again = new XMLHttpRequest();',
        'again.open("GET", "data:text/plain,first");',
        'again.onload = () => console.log(again.responseText);',
        'again.send();',
        'again.open("GET", "data:text/plain,second");',
        'again.send();',
      ].join('\n'),
    );
    await run(page);
    const rows = (await readLogs(page)).filter((row) => row.level === 'log').map((row) => row.text);
    expect(rows).toEqual(['aborted', 'second']);
    expect((await page.locator(RUN_STATE).textContent())?.trim()).toMatch(/^Finished/);
  });

  test('a request that blocks the code still goes at once', async () => {
    const page = await openPlaygroundPage();
    await start(page, 'for (let i = 0; i < 100; i++) fetch("data:text/plain,hi");\nconst x = new XMLHttpRequest();\nx.open("GET", "data:text/plain,now", false);\nx.send();\nconsole.log(x.responseText);');
    await run(page);
    expect((await readLogs(page)).filter((row) => row.level === 'log').map((row) => row.text)).toEqual(['now']);
  });
});
