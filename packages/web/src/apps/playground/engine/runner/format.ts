// The runner's formatter (data-model.md Log book, research R18): what the
// code logs, as `Shown` trees of text the page renders as React text only
// (FR-034, FR-047), with the limits of FR-044: depth 4, 100 items or entries
// per array, object, map or set, then `more`, and 10,000 characters per
// entry, counted over the formatted text. It runs in the worker, so it reads
// nothing of the page and holds no words: the page names `more`, circular
// parts and the like from site text.
import { LOG_LIMITS } from '../../limits.ts';
import type { Shown } from '../../types.ts';

export const LIMITS = LOG_LIMITS;

// What each marker counts for, as the page shows it: `[circular]`, `[…]`,
// `… 3 more` and the like.
const MARKER = 10;

type Budget = { left: number; cut: boolean };

const constructorName = (value: object): string | null => {
  const proto = Object.getPrototypeOf(value) as { constructor?: { name?: unknown } } | null;
  if (proto === null || proto === Object.prototype) return null;
  const name = proto.constructor?.name;
  return typeof name === 'string' && name !== '' ? name : null;
};

const isClass = (value: Function): boolean => {
  try {
    return /^class\b/.test(Function.prototype.toString.call(value));
  } catch {
    return false;
  }
};

// Spends `length` characters of the entry's budget; false, and the entry
// cut, when they aren't left. A short value of fixed form (`null`, a
// marker) is still shown when it doesn't fit, so an entry can pass the
// limit by one marker at most.
function spend(budget: Budget, length: number): boolean {
  if (budget.left < length) {
    budget.left = 0;
    budget.cut = true;
    return false;
  }
  budget.left -= length;
  return true;
}

// A string within the budget, cut where it runs out.
function text(value: string, budget: Budget): string {
  if (value.length <= budget.left) {
    budget.left -= value.length;
    return value;
  }
  const kept = value.slice(0, Math.max(0, budget.left));
  budget.left = 0;
  budget.cut = true;
  return kept;
}

function read(target: object, key: PropertyKey): unknown {
  try {
    return (target as Record<PropertyKey, unknown>)[key];
  } catch (error) {
    return error;
  }
}

// Whether a place in an array holds nothing, as in `[1,,3]`.
function isHole(list: object, index: number): boolean {
  try {
    return !Object.hasOwn(list, index) && !(index in list);
  } catch {
    return false;
  }
}

function ownSymbols(object: object): symbol[] {
  try {
    return Object.getOwnPropertySymbols(object).filter((key) => Object.getOwnPropertyDescriptor(object, key)?.enumerable === true);
  } catch {
    return [];
  }
}

// A count that is one, whatever the code's own getters answered.
const counted = (n: unknown): number => (typeof n === 'number' && Number.isSafeInteger(n) && n > 0 ? n : 0);

// What reading an object threw, shown as its value: code can make any step of
// reading it throw (a `Proxy`), and `console.log` never throws into the code.
function failure(error: unknown, budget: Budget): Shown {
  try {
    const held = error as { name?: unknown; message?: unknown } | null;
    return { t: 'err', name: text(String(read(held ?? {}, 'name') ?? 'Error'), budget), message: text(String(read(held ?? {}, 'message') ?? error), budget) };
  } catch {
    return spend(budget, MARKER), { t: 'deep' };
  }
}

function show(value: unknown, depth: number, parents: Set<object>, budget: Budget): Shown {
  try {
    return showValue(value, depth, parents, budget);
  } catch (error) {
    return failure(error, budget);
  }
}

// An object of the browser's own whose state isn't in its keys, and which holds
// entries as any object does, so it's shortened at the limit as one is.
function builtIn(object: object, budget: Budget): Shown | null {
  const number = (name: string, value: number): [string, Shown] => [name, { t: 'num', v: text(String(value), budget) }];
  if (object instanceof ArrayBuffer) return { t: 'obj', ctor: 'ArrayBuffer', entries: [number('byteLength', object.byteLength)], more: 0 };
  if (object instanceof DataView) return { t: 'obj', ctor: 'DataView', entries: [number('byteLength', object.byteLength), number('byteOffset', object.byteOffset)], more: 0 };
  if (typeof URL === 'function' && object instanceof URL) return { t: 'obj', ctor: 'URL', entries: [['href', { t: 'str', v: text(object.href, budget) }]], more: 0 };
  return null;
}

// An error, with what it holds of other errors. As a container, it's as deep
// as others' contents may be, and one that holds itself says so.
function showError(error: Error, depth: number, parents: Set<object>, budget: Budget): Shown {
  const name = String(read(error, 'name') ?? 'Error');
  const shown: Shown = { t: 'err', name: text(name, budget), message: text(String(read(error, 'message') ?? ''), budget) };
  if (depth >= LIMITS.depth) return shown;
  parents.add(error);
  try {
    const cause = read(error, 'cause');
    if (cause !== undefined) shown.cause = show(cause, depth + 1, parents, budget);
    const errors = read(error, 'errors');
    if (error instanceof AggregateError && Array.isArray(errors)) shown.errors = show(errors, depth + 1, parents, budget);
  } finally {
    parents.delete(error);
  }
  return shown;
}

function showValue(value: unknown, depth: number, parents: Set<object>, budget: Budget): Shown {
  if (value === null) return spend(budget, 4), { t: 'null' };
  if (value === undefined) return spend(budget, 9), { t: 'undef' };
  switch (typeof value) {
    case 'string':
      return { t: 'str', v: text(value, budget) };
    case 'number':
      return { t: 'num', v: text(Object.is(value, -0) ? '-0' : String(value), budget) };
    case 'bigint':
      return { t: 'bigint', v: text(`${value}n`, budget) };
    case 'boolean':
      return { t: 'bool', v: text(String(value), budget) };
    case 'symbol':
      return { t: 'sym', v: text(value.toString(), budget) };
    case 'function': {
      const name = typeof value.name === 'string' ? value.name : '';
      spend(budget, name.length + MARKER);
      return { t: 'fn', name, cls: isClass(value) };
    }
  }
  const object = value as object;
  if (parents.has(object)) return spend(budget, MARKER), { t: 'circ' };
  if (object instanceof Error) return showError(object, depth, parents, budget);
  if (object instanceof Date) return { t: 'date', v: text(Number.isNaN(object.getTime()) ? 'Invalid Date' : object.toISOString(), budget) };
  if (object instanceof RegExp) return { t: 'text', v: text(RegExp.prototype.toString.call(object), budget) };
  if (object instanceof Promise) return { t: 'text', v: text('Promise', budget) };
  if (depth >= LIMITS.depth) return spend(budget, MARKER), { t: 'deep' };
  const known = builtIn(object, budget);
  if (known !== null) return known;
  parents.add(object);
  try {
    if (object instanceof Map) {
      const entries: [Shown, Shown][] = [];
      let more = counted(object.size);
      for (const [key, item] of object) {
        if (entries.length >= LIMITS.items || !spend(budget, 4)) break;
        entries.push([show(key, depth + 1, parents, budget), show(item, depth + 1, parents, budget)]);
        more -= 1;
      }
      return { t: 'map', entries, more: counted(more) };
    }
    if (object instanceof Set) {
      const items: Shown[] = [];
      let more = counted(object.size);
      for (const item of object) {
        if (items.length >= LIMITS.items || !spend(budget, 2)) break;
        items.push(show(item, depth + 1, parents, budget));
        more -= 1;
      }
      return { t: 'set', items, more: counted(more) };
    }
    if (Array.isArray(object) || ArrayBuffer.isView(object)) {
      const list = object as ArrayLike<unknown>;
      const length = counted(list.length);
      const items: Shown[] = [];
      for (let index = 0; index < length; index += 1) {
        if (items.length >= LIMITS.items || !spend(budget, 2)) break;
        items.push(isHole(list, index) ? { t: 'hole' } : show(read(list, index), depth + 1, parents, budget));
      }
      return { t: 'arr', items, more: length - items.length };
    }
    let keys: string[];
    try {
      keys = Object.keys(object);
    } catch {
      keys = [];
    }
    const entries: [string, Shown][] = [];
    for (const key of keys) {
      if (entries.length >= LIMITS.items || !spend(budget, 2)) break;
      const name = text(key, budget);
      entries.push([name, show(read(object, key), depth + 1, parents, budget)]);
    }
    const symbolKeys = ownSymbols(object);
    const symbols: [string, Shown][] = [];
    for (const key of symbolKeys) {
      if (entries.length + symbols.length >= LIMITS.items || !spend(budget, 2)) break;
      const name = text(key.toString(), budget);
      symbols.push([name, show(read(object, key), depth + 1, parents, budget)]);
    }
    return { t: 'obj', ctor: constructorName(object), entries, more: keys.length + symbolKeys.length - entries.length - symbols.length, ...(symbols.length > 0 ? { symbols } : {}) };
  } finally {
    parents.delete(object);
  }
}

// `console.log("%s is %d", "a", 1)`: the first argument's placeholders filled
// from the rest, as the console's Formatter does, only when there is a rest.
// An object for `%s`, `%o` or `%O` stays a value of its own, as text can't show
// it without running its code; `%c` takes its style and shows nothing.
export function substitute(values: readonly unknown[]): unknown[] {
  const [first] = values;
  if (typeof first !== 'string' || values.length < 2 || !first.includes('%')) return [...values];
  const out: unknown[] = [];
  let next = 1;
  let textSoFar = '';
  let last = 0;
  for (const match of first.matchAll(/%[sdifoOc%]/g)) {
    const kind = match[0][1]!;
    if (kind !== '%' && next >= values.length) continue;
    textSoFar += first.slice(last, match.index);
    last = match.index + 2;
    if (kind === '%') {
      textSoFar += '%';
      continue;
    }
    const value = values[next];
    next += 1;
    if (kind === 'c') continue;
    if (kind === 'd' || kind === 'i' || kind === 'f') textSoFar += typeof value === 'symbol' || typeof value === 'object' || typeof value === 'function' ? 'NaN' : numberFor(kind, value);
    else if (kind === 's' && (value === null || typeof value !== 'object') && typeof value !== 'function') textSoFar += typeof value === 'bigint' ? `${value}n` : String(value);
    else {
      if (textSoFar !== '') out.push(textSoFar.trimEnd());
      textSoFar = '';
      out.push(value);
      if (first[last] === ' ') last += 1;
    }
  }
  textSoFar += first.slice(last);
  if (textSoFar !== '' || out.length === 0) out.push(textSoFar);
  return [...out, ...values.slice(next)];
}

const numberFor = (kind: string, value: unknown): string => {
  if (typeof value === 'bigint') return `${value}n`;
  return String(kind === 'f' ? Number.parseFloat(String(value)) : Number.parseInt(String(value), 10));
};

// One log entry's values: each argument formatted, the entry cut where it
// passes 10,000 characters, with `cut` saying so.
export function formatEntry(values: readonly unknown[]): { values: Shown[]; cut: boolean } {
  const budget: Budget = { left: LIMITS.chars, cut: false };
  const shown: Shown[] = [];
  for (const value of values) {
    if (shown.length > 0 && !spend(budget, 1)) break;
    shown.push(show(value, 0, new Set(), budget));
  }
  return { values: shown, cut: budget.cut };
}

// How many characters an entry's values count for, as `formatEntry` counts
// them: the tests hold every entry within the limit by it.
export function measure(values: readonly Shown[]): number {
  const one = (value: Shown): number => {
    switch (value.t) {
      case 'str':
      case 'num':
      case 'bigint':
      case 'bool':
      case 'sym':
      case 'date':
      case 'text':
        return value.v.length;
      case 'null':
        return 4;
      case 'undef':
        return 9;
      case 'fn':
        return value.name.length + MARKER;
      case 'circ':
      case 'deep':
        return MARKER;
      case 'hole':
        return 0;
      case 'err':
        return value.name.length + value.message.length + (value.cause === undefined ? 0 : one(value.cause)) + (value.errors === undefined ? 0 : one(value.errors));
      case 'arr':
      case 'set':
        return value.items.reduce((sum, item) => sum + 2 + one(item), 0);
      case 'map':
        return value.entries.reduce((sum, [key, item]) => sum + 4 + one(key) + one(item), 0);
      case 'obj':
        return [...value.entries, ...(value.symbols ?? [])].reduce((sum, [key, item]) => sum + 2 + key.length + one(item), 0);
    }
  };
  return values.reduce((sum, value, index) => sum + (index > 0 ? 1 : 0) + one(value), 0);
}
