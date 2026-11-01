// The service worker (004 research R4, contracts/site.md Service worker). It
// keeps one complete version of the site in the cache `cv-<version>` and
// answers from it when the network fails or is too slow. A page still open
// from an older version keeps that version's cache until it closes, so it
// can still load what it asks for later, such as the Terminal's shell (006
// research R35). It shows, asks and logs nothing (FR-041).
//
// The build (scripts/build-site.ts) strips the types of this file and
// prepends the three constants declared below, so the served `/sw.js` is a
// plain script with no import.
import type { Routes } from '../routes.ts';

declare const self: ServiceWorkerGlobalScope;

// Every served file but `/sw.js` and the Playground's engine, by path, as the
// site manifest lists them (008 FR-009).
declare const PRECACHE: readonly string[];

// A hash over those files and this worker's code: a new version of either
// gives a new cache.
declare const VERSION: string;

// The site manifest's route table.
declare const ROUTES: Routes;

const CACHE_PREFIX = 'cv-';

// The Playground's engine (008 research R4): never precached, stored by the
// page in its own `playground-<hash>` caches, and answered from whichever
// cache holds it, so a stored copy works offline and outlives a site update.
const ENGINE_PATH = '/playground/';

const CACHE_NAME = `${CACHE_PREFIX}${VERSION}`;

// How long a navigation waits for the network before the stored copy
// answers.
const NETWORK_LIMIT_MS = 3_000;

// Where a file is fetched and stored, and the status it must answer with.
// Pages are served only at their routes, never by file name (research R3),
// so a page is fetched and stored at its route. The not-found page is
// fetched at its own file path, which the server answers with that page and
// the not-found status.
type PrecacheEntry = { key: string; status: number };

const pageKey = (file: string) => ROUTES.pages.find((page) => page.file === file)?.path;

const notFoundKey = () => `/${ROUTES.notFound.file}`;

function precacheEntry(path: string): PrecacheEntry {
  const file = path.slice(1);
  const page = pageKey(file);
  if (page !== undefined) return { key: page, status: 200 };
  if (file === ROUTES.notFound.file) return { key: notFoundKey(), status: ROUTES.notFound.status };
  return { key: path, status: 200 };
}

// Downloads every file, bypassing the HTTP cache, before storing any: one
// that fails, redirects or answers another status fails the install, and the
// previous version stays in charge (FR-039). A cache left half written is
// removed.
async function install(): Promise<void> {
  const entries = PRECACHE.map(precacheEntry);
  const responses = await Promise.all(
    entries.map(async ({ key, status }) => {
      const response = await fetch(key, { cache: 'reload' });
      if (response.redirected || response.status !== status) throw new Error(`${key} answered ${response.status}`);
      return response;
    }),
  );
  const cache = await caches.open(CACHE_NAME);
  try {
    await Promise.all(entries.map(({ key }, index) => cache.put(key, responses[index]!)));
  } catch (error) {
    await caches.delete(CACHE_NAME);
    throw error;
  }
  await self.skipWaiting();
}

// The older caches kept for open pages, each with the ids of the windows
// open when it was kept, stored in this version's cache (006 research R35).
const KEPT = '/__cv/kept';

type Kept = Record<string, string[]>;

async function readKept(): Promise<Kept> {
  const stored = await (await caches.open(CACHE_NAME)).match(KEPT);
  return stored === undefined ? {} : ((await stored.json()) as Kept);
}

async function writeKept(kept: Kept): Promise<void> {
  const cache = await caches.open(CACHE_NAME);
  if (Object.keys(kept).length === 0) await cache.delete(KEPT);
  else await cache.put(KEPT, new Response(JSON.stringify(kept), { headers: { 'content-type': 'application/json' } }));
}

// Deletes each kept cache whose windows have all closed, with its record.
async function dropClosed(): Promise<void> {
  const kept = await readKept();
  const names = Object.keys(kept);
  if (names.length === 0) return;
  const open = new Set((await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).map((client) => client.id));
  for (const name of names) {
    if (kept[name]!.some((id) => open.has(id))) continue;
    await caches.delete(name);
    delete kept[name];
  }
  await writeKept(kept);
}

// With no window open, older caches go at once, as before; else they are
// kept, each for the windows open now, and go once those close.
async function activate(): Promise<void> {
  const older = (await caches.keys()).filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME);
  const windows = (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).map((client) => client.id);
  if (windows.length === 0) await Promise.all(older.map((name) => caches.delete(name)));
  else {
    const kept = await readKept();
    for (const name of older) kept[name] = [...new Set([...(kept[name] ?? []), ...windows])];
    await writeKept(kept);
    await dropClosed();
  }
  await self.clients.claim();
}

async function fromCache(key: string | Request): Promise<Response | undefined> {
  const cache = await caches.open(CACHE_NAME);
  return cache.match(key, { ignoreVary: true });
}

// A file under `/assets/` from this version's cache, then a kept one: an
// older page asks for its own version's files.
async function fromAnyCache(request: Request): Promise<Response | undefined> {
  const current = await fromCache(request);
  if (current !== undefined) return current;
  for (const name of Object.keys(await readKept())) {
    const stored = await (await caches.open(name)).match(request, { ignoreVary: true });
    if (stored !== undefined) return stored;
  }
  return undefined;
}

// The network's answer, whatever its status, if it comes within the limit.
function withinLimit(request: Request): Promise<Response> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('the network did not answer in time')), NETWORK_LIMIT_MS);
    fetch(request).then(
      (response) => {
        clearTimeout(timer);
        resolve(response);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// The stored answer to a navigation, by the route table. The query string
// doesn't choose the page, and a redirect keeps it, as the server's does.
async function storedAnswer(url: URL): Promise<Response> {
  const page = ROUTES.pages.find((route) => route.path === url.pathname || route.aliases.includes(url.pathname));
  const redirect = ROUTES.redirects.find((route) => route.from === url.pathname);
  if (redirect !== undefined && page === undefined) return Response.redirect(new URL(`${redirect.to}${url.search}`, url.origin).href, redirect.status);
  const stored = await fromCache(page === undefined ? notFoundKey() : page.path);
  return stored ?? Response.error();
}

async function cacheFirst(request: Request, url: URL): Promise<Response> {
  return (await (url.pathname.startsWith('/assets/') ? fromAnyCache(request) : fromCache(request))) ?? fetch(request);
}

// Any cache's copy of an engine file, else the network.
// The page's download says so, as it needs the network, to replace a stored
// file that was cut short or won't open. `request.cache` can't tell: a browser's
// reload, or its tools, set it too, and those must be answered offline.
// The query is ignored: the loader opens an entry again under `?retry=<n>`, as
// the browser remembers a module that failed by its URL.
async function engineFile(request: Request): Promise<Response> {
  if (request.headers.has('x-playground-download')) return fetch(request);
  return (await caches.match(request, { ignoreVary: true, ignoreSearch: true })) ?? fetch(request);
}

self.addEventListener('install', (event) => event.waitUntil(install()));

self.addEventListener('activate', (event) => event.waitUntil(activate()));

self.addEventListener('message', (event) => event.waitUntil(dropClosed()));

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.waitUntil(dropClosed());
  if (request.mode === 'navigate') event.respondWith(withinLimit(request).catch(() => storedAnswer(url)));
  else if (url.pathname.startsWith(ENGINE_PATH)) event.respondWith(engineFile(request));
  else event.respondWith(cacheFirst(request, url));
});
