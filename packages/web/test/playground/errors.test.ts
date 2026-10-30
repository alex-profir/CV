// Uncaught errors (spec US2): a throw at the top, in a timer, and an
// unhandled rejection each log their name, message and the code's line,
// which moves the cursor there; other timers go on; the end counts them.
import { describe, expect, test, vi } from 'vitest';
import { counted, fill, siteText } from '../../src/site-text.ts';
import { EDITOR, openPlaygroundPage, PLAYGROUND, readLogs, run, RUN_STATE, setCode, waitChecked, waitForCode } from '../helpers/playground.ts';

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
