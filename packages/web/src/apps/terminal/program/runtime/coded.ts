// The runtime's own coded errors, as Node makes them (009 FR-011, FR-013, SC-006):
// `TypeError [CODE]: words` at the head of the stack and from `toString`, while `name`
// stays `TypeError`. An `ENOENT` or a `MODULE_NOT_FOUND` isn't one of these: Node
// prints those without brackets.
import { inspect } from 'node-inspect-extracted';

const marked = new WeakSet<object>();

// What heads the error's stack.
export function headerLine(error: Error): string {
  if (!marked.has(error)) return Error.prototype.toString.call(error);
  return `${error.name} [${(error as Error & { code: string }).code}]: ${error.message}`;
}

export function coded<T extends Error>(error: T, code: string): T {
  marked.add(error);
  Object.assign(error, { code });
  Object.defineProperty(error, 'toString', { value: () => headerLine(error), writable: true, configurable: true, enumerable: false });
  return error;
}

// The value, in the words that end Node's argument errors.
export function received(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === 'function') return `function ${value.name}`;
  if (typeof value === 'object') return value.constructor?.name ? `an instance of ${value.constructor.name}` : inspect(value, { depth: -1 });
  if (typeof value === 'string') return `type string (${inspect(value.length > 28 ? `${value.slice(0, 25)}...` : value, { colors: false })})`;
  const shown = inspect(value, { colors: false });
  return `type ${typeof value} (${shown.length > 28 ? `${shown.slice(0, 25)}...` : shown})`;
}

export const invalidArgument = (name: string, kind: string, value: unknown) => coded(new TypeError(`The "${name}" argument must be ${kind}. Received ${received(value)}`), 'ERR_INVALID_ARG_TYPE');
