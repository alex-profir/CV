// Deep equality, for `util.isDeepStrictEqual` and `assert` (009 research R11).
const tagOf = (value: object) => Object.prototype.toString.call(value);

const ownKeys = (value: object) => Reflect.ownKeys(value).filter((key) => Object.prototype.propertyIsEnumerable.call(value, key));

export function isDeepEqual(a: unknown, b: unknown, strict: boolean, seen: Map<object, object> = new Map()): boolean {
  if (strict ? Object.is(a, b) : a === b || (a !== a && b !== b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return !strict && (a === null || typeof a !== 'object') && (b === null || typeof b !== 'object') && a == b;
  }
  if (strict && Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  if (tagOf(a) !== tagOf(b)) return false;
  if (seen.get(a) === b) return true;
  seen.set(a, b);
  if (Array.isArray(a) && a.length !== (b as unknown[]).length) return false;
  if (a instanceof Date && a.getTime() !== (b as Date).getTime()) return false;
  if (a instanceof RegExp && String(a) !== String(b)) return false;
  if (a instanceof Error && (a.message !== (b as Error).message || a.name !== (b as Error).name)) return false;
  if (a instanceof Number || a instanceof String || a instanceof Boolean || a instanceof BigInt || a instanceof Symbol) {
    if (!Object.is(a.valueOf(), (b as object).valueOf())) return false;
  }
  if (ArrayBuffer.isView(a) && !(a instanceof DataView)) {
    const left = a as unknown as ArrayLike<unknown>;
    const right = b as unknown as ArrayLike<unknown>;
    if (left.length !== right.length) return false;
    for (let at = 0; at < left.length; at += 1) if (!isDeepEqual(left[at], right[at], strict, seen)) return false;
    return true;
  }
  if (a instanceof Set) {
    const right = b as Set<unknown>;
    if (a.size !== right.size) return false;
    const rest = [...right];
    for (const value of a) {
      const at = rest.findIndex((other) => isDeepEqual(value, other, strict, seen));
      if (at < 0) return false;
      rest.splice(at, 1);
    }
  }
  if (a instanceof Map) {
    const right = b as Map<unknown, unknown>;
    if (a.size !== right.size) return false;
    const rest = [...right];
    for (const [key, value] of a) {
      const at = rest.findIndex(([otherKey, other]) => isDeepEqual(key, otherKey, strict, seen) && isDeepEqual(value, other, strict, seen));
      if (at < 0) return false;
      rest.splice(at, 1);
    }
  }
  const keys = ownKeys(a);
  const others = ownKeys(b);
  if (keys.length !== others.length) return false;
  for (const key of keys) {
    if (!Object.prototype.propertyIsEnumerable.call(b, key)) return false;
    if (!isDeepEqual((a as Record<PropertyKey, unknown>)[key], (b as Record<PropertyKey, unknown>)[key], strict, seen)) return false;
  }
  return true;
}
