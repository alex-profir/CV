// Uncaught errors (spec US2): a throw at the top, in a timer, and an
// unhandled rejection each log their name, message and the code's line,
// which moves the cursor there; other timers go on; the end counts them.
import { describe, expect, test, vi } from 'vitest';
import { counted, fill, siteText } from '../../src/site-text.ts';
import { EDITOR, engine, openPlaygroundPage, PLAYGROUND, readLogs, run, RUN_STATE, setCode, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

const CODE = [
  'setInterval(() => console.log("tick"), 150);',
  'setTimeout(() => {',
  '  throw new TypeError("in a timer");',
  '}, 100);',
  'setTimeout(() => clearInterval(1), 700);',
  'Promise.reject(new RangeError("rejected"));',
  'function fail(): never {',
  '  throw new Error("at the top");',
  '}',
  'fail();',
].join('\n');

describe('008-typescript-playground-FR-035: uncaught errors are logged with their line, and the run goes on', () => {
  test('a throw at the top, in a timer and an unhandled rejection each log name, message and line', async () => {
    const page = await openPlaygroundPage();
    await setCode(page, CODE);
    await waitForCode(page, CODE);
    await waitChecked(page);
    await run(page);
    const rows = await readLogs(page);
    const errors = rows.filter((row) => row.level === 'error');
    expect(errors).toEqual(
      expect.arrayContaining([
        { level: 'error', text: 'Error: at the top', line: 8 },
        { level: 'error', text: 'RangeError: rejected', line: 6 },
        { level: 'error', text: 'TypeError: in a timer', line: 3 },
      ]),
    );
    expect(errors).toHaveLength(3);
    // The interval went on after the errors.
    const lastError = rows.findLastIndex((row) => row.level === 'error');
    expect(rows.slice(lastError).some((row) => row.text === 'tick')).toBe(true);
  });

  test('the run ends with the count of uncaught errors, and a line button moves the cursor there', async () => {
    const page = await openPlaygroundPage();
    await setCode(page, CODE);
    await waitForCode(page, CODE);
    await waitChecked(page);
    await run(page);
    const state = (await page.locator(RUN_STATE).textContent())?.trim() ?? '';
    expect(state).toMatch(new RegExp(`^${fill(counted(siteText.playground.runState.errors, 3), { n: 3, s: '[\\d.]+' })}$`));
    expect((await readLogs(page)).at(-1)).toMatchObject({ level: 'note', text: state });
    await page.locator(`${PLAYGROUND} .pane-logs button.log-line`).filter({ hasText: fill(siteText.playground.logs.line, { n: 8 }) }).click();
    await expect.poll(() => page.locator(`${PLAYGROUND} .playground-status span`).first().textContent()).toMatch(/^Ln 8, Col 1$/);
    expect(await page.evaluate((selector) => document.querySelector(selector)?.contains(document.activeElement), EDITOR)).toBe(true);
  });
});

describe("008-typescript-playground-FR-035: an error thrown through the runtime's wrappers has the visitor's line", () => {
  test('new WebSocket with a bad address logs its line in the code', async () => {
    const page = await openPlaygroundPage();
    const code = 'console.log("before");\nnew WebSocket("not a url");';
    await setCode(page, code);
    await waitForCode(page, code.split('\n')[0]!);
    await waitChecked(page);
    await run(page);
    const errors = (await readLogs(page)).filter((row) => row.level === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.line).toBe(2);
  });
});

describe("008-typescript-playground-FR-035: JavaScript the browser refuses says so, with the browser's message and line", () => {
  test.each([
    ['a syntax error', 'console.log("a");\nconst x = ;', 2, 1],
    ['a name declared twice', 'const a = 1;\nconst a = 2;', 2, 2],
    ['a break outside a loop', 'console.log("a");\nbreak;', 2, 1],
    ['import.meta, which TypeScript accepts', 'console.log(1);\nconsole.log(import.meta.url);', 2, 1],
  ])('%s: nothing runs, the note and the error, and "Nothing ran"', async (_name, code, line, count) => {
    const page = await openPlaygroundPage();
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await setCode(page, code);
    await waitForCode(page, code.split('\n')[0]!);
    await waitChecked(page);
    await run(page);
    await expect.poll(async () => (await readLogs(page)).length).toBe(2);
    // The note says it: it isn't the page's own uncaught error too. WebKit reports
    // a refused worker script to its inspector whatever the page does with the event.
    if (engine() !== 'webkit') expect(pageErrors).toEqual([]);
    const [note, error] = await readLogs(page);
    expect(note!.level).toBe('note');
    expect(note!.text.startsWith('Nothing ran: the code has ')).toBe(true);
    expect(note!.text.endsWith("and its JavaScript can't be read.")).toBe(true);
    expect(note!.text).toContain(`has ${count} error`);
    expect(error!.level).toBe('error');
    expect(error!.text).toMatch(/SyntaxError/);
    expect(error!.line).toBe(line);
    expect((await page.locator(RUN_STATE).textContent())?.trim()).toBe(siteText.playground.runState.nothingRan);
  });
});

// The browser reports a rejection in a task of its own: a run with nothing
// else pending used to end first, and log nothing.
describe('008-typescript-playground-FR-035: a rejection with nothing else pending is still reported', () => {
  test.each([
    ['Promise.reject', 'Promise.reject(new Error("boom"));'],
    ['an async function', 'async function f() {\n  throw new Error("boom");\n}\nf();'],
    ['after await null', 'await null;\nPromise.reject(new Error("boom"));'],
    ['a then that throws', 'Promise.resolve().then(() => {\n  throw new Error("boom");\n});'],
    ['a rejection in a timer', 'setTimeout(() => {\n  Promise.reject(new Error("boom"));\n}, 1);'],
  ])('%s logs the error and ends with its count', async (_name, code) => {
    const page = await openPlaygroundPage();
    await setCode(page, code);
    await waitForCode(page, code.split('\n')[0]!);
    await waitChecked(page);
    await run(page);
    expect((await readLogs(page)).filter((row) => row.level === 'error').map((row) => row.text)).toEqual(['Error: boom']);
    const state = (await page.locator(RUN_STATE).textContent())?.trim() ?? '';
    expect(state).toMatch(new RegExp(`^${fill(counted(siteText.playground.runState.errors, 1), { n: 1, s: '[\\d.]+' })}$`));
  });

  test("a promise that never settles still ends the run, as there's nothing left to do", async () => {
    const page = await openPlaygroundPage();
    const code = 'console.log("before");\nawait new Promise(() => {});\nconsole.log("after");';
    await setCode(page, code);
    await waitForCode(page, code.split('\n')[0]!);
    await waitChecked(page);
    await run(page);
    expect((await readLogs(page)).filter((row) => row.level === 'log').map((row) => row.text)).toEqual(['before']);
    expect((await page.locator(RUN_STATE).textContent())?.trim()).toMatch(new RegExp(`^${fill(siteText.playground.runState.finished, { s: '[\\d.]+' })}$`));
  });
});

describe("008-typescript-playground-FR-035: a thrown value that isn't an Error has its line where the browser knows it", () => {
  test('in a timer it has its line; in the code\'s async body and a rejection with no stack it has none', async () => {
    const page = await openPlaygroundPage();
    const code = 'setTimeout(() => {\n  throw "in a timer";\n}, 1);\nPromise.reject("rejected");\nthrow "at the top";';
    await setCode(page, code);
    await waitForCode(page, code.split('\n')[0]!);
    await waitChecked(page);
    await run(page);
    const errors = (await readLogs(page)).filter((row) => row.level === 'error');
    expect(errors).toEqual(
      expect.arrayContaining([
        // WebKit's `error` event is muted here, so it can't say.
        { level: 'error', text: 'in a timer', line: engine() === 'webkit' ? null : 2 },
        { level: 'error', text: 'rejected', line: null },
        { level: 'error', text: 'at the top', line: null },
      ]),
    );
    expect(errors).toHaveLength(3);
  });
});

describe('008-typescript-playground-FR-035: a rejection of a promise the runtime counts is the code\'s to handle', () => {
  const start = async (code: string) => {
    const page = await openPlaygroundPage();
    await setCode(page, code);
    await waitForCode(page, code);
    await waitChecked(page);
    await run(page);
    return { page, rows: await readLogs(page) };
  };

  test('a request the code never handles logs its error', async () => {
    const { page, rows } = await start('fetch("http://127.0.0.1:1/nope");');
    expect(rows.filter((row) => row.level === 'error')).toHaveLength(1);
    expect((await page.locator(RUN_STATE).textContent())?.trim()).toMatch(new RegExp(`^${fill(counted(siteText.playground.runState.errors, 1), { n: 1, s: '[\\d.]+' })}$`));
  });

  test('another counted call the code never handles logs its error too', async () => {
    const { rows } = await start('new Blob(["x"]).text().then(() => { throw new Error("in the then"); });\ncrypto.subtle.digest("nope", new Uint8Array(1));');
    expect(rows.filter((row) => row.level === 'error').map((row) => row.text)).toContain('Error: in the then');
    expect(rows.filter((row) => row.level === 'error')).toHaveLength(2);
  });

  test('one it handles, by catch or by await in a try, logs none, and gets the value', async () => {
    const { rows } = await start('fetch("http://127.0.0.1:1/nope").catch(() => console.log("caught"));\ntry {\n  await fetch("http://127.0.0.1:1/nope");\n} catch {\n  console.log("caught too");\n}\nconsole.log(await new Blob(["held"]).text());');
    expect(rows.filter((row) => row.level === 'error')).toEqual([]);
    const shown = rows.filter((row) => row.level === 'log').map((row) => row.text);
    expect(shown).toEqual(expect.arrayContaining(['caught', 'caught too', 'held']));
  });
});

describe('008-typescript-playground-FR-035: a #! line keeps the lines of what follows', () => {
  test("a throw after a #! line has the code's line, with no page error", async () => {
    const page = await openPlaygroundPage();
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    const code = '#!/usr/bin/env node\nconsole.log("after shebang");\nthrow new Error("on line 3");';
    await setCode(page, code);
    await waitForCode(page, code);
    await waitChecked(page);
    await run(page);
    const rows = await readLogs(page);
    expect(rows.find((row) => row.level === 'log')?.text).toBe('after shebang');
    expect(rows.find((row) => row.level === 'error')).toMatchObject({ line: 3 });
    expect(pageErrors).toEqual([]);
  });
});
