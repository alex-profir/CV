// The runtime (009 research R1, R2): a program's worker script, one classic
// script, in a sandboxed frame. Before anything else it takes its port into a
// closure, as 008's runtime does, and removes what a program must not reach.
// The program's code comes later, as a message, and only `eval` runs it.
import { inspect } from 'node-inspect-extracted';
import { mapPosition } from '../../../playground/engine/source-map.ts';
import type { Compiled, ProgramRequest } from '../messages.ts';
import { createConsole, createOutput } from './console.ts';
import { createErrors } from './errors.ts';
import type { Source } from './errors.ts';
import { createFiles } from './files.ts';
import { createLoader } from './loader.ts';
import { createLoop } from './loop.ts';
import { createAssert } from './modules/assert.ts';
import { Buffer, bufferModule } from './modules/buffer.ts';
import { EventEmitter } from './modules/events.ts';
import { createFs } from './modules/fs.ts';
import { createOs } from './modules/os.ts';
import { createPath } from './modules/path.ts';
import { createTimers } from './modules/timers.ts';
import { createUrl } from './modules/url.ts';
import { createUtil } from './modules/util.ts';
import { createProcess } from './process.ts';
import { removeReaches } from './sandbox.ts';

type Scope = typeof globalThis & {
  addEventListener(type: string, listener: (event: any) => void): void;
  removeEventListener(type: string, listener: (event: any) => void): void;
  postMessage(message: unknown): void;
};

const scope = self as unknown as Scope;

// The originals, taken before any code of the program can change them.
const postToFrame = scope.postMessage.bind(scope);
const dataOf = Function.prototype.call.bind(Object.getOwnPropertyDescriptor(MessageEvent.prototype, 'data')!.get!) as (event: MessageEvent) => unknown;
const now = performance.now.bind(performance);
const realSetTimeout = scope.setTimeout.bind(scope) as (run: () => void, ms?: number) => unknown;
const realClearTimeout = scope.clearTimeout.bind(scope) as (handle: never) => void;
const RealChannel = MessageChannel;
const listen = scope.addEventListener.bind(scope);

removeReaches(scope);

let toPage: ((message: unknown) => void) | null = null;
let nonce = '';

const send = (message: Record<string, unknown>) => toPage?.({ ...message, nonce });

// Stops here for good: the page terminates the worker on what was just sent.
const halt = (): never => {
  for (;;);
};

let signal: (() => void) | null = null;

function run(request: ProgramRequest, compiled: Compiled | undefined): void {
  const channel = new RealChannel();
  const tasks: (() => void)[] = [];
  channel.port1.onmessage = () => tasks.shift()?.();
  const task = (work: () => void) => {
    tasks.push(work);
    channel.port2.postMessage(0);
  };

  let ended = false;
  const output = createOutput({ send, now, limit: halt });

  const stopFor = (code: number, uncaught: boolean): never => {
    if (!ended) {
      ended = true;
      loop.stop();
      output.flush(true);
      send(uncaught ? { exit: code, uncaught: true } : { exit: code });
    }
    return halt();
  };

  let exiting = false;
  // The `exit` handlers, once, with the code (FR-035), then the end.
  function exit(code: number, uncaught = false): never {
    if (exiting) stopFor(Number(proc.process['exitCode'] ?? code), uncaught);
    exiting = true;
    proc.process['exitCode'] = code;
    try {
      proc.process.emit('exit', code);
    } catch (error) {
      output.write('stderr', errors.uncaughtText(error));
      stopFor(7, true);
    }
    return stopFor(proc.code(), uncaught);
  }

  // Nothing caught it: `uncaughtException` may keep the program alive (FR-019).
  function uncaught(error: unknown, origin: 'uncaughtException' | 'unhandledRejection' = 'uncaughtException'): void {
    if (exiting) {
      output.write('stderr', errors.uncaughtText(error));
      stopFor(1, true);
    }
    if (proc.process.listenerCount('uncaughtException') > 0) {
      try {
        proc.process.emit('uncaughtException', error, origin);
        return;
      } catch (again) {
        output.write('stderr', errors.uncaughtText(again));
        exitFatal();
      }
    }
    output.write('stderr', errors.uncaughtText(error));
    exitFatal();
  }

  const exitFatal = () => exit(1, true);

  const unsettled = { main: false };
  const loop = createLoop({
    now,
    task,
    sleep: (work, ms) => realSetTimeout(work, ms),
    wake: (handle) => realClearTimeout(handle as never),
    uncaught,
    drained() {
      // `beforeExit` may give the loop more to do, as many times as it likes.
      loop.call(() => proc.process.emit('beforeExit', proc.code()));
      if (loop.alive()) return;
      if (unsettled.main && proc.process['exitCode'] === undefined) {
        output.write('stderr', 'Warning: Detected unsettled top-level await\n');
        exit(13);
      }
      exit(proc.code());
    },
  });

  const files = createFiles(request.files, { send, now: () => Date.now() });
  const path = createPath(() => proc.cwd());
  const proc = createProcess({
    request,
    loop,
    output,
    send,
    now,
    isFolder: (at) => files.get(at)?.kind === 'folder',
    exists: (at) => files.get(at) !== undefined,
    resolve: (at) => path.resolve(at),
    exit: (code) => exit(code),
  });

  const sources = new Map<string, Source>();
  let entryFile: string | null = null;
  let loadingFile: string | null = null;
  const errors = createErrors(sources, () => entryFile, () => loadingFile);
  errors.install();

  const log = createConsole(output, { now, clean: errors.clean, stack: errors.stack });

  const { timers, promises: timerPromises } = createTimers(loop);
  const fs = createFs(files, loop, path, Buffer);
  const util = createUtil({ nextTick: (work) => loop.nextTick(work), warn: (message, code) => (proc.process['emitWarning'] as (...values: unknown[]) => void)(message, 'DeprecationWarning', code) });
  const assert = createAssert(false);
  const assertStrict = createAssert(true);
  (assert as unknown as { strict: unknown }).strict = assertStrict;
  (assertStrict as unknown as { strict: unknown }).strict = assertStrict;

  const builtins: Record<string, () => unknown> = {
    fs: () => fs,
    'fs/promises': () => fs.promises,
    path: () => path,
    'path/posix': () => path,
    events: () => EventEmitter,
    util: () => util,
    assert: () => assert,
    'assert/strict': () => assertStrict,
    os: () => os,
    timers: () => timers,
    'timers/promises': () => timerPromises,
    buffer: () => bufferModule,
    url: () => url,
  };
  const os = createOs(() => now() / 1000);
  const url = createUrl((at) => path.resolve(at));

  const loader = createLoader({
    files,
    sources,
    compiled,
    cwd: () => proc.cwd(),
    has: (name) => Object.hasOwn(builtins, name),
    builtin: (name) => builtins[name]!(),
    loading: (at) => {
      loadingFile = at;
    },
    mapFor: (map) => (line, column) => {
      const mapped = mapPosition(map, line, column);
      return mapped === null ? null : { line: mapped.line, column: mapped.column };
    },
  });

  const define = (name: string, value: unknown) => Object.defineProperty(scope, name, { value, writable: true, configurable: true, enumerable: false });
  define('console', log);
  define('process', proc.process);
  define('Buffer', Buffer);
  define('global', scope);
  for (const [name, value] of Object.entries(timers)) if (name !== 'promises') define(name, value);
  define('__nodeImport', (from: string) => (specifier: unknown) => loader.dynamicImport(from, specifier));
  define('__nodeMeta', (from: string) => loader.metaOf(from));
  removeLeft(scope);

  // A rejection nothing handled (FR-019): the browser tells it as an event.
  listen('unhandledrejection', (event: { reason: unknown; promise: unknown; preventDefault(): void }) => {
    event.preventDefault();
    loop.call(() => {
      if (proc.process.listenerCount('unhandledRejection') > 0) {
        proc.process.emit('unhandledRejection', event.reason, event.promise);
        return;
      }
      const { reason } = event;
      if (reason instanceof Error) {
        uncaught(reason, 'unhandledRejection');
        return;
      }
      const error = Object.assign(new Error(`This error originated either by throwing inside of an async function without a catch block, or by rejecting a promise which was not handled with .catch(). The promise rejected with the reason "${inspect(reason)}".`), { name: 'UnhandledPromiseRejection', code: 'ERR_UNHANDLED_REJECTION' });
      uncaught(error, 'unhandledRejection');
    });
  });
  listen('error', (event: { error?: unknown; message?: string; preventDefault(): void }) => {
    event.preventDefault();
    loop.call(() => uncaught(event.error ?? new Error(String(event.message))));
  });

  signal = () =>
    loop.call(() => {
      proc.process.emit('SIGINT', 'SIGINT');
      // A `once` handler has just gone.
      proc.told();
    });

  // Top-level code, in a callback of the loop.
  function runMain(work: () => Promise<void> | undefined): void {
    const settled = (result: Promise<void> | undefined) => {
      if (result === undefined) return;
      unsettled.main = true;
      result.then(
        () => {
          unsettled.main = false;
        },
        (error: unknown) => {
          unsettled.main = false;
          loop.call(() => uncaught(error));
        },
      );
    };
    loop.call(() => settled(work()));
    loop.start();
  }

  const script = request.script;
  try {
    if (script !== null) {
      const main = loader.resolveMain(script);
      entryFile = main;
      (proc.process['argv'] as string[])[1] = main;
      if (loader.isModuleEntry(main)) {
        // As an ES module: its code runs in a microtask, ahead of `nextTick`s.
        runMain(() => Promise.resolve().then(() => loader.runModule(main)));
      } else runMain(() => void loader.runCommon(main));
    } else {
      const code = request.code ?? '';
      const { module } = loader.prepareEval(code);
      if (module) runMain(() => Promise.resolve().then(() => loader.evalModule(code)));
      else {
        const made = loader.evalRequire();
        define('module', made);
        define('exports', made.exports);
        define('require', made.require);
        define('__filename', '[eval]');
        define('__dirname', '.');
        runMain(() => {
          const result = loader.evalScript(code);
          if (request.print) log.log(result);
        });
      }
    }
  } catch (error) {
    uncaught(error);
    loop.start();
  }
}

// What could end a program without its host hearing, or tell the frame anything.
function removeLeft(from: object): void {
  for (const name of ['close', 'postMessage']) {
    for (let holder: object | null = from; holder !== null; holder = Object.getPrototypeOf(holder)) {
      try {
        delete (holder as Record<string, unknown>)[name];
      } catch {
        // Shadowed below.
      }
    }
    if ((from as Record<string, unknown>)[name] !== undefined) Object.defineProperty(from, name, { value: undefined, writable: false, configurable: false, enumerable: false });
  }
}

type FromPage = { nonce?: unknown; run?: unknown; request?: unknown; compiled?: unknown; signal?: unknown };

let running = false;

function onPage(event: MessageEvent): void {
  const data = dataOf(event) as FromPage | null;
  if (data === null || typeof data !== 'object' || data.nonce !== nonce) return;
  if (data.run === true && !running) {
    running = true;
    run(data.request as ProgramRequest, data.compiled as Compiled | undefined);
  } else if (data.signal === 'SIGINT') signal?.();
}

// The bootstrap's first message gives the port and the nonce; the frame is told
// the worker started, so it can revoke the script's URL.
function onFirst(event: MessageEvent): void {
  if (toPage !== null) return;
  const data = dataOf(event) as { port?: { postMessage(message: unknown): void; onmessage: unknown }; nonce?: unknown } | null;
  if (data === null || typeof data !== 'object' || data.port === undefined || typeof data.nonce !== 'string') return;
  toPage = data.port.postMessage.bind(data.port);
  nonce = data.nonce;
  scope.removeEventListener('message', onFirst);
  data.port.onmessage = onPage;
  postToFrame('started');
}

scope.addEventListener('message', onFirst);
