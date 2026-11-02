// `process` (009 contracts/node-api.md, FR-012, FR-015, FR-016).
import { EventEmitter } from './modules/events.ts';
import type { Loop } from './loop.ts';
import type { Output } from './console.ts';
import type { ProgramRequest } from '../messages.ts';

const VERSION = 'v26.0.0';
const EXEC_PATH = '/usr/local/bin/node';

const invalid = (name: string, value: unknown, kind: string) => Object.assign(new TypeError(`The "${name}" argument must be ${kind}. Received ${value === null ? 'null' : value === undefined ? 'undefined' : `type ${typeof value}`}`), { code: 'ERR_INVALID_ARG_TYPE' });

// `process.env`: every value a string, as Node's.
function envOf(start: Readonly<Record<string, string>>): Record<string, string> {
  const held: Record<string, string> = {};
  for (const [name, value] of Object.entries(start)) held[name] = String(value);
  return new Proxy(held, {
    set(target, name, value) {
      if (typeof name === 'symbol') throw new TypeError('Cannot convert a Symbol value to a string');
      target[name] = String(value);
      return true;
    },
    defineProperty(target, name, descriptor) {
      if (typeof name === 'symbol' || !('value' in descriptor)) return false;
      target[name] = String(descriptor.value);
      return true;
    },
  });
}

export type ProcessDeps = {
  request: ProgramRequest;
  loop: Loop;
  output: Output;
  send: (message: Record<string, unknown>) => void;
  now: () => number;
  // What `chdir` may go to: whether it is a folder.
  isFolder: (path: string) => boolean;
  exists: (path: string) => boolean;
  resolve: (path: string) => string;
  // Ends the program, with its `exit` handlers, and never returns.
  exit: (code: number) => never;
};

export function createProcess(deps: ProcessDeps) {
  const { request, loop, output } = deps;
  let cwd = request.cwd;
  let exitCode: number | string | undefined;
  const started = deps.now();

  class Process extends EventEmitter {}
  const process = new Process() as Process & Record<string, unknown>;

  const stream = (name: 'stdout' | 'stderr', fd: number) => ({
    fd,
    isTTY: false,
    columns: 80,
    writable: true,
    write(chunk: unknown, encoding?: unknown, done?: unknown) {
      if (typeof chunk !== 'string' && !(chunk instanceof Uint8Array)) throw Object.assign(new TypeError(`The "chunk" argument must be of type string or an instance of Buffer, TypedArray, or DataView. Received ${chunk === null ? 'null' : `type ${typeof chunk}`}`), { code: 'ERR_INVALID_ARG_TYPE' });
      output.write(name, typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk));
      const callback = typeof encoding === 'function' ? encoding : done;
      if (typeof callback === 'function') loop.nextTick(callback as () => void);
      return true;
    },
    on() {
      return this;
    },
    once() {
      return this;
    },
    end() {},
  });

  // Standard input: already ended (FR-016). `end` and `close` come a tick after
  // anyone listens, and nothing is ever read.
  class Stdin extends EventEmitter {
    fd = 0;
    isTTY = false;
    readable = false;
    #ended = false;

    #end(): void {
      if (this.#ended) return;
      this.#ended = true;
      loop.defer(() => {
        this.emit('end');
        this.emit('close');
      });
    }

    override on(name: string | symbol, listener: (...values: unknown[]) => unknown): this {
      super.on(name, listener);
      if (name === 'data' || name === 'end' || name === 'readable' || name === 'close') this.#end();
      return this;
    }

    override once(name: string | symbol, listener: (...values: unknown[]) => unknown): this {
      super.once(name, listener);
      if (name === 'data' || name === 'end' || name === 'readable' || name === 'close') this.#end();
      return this;
    }

    read() {
      return null;
    }

    setEncoding() {
      return this;
    }

    resume() {
      this.#end();
      return this;
    }

    pause() {
      return this;
    }

    ref() {
      return this;
    }

    unref() {
      return this;
    }

    async *[Symbol.asyncIterator]() {
      // Nothing to read.
    }
  }

  const hrtime = (previous?: [number, number]) => {
    const ms = deps.now();
    let seconds = Math.floor(ms / 1000);
    let nanos = Math.floor((ms % 1000) * 1e6);
    if (previous !== undefined) {
      seconds -= previous[0];
      nanos -= previous[1];
      if (nanos < 0) {
        seconds -= 1;
        nanos += 1e9;
      }
    }
    return [seconds, nanos];
  };
  hrtime.bigint = () => BigInt(Math.floor(deps.now() * 1e6));

  const memoryUsage = () => ({ rss: 50_000_000, heapTotal: 20_000_000, heapUsed: 10_000_000, external: 1_000_000, arrayBuffers: 10_000 });
  memoryUsage.rss = () => 50_000_000;

  const script = request.script;
  const fields: Record<string, unknown> = {
    title: 'node',
    version: VERSION,
    versions: { node: VERSION.slice(1), browser: 'runtime' },
    arch: 'browser',
    platform: 'browser',
    release: { name: 'node' },
    argv: [EXEC_PATH, ...(script === null ? [] : [script]), ...request.args],
    argv0: 'node',
    execArgv: [],
    execPath: EXEC_PATH,
    env: envOf(request.env),
    pid: 1,
    ppid: 0,
    stdout: stream('stdout', 1),
    stderr: stream('stderr', 2),
    stdin: new Stdin(),
    hrtime,
    memoryUsage,
    cwd: () => cwd,
    chdir(path: unknown) {
      if (typeof path !== 'string') throw invalid('directory', path, 'of type string');
      const target = deps.resolve(path);
      if (!deps.exists(target)) throw Object.assign(new Error(`ENOENT: no such file or directory, chdir ${cwd} -> '${path}'`), { errno: -2, code: 'ENOENT', syscall: 'chdir', path: cwd, dest: path });
      if (!deps.isFolder(target)) throw Object.assign(new Error(`ENOTDIR: not a directory, chdir ${cwd} -> '${path}'`), { errno: -20, code: 'ENOTDIR', syscall: 'chdir', path: cwd, dest: path });
      cwd = target;
    },
    uptime: () => (deps.now() - started) / 1000,
    nextTick(callback: unknown, ...values: unknown[]) {
      if (typeof callback !== 'function') throw invalid('callback', callback, 'of type function');
      loop.nextTick(() => callback(...values));
    },
    exit(code?: unknown) {
      if (code !== undefined) (process as unknown as { exitCode: unknown }).exitCode = code;
      deps.exit(codeOf());
    },
    emitWarning(warning: unknown, kind?: unknown, code?: unknown) {
      const name = typeof kind === 'string' ? kind : ((kind as { type?: string } | undefined)?.type ?? (warning instanceof Error ? warning.name : 'Warning'));
      const number = typeof code === 'string' ? code : (kind as { code?: string } | undefined)?.code;
      const made = warning instanceof Error ? warning : Object.assign(new Error(String(warning)), { name, ...(number === undefined ? {} : { code: number }) });
      loop.nextTick(() => {
        process.emit('warning', made);
        output.write('stderr', `(node:1) ${number === undefined ? '' : `[${number}] `}${name}: ${made.message}\n`);
      });
    },
  };
  for (const [name, value] of Object.entries(fields)) Object.defineProperty(process, name, { value, writable: true, enumerable: true, configurable: true });

  function codeOf(): number {
    if (exitCode === undefined) return 0;
    return Number(exitCode);
  }

  Object.defineProperty(process, 'exitCode', {
    enumerable: true,
    configurable: false,
    get: () => exitCode,
    set(value: unknown) {
      if (value === null || value === undefined) exitCode = undefined;
      else if ((typeof value === 'number' && Number.isInteger(value)) || (typeof value === 'string' && value !== '' && Number.isInteger(Number(value)))) exitCode = value as number | string;
      else throw Object.assign(new TypeError(`The "code" argument must be of type number. Received ${typeof value === 'number' ? value : `type ${typeof value}`}`), { code: 'ERR_INVALID_ARG_TYPE' });
    },
  });

  // Tells the page when a SIGINT handler comes or goes (research R8).
  let handled = false;
  const told = () => {
    const now = process.listenerCount('SIGINT') > 0;
    if (now !== handled) {
      handled = now;
      deps.send({ sigint: now });
    }
  };
  for (const method of ['on', 'addListener', 'once', 'prependListener', 'prependOnceListener', 'off', 'removeListener', 'removeAllListeners'] as const) {
    const original = process[method] as (...values: unknown[]) => unknown;
    Object.defineProperty(process, method, {
      value(this: unknown, ...values: unknown[]) {
        const result = original.apply(process, values);
        told();
        return result === process ? this : result;
      },
      writable: true,
      enumerable: false,
      configurable: true,
    });
  }

  return { process, cwd: () => cwd, code: codeOf, told };
}

export type RuntimeProcess = ReturnType<typeof createProcess>;
