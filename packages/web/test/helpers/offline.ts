// Offline test helpers (004 research R21, 005 US6): a server whose files
// can be switched at one address, versions of the site, and the browser
// steps around the service worker. Servers and copies are closed and
// removed when the current test finishes.
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { onTestFinished } from 'vitest';
import type { BrowserContext, Page } from 'playwright';
import { resume } from '@cv/content';
import type { Resume } from '@cv/content';
import { startServer } from '../../../../tools/site-check/src/server.ts';
import type { RunningServer } from '../../../../tools/site-check/src/server.ts';
import { openPage } from './browser.ts';
import type { OpenPageOptions } from './browser.ts';
import { fixtureSite } from './site.ts';
import type { BuiltSite } from './site.ts';

// How long the slow server holds each request, and how long a test waits
// for the browser to finish installing a new worker.
export const HANG_MS = 5_000;

export const INSTALL_WAIT_MS = 20_000;

export type Mode = 'normal' | 'drop' | 'hang';

export type SwitchableServer = {
  url: string;
  // Serves `site` from now on, at the same address.
  serve: (site: BuiltSite) => Promise<void>;
  setMode: (mode: Mode) => void;
  // Paths answered with a 500 from now on.
  fail: (pathname: string) => void;
  // Every path requested so far, in order.
  requested: string[];
  close: () => Promise<void>;
};

// A front server whose files can be switched: it passes each request to the
// local server of the current version. Closed when the current test
// finishes.
export async function switchableServer(): Promise<SwitchableServer> {
  let backend: RunningServer | undefined;
  let mode: Mode = 'normal';
  const failing = new Set<string>();
  const requested: string[] = [];
  const timers = new Set<NodeJS.Timeout>();

  const forward = (request: http.IncomingMessage, response: http.ServerResponse) => {
    if (backend === undefined) {
      response.writeHead(503).end();
      return;
    }
    const target = new URL(request.url ?? '/', backend.url);
    const upstream = http.request(target, { method: request.method, headers: request.headers }, (answer) => {
      response.writeHead(answer.statusCode ?? 502, answer.headers);
      answer.pipe(response);
    });
    upstream.on('error', () => response.destroy());
    request.pipe(upstream);
  };

  const front = http.createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    requested.push(pathname);
    if (mode === 'drop') {
      request.socket.destroy();
      return;
    }
    if (failing.has(pathname)) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' }).end('failed\n');
      return;
    }
    if (mode === 'hang') {
      const timer = setTimeout(() => {
        timers.delete(timer);
        forward(request, response);
      }, HANG_MS);
      timers.add(timer);
      return;
    }
    forward(request, response);
  });
  await new Promise<void>((resolve) => front.listen(0, '127.0.0.1', resolve));
  const { port } = front.address() as AddressInfo;

  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    for (const timer of timers) clearTimeout(timer);
    await new Promise<void>((resolve) => {
      front.close(() => resolve());
      front.closeAllConnections();
    });
    await backend?.close();
  };
  onTestFinished(close);

  return {
    url: `http://127.0.0.1:${port}`,
    serve: async (site) => {
      const previous = backend;
      backend = await startServer({ siteDir: site.dir, manifest: site.manifest });
      await previous?.close();
    },
    setMode: (next) => {
      mode = next;
    },
    fail: (pathname) => failing.add(pathname),
    requested,
    close,
  };
}

// A copy of the site with the CV's name changed, removed when the current
// test finishes.
export function version(name: string): { site: BuiltSite; cv: Resume } {
  const cv: Resume = structuredClone(resume);
  cv.basics = { ...cv.basics, name };
  const { remove, ...site } = fixtureSite(cv);
  onTestFinished(remove);
  return { site, cv };
}

// A page at `url`, in a context of its own, once the page has loaded.
// Listeners can be added to the context before it navigates.
export async function firstPage(url: string, options: Partial<OpenPageOptions> = {}, before?: (context: BrowserContext) => void): Promise<Page> {
  const page = await openPage('about:blank', { width: 375, ...options });
  before?.(page.context());
  await page.goto(url, { waitUntil: 'load' });
  return page;
}

export async function visit(context: BrowserContext, url: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'load' });
  return page;
}

// Empties the browser's HTTP cache, so only the worker's stored copy can
// answer, and sets the context offline.
export async function goOffline(context: BrowserContext): Promise<void> {
  const page = context.pages()[0] ?? (await context.newPage());
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.clearBrowserCache');
  await cdp.detach();
  await context.setOffline(true);
}

export const cacheNames = (page: Page) => page.evaluate(() => caches.keys());

// Polls `test` until it holds or `ms` pass.
export async function until(test: () => Promise<boolean>, ms = INSTALL_WAIT_MS): Promise<boolean> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await test()) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return test();
}

// Whether the registration is settled: no worker installing or waiting.
export const settled = (page: Page) =>
  page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration !== undefined && registration.installing === null && registration.waiting === null && registration.active !== null;
  });
