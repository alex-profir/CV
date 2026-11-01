// Packages can't be imported (spec US2, research R11): every form of import
// is marked with the packages message, and Run logs it and runs nothing.
import { describe, expect, test, vi } from 'vitest';
import { siteText } from '../../src/site-text.ts';
import { openPlaygroundPage, readErrors, readLogs, run, RUNNER, setCode, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

const CODE = ['import _ from "lodash";', 'const x = require("x");', 'const later = import("https://example.com/m.js");', 'export * from "x";', 'console.log(_, x, later);'].join('\n');

describe('008-typescript-playground-FR-042: imports are marked, and Run runs nothing', () => {
  test('each import form is marked with the packages message, and Run logs it with no frame and no request', async () => {
    const page = await openPlaygroundPage();
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await setCode(page, CODE);
    await waitForCode(page, CODE);
    await waitChecked(page);
    const errors = await readErrors(page);
    const marked = errors.filter((error) => error.includes(siteText.playground.editor.packages));
    expect(marked).toHaveLength(4);
    for (const [line, at] of [[1, '1:'], [2, '2:'], [3, '3:'], [4, '4:']] as const) expect(marked.some((error) => error.includes(at)), `line ${line}`).toBe(true);
    let frames = 0;
    page.on('frameattached', () => (frames += 1));
    requests.length = 0;
    await run(page);
    expect((await readLogs(page)).map((row) => row.text)).toEqual([siteText.playground.editor.packages]);
    expect(frames).toBe(0);
    expect(await page.locator(RUNNER).count()).toBe(0);
    expect(requests.filter((url) => !url.startsWith('data:'))).toEqual([]);
  });
});

describe('008-typescript-playground-FR-042: every form of import says the same', () => {
  test.each([
    ['an import type', 'type T = import("lodash").Foo;', 'lodash'],
    ['a typeof import', 'let x: typeof import("lodash");', 'lodash'],
    ['a reference to types', '/// <reference types="node" />\nconsole.log(1);', 'node'],
    ['importScripts', 'importScripts("https://example.com/x.js");', 'example.com'],
  ])('%s is marked with the packages message and nothing else, and Run logs it', async (_name, code) => {
    const page = await openPlaygroundPage();
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await setCode(page, code);
    await waitForCode(page, code.split('\n')[0]!);
    await waitChecked(page);
    const errors = await readErrors(page);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(siteText.playground.editor.packages);
    requests.length = 0;
    await run(page);
    expect((await readLogs(page)).map((row) => row.text)).toEqual([siteText.playground.editor.packages]);
    expect(requests.filter((url) => url.includes('example.com'))).toEqual([]);
  });

  test('importScripts the code declares for itself is the code\'s own', async () => {
    const page = await openPlaygroundPage();
    const code = 'function importScripts(name: string) { console.log(name); }\nimportScripts("mine");';
    await setCode(page, code);
    await waitForCode(page, code.split('\n')[0]!);
    await waitChecked(page);
    await run(page);
    expect((await readLogs(page)).filter((row) => row.level === 'log').map((row) => row.text)).toEqual(['mine']);
  });
});
