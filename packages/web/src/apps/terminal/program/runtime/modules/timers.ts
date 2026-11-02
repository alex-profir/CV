// The timer functions (009 FR-012), `timers` and `timers/promises`.
import type { Immediate, Loop, Timer } from '../loop.ts';

const callbackOf = (value: unknown): ((...values: unknown[]) => void) => {
  if (typeof value !== 'function') throw Object.assign(new TypeError(`The "callback" argument must be of type function. Received ${value === null ? 'null' : value === undefined ? 'undefined' : `type ${typeof value}`}`), { code: 'ERR_INVALID_ARG_TYPE' });
  return value as (...values: unknown[]) => void;
};

const abortError = () => Object.assign(new Error('The operation was aborted'), { name: 'AbortError', code: 'ABORT_ERR' });

export function createTimers(loop: Loop) {
  const owned = new WeakMap<object, Timer>();

  class Timeout {
    constructor(timer: Timer) {
      owned.set(this, timer);
    }

    ref(): this {
      owned.get(this)!.refed = true;
      loop.changed();
      return this;
    }

    unref(): this {
      owned.get(this)!.refed = false;
      loop.changed();
      return this;
    }

    hasRef(): boolean {
      return owned.get(this)!.refed;
    }

    refresh(): this {
      loop.refresh(owned.get(this)!);
      return this;
    }

    close(): this {
      loop.removeTimer(owned.get(this)!);
      return this;
    }

    [Symbol.toPrimitive](): number {
      return owned.get(this)!.id;
    }

    [Symbol.dispose](): void {
      this.close();
    }
  }

  const byId = new Map<number, Timeout>();

  function clear(value: unknown): void {
    if (value === null || value === undefined) return;
    const timeout = value instanceof Timeout ? value : byId.get(Number(value));
    if (timeout === undefined) return;
    timeout.close();
    byId.delete(owned.get(timeout)!.id);
  }

  const owner = new WeakMap<object, Immediate>();

  class ImmediateHandle {
    constructor(immediate: Immediate) {
      owner.set(this, immediate);
    }

    ref(): this {
      owner.get(this)!.refed = true;
      loop.changed();
      return this;
    }

    unref(): this {
      owner.get(this)!.refed = false;
      loop.changed();
      return this;
    }

    hasRef(): boolean {
      return owner.get(this)!.refed;
    }

    [Symbol.dispose](): void {
      clearImmediate(this);
    }
  }

  const add = (repeat: boolean) => (callback: unknown, ms?: unknown, ...values: unknown[]) => {
    const run = callbackOf(callback);
    const timer = loop.addTimer(() => run(...values), ms, repeat);
    const timeout = new Timeout(timer);
    byId.set(timer.id, timeout);
    return timeout;
  };

  const setTimeout = add(false);
  const setInterval = add(true);
  const setImmediate = (callback: unknown, ...values: unknown[]) => {
    const run = callbackOf(callback);
    return new ImmediateHandle(loop.addImmediate(() => run(...values)));
  };
  const clearImmediate = (value: unknown) => {
    if (value === null || typeof value !== 'object') return;
    const immediate = owner.get(value);
    if (immediate !== undefined) {
      immediate.active = false;
      loop.changed();
    }
  };

  const timers = { setTimeout, clearTimeout: clear, setInterval, clearInterval: clear, setImmediate, clearImmediate };

  type Options = { signal?: AbortSignal; ref?: boolean };

  const promises = {
    setTimeout: (ms?: unknown, value?: unknown, options: Options = {}) =>
      new Promise((resolve, reject) => {
        if (options.signal?.aborted === true) return reject(abortError());
        const timeout = setTimeout(() => resolve(value), ms);
        if (options.ref === false) timeout.unref();
        options.signal?.addEventListener('abort', () => {
          clear(timeout);
          reject(abortError());
        }, { once: true });
      }),
    setImmediate: (value?: unknown, options: Options = {}) =>
      new Promise((resolve, reject) => {
        if (options.signal?.aborted === true) return reject(abortError());
        const immediate = setImmediate(() => resolve(value));
        options.signal?.addEventListener('abort', () => {
          clearImmediate(immediate);
          reject(abortError());
        }, { once: true });
      }),
    async *setInterval(ms?: unknown, value?: unknown, options: Options = {}) {
      if (options.signal?.aborted) throw abortError();
      let due = 0;
      let wake: (() => void) | null = null;
      const interval = setInterval(() => {
        due += 1;
        wake?.();
      }, ms);
      try {
        for (;;) {
          if (options.signal?.aborted) throw abortError();
          if (due > 0) {
            due -= 1;
            yield value;
          } else {
            await new Promise<void>((resolve) => {
              wake = resolve;
              options.signal?.addEventListener('abort', () => resolve(), { once: true });
            });
            wake = null;
          }
        }
      } finally {
        clear(interval);
      }
    },
  };

  return { timers: { ...timers, promises }, promises };
}
