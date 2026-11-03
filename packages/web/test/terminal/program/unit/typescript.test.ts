// TypeScript's copy for a program (009 research R12), with a fake loader's world.
import { describe, expect, test, vi } from 'vitest';
import { compileProgram, compileRequest, needsCompiler } from '../../../../src/apps/terminal/program/typescript.ts';
import type { CompilerWorker } from '../../../../src/apps/terminal/program/typescript.ts';
import type { LoaderEnv } from '../../../../src/apps/playground/engine/loader.ts';
import type { EngineManifest } from '../../../../src/apps/playground/types.ts';
import { NODE_TYPES } from '../../../../src/apps/playground/engine/compile.ts';
import type { ProgramRequest } from '../../../../src/apps/terminal/program/messages.ts';

const HASH = 'abc';
const FOLDER = `/playground/${HASH}`;
const MANIFEST: EngineManifest = { api: 2, version: HASH, typescript: '5.9.3', entry: `${FOLDER}/e.js`, style: `${FOLDER}/s.css`, compiler: `${FOLDER}/t.js`, files: [{ path: `${FOLDER}/e.js`, bytes: 400 }, { path: `${FOLDER}/t.js`, bytes: 600 }], total: 1000 };
const REQUEST: ProgramRequest = { command: 'ts-node', script: '/home/guest/a.ts', code: null, print: false, args: [], cwd: '/home/guest', env: {}, files: { entries: [{ path: '/home/guest/a.ts', kind: 'file', owner: 'guest', protected: false, text: 'x' }, { path: '/home/guest/b.bin', kind: 'file', owner: 'guest', protected: false, text: 'y', binary: true }, { path: '/home/guest/d', kind: 'folder', owner: 'guest', protected: false }], bytes: 1 } };

function memoryCache() {
  const held = new Map<string, Response>();
  return { held, cache: { match: async (key: string) => held.get(key)?.clone(), put: async (key: string, value: Response) => void held.set(key, value), delete: async (key: string) => held.delete(key) } as unknown as Cache };
}

function world(options: { stored?: EngineManifest | null; older?: { hash: string; manifest: EngineManifest }; online?: boolean; hold?: Promise<void> } = {}) {
  const requests: string[] = [];
  const main = memoryCache();
  const others = new Map<string, ReturnType<typeof memoryCache>>();
  if (options.stored) void main.cache.put(`${FOLDER}/complete`, new Response(JSON.stringify(options.stored)));
  if (options.older !== undefined) {
    const other = memoryCache();
    void other.cache.put(`/playground/${options.older.hash}/complete`, new Response(JSON.stringify(options.older.manifest)));
    others.set(`playground-${options.older.hash}`, other);
  }
  const linkStyle = vi.fn(async () => undefined);
  const importModule = vi.fn(async () => ({}) as never);
  const loader: LoaderEnv = {
    onLine: () => options.online !== false,
    caches: { open: async (name: string) => (name === `playground-${HASH}` ? main.cache : others.get(name)?.cache ?? memoryCache().cache), keys: async () => [`playground-${HASH}`, ...others.keys()], delete: async () => true } as unknown as CacheStorage,
    fetch: async (url: string) => {
      requests.push(url);
      if (options.online === false) throw new TypeError('Failed to fetch');
      if (options.hold !== undefined) await options.hold;
      if (url.endsWith('files.json')) return new Response(JSON.stringify(MANIFEST));
      const file = MANIFEST.files.find((each) => each.path === url);
      return file === undefined ? new Response('', { status: 404 }) : new Response(new Uint8Array(file.bytes));
    },
    linkStyle,
    importModule,
    waitForRetry: (signal) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })),
  };
  const workers: { address: string; sent: unknown[]; terminated: boolean; worker: CompilerWorker }[] = [];
  const env = {
    manifest: `${FOLDER}/files.json`,
    bytes: 1000,
    loader,
    nodeTypes: 'the types',
    makeWorker(address: string) {
      const held = { address, sent: [] as unknown[], terminated: false, worker: null as unknown as CompilerWorker };
      held.worker = {
        onmessage: null,
        onerror: null,
        postMessage: (message) => {
          held.sent.push(message);
          queueMicrotask(() => held.worker.onmessage?.({ data: { diagnostics: [], outputs: { done: { js: '', map: '' } } } }));
        },
        terminate: () => void (held.terminated = true),
      };
      workers.push(held);
      return held.worker;
    },
  };
  return { env, requests, workers, linkStyle, importModule };
}

const NEVER = new AbortController().signal;

describe('009-terminal-node-FR-037: TypeScript comes from the Playground\'s copy', () => {
  test('an existing current copy downloads nothing, reports nothing and opens nothing', async () => {
    const { env, requests, linkStyle, importModule, workers } = world({ stored: MANIFEST });
    const progress: number[] = [];
    const outcome = await compileProgram(env, REQUEST, (step) => progress.push(step), NEVER);
    expect(outcome.kind).toBe('done');
    expect(requests).toEqual([]);
    expect(progress).toEqual([]);
    // Monaco never loads: the real style and entry functions aren't called.
    expect(linkStyle).not.toHaveBeenCalled();
    expect(importModule).not.toHaveBeenCalled();
    expect(workers[0]!.address).toBe(MANIFEST.compiler);
    expect(workers[0]!.terminated).toBe(true);
  });

  test('with none, it downloads and reports each 25% step', async () => {
    const { env, requests } = world();
    const progress: number[] = [];
    const outcome = await compileProgram(env, REQUEST, (step) => progress.push(step), NEVER);
    expect(outcome.kind).toBe('done');
    expect(requests).toContain(MANIFEST.compiler);
    expect(progress).toEqual([0, 1, 4]);
  });

  test('offline with no copy ends the run, and stops waiting', async () => {
    const { env } = world({ online: false });
    expect(await compileProgram(env, REQUEST, () => undefined, NEVER)).toEqual({ kind: 'offline' });
  });

  test('offline with a copy runs', async () => {
    const { env } = world({ online: false, stored: MANIFEST });
    expect((await compileProgram(env, REQUEST, () => undefined, NEVER)).kind).toBe('done');
  });

  test('a press during the download stops it, and no worker starts', async () => {
    let release = () => {};
    const { env, workers } = world({ hold: new Promise((resolve) => (release = resolve)) });
    const stop = new AbortController();
    const outcome = compileProgram(env, REQUEST, () => undefined, stop.signal);
    await Promise.resolve();
    stop.abort();
    release();
    expect((await outcome).kind).toBe('failed');
    expect(workers).toEqual([]);
  });

  test('an older copy of api 1, or one with no compiler, is not used', async () => {
    const { env, requests } = world({ older: { hash: 'old', manifest: { ...MANIFEST, api: 1 as 2, version: 'old', compiler: undefined as unknown as string } } });
    expect((await compileProgram(env, REQUEST, () => undefined, NEVER)).kind).toBe('done');
    expect(requests).toContain(`${FOLDER}/files.json`);
    const missing = world({ stored: { ...MANIFEST, compiler: undefined as unknown as string } });
    expect((await compileProgram(missing.env, REQUEST, () => undefined, NEVER)).kind).toBe('failed');
  });
});

describe('009-terminal-node-FR-002 and 009-terminal-node-FR-001: the script, whichever way it is named', () => {
  const entries = (...names: string[]): ProgramRequest['files'] => ({ bytes: 0, entries: names.map((path) => (path.endsWith('/') ? { path: path.slice(0, -1), kind: 'folder' as const, owner: 'guest' as const, protected: false } : { path, kind: 'file' as const, owner: 'guest' as const, protected: false, text: 'x' })) });

  test('ts-node checks the file it runs, named without its extension', () => {
    const request = { ...REQUEST, script: '/home/guest/app', files: entries('/home/guest/app.ts') };
    expect(compileRequest(request, '').root).toBe('/home/guest/app.ts');
    expect(needsCompiler(request)).toBe(true);
  });

  test("a folder's index.ts likewise", () => {
    const request = { ...REQUEST, script: '/home/guest/d', files: entries('/home/guest/d/', '/home/guest/d/index.ts') };
    expect(compileRequest(request, '').root).toBe('/home/guest/d/index.ts');
  });

  test('ts-node finds app.ts for app.js, as what runs does', () => {
    const request = { ...REQUEST, script: '/home/guest/app.js', files: entries('/home/guest/app.ts') };
    expect(compileRequest(request, '').root).toBe('/home/guest/app.ts');
  });

  test('node needs TypeScript for app.ts named app, and strips it', () => {
    const request = { ...REQUEST, command: 'node' as const, script: '/home/guest/app', files: entries('/home/guest/app.ts') };
    expect(needsCompiler(request)).toBe(true);
    expect(compileRequest(request, '')).toMatchObject({ root: '/home/guest/app.ts', mode: 'strip' });
  });

  test('node for app.js beside nothing else, or with a .js first, needs none', () => {
    expect(needsCompiler({ ...REQUEST, command: 'node', script: '/home/guest/app', files: entries('/home/guest/app.js', '/home/guest/app.ts') })).toBe(false);
    expect(needsCompiler({ ...REQUEST, command: 'node', script: '/home/guest/app.js', files: entries('/home/guest/app.ts') })).toBe(false);
  });
});

describe('009-terminal-node-FR-002: what is sent to be compiled', () => {
  test('text files and the types; ts-node checks, node strips', () => {
    const sent = compileRequest(REQUEST, 'the types');
    expect(sent).toEqual({ root: '/home/guest/a.ts', mode: 'check', files: { [NODE_TYPES]: 'the types', '/home/guest/a.ts': 'x' } });
    expect(compileRequest({ ...REQUEST, command: 'node' }, '').mode).toBe('strip');
  });

  test.each([
    ['ts-node', '/a.ts', true],
    ['ts-node', '/a.js', true],
    ['node', '/a.ts', true],
    ['node', '/a.mts', true],
    ['node', '/a.js', false],
    ['node', null, false],
  ] as const)('%s %s: %s', (command, script, wanted) => {
    expect(needsCompiler({ ...REQUEST, command, script })).toBe(wanted);
  });
});
