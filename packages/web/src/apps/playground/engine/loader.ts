// The engine's loader (contracts/engine.md The loader, research R4,
// data-model.md Download state), in the `os` script: the one module there
// that reaches the engine, by URL at run time. It downloads every file with
// progress into `playground-<engine-hash>`, writes the marker last, and
// imports only a complete copy; offline or when the download fails, it opens
// the newest older complete copy of the same contract, else waits for the
// network or Retry (FR-007, FR-011, FR-013, FR-014).
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
  // Resolves when the visitor presses Retry or the network comes back.
  waitForRetry: (signal: AbortSignal) => Promise<void>;
};

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

function browserEnv(): LoaderEnv {
  return {
    fetch: (url, init) => fetch(url, init),
    caches: typeof caches === 'undefined' ? undefined : caches,
    onLine: () => navigator.onLine !== false,
    importModule: (url) => import(/* @vite-ignore */ url) as Promise<EngineModule>,
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
    waitForRetry: (signal) =>
      new Promise((resolve, reject) => {
        const done = () => {
          window.removeEventListener('online', done);
          signal.removeEventListener('abort', stop);
          retryWaiters.delete(done);
          resolve();
        };
        const stop = () => {
          window.removeEventListener('online', done);
          retryWaiters.delete(done);
          reject(signal.reason);
        };
        window.addEventListener('online', done);
        signal.addEventListener('abort', stop, { once: true });
        retryWaiters.add(done);
      }),
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

// The newest complete copy other than `hash` whose contract is ours.
async function olderCopy(env: LoaderEnv, hash: string): Promise<EngineManifest | null> {
  if (env.caches === undefined) return null;
  try {
    const names = (await env.caches.keys()).filter((name) => name.startsWith(CACHE_PREFIX) && name !== `${CACHE_PREFIX}${hash}`).reverse();
    for (const name of names) {
      const manifest = await completeIn(await env.caches.open(name), `/playground/${name.slice(CACHE_PREFIX.length)}`);
      if (manifest !== null && manifest.api === ENGINE_API) return manifest;
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

// Downloads every file of the manifest, into the cache when there is one.
async function download(env: LoaderEnv, manifest: EngineManifest, cache: Cache | null, events: LoaderEvents, signal: AbortSignal): Promise<void> {
  let received = 0;
  const total = manifest.total;
  let step = stepOf(0, total);
  events.onState({ kind: 'downloading', received, total, announcedStep: step });
  for (const file of manifest.files) {
    let response: Response;
    try {
      response = await env.fetch(file.path, { cache: 'reload', signal });
    } catch (error) {
      if (signal.aborted) aborted(signal);
      throw new DownloadFailed(String(error));
    }
    if (!response.ok) throw new DownloadFailed(`${file.path} answered ${response.status}`);
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
    if (cache !== null) await cache.put(file.path, new Response(body, { status: 200, headers: response.headers }));
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
      const loaded = await open(env, stored, true, events);
      await removeOthers(env, hash);
      return loaded;
    }
  }
  let stopped = false;
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
          await download(env, manifest, cache, events, signal);
        } catch (error) {
          if (!(error instanceof DownloadFailed) && cache !== null && !signal.aborted) {
            // Storage refused part way (a full quota): the files come from the
            // network instead, and nothing is kept (FR-014).
            cache = null;
            kept = false;
            await download(env, manifest, null, events, signal);
          } else throw error;
        }
        if (cache !== null) {
          try {
            await cache.put(markerOf(folder), new Response(JSON.stringify(manifest), { headers: { 'content-type': 'application/json' } }));
          } catch {
            kept = false;
          }
        }
        const loaded = await open(env, manifest, kept, events);
        if (kept) await removeOthers(env, hash);
        return loaded;
      } catch (error) {
        if (signal.aborted) aborted(signal);
        if (!(error instanceof DownloadFailed)) throw error;
        stopped = true;
      }
    }
    const older = await olderCopy(env, hash);
    if (older !== null) return open(env, older, true, events);
    events.onState({ kind: 'offline', total: manifest?.total ?? totalBytes, stopped });
    await env.waitForRetry(signal);
  }
}
