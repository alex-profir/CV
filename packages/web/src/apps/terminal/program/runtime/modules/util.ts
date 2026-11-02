// `util` (009 contracts/node-api.md, research R11): `inspect` and `format` from
// `node-inspect-extracted`, which has no `types`, so those are written here.
import { format, formatWithOptions, inspect } from 'node-inspect-extracted';
import { isDeepEqual } from './deep.ts';

const CUSTOM = Symbol.for('nodejs.util.promisify.custom');

type Callback = (error: unknown, ...values: unknown[]) => void;
const invalid = (name: string, kind: string, value: unknown) => Object.assign(new TypeError(`The "${name}" argument must be of type ${kind}. Received ${value === null ? 'null' : value === undefined ? 'undefined' : `type ${typeof value}`}`), { code: 'ERR_INVALID_ARG_TYPE' });

function promisify(original: (...values: any[]) => unknown): (...values: unknown[]) => Promise<unknown> {
  if (typeof original !== 'function') throw invalid('original', 'function', original);
  const custom = (original as unknown as Record<symbol, unknown>)[CUSTOM];
  if (typeof custom === 'function') return custom as (...values: unknown[]) => Promise<unknown>;
  const promised = function (this: unknown, ...values: unknown[]) {
    return new Promise((resolve, reject) => {
      original.call(this, ...values, ((error, value) => (error ? reject(error) : resolve(value))) as Callback);
    });
  };
  Object.setPrototypeOf(promised, Object.getPrototypeOf(original));
  return Object.defineProperties(promised, Object.getOwnPropertyDescriptors(original)) as (...values: unknown[]) => Promise<unknown>;
}
promisify.custom = CUSTOM;

const tag = (value: unknown) => Object.prototype.toString.call(value).slice(8, -1);

const types = {
  isDate: (value: unknown) => value instanceof Date,
  isRegExp: (value: unknown) => value instanceof RegExp,
  isMap: (value: unknown) => value instanceof Map,
  isSet: (value: unknown) => value instanceof Set,
  isWeakMap: (value: unknown) => value instanceof WeakMap,
  isWeakSet: (value: unknown) => value instanceof WeakSet,
  isPromise: (value: unknown) => value instanceof Promise,
  isNativeError: (value: unknown) => value instanceof Error,
  isTypedArray: (value: unknown) => ArrayBuffer.isView(value) && !(value instanceof DataView),
  isUint8Array: (value: unknown) => value instanceof Uint8Array,
  isArrayBuffer: (value: unknown) => value instanceof ArrayBuffer,
  isAnyArrayBuffer: (value: unknown) => value instanceof ArrayBuffer || tag(value) === 'SharedArrayBuffer',
  isDataView: (value: unknown) => value instanceof DataView,
  isAsyncFunction: (value: unknown) => tag(value) === 'AsyncFunction',
  isGeneratorFunction: (value: unknown) => tag(value) === 'GeneratorFunction' || tag(value) === 'AsyncGeneratorFunction',
  isGeneratorObject: (value: unknown) => tag(value) === 'Generator',
  isBoxedPrimitive: (value: unknown) => value instanceof Number || value instanceof String || value instanceof Boolean || value instanceof BigInt || value instanceof Symbol,
  isSymbolObject: (value: unknown) => value instanceof Symbol,
};

export function createUtil(deps: { nextTick: (run: () => void) => void; warn: (message: string, code?: string) => void }) {
  return {
    inspect,
    format,
    formatWithOptions,
    promisify,
    callbackify(original: (...values: unknown[]) => Promise<unknown>) {
      if (typeof original !== 'function') throw invalid('original', 'function', original);
      return function (this: unknown, ...values: unknown[]) {
        const done = values.pop();
        if (typeof done !== 'function') throw invalid('last argument', 'function', done);
        original.apply(this, values).then(
          (value) => deps.nextTick(() => done(null, value)),
          (reason: unknown) => deps.nextTick(() => done(reason === null || reason === undefined || reason === false ? Object.assign(new Error('Promise was rejected with a falsy value'), { reason, code: 'ERR_FALSY_VALUE_REJECTION' }) : reason)),
        );
      };
    },
    isDeepStrictEqual: (a: unknown, b: unknown) => isDeepEqual(a, b, true),
    inherits(child: any, parent: any) {
      if (typeof child !== 'function') throw invalid('ctor', 'function', child);
      if (typeof parent !== 'function') throw invalid('superCtor', 'function', parent);
      Object.defineProperty(child, 'super_', { value: parent, writable: true, configurable: true });
      Object.setPrototypeOf(child.prototype, parent.prototype);
    },
    deprecate(run: (...values: unknown[]) => unknown, message: string, code?: string) {
      let warned = false;
      return function (this: unknown, ...values: unknown[]) {
        if (!warned) {
          warned = true;
          deps.warn(message, code);
        }
        return run.apply(this, values);
      };
    },
    types,
    TextEncoder,
    TextDecoder,
  };
}
