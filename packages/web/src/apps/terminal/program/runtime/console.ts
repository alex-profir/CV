// `console` and the program's two streams (009 research R7, R9, FR-011): text by
// stream name on the port. Within an allowance by the clock it goes at once, as a
// blocked loop never yields; past it, it waits until the allowance refills. Both
// allowances are 008's. The page's own count is what really stops a program.
import { format, formatWithOptions, inspect } from 'node-inspect-extracted';
import { OUTPUT_LIMIT } from '../messages.ts';
import type { Stream } from '../messages.ts';

const CHARS_PER_MS = 4_000;
const CHARS_AT_ONCE = 200_000;
const SENDS_PER_MS = 0.2;
const SENDS_AT_ONCE = 200;

export type OutputDeps = {
  send: (message: Record<string, unknown>) => void;
  now: () => number;
  // Called once with what was sent, when the limit is reached.
  limit: () => never;
};

export function createOutput(deps: OutputDeps) {
  let held: { stream: Stream; text: string }[] = [];
  let chars = CHARS_AT_ONCE;
  let sends = SENDS_AT_ONCE;
  let earned = deps.now();
  let total = 0;

  const refill = () => {
    const at = deps.now();
    chars = Math.min(CHARS_AT_ONCE, chars + (at - earned) * CHARS_PER_MS);
    sends = Math.min(SENDS_AT_ONCE, sends + (at - earned) * SENDS_PER_MS);
    earned = at;
  };

  function flush(force = false): void {
    refill();
    while (held.length > 0 && (force || (chars > 0 && sends >= 1))) {
      const { stream, text } = held.shift()!;
      chars -= text.length;
      sends -= 1;
      deps.send({ out: stream, text });
    }
  }

  function write(stream: Stream, text: string): void {
    if (text === '') return;
    total += text.length;
    const last = held.at(-1);
    if (last !== undefined && last.stream === stream) last.text += text;
    else held.push({ stream, text });
    flush();
    if (total >= OUTPUT_LIMIT) {
      flush(true);
      deps.send({ limit: 'output' });
      deps.limit();
    }
  }

  return { write, flush };
}

export type Output = ReturnType<typeof createOutput>;

// What a table's cell holds: as `console.table` shows it.
const cell = (value: unknown) => inspect(value, { depth: 0, maxArrayLength: 3, breakLength: Number.POSITIVE_INFINITY });

const width = (text: string) => [...text].length;

function renderTable(head: readonly string[], columns: readonly (readonly string[])[]): string {
  const rows = Math.max(0, ...columns.map((column) => column.length));
  const widths = head.map((name, at) => Math.max(width(name), ...columns[at]!.map(width)) + 2);
  const row = (cells: readonly string[]) =>
    `│${cells
      .map((text, at) => {
        const free = widths[at]! - width(text);
        return `${' '.repeat(1)}${text}${' '.repeat(free - 1)}`;
      })
      .join('│')}│`;
  const rule = (left: string, middle: string, right: string) => `${left}${widths.map((each) => '─'.repeat(each)).join(middle)}${right}`;
  const lines = [rule('┌', '┬', '┐'), row(head), rule('├', '┼', '┤')];
  for (let at = 0; at < rows; at += 1) lines.push(row(columns.map((column) => column[at] ?? '')));
  lines.push(rule('└', '┴', '┘'));
  return lines.join('\n');
}

const isPrimitive = (value: unknown) => value === null || (typeof value !== 'object' && typeof value !== 'function');

function tableOf(data: unknown, only?: readonly string[]): string | null {
  if (isPrimitive(data)) return null;
  const isMap = data instanceof Map;
  const isSet = data instanceof Set;
  const entries: [unknown, unknown][] = isMap ? [...data.entries()] : isSet ? [...data.values()].map((value, at) => [at, value]) : Object.entries(data as object);
  const indexName = isMap || isSet ? '(iteration index)' : '(index)';
  const index: string[] = [];
  const keys: string[] = [];
  const columns = new Map<string, string[]>();
  const values: string[] = [];
  let hasValues = false;
  entries.forEach(([key, value], at) => {
    index.push(isMap ? String(at) : String(key));
    if (isMap) keys.push(cell(key));
    if (isPrimitive(value)) {
      values[at] = cell(value);
      hasValues = true;
      return;
    }
    for (const [name, item] of Object.entries(value as object)) {
      if (only !== undefined && !only.includes(name)) continue;
      if (!columns.has(name)) columns.set(name, []);
      columns.get(name)![at] = cell(item);
    }
  });
  const names = only ?? [...columns.keys()];
  const fill = (list: readonly (string | undefined)[]) => Array.from({ length: entries.length }, (_, at) => list[at] ?? '');
  const head = [indexName, ...(isMap ? ['Key'] : []), ...names, ...(hasValues ? ['Values'] : [])];
  return renderTable(head, [index, ...(isMap ? [keys] : []), ...names.map((name) => fill(columns.get(name) ?? [])), ...(hasValues ? [fill(values)] : [])]);
}

export function createConsole(output: Output, deps: { now: () => number; clean: (value: unknown) => void; stack: () => string }) {
  let indent = '';
  const counts = new Map<string, number>();
  const timers = new Map<string, number>();

  const print = (stream: Stream, text: string) => {
    const shown = indent === '' ? text : `${indent}${text.replaceAll('\n', `\n${indent}`)}`;
    output.write(stream, `${shown}\n`);
  };
  const line = (stream: Stream, values: unknown[]) => {
    for (const value of values) deps.clean(value);
    print(stream, formatWithOptions({ colors: false }, ...values));
  };

  const elapsed = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(3)}s` : `${ms.toFixed(ms < 1 ? 3 : ms < 10 ? 3 : 2).replace(/\.?0+$/, (zeros) => (zeros.startsWith('.') ? '' : ''))}ms`);

  const label = (value: unknown) => (value === undefined ? 'default' : String(value));

  return {
    log: (...values: unknown[]) => line('stdout', values),
    info: (...values: unknown[]) => line('stdout', values),
    debug: (...values: unknown[]) => line('stdout', values),
    error: (...values: unknown[]) => line('stderr', values),
    warn: (...values: unknown[]) => line('stderr', values),
    trace: (...values: unknown[]) => print('stderr', `Trace${values.length > 0 ? `: ${format(...values)}` : ''}${deps.stack()}`),
    dir: (value: unknown, options?: object) => {
      deps.clean(value);
      print('stdout', inspect(value, { customInspect: false, ...options }));
    },
    table: (data: unknown, only?: readonly string[]) => {
      const table = tableOf(data, only);
      if (table === null) line('stdout', [data]);
      else print('stdout', table);
    },
    group: (...values: unknown[]) => {
      if (values.length > 0) line('stdout', values);
      indent += '  ';
    },
    groupCollapsed: (...values: unknown[]) => {
      if (values.length > 0) line('stdout', values);
      indent += '  ';
    },
    groupEnd: () => {
      indent = indent.slice(2);
    },
    time: (name?: unknown) => {
      if (!timers.has(label(name))) timers.set(label(name), deps.now());
    },
    timeEnd: (name?: unknown) => {
      const at = timers.get(label(name));
      if (at === undefined) return;
      timers.delete(label(name));
      print('stdout', `${label(name)}: ${elapsed(deps.now() - at)}`);
    },
    timeLog: (name?: unknown, ...values: unknown[]) => {
      const at = timers.get(label(name));
      if (at !== undefined) print('stdout', `${label(name)}: ${elapsed(deps.now() - at)}${values.length > 0 ? ` ${format(...values)}` : ''}`);
    },
    count: (name?: unknown) => {
      const count = (counts.get(label(name)) ?? 0) + 1;
      counts.set(label(name), count);
      print('stdout', `${label(name)}: ${count}`);
    },
    countReset: (name?: unknown) => void counts.delete(label(name)),
    assert: (value: unknown, ...values: unknown[]) => {
      if (value) return;
      if (typeof values[0] === 'string') values[0] = `Assertion failed: ${values[0]}`;
      else values.unshift('Assertion failed');
      line('stderr', values);
    },
  };
}
