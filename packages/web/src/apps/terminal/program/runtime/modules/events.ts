// `events` (009 contracts/node-api.md): `EventEmitter`, as Node's behaves.
import { inspect } from 'node-inspect-extracted';
import { coded, invalidArgument } from '../coded.ts';

type Listener = ((...values: any[]) => unknown) & { listener?: (...values: any[]) => unknown };

const checkListener = (listener: unknown) => {
  if (typeof listener !== 'function') throw invalidArgument('listener', 'of type function', listener);
};

export class EventEmitter {
  static defaultMaxListeners = 10;
  static EventEmitter: typeof EventEmitter;
  static once: typeof once;
  declare private _events: Map<string | symbol, Listener[]>;
  declare private _maxListeners: number | undefined;

  private store(): Map<string | symbol, Listener[]> {
    if (!Object.hasOwn(this, '_events')) Object.defineProperty(this, '_events', { value: new Map(), enumerable: false, writable: true });
    return this._events;
  }

  private add(name: string | symbol, listener: Listener, first: boolean): this {
    checkListener(listener);
    const events = this.store();
    if (events.has('newListener')) this.emit('newListener', name, listener.listener ?? listener);
    const list = events.get(name) ?? [];
    if (first) list.unshift(listener);
    else list.push(listener);
    events.set(name, list);
    return this;
  }

  on(name: string | symbol, listener: Listener): this {
    return this.add(name, listener, false);
  }

  addListener(name: string | symbol, listener: Listener): this {
    return this.add(name, listener, false);
  }

  prependListener(name: string | symbol, listener: Listener): this {
    return this.add(name, listener, true);
  }

  private wrapped(name: string | symbol, listener: Listener): Listener {
    checkListener(listener);
    const once: Listener = (...values: unknown[]) => {
      this.removeListener(name, once);
      return listener.apply(this, values);
    };
    once.listener = listener;
    return once;
  }

  once(name: string | symbol, listener: Listener): this {
    return this.add(name, this.wrapped(name, listener), false);
  }

  prependOnceListener(name: string | symbol, listener: Listener): this {
    return this.add(name, this.wrapped(name, listener), true);
  }

  off(name: string | symbol, listener: Listener): this {
    return this.removeListener(name, listener);
  }

  removeListener(name: string | symbol, listener: Listener): this {
    checkListener(listener);
    const events = this.store();
    const list = events.get(name);
    if (list === undefined) return this;
    for (let at = list.length - 1; at >= 0; at -= 1) {
      if (list[at] === listener || list[at]!.listener === listener) {
        const removed = list[at]!;
        const next = list.toSpliced(at, 1);
        if (next.length === 0) events.delete(name);
        else events.set(name, next);
        if (events.has('removeListener')) this.emit('removeListener', name, removed.listener ?? removed);
        break;
      }
    }
    return this;
  }

  removeAllListeners(name?: string | symbol): this {
    const events = this.store();
    const names = name === undefined ? [...events.keys()] : [name];
    for (const each of names) for (const listener of [...(events.get(each) ?? [])]) this.removeListener(each, listener);
    return this;
  }

  emit(name: string | symbol, ...values: unknown[]): boolean {
    const list = this.store().get(name);
    if (list === undefined || list.length === 0) {
      if (name !== 'error') return false;
      const [error] = values;
      if (error instanceof Error) throw error;
      throw Object.assign(coded(new Error(`Unhandled error. (${inspect(error)})`), 'ERR_UNHANDLED_ERROR'), { context: error });
    }
    for (const listener of list) listener.apply(this, values);
    return true;
  }

  listenerCount(name: string | symbol, listener?: Listener): number {
    const list = this.store().get(name) ?? [];
    return listener === undefined ? list.length : list.filter((each) => each === listener || each.listener === listener).length;
  }

  listeners(name: string | symbol): Listener[] {
    return (this.store().get(name) ?? []).map((each) => each.listener ?? each);
  }

  rawListeners(name: string | symbol): Listener[] {
    return [...(this.store().get(name) ?? [])];
  }

  eventNames(): (string | symbol)[] {
    return [...this.store().keys()];
  }

  setMaxListeners(count: number): this {
    Object.defineProperty(this, '_maxListeners', { value: count, enumerable: false, writable: true, configurable: true });
    return this;
  }

  getMaxListeners(): number {
    return this._maxListeners ?? EventEmitter.defaultMaxListeners;
  }
}

export function once(emitter: EventEmitter, name: string | symbol): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const done = (...values: unknown[]) => {
      if (name !== 'error') emitter.removeListener('error', failed);
      resolve(values);
    };
    const failed = (error: unknown) => {
      emitter.removeListener(name, done);
      reject(error);
    };
    emitter.once(name, done);
    if (name !== 'error') emitter.once('error', failed);
  });
}

EventEmitter.EventEmitter = EventEmitter;
EventEmitter.once = once;
