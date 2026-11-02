// Errors as Node shows them (009 FR-017, FR-018, research R5). A stack is read per
// engine into frames; the runtime's frames go; a frame in a known file prints as
// `at name (path:line:col)`, its place in the visitor's source.
import { inspect } from 'node-inspect-extracted';

export const VERSION_LINE = 'node v26.0.0 (browser runtime, not Node.js)';

export type Source = {
  // The text the visitor wrote.
  text: string;
  // What the wrapper adds before the source's first line.
  prefix: number;
  // Maps a place in the code that ran to one in the source, for TypeScript.
  mapped?: (line: number, column: number) => { line: number; column: number } | null;
};

export type Frame = { name: string; file: string; line: number; column: number };

const V8_FRAME = /^\s*at (?:(.*?) \()?(.*?):(\d+):(\d+)\)?$/;
const FIREFOX_FRAME = /^(.*?)@(.*?):(\d+):(\d+)$/;

const isV8 = (stack: string) => /^\s+at /m.test(stack);

export function createErrors(sources: Map<string, Source>, entry: () => string | null, loading: () => string | null) {
  const place = (frame: Frame): Frame | null => {
    const source = sources.get(frame.file);
    if (source === undefined) return null;
    const column = frame.line === 1 ? frame.column - source.prefix : frame.column;
    const mapped = source.mapped?.(frame.line, column);
    if (source.mapped !== undefined) return mapped === null || mapped === undefined ? null : { ...frame, line: mapped.line, column: mapped.column };
    return { ...frame, column };
  };

  // The frames of a stack that are in the visitor's files.
  function frames(stack: string): Frame[] {
    const found: Frame[] = [];
    const pattern = isV8(stack) ? V8_FRAME : FIREFOX_FRAME;
    for (const line of stack.split('\n')) {
      const match = pattern.exec(line);
      if (match === null) continue;
      const placed = place({ name: match[1] ?? '', file: match[2]!, line: Number(match[3]), column: Number(match[4]) });
      if (placed !== null) found.push(placed);
    }
    return found;
  }

  const headerOf = (error: Error, stack: string) => {
    if (!isV8(stack)) return `${error.name}: ${error.message}`.replace(/: $/, '');
    const at = stack.search(/^\s+at /m);
    return at < 0 ? stack.trimEnd() : stack.slice(0, at).trimEnd();
  };

  // A file's top-level code runs in its wrapper, which Node calls this.
  const frameLine = ({ name, file, line, column }: Frame) => {
    const shown = name === 'eval' || name === 'Object.eval' ? 'Object.<anonymous>' : name;
    return shown === '' ? `    at ${file}:${line}:${column}` : `    at ${shown} (${file}:${line}:${column})`;
  };

  // What the engine really reported for errors whose `stack` the program can read
  // already in the visitor's terms, so places aren't mapped twice.
  const raws = new WeakMap<object, string>();

  const shownStack = (error: Error, raw: string) => {
    raws.set(error, raw);
    return [headerOf(error, raw), ...frames(raw).map(frameLine)].join('\n');
  };

  // So `error.stack`, read by the program, holds none of the runtime's frames
  // either. Chromium builds it through this hook; Firefox reads it through an
  // accessor on the prototype. WebKit's is a plain property holding the runtime's
  // frames, which can't be hidden until the error is shown (Known differences).
  function install(): void {
    const made = Error as ErrorConstructor & { prepareStackTrace?: unknown };
    if (isV8(new Error().stack ?? '')) {
      made.prepareStackTrace = (error: Error, sites: readonly unknown[]) => {
        let header = 'Error';
        try {
          header = Error.prototype.toString.call(error);
        } catch {
          // A program's strange error keeps the plain word.
        }
        return shownStack(error, [header, ...sites.map((site) => `    at ${String(site)}`)].join('\n'));
      };
      return;
    }
    const held = Object.getOwnPropertyDescriptor(Error.prototype, 'stack');
    if (held?.get === undefined) return;
    const { get, set } = held;
    Object.defineProperty(Error.prototype, 'stack', {
      ...held,
      get(this: Error) {
        const raw: unknown = get.call(this);
        return typeof raw === 'string' && /@.*:\d+:\d+$/m.test(raw) ? shownStack(this, raw) : raw;
      },
      ...(set === undefined ? {} : { set }),
    });
  }

  // The error's stack as the program should read it: none of the runtime's frames.
  function clean(value: unknown, depth = 0): void {
    if (!(value instanceof Error) || depth > 3) return;
    const marked = value as Error & { [CLEANED]?: true };
    if (marked[CLEANED] === true) return;
    const stack = typeof value.stack === 'string' ? value.stack : '';
    if (raws.has(value)) {
      clean(value.cause, depth + 1);
      return;
    }
    try {
      const shown = frames(stack).map(frameLine);
      Object.defineProperty(value, 'stack', { value: [headerOf(value, stack), ...shown].join('\n'), writable: true, configurable: true, enumerable: false });
      Object.defineProperty(value, CLEANED, { value: true, enumerable: false });
    } catch {
      // A frozen error keeps its stack.
    }
    clean(value.cause, depth + 1);
  }

  // Where to point: the top frame, else on WebKit the error's own `line` and
  // `column`, in the file being loaded or the entry file (research R5).
  function topPlace(value: Error, stack: string): { file: string; line: number; column: number } | null {
    const top = frames(stack)[0];
    if (top !== undefined) return top;
    const { line, column } = value as Error & { line?: unknown; column?: unknown };
    const file = loading() ?? entry();
    if (typeof line !== 'number' || file === null || !sources.has(file)) return null;
    const placed = place({ name: '', file, line, column: typeof column === 'number' ? column : 1 });
    return placed;
  }

  // `file:line`, that line of code and a marker under the place.
  function sourceBlock(at: { file: string; line: number; column: number }): string {
    const code = sources.get(at.file)?.text.split('\n')[at.line - 1];
    if (code === undefined) return `${at.file}:${at.line}\n`;
    const column = Math.max(0, at.column - 1);
    // An error made and thrown at once: Node points at the `throw`. WebKit's column
    // is past the `new` and the name.
    const thrown = /\bthrow\s+(?:new\s+[\w$.]*)?$/.exec(code.slice(0, column));
    const marker = thrown === null ? column : thrown.index;
    return `${at.file}:${at.line}\n${code}\n${' '.repeat(marker)}^\n\n`;
  }

  // The whole form of an uncaught error (contracts/commands.md Formats).
  function uncaughtText(value: unknown): string {
    // Nothing says where a value that is no error was thrown (Known differences).
    if (!(value instanceof Error)) return `${typeof value === 'object' && value !== null ? inspect(value) : String(value)}\n\n${VERSION_LINE}\n`;
    const read = typeof value.stack === 'string' ? value.stack : '';
    const stack = raws.get(value) ?? read;
    const top = (value as Error & { place?: { file: string; line: number; column: number } }).place ?? topPlace(value, stack);
    clean(value);
    const header = headerOf(value, stack);
    const shown = inspect(value);
    // With no frame left, `inspect` brackets the error. In Node the loader's own
    // frames are still there, so its syntax and missing-module errors print without.
    const text = read !== '' && shown.startsWith(`[${header}]`) ? `${header}${shown.slice(header.length + 2)}` : shown;
    return `${top === null ? '' : sourceBlock(top)}${text}\n\n${VERSION_LINE}\n`;
  }

  return { clean, install, uncaughtText, stack: () => `\n${frames(new Error().stack ?? '').map(frameLine).join('\n')}` };
}

const CLEANED = Symbol('cleaned');
