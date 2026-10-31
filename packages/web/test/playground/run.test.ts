// Running the code (spec US2): Run and its key run the code, open Logs and
// empty it; a second Run ends the first; the code's errors are said first;
// with noEmitOnError and errors nothing runs; the toolbar shows the run's
// state and its end.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { counted, fill, siteText } from '../../src/site-text.ts';
import { focusEditor, openPlaygroundPage, paneTab, PLAYGROUND, primary, readLogs, run, RUN_STATE, RUNNER, running, setCode, showPane, stop, TOOLBAR, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

const logs = siteText.playground.logs;
const states = siteText.playground.runState;

async function withCode(page: Page, code: string): Promise<void> {
  await setCode(page, code);
  await waitForCode(page, code);
  await waitChecked(page);
}

const notes = async (page: Page) => (await readLogs(page)).filter((row) => row.level === 'note').map((row) => row.text);
const values = async (page: Page) => (await readLogs(page)).filter((row) => row.level !== 'note').map((row) => row.text);

describe('008-typescript-playground-FR-032: Run and its key run the code, open the logs and empty them', () => {
  test('Run opens Logs, empties it and shows what the code logs', async () => {
    const page = await openPlaygroundPage();
    await withCode(page, 'console.log("first");');
    await showPane(page, 'javascript');
    await run(page);
    expect(await paneTab(page, 'logs').getAttribute('aria-selected')).toBe('true');
    expect(await values(page)).toEqual(['first']);
    await withCode(page, 'console.log("second");');
    await run(page);
    expect(await values(page)).toEqual(['second']);
  });

  test("the editor's Run key runs the code", async () => {
    const page = await openPlaygroundPage();
    await withCode(page, 'console.log("by key");');
    await focusEditor(page);
    await page.keyboard.press(`${await primary(page)}+Enter`);
    await expect.poll(async () => values(page)).toEqual(['by key']);
    expect(await page.locator(`${TOOLBAR} button.run`).getAttribute('aria-keyshortcuts')).toBe((await primary(page)) === 'Meta' ? 'Meta+Enter' : 'Control+Enter');
  });

  test('Run during a run ends the first, then starts', async () => {
    const page = await openPlaygroundPage();
    await withCode(page, 'let n = 0;\nsetInterval(() => console.log("tick", ++n), 100);');
    await run(page, { wait: 'start' });
    await expect.poll(async () => (await values(page)).length).toBeGreaterThan(1);
    const first = await page.locator(RUNNER).elementHandle();
    await run(page, { wait: 'start' });
    await expect.poll(async () => (await values(page))[0]).toBe('tick 1');
    expect(await page.locator(RUNNER).count()).toBe(1);
    expect(await first!.evaluate((frame) => frame.isConnected)).toBe(false);
    await stop(page);
  });
});

describe('008-typescript-playground-FR-032: code with exports runs as a script', () => {
  for (const [name, code, shown] of [
    ['an anonymous default function', 'export default function () { console.log("never called"); }\nconsole.log("ran");', ['ran']],
    ['an anonymous default async function', 'export default async function () { console.log("never called"); }\nconsole.log("ran");', ['ran']],
    ['an anonymous default generator', 'export default function* () { yield 1; }\nconsole.log("ran");', ['ran']],
    ['an anonymous default class', 'export default class { static made = console.log("made"); }\nconsole.log("ran");', ['made', 'ran']],
    ['a named default function, still callable', 'export default function named() { return 2; }\nconsole.log(named());', ['2']],
    ['a default expression, still evaluated', 'export default console.log("evaluated");\nconsole.log("ran");', ['evaluated', 'ran']],
  ] as const) {
    test(name, async () => {
      const page = await openPlaygroundPage();
      await withCode(page, code);
      await run(page);
      expect(await values(page)).toEqual(shown);
      expect((await page.locator(RUN_STATE).textContent())?.trim()).toMatch(/^Finished/);
    });
  }
});

describe('008-typescript-playground-FR-033: code with errors runs, and the logs say so first', () => {
  test('code with 2 errors runs and says so first', async () => {
    const page = await openPlaygroundPage();
    await withCode(page, 'const a: number = "one";\nconst b: string = 2;\nconsole.log(a, b);');
    await run(page);
    const rows = await readLogs(page);
    expect(rows[0]).toMatchObject({ level: 'note', text: fill(counted(logs.errorsNote, 2), { n: 2 }) });
    expect(rows[1]).toMatchObject({ level: 'log', text: 'one 2' });
  });

  test('code with no errors says so first', async () => {
    const page = await openPlaygroundPage();
    await withCode(page, 'console.log(1);');
    await run(page);
    expect((await readLogs(page))[0]).toMatchObject({ level: 'note', text: logs.noErrors });
  });

  test('with noEmitOnError and errors, nothing runs and the logs say why', async () => {
    const page = await openPlaygroundPage();
    await page.locator(`${TOOLBAR} button.options`).click();
    await page.locator(`${PLAYGROUND} #playground-option-noEmitOnError`).check();
    await page.keyboard.press('Escape');
    await withCode(page, 'const a: number = "one";\nconsole.log(a);');
    await run(page);
    expect(await notes(page)).toEqual([fill(logs.nothingRan, { option: 'noEmitOnError' })]);
    expect(await page.locator(RUNNER).count()).toBe(0);
    expect((await page.locator(RUN_STATE).textContent())?.trim()).toBe(states.nothingRan);
  });
});

describe('008-typescript-playground-FR-033: the logs count what the Errors pane counts, and only noEmitOnError stops a run', () => {
  const CANT_DECLARE = 'export const f = () => { class L { private x = 1; } return new L(); };\nconsole.log("ran");';
  const option = async (page: Page, name: string, on: boolean) => {
    await page.locator(`${TOOLBAR} button.options`).click();
    await page.locator(`${PLAYGROUND} #playground-option-${name}`).setChecked(on);
    await page.keyboard.press('Escape');
  };

  test('code whose declarations alone can\'t be made runs, and the logs count that error', async () => {
    const page = await openPlaygroundPage();
    await withCode(page, CANT_DECLARE);
    await run(page);
    const rows = await readLogs(page);
    expect(rows[0]).toMatchObject({ level: 'note', text: fill(counted(logs.errorsNote, 1), { n: 1 }) });
    expect(await values(page)).toEqual(['ran']);
  });

  test('with noEmitOnError on, the same code does not run', async () => {
    const page = await openPlaygroundPage();
    await option(page, 'noEmitOnError', true);
    await withCode(page, CANT_DECLARE);
    await run(page);
    expect(await notes(page)).toEqual([fill(logs.nothingRan, { option: 'noEmitOnError' })]);
    expect(await values(page)).toEqual([]);
  });

  test('an options error counts in the logs as in the status bar', async () => {
    const page = await openPlaygroundPage();
    await option(page, 'strictNullChecks', false);
    await withCode(page, 'console.log("ran");');
    await run(page);
    const status = (await page.locator(`${PLAYGROUND} .playground-status .check`).textContent())?.trim();
    const shown = Number(/\d+/.exec(status ?? '')?.[0]);
    expect(shown).toBeGreaterThan(0);
    expect((await readLogs(page))[0]).toMatchObject({ level: 'note', text: fill(counted(logs.errorsNote, shown), { n: shown }) });
    expect(await values(page)).toEqual(['ran']);
  });

  test('a mark on an import counts once in the logs\' reason, not twice', async () => {
    const page = await openPlaygroundPage();
    await withCode(page, 'import x from "lodash";\nconsole.log(x);');
    await run(page);
    expect(await notes(page)).toEqual([siteText.playground.editor.packages]);
  });
});

describe('008-typescript-playground-FR-036: the toolbar shows the run, its pending timers and its end', () => {
  test('a 2 s timer shows one timer left, then Finished in about 2 s', async () => {
    const page = await openPlaygroundPage();
    await withCode(page, 'console.log("start");\nsetTimeout(() => console.log("done"), 2000);');
    await run(page, { wait: 'start' });
    await expect.poll(async () => (await page.locator(RUN_STATE).textContent())?.trim()).toMatch(new RegExp(`^${fill(counted(states.running, 1), { n: 1, s: '[\\d.]+' })}$`));
    expect(await running(page)).toBe(true);
    expect(await page.locator(`${RUN_STATE} svg.mark-running`).count()).toBe(1);
    await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('aria-disabled') === 'true', `${TOOLBAR} button.stop`, { timeout: 10_000 });
    expect(await values(page)).toEqual(['start', 'done']);
  });

  test('the end is shown with its time and a tick, and logged last', async () => {
    const page = await openPlaygroundPage();
    await withCode(page, 'setTimeout(() => console.log("done"), 2000);');
    await run(page);
    const state = (await page.locator(RUN_STATE).textContent())?.trim() ?? '';
    const match = new RegExp(`^${fill(states.finished, { s: '([\\d.]+)' })}$`).exec(state);
    expect(match, state).not.toBeNull();
    expect(Number(match![1])).toBeGreaterThanOrEqual(2);
    expect(Number(match![1])).toBeLessThan(3);
    expect(await page.locator(`${RUN_STATE} svg.mark-ok`).count()).toBe(1);
    expect((await notes(page)).at(-1)).toBe(state);
  });

  test('a promise that never settles, with nothing pending, ends the run', async () => {
    const page = await openPlaygroundPage();
    await withCode(page, 'console.log("waiting forever");\nawait new Promise(() => {});\nconsole.log("never");');
    await run(page, { timeout: 10_000 });
    expect(await values(page)).toEqual(['waiting forever']);
    expect((await page.locator(RUN_STATE).textContent())?.trim()).toMatch(new RegExp(`^${fill(states.finished, { s: '[\\d.]+' })}$`));
  });
});

describe("008-typescript-playground-FR-032: the script body doesn't change the visitor's strings", () => {
  test('a template literal holding export {} keeps it', async () => {
    const page = await openPlaygroundPage();
    await withCode(page, 'const s = `\nexport {}\n`;\nconsole.log(s.length);');
    await run(page);
    expect(await values(page)).toEqual(['11']);
  });

  test('code with no export of its own, and code with one, still run as a script', async () => {
    const page = await openPlaygroundPage();
    await withCode(page, 'export const a = 1;\nexport {};\nconsole.log(a);');
    await run(page);
    expect(await values(page)).toEqual(['1']);
  });
});
