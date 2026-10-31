// The site's own `jq` (006 FR-056, research R53): jq 1.7.1's language, its
// options and its messages, over text, as just-bash's can't be wrapped
// (research G39). Lazy, as jq is: each filter is a generator, so
// `[limit(3;repeat(1))]` ends. Runs in the shell's worker only.

export type Stop = 'time' | 'output';
export type JqIo = {
  stdin: string;
  // A file's text; `null` if there's no such file, `'folder'` for a folder.
  read: (path: string) => Promise<{ text: string } | 'missing' | 'folder'>;
  env: ReadonlyMap<string, string> | Readonly<Record<string, string>>;
  // When to stop, by `Date.now()`, and how many characters to print at most.
  deadline: number;
  maxOutput: number;
};
export type JqResult = { stdout: string; stderr: string; exitCode: number; stopped?: Stop };

// A number as written, kept until arithmetic touches it (jq 1.7).
class Lit {
  readonly n: number;
  readonly text: string;
  constructor(n: number, text: string) {
    this.n = n;
    this.text = text;
  }
}
type JObject = Map<string, JV>;
type JV = null | boolean | number | Lit | string | JV[] | JObject;

class JqError extends Error {
  readonly value: JV;
  constructor(value: JV) {
    super('jq');
    this.value = value;
  }
}
class JqBreak extends Error {
  readonly id: object;
  constructor(id: object) {
    super('break');
    this.id = id;
  }
}
class JqHalt extends Error {
  readonly status: number;
  readonly text: string;
  constructor(status: number, text: string) {
    super('halt');
    this.status = status;
    this.text = text;
  }
}
class JqStopped extends Error {
  readonly why: Stop;
  constructor(why: Stop) {
    super('stop');
    this.why = why;
  }
}
class CompileError extends Error {}

const fail = (message: string): never => {
  throw new JqError(message);
};

// ---- Values ----

const num = (value: JV): number => (value instanceof Lit ? value.n : (value as number));
const isNum = (value: JV): value is number | Lit => typeof value === 'number' || value instanceof Lit;
const isObj = (value: JV): value is JObject => value instanceof Map;

function kind(value: JV): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return 'boolean';
  if (isNum(value)) return 'number';
  if (typeof value === 'string') return 'string';
  return Array.isArray(value) ? 'array' : 'object';
}
const rank = (value: JV): number => (value === null ? 0 : value === false ? 1 : value === true ? 2 : isNum(value) ? 3 : typeof value === 'string' ? 4 : Array.isArray(value) ? 5 : 6);
const truthy = (value: JV) => value !== null && value !== false;

function compareText(a: string, b: string): number {
  if (a === b) return 0;
  const size = Math.min(a.length, b.length);
  for (let at = 0; at < size; at += 1) {
    const [x, y] = [a.charCodeAt(at), b.charCodeAt(at)];
    if (x === y) continue;
    // By code point, as UTF-8 bytes order: a surrogate sorts above the rest.
    const [high, other] = [x >= 0xd800 && x <= 0xdfff, y >= 0xd800 && y <= 0xdfff];
    if (high !== other) return high ? 1 : -1;
    return x - y;
  }
  return a.length - b.length;
}
const sortedKeys = (value: JObject) => [...value.keys()].sort(compareText);

// Two literals the same as doubles, by what they say (jq 1.7).
function compareWritten(a: string, b: string): number {
  const parts = (text: string) => {
    const [, sign, whole, part, power] = /^(-?)(\d*)\.?(\d*)(?:[eE]([+-]?\d+))?$/.exec(text) as unknown as [string, string, string, string, string?];
    return { digits: BigInt(`${whole}${part}` || '0') * (sign === '-' ? -1n : 1n), exponent: Number(power ?? 0) - part.length };
  };
  const [x, y] = [parts(a), parts(b)];
  const low = Math.min(x.exponent, y.exponent);
  if (x.exponent - low > 400 || y.exponent - low > 400) return 0;
  const [p, q] = [x.digits * 10n ** BigInt(x.exponent - low), y.digits * 10n ** BigInt(y.exponent - low)];
  return p < q ? -1 : p === q ? 0 : 1;
}

function compare(a: JV, b: JV): number {
  const [x, y] = [rank(a), rank(b)];
  if (x !== y) return x - y;
  if (x === 3) {
    const [m, n] = [num(a), num(b)];
    if (Number.isNaN(m)) return -1;
    if (Number.isNaN(n)) return 1;
    if (m === n && a instanceof Lit && b instanceof Lit && Number.isFinite(m)) return compareWritten(a.text, b.text);
    return m < n ? -1 : m === n ? 0 : 1;
  }
  if (x === 4) return compareText(a as string, b as string);
  if (x === 5) {
    const [p, q] = [a as JV[], b as JV[]];
    for (let at = 0; at < p.length && at < q.length; at += 1) {
      const order = compare(p[at]!, q[at]!);
      if (order !== 0) return order;
    }
    return p.length - q.length;
  }
  if (x === 6) {
    const [p, q] = [a as JObject, b as JObject];
    const [keysP, keysQ] = [sortedKeys(p), sortedKeys(q)];
    const order = compare(keysP, keysQ);
    if (order !== 0) return order;
    for (const key of keysP) {
      const inner = compare(p.get(key)!, q.get(key)!);
      if (inner !== 0) return inner;
    }
  }
  return 0;
}

// jq's number text: the shortest that reads back, as its dtoa writes it.
function numberText(value: number): string {
  if (Number.isNaN(value)) return 'null';
  if (!Number.isFinite(value)) return value > 0 ? '1.7976931348623157e+308' : '-1.7976931348623157e+308';
  if (value === 0) return Object.is(value, -0) ? '-0' : '0';
  const sign = value < 0 ? '-' : '';
  const [mantissa, exponent] = Math.abs(value).toExponential().split('e') as [string, string];
  const digits = mantissa.replace('.', '');
  const point = Number(exponent) + 1;
  if (point <= -4 || point > digits.length + 15) {
    const power = point - 1;
    return `${sign}${digits[0]}${digits.length > 1 ? `.${digits.slice(1)}` : ''}e${power < 0 ? '-' : '+'}${String(Math.abs(power)).padStart(2, '0')}`;
  }
  if (point <= 0) return `${sign}0.${'0'.repeat(-point)}${digits}`;
  if (point >= digits.length) return `${sign}${digits}${'0'.repeat(point - digits.length)}`;
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
}

// A literal as decNumber writes it, which jq 1.7 prints back.
function canonical(text: string): string {
  const match = /^(-?)(\d*)\.?(\d*)(?:[eE]([+-]?\d+))?$/.exec(text)!;
  const [, sign, whole, part, power] = match as unknown as [string, string, string, string, string?];
  const raw = `${whole}${part}`;
  const coefficient = raw.replace(/^0+(?=\d)/, '');
  const exponent = Number(power ?? 0) - part.length;
  const adjusted = exponent + coefficient.length - 1;
  if (exponent <= 0 && adjusted >= -6) {
    if (exponent === 0) return `${sign}${coefficient}`;
    const padded = coefficient.padStart(-exponent + 1, '0');
    return `${sign}${padded.slice(0, exponent)}.${padded.slice(exponent)}`;
  }
  return `${sign}${coefficient[0]}${coefficient.length > 1 ? `.${coefficient.slice(1)}` : ''}E${adjusted < 0 ? '-' : '+'}${Math.abs(adjusted)}`;
}
function literal(text: string): JV {
  const value = Number(text);
  const written = canonical(text);
  return written === numberText(value) ? value : new Lit(value, written);
}

function quoted(text: string, ascii = false): string {
  let out = '"';
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (char === '"') out += '\\"';
    else if (char === '\\') out += '\\\\';
    else if (char === '\n') out += '\\n';
    else if (char === '\t') out += '\\t';
    else if (char === '\r') out += '\\r';
    else if (char === '\b') out += '\\b';
    else if (char === '\f') out += '\\f';
    else if (code < 32 || code === 127) out += `\\u${code.toString(16).padStart(4, '0')}`;
    else if (ascii && code > 126) {
      for (let at = 0; at < char.length; at += 1) out += `\\u${char.charCodeAt(at).toString(16).padStart(4, '0')}`;
    } else out += char;
  }
  return `${out}"`;
}

type Colors = { null: string; false: string; true: string; number: string; string: string; array: string; object: string; key: string };
type Dump = { indent: string; sort: boolean; ascii: boolean; colors: Colors | null };
const COMPACT: Dump = { indent: '', sort: false, ascii: false, colors: null };
const ESC = '\u001b[';
const RESET = `${ESC}0m`;

function dump(value: JV, options: Dump = COMPACT, depth = 0): string {
  const { colors, indent } = options;
  const line = indent === '' ? '' : `\n${indent.repeat(depth + 1)}`;
  const close = indent === '' ? '' : `\n${indent.repeat(depth)}`;
  const leaf = (text: string, color: string | undefined) => (colors === null ? text : `${ESC}${color}m${text}${RESET}`);
  if (value === null) return leaf('null', colors?.null);
  if (value === true) return leaf('true', colors?.true);
  if (value === false) return leaf('false', colors?.false);
  if (value instanceof Lit) return leaf(value.text, colors?.number);
  if (typeof value === 'number') return leaf(numberText(value), colors?.number);
  if (typeof value === 'string') return leaf(quoted(value, options.ascii), colors?.string);
  if (Array.isArray(value)) {
    if (value.length === 0) return colors === null ? '[]' : `${ESC}${colors.array}m[]${RESET}`;
    if (colors === null) return `[${line}${value.map((each) => dump(each, options, depth + 1)).join(`,${line}`)}${close}]`;
    const col = `${ESC}${colors.array}m`;
    return `${col}[${line}${value.map((each) => dump(each, options, depth + 1)).join(`${col},${line}`)}${col}${close}${col}]${RESET}`;
  }
  if (value.size === 0) return colors === null ? '{}' : `${ESC}${colors.object}m{}${RESET}`;
  const keys = options.sort ? sortedKeys(value) : [...value.keys()];
  if (colors === null) return `{${line}${keys.map((key) => `${quoted(key, options.ascii)}:${indent === '' ? '' : ' '}${dump(value.get(key)!, options, depth + 1)}`).join(`,${line}`)}${close}}`;
  const col = `${ESC}${colors.object}m`;
  const field = (key: string) => `${ESC}${colors.key}m${quoted(key, options.ascii)}${RESET}${col}:${indent === '' ? '' : ' '}${RESET}${dump(value.get(key)!, options, depth + 1)}`;
  return `${col}{${line}${RESET}${keys.map(field).join(`${col},${line}${RESET}`)}${col}${close}${col}}${RESET}`;
}

// What a message shows of a value: 11 characters and `...`.
function brief(value: JV): string {
  const text = dump(value);
  return text.length > 14 ? `${[...text].slice(0, 11).join('')}...` : text;
}
const described = (value: JV) => `${kind(value)} (${brief(value)})`;
const toText = (value: JV) => (typeof value === 'string' ? value : dump(value));

// ---- JSON text ----

class JsonParser {
  at = 0;
  readonly text: string;
  constructor(text: string) {
    this.text = text;
  }
  private lineColumn(at: number) {
    let [line, last] = [1, -1];
    for (let each = this.text.indexOf('\n'); each !== -1 && each < at; each = this.text.indexOf('\n', each + 1)) {
      line += 1;
      last = each;
    }
    return `at line ${line}, column ${at - last - 1}`;
  }
  private fail(message: string, at = this.at): never {
    throw new SyntaxError(`${message} ${at >= this.text.length ? `at EOF ${this.lineColumn(at)}` : this.lineColumn(at)}`);
  }
  private space() {
    for (;;) {
      const code = this.text.charCodeAt(this.at);
      if (code === 32 || code === 10 || code === 13 || code === 9 || code === 0x1e) this.at += 1;
      else if (code === 0xfeff && this.at === 0) this.at += 1;
      else return;
    }
  }
  // The next value, or `undefined` at the end of the text.
  next(): JV | undefined {
    this.space();
    return this.at >= this.text.length ? undefined : this.value();
  }
  private value(): JV {
    this.space();
    const char = this.text[this.at];
    if (char === undefined) this.fail('Unfinished JSON term');
    if (char === '[') {
      this.at += 1;
      const out: JV[] = [];
      this.space();
      if (this.text[this.at] === ']') {
        this.at += 1;
        return out;
      }
      for (;;) {
        out.push(this.value());
        this.space();
        const after = this.text[this.at];
        if (after === undefined) this.fail('Unfinished JSON term');
        this.at += 1;
        if (after === ']') return out;
        if (after !== ',') this.fail('Expected separator between values', this.at - 1);
      }
    }
    if (char === '{') {
      this.at += 1;
      const out: JObject = new Map();
      this.space();
      if (this.text[this.at] === '}') {
        this.at += 1;
        return out;
      }
      for (;;) {
        this.space();
        if (this.text[this.at] === undefined) this.fail('Unfinished JSON term');
        if (this.text[this.at] !== '"') this.fail('Object keys must be strings');
        const key = this.string();
        this.space();
        if (this.text[this.at] === undefined) this.fail('Unfinished JSON term');
        if (this.text[this.at] !== ':') this.fail('Objects must consist of key:value pairs');
        this.at += 1;
        out.set(key, this.value());
        this.space();
        const after = this.text[this.at];
        if (after === undefined) this.fail('Unfinished JSON term');
        this.at += 1;
        if (after === '}') return out;
        if (after !== ',') this.fail('Expected separator between values', this.at - 1);
      }
    }
    if (char === '"') return this.string();
    const word = /[^\s,:[\]{}"]+/y;
    word.lastIndex = this.at;
    const match = word.exec(this.text);
    if (match === null) this.fail(char === ']' || char === '}' ? 'Unmatched closing bracket' : 'Invalid literal');
    const text = match![0];
    this.at += text.length;
    if (text === 'null') return null;
    if (text === 'true') return true;
    if (text === 'false') return false;
    if (text === 'nan' || text === 'NaN') return NaN;
    if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(text)) return literal(text.replace(/^\+/, ''));
    return this.fail('Invalid numeric literal', this.at);
  }
  private string(): string {
    let out = '';
    let from = (this.at += 1);
    for (;;) {
      const code = this.text.charCodeAt(this.at);
      if (Number.isNaN(code)) this.fail('Unfinished string');
      if (code === 34) {
        out += this.text.slice(from, this.at);
        this.at += 1;
        return out;
      }
      if (code !== 92) {
        this.at += 1;
        continue;
      }
      out += this.text.slice(from, this.at);
      const escape = this.text[this.at + 1];
      this.at += 2;
      const simple: Record<string, string> = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
      if (escape !== undefined && escape in simple) out += simple[escape];
      else if (escape === 'u') {
        const hex = this.text.slice(this.at, this.at + 4);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) this.fail('Invalid escape');
        this.at += 4;
        const code = parseInt(hex, 16);
        out += String.fromCharCode(code);
        if (code >= 0xd800 && code <= 0xdbff) {
          const low = /^\\u([dD][c-fC-F][0-9a-fA-F]{2})/.exec(this.text.slice(this.at, this.at + 6));
          if (low === null) this.fail('Invalid \\uXXXX\\uXXXX surrogate pair escape');
          out += String.fromCharCode(parseInt(low![1]!, 16));
          this.at += 6;
        }
      } else this.fail('Invalid escape');
      from = this.at;
    }
  }
}

// A lone surrogate is U+FFFD, as jq's strings are UTF-8.
const wellFormed = (text: string) => text.replace(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, '�');
function fixStrings(value: JV): JV {
  if (typeof value === 'string') return /[\ud800-\udfff]/.test(value) ? wellFormed(value) : value;
  if (Array.isArray(value)) return value.map(fixStrings);
  if (isObj(value)) return new Map([...value].map(([key, each]) => [wellFormed(key), fixStrings(each)]));
  return value;
}

function parseOne(text: string): JV {
  const parser = new JsonParser(text);
  const first = parser.next();
  if (first === undefined) throw new SyntaxError('Expected JSON value');
  if (parser.next() !== undefined) throw new SyntaxError('Unexpected extra JSON values');
  return fixStrings(first);
}

// ---- Paths and indexes ----

function sliceBounds(size: number, key: JObject): [number, number] {
  if (!key.has('start') && !key.has('end')) fail('Array/string slice indices must be integers');
  const [start, end] = [key.get('start') ?? null, key.get('end') ?? null];
  if ((start !== null && !isNum(start)) || (end !== null && !isNum(end))) fail('Start and end indices of an array slice must be numbers');
  let from = start === null ? 0 : num(start);
  let to = end === null ? size : num(end);
  if (Number.isNaN(from)) from = 0;
  if (Number.isNaN(to)) to = size;
  if (from < 0) from += size;
  if (to < 0) to += size;
  from = Math.min(Math.max(from, 0), size);
  to = Math.min(Math.max(to, 0), size);
  if (to < from) to = from;
  return [Math.floor(from), Math.min(Math.ceil(to), size)];
}

function indicesOf(value: JV[], wanted: JV[]): JV[] {
  const out: JV[] = [];
  if (wanted.length === 0) return out;
  for (let at = 0; at + wanted.length <= value.length; at += 1) if (wanted.every((each, by) => compare(value[at + by]!, each) === 0)) out.push(at);
  return out;
}

function getIndex(target: JV, key: JV): JV {
  if (isObj(target) && typeof key === 'string') return target.get(key) ?? null;
  if (Array.isArray(target) && isNum(key)) {
    const at = Math.floor(num(key));
    if (Number.isNaN(at)) return null;
    return target[at < 0 ? at + target.length : at] ?? null;
  }
  if (target === null && (typeof key === 'string' || isNum(key) || Array.isArray(key))) return null;
  if (isObj(key) && (target === null || typeof target === 'string' || Array.isArray(target))) {
    if (target === null) return null;
    if (Array.isArray(target)) {
      const [from, to] = sliceBounds(target.length, key);
      return target.slice(from, to);
    }
    const chars = [...target];
    const [from, to] = sliceBounds(chars.length, key);
    return chars.slice(from, to).join('');
  }
  if (Array.isArray(target) && Array.isArray(key)) return indicesOf(target, key);
  if (typeof key === 'string') return fail(`Cannot index ${kind(target)} with ${isObj(target) ? '' : 'string '}${quoted(key)}`);
  return fail(`Cannot index ${kind(target)} with ${kind(key)}`);
}

function setIndex(target: JV, key: JV, value: JV): JV {
  if (typeof key === 'string' && (target === null || isObj(target))) return new Map(target ?? []).set(key, value);
  if (isNum(key) && (target === null || Array.isArray(target))) {
    const list = [...(target ?? [])];
    let at = Math.floor(num(key));
    if (at < 0) {
      at += list.length;
      if (at < 0) fail('Out of bounds negative array index');
    }
    if (at > 536870911) fail('Array index too large');
    while (list.length < at) list.push(null);
    list[at] = value;
    return list;
  }
  if (isObj(key) && (target === null || Array.isArray(target))) {
    if (!Array.isArray(value)) fail('A slice of an array can only be assigned another array');
    const list = target ?? [];
    const [from, to] = sliceBounds(list.length, key);
    return [...list.slice(0, from), ...(value as JV[]), ...list.slice(to)];
  }
  if (isObj(key)) return fail(`Cannot update field at object index of ${kind(target)}`);
  if (Array.isArray(key) && Array.isArray(target)) return fail('Cannot update field at array index of array');
  if (typeof key === 'string') return fail(`Cannot index ${kind(target)} with ${quoted(key)}`);
  return fail(`Cannot index ${kind(target)} with ${kind(key)}`);
}

function getPath(target: JV, path: readonly JV[]): JV {
  let at = target;
  for (const key of path) {
    if (at === null) return null;
    at = getIndex(at, key);
  }
  return at;
}
function setPath(target: JV, path: readonly JV[], value: JV, from = 0): JV {
  if (from === path.length) return value;
  const key = path[from]!;
  const inner = target === null ? null : getIndex(target, key);
  return setIndex(target, key, setPath(inner, path, value, from + 1));
}
function deleteKeys(target: JV, keys: readonly JV[]): JV {
  if (target === null) return null;
  if (Array.isArray(target)) {
    const gone = new Set<number>();
    for (const key of keys) {
      if (isNum(key)) {
        const at = Math.floor(num(key));
        const place = at < 0 ? at + target.length : at;
        if (place >= 0 && place < target.length) gone.add(place);
      } else if (isObj(key)) {
        const [from, to] = sliceBounds(target.length, key);
        for (let at = from; at < to; at += 1) gone.add(at);
      } else fail(typeof key === 'string' ? 'Cannot delete field at object index of array' : `Cannot delete ${kind(key)} index of array`);
    }
    return target.filter((_, at) => !gone.has(at));
  }
  if (isObj(target)) {
    const out = new Map(target);
    for (const key of keys) {
      if (typeof key !== 'string') fail('Cannot delete field at array index of object');
      out.delete(key as string);
    }
    return out;
  }
  return fail(`Cannot delete fields from ${kind(target)}`);
}
function deletePath(target: JV, path: readonly JV[], from = 0): JV {
  if (from === path.length) return null;
  if (target === null) return null;
  const key = path[from]!;
  if (from === path.length - 1) return deleteKeys(target, [key]);
  const inner = getIndex(target, key);
  if (inner === null) return target;
  return setIndex(target, key, deletePath(inner, path, from + 1));
}

// ---- The filter language ----

type Node =
  | { t: 'id' }
  | { t: 'lit'; value: JV }
  | { t: 'index'; target: Node; key: Node }
  | { t: 'slice'; target: Node; from: Node | null; to: Node | null }
  | { t: 'iterate'; target: Node }
  | { t: 'try'; body: Node; handler: Node | null }
  | { t: 'pipe'; left: Node; right: Node }
  | { t: 'comma'; left: Node; right: Node }
  | { t: 'neg'; body: Node }
  | { t: 'bin'; op: string; left: Node; right: Node }
  | { t: 'and' | 'or' | 'alt'; left: Node; right: Node }
  | { t: 'if'; cond: Node; then: Node; else: Node | null }
  | { t: 'as'; source: Node; patterns: Pattern[]; body: Node }
  | { t: 'reduce'; source: Node; patterns: Pattern[]; init: Node; update: Node }
  | { t: 'foreach'; source: Node; patterns: Pattern[]; init: Node; update: Node; extract: Node | null }
  | { t: 'def'; def: Def; body: Node }
  | { t: 'call'; name: string; args: Node[]; line: number }
  | { t: 'var'; name: string; line: number }
  | { t: 'loc'; line: number }
  | { t: 'label'; name: string; body: Node }
  | { t: 'break'; name: string; line: number }
  | { t: 'format'; name: string }
  | { t: 'string'; parts: (string | Node)[]; format: string | null }
  | { t: 'array'; body: Node | null }
  | { t: 'object'; entries: [Node, Node][] };
type Def = { name: string; params: string[]; body: Node; key: string };
type Pattern =
  | { p: 'var'; name: string }
  | { p: 'array'; items: Pattern[] }
  | { p: 'object'; entries: { variable: string | null; key: Node | null; value: Pattern | null }[] };

const KEYWORDS = new Set(['def', 'if', 'then', 'elif', 'else', 'end', 'as', 'reduce', 'foreach', 'try', 'catch', 'label', 'import', 'include', 'and', 'or', '__loc__']);
const OPERATORS = ['?//=', '?//', '//=', '|=', '+=', '-=', '*=', '/=', '%=', '==', '!=', '<=', '>=', '//', '..', 'and', 'or'];

type Token = { k: 'op' | 'num' | 'id' | 'field' | 'var' | 'format' | 'quote' | 'end'; text: string; at: number };

class Parser {
  at = 0;
  private held: Token | null = null;
  readonly source: string;
  constructor(source: string) {
    this.source = source;
  }

  lineAt(at: number) {
    let line = 1;
    for (let each = this.source.indexOf('\n'); each !== -1 && each < at; each = this.source.indexOf('\n', each + 1)) line += 1;
    return line;
  }
  wrong(token: Token): never {
    const text = token.k === 'end' ? 'end of file' : token.k === 'id' ? 'IDENT' : token.k === 'field' ? 'FIELD' : token.k === 'num' ? 'LITERAL' : `'${token.text}'`;
    throw new CompileError(`syntax error, unexpected ${text} (Unix shell quoting issues?) at <top-level>, line ${this.lineAt(token.at)}:`);
  }
  private lex(): Token {
    const { source } = this;
    for (;;) {
      const code = source.charCodeAt(this.at);
      if (code === 32 || code === 9 || code === 10 || code === 13) this.at += 1;
      else if (source[this.at] === '#') {
        const end = source.indexOf('\n', this.at);
        this.at = end < 0 ? source.length : end;
      } else break;
    }
    const at = this.at;
    if (at >= source.length) return { k: 'end', text: '', at };
    const char = source[at]!;
    const sticky = (pattern: RegExp) => {
      pattern.lastIndex = at;
      return pattern.exec(source)?.[0] ?? null;
    };
    if (char === '"') return { k: 'quote', text: '"', at };
    const number = sticky(/(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/y);
    if (number !== null) {
      this.at += number.length;
      return { k: 'num', text: number, at };
    }
    const field = sticky(/\.[a-zA-Z_][a-zA-Z0-9_]*/y);
    if (field !== null) {
      this.at += field.length;
      return { k: 'field', text: field.slice(1), at };
    }
    const variable = sticky(/\$[ \t\n]*[a-zA-Z_][a-zA-Z0-9_]*(::[a-zA-Z_][a-zA-Z0-9_]*)*/y);
    if (variable !== null) {
      this.at += variable.length;
      return { k: 'var', text: variable.slice(1).trim(), at };
    }
    const format = sticky(/@[a-zA-Z0-9_]+/y);
    if (format !== null) {
      this.at += format.length;
      return { k: 'format', text: format, at };
    }
    const word = sticky(/[a-zA-Z_][a-zA-Z0-9_]*(::[a-zA-Z_][a-zA-Z0-9_]*)*/y);
    if (word !== null) {
      this.at += word.length;
      return { k: word === 'and' || word === 'or' ? 'op' : 'id', text: word, at };
    }
    for (const op of OPERATORS) {
      if (source.startsWith(op, at)) {
        this.at += op.length;
        return { k: 'op', text: op, at };
      }
    }
    if ('.[]{}()|,:;=<>+-*/%?$'.includes(char)) {
      this.at += 1;
      return { k: 'op', text: char, at };
    }
    throw new CompileError(`syntax error, unexpected INVALID_CHARACTER (Unix shell quoting issues?) at <top-level>, line ${this.lineAt(at)}:`);
  }
  peek(): Token {
    this.held ??= this.lex();
    return this.held;
  }
  take(): Token {
    const token = this.peek();
    this.held = null;
    return token;
  }
  isOp(text: string) {
    const token = this.peek();
    return token.k === 'op' && token.text === text;
  }
  isWord(text: string) {
    const token = this.peek();
    return token.k === 'id' && token.text === text;
  }
  eatOp(text: string) {
    if (!this.isOp(text)) return false;
    this.take();
    return true;
  }
  eatWord(text: string) {
    if (!this.isWord(text)) return false;
    this.take();
    return true;
  }
  needOp(text: string) {
    if (!this.eatOp(text)) this.wrong(this.peek());
  }
  needWord(text: string) {
    if (!this.eatWord(text)) this.wrong(this.peek());
  }

  // The whole text: its definitions, and a filter if one follows.
  program(): { defs: Def[]; body: Node } {
    if (this.isWord('import') || this.isWord('include') || this.isWord('module')) throw new CompileError(`module not found at <top-level>, line ${this.lineAt(this.peek().at)}:`);
    const defs: Def[] = [];
    while (this.isWord('def')) defs.push(this.def());
    if (this.peek().k === 'end') throw new CompileError('Top-level program not given (try ".")');
    const body = this.pipe();
    if (this.peek().k !== 'end') this.wrong(this.peek());
    return { defs, body };
  }
  private def(): Def {
    this.needWord('def');
    const named = this.take();
    if (named.k !== 'id') this.wrong(named);
    const params: string[] = [];
    if (this.eatOp('(')) {
      do {
        const param = this.take();
        if (param.k === 'var') params.push(`$${param.text}`);
        else if (param.k === 'id') params.push(param.text);
        else this.wrong(param);
      } while (this.eatOp(';'));
      this.needOp(')');
    }
    this.needOp(':');
    const body = this.pipe();
    this.needOp(';');
    return { name: named.text, params, body, key: `${named.text}/${params.length}` };
  }
  pipe(): Node {
    if (this.isWord('def')) {
      const def = this.def();
      return { t: 'def', def, body: this.pipe() };
    }
    if (this.isWord('label')) {
      this.take();
      const named = this.take();
      if (named.k !== 'var') this.wrong(named);
      this.needOp('|');
      return { t: 'label', name: named.text, body: this.pipe() };
    }
    const left = this.comma();
    if (this.eatOp('|')) return { t: 'pipe', left, right: this.pipe() };
    return left;
  }
  private comma(): Node {
    let left = this.alternative();
    while (this.eatOp(',')) left = { t: 'comma', left, right: this.alternative() };
    return left;
  }
  private alternative(): Node {
    const left = this.assign();
    if (this.eatOp('//')) return { t: 'alt', left, right: this.alternative() };
    return left;
  }
  private assign(): Node {
    const left = this.or();
    const token = this.peek();
    if (token.k !== 'op') return left;
    if (token.text === '=') {
      this.take();
      return this.single({ t: 'call', name: '_assign', args: [left, this.or()], line: 1 });
    }
    if (token.text === '|=') {
      this.take();
      return this.single({ t: 'call', name: '_modify', args: [left, this.or()], line: 1 });
    }
    const update: Record<string, string> = { '+=': '+', '-=': '-', '*=': '*', '/=': '/', '%=': '%', '//=': '//' };
    const op = update[token.text];
    if (op === undefined) return left;
    this.take();
    const right = this.or();
    const held: Node = { t: 'var', name: '*update', line: 1 };
    const changed: Node = op === '//' ? { t: 'alt', left: { t: 'id' }, right: held } : { t: 'bin', op, left: { t: 'id' }, right: held };
    return this.single({ t: 'as', source: right, patterns: [{ p: 'var', name: '*update' }], body: { t: 'call', name: '_modify', args: [left, changed], line: 1 } });
  }
  private single(node: Node): Node {
    const after = this.peek();
    if (after.k === 'op' && ['=', '|=', '+=', '-=', '*=', '/=', '%=', '//='].includes(after.text)) this.wrong(after);
    return node;
  }
  private or(): Node {
    let left = this.and();
    while (this.eatOp('or')) left = { t: 'or', left, right: this.and() };
    return left;
  }
  private and(): Node {
    let left = this.comparison();
    while (this.eatOp('and')) left = { t: 'and', left, right: this.comparison() };
    return left;
  }
  private comparison(): Node {
    const left = this.additive();
    const token = this.peek();
    if (token.k === 'op' && ['==', '!=', '<', '<=', '>', '>='].includes(token.text)) {
      this.take();
      const node: Node = { t: 'bin', op: token.text, left, right: this.additive() };
      const after = this.peek();
      if (after.k === 'op' && ['==', '!=', '<', '<=', '>', '>='].includes(after.text)) this.wrong(after);
      return node;
    }
    return left;
  }
  private additive(): Node {
    let left = this.multiplicative();
    for (;;) {
      if (this.eatOp('+')) left = { t: 'bin', op: '+', left, right: this.multiplicative() };
      else if (this.eatOp('-')) left = { t: 'bin', op: '-', left, right: this.multiplicative() };
      else return left;
    }
  }
  private multiplicative(): Node {
    let left = this.unary();
    for (;;) {
      if (this.eatOp('*')) left = { t: 'bin', op: '*', left, right: this.unary() };
      else if (this.eatOp('/')) left = { t: 'bin', op: '/', left, right: this.unary() };
      else if (this.eatOp('%')) left = { t: 'bin', op: '%', left, right: this.unary() };
      else return left;
    }
  }
  private unary(): Node {
    if (this.eatOp('-')) return { t: 'neg', body: this.unary() };
    return this.postfixAs();
  }
  // A term, and `as` with what follows it to the pipe's end.
  private postfixAs(): Node {
    const source = this.term();
    if (!this.eatWord('as')) return source;
    const patterns = this.patterns();
    this.needOp('|');
    return { t: 'as', source, patterns, body: this.pipe() };
  }
  private patterns(): Pattern[] {
    const out = [this.pattern()];
    while (this.eatOp('?//')) out.push(this.pattern());
    return out;
  }
  private pattern(): Pattern {
    const token = this.take();
    if (token.k === 'var') return { p: 'var', name: token.text };
    if (token.k === 'op' && token.text === '[') {
      const items: Pattern[] = [];
      do items.push(this.pattern());
      while (this.eatOp(','));
      this.needOp(']');
      return { p: 'array', items };
    }
    if (token.k === 'op' && token.text === '{') {
      const entries: { variable: string | null; key: Node | null; value: Pattern | null }[] = [];
      do {
        const first = this.peek();
        let [variable, key]: [string | null, Node | null] = [null, null];
        if (first.k === 'var') {
          this.take();
          variable = first.text;
          key = { t: 'lit', value: first.text };
        } else if (first.k === 'id' || (first.k === 'op' && (first.text === 'and' || first.text === 'or'))) {
          this.take();
          key = { t: 'lit', value: first.text };
        } else if (first.k === 'quote') key = this.string(null);
        else if (this.eatOp('(')) {
          key = this.pipe();
          this.needOp(')');
        } else this.wrong(first);
        const value = this.eatOp(':') ? this.pattern() : null;
        if (value === null && variable === null) this.wrong(this.peek());
        entries.push({ variable, key, value });
      } while (this.eatOp(','));
      this.needOp('}');
      return { p: 'object', entries };
    }
    return this.wrong(token);
  }
  // The operand of `reduce`, `foreach` and `try`.
  term(): Node {
    let node = this.primary();
    for (;;) {
      const token = this.peek();
      if (token.k === 'field') {
        this.take();
        node = { t: 'index', target: node, key: { t: 'lit', value: token.text } };
      } else if (token.k === 'op' && token.text === '.') {
        this.take();
        if (this.peek().k === 'quote') node = { t: 'index', target: node, key: this.string(null) };
        else if (this.isOp('[')) node = this.bracket(node);
        else this.wrong(this.peek());
      } else if (token.k === 'op' && token.text === '[') node = this.bracket(node);
      else if (token.k === 'op' && token.text === '?') {
        this.take();
        node = { t: 'try', body: node, handler: null };
      } else return node;
    }
  }
  private bracket(target: Node): Node {
    this.needOp('[');
    if (this.eatOp(']')) return { t: 'iterate', target };
    if (this.eatOp(':')) {
      const to = this.pipe();
      this.needOp(']');
      return { t: 'slice', target, from: null, to };
    }
    const first = this.pipe();
    if (this.eatOp(':')) {
      if (this.eatOp(']')) return { t: 'slice', target, from: first, to: null };
      const to = this.pipe();
      this.needOp(']');
      return { t: 'slice', target, from: first, to };
    }
    this.needOp(']');
    return { t: 'index', target, key: first };
  }
  private primary(): Node {
    const token = this.peek();
    if (token.k === 'num') {
      this.take();
      return { t: 'lit', value: literal(token.text) };
    }
    if (token.k === 'quote') return this.string(null);
    if (token.k === 'format') {
      this.take();
      if (this.peek().k === 'quote') return this.string(token.text);
      return { t: 'format', name: token.text };
    }
    if (token.k === 'field') {
      this.take();
      return { t: 'index', target: { t: 'id' }, key: { t: 'lit', value: token.text } };
    }
    if (token.k === 'var') {
      this.take();
      if (token.text === '__loc__') return { t: 'loc', line: this.lineAt(token.at) };
      return { t: 'var', name: token.text, line: this.lineAt(token.at) };
    }
    if (token.k === 'op') {
      if (token.text === '.') {
        this.take();
        if (this.peek().k === 'quote') return { t: 'index', target: { t: 'id' }, key: this.string(null) };
        return { t: 'id' };
      }
      if (token.text === '..') {
        this.take();
        return { t: 'call', name: 'recurse', args: [], line: 1 };
      }
      if (token.text === '(') {
        this.take();
        const inner = this.pipe();
        this.needOp(')');
        return inner;
      }
      if (token.text === '[') {
        this.take();
        if (this.eatOp(']')) return { t: 'array', body: null };
        const body = this.pipe();
        this.needOp(']');
        return { t: 'array', body };
      }
      if (token.text === '{') return this.object();
      if (token.text === '-') {
        this.take();
        return { t: 'neg', body: this.term() };
      }
      return this.wrong(token);
    }
    if (token.k !== 'id') return this.wrong(token);
    const word = token.text;
    if (word === 'if') return this.conditional();
    if (word === 'try') {
      this.take();
      const body = this.unaryTerm();
      const handler = this.eatWord('catch') ? this.unaryTerm() : null;
      return { t: 'try', body, handler };
    }
    if (word === 'reduce') {
      this.take();
      const source = this.term();
      this.needWord('as');
      const patterns = this.patterns();
      this.needOp('(');
      const init = this.pipe();
      this.needOp(';');
      const update = this.pipe();
      this.needOp(')');
      return { t: 'reduce', source, patterns, init, update };
    }
    if (word === 'foreach') {
      this.take();
      const source = this.term();
      this.needWord('as');
      const patterns = this.patterns();
      this.needOp('(');
      const init = this.pipe();
      this.needOp(';');
      const update = this.pipe();
      const extract = this.eatOp(';') ? this.pipe() : null;
      this.needOp(')');
      return { t: 'foreach', source, patterns, init, update, extract };
    }
    if (word === 'break') {
      this.take();
      const named = this.take();
      if (named.k !== 'var') throw new CompileError(`break requires a label to break to at <top-level>, line ${this.lineAt(named.at)}:`);
      return { t: 'break', name: named.text, line: this.lineAt(token.at) };
    }
    if (word === 'def') {
      const def = this.def();
      return { t: 'def', def, body: this.pipe() };
    }
    if (KEYWORDS.has(word)) return this.wrong(token);
    this.take();
    const args: Node[] = [];
    if (this.eatOp('(')) {
      do args.push(this.pipe());
      while (this.eatOp(';'));
      this.needOp(')');
    }
    if (args.length === 0) {
      if (word === 'null') return { t: 'lit', value: null };
      if (word === 'true') return { t: 'lit', value: true };
      if (word === 'false') return { t: 'lit', value: false };
    }
    return { t: 'call', name: word, args, line: this.lineAt(token.at) };
  }
  private unaryTerm(): Node {
    if (this.eatOp('-')) return { t: 'neg', body: this.term() };
    return this.term();
  }
  private conditional(): Node {
    this.take();
    const cond = this.pipe();
    this.needWord('then');
    const then = this.pipe();
    if (this.isWord('elif')) return { t: 'if', cond, then, else: this.conditional() };
    const otherwise = this.eatWord('else') ? this.pipe() : null;
    this.needWord('end');
    return { t: 'if', cond, then, else: otherwise };
  }
  private object(): Node {
    this.needOp('{');
    const entries: [Node, Node][] = [];
    if (this.eatOp('}')) return { t: 'object', entries };
    do {
      const token = this.peek();
      let key: Node;
      let shorthand: Node | null = null;
      if (token.k === 'var') {
        this.take();
        if (token.text === '__loc__') {
          entries.push([{ t: 'lit', value: '__loc__' }, { t: 'loc', line: this.lineAt(token.at) }]);
          continue;
        }
        entries.push([{ t: 'lit', value: token.text }, { t: 'var', name: token.text, line: this.lineAt(token.at) }]);
        continue;
      } else if (token.k === 'id' || (token.k === 'op' && (token.text === 'and' || token.text === 'or'))) {
        this.take();
        key = { t: 'lit', value: token.text };
        shorthand = { t: 'index', target: { t: 'id' }, key };
      } else if (token.k === 'num') {
        throw new CompileError(`May need parentheses around object key expression at <top-level>, line ${this.lineAt(token.at)}:`);
      } else if (token.k === 'quote' || token.k === 'format') {
        const format = token.k === 'format' ? this.take().text : null;
        key = this.string(format);
        shorthand = { t: 'index', target: { t: 'id' }, key };
      } else if (this.eatOp('(')) {
        key = this.pipe();
        this.needOp(')');
      } else return this.wrong(token);
      if (this.eatOp(':')) entries.push([key, this.objectValue()]);
      else if (shorthand !== null) entries.push([key, shorthand]);
      else this.wrong(this.peek());
    } while (this.eatOp(','));
    this.needOp('}');
    return { t: 'object', entries };
  }
  private objectValue(): Node {
    let left = this.isOp('-') ? (this.take(), { t: 'neg', body: this.term() } as Node) : this.term();
    while (this.eatOp('|')) left = { t: 'pipe', left, right: this.isOp('-') ? (this.take(), { t: 'neg', body: this.term() } as Node) : this.term() };
    return left;
  }
  // A string, from its opening quote, with its `\(…)` parts.
  private string(format: string | null): Node {
    const open = this.peek();
    if (open.k !== 'quote') this.wrong(open);
    this.held = null;
    const { source } = this;
    this.at = open.at + 1;
    const parts: (string | Node)[] = [];
    let text = '';
    for (;;) {
      const char = source[this.at];
      if (char === undefined) throw new CompileError(`syntax error, unexpected end of file, expecting QQSTRING_TEXT or QQSTRING_INTERP_START or QQSTRING_END (Unix shell quoting issues?) at <top-level>, line ${this.lineAt(open.at)}:`);
      if (char === '"') {
        this.at += 1;
        break;
      }
      if (char !== '\\') {
        text += char;
        this.at += 1;
        continue;
      }
      const escape = source[this.at + 1];
      this.at += 2;
      const simple: Record<string, string> = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
      if (escape !== undefined && escape in simple) text += simple[escape];
      else if (escape === 'u') {
        const hex = source.slice(this.at, this.at + 4);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw new CompileError(`invalid \\uXXXX escape at <top-level>, line ${this.lineAt(open.at)}:`);
        text += String.fromCharCode(parseInt(hex, 16));
        this.at += 4;
      } else if (escape === '(') {
        if (text !== '') parts.push(wellFormed(text));
        text = '';
        const inner = this.pipe();
        if (!this.isOp(')')) this.wrong(this.peek());
        this.at = this.peek().at + 1;
        this.held = null;
        parts.push(inner);
      } else throw new CompileError(`syntax error, unexpected INVALID_CHARACTER (Unix shell quoting issues?) at <top-level>, line ${this.lineAt(open.at)}:`);
    }
    if (text !== '') parts.push(wellFormed(text));
    if (parts.every((part) => typeof part === 'string')) return { t: 'lit', value: parts.join('') };
    return { t: 'string', parts, format };
  }
}

// jq's own definitions, parsed once, when the first `jq` runs.
const PRELUDE = String.raw`
def not: if . then false else true end;
def values: select(. != null);
def nulls: select(. == null);
def booleans: select(type == "boolean");
def numbers: select(type == "number");
def strings: select(type == "string");
def arrays: select(type == "array");
def objects: select(type == "object");
def iterables: select(type|. == "array" or . == "object");
def scalars: select(type|. != "array" and . != "object");
def finites: select(isinfinite | not);
def normals: select(isnormal);
def select(f): if f then . else empty end;
def map(f): [.[] | f];
def map_values(f): .[] |= f;
def error(msg): msg|error;
def halt_error: halt_error(5);
def recurse: recurse(.[]?);
def recurse(f; cond): def r: ., (f | select(cond) | r); r;
def add: reduce .[] as $x (null; . + $x);
def del(f): delpaths([path(f)]);
def _assign(paths; $value): reduce path(paths) as $p (.; setpath($p; $value));
def _modify(paths; update):
  reduce path(paths) as $p ([., []];
    . as [$x, $del]
    | label $out
    | (($x | setpath($p; getpath($p) | update)) as $n | [$n, $del], break $out), [$x, $del + [$p]])
  | . as [$x, $del] | $x | delpaths($del);
def to_entries: [keys_unsorted[] as $k | {key: $k, value: .[$k]}];
def from_entries: reduce .[] as $x ({};
  . + { ($x | .key // .k // .name // .Name // .K // .Key):
        ($x | if has("value") then .value elif has("v") then .v elif has("Value") then .Value else .V end) });
def with_entries(f): to_entries | map(f) | from_entries;
def sort_by(f): _sort_by(map([f]));
def group_by(f): _group_by(map([f]));
def unique_by(f): [group_by(f)[] | .[0]];
def unique: unique_by(.);
def max_by(f): _max_by(map([f]));
def min_by(f): _min_by(map([f]));
def reverse: if type == "string" then explode | reverse | implode else [.[length - 1 - range(0;length)]] end;
def indices($i): if type == "array" and ($i|type) == "array" then .[$i]
  elif type == "array" or . == null then .[[$i]]
  elif ($i|type) == "array" then .[$i]
  else _strindices($i) end;
def index($i): indices($i) | .[0];
def rindex($i): indices($i) | .[-1:][0];
def paths: path(..) | select(length > 0);
def paths(node_filter): . as $dot | paths | select(. as $p | $dot | getpath($p) | node_filter);
def leaf_paths: paths(scalars);
def isvalid(f): try (f | true) catch false;
def pick(pathexps): . as $top | reduce path(pathexps) as $p (null; setpath($p; $top | getpath($p)));
def join($x): reduce .[] as $i (null;
  (if . == null then "" else . + $x end) +
  ($i | if . == null then "" elif type == "boolean" or type == "number" then tojson else . end)) // "";
def _flatten($x): reduce .[] as $i ([]; if $i | type == "array" and $x != 0 then . + ($i | _flatten($x - 1)) else . + [$i] end);
def flatten($x): if $x < 0 then error("flatten depth must not be negative") else _flatten($x) end;
def flatten: _flatten(1e9);
def range($x): range(0; $x);
def range($from; $upto; $by):
  if $by > 0 then $from | while(. < $upto; . + $by)
  elif $by < 0 then $from | while(. > $upto; . + $by)
  else empty end;
def fromdateiso8601: strptime("%Y-%m-%dT%H:%M:%SZ") | mktime;
def todateiso8601: strftime("%Y-%m-%dT%H:%M:%SZ");
def fromdate: fromdateiso8601;
def todate: todateiso8601;
def date: todate;
def dateadd(u; n): . + n;
def datesub(u; n): . - n;
def datesub: .;
def match($re; mode): _match($re; mode; false) | .[];
def match($val): ($val|type) as $vt | if $vt == "string" then match($val; null)
  elif $vt == "array" and ($val|length) > 1 then match($val[0]; $val[1])
  elif $vt == "array" and ($val|length) > 0 then match($val[0]; null)
  else error($vt + " not a string or array") end;
def test($re; mode): _match($re; mode; true);
def test($val): ($val|type) as $vt | if $vt == "string" then test($val; null)
  elif $vt == "array" and ($val|length) > 1 then test($val[0]; $val[1])
  elif $vt == "array" and ($val|length) > 0 then test($val[0]; null)
  else error($vt + " not a string or array") end;
def _captures: reduce (.captures | .[] | select(.name != null)) as $c ({}; .[$c.name] = $c.string);
def capture($re; mods): match($re; mods) | _captures;
def capture($val): ($val|type) as $vt | if $vt == "string" then capture($val; null)
  elif $vt == "array" and ($val|length) > 1 then capture($val[0]; $val[1])
  elif $vt == "array" and ($val|length) > 0 then capture($val[0]; null)
  else error($vt + " not a string or array") end;
def scan($re; $flags): match($re; "g" + $flags) | if (.captures|length > 0) then [.captures | .[] | .string] else .string end;
def scan($re): scan($re; null);
def split($re; flags): . as $s
  | [foreach ((match($re; flags + "g") | [.offset, .length]), null) as $m
      ([0, null]; if $m == null then [.[0], $s[.[0]:]] else [$m[0] + $m[1], $s[.[0]:$m[0]]] end; .[1])];
def splits($re; flags): split($re; flags) | .[];
def splits($re): splits($re; null);
def sub($re; str; $flags): . as $in
  | [match($re; $flags)] as $ms
  | if ($ms|length) == 0 then $in
    else [$ms[] | [_captures | str]] as $outs
      | range(0; $outs[0]|length) as $k
      | reduce range(0; $ms|length) as $i ({at: 0, out: ""};
          .at as $at
          | .out = (.out + $in[$at:$ms[$i].offset] + $outs[$i][$k])
          | .at = $ms[$i].offset + $ms[$i].length)
      | .out + $in[.at:]
    end;
def sub($re; str): sub($re; str; "");
def gsub($re; str; $flags): sub($re; str; $flags + "g");
def gsub($re; str): sub($re; str; "g");
def ascii_downcase: explode | map(if 65 <= . and . <= 90 then . + 32 else . end) | implode;
def ascii_upcase: explode | map(if 97 <= . and . <= 122 then . - 32 else . end) | implode;
def walk(f): def w: if type == "object" then map_values(w) elif type == "array" then map(w) else . end | f; w;
def first(f): label $out | (f | ., break $out);
def first: .[0];
def last: .[-1];
def last(f): reduce f as $x (null; $x);
def isempty(g): label $go | (g | false, break $go), true;
def all(generator; condition): isempty(first(generator | condition and empty));
def any(generator; condition): isempty(first(generator | condition or empty)) | not;
def all(f): all(.[]; f);
def any(f): any(.[]; f);
def all: all(.);
def any: any(.);
def limit($n; f): if $n > 0 then label $out | foreach f as $item (0; . + 1; $item, if . >= $n then break $out else empty end)
  elif $n == 0 then empty else f end;
def nth($n): .[$n];
def nth($n; f): if $n < 0 then error("nth doesn't support negative indices")
  else label $out | foreach f as $x ($n + 1; . - 1; if . <= 0 then $x, break $out else empty end) end;
def in(xs): . as $x | xs | has($x);
def inside(xs): . as $x | xs | contains($x);
def combinations: if length == 0 then [] else .[0][] as $x | (.[1:] | combinations) as $w | [$x] + $w end;
def combinations(n): . as $dot | [range(n)] | map($dot) | combinations;
def tostream: path(def r: (.[]?|r), .; r) as $p | getpath($p) | reduce path(.[]?) as $q ([$p, .]; [$p + $q]);
def fromstream(f): {x: null, e: false} as $init
  | foreach f as $i ($init;
      if .e then $init else . end
      | if $i | length == 2
        then setpath(["e"]; $i[0] | length == 0) | setpath(["x"] + $i[0]; $i[1])
        else setpath(["e"]; $i[0] | length == 1) end;
      if .e then .x else empty end);
def truncate_stream(stream): . as $n | null | stream | . as $input | if (.[0]|length) > $n then setpath([0]; .[0][$n:]) else empty end;
def env: $ENV;
def transpose: if . == [] then [] else . as $in | (map(length) | max) as $max | [range(0; $max) as $j | [range(0; $in|length) as $i | $in[$i][$j]]] end;
def ascii: [.] | implode;
def IN(s): any(s == .; .);
def IN(src; s): any(src == s; .);
def INDEX(stream; idx_expr): reduce stream as $row ({}; .[$row | idx_expr | tostring] |= $row);
def INDEX(idx_expr): INDEX(.[]; idx_expr);
def debug(msg): (msg | debug | empty), .;
def inputs: def r: (try input catch (if . == "No more inputs" then empty else error end)) | (., r); r;
def have_literal_numbers: true;
def have_decnum: true;
def get_search_list: [];
`;

type Env =
  | { k: 'var'; name: string; value: JV; next: Env }
  | { k: 'def'; key: string; def: Def; next: Env }
  | { k: 'closure'; key: string; body: Node; env: Env; next: Env }
  | { k: 'label'; name: string; id: object; next: Env }
  | null;
type Path = { path: readonly JV[]; at: JV };
type Out = [JV, Path | null];

let preludeDefs: Map<string, Def> | null = null;
function prelude(): Map<string, Def> {
  if (preludeDefs === null) {
    preludeDefs = new Map();
    for (const def of new Parser(`${PRELUDE}.`).program().defs) preludeDefs.set(def.key, def);
  }
  return preludeDefs;
}

const lookup = (env: Env, key: string) => {
  for (let at = env; at !== null; at = at.next) if ((at.k === 'def' || at.k === 'closure') && at.key === key) return at;
  return null;
};

// ---- Math, text and time ----

function gamma(x: number): number {
  // Lanczos, on the logarithm of |Γ(x)|.
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - gamma(1 - x);
  const g = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  const z = x - 1;
  let sum = g[0]!;
  for (let at = 1; at < 9; at += 1) sum += g[at]! / (z + at);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(sum);
}
const rint = (x: number) => {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
};
const frexp = (x: number): [number, number] => {
  if (x === 0 || !Number.isFinite(x)) return [x, 0];
  let exponent = Math.max(-1023, Math.floor(Math.log2(Math.abs(x))) + 1);
  let mantissa = x * 2 ** -exponent;
  while (Math.abs(mantissa) < 0.5) {
    mantissa *= 2;
    exponent -= 1;
  }
  while (Math.abs(mantissa) >= 1) {
    mantissa /= 2;
    exponent += 1;
  }
  return [mantissa, exponent];
};
const tgamma = (x: number) => (Number.isInteger(x) && x > 0 && x < 171 ? Array.from({ length: x - 1 }, (_, at) => at + 1).reduce((total, each) => total * each, 1) : Math.exp(gamma(x)));
const MATH1: Readonly<Record<string, (x: number) => number>> = {
  floor: Math.floor, ceil: Math.ceil, round: (x) => (x < 0 ? -Math.round(-x) : Math.round(x)), trunc: Math.trunc, sqrt: Math.sqrt, fabs: Math.abs, exp: Math.exp, exp2: (x) => 2 ** x, exp10: (x) => 10 ** x, expm1: Math.expm1,
  log: Math.log, log2: Math.log2, log10: Math.log10, log1p: Math.log1p, sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh, cbrt: Math.cbrt, rint, nearbyint: rint, significand: (x) => (x === 0 || !Number.isFinite(x) ? x : frexp(x)[0] * 2), logb: (x) => (x === 0 ? -Infinity : Number.isFinite(x) ? frexp(x)[1] - 1 : Infinity),
  gamma: tgamma, lgamma: gamma, tgamma,
};
const MATH2: Readonly<Record<string, (x: number, y: number) => number>> = {
  pow: (x, y) => x ** y, atan2: Math.atan2, fmod: (x, y) => x % y, fmin: Math.min, fmax: Math.max, hypot: Math.hypot, ldexp: (x, y) => x * 2 ** y, scalb: (x, y) => x * 2 ** y, scalbln: (x, y) => x * 2 ** y,
  copysign: (x, y) => (Math.sign(y) === -1 || Object.is(y, -0) ? -Math.abs(x) : Math.abs(x)), drem: (x, y) => x - y * rint(x / y), nexttoward: (x) => x, nextafter: (x) => x,
};

const UTF8 = new TextEncoder();
const FROM_UTF8 = new TextDecoder();
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base64(text: string): string {
  const bytes = UTF8.encode(text);
  let out = '';
  for (let at = 0; at < bytes.length; at += 3) {
    const [a, b, c] = [bytes[at]!, bytes[at + 1], bytes[at + 2]];
    out += B64[a >> 2]! + B64[((a & 3) << 4) | ((b ?? 0) >> 4)]! + (b === undefined ? '=' : B64[((b & 15) << 2) | ((c ?? 0) >> 6)]!) + (c === undefined ? '=' : B64[c & 63]!);
  }
  return out;
}
function unbase64(text: string): string {
  const bytes: number[] = [];
  let [bits, value] = [0, 0];
  for (const char of text) {
    if (char === '=') break;
    const at = B64.indexOf(char);
    if (at < 0) return fail(`${described(text)} is not valid base64 data`);
    value = (value << 6) | at;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >> bits) & 255);
    }
  }
  if (bits === 6) return fail(`${described(text)} trailing base64 byte found`);
  return FROM_UTF8.decode(Uint8Array.from(bytes));
}
function base32(text: string): string {
  const bytes = UTF8.encode(text);
  let [out, bits, value] = ['', 0, 0];
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += B32[(value >> bits) & 31];
    }
    value &= (1 << bits) - 1;
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out.padEnd(Math.ceil(out.length / 8) * 8, '=');
}
function unbase32(text: string): string {
  const bytes: number[] = [];
  let [bits, value] = [0, 0];
  for (const char of text) {
    if (char === '=') break;
    const at = B32.indexOf(char);
    if (at < 0) return fail(`${described(text)} is not valid base32 data`);
    value = ((value << 5) | at) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >> bits) & 255);
    }
  }
  return FROM_UTF8.decode(Uint8Array.from(bytes));
}

function format(name: string, value: JV): string {
  switch (name) {
    case '@text':
      return toText(value);
    case '@json':
      return dump(value);
    case '@html':
      return toText(value).replace(/[<>&'"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]!);
    case '@uri':
      return Array.from(UTF8.encode(toText(value)), (byte) => {
        const char = String.fromCharCode(byte);
        return /[A-Za-z0-9\-_.~]/.test(char) ? char : `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
      }).join('');
    case '@csv':
    case '@tsv': {
      const csv = name === '@csv';
      if (!Array.isArray(value)) return fail(`${described(value)} cannot be ${csv ? 'csv' : 'tsv'}-formatted, only array`);
      return value
        .map((each) => {
          if (each === null) return '';
          if (typeof each === 'boolean') return String(each);
          if (isNum(each)) return dump(each);
          if (typeof each === 'string') return csv ? `"${each.replaceAll('"', '""')}"` : each.replace(/[\\\t\n\r]/g, (char) => ({ '\\': '\\\\', '\t': '\\t', '\n': '\\n', '\r': '\\r' })[char]!);
          return fail(`${described(each)} is not valid in a csv row`);
        })
        .join(csv ? ',' : '\t');
    }
    case '@sh': {
      const one = (each: JV) => {
        if (Array.isArray(each) || isObj(each)) return fail(`${described(each)} can not be escaped for shell`);
        return typeof each === 'string' ? `'${each.replaceAll("'", `'\\''`)}'` : dump(each);
      };
      return Array.isArray(value) ? value.map(one).join(' ') : one(value);
    }
    case '@base64':
      return base64(toText(value));
    case '@base64d':
      return unbase64(toText(value));
    case '@base32':
      return base32(toText(value));
    case '@base32d':
      return unbase32(toText(value));
    default:
      return fail(`${name.slice(1)} is not a valid format`);
  }
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const yearDay = (date: Date) => Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86400000);
function brokenDown(seconds: number): JV[] {
  const date = new Date(Math.floor(seconds) * 1000);
  return [date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds() + (seconds - Math.floor(seconds)), date.getUTCDay(), yearDay(date)];
}
function timeOf(value: JV, name: string): number {
  if (!Array.isArray(value)) return fail(`${name} requires array inputs`);
  if (value.length < 6 || value.some((each) => !isNum(each))) return fail(`${name} requires parsed datetime inputs`);
  const [y, mo, d, h, mi, s] = value.map((each) => num(each)) as [number, number, number, number, number, number];
  return Math.floor(Date.UTC(y, mo, d, h, mi, Math.floor(s)) / 1000);
}
function strftime(parts: JV[], pattern: string, zone = 'UTC'): string {
  const [y, mo, d, h, mi, s, wd, yd] = parts.map((each) => Math.floor(num(each))) as [number, number, number, number, number, number, number, number];
  const pad = (value: number, size = 2, fill = '0') => String(value).padStart(size, fill);
  const week = (first: number) => Math.floor((yd + 7 - ((wd - first + 7) % 7)) / 7);
  const isoWeek = () => {
    const date = new Date(Date.UTC(y, mo, d));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const start = Date.UTC(date.getUTCFullYear(), 0, 1);
    return { year: date.getUTCFullYear(), week: Math.ceil(((date.getTime() - start) / 86400000 + 1) / 7) };
  };
  const one = (code: string): string => {
    switch (code) {
      case 'Y': return String(y);
      case 'C': return pad(Math.floor(y / 100));
      case 'y': return pad(y % 100);
      case 'm': return pad(mo + 1);
      case 'd': return pad(d);
      case 'e': return pad(d, 2, ' ');
      case 'H': return pad(h);
      case 'I': return pad(h % 12 || 12);
      case 'k': return pad(h, 2, ' ');
      case 'l': return pad(h % 12 || 12, 2, ' ');
      case 'M': return pad(mi);
      case 'S': return pad(s);
      case 'Z': return zone;
      case 'z': return '+0000';
      case 'a': return DAYS[wd]!.slice(0, 3);
      case 'A': return DAYS[wd]!;
      case 'b': case 'h': return MONTHS[mo]!.slice(0, 3);
      case 'B': return MONTHS[mo]!;
      case 'j': return pad(yd + 1, 3);
      case 'p': return h < 12 ? 'AM' : 'PM';
      case 'P': return h < 12 ? 'am' : 'pm';
      case 's': return String(Math.floor(Date.UTC(y, mo, d, h, mi, s) / 1000));
      case 'u': return String(wd || 7);
      case 'w': return String(wd);
      case 'U': return pad(week(0));
      case 'W': return pad(week(1));
      case 'V': return pad(isoWeek().week);
      case 'G': return String(isoWeek().year);
      case 'g': return pad(isoWeek().year % 100);
      case 'D': return `${one('m')}/${one('d')}/${one('y')}`;
      case 'F': return `${y}-${one('m')}-${one('d')}`;
      case 'T': return `${one('H')}:${one('M')}:${one('S')}`;
      case 'R': return `${one('H')}:${one('M')}`;
      case 'r': return `${one('I')}:${one('M')}:${one('S')} ${one('p')}`;
      case 'c': return `${one('a')} ${one('b')} ${one('e')} ${one('T')} ${y}`;
      case 'x': return one('D');
      case 'X': return one('T');
      case 'n': return '\n';
      case 't': return '\t';
      case '%': return '%';
      default: return `%${code}`;
    }
  };
  return pattern.replace(/%([a-zA-Z%])/g, (_, code: string) => one(code));
}
function strptime(text: string, pattern: string): JV[] {
  const wrong = () => fail(`date "${text}" does not match format "${pattern}"`);
  let at = 0;
  const now = { y: 1900, mo: 0, d: 1, h: 0, mi: 0, s: 0, pm: null as boolean | null, epoch: null as number | null, yday: null as number | null };
  const digits = (most: number) => {
    const match = new RegExp(`^[+-]?\\d{1,${most}}`).exec(text.slice(at));
    if (match === null) return wrong();
    at += match[0].length;
    return Number(match[0]);
  };
  const name = (list: readonly string[]) => {
    const rest = text.slice(at).toLowerCase();
    for (const [index, each] of list.entries()) {
      for (const form of [each, each.slice(0, 3)]) {
        if (rest.startsWith(form.toLowerCase())) {
          at += form.length;
          return index;
        }
      }
    }
    return wrong();
  };
  const run = (form: string) => {
    for (let by = 0; by < form.length; by += 1) {
      const char = form[by]!;
      if (char !== '%') {
        if (/\s/.test(char)) {
          while (/\s/.test(text[at] ?? '')) at += 1;
        } else if (text[at] === char) at += 1;
        else wrong();
        continue;
      }
      by += 1;
      switch (form[by]) {
        case 'Y': now.y = digits(4); break;
        case 'y': { const y = digits(2); now.y = y < 69 ? 2000 + y : 1900 + y; break; }
        case 'm': now.mo = digits(2) - 1; break;
        case 'd': case 'e': while (text[at] === ' ') at += 1; now.d = digits(2); break;
        case 'H': case 'k': now.h = digits(2); break;
        case 'I': case 'l': now.h = digits(2) % 12; break;
        case 'M': now.mi = digits(2); break;
        case 'S': now.s = digits(2); break;
        case 'j': now.yday = digits(3) - 1; break;
        case 'a': case 'A': name(DAYS); break;
        case 'b': case 'B': case 'h': now.mo = name(MONTHS); break;
        case 'p': case 'P': { const word = text.slice(at, at + 2).toUpperCase(); if (word !== 'AM' && word !== 'PM') wrong(); now.pm = word === 'PM'; at += 2; break; }
        case 's': now.epoch = digits(20); break;
        case 'Z': { const match = /^[A-Za-z]+/.exec(text.slice(at)); if (match === null) wrong(); at += match![0].length; break; }
        case 'z': { const match = /^(?:Z|[+-]\d{2}:?\d{2})/.exec(text.slice(at)); if (match === null) wrong(); at += match![0].length; break; }
        case 'T': run('%H:%M:%S'); break;
        case 'D': run('%m/%d/%y'); break;
        case 'F': run('%Y-%m-%d'); break;
        case 'R': run('%H:%M'); break;
        case 'c': run('%a %b %e %H:%M:%S %Y'); break;
        case 'n': case 't': while (/\s/.test(text[at] ?? '')) at += 1; break;
        case '%': if (text[at] !== '%') wrong(); at += 1; break;
        default: wrong();
      }
    }
  };
  run(pattern);
  if (at !== text.length) wrong();
  if (now.epoch !== null) return brokenDown(now.epoch);
  if (now.pm !== null) now.h += now.pm ? 12 : 0;
  if (now.yday !== null) {
    const date = new Date(Date.UTC(now.y, 0, 1 + now.yday));
    now.mo = date.getUTCMonth();
    now.d = date.getUTCDate();
  }
  const date = new Date(Date.UTC(now.y, now.mo, now.d));
  return [now.y, now.mo, now.d, now.h, now.mi, now.s, date.getUTCDay(), yearDay(date)];
}

// `(?<name>…)`, POSIX classes and `x`: what Oniguruma's Perl syntax reads and
// JavaScript's doesn't.
const POSIX: Readonly<Record<string, string>> = { alnum: '\\p{L}\\p{N}', alpha: '\\p{L}', blank: ' \\t', cntrl: '\\p{Cc}', digit: '\\d', graph: '\\p{L}\\p{N}\\p{P}\\p{S}', lower: '\\p{Ll}', print: '\\p{L}\\p{N}\\p{P}\\p{S}\\p{Zs}', punct: '\\p{P}\\p{S}', space: '\\s', upper: '\\p{Lu}', word: '\\w', xdigit: '0-9A-Fa-f' };
function regexOf(source: string, flags: string): RegExp {
  let pattern = source.replace(/\[:(\^?)([a-z]+):\]/g, (whole, not: string, name: string) => (POSIX[name] === undefined || not !== '' ? whole : POSIX[name]));
  pattern = pattern.replace(/\\h/g, '[0-9A-Fa-f]').replace(/\\H/g, '[^0-9A-Fa-f]').replace(/\\A/g, '^').replace(/\\[zZ]/g, '$');
  if (flags.includes('x')) {
    let out = '';
    let [inClass, escaped] = [false, false];
    for (let at = 0; at < pattern.length; at += 1) {
      const char = pattern[at]!;
      if (escaped) {
        out += char;
        escaped = false;
      } else if (char === '\\') {
        out += char;
        escaped = true;
      } else if (inClass) {
        out += char;
        if (char === ']') inClass = false;
      } else if (char === '[') {
        out += char;
        inClass = true;
      } else if (char === '#') {
        while (at < pattern.length && pattern[at] !== '\n') at += 1;
      } else if (!/\s/.test(char)) out += char;
    }
    pattern = out;
  }
  const js = `dg${flags.includes('i') ? 'i' : ''}${flags.includes('p') ? 's' : ''}`;
  try {
    return new RegExp(pattern, `${js}u`);
  } catch {
    try {
      return new RegExp(pattern, js);
    } catch (error) {
      return fail(`${source} (at offset 0) is not a valid regex: ${(error as Error).message}`);
    }
  }
}
function matchAll(input: JV, re: JV, flagsValue: JV, testOnly: boolean): JV {
  if (typeof input !== 'string') return fail(`${described(input)} cannot be matched, as it is not a string`);
  if (typeof re !== 'string') return fail(`${described(re)} cannot be matched, as it is not a string`);
  if (flagsValue !== null && typeof flagsValue !== 'string') return fail(`${dump(flagsValue)} (${kind(flagsValue)}) is not a string`);
  const flags = flagsValue ?? '';
  for (const char of flags) if (!'gimnpsxl'.includes(char)) return fail(`${flags} is not a valid modifier string`);
  const regex = regexOf(re, flags);
  const global = flags.includes('g');
  const skipEmpty = flags.includes('n');
  const cp = (at: number) => [...input.slice(0, at)].length;
  const out: JV[] = [];
  let from = 0;
  const names = new Map<number, string>();
  let group = 0;
  for (const match of re.matchAll(/\\.|\((\?(<([A-Za-z_]\w*)>)?)?/g)) {
    if (match[0].startsWith('\\') || (match[1] !== undefined && match[3] === undefined)) continue;
    group += 1;
    if (match[3] !== undefined) names.set(group, match[3]);
  }
  while (from <= input.length) {
    const started = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
    started.lastIndex = from;
    const found = started.exec(input);
    if (found === null) break;
    const at = found.index;
    const text = found[0];
    if (!(skipEmpty && text === '')) {
      if (testOnly) return true;
      const indices = (found as RegExpExecArray & { indices: ([number, number] | undefined)[] }).indices;
      const captures: JV[] = [];
      for (let each = 1; each < found.length; each += 1) {
        const span = indices[each];
        const name = names.get(each) ?? null;
        const offset = span === undefined ? -1 : cp(span[0]);
        // An empty capture is written in another order, by jq's own code.
        captures.push(
          found[each] === undefined || found[each] === ''
            ? new Map<string, JV>([['offset', offset], ['string', found[each] ?? null], ['length', 0], ['name', name]])
            : new Map<string, JV>([['offset', offset], ['length', [...found[each]!].length], ['string', found[each]!], ['name', name]]),
        );
      }
      out.push(new Map<string, JV>([['offset', cp(at)], ['length', [...text].length], ['string', text], ['captures', captures]]));
    }
    if (!global) break;
    from = text === '' ? at + (input.codePointAt(at) !== undefined && input.codePointAt(at)! > 0xffff ? 2 : 1) : at + text.length;
  }
  return testOnly ? false : out;
}

// ---- Evaluation ----

function arithmetic(op: string, a: JV, b: JV): JV {
  switch (op) {
    case '+':
      if (a === null) return b;
      if (b === null) return a;
      if (isNum(a) && isNum(b)) return num(a) + num(b);
      if (typeof a === 'string' && typeof b === 'string') return a + b;
      if (Array.isArray(a) && Array.isArray(b)) return [...a, ...b];
      if (isObj(a) && isObj(b)) return new Map([...a, ...b]);
      return fail(`${described(a)} and ${described(b)} cannot be added`);
    case '-':
      if (isNum(a) && isNum(b)) return num(a) - num(b);
      if (Array.isArray(a) && Array.isArray(b)) return a.filter((each) => !b.some((other) => compare(each, other) === 0));
      return fail(`${described(a)} and ${described(b)} cannot be subtracted`);
    case '*': {
      if (isNum(a) && isNum(b)) return num(a) * num(b);
      const [text, count] = typeof a === 'string' && isNum(b) ? [a, num(b)] : typeof b === 'string' && isNum(a) ? [b, num(a)] : [null, 0];
      if (text !== null) return count <= 0 ? '' : text.repeat(Math.floor(count));
      if (isObj(a) && isObj(b)) return deepMerge(a, b);
      return fail(`${described(a)} and ${described(b)} cannot be multiplied`);
    }
    case '/':
      if (isNum(a) && isNum(b)) {
        if (num(b) === 0) return fail(`${described(a)} and ${described(b)} cannot be divided because the divisor is zero`);
        return num(a) / num(b);
      }
      if (typeof a === 'string' && typeof b === 'string') return splitText(a, b);
      return fail(`${described(a)} and ${described(b)} cannot be divided`);
    case '%': {
      if (!isNum(a) || !isNum(b)) return fail(`${described(a)} and ${described(b)} cannot be divided`);
      const [x, y] = [num(a), num(b)];
      if (Number.isNaN(x) || Number.isNaN(y)) return NaN;
      const clamp = (value: number) => Math.trunc(Math.max(-9223372036854775808, Math.min(9223372036854775807, value)));
      const divisor = Math.abs(clamp(y));
      if (divisor === 0) return fail(`${described(a)} and ${described(b)} cannot be divided (remainder) because the divisor is zero`);
      const out = clamp(x) % divisor;
      return out === 0 ? 0 : out;
    }
    case '==':
      return compare(a, b) === 0;
    case '!=':
      return compare(a, b) !== 0;
    case '<':
      return compare(a, b) < 0;
    case '<=':
      return compare(a, b) <= 0;
    case '>':
      return compare(a, b) > 0;
    default:
      return compare(a, b) >= 0;
  }
}
function deepMerge(a: JObject, b: JObject): JObject {
  const out = new Map(a);
  for (const [key, value] of b) {
    const old = out.get(key);
    out.set(key, old !== undefined && isObj(old) && isObj(value) ? deepMerge(old, value) : value);
  }
  return out;
}
function splitText(text: string, by: string): JV[] {
  if (text === '') return [];
  return by === '' ? [...text] : text.split(by);
}
function contains(a: JV, b: JV): boolean {
  if (isObj(a) && isObj(b)) return [...b].every(([key, value]) => a.has(key) && contains(a.get(key)!, value));
  if (Array.isArray(a) && Array.isArray(b)) return b.every((want) => a.some((each) => contains(each, want)));
  if (typeof a === 'string' && typeof b === 'string') return a.includes(b);
  if (kind(a) === kind(b)) return compare(a, b) === 0;
  return fail(`${described(a)} and ${described(b)} cannot have their containment checked`);
}
const sortCheck = (value: JV, what: string): JV[] => (Array.isArray(value) ? value : fail(what === 'iterated over' ? `${described(value)} and ${described(value)} cannot be iterated over` : `${described(value)} cannot be ${what}, as it is not an array`));
function byKeys(value: JV, keys: JV, what: string): { item: JV; key: JV }[] {
  const list = sortCheck(value, what);
  const keyed = (keys as JV[]).map((key, at) => ({ item: list[at]!, key, at }));
  return keyed.sort((a, b) => compare(a.key, b.key) || a.at - b.at);
}

// What jq's C functions do, each with one value per argument: the last
// argument's values are the outer loop.
type Native = (input: JV, ...args: JV[]) => JV;
const NATIVE: Readonly<Record<string, Native>> = {
  'length/0': (v) => {
    if (v === null) return 0;
    if (typeof v === 'boolean') return fail(`${described(v)} has no length`);
    if (isNum(v)) return Math.abs(num(v));
    if (typeof v === 'string') return [...v].length;
    return Array.isArray(v) ? v.length : v.size;
  },
  'utf8bytelength/0': (v) => (typeof v === 'string' ? UTF8.encode(v).length : fail(`${described(v)} only strings have UTF-8 byte length`)),
  'keys/0': (v) => (isObj(v) ? sortedKeys(v) : Array.isArray(v) ? v.map((_, at) => at) : fail(`${described(v)} has no keys`)),
  'keys_unsorted/0': (v) => (isObj(v) ? [...v.keys()] : Array.isArray(v) ? v.map((_, at) => at) : fail(`${described(v)} has no keys`)),
  'has/1': (v, key) => {
    if (v === null) return false;
    if (isObj(v) && typeof key === 'string') return v.has(key);
    if (Array.isArray(v) && isNum(key)) return num(key) >= 0 && num(key) < v.length;
    return fail(`Cannot check whether ${kind(v)} has a ${kind(key) === 'string' ? 'string' : kind(key)} key`);
  },
  'contains/1': (v, other) => contains(v, other),
  'type/0': (v) => kind(v),
  'tostring/0': (v) => toText(v),
  'tojson/0': (v) => dump(v),
  'tonumber/0': (v) => {
    if (isNum(v)) return v;
    if (typeof v !== 'string') return fail(`${described(v)} cannot be parsed as a number`);
    try {
      const value = parseOne(v);
      return isNum(value) ? value : fail(`${described(v)} cannot be parsed as a number`);
    } catch (error) {
      if (error instanceof SyntaxError) return fail(`${error.message} (while parsing '${v}')`);
      throw error;
    }
  },
  'fromjson/0': (v) => {
    if (typeof v !== 'string') return fail(`${described(v)} only strings can be parsed`);
    try {
      return parseOne(v);
    } catch (error) {
      if (error instanceof SyntaxError) return fail(`${error.message} (while parsing '${v}')`);
      throw error;
    }
  },
  'ltrimstr/1': (v, x) => (typeof v === 'string' && typeof x === 'string' && v.startsWith(x) ? v.slice(x.length) : v),
  'rtrimstr/1': (v, x) => (typeof v === 'string' && typeof x === 'string' && v.endsWith(x) && x !== '' ? v.slice(0, v.length - x.length) : v),
  'trim/0': (v) => (typeof v === 'string' ? v.replace(/^[\s]+|[\s]+$/g, '') : fail(`${described(v)} cannot be trimmed`)),
  'ltrim/0': (v) => (typeof v === 'string' ? v.replace(/^[\s]+/, '') : fail(`${described(v)} cannot be trimmed`)),
  'rtrim/0': (v) => (typeof v === 'string' ? v.replace(/[\s]+$/, '') : fail(`${described(v)} cannot be trimmed`)),
  'startswith/1': (v, x) => (typeof v === 'string' && typeof x === 'string' ? v.startsWith(x) : fail('startswith() requires string inputs')),
  'endswith/1': (v, x) => (typeof v === 'string' && typeof x === 'string' ? v.endsWith(x) : fail('endswith() requires string inputs')),
  'explode/0': (v) => (typeof v === 'string' ? Array.from(v, (char) => char.codePointAt(0)!) : fail('explode input must be a string')),
  'implode/0': (v) => {
    if (!Array.isArray(v)) return fail('implode input must be an array');
    return v
      .map((each) => {
        if (!isNum(each)) return fail('Unicode codepoint must be numeric');
        const code = Math.floor(num(each));
        return code < 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff) ? '�' : String.fromCodePoint(code);
      })
      .join('');
  },
  'split/1': (v, by) => (typeof v === 'string' && typeof by === 'string' ? splitText(v, by) : fail('split input and separator must be strings')),
  '_strindices/1': (v, x) => {
    if (typeof v !== 'string' || typeof x !== 'string') return fail(`Cannot determine indices of ${kind(x)} in ${kind(v)}`);
    const out: JV[] = [];
    if (x === '') return out;
    for (let at = v.indexOf(x); at !== -1; at = v.indexOf(x, at + 1)) out.push(UTF8.encode(v.slice(0, at)).length);
    return out;
  },
  'sort/0': (v) => [...sortCheck(v, 'sorted')].map((item, at) => ({ item, at })).sort((a, b) => compare(a.item, b.item) || a.at - b.at).map((each) => each.item),
  '_sort_by/1': (v, keys) => byKeys(v, keys, 'sorted').map((each) => each.item),
  '_group_by/1': (v, keys) => {
    const out: JV[][] = [];
    let last: JV | undefined;
    for (const { item, key } of byKeys(v, keys, 'grouped')) {
      if (last !== undefined && compare(last, key) === 0) out.at(-1)!.push(item);
      else out.push([item]);
      last = key;
    }
    return out;
  },
  'min/0': (v) => {
    let best: JV = null;
    sortCheck(v, 'iterated over').forEach((each, at) => {
      if (at === 0 || compare(each, best) < 0) best = each;
    });
    return best;
  },
  'max/0': (v) => {
    let best: JV = null;
    sortCheck(v, 'iterated over').forEach((each, at) => {
      if (at === 0 || compare(each, best) >= 0) best = each;
    });
    return best;
  },
  '_min_by/1': (v, keys) => {
    const list = sortCheck(v, 'iterated over');
    let at = -1;
    list.forEach((_, each) => {
      if (at < 0 || compare((keys as JV[])[each]!, (keys as JV[])[at]!) < 0) at = each;
    });
    return list[at] ?? null;
  },
  '_max_by/1': (v, keys) => {
    const list = sortCheck(v, 'iterated over');
    let at = -1;
    list.forEach((_, each) => {
      if (at < 0 || compare((keys as JV[])[each]!, (keys as JV[])[at]!) >= 0) at = each;
    });
    return list[at] ?? null;
  },
  'setpath/2': (v, path, value) => (Array.isArray(path) ? setPath(v, path, value) : fail('Path must be specified as an array')),
  'delpaths/1': (v, paths) => {
    if (!Array.isArray(paths)) return fail('Paths must be specified as an array');
    for (const path of paths) if (!Array.isArray(path)) return fail(`Path must be specified as array, not ${kind(path)}`);
    return [...(paths as JV[][])].sort((a, b) => compare(b, a)).reduce<JV>((out, path) => deletePath(out, path), v);
  },
  'infinite/0': () => Infinity,
  'nan/0': () => NaN,
  'isinfinite/0': (v) => (isNum(v) ? Math.abs(num(v)) === Infinity : fail(`${described(v)} number required`)),
  'isnan/0': (v) => (isNum(v) ? Number.isNaN(num(v)) : fail(`${described(v)} number required`)),
  'isnormal/0': (v) => {
    if (!isNum(v)) return fail(`${described(v)} number required`);
    const x = Math.abs(num(v));
    return Number.isFinite(x) && x >= 2.2250738585072014e-308;
  },
  'now/0': () => Date.now() / 1000,
  'mktime/0': (v) => timeOf(v, 'mktime'),
  'gmtime/0': (v) => (isNum(v) ? brokenDown(num(v)) : fail('gmtime() requires numeric inputs')),
  'localtime/0': (v) => (isNum(v) ? brokenDown(num(v)) : fail('localtime() requires numeric inputs')),
  'strftime/1': (v, pattern) => {
    const parts = isNum(v) ? brokenDown(num(v)) : v;
    if (!Array.isArray(parts)) return fail('strftime/1 requires parsed datetime inputs');
    if (typeof pattern !== 'string') return fail('strftime/1 requires a string format');
    timeOf(parts, 'strftime/1');
    return strftime(parts, pattern);
  },
  'strflocaltime/1': (v, pattern) => {
    const parts = isNum(v) ? brokenDown(num(v)) : v;
    if (!Array.isArray(parts)) return fail('strflocaltime/1 requires parsed datetime inputs');
    if (typeof pattern !== 'string') return fail('strflocaltime/1 requires a string format');
    timeOf(parts, 'strflocaltime/1');
    return strftime(parts, pattern);
  },
  'strptime/1': (v, pattern) => {
    if (typeof v !== 'string') return fail(`strptime/1 requires string inputs and arguments`);
    if (typeof pattern !== 'string') return fail(`strptime/1 requires string inputs and arguments`);
    return strptime(v, pattern);
  },
  '_match/3': (v, re, flags, testOnly) => matchAll(v, re, flags, testOnly === true),
  'lgamma_r/0': (v) => (isNum(v) ? [gamma(num(v)), num(v) < 0 && Math.floor(num(v)) % 2 !== 0 ? -1 : 1] : fail(`${described(v)} number required`)),
  'frexp/0': (v) => (isNum(v) ? frexp(num(v)) : fail(`${described(v)} number required`)),
  'modf/0': (v) => {
    if (!isNum(v)) return fail(`${described(v)} number required`);
    const x = num(v);
    return [Number.isFinite(x) ? x - Math.trunc(x) : 0, Math.trunc(x)];
  },
  'fma/3': (_, a, b, c) => num(a) * num(b) + num(c),
  'builtins/0': () => [...new Set([...prelude().keys(), ...Object.keys(NATIVE), ...Object.keys(MATH1).map((name) => `${name}/0`), ...Object.keys(MATH2).map((name) => `${name}/2`)])].filter((name) => !name.startsWith('_')),
};
const SPECIAL = new Set(['empty/0', 'error/0', 'path/1', 'getpath/1', 'input/0', 'debug/0', 'stderr/0', 'input_filename/0', 'input_line_number/0', 'halt/0', 'halt_error/1', 'range/2', 'recurse/1', 'repeat/1', 'while/2', 'until/2']);
const nativeOf = (key: string): Native | null => {
  const direct = NATIVE[key];
  if (direct !== undefined) return direct;
  const [name, arity] = key.split('/') as [string, string];
  if (arity === '0' && MATH1[name] !== undefined) {
    const math = MATH1[name];
    return (v) => (isNum(v) ? math(num(v)) : fail(`${described(v)} number required`));
  }
  if (arity === '2' && MATH2[name] !== undefined) {
    const math = MATH2[name];
    return (_, a, b) => (isNum(a) && isNum(b) ? math(num(a), num(b)) : fail(`${described(isNum(a) ? b : a)} number required`));
  }
  return null;
};
const known = (key: string) => SPECIAL.has(key) || prelude().has(key) || nativeOf(key) !== null;

type Runner = {
  steps: number;
  deadline: number;
  stderr: (text: string) => void;
  nextInput: () => JV | undefined;
  filename: () => JV;
  line: () => number;
  env: JV;
};

const sameValue = (value: JV, at: JV) => value === at || (isNum(value) && isNum(at) && (num(value) === num(at) || (Number.isNaN(num(value)) && Number.isNaN(num(at)))));
function intact(value: JV, state: Path): void {
  if (!sameValue(value, state.at)) fail(`Invalid path expression with result ${brief(value)}`);
}

function evaluator(run: Runner) {
  function* ev(node: Node, env: Env, input: JV, state: Path | null): Generator<Out, void, undefined> {
    run.steps += 1;
    if ((run.steps & 0xfff) === 0 && Date.now() > run.deadline) throw new JqStopped('time');
    switch (node.t) {
      case 'id':
        yield [input, state];
        return;
      case 'lit':
        yield [node.value, state];
        return;
      case 'index':
        for (const [target, at] of ev(node.target, env, input, state)) {
          for (const [key] of ev(node.key, env, input, null)) yield step(target, key, at);
        }
        return;
      case 'slice':
        for (const [target, at] of ev(node.target, env, input, state)) {
          for (const [to] of node.to === null ? ([[null, null]] as Out[]) : ev(node.to, env, input, null)) {
            for (const [from] of node.from === null ? ([[null, null]] as Out[]) : ev(node.from, env, input, null)) {
              yield step(target, new Map<string, JV>([['start', from], ['end', to]]), at);
            }
          }
        }
        return;
      case 'iterate':
        for (const [target, at] of ev(node.target, env, input, state)) {
          if (at !== null && !sameValue(target, at.at)) fail(`Invalid path expression near attempt to iterate through ${brief(target)}`);
          if (Array.isArray(target)) {
            for (let each = 0; each < target.length; each += 1) yield [target[each]!, at === null ? null : { path: [...at.path, each], at: target[each]! }];
          } else if (isObj(target)) {
            for (const [key, value] of target) yield [value, at === null ? null : { path: [...at.path, key], at: value }];
          } else fail(`Cannot iterate over ${described(target)}`);
        }
        return;
      case 'try': {
        const body = ev(node.body, env, input, state);
        for (;;) {
          let next: IteratorResult<Out, void>;
          try {
            next = body.next();
          } catch (error) {
            if (!(error instanceof JqError)) throw error;
            if (node.handler !== null) yield* ev(node.handler, env, error.value, null);
            return;
          }
          if (next.done === true) return;
          yield next.value;
        }
      }
      case 'pipe':
        for (const [value, at] of ev(node.left, env, input, state)) yield* ev(node.right, env, value, at);
        return;
      case 'comma':
        yield* ev(node.left, env, input, state);
        yield* ev(node.right, env, input, state);
        return;
      case 'neg':
        for (const [value] of ev(node.body, env, input, null)) yield [isNum(value) ? -num(value) : fail(`${described(value)} cannot be negated`), state];
        return;
      case 'bin':
        for (const [right] of ev(node.right, env, input, null)) {
          for (const [left] of ev(node.left, env, input, null)) yield [arithmetic(node.op, left, right), state];
        }
        return;
      case 'and':
        for (const [left] of ev(node.left, env, input, null)) {
          if (!truthy(left)) yield [false, state];
          else for (const [right] of ev(node.right, env, input, null)) yield [truthy(right), state];
        }
        return;
      case 'or':
        for (const [left] of ev(node.left, env, input, null)) {
          if (truthy(left)) yield [true, state];
          else for (const [right] of ev(node.right, env, input, null)) yield [truthy(right), state];
        }
        return;
      case 'alt': {
        let any = false;
        for (const out of ev(node.left, env, input, state)) {
          if (!truthy(out[0])) continue;
          any = true;
          yield out;
        }
        if (!any) yield* ev(node.right, env, input, state);
        return;
      }
      case 'if':
        for (const [cond] of ev(node.cond, env, input, null)) {
          if (truthy(cond)) yield* ev(node.then, env, input, state);
          else if (node.else === null) yield [input, state];
          else yield* ev(node.else, env, input, state);
        }
        return;
      case 'as':
        for (const [value] of ev(node.source, env, input, null)) yield* bound(node.patterns, value, env, input, (inner) => ev(node.body, inner, input, state));
        return;
      case 'reduce':
        for (const start of ev(node.init, env, input, state)) {
          let current: Out = start;
          for (const [value] of ev(node.source, env, input, null)) {
            const held = current;
            for (const inner of binds(node.patterns, value, env, input)) {
              const before: Out = current;
              let last: Out | null = null;
              for (const out of ev(node.update, inner, before[0], before[1])) last = out;
              current = last ?? [null, held[1]];
            }
          }
          yield current;
        }
        return;
      case 'foreach':
        for (const start of ev(node.init, env, input, state)) {
          let current: Out = start;
          for (const [value] of ev(node.source, env, input, null)) {
            for (const inner of binds(node.patterns, value, env, input)) {
              const before: Out = current;
              current = [null, before[1]];
              for (const out of ev(node.update, inner, before[0], before[1])) {
                current = out;
                if (node.extract === null) yield out;
                else yield* ev(node.extract, inner, out[0], out[1]);
              }
            }
          }
        }
        return;
      case 'def':
        yield* ev(node.body, { k: 'def', key: node.def.key, def: node.def, next: env }, input, state);
        return;
      case 'call':
        yield* call(node, env, input, state);
        return;
      case 'var': {
        for (let at = env; at !== null; at = at.next) {
          if (at.k === 'var' && at.name === node.name) {
            yield [at.value, state];
            return;
          }
        }
        if (node.name === 'ENV') {
          yield [run.env, state];
          return;
        }
        fail(`$${node.name} is not defined`);
        return;
      }
      case 'loc':
        yield [new Map<string, JV>([['file', '<top-level>'], ['line', node.line]]), state];
        return;
      case 'label': {
        const id = {};
        try {
          yield* ev(node.body, { k: 'label', name: node.name, id, next: env }, input, state);
        } catch (error) {
          if (!(error instanceof JqBreak) || error.id !== id) throw error;
        }
        return;
      }
      case 'break':
        for (let at = env; at !== null; at = at.next) if (at.k === 'label' && at.name === node.name) throw new JqBreak(at.id);
        fail(`$*label-${node.name} is not defined`);
        return;
      case 'format':
        yield [format(node.name, input), state];
        return;
      case 'string':
        for (const text of joined(node.parts, node.format, node.parts.length - 1, env, input)) yield [text, state];
        return;
      case 'array': {
        const out: JV[] = [];
        if (node.body !== null) for (const [value] of ev(node.body, env, input, null)) out.push(value);
        yield [out, state];
        return;
      }
      case 'object':
        for (const value of built(node.entries, 0, new Map(), env, input)) yield [value, state];
    }
  }

  function step(target: JV, key: JV, at: Path | null): Out {
    if (at === null) return [getIndex(target, key), null];
    if (!sameValue(target, at.at)) fail(`Invalid path expression near attempt to access element ${brief(key)} of ${brief(target)}`);
    const value = getIndex(target, key);
    return [value, { path: [...at.path, key], at: value }];
  }

  function* joined(parts: readonly (string | Node)[], fmt: string | null, at: number, env: Env, input: JV): Generator<string, void, undefined> {
    if (at < 0) {
      yield '';
      return;
    }
    const part = parts[at]!;
    if (typeof part === 'string') {
      for (const before of joined(parts, fmt, at - 1, env, input)) yield before + part;
      return;
    }
    for (const [value] of ev(part, env, input, null)) {
      const text = fmt === null ? toText(value) : format(fmt, value);
      for (const before of joined(parts, fmt, at - 1, env, input)) yield before + text;
    }
  }

  function* built(entries: readonly [Node, Node][], at: number, sofar: JObject, env: Env, input: JV): Generator<JV, void, undefined> {
    if (at === entries.length) {
      yield sofar;
      return;
    }
    const [keyNode, valueNode] = entries[at]!;
    for (const [key] of ev(keyNode, env, input, null)) {
      if (typeof key !== 'string') fail(`Cannot use ${described(key)} as object key`);
      for (const [value] of ev(valueNode, env, input, null)) yield* built(entries, at + 1, new Map(sofar).set(key as string, value), env, input);
    }
  }

  function* destructure(pattern: Pattern, value: JV, env: Env, input: JV): Generator<Env, void, undefined> {
    if (pattern.p === 'var') {
      yield { k: 'var', name: pattern.name, value, next: env };
      return;
    }
    if (pattern.p === 'array') {
      if (value !== null && !Array.isArray(value)) fail(`Cannot index ${kind(value)} with number`);
      const go = function* (at: number, inner: Env): Generator<Env, void, undefined> {
        if (at === pattern.items.length) {
          yield inner;
          return;
        }
        for (const next of destructure(pattern.items[at]!, value === null ? null : ((value as JV[])[at] ?? null), inner, input)) yield* go(at + 1, next);
      };
      yield* go(0, env);
      return;
    }
    const go = function* (at: number, inner: Env): Generator<Env, void, undefined> {
      if (at === pattern.entries.length) {
        yield inner;
        return;
      }
      const entry = pattern.entries[at]!;
      for (const [key] of ev(entry.key!, inner, input, null)) {
        if (typeof key !== 'string') fail(`Cannot index ${kind(value)} with ${kind(key)}`);
        const item = getIndex(value, key);
        const withVar: Env = entry.variable === null ? inner : { k: 'var', name: entry.variable, value: item, next: inner };
        if (entry.value === null) yield* go(at + 1, withVar);
        else for (const next of destructure(entry.value, item, withVar, input)) yield* go(at + 1, next);
      }
    };
    yield* go(0, env);
  }

  const patternNames = (pattern: Pattern, out: Set<string>) => {
    if (pattern.p === 'var') out.add(pattern.name);
    else if (pattern.p === 'array') for (const item of pattern.items) patternNames(item, out);
    else {
      for (const entry of pattern.entries) {
        if (entry.variable !== null) out.add(entry.variable);
        if (entry.value !== null) patternNames(entry.value, out);
      }
    }
    return out;
  };
  function* binds(patterns: readonly Pattern[], value: JV, env: Env, input: JV): Generator<Env, void, undefined> {
    yield* bound(patterns, value, env, input, function* (inner) {
      yield inner;
    });
  }
  // `?//`: every pattern's variables start null, and an error moves to the next.
  function* bound<T>(patterns: readonly Pattern[], value: JV, env: Env, input: JV, body: (inner: Env) => Generator<T, void, undefined>): Generator<T, void, undefined> {
    if (patterns.length === 1) {
      for (const inner of destructure(patterns[0]!, value, env, input)) yield* body(inner);
      return;
    }
    let base = env;
    const names = new Set<string>();
    for (const pattern of patterns) patternNames(pattern, names);
    for (const name of names) base = { k: 'var', name, value: null, next: base };
    for (const [at, pattern] of patterns.entries()) {
      try {
        for (const inner of destructure(pattern, value, base, input)) yield* body(inner);
        return;
      } catch (error) {
        if (!(error instanceof JqError) || at === patterns.length - 1) throw error;
      }
    }
  }

  function* withParams(def: Def, args: readonly Node[], at: number, inner: Env, env: Env, input: JV, state: Path | null): Generator<Out, void, undefined> {
    if (at === def.params.length) {
      yield* ev(def.body, inner, input, state);
      return;
    }
    const param = def.params[at]!;
    const arg = args[at]!;
    if (param.startsWith('$')) {
      const name = param.slice(1);
      for (const [value] of ev(arg, env, input, null)) {
        const held: Env = { k: 'closure', key: `${name}/0`, body: { t: 'lit', value }, env: null, next: { k: 'var', name, value, next: inner } };
        yield* withParams(def, args, at + 1, held, env, input, state);
      }
    } else yield* withParams(def, args, at + 1, { k: 'closure', key: `${param}/0`, body: arg, env, next: inner }, env, input, state);
  }

  // A walk that's iterative, so a long `repeat` or `until` isn't deep: `emit`
  // what's printed, `down` what's walked next.
  type Visit = Generator<['emit' | 'down', Out], void, undefined>;
  function* walkTree(first: Out, visit: (value: Out) => Visit): Generator<Out, void, undefined> {
    const stack: Visit[] = [visit(first)];
    while (stack.length > 0) {
      const next = stack.at(-1)!.next();
      if (next.done === true) stack.pop();
      else if (next.value[0] === 'emit') yield next.value[1];
      else stack.push(visit(next.value[1]));
    }
  }

  function* call(node: Extract<Node, { t: 'call' }>, env: Env, input: JV, state: Path | null): Generator<Out, void, undefined> {
    const key = `${node.name}/${node.args.length}`;
    const found = lookup(env, key);
    if (found !== null) {
      if (found.k === 'closure') yield* ev(found.body, found.env, input, state);
      else yield* withParams(found.def, node.args, 0, found, env, input, state);
      return;
    }
    switch (key) {
      case 'empty/0':
        return;
      case 'error/0':
        throw new JqError(input);
      case 'path/1':
        for (const [value, at] of ev(node.args[0]!, env, input, { path: [], at: input })) {
          intact(value, at!);
          yield [at!.path as JV[], state];
        }
        return;
      case 'getpath/1':
        for (const [path] of ev(node.args[0]!, env, input, null)) {
          if (!Array.isArray(path)) fail('Path must be specified as an array');
          if (state !== null) intact(input, state);
          const value = getPath(input, path as JV[]);
          yield [value, state === null ? null : { path: [...state.path, ...(path as JV[])], at: value }];
        }
        return;
      case 'input/0': {
        const value = run.nextInput();
        if (value === undefined) fail('No more inputs');
        yield [value as JV, state];
        return;
      }
      case 'debug/0':
        run.stderr(`["DEBUG:",${dump(input)}]\n`);
        yield [input, state];
        return;
      case 'stderr/0':
        run.stderr(toText(input));
        yield [input, state];
        return;
      case 'input_filename/0':
        yield [run.filename(), state];
        return;
      case 'input_line_number/0':
        yield [run.line(), state];
        return;
      case 'halt/0':
        throw new JqHalt(0, '');
      case 'halt_error/1':
        for (const [status] of ev(node.args[0]!, env, input, null)) {
          if (!isNum(status)) fail('halt_error/1: number required');
          throw new JqHalt(num(status as number), input === null ? '' : typeof input === 'string' ? input : `${dump(input)}\n`);
        }
        return;
      case 'range/2':
        for (const [to] of ev(node.args[1]!, env, input, null)) {
          for (const [from] of ev(node.args[0]!, env, input, null)) {
            if (!isNum(from) || !isNum(to)) fail('Range bounds must be numeric');
            const end = num(to);
            for (let at = num(from); at < end; at += 1) {
              run.steps += 1;
              if ((run.steps & 0xfff) === 0 && Date.now() > run.deadline) throw new JqStopped('time');
              yield [at, state];
            }
          }
        }
        return;
      case 'repeat/1':
        for (;;) {
          run.steps += 1;
          if ((run.steps & 0xfff) === 0 && Date.now() > run.deadline) throw new JqStopped('time');
          yield* ev(node.args[0]!, env, input, state);
        }
      case 'recurse/1':
        yield* walkTree([input, state], function* (value) {
          yield ['emit', value];
          for (const out of ev(node.args[0]!, env, value[0], value[1])) yield ['down', out];
        });
        return;
      case 'while/2':
        yield* walkTree([input, state], function* (value) {
          for (const [cond] of ev(node.args[0]!, env, value[0], null)) {
            if (!truthy(cond)) continue;
            yield ['emit', value];
            for (const out of ev(node.args[1]!, env, value[0], value[1])) yield ['down', out];
          }
        });
        return;
      case 'until/2':
        yield* walkTree([input, state], function* (value) {
          for (const [cond] of ev(node.args[0]!, env, value[0], null)) {
            if (truthy(cond)) yield ['emit', value];
            else for (const out of ev(node.args[1]!, env, value[0], value[1])) yield ['down', out];
          }
        });
        return;
    }
    const def = prelude().get(key);
    if (def !== undefined) {
      yield* withParams(def, node.args, 0, null, env, input, state);
      return;
    }
    const native = nativeOf(key);
    if (native === null) fail(`${key} is not defined`);
    yield* applied(native!, node.args, node.args.length - 1, [], env, input, state);
  }

  function* applied(native: Native, args: readonly Node[], at: number, values: JV[], env: Env, input: JV, state: Path | null): Generator<Out, void, undefined> {
    if (at < 0) {
      yield [native(input, ...values), state];
      return;
    }
    for (const [value] of ev(args[at]!, env, input, null)) yield* applied(native, args, at - 1, [value, ...values], env, input, state);
  }
  return ev;
}

// Names the text uses that nothing defines, as jq finds them before running.
type Scope = { vars: ReadonlySet<string>; fns: ReadonlyMap<string, () => void>; labels: ReadonlySet<string> };
function checked(node: Node, scope: Scope, errors: string[]): void {
  const down = (each: Node, inner = scope) => checked(each, inner, errors);
  const named = (patterns: readonly Pattern[]) => {
    const vars = new Set(scope.vars);
    const add = (pattern: Pattern) => {
      if (pattern.p === 'var') vars.add(pattern.name);
      else if (pattern.p === 'array') pattern.items.forEach(add);
      else {
        for (const entry of pattern.entries) {
          if (entry.variable !== null) vars.add(entry.variable);
          if (entry.key !== null) down(entry.key, { ...scope, vars });
          if (entry.value !== null) add(entry.value);
        }
      }
    };
    patterns.forEach(add);
    return { ...scope, vars };
  };
  switch (node.t) {
    case 'index': down(node.target); down(node.key); return;
    case 'slice': down(node.target); if (node.from) down(node.from); if (node.to) down(node.to); return;
    case 'iterate': down(node.target); return;
    case 'try': down(node.body); if (node.handler) down(node.handler); return;
    case 'pipe': case 'comma': case 'bin': case 'and': case 'or': case 'alt': down(node.left); down(node.right); return;
    case 'neg': down(node.body); return;
    case 'if': down(node.cond); down(node.then); if (node.else) down(node.else); return;
    case 'as': down(node.source); down(node.body, named(node.patterns)); return;
    case 'reduce': { down(node.source); down(node.init); down(node.update, named(node.patterns)); return; }
    case 'foreach': { down(node.source); down(node.init); const inner = named(node.patterns); down(node.update, inner); if (node.extract) down(node.extract, inner); return; }
    case 'def': { const scoped = defined(node.def, scope, errors); down(node.body, scoped); return; }
    case 'call': {
      const key = `${node.name}/${node.args.length}`;
      const own = scope.fns.get(key);
      if (own !== undefined) own();
      else if (!known(key)) errors.push(`${key} is not defined at <top-level>, line ${node.line}:`);
      node.args.forEach((arg) => down(arg));
      return;
    }
    case 'var':
      if (!scope.vars.has(node.name) && node.name !== 'ENV') errors.push(`$${node.name} is not defined at <top-level>, line ${node.line}:`);
      return;
    case 'label': down(node.body, { ...scope, labels: new Set([...scope.labels, node.name]) }); return;
    case 'break':
      if (!scope.labels.has(node.name)) errors.push(`$*label-${node.name} is not defined at <top-level>, line ${node.line}:`);
      return;
    case 'string': for (const part of node.parts) if (typeof part !== 'string') down(part); return;
    case 'array': if (node.body) down(node.body); return;
    case 'object': for (const [key, value] of node.entries) { down(key); down(value); } return;
    default:
  }
}
// A body is looked at once something calls it: jq drops what nothing calls.
function defined(def: Def, scope: Scope, errors: string[]): Scope {
  const fns = new Map(scope.fns);
  let seen = false;
  const check = () => {
    if (seen) return;
    seen = true;
    const vars = new Set(scope.vars);
    const inside = new Map(fns);
    for (const param of def.params) {
      const name = param.startsWith('$') ? param.slice(1) : param;
      if (param.startsWith('$')) vars.add(name);
      inside.set(`${name}/0`, () => {});
    }
    checked(def.body, { ...scope, vars, fns: inside }, errors);
  };
  fns.set(def.key, check);
  return { ...scope, fns };
}

// ---- The command ----

const DEFAULT_COLORS = ['0;90', '0;39', '0;39', '0;39', '0;32', '1;39', '1;39', '1;34'];
function colorsFrom(setting: string | undefined): Colors {
  const list = [...DEFAULT_COLORS];
  if (setting !== undefined && /^[0-9;:]*$/.test(setting)) setting.split(':').forEach((each, at) => { if (at < list.length) list[at] = each; });
  const [none, off, on, number, string, array, object, key] = list as [string, string, string, string, string, string, string, string];
  return { null: none, false: off, true: on, number, string, array, object, key };
}

const USAGE = 'Usage:\tjq [OPTIONS] FILTER [FILES...]\n\tjq [OPTIONS] --args FILTER [ARGUMENTS...]\n\tjq [OPTIONS] --jsonargs FILTER [JSON_VALUES...]\n\nUse jq --help for help with command-line options,\nor see the jq manpage, or online docs  at https://jqlang.github.io/jq\n';
const unknownOption = (option: string): JqResult => ({ stdout: '', stderr: `jq: Unknown option ${option}\nUse jq --help for help with command-line options,\nor see the jq manpage, or online docs  at https://jqlang.github.io/jq\n`, exitCode: 2 });
const usageError = (message: string): JqResult => ({ stdout: '', stderr: `jq: ${message}\n${USAGE}`, exitCode: 2 });
const envOf = (env: JqIo['env']): JV => new Map(env instanceof Map ? [...(env as Map<string, string>)] : Object.entries(env as Record<string, string>));

// Each value's events, as `--stream` and `tostream` give them.
function* streamed(value: JV, path: JV[] = []): Generator<JV, void, undefined> {
  const entries: [JV, JV][] | null = Array.isArray(value) ? value.map((each, at) => [at, each]) : isObj(value) ? [...value] : null;
  if (entries === null || entries.length === 0) {
    yield [path, value];
    return;
  }
  for (const [key, each] of entries) yield* streamed(each, [...path, key]);
  yield [[...path, entries.at(-1)![0]]];
}

export async function runJq(args: readonly string[], io: JqIo): Promise<JqResult> {
  const flags = { nullInput: false, rawInput: false, slurp: false, raw: false, raw0: false, join: false, ascii: false, sort: false, color: false, exit: false, seq: false, stream: false, fromFile: false };
  let indentText = '  ';
  let [filter, positional, further]: [string | null, 'files' | 'args' | 'json', boolean] = [null, 'files', true];
  const files: string[] = [];
  const named: JObject = new Map();
  const pos: JV[] = [];
  const rawFilesToRead: { name: string; path: string; slurp: boolean }[] = [];
  let filterFile: string | null = null;

  const positionalWord = (word: string): JqResult | null => {
    if (filter === null && filterFile === null) filter = word;
    else if (positional === 'args') pos.push(word);
    else if (positional === 'json') {
      try {
        pos.push(parseOne(word));
      } catch {
        return usageError(`Invalid JSON text passed to --jsonargs`);
      }
    } else files.push(word);
    return null;
  };

  for (let at = 0; at < args.length; at += 1) {
    const arg = args[at]!;
    if (!further || !/^--?[a-zA-Z]/.test(arg) && arg !== '--') {
      const wrong = positionalWord(arg);
      if (wrong !== null) return wrong;
      continue;
    }
    if (arg === '--') {
      further = false;
      continue;
    }
    if (arg.startsWith('--')) {
      switch (arg) {
        case '--null-input': flags.nullInput = true; break;
        case '--raw-input': flags.rawInput = true; break;
        case '--slurp': flags.slurp = true; break;
        case '--compact-output': indentText = ''; break;
        case '--raw-output': flags.raw = true; break;
        case '--raw-output0': flags.raw = flags.raw0 = true; break;
        case '--join-output': flags.raw = flags.join = true; break;
        case '--ascii-output': flags.ascii = true; break;
        case '--sort-keys': flags.sort = true; break;
        case '--color-output': flags.color = true; break;
        case '--monochrome-output': flags.color = false; break;
        case '--tab': indentText = '\t'; break;
        case '--unbuffered': break;
        case '--stream': case '--stream-errors': flags.stream = true; break;
        case '--seq': flags.seq = true; break;
        case '--exit-status': flags.exit = true; break;
        case '--args': positional = 'args'; break;
        case '--jsonargs': positional = 'json'; break;
        case '--indent': {
          const word = args[(at += 1)];
          if (word === undefined) return usageError('--indent takes one parameter');
          const value = Number.parseInt(word, 10) || 0;
          if (value > 7) return usageError('Cannot indent more than 7 characters');
          indentText = value < 0 ? '\t' : ' '.repeat(value);
          break;
        }
        case '--arg': {
          const [name, value] = [args[at + 1], args[at + 2]];
          if (name === undefined || value === undefined) return usageError('--arg takes two parameters (e.g. --arg varname value)');
          at += 2;
          if (!named.has(name)) named.set(name, value);
          break;
        }
        case '--argjson': {
          const [name, value] = [args[at + 1], args[at + 2]];
          if (name === undefined || value === undefined) return usageError('--argjson takes two parameters (e.g. --argjson varname text)');
          at += 2;
          try {
            if (!named.has(name)) named.set(name, parseOne(value));
          } catch {
            return usageError(`Invalid JSON text passed to --argjson`);
          }
          break;
        }
        case '--slurpfile':
        case '--rawfile': {
          const [name, path] = [args[at + 1], args[at + 2]];
          if (name === undefined || path === undefined) return usageError(`${arg} takes two parameters (e.g. ${arg} varname filename)`);
          at += 2;
          rawFilesToRead.push({ name, path, slurp: arg === '--slurpfile' });
          break;
        }
        case '--from-file': {
          const name = args[(at += 1)];
          if (name === undefined) return usageError('-f takes a parameter');
          filterFile = name;
          break;
        }
        case '--version': return { stdout: 'jq-1.7.1\n', stderr: '', exitCode: 0 };
        case '--build-configuration': return { stdout: 'site\n', stderr: '', exitCode: 0 };
        default: return unknownOption(arg);
      }
      continue;
    }
    for (const letter of arg.slice(1)) {
      switch (letter) {
        case 'n': flags.nullInput = true; break;
        case 'R': flags.rawInput = true; break;
        case 's': flags.slurp = true; break;
        case 'c': indentText = ''; break;
        case 'r': flags.raw = true; break;
        case 'j': flags.raw = flags.join = true; break;
        case 'a': flags.ascii = true; break;
        case 'S': flags.sort = true; break;
        case 'C': flags.color = true; break;
        case 'M': flags.color = false; break;
        case 'e': flags.exit = true; break;
        case 'f': {
          const name = args[(at += 1)];
          if (name === undefined) return usageError('-f takes a parameter');
          filterFile = name;
          break;
        }
        case 'V': return { stdout: 'jq-1.7.1\n', stderr: '', exitCode: 0 };
        case 'L': at += arg === '-L' ? 1 : 0; break;
        default: return unknownOption(arg);
      }
      if (letter === 'L') break;
    }
  }

  if (filterFile !== null) {
    const read = await io.read(filterFile);
    if (typeof read === 'string') return { stdout: '', stderr: `jq: error: Could not open ${filterFile}: ${read === 'folder' ? 'Is a directory' : 'No such file or directory'}\n`, exitCode: 2 };
    if (filter !== null) files.unshift(filter);
    filter = read.text;
  }
  for (const { name, path, slurp } of rawFilesToRead) {
    const read = await io.read(path);
    if (typeof read === 'string') return usageError(`Bad JSON in --${slurp ? 'slurpfile' : 'rawfile'} ${name} ${path}: Could not open ${path}: ${read === 'folder' ? 'Is a directory' : 'No such file or directory'}`);
    if (named.has(name)) continue;
    if (!slurp) named.set(name, read.text);
    else {
      try {
        const parser = new JsonParser(read.text);
        const list: JV[] = [];
        for (let value = parser.next(); value !== undefined; value = parser.next()) list.push(fixStrings(value));
        named.set(name, list);
      } catch (error) {
        return usageError(`Bad JSON in --slurpfile ${name} ${path}: ${(error as Error).message}`);
      }
    }
  }

  const source: string = filter ?? '.';
  let program: { defs: Def[]; body: Node };
  const compileFailed = (messages: readonly string[], status = 3): JqResult => {
    const shown = messages.map((message) => {
      const line = /line (\d+):$/.exec(message)?.[1];
      return line === undefined ? `jq: error: ${message}\n` : `jq: error: ${message}\n${source.split('\n')[Number(line) - 1] ?? source}\n`;
    });
    return { stdout: '', stderr: `${shown.join('')}jq: ${messages.length} compile error${messages.length === 1 ? '' : 's'}\n`, exitCode: status };
  };
  try {
    program = new Parser(source).program();
  } catch (error) {
    if (error instanceof CompileError) return compileFailed([error.message]);
    throw error;
  }
  const named$: JV = new Map<string, JV>([['positional', pos], ['named', named]]);
  const errors: string[] = [];
  let scope: Scope = { vars: new Set([...named.keys(), 'ARGS', '__prog_args']), fns: new Map(), labels: new Set() };
  for (const def of program.defs) scope = defined(def, scope, errors);
  checked(program.body, scope, errors);
  if (errors.length > 0) return compileFailed(errors);

  let out = '';
  let err = '';
  let status = 0;
  let fileStatus = 0;
  let stopped: Stop | undefined;

  // The inputs: each file in turn, or what's piped in.
  type Source = { name: string | null; text: string };
  const sources: (Source | { name: string; failed: string })[] = [];
  if (files.length === 0) sources.push({ name: null, text: io.stdin });
  for (const file of files) {
    const read = await io.read(file);
    if (read === 'missing') sources.push({ name: file, failed: `jq: error: Could not open file ${file}: No such file or directory\n` });
    else if (read === 'folder') sources.push({ name: file, failed: 'jq: error: Input error: Is a directory\n' });
    else sources.push({ name: file, text: read.text });
  }
  let sourceAt = 0;
  let parser: JsonParser | null = null;
  let lines: string[] | null = null;
  let lineAt = 0;
  let current: string | null = null;
  let position = 0;
  const pending: JV[] = [];
  const countLine = (text: string, at: number) => {
    let line = 0;
    for (let each = text.indexOf('\n'); each !== -1; each = text.indexOf('\n', each + 1)) {
      line += 1;
      if (each >= at) break;
    }
    position = line;
  };
  // The next text: `undefined` once they've all been read.
  const nextSource = (): Source | undefined => {
    while (sourceAt < sources.length) {
      const each = sources[sourceAt]!;
      sourceAt += 1;
      if ('failed' in each) {
        err += each.failed;
        status = fileStatus = 2;
        continue;
      }
      return each;
    }
    return undefined;
  };
  let reading: Source | null = null;
  let readAny = false;
  class InputStop extends Error {}
  const nextValue = (): JV | undefined => {
    if (pending.length > 0) return pending.shift()!;
    for (;;) {
      if (reading === null) {
        const each = nextSource();
        if (each === undefined) return undefined;
        reading = each;
        readAny = true;
        current = each.name;
        position = 0;
        parser = flags.rawInput ? null : new JsonParser(each.text);
        lines = null;
        lineAt = 0;
      }
      if (flags.rawInput) {
        if (lines === null) {
          lines = reading.text.split('\n');
          if (lines.at(-1) === '') lines.pop();
          position = 0;
        }
        if (lineAt < lines.length) {
          position = lineAt + 1;
          return lines[lineAt++]!;
        }
        reading = null;
        continue;
      }
      try {
        const value = parser!.next();
        if (value === undefined) {
          countLine(reading.text, reading.text.length);
          reading = null;
          continue;
        }
        countLine(reading.text, parser!.at);
        if (flags.stream) {
          const events = [...streamed(value)];
          pending.push(...events.slice(1).map(fixStrings));
          return fixStrings(events[0]!);
        }
        return fixStrings(value);
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        err += `jq: parse error: ${error.message}\n`;
        status = 5;
        sourceAt = sources.length;
        reading = null;
        throw new InputStop();
      }
    }
  };
  // `-s` and `-Rs`: everything, as one value.
  const allAtOnce = () => {
    if (flags.rawInput) {
      let text = '';
      for (let each = nextSource(); each !== undefined; each = nextSource()) {
        text += each.text;
        current = each.name;
        position = each.text.split('\n').length - 1;
      }
      return text;
    }
    const list: JV[] = [];
    for (let value = nextValue(); value !== undefined; value = nextValue()) list.push(value);
    return list;
  };

  const envValue = envOf(io.env);
  const colors = flags.color ? colorsFrom((envValue as JObject).get('JQ_COLORS') as string | undefined) : null;
  const options: Dump = { indent: indentText, sort: flags.sort, ascii: flags.ascii, colors };
  const run: Runner = {
    steps: 0,
    deadline: io.deadline,
    stderr: (text) => {
      err += text;
    },
    nextInput: () => {
      try {
        return nextValue();
      } catch (error) {
        if (error instanceof InputStop) return undefined;
        throw error;
      }
    },
    filename: () => current ?? (readAny ? '<stdin>' : null),
    line: () => position,
    env: envValue,
  };
  const ev = evaluator(run);
  let env: Env = null;
  env = { k: 'var', name: 'ARGS', value: named$, next: env };
  env = { k: 'var', name: '__prog_args', value: pos, next: env };
  for (const [name, value] of named) env = { k: 'var', name, value, next: env };
  for (const def of program.defs) env = { k: 'def', key: def.key, def, next: env };

  let last: JV | undefined;
  const where = () => (current === null && reading === null && position === 0 && flags.nullInput ? '<unknown>' : `${current ?? '<stdin>'}:${position}`);
  const report = (value: JV) => {
    if (typeof value === 'string') err += `jq: error (at ${where()}): ${value}\n`;
    else err += `jq: error (at ${where()}) (not a string): ${dump(value)}\n`;
    status = 5;
  };
  const print = (value: JV) => {
    last = value;
    if (flags.seq) out += '\u001e';
    if (flags.raw && !flags.ascii && typeof value === 'string') {
      if (flags.raw0 && value.includes('\0')) {
        report('Cannot dump a string containing NUL with --raw-output0 option');
        return;
      }
      out += value;
    } else out += dump(value, options);
    if (flags.raw0) out += '\0';
    else if (!flags.join) out += '\n';
    if (out.length > io.maxOutput) throw new JqStopped('output');
  };
  // The last input's result is the status, as jq's own loop has it.
  const process = (input: JV) => {
    status = fileStatus;
    try {
      for (const [value] of ev(program.body, env, input, null)) print(value);
    } catch (error) {
      if (error instanceof JqError) report(error.value);
      else throw error;
    }
  };
  try {
    if (flags.nullInput) process(null);
    else if (flags.slurp) process(allAtOnce());
    else {
      for (;;) {
        const value = nextValue();
        if (value === undefined) break;
        process(value);
      }
    }
    // Files no input got to still say why they can't be read.
    while (nextSource() !== undefined);
    if (flags.exit && status === 0) status = last === undefined ? 4 : truthy(last) ? 0 : 1;
  } catch (error) {
    if (error instanceof JqHalt) {
      err += error.text;
      status = error.status;
    } else if (error instanceof JqStopped) stopped = error.why;
    else if (error instanceof RangeError) stopped = 'time';
    else if (!(error instanceof InputStop)) throw error;
    if (error instanceof InputStop && flags.exit && status === 0) status = 5;
  }
  return { stdout: out, stderr: err, exitCode: status, ...(stopped === undefined ? {} : { stopped }) };
}
