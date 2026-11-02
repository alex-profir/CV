// What `ts-node` checks against (009 research R12, FR-038), by hand: exactly what the
// runtime offers (contracts/node-api.md), so what isn't offered is a type error. It is
// text for the compile worker, and no part of this repository's own check.

interface ConsoleOffered {
  log(...values: unknown[]): void;
  info(...values: unknown[]): void;
  debug(...values: unknown[]): void;
  error(...values: unknown[]): void;
  warn(...values: unknown[]): void;
  trace(...values: unknown[]): void;
  dir(value: unknown, options?: { depth?: number | null; showHidden?: boolean; colors?: boolean }): void;
  table(data: unknown, columns?: readonly string[]): void;
  group(...values: unknown[]): void;
  groupEnd(): void;
  time(label?: string): void;
  timeEnd(label?: string): void;
  timeLog(label?: string, ...values: unknown[]): void;
  count(label?: string): void;
  countReset(label?: string): void;
  assert(value: unknown, ...values: unknown[]): void;
}
declare const console: ConsoleOffered;

interface WriteStreamOffered {
  write(text: string | Uint8Array, callback?: () => void): boolean;
  readonly isTTY: boolean;
  readonly columns: number;
}
interface StdinOffered {
  readonly isTTY: boolean;
  on(event: string, listener: (...values: any[]) => void): StdinOffered;
  once(event: string, listener: (...values: any[]) => void): StdinOffered;
  setEncoding(encoding: string): StdinOffered;
  read(): null;
}
interface HrTime {
  (previous?: readonly [number, number]): [number, number];
  bigint(): bigint;
}
interface MemoryUsage {
  (): { rss: number; heapTotal: number; heapUsed: number; external: number; arrayBuffers: number };
  rss(): number;
}
interface ProcessOffered {
  argv: string[];
  argv0: string;
  execPath: string;
  env: Record<string, string | undefined>;
  cwd(): string;
  chdir(path: string): void;
  exit(code?: number | string | null): never;
  exitCode: number | string | null | undefined;
  readonly platform: string;
  readonly arch: string;
  readonly version: string;
  readonly versions: Record<string, string>;
  readonly release: { name: string };
  readonly pid: number;
  title: string;
  readonly hrtime: HrTime;
  uptime(): number;
  readonly memoryUsage: MemoryUsage;
  nextTick<A extends unknown[]>(callback: (...values: A) => void, ...values: A): void;
  readonly stdout: WriteStreamOffered;
  readonly stderr: WriteStreamOffered;
  readonly stdin: StdinOffered;
  on(event: string, listener: (...values: any[]) => void): this;
  once(event: string, listener: (...values: any[]) => void): this;
  off(event: string, listener: (...values: any[]) => void): this;
  emit(event: string, ...values: unknown[]): boolean;
  listenerCount(event: string): number;
  emitWarning(warning: string | Error, kind?: string, code?: string): void;
}
declare const process: ProcessOffered;

interface TimerHandle {
  ref(): this;
  unref(): this;
  hasRef(): boolean;
  refresh(): this;
  [Symbol.toPrimitive](): number;
}
declare function setTimeout<A extends unknown[]>(run: (...values: A) => void, ms?: number, ...values: A): TimerHandle;
declare function setInterval<A extends unknown[]>(run: (...values: A) => void, ms?: number, ...values: A): TimerHandle;
declare function setImmediate<A extends unknown[]>(run: (...values: A) => void, ...values: A): TimerHandle;
declare function clearTimeout(handle?: TimerHandle | number | string): void;
declare function clearInterval(handle?: TimerHandle | number | string): void;
declare function clearImmediate(handle?: TimerHandle | number | string): void;
declare function queueMicrotask(run: () => void): void;
declare function structuredClone<T>(value: T, options?: { transfer?: readonly ArrayBuffer[] }): T;

interface AbortSignalOffered {
  readonly aborted: boolean;
  readonly reason: unknown;
  throwIfAborted(): void;
  addEventListener(type: 'abort', listener: () => void, options?: { once?: boolean }): void;
  removeEventListener(type: 'abort', listener: () => void): void;
}
declare const AbortSignal: { abort(reason?: unknown): AbortSignalOffered; timeout(ms: number): AbortSignalOffered };
declare class AbortController {
  readonly signal: AbortSignalOffered;
  abort(reason?: unknown): void;
}

declare const performance: { now(): number; readonly timeOrigin: number; mark(name: string): unknown; measure(name: string, from?: string, to?: string): unknown };

declare class URLSearchParams implements Iterable<[string, string]> {
  constructor(init?: string | Record<string, string> | Iterable<readonly [string, string]> | URLSearchParams);
  readonly size: number;
  append(name: string, value: string): void;
  delete(name: string, value?: string): void;
  get(name: string): string | null;
  getAll(name: string): string[];
  has(name: string, value?: string): boolean;
  set(name: string, value: string): void;
  sort(): void;
  toString(): string;
  forEach(run: (value: string, name: string, self: URLSearchParams) => void): void;
  keys(): IterableIterator<string>;
  values(): IterableIterator<string>;
  entries(): IterableIterator<[string, string]>;
  [Symbol.iterator](): IterableIterator<[string, string]>;
}
declare class URL {
  constructor(url: string | URL, base?: string | URL);
  static canParse(url: string | URL, base?: string | URL): boolean;
  hash: string;
  host: string;
  hostname: string;
  href: string;
  readonly origin: string;
  password: string;
  pathname: string;
  port: string;
  protocol: string;
  search: string;
  readonly searchParams: URLSearchParams;
  username: string;
  toString(): string;
  toJSON(): string;
}
declare class TextEncoder {
  readonly encoding: string;
  encode(text?: string): Uint8Array;
}
declare class TextDecoder {
  constructor(label?: string, options?: { fatal?: boolean; ignoreBOM?: boolean });
  readonly encoding: string;
  readonly fatal: boolean;
  decode(bytes?: ArrayBuffer | ArrayBufferView, options?: { stream?: boolean }): string;
}

type BufferEncoding = 'utf8' | 'utf-8' | 'ascii' | 'latin1' | 'binary' | 'base64' | 'base64url' | 'hex' | 'ucs2' | 'ucs-2' | 'utf16le' | 'utf-16le';

declare class Buffer extends Uint8Array {
  static from(value: string, encoding?: BufferEncoding): Buffer;
  static from(value: ArrayBuffer | ArrayBufferView | readonly number[] | Buffer): Buffer;
  static alloc(size: number, fill?: string | number, encoding?: BufferEncoding): Buffer;
  static allocUnsafe(size: number): Buffer;
  static concat(list: readonly Uint8Array[], total?: number): Buffer;
  static isBuffer(value: unknown): value is Buffer;
  static byteLength(value: string | ArrayBuffer | ArrayBufferView, encoding?: BufferEncoding): number;
  static compare(a: Uint8Array, b: Uint8Array): number;
  static isEncoding(encoding: string): boolean;
  toString(encoding?: BufferEncoding, start?: number, end?: number): string;
  toJSON(): { type: 'Buffer'; data: number[] };
  equals(other: Uint8Array): boolean;
  compare(other: Uint8Array): number;
  write(text: string, offset?: number, length?: number, encoding?: BufferEncoding): number;
  slice(start?: number, end?: number): Buffer;
  subarray(start?: number, end?: number): Buffer;
  copy(target: Uint8Array, targetStart?: number, sourceStart?: number, sourceEnd?: number): number;
  fill(value: string | number | Uint8Array, start?: number, end?: number, encoding?: BufferEncoding): this;
  includes(value: string | number | Uint8Array, start?: number, encoding?: BufferEncoding): boolean;
  indexOf(value: string | number | Uint8Array, start?: number, encoding?: BufferEncoding): number;
  readUInt8(offset?: number): number;
  readUInt16LE(offset?: number): number;
  readUInt16BE(offset?: number): number;
  readUInt32LE(offset?: number): number;
  readUInt32BE(offset?: number): number;
  readInt8(offset?: number): number;
  readInt32LE(offset?: number): number;
  readInt32BE(offset?: number): number;
  writeUInt8(value: number, offset?: number): number;
  writeUInt16LE(value: number, offset?: number): number;
  writeUInt16BE(value: number, offset?: number): number;
  writeUInt32LE(value: number, offset?: number): number;
  writeUInt32BE(value: number, offset?: number): number;
  writeInt8(value: number, offset?: number): number;
  writeInt32LE(value: number, offset?: number): number;
  writeInt32BE(value: number, offset?: number): number;
}

interface NodeModule {
  exports: any;
  require: NodeRequire;
  readonly id: string;
  readonly filename: string;
  readonly loaded: boolean;
  readonly parent: NodeModule | null | undefined;
  readonly children: NodeModule[];
  readonly paths: string[];
}
interface NodeRequire {
  (name: string): any;
  resolve(name: string): string;
  cache: Record<string, NodeModule>;
  main: NodeModule | undefined;
}
declare const require: NodeRequire;
declare const module: NodeModule;
declare const exports: any;
declare const __filename: string;
declare const __dirname: string;
declare const global: typeof globalThis;
interface ImportMeta {
  readonly url: string;
  readonly filename: string;
  readonly dirname: string;
}

declare module 'fs' {
  type Data = string | Uint8Array;
  type Encoding = BufferEncoding | { encoding?: BufferEncoding | null; flag?: string } | null;
  type WriteOptions = BufferEncoding | { encoding?: BufferEncoding | null; flag?: string; mode?: number } | null;
  type Done = (error: Error | null) => void;
  interface Stats {
    isFile(): boolean;
    isDirectory(): boolean;
    isSymbolicLink(): boolean;
    size: number;
    mode: number;
    mtime: Date;
    mtimeMs: number;
    atime: Date;
    ctime: Date;
    birthtime: Date;
  }
  interface Dirent {
    name: string;
    isFile(): boolean;
    isDirectory(): boolean;
    isSymbolicLink(): boolean;
  }
  type MkdirOptions = { recursive?: boolean; mode?: number } | number;
  type RmOptions = { recursive?: boolean; force?: boolean };
  type ReaddirOptions = BufferEncoding | { encoding?: BufferEncoding | null; withFileTypes?: boolean; recursive?: boolean } | null;

  export function readFileSync(path: string, options: BufferEncoding | { encoding: BufferEncoding; flag?: string }): string;
  export function readFileSync(path: string, options?: { encoding?: null; flag?: string } | null): Buffer;
  export function writeFileSync(path: string, data: Data, options?: WriteOptions): void;
  export function appendFileSync(path: string, data: Data, options?: WriteOptions): void;
  export function existsSync(path: string): boolean;
  export function statSync(path: string): Stats;
  export function lstatSync(path: string): Stats;
  export function readdirSync(path: string, options: { withFileTypes: true; recursive?: boolean }): Dirent[];
  export function readdirSync(path: string, options?: ReaddirOptions): string[];
  export function mkdirSync(path: string, options?: MkdirOptions): string | undefined;
  export function rmSync(path: string, options?: RmOptions): void;
  export function rmdirSync(path: string, options?: { recursive?: boolean }): void;
  export function unlinkSync(path: string): void;
  export function renameSync(from: string, to: string): void;
  export function copyFileSync(from: string, to: string, mode?: number): void;

  export function readFile(path: string, options: BufferEncoding | { encoding: BufferEncoding; flag?: string }, done: (error: Error | null, data: string) => void): void;
  export function readFile(path: string, done: (error: Error | null, data: Buffer) => void): void;
  export function writeFile(path: string, data: Data, done: Done): void;
  export function writeFile(path: string, data: Data, options: WriteOptions, done: Done): void;
  export function appendFile(path: string, data: Data, done: Done): void;
  export function appendFile(path: string, data: Data, options: WriteOptions, done: Done): void;
  export function exists(path: string, done: (exists: boolean) => void): void;
  export function stat(path: string, done: (error: Error | null, stats: Stats) => void): void;
  export function lstat(path: string, done: (error: Error | null, stats: Stats) => void): void;
  export function readdir(path: string, done: (error: Error | null, names: string[]) => void): void;
  export function readdir(path: string, options: { withFileTypes: true }, done: (error: Error | null, entries: Dirent[]) => void): void;
  export function readdir(path: string, options: ReaddirOptions, done: (error: Error | null, names: string[]) => void): void;
  export function mkdir(path: string, done: (error: Error | null, made?: string) => void): void;
  export function mkdir(path: string, options: MkdirOptions, done: (error: Error | null, made?: string) => void): void;
  export function rm(path: string, done: Done): void;
  export function rm(path: string, options: RmOptions, done: Done): void;
  export function rmdir(path: string, done: Done): void;
  export function rmdir(path: string, options: { recursive?: boolean }, done: Done): void;
  export function unlink(path: string, done: Done): void;
  export function rename(from: string, to: string, done: Done): void;
  export function copyFile(from: string, to: string, done: Done): void;
  export function copyFile(from: string, to: string, mode: number, done: Done): void;

  export const promises: typeof import('fs/promises');
}
declare module 'node:fs' {
  export * from 'fs';
  const everything: typeof import('fs');
  export default everything;
}

declare module 'fs/promises' {
  import type { Dirent, Stats } from 'fs';
  type Data = string | Uint8Array;
  type WriteOptions = BufferEncoding | { encoding?: BufferEncoding | null; flag?: string; mode?: number } | null;

  export function readFile(path: string, options: BufferEncoding | { encoding: BufferEncoding; flag?: string }): Promise<string>;
  export function readFile(path: string, options?: { encoding?: null; flag?: string } | null): Promise<Buffer>;
  export function writeFile(path: string, data: Data, options?: WriteOptions): Promise<void>;
  export function appendFile(path: string, data: Data, options?: WriteOptions): Promise<void>;
  export function stat(path: string): Promise<Stats>;
  export function lstat(path: string): Promise<Stats>;
  export function readdir(path: string, options: { withFileTypes: true; recursive?: boolean }): Promise<Dirent[]>;
  export function readdir(path: string, options?: BufferEncoding | { encoding?: BufferEncoding | null; recursive?: boolean } | null): Promise<string[]>;
  export function mkdir(path: string, options?: { recursive?: boolean; mode?: number } | number): Promise<string | undefined>;
  export function rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
  export function rmdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  export function unlink(path: string): Promise<void>;
  export function rename(from: string, to: string): Promise<void>;
  export function copyFile(from: string, to: string, mode?: number): Promise<void>;
}
declare module 'node:fs/promises' {
  export * from 'fs/promises';
  const everything: typeof import('fs/promises');
  export default everything;
}

declare module 'path' {
  interface ParsedPath { root: string; dir: string; base: string; ext: string; name: string }
  interface FormatInput { root?: string; dir?: string; base?: string; ext?: string; name?: string }
  interface PathOffered {
    readonly sep: '/';
    readonly delimiter: ':';
    readonly posix: PathOffered;
    join(...parts: string[]): string;
    resolve(...parts: string[]): string;
    relative(from: string, to: string): string;
    dirname(path: string): string;
    basename(path: string, suffix?: string): string;
    extname(path: string): string;
    normalize(path: string): string;
    isAbsolute(path: string): boolean;
    format(path: FormatInput): string;
    parse(path: string): ParsedPath;
    toNamespacedPath(path: string): string;
  }
  const path: PathOffered;
  export = path;
}
declare module 'node:path' {
  import path = require('path');
  export = path;
}

declare module 'events' {
  type Listener = (...values: any[]) => void;
  class EventEmitter {
    on(event: string | symbol, listener: Listener): this;
    once(event: string | symbol, listener: Listener): this;
    off(event: string | symbol, listener: Listener): this;
    addListener(event: string | symbol, listener: Listener): this;
    removeListener(event: string | symbol, listener: Listener): this;
    removeAllListeners(event?: string | symbol): this;
    prependListener(event: string | symbol, listener: Listener): this;
    emit(event: string | symbol, ...values: any[]): boolean;
    listenerCount(event: string | symbol): number;
    listeners(event: string | symbol): Listener[];
    eventNames(): (string | symbol)[];
    setMaxListeners(count: number): this;
    getMaxListeners(): number;
  }
  namespace EventEmitter {
    export import EventEmitter = EventEmitter_;
    export function once(emitter: EventEmitter_, event: string | symbol): Promise<any[]>;
    export let defaultMaxListeners: number;
  }
  import EventEmitter_ = EventEmitter;
  export = EventEmitter;
}
declare module 'node:events' {
  import EventEmitter = require('events');
  export = EventEmitter;
}

declare module 'util' {
  export interface InspectOptions { depth?: number | null; showHidden?: boolean; colors?: boolean; compact?: boolean | number; breakLength?: number; maxArrayLength?: number | null; maxStringLength?: number | null; sorted?: boolean; getters?: boolean }
  export function inspect(value: unknown, options?: InspectOptions): string;
  export function format(...values: unknown[]): string;
  export function promisify(run: (...values: any[]) => void): (...values: any[]) => Promise<any>;
  export function callbackify(run: (...values: any[]) => Promise<unknown>): (...values: any[]) => void;
  export function isDeepStrictEqual(a: unknown, b: unknown): boolean;
  export function inherits(made: Function, parent: Function): void;
  export function deprecate<T extends Function>(run: T, message: string, code?: string): T;
  export const types: {
    isDate(value: unknown): value is Date;
    isMap(value: unknown): value is Map<unknown, unknown>;
    isSet(value: unknown): value is Set<unknown>;
    isPromise(value: unknown): value is Promise<unknown>;
    isRegExp(value: unknown): value is RegExp;
    isTypedArray(value: unknown): boolean;
    isUint8Array(value: unknown): value is Uint8Array;
    isArrayBuffer(value: unknown): value is ArrayBuffer;
    isNativeError(value: unknown): value is Error;
    isGeneratorFunction(value: unknown): boolean;
    isAsyncFunction(value: unknown): boolean;
    isWeakMap(value: unknown): boolean;
    isWeakSet(value: unknown): boolean;
  };
  const encoder: typeof globalThis.TextEncoder;
  const decoder: typeof globalThis.TextDecoder;
  export { encoder as TextEncoder, decoder as TextDecoder };
}
declare module 'node:util' {
  export * from 'util';
}

declare module 'assert' {
  type Message = string | Error;
  type Expected = RegExp | Function | object | string;
  namespace assert {
    class AssertionError extends Error {
      constructor(options: { message?: string | Error; actual?: unknown; expected?: unknown; operator?: string });
      code: 'ERR_ASSERTION';
      generatedMessage: boolean;
      actual: unknown;
      expected: unknown;
      operator: string | undefined;
    }
    function ok(value: unknown, message?: Message): asserts value;
    function equal(actual: unknown, expected: unknown, message?: Message): void;
    function notEqual(actual: unknown, expected: unknown, message?: Message): void;
    function strictEqual<T>(actual: unknown, expected: T, message?: Message): asserts actual is T;
    function notStrictEqual(actual: unknown, expected: unknown, message?: Message): void;
    function deepEqual(actual: unknown, expected: unknown, message?: Message): void;
    function notDeepEqual(actual: unknown, expected: unknown, message?: Message): void;
    function deepStrictEqual<T>(actual: unknown, expected: T, message?: Message): asserts actual is T;
    function notDeepStrictEqual(actual: unknown, expected: unknown, message?: Message): void;
    function throws(run: () => unknown, expected?: Expected, message?: Message): void;
    function doesNotThrow(run: () => unknown, expected?: Expected, message?: Message): void;
    function rejects(run: (() => Promise<unknown>) | Promise<unknown>, expected?: Expected, message?: Message): Promise<void>;
    function fail(message?: Message): never;
    function match(text: string, pattern: RegExp, message?: Message): void;
    const strict: typeof assert;
  }
  function assert(value: unknown, message?: string | Error): asserts value;
  export = assert;
}
declare module 'node:assert' {
  import assert = require('assert');
  export = assert;
}
declare module 'assert/strict' {
  import assert = require('assert');
  export = assert;
}
declare module 'node:assert/strict' {
  import assert = require('assert');
  export = assert;
}

declare module 'os' {
  export const EOL: string;
  export function platform(): string;
  export function type(): string;
  export function arch(): string;
  export function homedir(): string;
  export function tmpdir(): string;
  export function hostname(): string;
  export function cpus(): { model: string; speed: number; times: Record<string, number> }[];
  export function totalmem(): number;
  export function freemem(): number;
  export function uptime(): number;
  export function userInfo(): { username: string; uid: number; gid: number; shell: string | null; homedir: string };
}
declare module 'node:os' {
  export * from 'os';
}

declare module 'timers' {
  const made: { setTimeout: typeof globalThis.setTimeout; setInterval: typeof globalThis.setInterval; setImmediate: typeof globalThis.setImmediate; clearTimeout: typeof globalThis.clearTimeout; clearInterval: typeof globalThis.clearInterval; clearImmediate: typeof globalThis.clearImmediate };
  export = made;
}
declare module 'node:timers' {
  import made = require('timers');
  export = made;
}

declare module 'timers/promises' {
  type Options = { signal?: AbortSignalOffered; ref?: boolean };
  export function setTimeout<T = void>(ms?: number, value?: T, options?: Options): Promise<T>;
  export function setImmediate<T = void>(value?: T, options?: Options): Promise<T>;
  export function setInterval<T = void>(ms?: number, value?: T, options?: Options): AsyncIterableIterator<T>;
}
declare module 'node:timers/promises' {
  export * from 'timers/promises';
}

declare module 'buffer' {
  const made: typeof globalThis.Buffer;
  export { made as Buffer };
  export const constants: { MAX_LENGTH: number; MAX_STRING_LENGTH: number };
}
declare module 'node:buffer' {
  export * from 'buffer';
}

declare module 'url' {
  const urlClass: typeof globalThis.URL;
  const searchClass: typeof globalThis.URLSearchParams;
  export { urlClass as URL, searchClass as URLSearchParams };
  export function fileURLToPath(url: string | URL): string;
  export function pathToFileURL(path: string): URL;
}
declare module 'node:url' {
  export * from 'url';
}
