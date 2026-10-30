// The engine's loader and its download state (data-model.md Download state,
// research R4), with fake Cache Storage and network.
import { describe, expect, test } from 'vitest';
import { forgetCopy, loadEngine, requestRetry, retryDelay, stepOf, waitForNetwork } from '../../../src/apps/playground/engine/loader.ts';
import type { LoaderEnv } from '../../../src/apps/playground/engine/loader.ts';
import type { DownloadState, EngineManifest } from '../../../src/apps/playground/types.ts';

class FakeCache {
  entries = new Map<string, Response>();
  failPut = false;
  async delete(key: string): Promise<boolean> {
    return this.entries.delete(key);
  }
  async match(key: string): Promise<Response | undefined> {
    const response = this.entries.get(key);
    return response?.clone();
  }
  async put(key: string, response: Response): Promise<void> {
    if (this.failPut) throw new DOMException('Quota exceeded', 'QuotaExceededError');
    this.entries.set(key, new Response(await response.arrayBuffer(), { headers: response.headers }));
  }
}

class FakeCaches {
  stores = new Map<string, FakeCache>();
  failOpen = false;
  async open(name: string): Promise<FakeCache> {
    if (this.failOpen) throw new DOMException('Denied', 'SecurityError');
    if (!this.stores.has(name)) this.stores.set(name, new FakeCache());
    return this.stores.get(name)!;
  }
  async keys(): Promise<string[]> {
    return [...this.stores.keys()];
  }
  async delete(name: string): Promise<boolean> {
    return this.stores.delete(name);
  }
}

function manifestFor(hash: string, api = 1, typescript = '5.9.3'): EngineManifest {
  const folder = `/playground/${hash}`;
  const files = [
    { path: `${folder}/engine-a.js`, bytes: 400 },
    { path: `${folder}/engine-a.css`, bytes: 100 },
    { path: `${folder}/ts.worker-a.js`, bytes: 500 },
  ];
  return { api: api as 1, version: hash, typescript, entry: files[0]!.path, style: files[1]!.path, files, total: 1000 };
}

type Net = { online: boolean; fail?: (url: string) => boolean; requests: string[] };

function env(caches: FakeCaches | undefined, manifests: EngineManifest[], net: Net): LoaderEnv & { imported: string[]; styles: string[] } {
  const imported: string[] = [];
  const styles: string[] = [];
  return {
    imported,
    styles,
    caches: caches as unknown as CacheStorage | undefined,
    onLine: () => net.online,
    fetch: async (url: string) => {
      net.requests.push(url);
      if (!net.online || net.fail?.(url)) throw new TypeError('Failed to fetch');
      const manifest = manifests.find((entry) => url === `/playground/${entry.version}/files.json`);
      if (manifest !== undefined) return new Response(JSON.stringify(manifest), { headers: { 'content-type': 'application/json' } });
      const file = manifests.flatMap((entry) => entry.files).find((entry) => entry.path === url);
      if (file === undefined) return new Response('', { status: 404 });
      return new Response(new Uint8Array(file.bytes), { headers: { 'content-type': url.endsWith('.css') ? 'text/css' : 'text/javascript' } });
    },
    importModule: async (url: string) => {
      imported.push(url);
      return { api: 1, createEngine: async () => ({}) as never };
    },
    linkStyle: async (url: string) => void styles.push(url),
    waitForRetry: (signal: AbortSignal) =>
      new Promise<void>((resolve, reject) => {
        const timer = setInterval(() => {
          if (net.online) {
            clearInterval(timer);
            resolve();
          }
        }, 5);
        signal.addEventListener('abort', () => {
          clearInterval(timer);
          reject(signal.reason);
        });
      }),
  };
}

const record = () => {
  const states: DownloadState[] = [];
  return { states, events: { onState: (state: DownloadState) => void states.push(state) } };
};

describe('008-typescript-playground-FR-007: the download stores a whole copy, marker last', () => {
  test('idle → checking → downloading → ready, with every file, then the marker, in the cache', async () => {
    const caches = new FakeCaches();
    const current = manifestFor('aaaa');
    const net: Net = { online: true, requests: [] };
    const { states, events } = record();
    const loaded = await loadEngine('/playground/aaaa/files.json', 1000, events, new AbortController().signal, env(caches, [current], net));
    expect(states[0]).toEqual({ kind: 'checking' });
    expect(states.at(-1)).toEqual({ kind: 'ready', typescript: '5.9.3', kept: true });
    const downloading = states.filter((state) => state.kind === 'downloading');
    expect(downloading[0]).toMatchObject({ received: 0, total: 1000 });
    expect(downloading.at(-1)).toMatchObject({ received: 1000, announcedStep: 4 });
    const cache = caches.stores.get('playground-aaaa')!;
    expect([...cache.entries.keys()]).toEqual([...current.files.map((file) => file.path), '/playground/aaaa/complete']);
    expect(loaded.kept).toBe(true);
    expect(net.requests[0]).toBe('/playground/aaaa/files.json');
  });

  test('announcedStep steps at 25, 50, 75 and 100%', () => {
    expect([0, 249, 250, 499, 500, 749, 750, 999, 1000].map((received) => stepOf(received, 1000))).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4]);
  });

  test('a cache without the marker is incomplete: it is never used, and a second open with one is used without a request', async () => {
    const caches = new FakeCaches();
    const current = manifestFor('aaaa');
    const partial = await caches.open('playground-aaaa');
    await partial.put(current.files[0]!.path, new Response('old'));
    const net: Net = { online: true, requests: [] };
    await loadEngine('/playground/aaaa/files.json', 1000, record().events, new AbortController().signal, env(caches, [current], net));
    expect(net.requests).toContain(current.files[0]!.path);
    const again: Net = { online: true, requests: [] };
    const { states, events } = record();
    await loadEngine('/playground/aaaa/files.json', 1000, events, new AbortController().signal, env(caches, [current], again));
    expect(again.requests).toEqual([]);
    expect(states.map((state) => state.kind)).toEqual(['checking', 'ready']);
  });

  test('an abort cancels the download and leaves the cache incomplete', async () => {
    const caches = new FakeCaches();
    const current = manifestFor('aaaa');
    const controller = new AbortController();
    const net: Net = { online: true, requests: [] };
    const fake = env(caches, [current], net);
    const fetchFile = fake.fetch;
    fake.fetch = async (url, init) => {
      if (url.endsWith('ts.worker-a.js')) controller.abort();
      return fetchFile(url, init);
    };
    await expect(loadEngine('/playground/aaaa/files.json', 1000, record().events, controller.signal, fake)).rejects.toThrow();
    expect(caches.stores.get('playground-aaaa')!.entries.has('/playground/aaaa/complete')).toBe(false);
  });
});

describe('008-typescript-playground-FR-011: offline, and a download that stops, wait for the network or Retry', () => {
  test('checking → offline with the page\'s total when offline, then downloading → ready when the network comes back', async () => {
    const caches = new FakeCaches();
    const current = manifestFor('aaaa');
    const net: Net = { online: false, requests: [] };
    const { states, events } = record();
    const loading = loadEngine('/playground/aaaa/files.json', 1234, events, new AbortController().signal, env(caches, [current], net));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(states).toEqual([{ kind: 'checking' }, { kind: 'offline', total: 1234, stopped: false }]);
    net.online = true;
    await loading;
    expect(states.at(-1)).toMatchObject({ kind: 'ready' });
    expect(states.some((state) => state.kind === 'downloading')).toBe(true);
  });

  test('a failed file gives offline { stopped: true }, is never used, and Retry completes it', async () => {
    const caches = new FakeCaches();
    const current = manifestFor('aaaa');
    let failing = true;
    const net: Net = { online: true, requests: [], fail: (url) => failing && url.endsWith('ts.worker-a.js') };
    const { states, events } = record();
    const fake = env(caches, [current], net);
    fake.waitForRetry = () => new Promise((resolve) => setTimeout(() => {
      failing = false;
      resolve();
    }, 10));
    await loadEngine('/playground/aaaa/files.json', 1000, events, new AbortController().signal, fake);
    expect(states).toContainEqual({ kind: 'offline', total: 1000, stopped: true });
    expect(fake.imported).toEqual([current.entry]);
    expect(states.at(-1)).toMatchObject({ kind: 'ready', kept: true });
  });

  test('requestRetry resumes a waiting download in the browser environment', () => {
    expect(() => requestRetry()).not.toThrow();
  });
});

describe('008-typescript-playground-FR-011: the download restarts by itself whenever the network returns', () => {
  // The browser's wait, on an event target of the test's, with short delays.
  const netEnv = (caches: FakeCaches, current: EngineManifest, net: Net, target: EventTarget) => {
    const fake = env(caches, [current], net);
    fake.waitForRetry = (signal, delayMs) => waitForNetwork(signal, delayMs === null ? null : 5, target);
    return fake;
  };

  test('with `online` fired before anything listened, it starts on the next try', async () => {
    const current = manifestFor('aaaa');
    const net: Net = { online: false, requests: [] };
    const target = new EventTarget();
    const { states, events } = record();
    net.online = true;
    target.dispatchEvent(new Event('online'));
    net.online = false;
    const loading = loadEngine('/playground/aaaa/files.json', 1000, events, new AbortController().signal, netEnv(new FakeCaches(), current, net, target));
    await new Promise((resolve) => setTimeout(resolve, 12));
    net.online = true;
    await loading;
    expect(states.at(-1)).toMatchObject({ kind: 'ready' });
  });

  test('with the fetch just after `online` failing, it tries again with no second event', async () => {
    const current = manifestFor('aaaa');
    let failures = 2;
    const net: Net = { online: true, requests: [], fail: () => failures-- > 0 };
    const target = new EventTarget();
    const { states, events } = record();
    const loading = loadEngine('/playground/aaaa/files.json', 1000, events, new AbortController().signal, netEnv(new FakeCaches(), current, net, target));
    target.dispatchEvent(new Event('online'));
    await loading;
    expect(states).toContainEqual({ kind: 'offline', total: 1000, stopped: false });
    expect(states.at(-1)).toMatchObject({ kind: 'ready' });
  });

  test('with navigator.onLine true all along and no event, it starts when the requests do', async () => {
    const current = manifestFor('aaaa');
    let down = true;
    const net: Net = { online: true, requests: [], fail: () => down };
    const { states, events } = record();
    const loading = loadEngine('/playground/aaaa/files.json', 1000, events, new AbortController().signal, netEnv(new FakeCaches(), current, net, new EventTarget()));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(states.at(-1)).toEqual({ kind: 'offline', total: 1000, stopped: false });
    // Each try that reaches nothing says nothing about a download.
    expect(states.some((state) => state.kind === 'downloading')).toBe(false);
    down = false;
    await loading;
    expect(states.at(-1)).toMatchObject({ kind: 'ready' });
  });

  test('a first file that keeps failing shows the download once: later tries show only when a file answers', async () => {
    const current = manifestFor('aaaa');
    let failing = 3;
    const net: Net = { online: true, requests: [], fail: (url) => url === current.files[0]!.path && failing-- > 0 };
    const { states, events } = record();
    await loadEngine('/playground/aaaa/files.json', 1000, events, new AbortController().signal, netEnv(new FakeCaches(), current, net, new EventTarget()));
    const kinds = states.map((state) => state.kind).filter((kind, index, all) => kind !== all[index - 1]);
    expect(kinds).toEqual(['checking', 'downloading', 'offline', 'downloading', 'ready']);
  });

  test('the wait grows to a limit, and Retry and an abort end it', async () => {
    expect([0, 1, 2, 3, 4, 5, 20].map(retryDelay)).toEqual([5_000, 10_000, 20_000, 40_000, 60_000, 60_000, 60_000]);
    const waiting = waitForNetwork(new AbortController().signal, null, new EventTarget());
    requestRetry();
    await waiting;
    const controller = new AbortController();
    const stopped = waitForNetwork(controller.signal, null, new EventTarget());
    controller.abort(new Error('closed'));
    await expect(stopped).rejects.toThrow('closed');
  });
});

describe('008-typescript-playground-FR-011: a copy that won\'t open shows the stopped state and counts as incomplete', () => {
  const failingImports = (fake: LoaderEnv & { imported: string[] }, times: number) => {
    const real = fake.importModule;
    let left = times;
    fake.importModule = async (url) => {
      if (left-- > 0) throw new Error('the module failed');
      return real(url);
    };
  };

  test('a whole download that won\'t open: stopped, no marker, and Retry alone starts over', async () => {
    const caches = new FakeCaches();
    const current = manifestFor('aaaa');
    const fake = env(caches, [current], { online: true, requests: [] });
    failingImports(fake, 1);
    const delays: (number | null)[] = [];
    const { states, events } = record();
    fake.waitForRetry = async (_signal, delayMs) => {
      delays.push(delayMs);
      expect((await caches.open('playground-aaaa')).entries.has('/playground/aaaa/complete')).toBe(false);
    };
    const loaded = await loadEngine('/playground/aaaa/files.json', 1000, events, new AbortController().signal, fake);
    expect(states).toContainEqual({ kind: 'offline', total: 1000, stopped: true });
    expect(delays).toEqual([null]);
    expect(loaded.kept).toBe(true);
    expect((await caches.open('playground-aaaa')).entries.has('/playground/aaaa/complete')).toBe(true);
  });

  test('a stored copy that won\'t open is downloaded again', async () => {
    const caches = new FakeCaches();
    const current = manifestFor('aaaa');
    const net: Net = { online: true, requests: [] };
    await loadEngine('/playground/aaaa/files.json', 1000, record().events, new AbortController().signal, env(caches, [current], net));
    net.requests.length = 0;
    const fake = env(caches, [current], net);
    failingImports(fake, 1);
    const { states, events } = record();
    await loadEngine('/playground/aaaa/files.json', 1000, events, new AbortController().signal, fake);
    expect(net.requests).toContain(current.entry);
    expect(states.some((state) => state.kind === 'downloading')).toBe(true);
    expect(states.at(-1)).toMatchObject({ kind: 'ready', kept: true });
  });

  test('an older copy that won\'t open is forgotten, and the wait goes on', async () => {
    const caches = new FakeCaches();
    const older = manifestFor('bbbb');
    const net: Net = { online: true, requests: [] };
    await loadEngine('/playground/bbbb/files.json', 1000, record().events, new AbortController().signal, env(caches, [older], net));
    net.online = false;
    const fake = env(caches, [older], net);
    failingImports(fake, 1);
    const { states, events } = record();
    fake.waitForRetry = async () => {
      net.online = true;
      throw new Error('stop here');
    };
    await expect(loadEngine('/playground/aaaa/files.json', 1000, events, new AbortController().signal, fake)).rejects.toThrow('stop here');
    expect(states.at(-1)).toMatchObject({ kind: 'offline' });
    expect((await caches.open('playground-bbbb')).entries.has('/playground/bbbb/complete')).toBe(false);
  });

  test('forgetCopy, for an engine that won\'t start, takes the marker away', async () => {
    const caches = new FakeCaches();
    const current = manifestFor('aaaa');
    await loadEngine('/playground/aaaa/files.json', 1000, record().events, new AbortController().signal, env(caches, [current], { online: true, requests: [] }));
    await forgetCopy(current, { caches: caches as unknown as CacheStorage });
    expect((await caches.open('playground-aaaa')).entries.has('/playground/aaaa/complete')).toBe(false);
  });
});

describe('008-typescript-playground-FR-013: an older complete copy is used when the current one can\'t be had, and goes once it can', () => {
  test('offline, the newest other complete copy of the same api opens, showing its version; one of another api never does', async () => {
    const caches = new FakeCaches();
    const old = manifestFor('old1', 1, '5.8.0');
    const other = manifestFor('old2', 2, '6.0.0');
    for (const manifest of [old, other]) {
      const cache = await caches.open(`playground-${manifest.version}`);
      for (const file of manifest.files) await cache.put(file.path, new Response('x'));
      await cache.put(`/playground/${manifest.version}/complete`, new Response(JSON.stringify(manifest)));
    }
    const net: Net = { online: false, requests: [] };
    const { states, events } = record();
    const fake = env(caches, [manifestFor('new1')], net);
    await loadEngine('/playground/new1/files.json', 1000, events, new AbortController().signal, fake);
    expect(states.at(-1)).toEqual({ kind: 'ready', typescript: '5.8.0', kept: true });
    expect(fake.imported).toEqual([old.entry]);
    expect(caches.stores.has('playground-old1')).toBe(true);
  });

  test('once the current copy is complete, every other playground- cache is deleted', async () => {
    const caches = new FakeCaches();
    await caches.open('playground-old1');
    await caches.open('cv-1234');
    const net: Net = { online: true, requests: [] };
    await loadEngine('/playground/new1/files.json', 1000, record().events, new AbortController().signal, env(caches, [manifestFor('new1')], net));
    expect([...caches.stores.keys()].sort()).toEqual(['cv-1234', 'playground-new1']);
  });
});

describe("008-typescript-playground-FR-014: when the browser can't keep TypeScript, it loads from the network", () => {
  test('with caches missing, the entry loads and kept is false', async () => {
    const net: Net = { online: true, requests: [] };
    const fake = env(undefined, [manifestFor('aaaa')], net);
    const loaded = await loadEngine('/playground/aaaa/files.json', 1000, record().events, new AbortController().signal, fake);
    expect(loaded.kept).toBe(false);
    expect(fake.imported).toHaveLength(1);
  });

  test('with open or put throwing, the entry loads and kept is false', async () => {
    for (const failure of ['open', 'put'] as const) {
      const caches = new FakeCaches();
      if (failure === 'open') caches.failOpen = true;
      else (await caches.open('playground-aaaa')).failPut = true;
      const { states, events } = record();
      const loaded = await loadEngine('/playground/aaaa/files.json', 1000, events, new AbortController().signal, env(caches, [manifestFor('aaaa')], { online: true, requests: [] }));
      expect(loaded.kept, failure).toBe(false);
      expect(states.at(-1), failure).toEqual({ kind: 'ready', typescript: '5.9.3', kept: false });
    }
  });
});
