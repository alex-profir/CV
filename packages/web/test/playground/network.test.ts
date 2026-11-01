// Requests from the code (spec US2): to any site, with an opaque origin and
// none of the site's cookies; offline they fail and the code sees why.
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { startOtherSite } from '../helpers/other-site.ts';
import type { OtherSite } from '../helpers/other-site.ts';
import { openPlaygroundPage, readLogs, run, setCode, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

let other: OtherSite | null = null;
afterEach(async () => {
  await other?.close();
  other = null;
});

const fetchCode = (url: string) => `try {
  const reply = await fetch(${JSON.stringify(url)});
  console.log("reply", reply.status, await reply.text());
} catch (error) {
  console.log("failed", (error as Error).name);
}`;

// `shown`: a line of the code on screen once it's in, as a long code's first
// has scrolled off.
async function runCode(page: Page, code: string, shown = code.split('\n')[0]!): Promise<string[]> {
  await setCode(page, code);
  await waitForCode(page, shown);
  await waitChecked(page);
  await run(page);
  return (await readLogs(page)).filter((row) => row.level === 'log').map((row) => row.text);
}

describe("008-typescript-playground-FR-041: the code's requests carry no origin or cookies of the site's", () => {
  test('a fetch to another site arrives with Origin null and no Cookie, and the code logs the reply', async () => {
    other = await startOtherSite({ pages: { '/hello': 'hello from the other site' } });
    const page = await openPlaygroundPage();
    await page.evaluate(() => (document.cookie = 'site=kept; path=/'));
    expect(await runCode(page, fetchCode(`${other.url}/hello`))).toEqual(['reply 200 hello from the other site']);
    const request = other.requests.find((entry) => entry.path === '/hello');
    expect(request?.headers['origin']).toBe('null');
    expect(request?.headers['cookie']).toBeUndefined();
  });

  // The amendment of 2026-10-30: Firefox and WebKit would send the site's
  // cookie to another port on its host when the code asks for credentials,
  // and the code's ways round the wrappers must not get them either.
  test('whatever the code asks, requests to another port on the host carry no Cookie', async () => {
    other = await startOtherSite({ name: '127.0.0.1', pages: { '/fetch': 'ok', '/request': 'ok', '/xhr': 'ok', '/source': 'ok', '/deleted': 'ok', '/proto': 'ok', '/sub': 'ok', '/original': 'ok' } });
    const page = await openPlaygroundPage();
    await page.evaluate(() => (document.cookie = 'site=kept; path=/'));
    const url = JSON.stringify(other.url);
    const code = `const at = ${url};
const scope = self as any;
const include = { credentials: "include" } as const;
const settle = (request: Promise<unknown>) => request.catch(() => undefined);
await settle(fetch(at + "/fetch", include));
await settle(fetch(new Request(at + "/request", include)));
await new Promise((done) => {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", at + "/xhr");
  xhr.withCredentials = true;
  xhr.onloadend = done;
  xhr.send();
});
const opened = (Source: any, path: string) =>
  new Promise((done) => {
    const source = new Source(at + path, { withCredentials: true });
    setTimeout(() => {
      source.close();
      done(0);
    }, 400);
  });
await opened(scope.EventSource, "/source");
const first = new scope.EventSource(at + "/sub");
first.close();
await opened(first.constructor, "/original");
console.log(Object.getPrototypeOf(scope.EventSource) === Function.prototype);
Reflect.deleteProperty(scope, "fetch");
await settle(scope.fetch(at + "/deleted", include));
for (let holder = Object.getPrototypeOf(scope); holder !== null; holder = Object.getPrototypeOf(holder)) {
  const own = Object.getOwnPropertyDescriptor(holder, "fetch");
  if (own !== undefined) await settle(own.value.call(scope, at + "/proto", include));
}
console.log("done");`;
    expect(await runCode(page, code, 'console.log("done");')).toEqual(['true', 'done']);
    const seen = other.requests.map((entry) => entry.path);
    for (const path of ['/fetch', '/request', '/xhr', '/source', '/original', '/deleted']) expect(seen, path).toContain(path);
    for (const request of other.requests) expect(request.headers['cookie'], request.path).toBeUndefined();
  });

  // Playwright's offline switch doesn't reach the sandboxed frame's worker,
  // so the network is cut where the request goes: the other site is down.
  test('offline, the request fails and the code logs the error', async () => {
    const down = await startOtherSite();
    const url = `${down.url}/hello`;
    await down.close();
    const page = await openPlaygroundPage();
    await page.context().setOffline(true);
    expect(await runCode(page, fetchCode(url))).toEqual(['failed TypeError']);
    await page.context().setOffline(false);
  });
});
