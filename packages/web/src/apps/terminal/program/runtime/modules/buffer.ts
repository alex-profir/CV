// `buffer` (009 FR-012, research R11), on the `buffer` package: the trailing
// slash names the package, not a built-in of that name. It has no `base64url`, and its
// errors have no codes, so they are added here: its words stay (Known differences).
import { Buffer, kMaxLength, SlowBuffer, INSPECT_MAX_BYTES } from 'buffer/';
import { coded } from '../coded.ts';

const URL_SAFE = /^base64url$/i;
const plain = (encoding: unknown) => (typeof encoding === 'string' && URL_SAFE.test(encoding) ? 'base64' : encoding);
const urlSafe = (text: string) => text.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// The code Node gives what the package throws.
function withCode(error: unknown): unknown {
  if (!(error instanceof Error) || 'code' in error) return error;
  if (error instanceof RangeError) return coded(error, 'ERR_OUT_OF_RANGE');
  if (error instanceof TypeError) return coded(error, error.message.startsWith('Unknown encoding') ? 'ERR_UNKNOWN_ENCODING' : 'ERR_INVALID_ARG_TYPE');
  return error;
}

type Method = (this: unknown, ...values: unknown[]) => unknown;

function wrapAll(holder: Record<string, unknown>, names: readonly string[]): void {
  for (const name of names) {
    const original = holder[name];
    if (typeof original !== 'function' || name === 'constructor') continue;
    Object.defineProperty(holder, name, {
      value(this: unknown, ...values: unknown[]) {
        try {
          return (original as Method).apply(this, values);
        } catch (error) {
          throw withCode(error);
        }
      },
      writable: true,
      enumerable: false,
      configurable: true,
    });
  }
}

const made = Buffer as unknown as Record<string, Method> & { prototype: Record<string, Method> };
const { from, byteLength, isEncoding } = made;
const toString = made.prototype['toString'] as unknown as Method;
const write = made.prototype['write'] as unknown as Method;
made['from'] = function (value, encoding, ...rest) {
  return from!.apply(this, [value, plain(encoding), ...rest]);
};
made['byteLength'] = function (value, encoding) {
  return byteLength!.call(this, value, plain(encoding));
};
made['isEncoding'] = function (encoding) {
  return isEncoding!.call(this, plain(encoding));
};
made.prototype['toString'] = function (encoding, ...rest) {
  const text = toString.apply(this, [plain(encoding), ...rest]) as string;
  return plain(encoding) !== encoding ? urlSafe(text) : text;
};
made.prototype['write'] = function (...values) {
  return write.apply(this, values.map(plain));
};
made.prototype['toLocaleString'] = made.prototype['toString']!;

wrapAll(made, Object.getOwnPropertyNames(made).filter((name) => !['length', 'name', 'prototype', 'poolSize'].includes(name)));
wrapAll(made.prototype, Object.getOwnPropertyNames(made.prototype));

export const bufferModule = { Buffer, SlowBuffer, kMaxLength, INSPECT_MAX_BYTES, constants: { MAX_LENGTH: kMaxLength, MAX_STRING_LENGTH: 536_870_888 } };

export { Buffer };
