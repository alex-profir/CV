// What a program can reach (009 research R2, SC-004), in a real browser, in the
// engine `PLAYGROUND_ENGINE` selects. A local server on another port stands for the
// network, so what any engine really sent is counted there, as well as in the page.
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import type { Request } from 'playwright';
import { openProgramTerminal, runToEnd, statusOf, writeFile } from '../../helpers/program.ts';

vi.setConfig({ testTimeout: 120_000 });

let hits: string[] = [];
let server: http.Server;
let target = '';

beforeAll(async () => {
  server = http.createServer((request, response) => {
    hits.push(request.url ?? '');
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Content-Type', 'text/javascript');
    response.end('self.reached = true;');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  target = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

const NAMES = ['document', 'window', 'parent', 'top', 'localStorage', 'sessionStorage', 'indexedDB', 'caches', 'BroadcastChannel', 'XMLHttpRequest', 'WebSocket', 'WebSocketStream', 'EventSource', 'WebTransport', 'importScripts', 'Worker', 'SharedWorker'];

const NATIVE_IMPORTS = ["eval's import()", "Function's import()", 'blob import()'];

// A program's attempts: each prints a line of JSON, what it got or what it caught.
const attempts = (url: string) => `
const names = ${JSON.stringify(NAMES)};
const line = (name, result) => console.log(JSON.stringify({ name, ...result }));
const PENDING = Symbol('pending');
async function attempt(name, work) {
  try {
    const answer = await Promise.race([work(), new Promise((resolve) => setTimeout(resolve, 1000, PENDING))]);
    line(name, answer === PENDING ? { pending: true } : { got: String(answer) });
  } catch (error) {
    line(name, { caught: String(error && error.message) });
  }
}
(async () => {
  for (const name of names) {
    let holder = globalThis;
    const found = [];
    while (holder !== null) {
      if (holder[name] !== undefined) found.push(holder === globalThis ? 'global' : 'prototype');
      holder = Object.getPrototypeOf(holder);
    }
    line('typeof ' + name, { kind: typeof globalThis[name], found });
  }
  await attempt('fetch', () => fetch('${url}/fetch'));
  await attempt('self.fetch', () => self.fetch('${url}/self-fetch'));
  await attempt('XMLHttpRequest', () => { const x = new XMLHttpRequest(); x.open('GET', '${url}/xhr'); x.send(); return 'sent'; });
  await attempt('WebSocket', () => new WebSocket('${url.replace('http', 'ws')}/ws'));
  await attempt('EventSource', () => new EventSource('${url}/events'));
  await attempt('WebTransport', () => new WebTransport('${url.replace('http', 'https')}/wt'));
  await attempt('importScripts', () => importScripts('${url}/imported.js'));
  await attempt('import()', () => import('${url}/dynamic.js'));
  await attempt("eval's import()", () => (0, eval)("import('${url}/evaluated.js')"));
  await attempt("Function's import()", () => new Function("return import('${url}/function.js')")());
  await attempt('blob import()', () => (0, eval)("import(URL.createObjectURL(new Blob(['self.reached = true'], { type: 'text/javascript' })))"));
  await attempt('new Worker', () => new Worker('${url}/worker.js'));
  await attempt('saved Worker', () => { const W = Object.getPrototypeOf(globalThis).Worker ?? globalThis.constructor.Worker; return new W('${url}/saved.js'); });
  await attempt('document.cookie', () => document.cookie);
  await attempt('localStorage', () => localStorage.getItem('secret'));
  await attempt('parent', () => parent.document);
  await attempt('top', () => top.location.href);
  await attempt('BroadcastChannel', () => new BroadcastChannel('site'));
  await attempt('indexedDB', () => indexedDB.open('x'));
  await attempt('caches', () => caches.open('x'));
  await attempt('FontFace', () => typeof FontFace === 'undefined' ? Promise.reject(new Error('no FontFace')) : new FontFace('x', 'url(${url}/font.woff)').load());
  await attempt('close', () => close());
  await attempt('postMessage', () => postMessage('x'));
  console.log('finished', globalThis.reached === true);
})();
`;

describe('009-terminal-node-FR-022, 009-terminal-node-FR-023 and 009-terminal-node-FR-025: nothing outside its frame', () => {
  test('every attempt fails with an error the program can read, and no request is seen', async () => {
    hits = [];
    const page = await openProgramTerminal();
    await page.evaluate(() => {
      localStorage.setItem('secret', 'the-secret');
      document.cookie = 'secret=the-secret';
    });
    // Chromium reports a request its policy refused, as failed: only the server's
    // count, and a request that didn't fail, would be one that left the browser.
    const requests: Request[] = [];
    page.context().on('request', (request) => requests.push(request));
    await writeFile(page, 'reach.js', attempts(target));
    const output = await runToEnd(page, 'node reach.js');
    await page.waitForTimeout(500);

    const results = output.split('\n').filter((each) => each.startsWith('{')).map((each) => JSON.parse(each) as { name: string; kind?: string; found?: string[]; got?: string; caught?: string; pending?: boolean });
    expect(results.length, output).toBeGreaterThan(NAMES.length + 20);
    expect(output).toContain('finished false');
    expect(output).not.toContain('the-secret');
    for (const { name, kind, found } of results.filter((each) => each.name.startsWith('typeof '))) {
      expect(kind, name).toBe('undefined');
      expect(found, name).toEqual([]);
    }
    for (const { name, got, caught, pending } of results.filter((each) => !each.name.startsWith('typeof '))) {
      expect(got, name).toBeUndefined();
      // The engine's own `import()`, refused by the policy, may never settle in some
      // browsers (contracts/node-api.md's Known differences). All else answers.
      if (pending === true) expect(NATIVE_IMPORTS, name).toContain(name);
      else expect(caught, name).toMatch(/\w/);
    }
    expect(hits).toEqual([]);
    expect(requests.filter((request) => request.url().startsWith(target)).map((request) => [request.url(), request.failure()?.errorText ?? 'not refused']).filter(([, failure]) => !/csp/i.test(failure!))).toEqual([]);
    expect(await statusOf(page)).toBe('0');
  });

  test("a program's globals are those of 009-terminal-node-FR-012, and quickstart's three names are undefined", async () => {
    const page = await openProgramTerminal();
    const output = await runToEnd(page, 'node -e "console.log(typeof document, typeof localStorage, typeof Worker, typeof process, typeof Buffer, typeof require)"');
    expect(output.trim()).toBe('undefined undefined undefined object function function');
  });

  test('a program ended by Ctrl+C or by its own end leaves no frame', async () => {
    const page = await openProgramTerminal();
    await runToEnd(page, 'node -e "1"');
    expect(await page.evaluate(() => document.getElementById('terminal-runners')?.childElementCount)).toBe(0);
  });
});
