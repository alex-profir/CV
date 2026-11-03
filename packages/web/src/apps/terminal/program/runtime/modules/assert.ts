// `assert` and `assert/strict` (009 contracts/node-api.md). Its messages hold for
// the common forms; a deep difference's lines are simpler than Node's (Known
// differences).
import { inspect } from 'node-inspect-extracted';
import { coded, invalidArgument } from '../coded.ts';
import { isDeepEqual } from './deep.ts';

type Options = { message?: string | Error; actual?: unknown; expected?: unknown; operator?: string };

const OWN_WORDS = Symbol('own words');

const show = (value: unknown) => inspect(value, { depth: 1000, sorted: true, compact: false, breakLength: Number.POSITIVE_INFINITY });

export class AssertionError extends Error {
  generatedMessage: boolean;
  code = 'ERR_ASSERTION';
  actual: unknown;
  expected: unknown;
  operator: string | undefined;
  diff = 'simple';

  constructor(options: Options) {
    if (options === null || typeof options !== 'object') throw invalidArgument('options', 'of type object', options);
    super(typeof options.message === 'string' ? options.message : '');
    this.name = 'AssertionError';
    this.generatedMessage = options.message === undefined || OWN_WORDS in options;
    this.actual = options.actual;
    this.expected = options.expected;
    this.operator = options.operator;
    if (options.message === undefined) this.message = generated(options);
    // A message of the program's own comes before the difference, as in Node.
    else if (options.operator === 'strictEqual' || options.operator === 'deepStrictEqual') this.message = `${String(options.message)}${difference(options)}`;
    Object.defineProperty(this, 'name', { value: 'AssertionError', enumerable: false, writable: true, configurable: true });
    coded(this, 'ERR_ASSERTION');
  }
}

const HEADERS: Readonly<Record<string, string>> = {
  deepStrictEqual: 'Expected values to be strictly deep-equal:',
  strictEqual: 'Expected values to be strictly equal:',
  deepEqual: 'Expected values to be loosely deep-equal:',
  notDeepStrictEqual: 'Expected "actual" not to be strictly deep-equal to:',
  notStrictEqual: 'Expected "actual" to be strictly unequal to:',
  notDeepEqual: 'Expected "actual" not to be loosely deep-equal to:',
};

// What follows a strict comparison's first line: its message's or the header.
function difference({ actual, expected, operator }: Options): string {
  const left = show(actual);
  const right = show(expected);
  if (operator === 'strictEqual' && !left.includes('\n') && !right.includes('\n')) return `\n\n${left} !== ${right}\n`;
  const lines = [...left.split('\n').map((line) => `+ ${line}`), ...right.split('\n').map((line) => `- ${line}`)];
  return `\n+ actual - expected\n\n${lines.join('\n')}\n`;
}

function generated(options: Options): string {
  const { actual, expected, operator } = options;
  const name = operator ?? 'fail';
  if (name === 'fail') return 'Failed';
  if (name === '==' || name === '!=') return `${show(actual)} ${name} ${show(expected)}`;
  const right = show(expected);
  const header = HEADERS[name] ?? `Assertion failed: ${name}`;
  if (name.startsWith('not')) return `${header} ${right}`;
  if (name === 'deepEqual') return `${header}\n\n${show(actual)}\n\nshould loosely deep-equal\n\n${right}`;
  return `${header}${difference(options)}`;
}

function fail(actual: unknown, expected: unknown, message: string | Error | undefined, operator: string, ownWords = false): never {
  if (message instanceof Error) throw message;
  const error = new AssertionError({ actual, expected, operator, ...(message === undefined ? {} : { message }), ...(ownWords ? { [OWN_WORDS]: true } : {}) });
  throw error;
}

function matches(error: unknown, expected: unknown, message: string | undefined): void {
  if (expected === undefined || typeof expected === 'string') return;
  if (expected instanceof RegExp) {
    if (!expected.test(String(error))) fail(error, expected, message ?? `The input did not match the regular expression ${inspect(expected)}. Input:\n\n${inspect(String(error))}\n`, 'throws');
    return;
  }
  if (typeof expected === 'function') {
    if (expected.prototype !== undefined && error instanceof expected) return;
    if (Error.isPrototypeOf(expected)) throw error;
    if ((expected as (value: unknown) => unknown).call({}, error) !== true) fail(error, expected, message ?? 'The validation function is expected to return "true".', 'throws');
    return;
  }
  if (expected !== null && typeof expected === 'object') {
    for (const [key, value] of Object.entries(expected)) {
      const held = (error as Record<string, unknown>)[key];
      const same = value instanceof RegExp && typeof held === 'string' ? value.test(held) : isDeepEqual(held, value, true);
      if (!same) fail(error, expected, message, 'throws');
    }
  }
}

function caught(run: () => unknown, operator: string): { thrown: true; error: unknown } | { thrown: false } {
  if (typeof run !== 'function') throw invalidArgument('fn', 'of type function', run);
  void operator;
  try {
    run();
    return { thrown: false };
  } catch (error) {
    return { thrown: true, error };
  }
}

const wordOf = (expected: unknown, message: unknown) => (typeof expected === 'string' ? expected : typeof message === 'string' ? message : undefined);

function missing(expected: unknown, message: unknown, what: string, operator: string): never {
  const word = wordOf(expected, message);
  const name = typeof expected === 'function' && expected.name ? ` (${expected.name})` : '';
  fail(undefined, expected, `Missing expected ${what}${name}${word === undefined ? '.' : `: ${word}`}`, operator);
}

const equal = (actual: unknown, expected: unknown, message?: string | Error) => {
  if (!(actual == expected || (actual !== actual && expected !== expected))) fail(actual, expected, message, '==');
};
const notEqual = (actual: unknown, expected: unknown, message?: string | Error) => {
  if (actual == expected || (actual !== actual && expected !== expected)) fail(actual, expected, message, '!=');
};
const strictEqual = (actual: unknown, expected: unknown, message?: string | Error) => {
  if (!Object.is(actual, expected)) fail(actual, expected, message, 'strictEqual');
};
const notStrictEqual = (actual: unknown, expected: unknown, message?: string | Error) => {
  if (Object.is(actual, expected)) fail(actual, expected, message, 'notStrictEqual');
};
const deepEqual = (actual: unknown, expected: unknown, message?: string | Error) => {
  if (!isDeepEqual(actual, expected, false)) fail(actual, expected, message, 'deepEqual');
};
const notDeepEqual = (actual: unknown, expected: unknown, message?: string | Error) => {
  if (isDeepEqual(actual, expected, false)) fail(actual, expected, message, 'notDeepEqual');
};
const deepStrictEqual = (actual: unknown, expected: unknown, message?: string | Error) => {
  if (!isDeepEqual(actual, expected, true)) fail(actual, expected, message, 'deepStrictEqual');
};
const notDeepStrictEqual = (actual: unknown, expected: unknown, message?: string | Error) => {
  if (isDeepEqual(actual, expected, true)) fail(actual, expected, message, 'notDeepStrictEqual');
};
const ok = (...values: [unknown?, (string | Error)?]) => {
  if (!values[0]) fail(values[0], true, values[1] ?? (values.length === 0 ? 'No value argument passed to `assert.ok()`' : 'The expression evaluated to a falsy value'), '==', values[1] === undefined);
};

const shared = {
  ok,
  strictEqual,
  notStrictEqual,
  deepStrictEqual,
  notDeepStrictEqual,
  throws(run: () => unknown, expected?: unknown, message?: string) {
    const result = caught(run, 'throws');
    if (!result.thrown) missing(expected, message, 'exception', 'throws');
    matches(result.error, expected, message);
  },
  doesNotThrow(run: () => unknown, expected?: unknown, message?: string) {
    const result = caught(run, 'doesNotThrow');
    if (result.thrown) fail(result.error, expected, `Got unwanted exception${wordOf(expected, message) === undefined ? '.' : `: ${wordOf(expected, message)}`}\nActual message: "${(result.error as Error)?.message}"`, 'doesNotThrow');
  },
  async rejects(run: (() => Promise<unknown>) | Promise<unknown>, expected?: unknown, message?: string) {
    let error: unknown;
    let thrown = false;
    try {
      await (typeof run === 'function' ? run() : run);
    } catch (each) {
      error = each;
      thrown = true;
    }
    if (!thrown) missing(expected, message, 'rejection', 'rejects');
    matches(error, expected, message);
  },
  fail(message?: string | Error) {
    fail(undefined, undefined, message, 'fail');
  },
  match(text: string, pattern: RegExp, message?: string | Error) {
    if (typeof text !== 'string' || !pattern.test(text)) fail(text, pattern, message ?? `The input did not match the regular expression ${inspect(pattern)}. Input:\n\n${inspect(text)}\n`, 'match', message === undefined);
  },
  AssertionError,
};

// Both forms hold the same functions, as Node's do: only the loose names differ.
export function createAssert(strict: boolean) {
  function assert(value?: unknown, message?: string | Error): void {
    if (!value) fail(value, true, message ?? 'The expression evaluated to a falsy value', '==', message === undefined);
  }

  return Object.assign(assert, shared, {
    equal: strict ? strictEqual : equal,
    notEqual: strict ? notStrictEqual : notEqual,
    deepEqual: strict ? deepStrictEqual : deepEqual,
    notDeepEqual: strict ? notDeepStrictEqual : notDeepEqual,
  });
}
