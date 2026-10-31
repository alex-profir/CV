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

describe('008-typescript-playground-FR-034: every console call shows its real output', () => {
  test('count, assert and time print what a console prints, and the browser\'s own objects show their state', async () => {
    const page = await openPlaygroundPage();
    await runCode(
      page,
      [
        'console.count("a");',
        'console.count("a");',
        'console.count();',
        'console.assert(true, "hidden");',
        'console.assert(false, "shown");',
        'console.time("t");',
        'console.timeEnd("t");',
        'console.log(new DataView(new ArrayBuffer(8)));',
        'console.log(new ArrayBuffer(8));',
        'console.log(/a+/g);',
        'console.log(new URL("https://example.test/x"));',
        'console.log(Promise.resolve(1));',
      ].join('\n'),
    );
    const rows = await entries(page);
    expect(rows.map((row) => row.text).slice(0, 4)).toEqual(['a: 1', 'a: 2', 'default: 1', 'shown']);
    expect(rows[3]!.level).toBe('error');
    expect(rows[4]!.text).toMatch(/^t: \d+\.\d{3} ms$/);
    expect(rows.slice(5).map((row) => row.text)).toEqual(['DataView { byteLength: 8, byteOffset: 0 }', 'ArrayBuffer { byteLength: 8 }', '/a+/g', 'URL { href: "https://example.test/x" }', 'Promise']);
  });

  test('a Proxy that throws on every step shows the error and the code goes on', async () => {
    const page = await openPlaygroundPage();
    await runCode(page, ['const bad = new Proxy({}, { getPrototypeOf() { throw new TypeError("no prototype"); } });', 'console.log(bad);', 'console.log("after");'].join('\n'));
    expect((await entries(page)).map((row) => row.text)).toEqual(['TypeError: no prototype', 'after']);
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
    // `%c` takes the style, as a console does, and it styles nothing.
    expect(texts[2]).toBe('<b>styled</b>');
    expect(await count()).toEqual(before);
    expect(await page.evaluate(() => (window as unknown as { hit: boolean }).hit)).toBe(false);
    expect(await page.evaluate(() => getComputedStyle(document.body).display)).not.toBe('none');
  });
});

describe('008-typescript-playground-FR-034: the logs show what a browser\'s console shows', () => {
  test('placeholders, groups with nothing to show, causes, symbol keys and holes', async () => {
    const page = await openPlaygroundPage();
    await runCode(
      page,
      [
        'console.log("%s is %d", "a", 1);',
        'console.group("g");',
        'console.groupEnd();',
        'console.log(new Error("outer", { cause: new Error("inner") }));',
        'console.log(new AggregateError([new Error("a")], "all"));',
        'console.log({ [Symbol("k")]: 1 });',
        'console.log([1, , 3]);',
      ].join('\n'),
    );
    expect((await entries(page)).map((row) => row.text)).toEqual(['a is 1', 'g', 'Error: outer { cause: Error: inner }', 'AggregateError: all { errors: [Error: a] }', '{ [Symbol(k)]: 1 }', '[1, , 3]']);
  });
});

describe('008-typescript-playground-FR-034: what the code logged shows, whatever comes after it', () => {
  async function start(page: Page, code: string): Promise<void> {
    await setCode(page, code);
    await waitForCode(page, code);
    await waitChecked(page);
    await run(page, { wait: 'start' });
  }
  const shown = (page: Page, count: number) => expect.poll(async () => (await entries(page)).map((row) => row.text).slice(0, count), { timeout: 2_000 });

  test('three lines before an endless loop all show while it blocks', async () => {
    const page = await openPlaygroundPage();
    await start(page, 'console.log("one");\nconsole.log("two");\nconsole.log("three");\nwhile (true) {}');
    await shown(page, 3).toEqual(['one', 'two', 'three']);
    await page.locator(`${PLAYGROUND} .playground-toolbar button.stop`).click();
  });

  test('five lines before a 3 s calculation show before it ends', async () => {
    const page = await openPlaygroundPage();
    await start(page, 'for (let i = 0; i < 5; i++) console.log("line", i);\nconst end = Date.now() + 3000;\nwhile (Date.now() < end) {}\nconsole.log("after");');
    await shown(page, 5).toEqual(['line 0', 'line 1', 'line 2', 'line 3', 'line 4']);
    expect((await entries(page)).map((row) => row.text)).not.toContain('after');
    await expect.poll(async () => (await entries(page)).at(-1)?.text, { timeout: 10_000 }).toBe('after');
  });

  test('two long lines before a block both show, and a clear before one empties the logs', async () => {
    const page = await openPlaygroundPage();
    await start(page, 'const long = "x".repeat(10_000);\nconsole.log(long);\nconsole.log(long);\nwhile (true) {}');
    await expect.poll(async () => (await entries(page)).length, { timeout: 2_000 }).toBe(2);
    await start(page, 'console.log("gone");\nconsole.clear();\nwhile (true) {}');
    await expect.poll(async () => (await entries(page)).length, { timeout: 2_000 }).toBe(0);
    await page.locator(`${PLAYGROUND} .playground-toolbar button.stop`).click();
  });

  test('an uncaught error in a timer before a block shows with its line', async () => {
    const page = await openPlaygroundPage();
    await start(page, 'setTimeout(() => {\n  throw new Error("in a timer");\n});\nsetTimeout(() => {\n  while (true) {}\n}, 100);');
    await expect.poll(async () => (await entries(page)).at(0), { timeout: 2_000 }).toMatchObject({ level: 'error', text: expect.stringContaining('in a timer'), line: 2 });
    await page.locator(`${PLAYGROUND} .playground-toolbar button.stop`).click();
  });

  test("the browser's own objects at the deepest level keep the entry and what follows", async () => {
    const page = await openPlaygroundPage();
    await runCode(
      page,
      [
        'console.log({ a: { b: { c: { d: new ArrayBuffer(8) } } } }, "tail");',
        'console.log([[[[new URL("http://x.test/")]]]], "tail");',
        'console.log([[[[new DataView(new ArrayBuffer(8))]]]], "tail");',
        'console.log([[[[new Date(0)]]]], [[[[/a/]]]]);',
      ].join('\n'),
    );
    const rows = (await entries(page)).map((row) => row.text);
    expect(rows.slice(0, 3).every((row) => row.endsWith(' tail'))).toBe(true);
    expect(rows[0]).toContain('[…]');
    expect(rows[3]).toContain('1970-01-01T00:00:00.000Z');
    expect(rows[3]).toContain('/a/');
  });
});
