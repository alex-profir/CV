// The runtime in a test (009 research R15, T012). `runProgram` bundles
// `runtime/main.ts` with Rolldown for the browser, so `buffer` is the npm package
// and not Node's built-in, and runs that text in a Node worker thread, inside a
// `vm` context holding only what a browser's worker offers. Node's own `process`,
// `Buffer`, `require` and `setImmediate` aren't there, so they can't hide a name
// the runtime forgot. `underNode` runs the same files under the real Node.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { rolldown } from 'rolldown';
import type { Compiled, ProgramRequest, SnapshotEntry } from '../../../../../src/apps/terminal/program/messages.ts';

const MAIN = path.resolve(import.meta.dirname, '../../../../../src/apps/terminal/program/runtime/main.ts');

export const HOME = '/home/guest';

const bundles = new Map<string, Promise<string>>();

export function bundleRuntime(entry: string = MAIN): Promise<string> {
  let bundle = bundles.get(entry);
  if (bundle === undefined) {
    bundle = (async () => {
      const build = await rolldown({ input: entry, platform: 'browser', logLevel: 'silent' });
      const { output } = await build.generate({ format: 'iife' });
      await build.close();
      return output[0].code;
    })();
    bundles.set(entry, bundle);
  }
  return bundle;
}

// Runs in the worker thread, in the main realm, and sets up the context.
const THREAD = String.raw`
const { parentPort, workerData } = require('node:worker_threads');
const vm = require('node:vm');
const context = vm.createContext({});
const give = (name, value) => { context[name] = value; };
for (const name of ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask', 'URL', 'URLSearchParams', 'structuredClone', 'performance', 'AbortController', 'AbortSignal', 'Event', 'EventTarget', 'atob', 'btoa']) give(name, globalThis[name]);
give('__send', (text) => parentPort.postMessage(JSON.parse(text)));
give('__encode', (text) => [...new TextEncoder().encode(text)]);
give('__decode', (bytes, label, fatal) => new TextDecoder(label, { fatal }).decode(Uint8Array.from(bytes)));
const shim = vm.runInContext(workerData.shim, context, { filename: 'node:shim' });
process.on('uncaughtException', (error) => shim.fail('error', error));
process.on('unhandledRejection', (reason) => shim.fail('unhandledrejection', reason));
vm.runInContext(workerData.runtime, context, { filename: 'runtime.js' });
shim.begin();
parentPort.on('message', (message) => shim.deliver(JSON.stringify(message)));
parentPort.postMessage({ harness: 'ready' });
`;

// What a browser's worker gives its scripts, in the context's own realm, so
// `instanceof` and `Array.isArray` see what they would see there.
const SHIM = String.raw`(() => {
  globalThis.self = globalThis;
  const later = setTimeout;
  const clone = structuredClone;
  const listeners = new Map();
  class MessageEvent {
    #data;
    constructor(data) { this.#data = data; }
    get data() { return this.#data; }
  }
  class MessagePort {
    onmessage = null;
    postMessage(message) { __send(JSON.stringify(message)); }
  }
  class LocalPort {
    onmessage = null;
    other = null;
    postMessage(message) {
      const copy = clone(message);
      later(() => this.other.onmessage?.(new MessageEvent(copy)), 0);
    }
    close() {}
  }
  class MessageChannel {
    constructor() {
      this.port1 = new LocalPort();
      this.port2 = new LocalPort();
      this.port1.other = this.port2;
      this.port2.other = this.port1;
    }
  }
  class TextEncoder {
    encoding = 'utf-8';
    encode(text = '') { return Uint8Array.from(__encode(String(text))); }
  }
  class TextDecoder {
    #label; #fatal;
    constructor(label = 'utf-8', options = {}) { this.#label = label; this.#fatal = options.fatal === true; }
    get encoding() { return this.#label; }
    decode(bytes = new Uint8Array()) { return __decode([...new Uint8Array(bytes.buffer ?? bytes, bytes.byteOffset ?? 0, bytes.byteLength)], this.#label, this.#fatal); }
  }
  Object.assign(globalThis, { MessageEvent, MessagePort, MessageChannel, TextEncoder, TextDecoder });
  globalThis.addEventListener = (type, listener) => listeners.set(type, [...(listeners.get(type) ?? []), listener]);
  globalThis.removeEventListener = (type, listener) => listeners.set(type, (listeners.get(type) ?? []).filter((each) => each !== listener));
  globalThis.postMessage = () => {};
  const port = new MessagePort();
  const dispatch = (type, event) => { for (const listener of listeners.get(type) ?? []) listener(event); };
  return {
    begin: () => dispatch('message', new MessageEvent({ port, nonce: 'test' })),
    deliver: (text) => port.onmessage?.(new MessageEvent(JSON.parse(text))),
    fail(type, value) {
      let prevented = false;
      const event = type === 'error' ? { error: value, message: String(value), preventDefault() { prevented = true; } } : { reason: value, preventDefault() { prevented = true; } };
      dispatch(type, event);
      if (!prevented) __send(JSON.stringify({ harness: 'died', message: String(value?.stack ?? value) }));
    },
  };
})()`;

export type Signal = { afterMs?: number; afterOutput?: string };

export type ProgramRun = {
  // Every message of the runtime, in order, without the harness's.
  messages: Record<string, unknown>[];
  stdout: string;
  stderr: string;
  // Both streams in the order they were printed.
  output: string;
  exit: number | null;
  timedOut: boolean;
  died: string | null;
};

export async function runProgram(request: ProgramRequest, options: { signals?: readonly Signal[]; timeoutMs?: number; compiled?: Compiled; runtime?: string } = {}): Promise<ProgramRun> {
  const runtime = options.runtime ?? (await bundleRuntime());
  const worker = new Worker(THREAD, { eval: true, workerData: { runtime, shim: SHIM }, resourceLimits: { maxOldGenerationSizeMb: 512 } });
  const run: ProgramRun = { messages: [], stdout: '', stderr: '', output: '', exit: null, timedOut: false, died: null };
  const waiting = [...(options.signals ?? [])];
  const signal = () => worker.postMessage({ signal: 'SIGINT', nonce: 'test' });
  return new Promise((resolve) => {
    const finish = async () => {
      clearTimeout(limit);
      await worker.terminate();
      resolve(run);
    };
    const limit = setTimeout(() => {
      run.timedOut = true;
      void finish();
    }, options.timeoutMs ?? 10_000);
    worker.on('error', (error) => {
      run.died = String(error);
      void finish();
    });
    worker.on('message', (message: Record<string, unknown>) => {
      if (message['harness'] === 'ready') {
        worker.postMessage({ run: true, nonce: 'test', request, ...(options.compiled === undefined ? {} : { compiled: options.compiled }) });
        for (const each of waiting) if (each.afterMs !== undefined) setTimeout(signal, each.afterMs);
        return;
      }
      if (message['harness'] === 'died') {
        run.died = String(message['message']);
        void finish();
        return;
      }
      const { nonce: _, ...rest } = message;
      run.messages.push(rest);
      if (rest['out'] === 'stdout' || rest['out'] === 'stderr') {
        const text = String(rest['text']);
        run[rest['out']] += text;
        run.output += text;
        for (const [index, each] of waiting.entries()) {
          if (each.afterOutput !== undefined && run.output.includes(each.afterOutput)) {
            waiting.splice(index, 1);
            signal();
            break;
          }
        }
      }
      if (typeof rest['exit'] === 'number') {
        run.exit = rest['exit'];
        void finish();
      }
    });
  });
}

// A request for `files` (paths from the home folder), with the given changes.
export function request(files: Readonly<Record<string, string>>, change: Partial<ProgramRequest> = {}): ProgramRequest {
  const entries: SnapshotEntry[] = [{ path: HOME, kind: 'folder', owner: 'guest', protected: false }];
  const folders = new Set<string>();
  for (const name of Object.keys(files)) {
    const parts = name.split('/').slice(0, -1);
    for (let at = 1; at <= parts.length; at += 1) folders.add(parts.slice(0, at).join('/'));
  }
  for (const folder of [...folders].sort()) entries.push({ path: `${HOME}/${folder}`, kind: 'folder', owner: 'guest', protected: false });
  let bytes = 0;
  for (const [name, text] of Object.entries(files)) {
    entries.push({ path: `${HOME}/${name}`, kind: 'file', owner: 'guest', protected: false, text });
    bytes += text.length;
  }
  return { command: 'node', script: null, code: null, print: false, args: [], cwd: HOME, env: {}, files: { entries, bytes }, ...change };
}

// `node <file>`, the file named `main.js` unless given.
export const script = (source: string, name = 'main.js', args: readonly string[] = [], files: Readonly<Record<string, string>> = {}) => request({ ...files, [name]: source }, { script: `${HOME}/${name}`, args });

// `node -e <code>`, and `node -p <code>`.
export const evaluate = (code: string, files: Readonly<Record<string, string>> = {}) => request(files, { code });
export const printing = (code: string, files: Readonly<Record<string, string>> = {}) => request(files, { code, print: true });

export type NodeRun = { stdout: string; stderr: string; output: string; status: number | null };

// The same files under the real Node, in a new temporary folder, by relative
// paths only: this runs on the real disk.
export function underNode(files: Readonly<Record<string, string>>, argv: readonly string[]): NodeRun {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-parity-'));
  try {
    for (const [name, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(cwd, name)), { recursive: true });
      fs.writeFileSync(path.join(cwd, name), text);
    }
    const { stdout, stderr, status } = spawnSync(process.execPath, ['--no-warnings', ...argv], { cwd, encoding: 'utf8', timeout: 20_000, env: { PATH: process.env['PATH'] ?? '', FORCE_COLOR: '0', NODE_DISABLE_COLORS: '1' } });
    return { stdout, stderr, output: `${stdout}${stderr}`, status };
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
}

// Text as SC-006 compares it: no stack lines and no version line.
export const comparable = (text: string): string =>
  text
    .split('\n')
    .filter((line) => !/^\s+at /.test(line) && !/^Node\.js v/.test(line) && !/^node v\d+.*not Node\.js\)$/.test(line))
    .join('\n');
