// The logs (spec US2): each console level with its word and glyph, values
// shown by their kind, and nothing the code prints becoming markup.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { fill, siteText } from '../../src/site-text.ts';
import { openPlaygroundPage, PLAYGROUND, readLogs, run, setCode, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

const levels = siteText.playground.logs.levels;

async function runCode(page: Page, code: string): Promise<void> {
  await setCode(page, code);
  await waitForCode(page, code);
  await waitChecked(page);
  await run(page);
}

const entries = async (page: Page) => (await readLogs(page)).filter((row) => row.level !== 'note');

describe('008-typescript-playground-FR-034: the logs show each level and every kind of value', () => {
  test('each console level with its word and glyph; other methods as log lines; clear empties the logs', async () => {
    const page = await openPlaygroundPage();
    await runCode(page, ['console.log("gone");', 'console.clear();', 'console.log("l");', 'console.info("i");', 'console.warn("w");', 'console.error("e");', 'console.debug("d");', 'console.table([1]);', 'console.trace("t");'].join('\n'));
    const rows = await entries(page);
    expect(rows.map((row) => [row.level, row.text])).toEqual([
      ['log', 'l'],
      ['info', 'i'],
      ['warn', 'w'],
      ['error', 'e'],
      ['debug', 'd'],
      ['log', '[1]'],
      ['log', 't'],
    ]);
    const words = await page.locator(`${PLAYGROUND} .pane-logs li.log:not([data-level="note"]) span.level`).allTextContents();
    expect(words.slice(0, 5)).toEqual([levels.log, levels.info, levels.warn, levels.error, levels.debug]);
    for (const [level, mark] of [['info', 'mark-info'], ['warn', 'mark-warn'], ['error', 'mark-error']]) {
      expect(await page.locator(`${PLAYGROUND} .pane-logs li.log[data-level="${level}"] span.level svg.${mark}`).count(), level).toBe(1);
    }
  });

  test('strings, numbers, null, undefined, arrays, objects, maps, sets, dates, errors, circular, functions, classes, deep and long values', async () => {
    const page = await openPlaygroundPage();
    await runCode(
      page,
      [
        'class Point { x = 1; y = 2; }',
        'function named() {}',
        'const loop: { self?: unknown } = {};',
        'loop.self = loop;',
        'console.log("text", 42, null, undefined, true, 7n);',
        'console.log([1, "two", [3]]);',
        'console.log({ a: 1, "b c": "d" }, new Point());',
        'console.log(new Map([["k", 1]]), new Set([1, 2]));',
        'console.log(new Date(Date.UTC(2020, 0, 2)));',
        'console.log(new RangeError("bad"));',
        'console.log(loop);',
        'console.log(named, Point, () => 1);',
        'console.log([[[[[1]]]]]);',
        'console.log(Array.from({ length: 102 }, (_, i) => i));',
      ].join('\n'),
    );
    const texts = (await entries(page)).map((row) => row.text);
    const logs = siteText.playground.logs;
    expect(texts.slice(0, 9)).toEqual([
      'text 42 null undefined true 7n',
      '[1, "two", [3]]',
      '{ a: 1, "b c": "d" } Point { x: 1, y: 2 }',
      'Map(1) { "k" => 1 } Set(2) { 1, 2 }',
      '2020-01-02T00:00:00.000Z',
      'RangeError: bad',
      `{ self: ${logs.circular} }`,
      `${fill(logs.functionName, { name: 'named' })} ${fill(logs.className, { name: 'Point' })} ${fill(logs.functionName, { name: logs.anonymous })}`,
      `[[[[${logs.deep}]]]]`,
    ]);
    const long = texts[9]!;
    expect(long.startsWith('[0, 1, 2, ')).toBe(true);
    expect(long.endsWith(`, 99, ${fill(logs.more, { n: 2 })}]`)).toBe(true);
  });
});

describe('008-typescript-playground-FR-047: nothing the code prints becomes markup', () => {
  test('logging markup, a link and a style string adds no element, link or style to the page', async () => {
    const page = await openPlaygroundPage();
    // What the logged markup would add if it were markup: an image, the
    // link, a bold element, and a style rule hiding the page.
    const count = () =>
      page.evaluate(() => ({
        img: document.querySelectorAll('img').length,
        link: document.querySelectorAll('a[href="https://example.com"]').length,
        b: document.querySelectorAll('b').length,
        style: [...document.querySelectorAll('style')].filter((element) => (element.textContent ?? '').includes('display: none')).length,
      }));
    const before = await count();
    await page.evaluate(() => ((window as unknown as { hit: boolean }).hit = false));
    await runCode(page, ['console.log("<img src=x onerror=\\"parent.hit = true\\">");', 'console.log("<a href=\\"https://example.com\\">link</a>");', 'console.log("%c<b>styled</b>", "color: red");', 'console.log("<style>body { display: none }</style>");'].join('\n'));
    const texts = (await entries(page)).map((row) => row.text);
    expect(texts[0]).toBe('<img src=x onerror="parent.hit = true">');
    expect(texts[1]).toBe('<a href="https://example.com">link</a>');
    expect(texts[2]).toBe('%c<b>styled</b> color: red');
    expect(await count()).toEqual(before);
    expect(await page.evaluate(() => (window as unknown as { hit: boolean }).hit)).toBe(false);
    expect(await page.evaluate(() => getComputedStyle(document.body).display)).not.toBe('none');
  });
});
