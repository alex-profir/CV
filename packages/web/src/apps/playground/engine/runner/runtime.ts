// The runtime (research R18, contracts/runner.md What the runtime gives the
// code): the first part of the worker's script, bundled at build time into
// one classic script text. The visitor's code follows it in the same script,
// as `self.__playgroundMain = async () => { … }`, and runs when the page asks.
//
// Before the code runs it takes the port, the nonce and the browser's own
// ways to reach them into this closure, so the code can't forge messages; the
// page checks what it receives anyway (`messages.ts`). It also replaces `console`, `alert`, `prompt` and
// `confirm`; counts pending timers and requests; reports uncaught errors with
// their place in this script; answers the page's heartbeat at once; and
// reports the end when nothing is left to do.
import { LOG_LIMITS } from '../../limits.ts';
import { formatEntry, measure } from './format.ts';
import type { LogEntry } from '../../types.ts';

type Scope = Record<string, any> & {
  addEventListener: (type: string, listener: (event: any) => void) => void;
  postMessage: (message: unknown) => void;
  location: { href: string };
};

const scope = self as unknown as Scope;

// The originals, taken before the code can change them.
const now = performance.now.bind(performance);
const realSetTimeout = scope['setTimeout'].bind(scope) as (handler: () => void, delay?: number) => number;
const realSetInterval = scope['setInterval'].bind(scope) as (handler: () => void, delay?: number) => number;
const realClearTimeout = scope['clearTimeout'].bind(scope) as (id: number) => void;
const realClearInterval = scope['clearInterval'].bind(scope) as (id: number) => void;
const realFetch = typeof scope['fetch'] === 'function' ? (scope['fetch'].bind(scope) as typeof fetch) : null;
const RealChannel = MessageChannel;
const postToFrame = scope.postMessage.bind(scope);
// Called bound, so patching `MessagePort.prototype.postMessage` or the `data`
// getter of `MessageEvent.prototype` never sees the nonce or the port.
const realPost = MessagePort.prototype.postMessage;
const dataOf = Function.prototype.call.bind(Object.getOwnPropertyDescriptor(MessageEvent.prototype, 'data')!.get!) as (event: MessageEvent) => unknown;

// Entries kept between two sends (R18): the latest 1,000; the rest dropped.
const BATCH_LIMIT = LOG_LIMITS.entries;
// A batch goes at once when this long has passed since the last.
const BATCH_MS = 50;
// A loop can't hear back from the page, so what it may send is limited by the
// clock: after each batch the next waits until the page has had time for this
// one, and a port's queue on the page can't grow without end (FR-040, FR-044).
const CHARS_PER_MS = 4_000;
// What an entry counts for at least, for the object that carries it.
const ENTRY_CHARS = 50;

let toPage: ((message: unknown) => void) | null = null;
let nonce = '';
let ended = false;
let started = false;

const send = (message: Record<string, unknown>) => {
  if (toPage !== null && !ended) toPage({ ...message, nonce });
};

// ---- Tasks: the private channel's messages run after the microtasks -----

const tasks = new RealChannel();
const postTask = realPost.bind(tasks.port2) as (message: unknown) => void;
let taskQueued = false;
let flushWanted = false;
let pendingChanged = false;
let endCheckWanted = false;

function queueTask(): void {
  if (taskQueued) return;
  taskQueued = true;
  postTask(0);
}

tasks.port1.onmessage = () => {
  taskQueued = false;
  if (flushWanted) flushWhenDue();
  if (pendingChanged) sendPending();
  if (endCheckWanted) checkEnd();
};

// ---- Logs ---------------------------------------------------------------

let buffer: LogEntry[] = [];
let sizes: number[] = [];
let bufferChars = 0;
let dropped = 0;
let cleared = false;
let nextSend = -Infinity;
let flushTimer: number | null = null;
let entryIds = 0;

function flush(): void {
  flushWanted = false;
  if (flushTimer !== null) realClearTimeout(flushTimer);
  flushTimer = null;
  if (buffer.length === 0 && dropped === 0 && !cleared) return;
  send({ logs: true, entries: buffer, dropped, cleared });
  nextSend = now() + Math.max(BATCH_MS, bufferChars / CHARS_PER_MS);
  buffer = [];
  sizes = [];
  bufferChars = 0;
  dropped = 0;
  cleared = false;
}

// From a task: at once if it is due, else when it is. The timer isn't the
// code's, so it doesn't keep the run going; the end sends what's left.
function flushWhenDue(): void {
  flushWanted = false;
  const wait = nextSend - now();
  if (wait <= 0) flush();
  else flushTimer ??= realSetTimeout(() => {
    flushTimer = null;
    flush();
  }, wait);
}

function push(entry: Omit<LogEntry, 'id'>): void {
  if (ended) return;
  entryIds += 1;
  const chars = Math.max(ENTRY_CHARS, measure(entry.values));
  buffer.push({ id: entryIds, ...entry });
  sizes.push(chars);
  bufferChars += chars;
  if (buffer.length > BATCH_LIMIT) {
    buffer.shift();
    bufferChars -= sizes.shift()!;
    dropped += 1;
  }
  if (now() >= nextSend) flush();
  else {
    flushWanted = true;
    queueTask();
  }
}

function log(level: LogEntry['level'], values: readonly unknown[]): void {
  const { values: shown, cut } = formatEntry(values);
  push({ level, values: shown, ...(cut ? { cut: true as const } : {}) });
}

const LEVELS = ['log', 'info', 'warn', 'error', 'debug'] as const;

const playgroundConsole: Record<string, (...values: unknown[]) => void> = {};
for (const name of Object.keys(console)) {
  if (typeof (console as unknown as Record<string, unknown>)[name] === 'function') playgroundConsole[name] = (...values) => log('log', values);
}
for (const level of LEVELS) playgroundConsole[level] = (...values) => log(level, values);
// The methods that print something other than their arguments, as browsers'
// consoles do (FR-034).
const labelOf = (label: unknown): string => {
  try {
    return label === undefined ? 'default' : String(label);
  } catch {
    return 'default';
  }
};
const counts = new Map<string, number>();
const timing = new Map<string, number>();
const elapsedText = (label: string, from: number) => `${label}: ${(now() - from).toFixed(3)} ms`;

playgroundConsole['assert'] = (condition, ...values) => {
  if (!condition) log('error', values.length > 0 ? values : [condition]);
};
playgroundConsole['count'] = (label) => {
  const name = labelOf(label);
  const n = (counts.get(name) ?? 0) + 1;
  counts.set(name, n);
  log('log', [`${name}: ${n}`]);
};
playgroundConsole['countReset'] = (label) => void counts.delete(labelOf(label));
playgroundConsole['time'] = (label) => {
  const name = labelOf(label);
  if (!timing.has(name)) timing.set(name, now());
};
playgroundConsole['timeLog'] = (label, ...values) => {
  const name = labelOf(label);
  const from = timing.get(name);
  if (from !== undefined) log('log', [elapsedText(name, from), ...values]);
};
playgroundConsole['timeEnd'] = (label) => {
  const name = labelOf(label);
  const from = timing.get(name);
  if (from === undefined) return;
  timing.delete(name);
  log('log', [elapsedText(name, from)]);
};
playgroundConsole['clear'] = () => {
  buffer = [];
  sizes = [];
  bufferChars = 0;
  dropped = 0;
  cleared = true;
  flushWanted = true;
  queueTask();
};

function define(name: string, value: unknown): void {
  Object.defineProperty(scope, name, { value, writable: true, configurable: true, enumerable: false });
}

define('console', playgroundConsole);
define('alert', (...values: unknown[]) => void log('alert', values.slice(0, 1)));
define('prompt', () => {
  push({ level: 'note', values: [], note: { key: 'prompt' } });
  return null;
});
define('confirm', () => {
  push({ level: 'note', values: [], note: { key: 'confirm' } });
  return false;
});

// A nested worker's loop couldn't be watched for the stuck popup (R18).
for (const name of ['Worker', 'SharedWorker']) {
  try {
    delete scope[name];
  } catch {
    // Not configurable: shadowed below.
  }
  if (scope[name] !== undefined) define(name, undefined);
}

// ---- Uncaught errors (FR-035) --------------------------------------------

let uncaught = 0;

// The lines of this script before the code, which the page gives with `run`.
let preludeLines = 0;

// Where an error was thrown in the code, from its stack: the first frame past
// the prelude, since this script's wrappers are on the stack of what they throw.
function position(error: unknown, line?: number, column?: number): { line: number; column: number } | null {
  const stack = error !== null && typeof error === 'object' && typeof (error as { stack?: unknown }).stack === 'string' ? (error as { stack: string }).stack : '';
  for (const match of stack.matchAll(/(blob:[^\s()]+?):(\d+):(\d+)/g)) {
    if (match[1] === scope.location.href && Number(match[2]) > preludeLines) return { line: Number(match[2]), column: Number(match[3]) };
  }
  return line !== undefined && line > 0 ? { line, column: column ?? 1 } : null;
}

function reportUncaught(error: unknown, line?: number, column?: number): void {
  if (ended) return;
  uncaught += 1;
  const { values, cut } = formatEntry([error]);
  flush();
  send({ uncaught: true, entry: { id: (entryIds += 1), level: 'error', values, ...(cut ? { cut: true } : {}) }, at: position(error, line, column) });
  endCheckWanted = true;
  queueTask();
}

scope.addEventListener('error', (event) => {
  event.preventDefault();
  reportUncaught(event.error ?? event.message, event.lineno, event.colno);
});

scope.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  reportUncaught(event.reason);
});

// ---- Pending work (FR-036, FR-037, FR-041) -------------------------------

const timers = new Map<number, 'timeout' | 'interval'>();
let requests = 0;

function sendPending(): void {
  pendingChanged = false;
  send({ pending: true, timers: timers.size, requests });
}

function changed(): void {
  pendingChanged = true;
  endCheckWanted = true;
  queueTask();
}

// A callback of the code's: an error in it is reported and the run goes on.
function call(handler: Function, args: unknown[]): void {
  try {
    handler(...args);
  } catch (error) {
    reportUncaught(error);
  } finally {
    endCheckWanted = true;
    queueTask();
  }
}

define('setTimeout', (handler: unknown, delay?: number, ...args: unknown[]) => {
  if (typeof handler !== 'function') return 0;
  const id: number = realSetTimeout(() => {
    timers.delete(id);
    changed();
    call(handler, args);
  }, delay);
  timers.set(id, 'timeout');
  changed();
  return id;
});

define('setInterval', (handler: unknown, delay?: number, ...args: unknown[]) => {
  if (typeof handler !== 'function') return 0;
  const id = realSetInterval(() => call(handler, args), delay);
  timers.set(id, 'interval');
  changed();
  return id;
});

const clear = (id: unknown) => {
  const kind = typeof id === 'number' ? timers.get(id) : undefined;
  if (kind === undefined) return;
  timers.delete(id as number);
  (kind === 'timeout' ? realClearTimeout : realClearInterval)(id as number);
  changed();
};

define('clearTimeout', clear);
define('clearInterval', clear);

// A frame of a worker's: its own timer where the worker has no frames.
const realFrame = typeof scope['requestAnimationFrame'] === 'function' ? (scope['requestAnimationFrame'].bind(scope) as (callback: (time: number) => void) => number) : null;
const realCancelFrame = typeof scope['cancelAnimationFrame'] === 'function' ? (scope['cancelAnimationFrame'].bind(scope) as (id: number) => void) : null;
const frames = new Map<number, number>();
let frameIds = 0;

define('requestAnimationFrame', (callback: unknown) => {
  if (typeof callback !== 'function') return 0;
  frameIds += 1;
  const id = frameIds;
  const fire = (time: number) => {
    frames.delete(id);
    timers.delete(-id);
    changed();
    call(callback, [time]);
  };
  frames.set(id, realFrame !== null ? realFrame(fire) : realSetTimeout(() => fire(now()), 16));
  timers.set(-id, 'timeout');
  changed();
  return id;
});

define('cancelAnimationFrame', (id: unknown) => {
  if (typeof id !== 'number' || !frames.has(id)) return;
  const real = frames.get(id)!;
  frames.delete(id);
  timers.delete(-id);
  if (realFrame !== null && realCancelFrame !== null) realCancelFrame(real);
  else realClearTimeout(real);
  changed();
});

// A request is pending from its start until it settles; a body being read
// counts as one too (`countCalls` below), so `await (await fetch(…)).json()`
// keeps the run going.
function counting<T>(promise: Promise<T>): Promise<T> {
  requests += 1;
  changed();
  const done = () => {
    requests -= 1;
    changed();
  };
  promise.then(done, done);
  return promise;
}

// No request of the code's sends cookies or other credentials, whatever it
// asks (FR-041): Firefox and WebKit would otherwise send the site's own to
// another port on its host. The wrappers replace the originals where the
// code could reach them, on the scope and its prototypes, and can't be
// deleted to show them again.
if (realFetch !== null) {
  const omitting = (input: RequestInfo | URL, init?: RequestInit) => counting(realFetch(input, { ...init, credentials: 'omit' }));
  for (let holder: object | null = scope; holder !== null; holder = Object.getPrototypeOf(holder)) {
    if (holder === scope || Object.hasOwn(holder, 'fetch')) Object.defineProperty(holder, 'fetch', { value: omitting, writable: true, configurable: false, enumerable: false });
  }
}

// The browser's own promises settle in a later task, so each is pending work
// too, or the run would end before they do (FR-037). Only a promise of the
// code's own that never settles ends a run with nothing pending.
function countCalls(holder: Record<string, unknown> | undefined, names: readonly string[]): void {
  if (holder === undefined) return;
  for (const name of names) {
    const call = holder[name];
    if (typeof call !== 'function') continue;
    Object.defineProperty(holder, name, {
      value(this: unknown, ...args: unknown[]) {
        return counting(Promise.resolve(call.apply(this, args)));
      },
      writable: true,
      configurable: true,
    });
  }
}

const prototypeOf = (name: string) => (typeof scope[name] === 'function' ? (scope[name].prototype as Record<string, unknown>) : undefined);
const BODY_READS = ['arrayBuffer', 'blob', 'bytes', 'formData', 'json', 'text'];

// A stream's reads settle in a later task as well, and so do delayed tasks and
// the like. A read of a stream that never ends keeps the run going until Stop,
// as a request that never answers does.
countCalls(prototypeOf('ReadableStreamDefaultReader'), ['read']);
countCalls(prototypeOf('ReadableStreamBYOBReader'), ['read']);
countCalls(prototypeOf('ReadableStream'), ['pipeTo']);
countCalls(prototypeOf('WritableStreamDefaultWriter'), ['close', 'write']);
countCalls(prototypeOf('Scheduler'), ['postTask', 'yield']);
countCalls(prototypeOf('LockManager'), ['query', 'request']);
countCalls(prototypeOf('StorageManager'), ['estimate', 'getDirectory', 'persist', 'persisted']);
countCalls(prototypeOf('Permissions'), ['query']);

// `for await` on a stream doesn't go through a reader's `read`.
function countIterator(holder: Record<PropertyKey, unknown> | undefined, key: PropertyKey): void {
  const open = holder?.[key];
  if (holder === undefined || typeof open !== 'function') return;
  Object.defineProperty(holder, key, {
    value(this: unknown, ...args: unknown[]) {
      const iterator = open.apply(this, args) as AsyncIterator<unknown>;
      return {
        next: () => counting(iterator.next()),
        return: (value?: unknown) => counting(iterator.return?.(value) ?? Promise.resolve({ done: true, value })),
        [Symbol.asyncIterator]() {
          return this;
        },
      };
    },
    writable: true,
    configurable: true,
  });
}
countIterator(prototypeOf('ReadableStream'), Symbol.asyncIterator);
countIterator(prototypeOf('ReadableStream'), 'values');

// A timer the browser holds, counted once the code listens for it: a signal
// only passed to `fetch`, as `AbortSignal.timeout` usually is, doesn't hold a
// run open after its request is done.
if (typeof scope['AbortSignal']?.timeout === 'function') {
  const realTimeout = scope['AbortSignal'].timeout.bind(scope['AbortSignal']) as (ms: number) => AbortSignal;
  const realListen = EventTarget.prototype.addEventListener;
  const handler = Object.getOwnPropertyDescriptor(AbortSignal.prototype, 'onabort');
  Object.defineProperty(scope['AbortSignal'], 'timeout', {
    value(ms: number) {
      const signal = realTimeout(ms);
      let counted = false;
      const count = () => {
        if (counted || signal.aborted) return;
        counted = true;
        frameIds += 1;
        const id = -frameIds;
        timers.set(id, 'timeout');
        changed();
        realListen.call(signal, 'abort', () => {
          timers.delete(id);
          changed();
        });
      };
      Object.defineProperty(signal, 'addEventListener', {
        value(this: AbortSignal, type: string, ...rest: [EventListenerOrEventListenerObject | null, (boolean | AddEventListenerOptions)?]) {
          if (type === 'abort') count();
          return realListen.call(this, type, ...rest);
        },
        writable: true,
        configurable: true,
      });
      if (handler?.get !== undefined && handler.set !== undefined) {
        const { get, set } = handler;
        Object.defineProperty(signal, 'onabort', {
          get() {
            return get.call(signal);
          },
          set(value: unknown) {
            count();
            set.call(signal, value);
          },
          configurable: true,
        });
      }
      return signal;
    },
    writable: true,
    configurable: true,
  });
}

// A message to one of the code's own ports is pending until it has arrived. A
// port with a handler isn't pending by itself (a test sets this): nothing says
// a message will ever come, and the run would never end.
const MESSAGE_MS = 10;
Object.defineProperty(MessagePort.prototype, 'postMessage', {
  value(this: MessagePort, ...args: unknown[]) {
    (realPost as (...values: unknown[]) => void).apply(this, args);
    requests += 1;
    changed();
    realSetTimeout(() => {
      requests -= 1;
      changed();
    }, MESSAGE_MS);
  },
  writable: true,
  configurable: true,
});

countCalls(prototypeOf('Response'), BODY_READS);
countCalls(prototypeOf('Request'), BODY_READS);
countCalls(prototypeOf('Blob'), BODY_READS);
countCalls(prototypeOf('SubtleCrypto'), ['decrypt', 'deriveBits', 'deriveKey', 'digest', 'encrypt', 'exportKey', 'generateKey', 'importKey', 'sign', 'unwrapKey', 'verify', 'wrapKey']);
countCalls(prototypeOf('CacheStorage'), ['delete', 'has', 'keys', 'match', 'open']);
countCalls(prototypeOf('Cache'), ['add', 'addAll', 'delete', 'keys', 'match', 'matchAll', 'put']);
countCalls(prototypeOf('IDBFactory'), ['databases']);
countCalls(scope['WebAssembly'] as Record<string, unknown> | undefined, ['compile', 'compileStreaming', 'instantiate', 'instantiateStreaming']);
countCalls(scope, ['createImageBitmap']);

if (typeof scope['XMLHttpRequest'] === 'function') {
  const Real = scope['XMLHttpRequest'] as typeof XMLHttpRequest;
  // On the original's prototype, so a subclass or the original can't set it.
  Object.defineProperty(Real.prototype, 'withCredentials', { get: () => false, set: () => undefined, configurable: false });
  define(
    'XMLHttpRequest',
    class extends Real {
      override send(body?: Document | XMLHttpRequestBodyInit | null): void {
        let pending = true;
        const done = () => {
          if (!pending) return;
          pending = false;
          requests -= 1;
          changed();
        };
        requests += 1;
        changed();
        this.addEventListener('loadend', done, { once: true });
        try {
          super.send(body);
        } catch (error) {
          // `send` that throws never ends with `loadend`.
          done();
          throw error;
        }
      }
    },
  );
}

if (typeof scope['WebSocket'] === 'function') {
  const Real = scope['WebSocket'] as typeof WebSocket;
  define(
    'WebSocket',
    class extends Real {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        requests += 1;
        changed();
        this.addEventListener(
          'close',
          () => {
            requests -= 1;
            changed();
          },
          { once: true },
        );
      }
    },
  );
}

if (typeof scope['EventSource'] === 'function') {
  const Real = scope['EventSource'] as typeof EventSource;
  const realClose = Real.prototype.close;
  const open = new WeakSet<EventSource>();
  const closed = (source: EventSource) => {
    if (!open.delete(source)) return;
    requests -= 1;
    changed();
  };
  // Not a subclass: `Object.getPrototypeOf` on one would give the code the
  // original, which takes `withCredentials`.
  const Wrapped = function EventSource(this: unknown, url: string | URL) {
    const source = Reflect.construct(Real, [url], Wrapped) as EventSource;
    open.add(source);
    requests += 1;
    changed();
    source.addEventListener('error', () => {
      if (source.readyState === Real.CLOSED) closed(source);
    });
    return source;
  } as unknown as typeof EventSource;
  Object.defineProperty(Wrapped, 'prototype', { value: Real.prototype });
  for (const name of ['CONNECTING', 'OPEN', 'CLOSED'] as const) Object.defineProperty(Wrapped, name, { value: Real[name] });
  Object.defineProperty(Real.prototype, 'constructor', { value: Wrapped, writable: true, configurable: true });
  Object.defineProperty(Real.prototype, 'close', {
    value(this: EventSource) {
      realClose.call(this);
      closed(this);
    },
    writable: true,
    configurable: true,
  });
  define('EventSource', Wrapped);
}

// ---- The end (R18) -------------------------------------------------------

// Run as a task, after the microtasks: with nothing pending, the run has
// nothing left to do, even if a promise it awaits never settles.
function checkEnd(): void {
  endCheckWanted = false;
  if (!started || ended || timers.size > 0 || requests > 0) return;
  flush();
  send({ end: true, uncaught });
  ended = true;
}

// The code closing its own worker would read as a blocked run, with nobody to
// answer the heartbeat (FR-045, FR-048): the run ends here and says why. On
// every holder, as `fetch` is, so the original stays out of reach.
const realClose = (scope['close'] as () => void).bind(scope);
const closeWorker = () => {
  if (!ended) {
    push({ level: 'note', values: [], note: { key: 'closed' } });
    flush();
    send({ end: true, uncaught });
    ended = true;
  }
  realClose();
};
for (let holder: object | null = scope; holder !== null; holder = Object.getPrototypeOf(holder)) {
  if (holder === scope || Object.hasOwn(holder, 'close')) Object.defineProperty(holder, 'close', { value: closeWorker, writable: true, configurable: false, enumerable: false });
}

// ---- The page ------------------------------------------------------------

type FromPage = { nonce?: unknown; ping?: number; run?: boolean; cv?: unknown; prelude?: unknown };

function onPage(event: MessageEvent<FromPage>): void {
  const data = dataOf(event) as FromPage | null;
  if (data === null || typeof data !== 'object' || data.nonce !== nonce) return;
  if (typeof data.ping === 'number') {
    toPage?.({ pong: true, n: data.ping, nonce });
    return;
  }
  if (data.run === true && !started) {
    started = true;
    if (typeof data.prelude === 'number') preludeLines = data.prelude;
    define('cv', data.cv);
    send({ started: true });
    const main = scope['__playgroundMain'] as (() => Promise<unknown>) | undefined;
    delete scope['__playgroundMain'];
    if (typeof main === 'function') main().catch((error: unknown) => reportUncaught(error));
    endCheckWanted = true;
    queueTask();
  }
}

// The bootstrap's first message gives the port and the nonce; the frame is
// told the worker started, so it can revoke the script's URL (R17).
function onFirst(event: MessageEvent<{ port?: unknown; nonce?: unknown }>): void {
  if (toPage !== null) return;
  const data = event.data;
  if (data === null || typeof data !== 'object' || !(data.port instanceof MessagePort) || typeof data.nonce !== 'string') return;
  toPage = realPost.bind(data.port) as (message: unknown) => void;
  nonce = data.nonce;
  scope['removeEventListener']('message', onFirst);
  data.port.onmessage = onPage;
  postToFrame('started');
}

scope.addEventListener('message', onFirst);
