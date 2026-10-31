// The engine's loader (contracts/engine.md The loader, research R4,
// data-model.md Download state), in the `os` script: the one module there
// that reaches the engine, by URL at run time. It downloads every file with
// progress into `playground-<engine-hash>`, writes the marker last, and
// imports only a complete copy. With only an older complete copy of the same
// contract, it opens that at once and stores the new one behind it, for the
// next open; with none, it waits for the network or Retry (FR-007, FR-008,
// FR-011, FR-013, FR-014). A copy that won't open counts as incomplete.
import type { DownloadState, EngineManifest } from '../types.ts';
import type { EngineModule } from './contract.ts';

export const ENGINE_API = 1;

export type LoaderEvents = { onState(state: DownloadState): void };

export type Loaded = { module: EngineModule; manifest: EngineManifest; kept: boolean };

// What the loader uses of the browser, so its tests can give fakes.
export type LoaderEnv = {
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
  caches: CacheStorage | undefined;
  onLine: () => boolean;
  importModule: (url: string) => Promise<EngineModule>;
  linkStyle: (url: string) => Promise<void>;
  // Resolves when the visitor presses Retry, the browser says the network is
  // back, or `delayMs` has passed, if there is one.
  waitForRetry: (signal: AbortSignal, delayMs: number | null) => Promise<void>;
};

// The offline state tries again by itself: the `online` event can come before
// anything listens, or just before a fetch that still fails, or never (FR-011).
// The wait grows, since a download that keeps failing part way costs megabytes.
const RETRY_FIRST_MS = 5_000;
const RETRY_MOST_MS = 60_000;

export const retryDelay = (attempt: number): number => Math.min(RETRY_FIRST_MS * 2 ** attempt, RETRY_MOST_MS);

const CACHE_PREFIX = 'playground-';

const markerOf = (folder: string) => `${folder}/complete`;

// `/playground/<hash>/files.json` → `/playground/<hash>`, and the hash.
function folderOf(manifestPath: string): { folder: string; hash: string } {
  const match = /^(.*\/playground\/([^/]+))\/files\.json$/.exec(manifestPath);
  if (match === null) throw new Error(`not an engine manifest path: ${manifestPath}`);
  return { folder: match[1]!, hash: match[2]! };
}

// The 25% steps told so far, for screen readers (FR-065).
export const stepOf = (received: number, total: number): 0 | 1 | 2 | 3 | 4 => (total <= 0 ? 4 : (Math.min(4, Math.floor((received * 4) / total)) as 0 | 1 | 2 | 3 | 4));

function aborted(signal: AbortSignal): never {
  throw signal.reason instanceof Error ? signal.reason : new DOMException('The download was cancelled.', 'AbortError');
}

let retryWaiters = new Set<() => void>();

// The offline state's Retry (FR-011).
export function requestRetry(): void {
  const waiters = retryWaiters;
  retryWaiters = new Set();
  for (const resume of waiters) resume();
}

// Until Retry, the `online` event or the delay, whichever comes first.
export function waitForNetwork(signal: AbortSignal, delayMs: number | null, target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'> = window): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = delayMs === null ? null : setTimeout(() => done(), delayMs);
    const leave = () => {
      target.removeEventListener('online', done);
      signal.removeEventListener('abort', stop);
      retryWaiters.delete(done);
      if (timer !== null) clearTimeout(timer);
    };
    const done = () => {
      leave();
      resolve();
    };
    const stop = () => {
      leave();
      reject(signal.reason);
    };
    target.addEventListener('online', done);
    signal.addEventListener('abort', stop, { once: true });
    retryWaiters.add(done);
  });
}

// How many times each entry has failed: the browser remembers a module that
// failed for its URL, so opening it again needs another (T184).
const failedImports = new Map<string, number>();

const importable = (url: string): string => {
  const failed = failedImports.get(url) ?? 0;
  return failed === 0 ? url : `${url}?retry=${failed}`;
};

function browserEnv(): LoaderEnv {
  return {
    fetch: (url, init) => fetch(url, init),
    caches: typeof caches === 'undefined' ? undefined : caches,
    onLine: () => navigator.onLine !== false,
    importModule: async (url) => {
      try {
        return (await import(/* @vite-ignore */ importable(url))) as EngineModule;
      } catch (error) {
        failedImports.set(url, (failedImports.get(url) ?? 0) + 1);
        throw error;
      }
    },
    linkStyle: (url) =>
      new Promise((resolve, reject) => {
        if (document.querySelector(`link[data-playground-style="${url}"]`) !== null) return resolve();
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        link.setAttribute('data-playground-style', url);
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`the engine's style sheet ${url} failed to load`));
        document.head.append(link);
      }),
    waitForRetry: (signal, delayMs) => waitForNetwork(signal, delayMs),
  };
}

// The manifest a cache's marker holds, if the copy is complete.
async function completeIn(cache: Cache, folder: string): Promise<EngineManifest | null> {
  const marker = await cache.match(markerOf(folder));
  if (marker === undefined) return null;
  try {
    return (await marker.json()) as EngineManifest;
  } catch {
    return null;
  }
}

// The marker goes, so the copy counts as incomplete.
async function forgetMarker(cache: Cache, folder: string): Promise<void> {
  try {
    await cache.delete(markerOf(folder));
  } catch {
    // The next open tries it again.
  }
}

// The stored copy the loaded engine came from, when the engine then won't
// start: it counts as incomplete, and its entry opens under a new URL.
export async function forgetCopy(manifest: EngineManifest, env: Pick<LoaderEnv, 'caches'> = browserEnv()): Promise<void> {
  failedImports.set(manifest.entry, (failedImports.get(manifest.entry) ?? 0) + 1);
  if (env.caches === undefined) return;
  try {
    await forgetMarker(await env.caches.open(`${CACHE_PREFIX}${manifest.version}`), `/playground/${manifest.version}`);
  } catch {
    // Nothing stored to forget.
  }
}

type Copy = { manifest: EngineManifest; cache: Cache; folder: string };

// The newest complete copy other than `hash` whose contract is ours.
async function olderCopy(env: LoaderEnv, hash: string): Promise<Copy | null> {
  if (env.caches === undefined) return null;
  try {
    const names = (await env.caches.keys()).filter((name) => name.startsWith(CACHE_PREFIX) && name !== `${CACHE_PREFIX}${hash}`).reverse();
    for (const name of names) {
      const cache = await env.caches.open(name);
      const folder = `/playground/${name.slice(CACHE_PREFIX.length)}`;
      const manifest = await completeIn(cache, folder);
      if (manifest !== null && manifest.api === ENGINE_API) return { manifest, cache, folder };
    }
  } catch {
    return null;
  }
  return null;
}

// Once the current copy is complete, every other copy goes (FR-013).
async function removeOthers(env: LoaderEnv, hash: string): Promise<void> {
  if (env.caches === undefined) return;
  try {
    const names = (await env.caches.keys()).filter((name) => name.startsWith(CACHE_PREFIX) && name !== `${CACHE_PREFIX}${hash}`);
    await Promise.all(names.map((name) => env.caches!.delete(name)));
  } catch {
    // Nothing to clean when storage refuses.
  }
}

async function open(env: LoaderEnv, manifest: EngineManifest, kept: boolean, events: LoaderEvents): Promise<Loaded> {
  await env.linkStyle(manifest.style);
  const module = await env.importModule(manifest.entry);
  events.onState({ kind: 'ready', typescript: manifest.typescript, kept });
  return { module, manifest, kept };
}

// Reads a response's body, counting its bytes as they arrive.
async function readCounted(response: Response, onBytes: (bytes: number) => void, signal: AbortSignal): Promise<Blob> {
  if (response.body === null) {
    const blob = await response.blob();
    onBytes(blob.size);
    return blob;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  const cancel = () => void reader.cancel().catch(() => undefined);
  signal.addEventListener('abort', cancel, { once: true });
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (signal.aborted) aborted(signal);
      if (done) break;
      chunks.push(value);
      onBytes(value.byteLength);
    }
  } finally {
    signal.removeEventListener('abort', cancel);
  }
  return new Blob(chunks as BlobPart[]);
}

class DownloadFailed extends Error {}

class OpenFailed extends Error {}

// Downloads every file of the manifest, into the cache when there is one.
async function download(env: LoaderEnv, manifest: EngineManifest, cache: Cache | null, events: LoaderEvents, signal: AbortSignal, quiet: boolean): Promise<void> {
  let received = 0;
  const total = manifest.total;
  let step = stepOf(0, total);
  // The first try shows at once, so its start and failure are told (FR-065).
  // Later tries show only once a file answers, so they don't flicker or
  // announce a download that isn't happening.
  let shown = !quiet;
  if (shown) events.onState({ kind: 'downloading', received, total, announcedStep: step });
  for (const file of manifest.files) {
    let response: Response;
    try {
      response = await env.fetch(file.path, { cache: 'reload', headers: { 'x-playground-download': '1' }, signal });
    } catch (error) {
      if (signal.aborted) aborted(signal);
      throw new DownloadFailed(String(error));
    }
    if (!response.ok) throw new DownloadFailed(`${file.path} answered ${response.status}`);
    if (!shown) {
      shown = true;
      events.onState({ kind: 'downloading', received, total, announcedStep: step });
    }
    let body: Blob;
    try {
      body = await readCounted(
        response,
        (bytes) => {
          received += bytes;
          step = stepOf(received, total);
          events.onState({ kind: 'downloading', received: Math.min(received, total), total, announcedStep: step });
        },
        signal,
      );
    } catch (error) {
      if (signal.aborted) aborted(signal);
      throw new DownloadFailed(String(error));
    }
    // A file cut short is a stopped download, however it was answered (FR-011).
    if (body.size !== file.bytes) throw new DownloadFailed(`${file.path} is ${body.size} bytes of ${file.bytes}`);
    if (cache !== null) await cache.put(file.path, new Response(body, { status: 200, headers: response.headers }));
  }
}

// The new copy, downloaded with nothing shown while an older one runs, and
// used from the next open, which also removes the older one (FR-013). A failure
// changes nothing: the next open tries again.
async function storeBehind(env: LoaderEnv, manifestPath: string, cache: Cache | null, folder: string, signal: AbortSignal): Promise<void> {
  if (cache === null || !env.onLine()) return;
  try {
    const response = await env.fetch(manifestPath, { cache: 'reload', signal });
    if (!response.ok) return;
    const manifest = (await response.json()) as EngineManifest;
    await download(env, manifest, cache, { onState: () => undefined }, signal, true);
    await cache.put(markerOf(folder), new Response(JSON.stringify(manifest), { headers: { 'content-type': 'application/json' } }));
  } catch {
    // Part of a copy, with no marker, is never used.
  }
}

export async function loadEngine(manifestPath: string, totalBytes: number, events: LoaderEvents, signal: AbortSignal, env: LoaderEnv = browserEnv()): Promise<Loaded> {
  const { folder, hash } = folderOf(manifestPath);
  events.onState({ kind: 'checking' });
  let cache: Cache | null = null;
  try {
    cache = env.caches === undefined ? null : await env.caches.open(`${CACHE_PREFIX}${hash}`);
  } catch {
    cache = null;
  }
  if (cache !== null) {
    const stored = await completeIn(cache, folder).catch(() => null);
    if (stored !== null) {
      try {
        const loaded = await open(env, stored, true, events);
        await removeOthers(env, hash);
        return loaded;
      } catch {
        if (signal.aborted) aborted(signal);
        await forgetMarker(cache, folder);
      }
    }
  }
  const waiting = await olderCopy(env, hash);
  if (waiting !== null) {
    try {
      const loaded = await open(env, waiting.manifest, true, events);
      void storeBehind(env, manifestPath, cache, folder, signal);
      return loaded;
    } catch {
      if (signal.aborted) aborted(signal);
      await forgetMarker(waiting.cache, waiting.folder);
    }
  }
  let stopped = false;
  let openFailed = false;
  let attempts = 0;
  // Nothing stored: the window can say so while the manifest is on its way,
  // though nothing is announced until a file answers.
  if (env.onLine()) events.onState({ kind: 'checking', nothingStored: true });
  for (;;) {
    if (signal.aborted) aborted(signal);
    let manifest: EngineManifest | null = null;
    if (env.onLine()) {
      try {
        const response = await env.fetch(manifestPath, { cache: 'reload', signal });
        if (response.ok) manifest = (await response.json()) as EngineManifest;
      } catch {
        if (signal.aborted) aborted(signal);
      }
    }
    if (manifest !== null) {
      try {
        let kept = cache !== null;
        try {
          await download(env, manifest, cache, events, signal, attempts > 0);
        } catch (error) {
          if (!(error instanceof DownloadFailed) && cache !== null && !signal.aborted) {
            // Storage refused part way (a full quota): the files come from the
            // network instead, and nothing is kept (FR-014).
            cache = null;
            kept = false;
            await download(env, manifest, null, events, signal, attempts > 0);
          } else throw error;
        }
        if (cache !== null) {
          try {
            await cache.put(markerOf(folder), new Response(JSON.stringify(manifest), { headers: { 'content-type': 'application/json' } }));
          } catch {
            kept = false;
          }
        }
        let loaded: Loaded;
        try {
          loaded = await open(env, manifest, kept, events);
        } catch (error) {
          if (cache !== null) await forgetMarker(cache, folder);
          throw new OpenFailed(String(error));
        }
        if (kept) await removeOthers(env, hash);
        return loaded;
      } catch (error) {
        if (signal.aborted) aborted(signal);
        if (error instanceof OpenFailed) openFailed = true;
        else if (!(error instanceof DownloadFailed)) throw error;
        stopped = true;
      }
    }
    const older = await olderCopy(env, hash);
    if (older !== null) {
      try {
        return await open(env, older.manifest, true, events);
      } catch {
        if (signal.aborted) aborted(signal);
        await forgetMarker(older.cache, older.folder);
      }
    }
    events.onState({ kind: 'offline', total: manifest?.total ?? totalBytes, stopped, ...(openFailed ? { wontOpen: true } : {}) });
    // A copy that arrived whole and won't open won't by trying again alone.
    await env.waitForRetry(signal, openFailed ? null : retryDelay(attempts));
    attempts += 1;
    openFailed = false;
  }
}

// How long an engine may take to start before it counts as one that won't
// (FR-011): a worker that never starts would otherwise leave the window waiting.
export const ENGINE_START_LIMIT_MS = 60_000;

// The engine, or a failure once the limit has passed; one that starts after
// that is given to `late`.
export function startWithin<T>(starting: Promise<T>, late: (engine: T) => void, limitMs = ENGINE_START_LIMIT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    let over = false;
    const timer = setTimeout(() => {
      over = true;
      reject(new Error('the engine did not start in time'));
    }, limitMs);
    starting.then(
      (engine) => {
        if (over) return late(engine);
        clearTimeout(timer);
        resolve(engine);
      },
      (error: unknown) => {
        clearTimeout(timer);
        if (!over) reject(error);
      },
    );
  });
}
