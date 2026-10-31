// Where just-bash's standard commands differ from GNU's in an option their
// own `--help` lists, or in how they word a wrong use (006 FR-017, FR-068,
// SC-014, T302, T306). Each runs in front of the command, which `next` runs.
import { MARK } from './fs.ts';
import type { TerminalFs } from './fs.ts';
import type { ShellCommand } from './site-commands.ts';

type Context = Parameters<ShellCommand['execute']>[1];
type Output = Awaited<ReturnType<ShellCommand['execute']>>;
// `input` stands in for the command's standard input.
type Next = (args: string[], input?: string) => Promise<Output>;
export type Fix = (args: string[], ctx: Context, next: Next, fs: TerminalFs) => Promise<Output>;

const failed = (stderr: string, exitCode: number): Output => ({ stdout: '', stderr, exitCode });
const tryHelp = (name: string) => `Try '${name} --help' for more information.\n`;
const isOption = (arg: string) => arg.startsWith('-') && arg !== '-';
const quote = (word: string) => `'${word.replaceAll("'", `'\\''`)}'`;
const usageError = (name: string, message: string, exitCode = 1) => failed(`${name}: ${message}\n${tryHelp(name)}`, exitCode);
// A wrong option, in the form each command gives it (T387, T388).
const WRONG_STATUS: Readonly<Record<string, number>> = { grep: 2, sort: 2, ls: 2, diff: 2, env: 125 };
const wrongUse = (name: string, message: string) => failed(`${name}: ${message}\n${name === 'grep' ? 'Usage: grep [OPTION]... PATTERNS [FILE]...\n' : ''}${name === 'diff' ? 'diff: ' : ''}${tryHelp(name)}`, WRONG_STATUS[name] ?? 1);
const wrongOption = (name: string, option: string) => wrongUse(name, option.startsWith('--') ? `unrecognized option '${option}'` : `invalid option -- '${option[1]!}'`);
// The first option past `letters` and `longs`, what `--help` lists (T388).
const unlisted = (args: readonly string[], letters: string, longs: readonly string[], stops = false): string | null => {
  for (const arg of args) {
    if (arg === '--' || (stops && !isOption(arg))) return null;
    if (!isOption(arg)) continue;
    if (arg.startsWith('--')) {
      if (!longs.includes(arg.split('=')[0]!)) return arg;
    } else {
      const letter = [...arg.slice(1)].find((each) => !letters.includes(each));
      if (letter !== undefined) return `-${letter}`;
    }
  }
  return null;
};
// The operands after the options, `valued` taking the next argument.
const operandsOf = (args: readonly string[], valued: ReadonlySet<string>) => {
  const operands: string[] = [];
  for (let at = 0; at < args.length; at += 1) {
    const arg = args[at]!;
    if (arg === '--') {
      operands.push(...args.slice(at + 1));
      break;
    }
    if (valued.has(arg)) at += 1;
    else if (!isOption(arg)) operands.push(arg);
  }
  return operands;
};

// The letter of a last option that takes a value and has none.
const valueMissing = (args: readonly string[], letters: string) => {
  const last = args.at(-1);
  return last !== undefined && /^-[a-zA-Z]$/.test(last) && letters.includes(last[1]!) ? last[1]! : null;
};
const noValue = (name: string, letter: string, exitCode = 1) => usageError(name, `option requires an argument -- '${letter}'`, exitCode);
const needsValue =
  (name: string, letters: string, fix: Fix): Fix =>
  async (args, ctx, next, fs) => {
    const letter = valueMissing(args, letters);
    return letter === null ? fix(args, ctx, next, fs) : noValue(name, letter);
  };

// `-nk2` as `-n -k 2`, as getopt reads a bundle (T350): a `valued` letter takes
// the rest of its word or the next, an `optional` one only the rest of its word.
function unbundled(args: readonly string[], valued: string, optional = '', toFirstOperand = false): string[] {
  const list: string[] = [];
  for (let at = 0; at < args.length; at += 1) {
    const arg = args[at]!;
    const number = arg.length > 1 && !Number.isNaN(Number(arg));
    if (arg === '--' || (toFirstOperand && !isOption(arg))) {
      list.push(...args.slice(at));
      break;
    }
    if (number || !/^-[a-zA-Z0-9]/.test(arg)) {
      list.push(arg);
      continue;
    }
    for (let letter = 1; letter < arg.length; letter += 1) {
      const char = arg[letter]!;
      const rest = arg.slice(letter + 1);
      if (optional.includes(char)) {
        list.push(`-${char}${rest}`);
        break;
      }
      list.push(`-${char}`);
      if (!valued.includes(char)) continue;
      if (rest !== '') list.push(rest);
      else if (at + 1 < args.length) list.push(args[(at += 1)]!);
      break;
    }
  }
  return list;
}

const bundled =
  (valued: string, fix: Fix, optional = ''): Fix =>
  (args, ctx, next, fs) =>
    fix(unbundled(args, valued, optional), ctx, next, fs);

// What the adapter tells a command of its redirects (T355, T360): the file its
// output goes to and the file its input comes from, each as typed.
export const OUTPUT_FILE = `${MARK}o`;
export const INPUT_FILE = `${MARK}i`;

const samePath = (ctx: Context, fs: TerminalFs, a: string, b: string) => fs.canonical(fs.resolvePath(ctx.cwd, a)) === fs.canonical(fs.resolvePath(ctx.cwd, b));

// A wrong use GNU follows with the `Try` line.
const WRONG_USE = /^\S+: (?:missing |unrecognized option|invalid option|option requires|you must specify|extra operand)/m;

const addTry =
  (name: string, exitCode?: number): Fix =>
  async (args, _ctx, next) => {
    const result = await next(args);
    if (result.exitCode === 0 || !WRONG_USE.test(result.stderr) || result.stderr.includes('Try ')) return result;
    return { ...result, stderr: `${result.stderr}${tryHelp(name)}`, exitCode: exitCode ?? result.exitCode };
  };

// Latin1 bytes as a command's text, kept as bytes if they aren't valid UTF-8.
function bytesOutput(bytes: Uint8Array, stderr = '', exitCode = 0): Output {
  try {
    return { stdout: new TextDecoder('utf-8', { fatal: true }).decode(bytes), stderr, exitCode };
  } catch {
    return { stdout: Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''), stdoutKind: 'bytes', stderr, exitCode } as Output;
  }
}

const inputBytes = (ctx: Context) => Uint8Array.from(ctx.stdin as unknown as string, (char) => char.charCodeAt(0));

// Bytes as a string of one char each, whose `<` is the C locale's order.
const byteString = (bytes: Uint8Array) => {
  let text = '';
  for (let at = 0; at < bytes.length; at += 8192) text += String.fromCharCode(...bytes.subarray(at, at + 8192));
  return text;
};
const fromByteString = (text: string) => Uint8Array.from(text, (char) => char.charCodeAt(0));
const isBytes = (result: Output) => result.stdoutKind === 'bytes' || (result.stdoutKind === undefined && result.stdoutEncoding === 'binary');

// A result's output as the file it goes to should hold it: a command's bytes as
// bytes, encoded once (T354).
const writeOutput = (fs: TerminalFs, path: string, result: Output) => (isBytes(result) ? fs.writeFile(path, fromByteString(result.stdout)) : fs.writeFile(path, result.stdout));

// A file's bytes, or GNU's reason it has none.
async function fileBytes(fs: TerminalFs, ctx: Context, file: string): Promise<Uint8Array | string> {
  const path = fs.resolvePath(ctx.cwd, file);
  const stat = await fs.stat(path).catch(() => null);
  if (stat === null) return 'No such file or directory';
  if (stat.isDirectory) return 'Is a directory';
  return fs.readFileBuffer(path);
}

// `head -n -1`, `tail -c5`: an option's number and the rest of the arguments.
function countOption(args: readonly string[], short: string, long: string): { count: string; rest: string[] } | null {
  for (const [at, arg] of args.entries()) {
    if (arg === `-${short}` && args[at + 1] !== undefined) return { count: args[at + 1]!, rest: args.toSpliced(at, 2) };
    if (arg.startsWith(`--${long}=`)) return { count: arg.slice(long.length + 3), rest: args.toSpliced(at, 1) };
    if (arg.startsWith(`-${short}`) && !arg.startsWith('--')) return { count: arg.slice(2), rest: args.toSpliced(at, 1) };
  }
  return null;
}

// The bytes of each of `files`, or of the input, with the headers GNU prints.
async function eachInput(name: 'head' | 'tail', rest: readonly string[], ctx: Context, next: Next, fs: TerminalFs, whole: string[], cut: (bytes: Uint8Array) => Uint8Array): Promise<Output> {
  const files = rest.filter((arg) => !isOption(arg));
  const headers = rest.includes('-v') || rest.includes('--verbose') || (files.length > 1 && !rest.includes('-q') && !rest.includes('--quiet'));
  const out: number[] = [];
  const add = (text: string) => out.push(...new TextEncoder().encode(text));
  let stderr = '';
  let exitCode = 0;
  let first = true;
  for (const file of files.length === 0 ? ['-'] : files) {
    let bytes: Uint8Array;
    if (file === '-') bytes = inputBytes(ctx);
    else if (await isFolder(fs, ctx, file)) {
      // GNU opens a folder, says so where it reads, and goes on (T365).
      stderr += `${name}: error reading '${file}': Is a directory\n`;
      exitCode = 1;
      bytes = new Uint8Array();
    } else {
      const result = await next([...whole, file]);
      stderr += result.stderr;
      if (result.exitCode !== 0) {
        exitCode = result.exitCode;
        continue;
      }
      bytes = isBytes(result) ? fromByteString(result.stdout) : new TextEncoder().encode(result.stdout);
    }
    if (headers) add(`${first ? '' : '\n'}==> ${file === '-' ? "'standard input'" : file} <==\n`);
    first = false;
    for (const byte of cut(bytes)) out.push(byte);
  }
  return bytesOutput(Uint8Array.from(out), stderr, exitCode);
}

const isFolder = async (fs: TerminalFs, ctx: Context, path: string) => (await fs.stat(fs.resolvePath(ctx.cwd, path)).catch(() => null))?.isDirectory === true;

// A final slash names a folder (T378): what's wrong with `path` if it has one and
// isn't, or null.
async function notFolder(fs: TerminalFs, ctx: Context, path: string): Promise<string | null> {
  if (!path.endsWith('/') || path === '/') return null;
  const stat = await fs.stat(fs.resolvePath(ctx.cwd, path)).catch(() => null);
  return stat === null ? 'No such file or directory' : stat.isDirectory ? null : 'Not a directory';
}

// The start of the last `count` lines, or the end of the first.
function lineEnds(bytes: Uint8Array): number[] {
  const ends: number[] = [];
  bytes.forEach((byte, at) => {
    if (byte === 10) ends.push(at + 1);
  });
  if (bytes.length > 0 && bytes.at(-1) !== 10) ends.push(bytes.length);
  return ends;
}

// All but the last `count` lines.
function withoutLastLines(bytes: Uint8Array, count: number): Uint8Array {
  const ends = lineEnds(bytes);
  return bytes.slice(0, ends.length > count ? ends[ends.length - count - 1] : 0);
}

const WHOLE = '1000000000';

// GNU's number suffixes, for `head` and `tail` (T384).
const POWERS = 'KMGTPEZYRQ';
function gnuNumber(typed: string): string | null {
  const match = /^(\d+)(b|[kKmMGTPEZYRQ](?:iB|B)?)?$/.exec(typed);
  if (match === null) return null;
  const suffix = match[2];
  if (suffix === undefined) return match[1]!;
  if (suffix === 'b') return String(BigInt(match[1]!) * 512n);
  const base = suffix.endsWith('B') && !suffix.endsWith('iB') ? 1000n : 1024n;
  return String(BigInt(match[1]!) * base ** BigInt(POWERS.indexOf(suffix[0]!.toUpperCase()) + 1));
}

// `-n 1k` and `--bytes=1M` as plain numbers, or GNU's words for what isn't one.
const counted =
  (name: 'head' | 'tail', fix: Fix): Fix =>
  (args, ctx, next, fs) => {
    const list = [...args];
    for (const [short, long, words] of [['n', 'lines', 'lines'], ['c', 'bytes', 'bytes']] as const) {
      const option = countOption(list, short, long);
      if (option === null) continue;
      const [, typedSign = '', digits = ''] = /^([-+]?)(.*)$/s.exec(option.count) ?? [];
      const number = gnuNumber(digits);
      if (number === null) return Promise.resolve(failed(`${name}: invalid number of ${words}: ‘${digits}’\n`, 1));
      // `tail`'s `-` says what no sign does.
      const sign = name === 'tail' && typedSign === '-' ? '' : typedSign;
      const at = list.findIndex((arg, index) => list[index - 1] !== `-${short}` && (arg === `-${short}` || arg.startsWith(`--${long}=`) || (arg.startsWith(`-${short}`) && !arg.startsWith('--'))));
      list.splice(at, list[at] === `-${short}` ? 2 : 1, `-${short}`, `${sign}${number}`);
    }
    return fix(list, ctx, next, fs);
  };

// `head` and `tail`: GNU's words for a wrong count or a file it can't open.
const COUNT_WORDS = (name: string, args: readonly string[]) => (result: Output) => {
  const stderr = result.stderr
    .replace(new RegExp(`^${name}: invalid number of lines$`, 'm'), `${name}: invalid number of lines: ‘${countOption(args, 'n', 'lines')?.count ?? ''}’`)
    .replace(new RegExp(`^${name}: (.+): No such file or directory$`, 'gm'), `${name}: cannot open '$1' for reading: No such file or directory`);
  return stderr === result.stderr ? result : { ...result, stderr };
};

// Whether a file operand is one only `eachInput` reads: `-` or a folder (T364, T365).
async function readsApart(args: readonly string[], ctx: Context, fs: TerminalFs) {
  for (const file of operandsOf(args, new Set(['-n', '-c', '--lines', '--bytes']))) if (file === '-' || (await isFolder(fs, ctx, file))) return true;
  return false;
}

const WHOLE_NUMBER = /^\d+$/;

const head: Fix = async (args, ctx, next, fs) => {
  // Two old-style counts: GNU reads the first and refuses the second.
  const counts = args.filter((arg) => /^-\d+$/.test(arg));
  if (counts.length > 1) return usageError('head', `invalid trailing option -- ${counts[1]!.slice(1)}`);
  const lines = countOption(args, 'n', 'lines');
  const worded = COUNT_WORDS('head', args);
  if (lines !== null && /^-\d+$/.test(lines.count)) return worded(await eachInput('head', lines.rest, ctx, next, fs, ['-n', WHOLE], (bytes) => withoutLastLines(bytes, Number(lines.count.slice(1)))));
  const bytes = countOption(args, 'c', 'bytes');
  if (bytes !== null && /^-\d+$/.test(bytes.count)) return worded(await eachInput('head', bytes.rest, ctx, next, fs, ['-n', WHOLE], (all) => all.slice(0, Math.max(0, all.length - Number(bytes.count.slice(1))))));
  if (await readsApart(args, ctx, fs)) {
    if (bytes !== null && WHOLE_NUMBER.test(bytes.count)) return worded(await eachInput('head', bytes.rest, ctx, next, fs, ['-n', WHOLE], (all) => all.slice(0, Number(bytes.count))));
    const count = lines === null ? 10 : WHOLE_NUMBER.test(lines.count) ? Number(lines.count) : null;
    if (count !== null) return worded(await eachInput('head', lines?.rest ?? args, ctx, next, fs, ['-n', WHOLE], (all) => all.slice(0, count === 0 ? 0 : (lineEnds(all)[count - 1] ?? all.length))));
  }
  return worded(await addTry('head')(args, ctx, next, fs));
};

const tail: Fix = async (args, ctx, next, fs) => {
  const bytes = countOption(args, 'c', 'bytes');
  if (bytes !== null && /^\+?\d+$/.test(bytes.count)) {
    const from = bytes.count.startsWith('+');
    const count = Number(bytes.count);
    return COUNT_WORDS('tail', args)(await eachInput('tail', bytes.rest, ctx, next, fs, ['-n', `+1`], (all) => (from ? all.slice(Math.max(0, count - 1)) : count === 0 ? all.slice(all.length) : all.slice(-count))));
  }
  const lines = countOption(args, 'n', 'lines');
  if (await readsApart(args, ctx, fs) && (lines === null || /^\+?\d+$/.test(lines.count))) {
    const count = Number(lines?.count ?? 10);
    const from = lines?.count.startsWith('+') === true;
    return COUNT_WORDS('tail', args)(await eachInput('tail', lines?.rest ?? args, ctx, next, fs, ['-n', '+1'], (all) => {
      const ends = lineEnds(all);
      const skip = from ? Math.max(0, count - 1) : Math.max(0, ends.length - count);
      return skip >= ends.length ? all.slice(all.length) : all.slice(skip === 0 ? 0 : ends[skip - 1]);
    }));
  }
  return COUNT_WORDS('tail', args)(await addTry('tail')(args, ctx, next, fs));
};

// `uniq -c`: GNU's count takes 7 columns.
const uniq: Fix = async (args, ctx, next, fs) => {
  const valued = new Set(['-f', '-s', '-w', '--skip-fields', '--skip-chars', '--check-chars']);
  const operands = operandsOf(args, valued);
  if (args.includes('--help')) return next(args);
  if (operands.length > 2) return usageError('uniq', `extra operand ‘${operands[2]!}’`);
  // Repeated lines and unique lines at once: no line is both (T373).
  const has = (long: string, letter: string) => args.some((arg) => arg === long || (!arg.startsWith('--') && arg.startsWith('-') && arg.includes(letter)));
  const missing = operands[0] !== undefined && operands[0] !== '-' && !(await fs.exists(fs.resolvePath(ctx.cwd, operands[0])));
  if (has('--repeated', 'd') && has('--unique', 'u') && !missing && operands.length < 2) return { stdout: '', stderr: '', exitCode: 0 };
  if (operands[0] !== undefined && (await isFolder(fs, ctx, operands[0]))) return failed(`uniq: error reading '${operands[0]}': Is a directory\n`, 1);
  if (operands.length === 2) {
    const shown = await uniq(args.toSpliced(args.lastIndexOf(operands[1]!), 1), ctx, next, fs);
    if (shown.exitCode !== 0) return shown;
    await writeOutput(fs, fs.resolvePath(ctx.cwd, operands[1]!), shown);
    return { ...shown, stdout: '' };
  }
  // `-i` folds only ASCII here: each other character's bytes hidden from it (T396).
  const folds = args.some((arg) => arg === '--ignore-case' || /^-[a-z]*i/.test(arg));
  const typedInput = folds ? (operands.length === 0 || operands[0] === '-' ? new TextDecoder().decode(inputBytes(ctx)) : await fs.readFile(fs.resolvePath(ctx.cwd, operands[0]!)).catch(() => null)) : null;
  if (typedInput !== null && /[^\x00-\x7f]/.test(typedInput)) {
    const hiddenInput = typedInput.replace(/[^\x00-\x7f]/gu, (char) => [...new TextEncoder().encode(char)].map((byte) => String.fromCharCode(0xf700 + byte)).join(''));
    const ran = await next(args.filter((arg) => arg !== operands[0]), hiddenInput);
    const shownBytes: number[] = [];
    for (const piece of ran.stdout.split(/([\uF700-\uF7FF])/u)) {
      if (/^[\uF700-\uF7FF]$/u.test(piece)) shownBytes.push(piece.charCodeAt(0) - 0xf700);
      else shownBytes.push(...new TextEncoder().encode(piece));
    }
    const stdout = new TextDecoder().decode(Uint8Array.from(shownBytes));
    return { ...ran, stdout: args.some((arg) => arg === '--count' || /^-[a-z]*c/.test(arg)) ? stdout.replace(/^ *(\d+) /gm, (_, count: string) => `${count.padStart(7)} `) : stdout };
  }
  const result = await addTry('uniq')(args, ctx, next, fs);
  if (!args.some((arg) => arg === '--count' || /^-[a-z]*c/.test(arg))) return result;
  return { ...result, stdout: result.stdout.replace(/^ *(\d+) /gm, (_, count: string) => `${count.padStart(7)} `) };
};

// `sed`'s options that take a value, so a file is told from one.
const SED_VALUED = new Set(['-e', '-f', '-l', '--expression', '--file']);

// `s…w file` as just-bash doesn't run it: it writes every line.
const WRITE_FLAG = /^((?:\d+|\$|\/[^/]*\/)?,?(?:\d+|\$|\/[^/]*\/)?s(.)(?:(?!\2).|\\.)*\2(?:(?!\2).|\\.)*\2[gip0-9]*)w +(.+)$/;

// A script's one-line `a\text`, `i\text` and `c\text`, as GNU reads them, and
// `T`, with no label ending the script (T320).
function sedScript(script: string): string {
  // Written where the line is printed, in its place among the others (T332).
  let text = script.replace(/^((?:\d+|\$|\/[^/]*\/)?\s*[aic])\\(?=[^\n])/, '$1\\\n').replace(/(?:^|(?<=[;\s]))(\d+),~(\d+)/g, (_, from: string, multiple: string) => `${from},${Number(multiple) === 0 ? from : (Math.floor(Number(from) / Number(multiple)) + 1) * Number(multiple)}`).replace(/(^|[;\s\d$/gi])w\s+\/dev\/(?:stdout|fd\/1)\s*$/, '$1p');
  // just-bash's `T` never sees a substitution end, so `t` past a `b`.
  let count = 0;
  let ends = false;
  text = text.replace(/(^|;)(\s*)T(?:\s+([^;\s]+))?\s*(?=;|$)/g, (_, lead: string, space: string, label?: string) => {
    ends ||= label === undefined;
    count += 1;
    return `${lead}${space}t __t${count};b ${label ?? '__end'};:__t${count}`;
  });
  if (ends) text += ';:__end';
  return text;
}

// `q5` and `Q5`: just-bash has no exit status for them.
const SED_QUIT = /^(\d+|\$)?([qQ])(\d+)$/;

const SED_USAGE = 'Usage: sed [OPTION]... {script-only-if-no-other-script} [input-file]...\n';

// `l` at a width: what it prints, broken as GNU breaks it, a `\` ending each piece.
async function sedList(address: string, width: number, list: readonly string[], scriptAt: number, next: Next): Promise<Output> {
  const quietly = (arg: string) => arg === '-n' || arg === '--quiet' || arg === '--silent';
  const quiet = list.some(quietly);
  const withScript = (script: string) => list.map((arg, at) => (at === scriptAt ? script : arg)).filter((arg) => !quietly(arg));
  const shown = await next(['-n', ...withScript(`${address}l`)]);
  if (shown.exitCode !== 0) return shown;
  const room = width <= 1 ? Number.POSITIVE_INFINITY : width - 1;
  const broken = shown.stdout.split('\n').slice(0, -1).map((line) => {
    // A character past ASCII as its bytes, each in octal, and none of them split.
    const bytes = line.slice(0, -1).replace(/\\([0-7]{4,})/g, (_, octal: string) => [...new TextEncoder().encode(String.fromCodePoint(Number.parseInt(octal, 8)))].map((byte) => `\\${byte.toString(8).padStart(3, '0')}`).join(''));
    let out = '';
    let filled = 0;
    for (const piece of bytes.match(/\\\d{3}|\\.|./gs) ?? []) {
      if (filled + piece.length > room) {
        out += '\\\n';
        filled = 0;
      }
      out += piece;
      filled += piece.length;
    }
    return `${out}$\n`;
  });
  if (quiet) return { ...shown, stdout: broken.join('') };
  const lines = (await next(['-n', ...withScript('p')])).stdout.split('\n').slice(0, -1);
  let listed = 0;
  const stdout = lines.map((line, at) => (address === '' || (address === '$' ? at === lines.length - 1 : Number(address) === at + 1) ? broken[listed++] ?? '' : '') + `${line}\n`).join('');
  return { ...shown, stdout };
}

const sed: Fix = async (typed, ctx, next, fs) => {
  const args = unbundled(typed.flatMap((arg) => (arg.startsWith('--expression=') ? ['-e', arg.slice(13)] : arg.startsWith('--file=') ? ['-f', arg.slice(7)] : [arg])), 'efl', 'i');
  if (args.length === 0) return failed(SED_USAGE, 1);
  const missingValue = valueMissing(args, 'ef');
  if (missingValue !== null) return failed(`sed: option requires an argument -- '${missingValue}'\n${SED_USAGE}`, 1);
  let list = args.map((arg) => (arg === '--in-place' ? '-i' : arg.startsWith('--in-place=') ? `-i${arg.slice(11)}` : arg));
  list = list.map((arg, at) => (list[at - 1] === '-e' || (at === list.findIndex((each) => !isOption(each)) && !list.includes('-e') && !list.includes('-f')) ? sedScript(arg) : arg));
  const original = next;
  const scriptAt0 = list.includes('-e') || list.includes('-f') ? -1 : list.findIndex((arg) => !isOption(arg));
  const quit = scriptAt0 < 0 ? null : SED_QUIT.exec(list[scriptAt0]!);
  if (quit !== null) list[scriptAt0] = `${quit[1] ?? ''}${quit[2]!}`;
  const script = scriptAt0 < 0 ? '' : list[scriptAt0]!;
  // What it says, and how it ends, as GNU's.
  const worded = (result: Output): Output => {
    let { stderr, exitCode } = result;
    const unterminated = /^sed: invalid command: unterminated (substitution|transliteration)/.exec(stderr);
    if (unterminated !== null) stderr = `sed: -e expression #1, char ${script.length}: unterminated \`${unterminated[1] === 'substitution' ? 's' : 'y'}' command\n`.replace('`', "'");
    if (/^sed: couldn't open file /.test(stderr)) exitCode = 4;
    else if (/^sed: nope|^sed: .+: No such file or directory$/m.test(stderr)) {
      stderr = stderr.replace(/^sed: (.+): No such file or directory$/gm, "sed: can't read $1: No such file or directory");
      exitCode = 2;
    }
    if (quit !== null && result.exitCode === 0) {
      const lines = new TextDecoder().decode(inputBytes(ctx)).split('\n').length - 1;
      if (quit[1] === undefined || quit[1] === '$' ? lines > 0 : lines >= Number(quit[1])) exitCode = Number(quit[3]);
    }
    return stderr === result.stderr && exitCode === result.exitCode ? result : { ...result, stderr, exitCode };
  };
  next = (each, input) => original(each, input).then(worded);
  // A script file with nothing in it is a script that does nothing.
  for (const [at, arg] of list.entries()) {
    if (arg !== '-f' || list[at + 1] === undefined) continue;
    const text = await fs.readFile(fs.resolvePath(ctx.cwd, list[at + 1]!)).catch(() => null);
    if (text !== null && text.trim() === '') list = list.toSpliced(at, 2, '-e', 'b');
  }
  const operands: string[] = [];
  let scripted = list.some((arg) => SED_VALUED.has(arg));
  for (let at = 0; at < list.length; at += 1) {
    if (SED_VALUED.has(list[at]!)) at += 1;
    else if (isOption(list[at]!)) continue;
    else if (scripted) operands.push(list[at]!);
    else scripted = true;
  }
  // `-i.bak` keeps the file as it was (`*` stands for its name).
  const suffix = list.find((arg) => /^-i.+/.test(arg) || arg.startsWith('--in-place='))?.replace(/^(-i|--in-place=)/, '');
  if (suffix !== undefined && suffix !== '') {
    for (const file of operands) {
      const path = fs.resolvePath(ctx.cwd, file);
      const content = await fs.readFile(path).catch(() => null);
      if (content === null) continue;
      const at = path.lastIndexOf('/') + 1;
      const name = path.slice(at);
      await fs.writeFile(`${path.slice(0, at)}${suffix.includes('*') ? suffix.replaceAll('*', name) : `${name}${suffix}`}`, content).catch(() => undefined);
    }
  }
  // A file it can't read is passed over, and the status says so (T351), as is a
  // folder (T365).
  const gone: string[] = [];
  const folders: string[] = [];
  for (const file of operands) {
    if (file === '-') continue;
    if (!(await fs.exists(fs.resolvePath(ctx.cwd, file)))) gone.push(file);
    else if (await isFolder(fs, ctx, file)) folders.push(file);
  }
  // A folder stops it there.
  const stopsAt = folders.length === 0 ? operands.length : operands.indexOf(folders[0]!);
  const passed = [...gone, ...operands.slice(stopsAt)];
  const passedWords = `${gone.map((file) => `sed: can't read ${file}: No such file or directory\n`).join('')}${folders.map((file) => `sed: read error on ${file}: Is a directory\n`).join('')}`;
  const passedStatus = folders.length > 0 ? 4 : 2;
  if (folders.length > 0 && new Set(passed).size === operands.length) return failed(passedWords, passedStatus);
  if (passed.length > 0 && passed.length < operands.length) {
    const kept = list.filter((arg, at) => !passed.includes(arg) || SED_VALUED.has(list[at - 1] ?? '') || at === list.findIndex((each) => !isOption(each)) && !list.some((each) => SED_VALUED.has(each)));
    const result = await next(kept);
    return { ...result, stderr: `${passedWords}${result.stderr}`, exitCode: result.exitCode === 0 ? passedStatus : result.exitCode };
  }
  // `l N` alone: just-bash's `l` takes no width (T374).
  const wrapped = scriptAt0 < 0 ? null : /^(\d+|\$)?l\s+(\d+)$/.exec(script);
  if (wrapped !== null) return sedList(wrapped[1] ?? '', Number(wrapped[2]), list, scriptAt0, next);
  const scriptAt = list.findIndex((arg) => !isOption(arg));
  const write = !list.some((arg) => SED_VALUED.has(arg)) && scriptAt >= 0 ? WRITE_FLAG.exec(list[scriptAt]!) : null;
  if (write === null) return next(list);
  // What it prints, and then the changed lines alone for the file.
  const shown = await next(list.toSpliced(scriptAt, 1, write[1]!));
  if (shown.exitCode !== 0) return shown;
  const changed = await next(['-n', ...list.filter((arg) => arg !== '-n').toSpliced(list.filter((arg, at) => at < scriptAt && arg !== '-n').length, 1, `${write[1]!}p`)]);
  await fs.writeFile(fs.resolvePath(ctx.cwd, write[3]!), changed.stdout).catch(() => undefined);
  return shown;
};

// `date -d` as GNU reads it, always in UTC, as `date` prints UTC here: just-bash
// reads a date in the browser's zone (T321).
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const UNITS: Readonly<Record<string, number>> = { sec: 1, second: 1, min: 60, minute: 60, hour: 3600, day: 86_400, week: 604_800, fortnight: 1_209_600 };

function readDate(typed: string, now: Date): number | null {
  let text = typed.trim().toLowerCase().replace(/\s+(?:utc|gmt)$|z$/, '').replace(/^(?:sun|mon|tue|wed|thu|fri|sat)[a-z]*,\s*/, '');
  if (text === '') return Math.floor(now.getTime() / 86_400_000) * 86_400;
  const at = /^@(-?\d+)(?:\.\d+)?$/.exec(text);
  if (at !== null) return Number(at[1]);
  let [year, month, day] = [now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()];
  let seconds = Math.floor(now.getTime() / 1000) % 86_400;
  let shift = 0;
  let months = 0;
  const take = (pattern: RegExp, use: (match: RegExpExecArray) => void) => {
    const match = pattern.exec(text);
    if (match === null) return false;
    use(match);
    text = text.replace(pattern, ' ').trim();
    return true;
  };
  const dateAt = (y: string, m: number, d: string) => {
    [year, month, day] = [Number(y), m, Number(d)];
    seconds = 0;
  };
  const monthOf = (word: string) => MONTHS.indexOf(word.slice(0, 3));
  // A number of minutes east of UTC, after a time (T395).
  take(/(?<=\d\s*)([-+])(\d{2}):?(\d{2})$/, (m) => (shift -= (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 3600 + Number(m[3]) * 60)));
  take(/\b(\d{4})-(\d{1,2})-(\d{1,2})(?=$|[\st])/, (m) => dateAt(m[1]!, Number(m[2]) - 1, m[3]!)) ||
    take(/\b(\d{4})(\d{2})(\d{2})\b/, (m) => dateAt(m[1]!, Number(m[2]) - 1, m[3]!)) ||
    take(/\b(\d{4})\/(\d{1,2})\/(\d{1,2})\b/, (m) => dateAt(m[1]!, Number(m[2]) - 1, m[3]!)) ||
    take(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/, (m) => dateAt(m[3]!, Number(m[1]) - 1, m[2]!)) ||
    take(/\b(\d{1,2})\s+([a-z]{3,9})\.?,?\s+(\d{4})\b/, (m) => dateAt(m[3]!, monthOf(m[2]!), m[1]!)) ||
    take(/\b([a-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/, (m) => dateAt(m[3]!, monthOf(m[1]!), m[2]!)) ||
    (monthWord(text) && take(/\b([a-z]{3,9})\.?\s+(\d{1,2})\b/, (m) => dateAt(String(year), monthOf(m[1]!), m[2]!)));
  if (month < 0 || month > 11) return null;
  take(/^t(?=\d)|\bt(?=\d)/, () => undefined);
  take(/\b(\d{1,2}):(\d\d)(?::(\d\d))?\b/, (m) => {
    seconds = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] ?? 0);
  });
  if (take(/^now$/, () => undefined) || take(/^today$/, () => undefined)) text = '';
  take(/\btomorrow\b/, () => (shift += 86_400));
  take(/\byesterday\b/, () => (shift -= 86_400));
  let weekday: { day: number; way: number } | null = null;
  take(/\b(next|last|this)?\s*(sun|mon|tue|wed|thu|fri|sat)(?:day|s|sday|nesday|r|rs|rsday|urday)?\b/, (m) => {
    weekday = { day: DAYS.indexOf(m[2]!), way: m[1] === 'last' ? -1 : 1 };
    seconds = 0;
  });
  for (;;) {
    const matched = take(/(next|last|this|[-+]?\d+)?\s*\b(sec|second|min|minute|hour|day|week|fortnight|month|year)s?(\s+ago)?\b/, (m) => {
      const amount = m[1] === 'next' ? 1 : m[1] === 'last' ? -1 : m[1] === 'this' ? 0 : Number(m[1] ?? 1);
      const count = amount * (m[3] === undefined ? 1 : -1);
      if (m[2] === 'month') months += count;
      else if (m[2] === 'year') months += 12 * count;
      else shift += count * UNITS[m[2]!]!;
    });
    if (!matched) break;
  }
  if (text !== '') return null;
  // A day its month doesn't have is no date.
  const base = Date.UTC(year, month, day);
  const check = new Date(base);
  if (check.getUTCMonth() !== month || check.getUTCDate() !== day) return null;
  let value = Date.UTC(year, month + months, day) / 1000 + seconds + shift;
  if (weekday !== null) {
    const { day: wanted, way } = weekday as { day: number; way: number };
    const today = new Date(value * 1000).getUTCDay();
    const gap = way > 0 ? (wanted - today + 7) % 7 || 7 : -((today - wanted + 7) % 7 || 7);
    value += gap * 86_400;
  }
  return value;
}
const monthWord = (text: string) => /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d/.test(text);

// A format's flags and widths, which just-bash leaves as they are: marks around
// the value it prints, then the flag's work on that value.
const FLAGGED = /%([-_0^#]*)(\d*)([a-zA-Z%])/g;
const NUMERIC = /^\s*\d+$/;
const dateFormat = (format: string) => format.replace(FLAGGED, (whole, flags: string, width: string, spec: string) => (flags === '' && width === '' ? whole : `\u0001${flags}\u0003${width}\u0003${spec}\u0003%${spec}\u0002`));
const dateValues = (text: string) =>
  text.replace(/\u0001([^\u0003]*)\u0003(\d*)\u0003(.)\u0003([^\u0002]*)\u0002/g, (_, flags: string, width: string, spec: string, value: string) => {
    let out = value;
    const numeric = NUMERIC.test(out);
    if (numeric && flags.includes('-')) out = out.trim().replace(/^0+(?=\d)/, '');
    else if (numeric && flags.includes('_')) out = out.replace(/^[0 ]+(?=\d)/, (lead) => ' '.repeat(lead.length));
    else if (numeric && flags.includes('0')) out = out.replace(/^ +/, (lead) => '0'.repeat(lead.length));
    if (flags.includes('^') || (flags.includes('#') && /[aAbBhpZ]/.test(spec))) out = out.toUpperCase();
    if (flags.includes('-') || width === '') return out;
    const pad = numeric && !flags.includes('_') ? '0' : ' ';
    return out.padStart(Number(width), pad);
  });

const ISO: Readonly<Record<string, string>> = { date: '+%F', hours: '+%FT%H+00:00', minutes: '+%FT%H:%M+00:00', seconds: '+%FT%T+00:00', ns: '+%FT%T,%N+00:00' };
const ISO_WORDS = 'Valid arguments are:\n  - ‘hours’\n  - ‘minutes’\n  - ‘date’\n  - ‘seconds’\n  - ‘ns’\n';
// `%q`, the quarter, which just-bash's `date` doesn't have (T373).
const ZONES: Readonly<Record<string, string>> = { '%:z': '+00:00', '%::z': '+00:00:00', '%:::z': '+00' };
const quarterMarks = (format: string) => format.replace(/%%|%q|%:{1,3}z/g, (spec) => (spec === '%q' ? '\u0004%m\u0004' : (ZONES[spec] ?? spec)));
const quarters = (text: string) => text.replace(/\u0004(\d+)\u0004/g, (_, month: string) => String(Math.ceil(Number(month) / 3)));

const date: Fix = async (args, ctx, next, fs) => {
  const wrong = unlisted(args.filter((_, at) => args[at - 1] !== '-d' && args[at - 1] !== '--date').map((arg) => (/^-[dI]./.test(arg) ? arg.slice(0, 2) : arg)), 'duIR', ['--date', '--utc', '--universal', '--iso-8601', '--rfc-email', '--help']);
  if (wrong !== null) return wrongOption('date', wrong);
  const list: string[] = [];
  let operand: string | null = null;
  for (let at = 0; at < args.length; at += 1) {
    const arg = args[at]!;
    const iso = /^(?:-I|--iso-8601(?:=|$))(.*)$/.exec(arg);
    if (iso !== null) {
      const format = ISO[iso[1] || 'date'];
      if (format === undefined) return failed(`date: invalid argument ‘${iso[1]!}’ for ‘--iso-8601’\n${ISO_WORDS}${tryHelp('date')}`, 1);
      list.push(format);
    }
    else if (arg === '-d' || arg === '--date' || arg.startsWith('--date=') || (arg.startsWith('-d') && !arg.startsWith('--'))) {
      const typed = arg === '-d' || arg === '--date' ? args[(at += 1)] ?? '' : arg.startsWith('--date=') ? arg.slice(7) : arg.slice(2);
      const value = readDate(typed, new Date());
      if (value === null) return failed(`date: invalid date ‘${typed}’\n`, 1);
      list.push('-d', `@${value}`);
    } else if (!isOption(arg)) {
      if (operand !== null) return usageError('date', `extra operand ‘${arg}’`);
      operand = arg;
      if (arg.startsWith('+')) list.push(quarterMarks(dateFormat(arg)));
    } else list.push(arg);
  }
  if (operand === '+') return { stdout: '\n', stderr: '', exitCode: 0 };
  if (operand !== null && !operand.startsWith('+')) return failed(`date: invalid date ‘${operand}’\n`, 1);
  const result = await addTry('date')(list, ctx, next, fs);
  return { ...result, stdout: quarters(dateValues(result.stdout)), stderr: result.stderr.replace(/^(date: invalid date )'(.*)'$/gm, '$1‘$2’') };
};

const env: Fix = async (args, ctx, next, fs) => {
  const result = await addTry('env', 125)(args, ctx, next, fs);
  const missing = /^bash: (\S+): command not found\n$/.exec(result.stderr);
  if (missing !== null) return { ...result, stderr: `env: ‘${missing[1]!}’: No such file or directory\n`, exitCode: 127 };
  const words = args.filter((arg) => !isOption(arg) && arg !== '-');
  const lists = words.every((word) => word.includes('=')) || words.at(-1) === 'env';
  if (!lists) return result;
  // `$?` and the positional parameters are no variables (T337).
  const named = result.stdout.replace(/^(?:\?|#|@|\*|\d+|BASH|BASH_VERSION)=.*\n/gm, '');
  // just-bash adds the working folder to an emptied environment.
  const emptied = args.includes('-i') || args.includes('--ignore-environment') || args[0] === '-';
  if (!emptied || words.at(-1) !== 'env' || words.some((word) => word.startsWith('PWD='))) return { ...result, stdout: named };
  return { ...result, stdout: named.replace(/^PWD=.*\n/m, '') };
};

// `xargs`' options that take a value.
const XARGS_VALUED = /^-([IdnPsLaE])(.+)$/;

// `-d` with an empty item, which just-bash's `-0` drops (T396): run here, each
// batch by `-n`.
async function eachBatch(items: readonly string[], list: readonly string[], command: readonly string[], ctx: Context): Promise<Output> {
  const size = list.includes('-n') ? Number(list[list.lastIndexOf('-n') + 1]) : items.length;
  const words = command.length === 0 ? ['echo'] : command;
  const trace = list.includes('-t') || list.includes('--verbose');
  let [stdout, stderr, exitCode] = ['', '', 0];
  for (let at = 0; at < items.length; at += size) {
    const run = [...words, ...items.slice(at, at + size)];
    if (trace) stderr += `${run.join(' ')}\n`;
    const ran = await ctx.exec!(run.map(quote).join(' '), { cwd: ctx.cwd, env: Object.fromEntries(ctx.env) });
    stdout += ran.stdout;
    stderr += ran.stderr;
    if (ran.exitCode !== 0) exitCode = ran.exitCode > 125 ? ran.exitCode : 123;
  }
  return { stdout, stderr, exitCode };
}

const xargs: Fix = async (typed, ctx, next) => {
  if (typed.includes('--help')) return next(typed);
  const args = unbundled(typed, 'IdnPsLaE', 'ile', true);
  const wrong = unlisted(args.flatMap((arg, at) => (/^-[IdnP]$/.test(args[at - 1] ?? '') ? [] : [arg])), 'IdnP0tr', ['--null', '--verbose', '--no-run-if-empty'], true);
  if (wrong !== null) return wrongOption('xargs', wrong);
  const list: string[] = [];
  let at = 0;
  for (; at < args.length && isOption(args[at]!); at += 1) {
    const arg = args[at]!;
    const joined = XARGS_VALUED.exec(arg);
    if (joined !== null) list.push(`-${joined[1]!}`, joined[2]!);
    else {
      list.push(arg);
      if (/^-[IdnPsLaE]$/.test(arg)) {
        if (at + 1 === args.length) return noValue('xargs', arg[1]!);
        list.push(args[(at += 1)]!);
      }
    }
  }
  for (const [each, value] of list.entries()) {
    const number = /^-([nPsL])$/.exec(list[each - 1] ?? '')?.[1];
    if (number !== undefined && !/^\d+$/.test(value)) return usageError('xargs', `invalid number "${value}" for -${number} option`);
    if (number === 'n' && Number(value) === 0) return usageError('xargs', `value ${value} for -${number} option should be >= 1`);
  }
  // Whichever of `-n` and `-I` comes last wins.
  let warning = '';
  const [countAt, replaceAt] = [list.lastIndexOf('-n'), list.lastIndexOf('-I')];
  if (countAt >= 0 && replaceAt >= 0) {
    warning = countAt < replaceAt ? 'xargs: warning: options --max-args and --replace/-I/-i are mutually exclusive, ignoring previous --max-args value\n' : 'xargs: warning: options --replace and --max-args/-n are mutually exclusive, ignoring previous --replace value\n';
    list.splice(Math.min(countAt, replaceAt), 2);
  }
  const warned = (result: Output) => (warning === '' ? result : { ...result, stderr: `${warning}${result.stderr}` });
  const command = args.slice(at);
  // Its input as GNU reads it, one item for each, unless told how to split it.
  const raw = !list.some((arg) => arg === '-0' || arg === '--null' || arg === '-d' || arg === '--delimiter');
  let input: string | undefined;
  if (raw) {
    const text = new TextDecoder().decode(inputBytes(ctx));
    const items: string[] = [];
    const lineWise = list.includes('-I');
    let quoted: string | null = null;
    let item: string | null = null;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index]!;
      if (quoted !== null) {
        if (char === quoted) quoted = null;
        else if (char === '\n') return failed(`xargs: unmatched ${quoted === "'" ? 'single' : 'double'} quote; by default quotes are special to xargs unless you use the -0 option\n`, 1);
        else item += char;
      } else if (char === '"' || char === "'") {
        quoted = char;
        item ??= '';
      } else if (char === '\\') item = `${item ?? ''}${text[(index += 1)] ?? ''}`;
      else if (char === '\n' || (!lineWise && (char === ' ' || char === '\t'))) {
        if (item !== null) items.push(item);
        item = null;
      } else if (item !== null || (char !== ' ' && char !== '\t')) item = `${item ?? ''}${char}`;
    }
    if (quoted !== null) return failed(`xargs: unmatched ${quoted === "'" ? 'single' : 'double'} quote; by default quotes are special to xargs unless you use the -0 option\n`, 1);
    if (item !== null) items.push(item);
    if (items.length > 0) input = items.map((each) => `${each}\0`).join('');
    if (items.length > 0) list.unshift('-0');
  }
  // `-d`: every item as it stands, the last line's newline too.
  const delimiterAt = list.lastIndexOf('-d');
  if (!raw && delimiterAt >= 0) {
    const escapes: Readonly<Record<string, string>> = { '\\n': '\n', '\\t': '\t', '\\0': '\0', '\\\\': '\\' };
    const typedDelimiter = list[delimiterAt + 1]!;
    const delimiter = escapes[typedDelimiter] ?? typedDelimiter;
    if ([...delimiter].length !== 1) return failed(`xargs: Invalid input delimiter specification ${typedDelimiter}: the delimiter must be either a single character or an escape sequence starting with \\.\n`, 1);
    const text = new TextDecoder().decode(inputBytes(ctx));
    const items = text.split(delimiter);
    if (items.at(-1) === '') items.pop();
    if (items.includes('') && !list.includes('-I')) return eachBatch(items, list, command, ctx).then(notFound(command)).then(warned);
    if (items.length > 0) {
      list.splice(delimiterAt, 2, '-0');
      input = items.map((each) => `${each}\0`).join('');
    }
  }
  // A command that fails makes `xargs` end with 123.
  const failing = (result: Output) => (result.exitCode >= 1 && result.exitCode <= 125 && command[0] !== undefined ? { ...result, exitCode: 123 } : result);
  // GNU runs the command once with no input, unless told not to.
  if (new TextDecoder().decode(inputBytes(ctx)).trim() === '' && !list.some((arg) => arg === '-r' || arg === '--no-run-if-empty' || arg === '-I')) {
    return ctx.exec!((command.length === 0 ? ['echo'] : command).map(quote).join(' '), { cwd: ctx.cwd, env: Object.fromEntries(ctx.env) }).then(notFound(command)).then(warned);
  }
  return next([...list, ...command], input).then(notFound(command)).then(failing).then(warned);
};

const notFound = (command: readonly string[]) => (result: Output) => {
  const word = command[0];
  if (word === undefined || !result.stderr.includes(`bash: ${word}: command not found\n`)) return result;
  return { ...result, stderr: `xargs: failed to run command ‘${word}’: No such file or directory\n`, exitCode: 127 };
};

// `cp -rv` names each thing it copied in a folder, where just-bash names the folder.
async function withContents(shown: string, operands: readonly string[], intoFolder: boolean, ctx: Context, fs: TerminalFs): Promise<string> {
  const target = operands.at(-1)!.replace(/(.)\/+$/, '$1');
  let lines = '';
  const listed = async (from: string, to: string) => {
    lines += `'${from}' -> '${to}'\n`;
    const path = fs.resolvePath(ctx.cwd, from);
    if ((await fs.stat(path).catch(() => null))?.isDirectory !== true) return;
    for (const name of [...(await fs.readdir(path))].sort()) await listed(`${from}/${name}`, `${to}/${name}`);
  };
  const sources = operands.slice(0, -1).map((source) => source.replace(/(.)\/+$/, '$1'));
  if (sources.length === 0 || !sources.every((source) => shown.includes(`'${source}' -> '`))) return shown;
  for (const source of sources) await listed(source, intoFolder ? `${target}/${source.slice(source.lastIndexOf('/') + 1)}` : target);
  return lines;
}

// What GNU's `cp` and `mv` refuse before they touch anything, in its words (T369).
async function refusedMove(name: 'cp' | 'mv', args: readonly string[], operands: readonly string[], ctx: Context, fs: TerminalFs): Promise<Output | null> {
  if (operands.length < 2 || args.some((arg) => arg.startsWith('-t') || arg.startsWith('--target'))) return null;
  const recursive = name === 'mv' || args.some((arg) => arg === '--recursive' || /^-[a-zA-Z]*[rRa]/.test(arg));
  const typedTarget = operands.at(-1)!;
  const target = typedTarget.replace(/(.)\/+$/, '$1');
  const intoFolder = await isFolder(fs, ctx, target);
  const targetWrong = await notFolder(fs, ctx, typedTarget);
  let stderr = '';
  for (const typed of operands.slice(0, -1)) {
    const source = typed.replace(/(.)\/+$/, '$1');
    // An empty name is no name at all, and a final slash a folder's (T378, T385).
    if (typed === '' || (await notFolder(fs, ctx, typed)) === 'Not a directory') {
      stderr += `${name}: cannot stat '${typed}': ${typed === '' ? 'No such file or directory' : 'Not a directory'}\n`;
      continue;
    }
    const stat = await fs.stat(fs.resolvePath(ctx.cwd, source)).catch(() => null);
    if (stat === null) continue;
    if (targetWrong !== null && !(stat.isDirectory && targetWrong === 'No such file or directory')) {
      stderr += name === 'mv' ? `mv: cannot move '${typed}' to '${typedTarget}': ${targetWrong}\n` : targetWrong === 'Not a directory' ? `cp: cannot stat '${typedTarget}': Not a directory\n` : `cp: cannot create regular file '${typedTarget}': ${targetWrong}\n`;
      continue;
    }
    const end = intoFolder ? `${target}/${source.slice(source.lastIndexOf('/') + 1)}` : target;
    const [from, to] = [source, end].map((path) => fs.canonical(fs.resolvePath(ctx.cwd, path)));
    if (stat.isDirectory && recursive && (to === from || to!.startsWith(`${from!}/`))) {
      stderr += name === 'cp' ? `cp: cannot copy a directory, '${source}', into itself, '${end}'\n` : `mv: cannot move '${source}' to a subdirectory of itself, '${end}'\n`;
      // GNU's `cp` has made the folder by the time it sees that.
      if (name === 'cp' && to !== from) await fs.mkdir(to!).catch(() => undefined);
      continue;
    }
    const there = await fs.stat(to!).catch(() => null);
    if (there === null) {
      const at = end.lastIndexOf('/');
      if (at > 0 && !(await fs.exists(fs.resolvePath(ctx.cwd, end.slice(0, at))))) stderr += name === 'mv' ? `mv: cannot move '${source}' to '${end}': No such file or directory\n` : stat.isDirectory ? '' : `cp: cannot create regular file '${end}': No such file or directory\n`;
      continue;
    }
    if (to === from) continue;
    if (name === 'mv' && stat.isDirectory && there.isDirectory && (await fs.readdir(to!)).length > 0) stderr += `mv: cannot overwrite '${end}': Directory not empty\n`;
    else if (stat.isDirectory && !there.isDirectory) stderr += `${name}: cannot overwrite non-directory '${end}' with directory '${source}'\n`;
    else if (!stat.isDirectory && there.isDirectory) stderr += `${name}: cannot overwrite directory '${end}' with non-directory '${source}'\n`;
  }
  return stderr === '' ? null : failed(stderr, 1);
}

const copy =
  (name: 'cp' | 'mv'): Fix =>
  async (args, ctx, next, fs) => {
    if (args.includes('--help')) return next(args);
    const operands = args.filter((arg) => !isOption(arg));
    if (!args.some((arg) => arg.startsWith('-t') || arg.startsWith('--target'))) {
      if (operands.length === 0) return failed(`${name}: missing file operand\n${tryHelp(name)}`, 1);
      if (operands.length === 1) return failed(`${name}: missing destination file operand after '${operands[0]!}'\n${tryHelp(name)}`, 1);
    }
    const refused = await refusedMove(name, args, operands, ctx, fs);
    if (refused !== null) return refused;
    const noClobber = args.includes('--no-clobber') || args.some((arg) => /^-[a-zA-Z]*n/.test(arg));
    if (operands.length === 2 && samePath(ctx, fs, operands[0]!, operands[1]!) && noClobber && (await fs.exists(fs.resolvePath(ctx.cwd, operands[0]!)))) return { stdout: '', stderr: '', exitCode: 0 };
    if (operands.length === 2 && samePath(ctx, fs, operands[0]!, operands[1]!) && (await fs.exists(fs.resolvePath(ctx.cwd, operands[0]!)))) return failed(`${name}: '${operands[0]!}' and '${operands[1]!}' are the same file\n`, 1);
    if (operands.length > 2 && !(await fs.exists(fs.resolvePath(ctx.cwd, operands.at(-1)!)))) return failed(`${name}: target '${operands.at(-1)!}': No such file or directory\n`, 1);
    // Whether the last operand was a folder before the copy made it one.
    const intoFolder = (await fs.stat(fs.resolvePath(ctx.cwd, operands.at(-1) ?? '')).catch(() => null))?.isDirectory === true;
    const result = await addTry(name)(args, ctx, next, fs);
    // `-v` names a path as typed, where just-bash's are absolute.
    const shown = operands.at(-1)?.startsWith('/') === true || result.stdout === '' ? result.stdout : result.stdout.replaceAll(` -> '${ctx.cwd === '/' ? '' : ctx.cwd}/`, " -> '");
    const copied = name === 'cp' && shown !== '' && args.some((arg) => arg === '--recursive' || /^-[a-zA-Z]*[rRa]/.test(arg)) ? await withContents(shown, operands, intoFolder, ctx, fs) : shown;
    return copied === result.stdout ? result : { ...result, stdout: copied };
  };

// Two folders, one level down: `-r` isn't listed (T366).
async function diffFolders(left: string, right: string, options: readonly string[], ctx: Context, next: Next, fs: TerminalFs): Promise<Output> {
  const [a, b] = [left, right].map((path) => path.replace(/(.)\/+$/, '$1')) as [string, string];
  const [inLeft, inRight] = await Promise.all([a, b].map((path) => fs.readdir(fs.resolvePath(ctx.cwd, path))));
  let stdout = '';
  let stderr = '';
  let exitCode = 0;
  for (const name of [...new Set([...inLeft!, ...inRight!])].sort()) {
    if (!inRight!.includes(name) || !inLeft!.includes(name)) {
      stdout += `Only in ${inLeft!.includes(name) ? a : b}: ${name}\n`;
      exitCode = Math.max(exitCode, 1);
      continue;
    }
    const [x, y] = [`${a}/${name}`, `${b}/${name}`];
    const [xFolder, yFolder] = [await isFolder(fs, ctx, x), await isFolder(fs, ctx, y)];
    if (xFolder && yFolder) stdout += `Common subdirectories: ${x} and ${y}\n`;
    else if (xFolder !== yFolder) {
      const kind = async (path: string, folder: boolean) => (folder ? 'directory' : (await fs.stat(fs.resolvePath(ctx.cwd, path))).size === 0 ? 'regular empty file' : 'regular file');
      stdout += `File ${x} is a ${await kind(x, xFolder)} while file ${y} is a ${await kind(y, yFolder)}\n`;
      exitCode = Math.max(exitCode, 1);
    } else {
      const compared = await next([...options, x, y]);
      stderr += compared.stderr;
      if (compared.stdout !== '') stdout += `${compared.exitCode === 1 && !options.includes('-q') && !options.includes('--brief') ? `diff ${[...options, x, y].join(' ')}\n` : ''}${stdoutText(compared)}`;
      exitCode = Math.max(exitCode, compared.exitCode);
    }
  }
  return { stdout, stderr, exitCode };
}

const stdoutText = (result: Output) => (isBytes(result) ? new TextDecoder().decode(fromByteString(result.stdout)) : result.stdout);

const diff: Fix = async (args, ctx, next, fs) => {
  if (args.includes('--help')) return next(args);
  if (args.includes('--version') || args.includes('-v')) return { stdout: 'diff (GNU diffutils) 3.12\n', stderr: '', exitCode: 0 };
  const wrong = unlisted(args, 'ucqsiv', ['--normal', '--unified', '--context', '--brief', '--report-identical-files', '--ignore-case']);
  if (wrong !== null) return wrongOption('diff', wrong);
  const operands = args.filter((arg) => !isOption(arg));
  if (operands.length < 2) return failed(`diff: missing operand after ‘${operands[0] ?? 'diff'}’\ndiff: ${tryHelp('diff')}`, 2);
  if (operands.length > 2) return failed(`diff: extra operand ‘${operands[2]!}’\ndiff: ${tryHelp('diff')}`, 2);
  // A folder beside a file: the file of that name in the folder (T345).
  const [first, second] = await Promise.all(operands.slice(0, 2).map((operand) => (operand === '-' || operand.startsWith('/dev/fd/') ? null : fs.stat(fs.resolvePath(ctx.cwd, operand)).catch(() => null))));
  const folderOf = (stat: typeof first) => stat?.isDirectory === true;
  if (folderOf(first) && folderOf(second)) return diffFolders(operands[0]!, operands[1]!, args.filter(isOption), ctx, next, fs);
  const paired = (folder: string, file: string) => `${folder.replace(/\/+$/, '')}/${file.slice(file.lastIndexOf('/') + 1)}`;
  const shown = folderOf(first) && !folderOf(second) && second !== null ? [paired(operands[0]!, operands[1]!), operands[1]!] : folderOf(second) && !folderOf(first) && first !== null ? [operands[0]!, paired(operands[1]!, operands[0]!)] : operands;
  const missing: string[] = [];
  for (const operand of shown.slice(0, 2)) if (operand !== '-' && !operand.startsWith('/dev/fd/') && !(await fs.exists(fs.resolvePath(ctx.cwd, operand)))) missing.push(`diff: ${operand}: No such file or directory\n`);
  if (missing.length > 0) return failed(missing.join(''), 2);
  // A file with itself: there's nothing to compare, and `-s` says so.
  const identical = args.some((arg) => arg === '--report-identical-files' || /^-[a-zA-Z]*s/.test(arg)) ? `Files ${shown[0]!} and ${shown[1]!} are identical\n` : '';
  if (shown[0] !== '-' && shown[1] !== '-' && fs.canonical(fs.resolvePath(ctx.cwd, shown[0]!)) === fs.canonical(fs.resolvePath(ctx.cwd, shown[1]!))) return { stdout: identical, stderr: '', exitCode: 0 };
  return addTry('diff')(args.map((arg) => (arg === operands[0] ? shown[0]! : arg === operands[1] ? shown[1]! : arg)), ctx, next, fs);
};

// What's wrong with a `-k`'s value, in GNU's words.
function sortKeyError(key: string): string | null {
  const field = (spec: string, at: 'start' | 'end'): string | null => {
    const [, digits, dot, offset, rest] = /^(\d*)(\.?)(\d*)(.*)$/s.exec(spec)!;
    if (digits === '') return at === 'start' ? `invalid number at field start: invalid count at start of ‘${spec}’` : `invalid number after ',': invalid count at start of ‘${spec}’`;
    if (/^0+$/.test(digits!)) return `field number is zero: invalid field specification ‘${key}’`;
    if (dot === '.' && offset === '') return `invalid number after '.': invalid count at start of ‘${rest}’`;
    if (at === 'start' && dot === '.' && /^0+$/.test(offset!)) return `character offset is zero: invalid field specification ‘${key}’`;
    if (!/^[bdfgiMhnRrV]*$/.test(rest!)) return `stray character in field spec: invalid field specification ‘${key}’`;
    return null;
  };
  const comma = key.indexOf(',');
  return field(comma < 0 ? key : key.slice(0, comma), 'start') ?? (comma < 0 ? null : field(key.slice(comma + 1), 'end'));
}

// One key of `sort`: where it is on the line and how it compares.
type SortKey = { startField: number; startChar: number; endField: number | null; endChar: number; options: string; startBlanks: boolean; endBlanks: boolean };

const SORT_LONG: Readonly<Record<string, string>> = { '--ignore-leading-blanks': 'b', '--dictionary-order': 'd', '--ignore-case': 'f', '--human-numeric-sort': 'h', '--month-sort': 'M', '--numeric-sort': 'n', '--reverse': 'r', '--version-sort': 'V', '--check': 'c', '--stable': 's', '--unique': 'u' };
const SORT_ORDERING = 'dfhMnrV';

function sortKey(text: string): SortKey {
  const [start = '', end] = text.split(',');
  const [, field = '1', char = '1', options = ''] = /^(\d+)(?:\.(\d+))?(.*)$/.exec(start) ?? [];
  const last = end === undefined ? null : /^(\d+)(?:\.(\d+))?(.*)$/.exec(end);
  const endOptions = last?.[3] ?? '';
  return { startField: Number(field) - 1, startChar: Number(char) - 1, endField: last === null ? null : Number(last[1]), endChar: Number(last?.[2] ?? 0), options: `${options}${endOptions}`.replaceAll('b', ''), startBlanks: options.includes('b'), endBlanks: endOptions.includes('b') };
}

const isBlank = (char: string | undefined) => char === ' ' || char === '\t';

// The key's part of the line, as GNU finds its two ends.
function keyText(line: string, key: SortKey, tab: string | null): string {
  const skipBlanks = (from: number) => {
    let at = from;
    while (at < line.length && isBlank(line[at])) at += 1;
    return at;
  };
  const skipFields = (count: number) => {
    let at = 0;
    for (let field = 0; field < count && at < line.length; field += 1) {
      if (tab !== null) {
        const found = line.indexOf(tab, at);
        at = found < 0 ? line.length : found + tab.length;
      } else {
        at = skipBlanks(at);
        while (at < line.length && !isBlank(line[at])) at += 1;
      }
    }
    return at;
  };
  let start = skipFields(key.startField);
  if (key.startBlanks) start = skipBlanks(start);
  start = Math.min(line.length, start + key.startChar);
  if (key.endField === null) return line.slice(start);
  let end: number;
  if (key.endChar === 0) {
    end = skipFields(key.endField);
    // A field ends before the tab that follows it.
    if (tab !== null && end <= line.length && line.slice(end - tab.length, end) === tab) end -= tab.length;
  } else {
    end = skipFields(key.endField - 1);
    if (key.endBlanks) end = skipBlanks(end);
    end = Math.min(line.length, end + key.endChar);
  }
  return line.slice(start, Math.max(start, end));
}

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const leadingNumber = (text: string) => Number(/^[ \t]*(-?\d*\.?\d*)/.exec(text)?.[1]) || 0;
const humanRank = (text: string) => ' KMGTPEZYRQ'.indexOf((/^[ \t]*-?\d*\.?\d*([kKMGTPEZYRQ])/.exec(text)?.[1] ?? ' ').toUpperCase());
const versionParts = (text: string) => text.match(/\d+|\D+/g) ?? [];

function versionOrder(a: string, b: string): number {
  const [left, right] = [versionParts(a), versionParts(b)];
  for (let at = 0; at < Math.min(left.length, right.length); at += 1) {
    const [x, y] = [left[at]!, right[at]!];
    const numbers = /^\d/.test(x) && /^\d/.test(y);
    const order = numbers ? Number(x) - Number(y) : x < y ? -1 : x > y ? 1 : 0;
    if (order !== 0) return order;
  }
  return left.length - right.length;
}

// A key's two values by its options, a byte at a time: C.UTF-8's order.
function keyOrder(a: string, b: string, options: string): number {
  let [x, y] = [a, b];
  if (options.includes('d')) [x, y] = [x.replace(/[^ \t0-9A-Za-z]/g, ''), y.replace(/[^ \t0-9A-Za-z]/g, '')];
  if (options.includes('f')) [x, y] = [x.replace(/[a-z]+/g, (word) => word.toUpperCase()), y.replace(/[a-z]+/g, (word) => word.toUpperCase())];
  let order: number;
  if (options.includes('n')) order = leadingNumber(x) - leadingNumber(y);
  else if (options.includes('h')) {
    const [m, n] = [leadingNumber(x), leadingNumber(y)];
    order = Math.sign(m) - Math.sign(n) || Math.sign(m || 1) * (humanRank(x) - humanRank(y)) || m - n;
  } else if (options.includes('M')) {
    const month = (text: string) => MONTH_NAMES.indexOf(text.trimStart().slice(0, 3).toUpperCase());
    order = month(x) - month(y);
  } else if (options.includes('V')) order = versionOrder(x, y);
  else order = x < y ? -1 : x > y ? 1 : 0;
  return options.includes('r') ? -order : order;
}

const sort: Fix = async (args, ctx, next, fs) => {
  if (args.includes('--help')) return next(args);
  if (args.at(-1) === '-k' || args.at(-1) === '-t' || args.at(-1) === '-o') return usageError('sort', `option requires an argument -- '${args.at(-1)!.slice(1)}'`, 2);
  let flags = '';
  const keys: string[] = [];
  const files: string[] = [];
  let tab: string | null = null;
  let output: string | null = null;
  let end = false;
  for (let at = 0; at < args.length; at += 1) {
    const arg = args[at]!;
    const long = /^(--key|--field-separator|--output)(?:=(.*))?$/s.exec(arg);
    if (end || !isOption(arg)) files.push(arg);
    else if (arg === '--') end = true;
    else if (long !== null) {
      const value = long[2] ?? args[(at += 1)] ?? '';
      if (long[1] === '--key') keys.push(value);
      else if (long[1] === '--output') output = value;
      else tab = value;
    } else if (arg === '-k') keys.push(args[(at += 1)]!);
    else if (arg === '-t') tab = args[(at += 1)]!;
    else if (arg === '-o') output = args[(at += 1)]!;
    else if (SORT_LONG[arg] !== undefined) flags += SORT_LONG[arg];
    else if (/^-[bdfhMnrVcsu]$/.test(arg)) flags += arg[1];
    // What its help doesn't list, for just-bash to refuse.
    else return addTry('sort', 2)(args, ctx, next, fs);
  }
  for (const key of keys) {
    const wrong = sortKeyError(key);
    if (wrong !== null) return failed(`sort: ${wrong}\n`, 2);
  }
  if (tab !== null && [...tab].length > 1 && tab !== '\\0') return failed(`sort: multi-character tab ‘${tab}’\n`, 2);
  const check = flags.includes('c');
  if (output !== null && check) return failed("sort: options '-co' are incompatible\n", 2);
  if (check && files.length > 1) return failed(`sort: extra operand ‘${files[1]!}’ not allowed with -c\n`, 2);
  let text = '';
  for (const file of files.length === 0 ? ['-'] : files) {
    const bytes = file === '-' ? inputBytes(ctx) : await fileBytes(fs, ctx, file);
    if (bytes === 'Is a directory') return failed(`sort: read failed: ${file}: Is a directory\n`, 2);
    if (typeof bytes === 'string') return failed(`sort: cannot read: ${file}: ${bytes}\n`, 2);
    text += byteString(bytes);
    if (text !== '' && !text.endsWith('\n')) text += '\n';
  }
  const lines = text.split('\n');
  lines.pop();
  const tabBytes = tab === null ? null : tab === '\\0' ? '\0' : byteString(new TextEncoder().encode(tab));
  // A key with no ordering options of its own takes the global ones.
  const global = [...flags].filter((flag) => SORT_ORDERING.includes(flag)).join('');
  const parsed = keys.map(sortKey).map((key) => ({ ...key, startBlanks: key.startBlanks || (key.options === '' && flags.includes('b')), endBlanks: key.endBlanks || (key.options === '' && flags.includes('b')), options: key.options === '' ? global : key.options }));
  const unique = flags.includes('u');
  const lastResort = !unique && !flags.includes('s');
  const wholeLine = parsed.length === 0;
  const blanks = flags.includes('b');
  const keyed = (line: string) => (wholeLine ? [blanks ? line.replace(/^[ \t]+/, '') : line] : parsed.map((key) => keyText(line, key, tabBytes)));
  const rows = lines.map((line) => ({ line, keys: keyed(line) }));
  const options = wholeLine ? [global] : parsed.map((key) => key.options);
  const byKeys = (a: (typeof rows)[number], b: (typeof rows)[number]) => {
    for (const [at, option] of options.entries()) {
      const order = keyOrder(a.keys[at]!, b.keys[at]!, option);
      if (order !== 0) return order;
    }
    return 0;
  };
  const reversed = flags.includes('r');
  const whole = (a: (typeof rows)[number], b: (typeof rows)[number]) => {
    const order = byKeys(a, b);
    if (order !== 0 || !lastResort) return order;
    const last = a.line < b.line ? -1 : a.line > b.line ? 1 : 0;
    return reversed ? -last : last;
  };
  if (check) {
    for (let at = 1; at < rows.length; at += 1) {
      const order = whole(rows[at - 1]!, rows[at]!);
      if (order > 0 || (unique && order === 0)) return { ...bytesOutput(new Uint8Array(), `sort: ${files[0] ?? '-'}:${at + 1}: disorder: ${new TextDecoder().decode(fromByteString(rows[at]!.line))}\n`, 1) };
    }
    return { stdout: '', stderr: '', exitCode: 0 };
  }
  rows.sort(whole);
  const kept = unique ? rows.filter((row, at) => at === 0 || byKeys(rows[at - 1]!, row) !== 0) : rows;
  const bytes = fromByteString(kept.map((row) => `${row.line}\n`).join(''));
  const result = bytesOutput(bytes);
  if (output === null) return result;
  try {
    await writeOutput(fs, fs.resolvePath(ctx.cwd, output), result);
  } catch (error) {
    const why = (error as { code?: string }).code === 'ENOENT' ? 'No such file or directory' : (error as { code?: string }).code === 'ENOSPC' ? 'No space left on device' : 'Permission denied';
    return failed(`sort: open failed: ${output}: ${why}\n`, 2);
  }
  return { stdout: '', stderr: '', exitCode: 0 };
};

// `-size -1k` as GNU rounds it, up to a whole unit (T322); a folder here counts
// as GNU's 4096 bytes.
function findSize(args: readonly string[]): string[] {
  const list: string[] = [];
  args.forEach((arg, at) => {
    const small = args[at - 1] === '-size' ? /^-(\d+)([kMG])$/.exec(arg) : null;
    if (small === null) return list.push(arg);
    const unit = { k: 1024, M: 1024 ** 2, G: 1024 ** 3 }[small[2] as 'k' | 'M' | 'G'];
    const bytes = (Number(small[1]) - 1) * unit;
    if (bytes < 4096) list.splice(-1, 0, '!', '-type', 'd');
    return list.push(`-${bytes + 1}c`);
  });
  return list;
}

// The tests and actions that start an expression, for what comes after a path.
const FIND_START = /^(?:-|\(|!)/;

// `find`'s expression where it holds `-exec … \;`: the status of each command is
// a test (T363), which just-bash doesn't read, and `{}` goes anywhere in a word
// (T335). Each plain test is asked of just-bash once, for every path.
type FindNode = { kind: 'and' | 'or'; left: FindNode; right: FindNode } | { kind: 'not'; inner: FindNode } | { kind: 'exec'; words: string[] } | { kind: 'print'; end: string } | { kind: 'test'; words: string[] } | { kind: 'always'; value: boolean };

const FIND_GLOBAL = new Set(['-maxdepth', '-mindepth']);
const FIND_ONE_ARGUMENT = new Set(['-name', '-iname', '-path', '-ipath', '-wholename', '-regex', '-iregex', '-type', '-size', '-perm', '-newer', '-mtime', '-atime', '-ctime', '-mmin', '-amin', '-cmin']);
const FIND_NO_ARGUMENT = new Set(['-empty', '-readable', '-writable', '-executable']);

// The tree of `words`, or null for what's only just-bash's.
function findTree(words: readonly string[]): FindNode | null {
  let at = 0;
  const primary = (): FindNode | null => {
    const word = words[at++];
    if (word === undefined) return null;
    if (word === '(') {
      const inner = or();
      return words[at++] === ')' ? inner : null;
    }
    if (word === '!' || word === '-not') {
      const inner = primary();
      return inner === null ? null : { kind: 'not', inner };
    }
    if (word === '-exec') {
      const start = at;
      while (at < words.length && words[at] !== ';' && words[at] !== '+') at += 1;
      if (words[at] !== ';' || at === start) return null;
      at += 1;
      return { kind: 'exec', words: words.slice(start, at - 1) };
    }
    if (word === '-print') return { kind: 'print', end: '\n' };
    if (word === '-print0') return { kind: 'print', end: '\0' };
    if (word === '-true' || word === '-false') return { kind: 'always', value: word === '-true' };
    if (FIND_NO_ARGUMENT.has(word)) return { kind: 'test', words: [word] };
    if (FIND_ONE_ARGUMENT.has(word) && words[at] !== undefined) return { kind: 'test', words: [word, words[at++]!] };
    return null;
  };
  const and = (): FindNode | null => {
    let left = primary();
    while (left !== null && at < words.length && words[at] !== ')' && words[at] !== '-o' && words[at] !== '-or') {
      if (words[at] === '-a' || words[at] === '-and') at += 1;
      const right = primary();
      left = right === null ? null : { kind: 'and', left, right };
    }
    return left;
  };
  const or = (): FindNode | null => {
    let left = and();
    while (left !== null && (words[at] === '-o' || words[at] === '-or')) {
      at += 1;
      const right = and();
      left = right === null ? null : { kind: 'or', left, right };
    }
    return left;
  };
  const tree = or();
  return at === words.length ? tree : null;
}

async function findExec(args: readonly string[], ctx: Context, next: Next): Promise<Output | null> {
  if (!args.includes('-exec')) return null;
  const start = args.findIndex((arg) => FIND_START.test(arg));
  const roots = args.slice(0, start);
  const globals: string[] = [];
  const rest: string[] = [];
  for (let at = start; at < args.length; at += 1) {
    if (FIND_GLOBAL.has(args[at]!)) globals.push(args[at]!, args[(at += 1)] ?? '');
    else if (args[at] === '-depth') globals.push('-depth');
    else rest.push(args[at]!);
  }
  const tree = findTree(rest);
  if (tree === null) return null;
  const found = await next(findSize([...roots, ...globals, '-print0']));
  let stdout = '';
  let stderr = found.stderr;
  const tested = new Map<FindNode, Set<string>>();
  const passes = async (node: Extract<FindNode, { kind: 'test' }>) => {
    let set = tested.get(node);
    if (set === undefined) {
      set = new Set((await next(findSize([...roots, ...globals, ...node.words, '-print0']))).stdout.split('\0'));
      tested.set(node, set);
    }
    return set;
  };
  const run = async (node: FindNode, path: string): Promise<boolean> => {
    switch (node.kind) {
      case 'and':
        return (await run(node.left, path)) && run(node.right, path);
      case 'or':
        return (await run(node.left, path)) || run(node.right, path);
      case 'not':
        return !(await run(node.inner, path));
      case 'always':
        return node.value;
      case 'test':
        return (await passes(node)).has(path);
      case 'print':
        stdout += `${path}${node.end}`;
        return true;
      case 'exec': {
        const ran = await ctx.exec!(node.words.map((word) => quote(word.replaceAll('{}', path))).join(' '), { cwd: ctx.cwd, env: Object.fromEntries(ctx.env) });
        stdout += ran.stdout;
        stderr += missingCommand(ran.stderr);
        return ran.exitCode === 0;
      }
    }
  };
  for (const path of found.stdout.split('\0').slice(0, -1)) await run(tree, path);
  return { stdout, stderr, exitCode: found.exitCode };
}

const FIND_PATH = /^find: ([^‘\n].*?): (No such file or directory|Permission denied)$/gm;
const findPath = (whole: string, path: string, why: string) => (path.startsWith('cannot delete') ? whole : `find: ‘${path}’: ${why}`);
const findPaths = (stderr: string) => stderr.replace(FIND_PATH, findPath);
const missingCommand = (stderr: string) => stderr.replace(/^bash: (.+): command not found$/gm, 'find: ‘$1’: No such file or directory');

const find: Fix = async (args, ctx, next, fs) => {
  if (args.includes('--help')) return next(args);
  for (const [at, arg] of args.entries()) {
    if (args[at - 1] === '-newer' && !(await fs.exists(fs.resolvePath(ctx.cwd, arg)))) return failed(`find: ‘${arg}’: No such file or directory\n`, 1);
    if ((args[at - 1] === '-maxdepth' || args[at - 1] === '-mindepth') && !/^\d+$/.test(arg)) return failed(`find: Expected a positive decimal integer argument to ${args[at - 1]!}, but got ‘${arg}’\n`, 1);
  }
  const start = args.findIndex((arg) => FIND_START.test(arg));
  const binary = start >= 0 && (args[start] === '-a' || args[start] === '-o' || args[start] === '-and' || args[start] === '-or') ? args[start] : null;
  if (binary !== null) return failed(`find: invalid expression; you have used a binary operator '${binary}' with nothing before it.\n`, 1);
  const execed = await findExec(args, ctx, next);
  if (execed !== null) return { ...execed, stderr: findPaths(execed.stderr) };
  const result = await next(findSize(args));
  const root = args.find((arg) => !isOption(arg) && arg.endsWith('/') && arg.length > 1);
  const stdout = root === undefined ? result.stdout : result.stdout.replace(new RegExp(`^${root.slice(0, -1).replace(/[.*+?^\${}()|[\]\\]/g, '\\$&')}$`, 'm'), root);
  return {
    ...result,
    stdout,
    exitCode: result.exitCode === 127 ? 1 : result.exitCode,
    stderr: missingCommand(result.stderr)
      .replace(/^find: invalid argument `(.+)' to `-size'$/gm, (_, value: string) => (/\d$/.test(value) ? `find: invalid -size type \`${value}'` : `find: invalid -size type \`${value.at(-1)!}'`))
      .replace(/^find: invalid argument `(.+)' to `-perm'$/gm, 'find: invalid file mode ‘$1’')
      .replace(/^find: ‘?cannot delete '(.+?)'’?: (.*)$/gm, 'find: cannot delete ‘$1’: $2')
      .replace(/^find: unknown predicate '(.+)'$/gm, "find: unknown predicate `$1'")
      .replace(FIND_PATH, findPath),
  };
};

// `mkdir -pv`: a line for each folder made, none for one that was there.
async function missingFolders(path: string, typed: string, fs: TerminalFs): Promise<string[]> {
  if (await fs.exists(path)) return [];
  const at = typed.replace(/\/+$/, '').lastIndexOf('/');
  const parent = at > 0 ? await missingFolders(path.slice(0, path.lastIndexOf('/')), typed.slice(0, at), fs) : [];
  return [...parent, typed.replace(/\/+$/, '')];
}

const mkdir: Fix = async (args, ctx, next, fs) => {
  if (args.includes('')) {
    const others = args.filter((arg) => arg !== '');
    const said = `mkdir: cannot create directory ‘’: No such file or directory\n`;
    if (others.every((arg) => isOption(arg))) return failed(said, 1);
    const result = await mkdir(others, ctx, next, fs);
    return { ...result, stderr: `${said}${result.stderr}`, exitCode: 1 };
  }
  const options = args.filter((arg) => isOption(arg));
  const parents = options.some((arg) => arg === '--parents' || /^-[a-zA-Z]*p/.test(arg));
  // A name that's taken, or under a file, before anything would change (T396).
  const taken = (typed: string, why: string) => `mkdir: cannot create directory ‘${typed}’: ${why}\n`;
  let refused = '';
  const kept: string[] = [];
  for (const typed of args) {
    if (isOption(typed)) {
      kept.push(typed);
      continue;
    }
    const stat = await fs.stat(fs.resolvePath(ctx.cwd, typed)).catch(() => null);
    if (stat !== null) {
      if (!parents || !stat.isDirectory) refused += taken(typed.replace(/(.)\/+$/, '$1'), 'File exists');
      else kept.push(typed);
      continue;
    }
    const pieces = typed.replace(/\/+$/, '').split('/');
    let under: string | null = null;
    for (let at = 1; at < pieces.length && under === null; at += 1) {
      const lead = pieces.slice(0, at).join('/');
      if (lead !== '' && (await fs.stat(fs.resolvePath(ctx.cwd, lead)).catch(() => null))?.isFile === true) under = lead;
    }
    if (under === null) kept.push(typed);
    else refused += taken(parents ? under : typed, 'Not a directory');
  }
  if (refused !== '') {
    if (kept.every((arg) => isOption(arg))) return failed(refused, 1);
    const result = await mkdir(kept, ctx, next, fs);
    return { ...result, stderr: `${refused}${result.stderr}`, exitCode: 1 };
  }
  const verbose = options.some((arg) => arg === '--verbose' || /^-[a-zA-Z]*v/.test(arg));
  const made: string[] = [];
  if (parents && verbose) for (const typed of args.filter((arg) => !isOption(arg))) for (const folder of await missingFolders(fs.resolvePath(ctx.cwd, typed), typed, fs)) if (!made.includes(folder)) made.push(folder);
  const result = await addTry('mkdir')(args, ctx, next, fs);
  if (parents && verbose && result.exitCode === 0) return { ...result, stdout: made.map((folder) => `mkdir: created directory '${folder}'\n`).join('') };
  return { ...result, stderr: result.stderr.replace(/^(mkdir: cannot create directory )'(.+)'/gm, '$1‘$2’') };
};

// A pattern of `grep`'s basic or extended syntax as the extended syntax just-bash
// takes (T318), what GNU says of it, and whether it holds a back reference.
const GREP_VALUED = new Set(['-e', '-f', '-m', '-A', '-B', '-C', '--regexp', '--file', '--max-count', '--include', '--exclude', '--exclude-dir']);
const POSIX_CLASS: Readonly<Record<string, string>> = { alpha: 'a-zA-Z', digit: '0-9', alnum: 'a-zA-Z0-9', upper: 'A-Z', lower: 'a-z', space: ' \\t\\n\\r\\f\\v', blank: ' \\t', punct: '!-\\/:-@\\[-`{-~', print: ' -~', graph: '!-~', cntrl: '\\x00-\\x1f\\x7f', xdigit: '0-9A-Fa-f' };

const STAR_START = 'grep: warning: * at start of expression\n';

function translated(pattern: string, basic: boolean) {
  let out = '';
  let js = '';
  let references = false;
  let depth = 0;
  const warnings: string[] = [];
  const add = (text: string, jsText = text) => {
    out += text;
    js += jsText;
  };
  for (let at = 0; at < pattern.length; at += 1) {
    const char = pattern[at]!;
    if (char === '[') {
      let end = at + 1;
      if (pattern[end] === '^') end += 1;
      if (pattern[end] === ']') end += 1;
      for (; end < pattern.length && pattern[end] !== ']'; end += 1) {
        if (pattern[end] === '[' && /[:.=]/.test(pattern[end + 1] ?? '')) {
          const close = pattern.indexOf(`${pattern[end + 1]}]`, end + 2);
          if (close > 0) end = close + 1;
        }
      }
      if (end >= pattern.length) return { error: 'Invalid regular expression' };
      const set = pattern.slice(at, end + 1);
      add(set, set.replace(/\[:(\w+):\]/g, (whole, name: string) => POSIX_CLASS[name] ?? whole).replace(/^\[(\^?)\]/, '[$1\\]'));
      at = end;
    } else if (char === '\\') {
      const next = pattern[(at += 1)];
      if (next === undefined) return { error: 'Trailing backslash' };
      const open = basic ? next === '(' : false;
      const close = basic ? next === ')' : false;
      if (open) depth += 1;
      if (close && (depth -= 1) < 0) return { error: 'Unmatched ) or \\)' };
      if (/[1-9]/.test(next)) {
        references = true;
        add(`\\${next}`);
      } else if (next === '<' || next === '>') add('\\b');
      else if (basic && /[+?|(){}]/.test(next)) add(next);
      else if (/[wWsSbB`']/.test(next) || /[^a-zA-Z]/.test(next)) add(next === '`' ? '^' : next === "'" ? '$' : `\\${next}`);
      else {
        warnings.push(`grep: warning: stray \\ before ${next}\n`);
        add(next);
      }
    } else if (!basic && char === '*' && (at === 0 || /(^|[^\\])[(|]$/.test(pattern.slice(0, at)))) {
      // GNU's reading: nothing to repeat, so nothing there (T373).
      if (!warnings.includes(STAR_START)) warnings.push(STAR_START);
    } else if (basic && /[+?|(){}]/.test(char)) add(`\\${char}`);
    else if (basic && char === '*' && (at === 0 || /\\[(|]$/.test(pattern.slice(Math.max(0, at - 2), at)))) add('\\*');
    else if (!basic && char === '(') {
      depth += 1;
      add(char);
    } else if (!basic && char === ')') {
      if (depth === 0) add('\\)');
      else {
        depth -= 1;
        add(char);
      }
    } else add(char);
  }
  if (depth > 0) return { error: 'Unmatched ( or \\(' };
  if (basic && /\\\{[^}]*$/.test(pattern) && !pattern.includes('\\}')) return { error: 'Unmatched \\{' };
  return { out, js, references, warnings };
}

// `grep` where just-bash's can't do it: a back reference, `-P`'s lookaround, and
// a file name for standard input (T318), over JavaScript's regular expressions.
// A pattern that never ends meets the worker's guard (research R26).
async function jsGrep(patterns: readonly string[], flags: string, files: readonly string[], ctx: Context, fs: TerminalFs, most = Infinity): Promise<Output> {
  const has = (letter: string) => flags.includes(letter);
  let source = patterns.map((pattern) => `(?:${pattern})`).join('|');
  if (has('w')) source = `(?<![\\w])(?:${source})(?![\\w])`;
  if (has('x')) source = `^(?:${source})$`;
  let expression: RegExp;
  try {
    expression = new RegExp(source, `g${has('i') ? 'i' : ''}u`);
  } catch {
    return failed(`grep: invalid regular expression\n`, 2);
  }
  const named = files.length > 1 || has('H');
  let stdout = '';
  let stderr = '';
  let selected = false;
  for (const file of files.length === 0 ? ['-'] : files) {
    let text: string;
    if (file === '-') text = new TextDecoder().decode(inputBytes(ctx));
    else {
      const content = await fs.readFile(fs.resolvePath(ctx.cwd, file)).catch(() => null);
      if (content === null) {
        stderr += `grep: ${file}: No such file or directory\n`;
        continue;
      }
      text = content;
    }
    const label = file === '-' ? '(standard input)' : file;
    let count = 0;
    const lines = text.split('\n');
    if (lines.at(-1) === '') lines.pop();
    lines.forEach((entry, index) => {
      if (count >= most) return;
      const found = [...entry.matchAll(expression)];
      if (found.length > 0 === has('v')) return;
      count += 1;
      if (has('c') || has('l') || has('L') || has('q')) return;
      const lead = `${named && !has('h') ? `${label}:` : ''}${has('n') ? `${index + 1}:` : ''}`;
      if (has('o') && !has('v')) for (const match of found) stdout += `${lead}${match[0]}\n`;
      else stdout += `${lead}${entry}\n`;
    });
    if (count > 0) selected = true;
    if (has('c')) stdout += `${named && !has('h') ? `${label}:` : ''}${count}\n`;
    else if (has('l') && count > 0) stdout += `${label}\n`;
    else if (has('L') && count === 0) stdout += `${label}\n`;
  }
  return { stdout, stderr, exitCode: stderr !== '' && !(has('q') && selected) ? 2 : selected ? 0 : 1 };
}

// `-nA1` as `-n -A 1`, so an option's value is told from the rest (T333).
function grepOptions(args: readonly string[]): string[] {
  const list: string[] = [];
  for (let at = 0; at < args.length; at += 1) {
    const arg = args[at]!;
    if (arg === '--') {
      list.push(...args.slice(at));
      break;
    }
    if (GREP_VALUED.has(arg)) {
      list.push(arg);
      if (at + 1 < args.length) list.push(args[(at += 1)]!);
      continue;
    }
    if (!/^-[a-zA-Z0-9]/.test(arg)) {
      list.push(arg);
      continue;
    }
    for (let letter = 1; letter < arg.length; letter += 1) {
      const char = arg[letter]!;
      if (/\d/.test(char)) {
        const count = /^\d+/.exec(arg.slice(letter))![0];
        list.push('-C', count);
        letter += count.length - 1;
      } else if (GREP_VALUED.has(`-${char}`)) {
        list.push(`-${char}`);
        if (letter + 1 < arg.length) list.push(arg.slice(letter + 1));
        else if (at + 1 < args.length) list.push(args[(at += 1)]!);
        break;
      } else list.push(`-${char}`);
    }
  }
  return list;
}

// What `--help` lists.
const GREP_LETTERS = 'EPFivwxclLmnhoqrRABCefGHsaI';
const GREP_LONG = ['--extended-regexp', '--perl-regexp', '--fixed-strings', '--basic-regexp', '--ignore-case', '--invert-match', '--word-regexp', '--line-regexp', '--count', '--files-with-matches', '--files-without-match', '--max-count', '--line-number', '--no-filename', '--with-filename', '--only-matching', '--quiet', '--silent', '--recursive', '--dereference-recursive', '--before-context', '--after-context', '--context', '--regexp', '--file', '--include', '--exclude', '--exclude-dir', '--no-messages', '--text', '--help'];

const GREP_USAGE = `Usage: grep [OPTION]... PATTERNS [FILE]...\n${tryHelp('grep')}`;

const grep: Fix = async (typed, ctx, next, fs) => {
  if (typed.includes('--help')) return next(typed);
  const lastTyped = typed.at(-1);
  if (lastTyped !== undefined && GREP_VALUED.has(lastTyped)) return failed(`${lastTyped.startsWith('--') ? `grep: option '${lastTyped}' requires an argument` : `grep: option requires an argument -- '${lastTyped[1]!}'`}\n${GREP_USAGE}`, 2);
  // Long forms as their letters, which the rest reads (T387).
  let args = grepOptions(typed.flatMap((arg) => {
    const long = /^--(regexp|file|max-count)=(.*)$/s.exec(arg);
    return long === null ? [arg] : [`-${{ regexp: 'e', file: 'f', 'max-count': 'm' }[long[1]!]!}`, long[2]!];
  }));
  const wrong = unlisted(args.flatMap((arg, at) => (GREP_VALUED.has(args[at - 1] ?? '') ? [] : [arg])), GREP_LETTERS, GREP_LONG);
  if (wrong !== null) return wrongOption('grep', wrong);
  const valuesOf = (option: string) => args.flatMap((arg, at) => (args[at - 1] === option ? [arg] : []));
  const maximum = [...valuesOf('-m'), ...valuesOf('--max-count'), ...args.flatMap((arg) => (arg.startsWith('--max-count=') ? [arg.slice(12)] : []))].at(-1);
  if (maximum !== undefined && !/^-?\d+$/.test(maximum)) return failed('grep: invalid max count\n', 2);
  for (const value of [...valuesOf('-A'), ...valuesOf('-B'), ...valuesOf('-C')]) if (!/^\d+$/.test(value)) return failed(`grep: ${value}: invalid context length argument\n`, 2);
  if (maximum !== undefined && Number(maximum) === 0) return failed('', 1);
  const most = maximum === undefined || Number(maximum) < 0 ? Infinity : Number(maximum);
  const flags = args.filter((arg) => /^-[a-zA-Z]/.test(arg) && !GREP_VALUED.has(arg)).join('').replace(/-/g, '');
  const operandStart = args.findIndex((arg, at) => !isOption(arg) && !GREP_VALUED.has(args[at - 1] ?? ''));
  const given = args.flatMap((arg, at) => (args[at - 1] === '-e' || args[at - 1] === '--regexp' ? [at] : []));
  const patternAt = given.length > 0 ? given : operandStart >= 0 ? [operandStart] : [];
  if (patternAt.length === 0) return failed(`Usage: grep [OPTION]... PATTERNS [FILE]...\n${tryHelp('grep')}`, 2);
  let files = args.filter((arg, at) => !isOption(arg) && !GREP_VALUED.has(args[at - 1] ?? '') && !patternAt.includes(at));
  // A file that is also where the output goes isn't read (T355), unless what's
  // printed can't grow it.
  const output = ctx.env.get(OUTPUT_FILE);
  let selfRead = '';
  if (output !== undefined && !/[clLq]/.test(flags)) {
    const named = files.length > 1;
    const own = files.filter((file) => samePath(ctx, fs, file, output));
    const input = ctx.env.get(INPUT_FILE);
    if (own.length > 0) {
      selfRead = own.map((file) => `grep: ${file}: input file is also the output\n`).join('');
      args = args.filter((arg, at) => !own.includes(arg) || patternAt.includes(at) || GREP_VALUED.has(args[at - 1] ?? ''));
      files = files.filter((file) => !own.includes(file));
      if (files.length === 0) return failed(selfRead, 2);
      if (named) args = ['-H', ...args];
      return grep(args, { ...ctx, env: new Map([...ctx.env].filter(([name]) => name !== OUTPUT_FILE)) }, next, fs).then((result) => ({ ...result, stderr: `${selfRead}${result.stderr}`, exitCode: 2 }));
    }
    if (files.length === 0 && input !== undefined && samePath(ctx, fs, input, output)) return failed('grep: (standard input): input file is also the output\n', 2);
  }
  const list = [...args];
  const literal = flags.includes('F');
  const perl = flags.includes('P');
  const basic = !flags.includes('E') && !perl;
  const js: string[] = [];
  let references = false;
  let warnings = '';
  if (!literal) {
    for (const at of patternAt) {
      if (perl) {
        js.push(args[at]!);
        continue;
      }
      const made = translated(args[at]!, basic);
      if (made.error !== undefined) return failed(`grep: ${made.error}\n`, 2);
      list[at] = made.out!;
      js.push(made.js!);
      references ||= made.references!;
      warnings += made.warnings!.join('');
    }
  }
  const named = flags.includes('H') || (files.length === 0 && /[lL]/.test(flags) && !flags.includes('r') && !flags.includes('R'));
  const recursive = /[rR]/.test(flags);
  // With `-r` and no file: the working folder, its names with no `./`, where a
  // typed `.` keeps it (T353).
  if (recursive && files.length === 0) list.push('.');
  if (recursive && files[0] === './' && files.length === 1) list[list.lastIndexOf('./')] = '.';
  const dotted = recursive && files.length === 1 && (files[0] === '.' || files[0] === './') && !flags.includes('h');
  if (!literal && (references || perl || named) && !recursive) {
    const result = await jsGrep(js, flags, files, ctx, fs, most);
    return { ...result, stderr: `${warnings}${result.stderr}` };
  }
  if (recursive) {
    const gone: string[] = [];
    for (const file of files) if (!(await fs.exists(fs.resolvePath(ctx.cwd, file)))) gone.push(file);
    if (gone.length > 0 && gone.length === files.length) return failed(gone.map((file) => `grep: ${file}: No such file or directory\n`).join(''), 2);
  }
  // One file named with `-r` is no listing of a folder: no name before its lines.
  const lone = recursive && files.length === 1 && !flags.includes('H') && (await fs.stat(fs.resolvePath(ctx.cwd, files[0]!)).catch(() => null))?.isFile === true;
  if (lone) list.unshift('-h');
  const result = await next(basic && !literal ? ['-E', ...list.filter((arg) => arg !== '-G')] : list);
  // An error makes its status 2, whatever else it found.
  const errored = /^grep: .+: (?:Is a directory|No such file or directory|Permission denied)$/m.test(result.stderr);
  // just-bash's `-c` doesn't stop at `-m`.
  const stdout = flags.includes('c') && most !== Infinity ? result.stdout.replace(/(\d+)$/gm, (count) => String(Math.min(Number(count), most))) : result.stdout;
  const fromDot = dotted ? stdout.replace(/^(?!--$)(?=.)/gm, './') : stdout;
  return { ...result, stdout: fromDot, stderr: `${warnings}${result.stderr}`, exitCode: errored && !flags.includes('q') ? 2 : result.exitCode };
};

// `awk`: what can be done around just-bash's. `-v` and an operand `NAME=value`
// reach the built-in variables by the program; `length` alone; `RS` by the input;
// GNU's words and statuses. The rest of its language is in research R25 (T319).
const AWK_VALUED = new Set(['-F', '-v', '-f', '--field-separator', '--assign', '--file']);
const AWK_USAGE = 'Usage: awk [POSIX or GNU style options] -f progfile [--] file ...\nUsage: awk [POSIX or GNU style options] [--] \'program\' file ...\n';
const awkString = (value: string) => `"${value.replace(/["]/g, '\\"')}"`;

// What `system`, `strftime`, `asort` and `length` of an array do in gawk, written
// in the language just-bash's `awk` has (T358). Its `for (k in x)` finds an array
// by the name written there, so a function for each array, not a parameter.
const AWK_SYSTEM = 'function __cvsystem(c,l,p,n){c="(" c ")\\necho $?";while((c | getline l)>0){if(n)print p;p=l;n=1}close(c);return p+0}';
const AWK_STRFTIME = `function __cvstrftime(f,t,u,c,l){if(f=="")f="%a %b %e %H:%M:%S %Z %Y";c="date -u";if(t!="")c=c" -d @"(t+0);gsub(/'/,"'\\\\''",f);c=c" '+"f"'";c | getline l;close(c);return l}`;
const awkAsort = (from: string, to: string, name: string) => `function ${name}(i,j,n,k,v,w){n=0;for(k in ${from}){n++;w[n]=${from}[k]}for(i=2;i<=n;i++){v=w[i];for(j=i-1;j>0&&w[j]>v;j--)w[j+1]=w[j];w[j+1]=v}for(k in ${to})delete ${to}[k];for(i=1;i<=n;i++)${to}[i]=w[i];return n}`;
const awkLength = (array: string, name: string) => `function ${name}(k,n){n=0;for(k in ${array})n++;return n}`;

function awkBuiltins(text: string): string {
  const added = new Set<string>();
  const outsideStrings = (pattern: string, to: (...groups: string[]) => string, source: string) => source.replace(new RegExp(`("(?:[^"\\\\]|\\\\.)*")|${pattern}`, 'g'), (whole, quoted?: string, ...groups: unknown[]) => quoted ?? to(...(groups as string[])));
  let out = outsideStrings('(?<![\\w$])system\\(', () => (added.add(AWK_SYSTEM), '__cvsystem('), text);
  out = outsideStrings('(?<![\\w$])strftime\\(', () => (added.add(AWK_STRFTIME), '__cvstrftime('), out);
  out = outsideStrings('(?<![\\w$])asort\\(\\s*([A-Za-z_]\\w*)\\s*(?:,\\s*([A-Za-z_]\\w*)\\s*)?\\)', (from, to) => {
    const name = `__cvasort_${from!}_${to ?? from!}`;
    added.add(awkAsort(from!, to ?? from!, name));
    return `${name}()`;
  }, out);
  // A name used as an array anywhere.
  const arrays = new Set(['ENVIRON']);
  for (const match of out.matchAll(/(?<![\w$])([A-Za-z_]\w*)\[|\bin\s+([A-Za-z_]\w*)|\bdelete\s+([A-Za-z_]\w*)|\bsplit\((?:"(?:[^"\\]|\\.)*"|[^,()"])*,\s*([A-Za-z_]\w*)/g)) arrays.add(match[1] ?? match[2] ?? match[3] ?? match[4]!);
  arrays.delete('ARGV');
  out = outsideStrings(`(?<![\\w$])length\\(\\s*(${['ARGV', ...arrays].join('|')})\\s*\\)`, (array) => {
    // just-bash's `ARGV` can't be listed.
    if (array === 'ARGV') return 'ARGC';
    added.add(awkLength(array!, `__cvlength_${array!}`));
    return `__cvlength_${array!}()`;
  }, out);
  return added.size === 0 ? out : `${out}\n${[...added].join('\n')}`;
}

// What's left of a program without its `BEGIN` rules and functions: nothing, and
// `awk` never opens its operands (T364).
function onlyBegin(text: string): boolean {
  let left = '';
  for (let at = 0; at < text.length; at += 1) {
    const rule = /^(?:BEGIN\s*|function\s+\w+\s*\([^)]*\)\s*)\{/.exec(text.slice(at));
    if (rule === null) {
      left += text[at];
      continue;
    }
    let depth = 1;
    at += rule[0].length;
    for (; at < text.length && depth > 0; at += 1) {
      if (text[at] === '"') {
        for (at += 1; at < text.length && text[at] !== '"'; at += 1) if (text[at] === '\\') at += 1;
      } else if (text[at] === '{') depth += 1;
      else if (text[at] === '}') depth -= 1;
    }
    at -= 1;
  }
  return left.trim() === '' && /\bBEGIN\b/.test(text);
}

const AWK_STRING = /"(?:[^"\\]|\\.)*"/;
const awkArguments = (text: string) => {
  let [depth, count, inString] = [0, text.trim() === '' ? 0 : 1, false];
  for (let at = 0; at < text.length; at += 1) {
    const char = text[at]!;
    if (char === '\\') at += 1;
    else if (char === '"') inString = !inString;
    else if (inString) continue;
    else if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;
    else if (char === ',' && depth === 0) count += 1;
  }
  return count;
};
const awkFormats = (format: string) => (format.replace(/%%/g, '').match(/%[-+ #0-9.]*[a-zA-Z]/g) ?? []).length;

// gawk's words where just-bash's `awk` has none, by the program's text (T374).
function awkPrintf(text: string): string {
  return text.replace(new RegExp(`\\bprintf\\s+(${AWK_STRING.source})((?:\\s*,[^;}\\n]*)?)`, 'g'), (_, format: string, rest: string) => {
    const typed = format.replace(/%([-+ #0-9.]*)u/g, '%$1d');
    const given = awkArguments(rest.replace(/^\s*,/, ''));
    if (given >= awkFormats(typed)) return `printf ${typed}${rest}`;
    return `{ print "awk: cmd. line:1: fatal: not enough arguments to satisfy format string\\n\\t\`${format.slice(1, -1)}'\\n\\t${' '.repeat(format.lastIndexOf('%'))}^ ran out for this one" > "/dev/stderr"; exit 2 }`;
  });
}

const AWK_SRAND = 'function __cvsrand(s,p){p=__cvseed==""?1:__cvseed;__cvseed=s;srand(s);return p}\nfunction __cvsrand0(p){p=__cvseed==""?1:__cvseed;__cvseed=srand();return p}';

const awk: Fix = async (args, ctx, next, fs) => {
  if (args.includes('--help')) return next(args);
  if (args.length === 0) return failed(AWK_USAGE, 1);
  for (const [at, arg] of args.entries()) {
    const value = arg === '-v' || arg === '--assign' ? args[at + 1] : /^-v(.+)$/.exec(arg)?.[1];
    const name = value?.split('=')[0];
    if (name !== undefined && !/^[A-Za-z_]\w*$/.test(name)) return failed(`awk: fatal: \`${name}' is not a legal variable name\n`, 2);
  }
  const missingValue = valueMissing(args, 'Fvf');
  if (missingValue !== null) return failed(`awk: option requires an argument -- ${missingValue}\n${AWK_USAGE}`, 1);
  const list: string[] = [];
  const set: string[] = [];
  let program = -1;
  for (let at = 0; at < args.length; at += 1) {
    const arg = args[at]!;
    if (AWK_VALUED.has(arg)) {
      const value = args[(at += 1)]!;
      if (arg === '-v' || arg === '--assign') set.push(value);
      else list.push(arg, value);
      if (arg === '-f' || arg === '--file') program = -2;
    } else if (/^-v./.test(arg)) set.push(arg.slice(2));
    else if (isOption(arg)) list.push(arg);
    else if (program === -1) {
      program = list.length;
      list.push(arg);
    } else if (/^[A-Za-z_]\w*=/.test(arg)) set.push(arg);
    else list.push(arg);
  }
  if (program < 0) return next(args);
  const text = list[program]!;
  const changeable = /\b(?:g?sub)\s*\((?:[^,()]|\([^()]*\))*,(?:[^,()"]|"(?:[^"\\]|\\.)*")*,\s*\w+\s*=/.exec(text);
  if (changeable !== null) return failed(`awk: cmd. line:1: ${text}\nawk: cmd. line:1: ${' '.repeat(text.indexOf(')', changeable.index + changeable[0].length))}^ ${/gsub/.test(changeable[0]) ? 'gsub' : 'sub'} third parameter is not a changeable object\n`, 1);
  const assigned = set.map((each) => {
    const at = each.indexOf('=');
    return `${each.slice(0, at)}=${awkString(each.slice(at + 1))}`;
  });
  // A folder is passed over, with a warning (T365).
  let warnings = '';
  for (const file of list.slice(program + 1)) {
    if (isOption(file) || !(await isFolder(fs, ctx, file))) continue;
    warnings += `awk: warning: command line argument \`${file}' is a directory: skipped\n`;
    list.splice(list.lastIndexOf(file), 1);
  }
  const noOperands = warnings !== '' && list.slice(program + 1).every((arg) => isOption(arg));
  const withWarnings = (result: Output) => (warnings === '' ? result : { ...result, stderr: `${warnings}${result.stderr}` });
  // `-` alone is standard input, as no operand is.
  if (list.slice(program + 1).filter((arg) => !isOption(arg)).join() === '-') list.splice(list.lastIndexOf('-'), 1);
  // `-` beside files: it's read in its place, all as one input (T396).
  let joined: string | undefined;
  const beside = list.slice(program + 1).filter((arg) => !isOption(arg));
  if (beside.includes('-')) {
    let text = '';
    for (const file of beside) {
      const part = file === '-' ? new TextDecoder().decode(inputBytes(ctx)) : await fs.readFile(fs.resolvePath(ctx.cwd, file)).catch(() => null);
      if (part === null) {
        text = '';
        break;
      }
      text += part;
    }
    if (text !== '') {
      joined = text;
      for (const file of beside) list.splice(list.lastIndexOf(file), 1);
    }
  }
  // Only `BEGIN` rules: its operands are words of `ARGV`, never opened (T364).
  const begins = onlyBegin(text);
  const named = begins ? list.slice(program + 1).filter((arg) => !isOption(arg)) : [];
  if (begins) for (const file of named) list.splice(list.lastIndexOf(file), 1);
  // gawk stops at the first file it can't open, with no `END` (T351), naming a
  // place in the program only once a rule has seen a record.
  const operandList = list.slice(program + 1).filter((arg) => !isOption(arg) && arg !== '-');
  let unopened: { file: string; located: boolean } | null = null;
  for (const [at, file] of operandList.entries()) {
    if (await fs.exists(fs.resolvePath(ctx.cwd, file))) continue;
    const rules = text.replace(/\b(?:BEGIN|END)\s*\{[^{}]*\}/g, '').trim() !== '';
    unopened = { file, located: at > 0 && rules };
    for (const later of operandList.slice(at)) list.splice(list.lastIndexOf(later), 1);
    break;
  }
  const records = /\bRS\s*=\s*"((?:[^"\\]|\\.)*)"/.exec(`${assigned.join(';')};${text}`);
  const body = text.replace(/("(?:[^"\\]|\\.)*")|\blength\b(?!\s*\()/g, (whole, quoted?: string) => quoted ?? 'length($0)').replace(/("(?:[^"\\]|\\.)*")|(?<![\w$])int\(/g, (whole, quoted?: string) => quoted ?? '__cvint(');
  const seeded = /(?<![\w$])srand\(/.test(body);
  const made = `${awkBuiltins(awkPrintf(seeded ? body.replace(/(?<![\w$])srand\(\s*\)/g, '__cvsrand0()').replace(/(?<![\w$])srand\(/g, '__cvsrand(') : body))}${seeded ? `\n${AWK_SRAND}` : ''}`;
  // just-bash's `ARGC` and `ARGV` hold nothing it hasn't opened.
  const asArgv = begins && named.length > 0;
  const argv = asArgv ? `BEGIN{__cvargc=${named.length + 1};__cvargv[0]="awk";${named.map((word, at) => `__cvargv[${at + 1}]=${awkString(word)}`).join(';')}}\n` : '';
  list[program] = `${argv}${unopened === null ? '' : 'END{exit}\n'}${assigned.length > 0 ? `BEGIN{${assigned.join(';')}}\n` : ''}${asArgv ? made.replace(/("(?:[^"\\]|\\.)*")|\bARGC\b|\bARGV\b/g, (word, quoted?: string) => quoted ?? `__cv${word.toLowerCase()}`) : made}${/__cvint\(/.test(made) ? '\nfunction __cvint(x){x=x+0;return x<0?-__cvfl(-x):__cvfl(x)}\nfunction __cvfl(x){return x-(x%1)}' : ''}`;
  let input: string | undefined = joined;
  const operands = list.slice(program + 1).filter((arg) => !isOption(arg));
  // gawk's name for standard input, once it has a record (T345).
  if (operands.length === 0 && /\bFILENAME\b/.test(text)) list[program] = `NR==1{FILENAME="-"}\n${list[program]!}`;
  if (records !== null && operands.length <= 1) {
    const separator = records[1]!;
    let source: string | null = operands.length === 0 ? new TextDecoder().decode(inputBytes(ctx)) : await fs.readFile(fs.resolvePath(ctx.cwd, operands[0]!)).catch(() => null);
    if (source !== null && (separator === '' || separator.length === 1) && separator !== '\n') {
      source = separator === '' ? `${source.replace(/^\n+|\n+$/g, '').replace(/\n{2,}/g, '\u0005').replace(/\n/g, ' ').replace(/\u0005/g, '\n')}\n` : `${source.replace(/\n$/, '').split(separator).join('\n')}\n`;
      input = source;
      if (operands.length === 1) list.splice(list.lastIndexOf(operands[0]!), 1);
    }
  }
  if (unopened !== null) {
    if (operandList[0] === unopened.file) return failed(`awk: fatal: cannot open file \`${unopened.file}' for reading: No such file or directory\n`, 2);
    const ran = await next(list, input);
    return { ...ran, stderr: `${ran.stderr}awk: ${unopened.located ? 'cmd. line:1: ' : ''}fatal: cannot open file \`${unopened.file}' for reading: No such file or directory\n`, exitCode: 2 };
  }
  const result = withWarnings(await next(list, noOperands ? '' : input));
  const missing = /^awk: (.+): No such file or directory$/m.exec(result.stderr);
  if (missing !== null) return { ...result, stderr: `awk: fatal: cannot open file \`${missing[1]!}' for reading: No such file or directory\n`, exitCode: 2 };
  const parse = /^awk: (?:Expected|Unexpected) .* at line \d+:(\d+)$/m.exec(result.stderr);
  if (parse !== null) {
    const ended = /got EOF/.test(result.stderr);
    return { ...result, stderr: `awk: cmd. line:1: ${text}\nawk: cmd. line:1: ${' '.repeat(Math.max(0, Number(parse[1]) - 1))}^ ${ended ? 'unexpected newline or end of string' : 'syntax error'}\n`, exitCode: 1 };
  }
  return result;
};

// `wc` over bytes, in GNU's widths (T365, T373).
const WC_LONG: Readonly<Record<string, string>> = { '--lines': 'l', '--words': 'w', '--chars': 'm', '--bytes': 'c' };
const WC_ORDER = 'lwmc';

const wc: Fix = async (args, ctx, next, fs) => {
  if (args.includes('--help')) return next(args);
  let chosen = '';
  const files: string[] = [];
  let end = false;
  for (const arg of args) {
    if (end || !isOption(arg)) files.push(arg);
    else if (arg === '--') end = true;
    else if (WC_LONG[arg] !== undefined) chosen += WC_LONG[arg];
    else if (/^-[lwmc]+$/.test(arg)) chosen += arg.slice(1);
    else return addTry('wc')(args, ctx, next, fs);
  }
  // GNU refuses it before it counts anything (T385).
  if (files.includes('')) return failed('wc: invalid zero-length file name\n', 1);
  const shown = [...(chosen === '' ? 'lwc' : WC_ORDER)].filter((letter) => chosen === '' || chosen.includes(letter));
  const fromFile = ctx.env.get(INPUT_FILE) !== undefined;
  const names = files.length === 0 ? [null] : files;
  const rows: { counts: Record<string, number>; name: string | null }[] = [];
  const total: Record<string, number> = { l: 0, w: 0, m: 0, c: 0 };
  let [stderr, exitCode, regular, least] = ['', 0, 0, 1];
  for (const name of names) {
    const stdin = name === null || name === '-';
    const bytes = stdin ? inputBytes(ctx) : await fileBytes(fs, ctx, name);
    if (typeof bytes === 'string') {
      stderr += `wc: ${name!}: ${bytes}\n`;
      exitCode = 1;
      if (bytes !== 'Is a directory') continue;
      least = 7;
    } else if (stdin && !fromFile) least = 7;
    else regular += bytes.length;
    const content = typeof bytes === 'string' ? new Uint8Array() : bytes;
    const counts = { l: 0, w: 0, m: 0, c: content.length };
    let inside = false;
    for (const byte of content) {
      if (byte === 10) counts.l += 1;
      if ((byte & 0xc0) !== 0x80) counts.m += 1;
      const space = byte === 32 || (byte >= 9 && byte <= 13);
      if (!space && !inside) counts.w += 1;
      inside = !space;
    }
    for (const letter of WC_ORDER) total[letter]! += counts[letter as keyof typeof counts];
    rows.push({ counts, name: name });
  }
  // One count of one file has no width at all.
  const width = shown.length === 1 && names.length === 1 ? 1 : Math.max(least, String(regular).length);
  const row = (counts: Record<string, number>, name: string | null) => `${shown.map((letter) => String(counts[letter]).padStart(width)).join(' ')}${name === null ? '' : ` ${name}`}\n`;
  const stdout = [...rows.map(({ counts, name }) => row(counts, name)), ...(names.length > 1 ? [row(total, 'total')] : [])].join('');
  return { stdout, stderr, exitCode };
};

// `cut`, over bytes (T351, T352): `-b` counts bytes, `-c` UTF-8 characters.
const CUT_LONG: Readonly<Record<string, string>> = { '--bytes': '-b', '--characters': '-c', '--fields': '-f', '--delimiter': '-d' };
const UTF8_CHAR = /[\x00-\x7f\xc0-\xff][\x80-\xbf]*|[\x80-\xbf]/g;

// A list's ranges, or what GNU says of it.
function cutRanges(list: string, fields: boolean): [number, number][] | string {
  const ranges: [number, number][] = [];
  const position = fields ? 'fields are numbered from 1' : 'byte/character positions are numbered from 1';
  for (const part of list.split(/[, ]/)) {
    if (part === '') return position;
    if (part === '-') return 'invalid range with no endpoint: -';
    const range = /^(\d*)(-?)(\d*)$/.exec(part);
    if (range === null) return `invalid ${fields ? 'field value' : 'byte/character position'} ‘${part}’`;
    const start = range[1] === '' ? 1 : Number(range[1]);
    const end = range[2] === '' ? start : range[3] === '' ? Infinity : Number(range[3]);
    if (start === 0 || end === 0) return position;
    if (end < start) return 'invalid decreasing range';
    ranges.push([start, end]);
  }
  return ranges;
}

const cut: Fix = async (args, ctx, next, fs) => {
  if (args.includes('--help')) return next(args);
  let mode: string | null = null;
  let list = '';
  let delimiter: string | null = null;
  let outputDelimiter: string | null = null;
  let [only, complement, zero, end] = [false, false, false, false];
  const files: string[] = [];
  for (let at = 0; at < args.length; at += 1) {
    const arg = args[at]!;
    const long = /^(--[a-z-]+)(?:=(.*))?$/s.exec(arg);
    const short = long === null ? arg : (CUT_LONG[long[1]!] ?? arg);
    if (end || !isOption(arg)) files.push(arg);
    else if (arg === '--') end = true;
    else if (/^-[bcfd]$/.test(short)) {
      if (long === null && at + 1 === args.length) return usageError('cut', `option requires an argument -- '${short[1]!}'`);
      const value = long?.[2] ?? args[(at += 1)] ?? '';
      if (short === '-d') delimiter = value;
      else if (mode !== null) return usageError('cut', 'only one list may be specified');
      else [mode, list] = [short[1]!, value];
    } else if (arg === '-s' || arg === '--only-delimited') only = true;
    else if (arg === '--complement') complement = true;
    else if (arg === '-z' || arg === '--zero-terminated') zero = true;
    else if (long?.[1] === '--output-delimiter') outputDelimiter = long[2] ?? args[(at += 1)] ?? '';
    else if (arg !== '-n') return addTry('cut')(args, ctx, next, fs);
  }
  if (mode === null) return usageError('cut', 'you must specify a list of bytes, characters, or fields');
  if (mode !== 'f' && delimiter !== null) return usageError('cut', 'an input delimiter makes sense\n\tonly when operating on fields');
  if (mode !== 'f' && only) return usageError('cut', 'suppressing non-delimited lines makes sense\n\tonly when operating on fields');
  if (delimiter !== null && [...delimiter].length > 1) return usageError('cut', 'the delimiter must be a single character');
  const ranges = cutRanges(list, mode === 'f');
  if (typeof ranges === 'string') return usageError('cut', ranges);
  const chosen = (index: number) => ranges.some(([start, last]) => index >= start && index <= last) !== complement;
  const separator = delimiter === null ? '\t' : delimiter === '' ? '\0' : byteString(new TextEncoder().encode(delimiter));
  const joiner = outputDelimiter === null ? (mode === 'f' ? separator : '') : byteString(new TextEncoder().encode(outputDelimiter));
  const ending = zero ? '\0' : '\n';
  const picked = (units: readonly string[]) => {
    let out = '';
    let previous = 0;
    units.forEach((unit, at) => {
      if (!chosen(at + 1)) return;
      if (previous !== 0 && previous !== at) out += joiner;
      out += unit;
      previous = at + 1;
    });
    return out;
  };
  const fieldLine = (line: string) => {
    const fields = line.split(separator);
    if (fields.length === 1) return only ? null : line;
    return fields.filter((_, at) => chosen(at + 1)).join(joiner);
  };
  let out = '';
  let stderr = '';
  let exitCode = 0;
  for (const file of files.length === 0 ? ['-'] : files) {
    const bytes = file === '-' ? inputBytes(ctx) : await fileBytes(fs, ctx, file);
    if (typeof bytes === 'string') {
      stderr += `cut: ${file}: ${bytes}\n`;
      exitCode = 1;
      continue;
    }
    const lines = byteString(bytes).split(ending);
    if (lines.at(-1) === '') lines.pop();
    for (const line of lines) {
      const shown = mode === 'f' ? fieldLine(line) : picked(mode === 'b' ? [...line] : (line.match(UTF8_CHAR) ?? []));
      if (shown !== null) out += `${shown}${ending}`;
    }
  }
  return bytesOutput(fromByteString(out), stderr, exitCode);
};

// `seq`: GNU's long options and words, and its digits from FIRST and INCREMENT.
const SEQ_VALUED = new Set(['-s', '--separator']);
const seq: Fix = async (args, ctx, next, fs) => {
  if (args.includes('--help')) return next(args);
  const typed = unbundled(args.flatMap((arg) => (arg.startsWith('--separator=') ? ['-s', arg.slice(12)] : arg === '--equal-width' ? ['-w'] : [arg])), 's', '', true);
  // Options end at the first number or `--`; what follows is all operands (T386).
  const list: string[] = [];
  const operands: string[] = [];
  for (let at = 0; at < typed.length; at += 1) {
    const arg = typed[at]!;
    if (arg === '--' || !/^-(?:[^\d.]|$)/.test(arg)) {
      operands.push(...typed.slice(arg === '--' ? at + 1 : at));
      break;
    }
    if (SEQ_VALUED.has(arg)) list.push(arg, typed[(at += 1)] ?? '');
    else if (arg === '-w') list.push(arg);
    else return wrongOption('seq', arg);
  }
  if (operands.length > 3) return usageError('seq', `extra operand ‘${operands[3]!}’`);
  const bad = operands.find((arg) => !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(arg));
  if (bad !== undefined) return usageError('seq', `invalid floating point argument: ‘${bad}’`);
  if (operands.length === 3 && Number(operands[1]) === 0) return usageError('seq', `invalid Zero increment value: ‘${operands[1]!}’`);
  const others = operands.slice(0, -1);
  const last = operands.at(-1);
  if (last !== undefined && last.includes('.') && others.every((arg) => !arg.includes('.'))) operands[operands.length - 1] = String(Math.floor(Number(last)));
  return addTry('seq')([...list, ...operands], ctx, next, fs);
};

// `tr`, over bytes as GNU's (T356).
type TrItem = { byte: number } | { from: number; to: number; text: string } | { className: string } | { fill: number; count: number | null };

const TR_ESCAPES: Readonly<Record<string, number>> = { a: 7, b: 8, f: 12, n: 10, r: 13, t: 9, v: 11, '\\': 92 };

const trClass = (name: string) => {
  const source = new RegExp(`[${POSIX_CLASS[name]!}]`);
  const bytes: number[] = [];
  for (let byte = 0; byte < 128; byte += 1) if (source.test(String.fromCharCode(byte))) bytes.push(byte);
  return bytes;
};

// A set's text as its items, or GNU's words for what's wrong.
function trItems(typed: string): { items: TrItem[]; warning: string } | { error: string } {
  const bytes = byteString(new TextEncoder().encode(typed));
  const units: { byte: number; escaped: boolean }[] = [];
  let warning = '';
  for (let at = 0; at < bytes.length; at += 1) {
    const char = bytes[at]!;
    if (char !== '\\') {
      units.push({ byte: char.charCodeAt(0), escaped: false });
      continue;
    }
    const octal = /^[0-7]{1,3}/.exec(bytes.slice(at + 1, at + 4))?.[0];
    if (at + 1 === bytes.length) {
      warning = 'tr: warning: an unescaped backslash at end of string is not portable\n';
      units.push({ byte: 92, escaped: true });
    } else if (octal !== undefined && Number.parseInt(octal, 8) < 256) {
      units.push({ byte: Number.parseInt(octal, 8), escaped: true });
      at += octal.length;
    } else if (octal !== undefined) {
      units.push({ byte: Number.parseInt(octal.slice(0, 2), 8), escaped: true });
      at += 2;
    } else {
      const next = bytes[(at += 1)]!;
      units.push({ byte: TR_ESCAPES[next] ?? next.charCodeAt(0), escaped: true });
    }
  }
  const plain = (at: number, char: string) => units[at]?.escaped === false && units[at]!.byte === char.charCodeAt(0);
  const closes = (from: number, a: string) => {
    for (let at = from; at + 1 < units.length; at += 1) if (plain(at, a) && plain(at + 1, ']')) return at;
    return -1;
  };
  const words = (from: number, to: number) => byteString(Uint8Array.from(units.slice(from, to), (unit) => unit.byte));
  const items: TrItem[] = [];
  for (let at = 0; at < units.length; at += 1) {
    if (plain(at, '[') && (plain(at + 1, ':') || plain(at + 1, '='))) {
      const kind = plain(at + 1, ':') ? ':' : '=';
      const end = closes(at + 2, kind);
      if (end > at + 2 || (end === at + 2 && kind === ':')) {
        const inner = words(at + 2, end);
        if (kind === ':') {
          if (!(inner in POSIX_CLASS)) return { error: `tr: invalid character class ‘${inner}’\n` };
          items.push({ className: inner });
        } else {
          if (inner.length !== 1) return { error: `tr: ${new TextDecoder().decode(fromByteString(inner))}: equivalence class operand must be a single character\n` };
          items.push({ byte: inner.charCodeAt(0) });
        }
        at = end + 1;
        continue;
      }
    }
    if (plain(at, '[') && plain(at + 2, '*') && at + 1 < units.length) {
      let end = at + 3;
      while (end < units.length && !plain(end, ']')) end += 1;
      if (end < units.length) {
        const count = words(at + 3, end);
        if (!/^\d*$/.test(count) || (count.startsWith('0') && !/^[0-7]+$/.test(count))) return { error: `tr: invalid repeat count ‘${count}’ in [c*n] construct\n` };
        const number = count === '' ? 0 : count.startsWith('0') ? Number.parseInt(count, 8) : Number(count);
        items.push({ fill: units[at + 1]!.byte, count: number === 0 ? null : number });
        at = end;
        continue;
      }
    }
    if (plain(at + 1, '-') && at + 2 < units.length) {
      const [from, to] = [units[at]!.byte, units[at + 2]!.byte];
      const text = new TextDecoder().decode(fromByteString(words(at, at + 3)));
      if (from > to) return { error: `tr: range-endpoints of '${text}' are in reverse collating sequence order\n` };
      items.push({ from, to, text });
      at += 2;
      continue;
    }
    items.push({ byte: units[at]!.byte });
  }
  return { items, warning };
}

const trBytes = (items: readonly TrItem[], fillTo = 0): number[] => {
  const known = items.reduce((sum, item) => sum + ('byte' in item ? 1 : 'from' in item ? item.to - item.from + 1 : 'className' in item ? trClass(item.className).length : (item.count ?? 0)), 0);
  return items.flatMap((item) => {
    if ('byte' in item) return [item.byte];
    if ('from' in item) return Array.from({ length: item.to - item.from + 1 }, (_, at) => item.from + at);
    if ('className' in item) return trClass(item.className);
    return new Array<number>(item.count ?? Math.max(0, fillTo - known)).fill(item.fill);
  });
};

const tr: Fix = async (args, ctx, next) => {
  if (args.includes('--help')) return next(args);
  let [complement, deleting, squeezing, truncating, end] = [false, false, false, false, false];
  const sets: string[] = [];
  for (const arg of args) {
    // GNU's stop at the first set.
    if (end || !isOption(arg)) {
      sets.push(arg);
      end = true;
    } else if (arg === '--') end = true;
    else if (arg === '--complement') complement = true;
    else if (arg === '--delete') deleting = true;
    else if (arg === '--squeeze-repeats') squeezing = true;
    else if (arg === '--truncate-set1') truncating = true;
    else if (arg.startsWith('--')) return usageError('tr', `unrecognized option '${arg}'`);
    else {
      for (const letter of arg.slice(1)) {
        if (letter === 'c' || letter === 'C') complement = true;
        else if (letter === 'd') deleting = true;
        else if (letter === 's') squeezing = true;
        else if (letter === 't') truncating = true;
        else return usageError('tr', `invalid option -- '${letter}'`);
      }
    }
  }
  const translating = !deleting && sets.length === 2;
  const wanted = deleting === squeezing || (!deleting && !squeezing) ? 2 : 1;
  const most = deleting && squeezing ? 2 : deleting ? 1 : 2;
  if (sets.length === 0) return usageError('tr', 'missing operand');
  if (sets.length < wanted) return failed(`tr: missing operand after ‘${sets[0]!}’\n${deleting ? 'Two strings must be given when both deleting and squeezing repeats.' : 'Two strings must be given when translating.'}\n${tryHelp('tr')}`, 1);
  if (sets.length > most) return failed(`tr: extra operand ‘${sets[most]!}’\n${deleting && !squeezing && sets.length === 2 ? 'Only one string may be given when deleting without squeezing repeats.\n' : ''}${tryHelp('tr')}`, 1);
  const first = trItems(sets[0]!);
  if ('error' in first) return failed(first.error, 1);
  const second = sets[1] === undefined ? { items: [] as TrItem[], warning: '' } : trItems(sets[1]);
  if ('error' in second) return failed(second.error, 1);
  const warning = `${first.warning}${second.warning}`;
  if (first.items.some((item) => 'fill' in item && item.count === null)) return failed('tr: the [c*] repeat construct may not appear in string1\n', 1);
  const fills = second.items.filter((item) => 'fill' in item && item.count === null);
  if (fills.length > 0 && !translating) return failed('tr: the [c*] construct may appear in string2 only when translating\n', 1);
  if (fills.length > 1) return failed('tr: only one [c*] repeat construct may appear in string2\n', 1);
  const caseClass = (item: TrItem) => 'className' in item && (item.className === 'upper' || item.className === 'lower');
  if (second.items.some((item) => 'className' in item && !caseClass(item))) return failed("tr: the only character classes that may appear in string2 are 'upper' and 'lower'\n", 1);
  let set1 = trBytes(first.items);
  if (complement) {
    const taken = new Set(set1);
    set1 = Array.from({ length: 256 }, (_, byte) => byte).filter((byte) => !taken.has(byte));
  }
  if (translating) {
    if (sets[1] === '' && !truncating && set1.length > 0) return failed('tr: when not truncating set1, string2 must be non-empty\n', 1);
    // A case class in the second set faces one in the first, at the same place.
    const places = (items: readonly TrItem[]) => {
      let place = 0;
      const found: number[] = [];
      for (const item of items) {
        if (caseClass(item)) found.push(place);
        place += trBytes([item]).length;
      }
      return found;
    };
    const facing = places(first.items);
    if (places(second.items).some((place) => complement || !facing.includes(place))) return failed(complement ? 'tr: when translating with string1 longer than string2,\nthe latter string must not end with a character class\n' : 'tr: misaligned [:upper:] and/or [:lower:] construct\n', 1);
  }
  let set2 = trBytes(second.items, translating ? set1.length : 0);
  if (translating && truncating) set1 = set1.slice(0, set2.length);
  if (translating && set2.length > 0) while (set2.length < set1.length) set2 = [...set2, ...new Array<number>(set1.length - set2.length).fill(set2.at(-1)!)];
  const map = Array.from({ length: 256 }, (_, byte) => byte);
  if (translating) set1.forEach((byte, at) => (map[byte] = set2[at]!));
  const removed = new Set(deleting ? set1 : []);
  const squeezed = new Set(!squeezing ? [] : deleting || translating ? set2 : set1);
  const input = inputBytes(ctx);
  const out = new Uint8Array(input.length);
  let size = 0;
  let last = -1;
  for (const byte of input) {
    if (removed.has(byte)) continue;
    const mapped = map[byte]!;
    if (mapped === last && squeezed.has(mapped)) continue;
    out[size] = mapped;
    size += 1;
    last = mapped;
  }
  return bytesOutput(out.subarray(0, size), warning);
};

// `basename` and `dirname`, here, as `--` and an operand like `-a` are theirs (T386).
const lastPart = (path: string) => (/^\/+$/.test(path) ? '/' : path.replace(/\/+$/, '').split('/').at(-1)!);
const basename: Fix = async (args, ctx, next) => {
  if (args.includes('--help')) return next(args);
  const wrong = unlisted(args.filter((_, at) => args[at - 1] !== '-s'), 'as', ['--multiple', '--suffix']);
  if (wrong !== null) return wrongOption('basename', wrong);
  let [multiple, suffix] = [false, ''];
  const operands: string[] = [];
  for (let at = 0; at < args.length; at += 1) {
    const arg = args[at]!;
    if (arg === '--') {
      operands.push(...args.slice(at + 1));
      break;
    }
    if (!isOption(arg)) operands.push(arg);
    else if (arg === '-s') [multiple, suffix] = [true, args[(at += 1)] ?? ''];
    else if (arg.startsWith('--suffix=')) [multiple, suffix] = [true, arg.slice(9)];
    else multiple = true;
  }
  if (operands.length === 0) return usageError('basename', 'missing operand');
  if (!multiple && operands.length > 2) return usageError('basename', `extra operand ‘${operands[2]!}’`);
  if (!multiple && operands.length === 2) suffix = operands.pop()!;
  const shown = operands.map((operand) => {
    const name = lastPart(operand);
    // A suffix that is the whole name stays (T373).
    return `${suffix !== '' && name !== suffix && name.endsWith(suffix) ? name.slice(0, -suffix.length) : name}\n`;
  });
  return { stdout: shown.join(''), stderr: '', exitCode: 0 };
};

const dirname: Fix = async (args, ctx, next) => {
  if (args.includes('--help')) return next(args);
  const wrong = unlisted(args, '', []);
  if (wrong !== null) return wrongOption('dirname', wrong);
  const operands = args.filter((arg) => arg !== '--');
  if (operands.length === 0) return usageError('dirname', 'missing operand');
  const parent = (path: string) => {
    const bare = path.replace(/\/+$/, '');
    if (bare === '') return path === '' ? '.' : '/';
    const at = bare.lastIndexOf('/');
    if (at < 0) return '.';
    return bare.slice(0, at).replace(/\/+$/, '') || '/';
  };
  return { stdout: operands.map((operand) => `${parent(operand)}\n`).join(''), stderr: '', exitCode: 0 };
};

const pwd: Fix = async (args, ctx, next) => {
  const bad = args.find((arg) => isOption(arg) && arg !== '--' && !/^-[LP]+$/.test(arg));
  if (bad !== undefined && !args.includes('--help')) return failed(`bash: pwd: ${bad.slice(0, 2)}: invalid option\npwd: usage: pwd [-LP]\n`, 2);
  // A folder reached by exactly two slashes keeps them (T375).
  const shown = ctx.env.get('PWD') ?? '';
  return /^\/\/(?!\/)/.test(shown) && !args.some((arg) => /^-L*P/.test(arg) || arg === '--help') ? { stdout: `${shown}\n`, stderr: '', exitCode: 0 } : next(args);
};

const TREE_USAGE = 'usage: tree [-acdfghilnpqrstuvxACDFJQNSUX] [-L level [-R]] [-H [-]baseHREF]\n\t[-T title] [-o filename] [-P pattern] [-I pattern] [--gitignore]\n\t[--gitfile[=]file] [--matchdirs] [--metafirst] [--ignore-case]\n\t[--nolinks] [--hintro[=]file] [--houtro[=]file] [--inodes] [--device]\n\t[--sort[=]name] [--dirsfirst] [--filesfirst] [--filelimit[=]#] [--si]\n\t[--du] [--prune] [--charset[=]X] [--timefmt[=]format] [--fromfile]\n\t[--fromtabfile] [--fflinks] [--info] [--infofile[=]file] [--noreport]\n\t[--hyperlink] [--scheme[=]schema] [--authority[=]host] [--opt-toggle]\n\t[--compress[=]#] [--condense] [--version] [--help]\n\t[--] [directory ...]\n';

// `tree -f` names a path as given, and `-L` takes a positive number (T340).
const tree: Fix = async (args, ctx, next, fs) => {
  if (args.includes('--help')) return next(args);
  if (args.at(-1) === '-L') return failed('tree: Missing argument to -L option.\n', 1);
  // What `--help` doesn't list, as `tree` refuses what it doesn't know (T388).
  const wrong = unlisted(args.filter((_, at) => args[at - 1] !== '-L').map((arg) => arg.replace(/^(-[adf]*L).+$/, '$1')), 'adLf', []);
  if (wrong !== null) return failed(`tree: Invalid argument ${wrong.startsWith('--') ? `\`${wrong}'` : `-\`${wrong[1]!}'`}.\n${TREE_USAGE}`, 1);
  for (const [at, arg] of args.entries()) {
    const level = args[at - 1] === '-L' ? arg : /^-L(.+)$/.exec(arg)?.[1];
    if (level !== undefined && !/^0*[1-9]\d*$/.test(level)) return failed('tree: Invalid level, must be greater than 0.\n', 1);
  }
  const roots = args.filter((arg, at) => !isOption(arg) && args[at - 1] !== '-L');
  const options = args.filter((arg) => !roots.includes(arg));
  // Each root in its place: one that isn't a folder is a line of its own, and only
  // a missing one fails (T360).
  let body = '';
  let folders = 0;
  let files = 0;
  let exitCode = 0;
  const onlyFolders = args.some((arg) => /^-[a-zA-Z]*d/.test(arg));
  for (const root of roots.length === 0 ? ['.'] : roots) {
    const stat = await fs.stat(fs.resolvePath(ctx.cwd, root)).catch(() => null);
    if (stat?.isDirectory !== true) {
      body += `${root}  [error opening dir]\n`;
      if (stat === null) exitCode = 2;
      else files += 1;
      continue;
    }
    const result = await next([...options, root]);
    const summary = /^\n(\d+) director(?:y|ies)(?:, (\d+) files?)?\n$/m.exec(result.stdout);
    const listing = summary === null ? result.stdout : result.stdout.slice(0, summary.index);
    // `tree` counts the root it shows anything under, where just-bash doesn't.
    folders += Number(summary?.[1] ?? 0) + (listing.split('\n').length > 2 ? 1 : 0);
    files += Number(summary?.[2] ?? 0);
    body += treeNames(listing, root, args, ctx);
  }
  const shownFiles = onlyFolders ? '' : `, ${files} file${files === 1 ? '' : 's'}`;
  return { stdout: `${body}\n${folders} director${folders === 1 ? 'y' : 'ies'}${shownFiles}\n`, stderr: '', exitCode };
};

// `-f`'s paths as given, and the lines `tree` draws, where just-bash's are ASCII
// (T370).
function treeNames(listing: string, root: string, args: readonly string[], ctx: Context): string {
  let text = listing;
  if (args.some((arg) => /^-[a-zA-Z]*f/.test(arg))) {
    const typed = root.replace(/(.)\/+$/, '$1');
    const whole = typed === '.' ? ctx.cwd : typed.startsWith('/') ? typed : `${ctx.cwd === '/' ? '' : ctx.cwd}/${typed}`;
    text = text.replaceAll(`-- ${whole}/`, `-- ${typed}/`);
  }
  return text.replace(/^((?:\|   | {4})*)(\|-- |`-- )/gm, (_, indent: string, branch: string) => `${indent.replaceAll('|   ', '│\u00a0\u00a0 ')}${branch === '|-- ' ? '├── ' : '└── '}`);
}

const COLORS = new Set(['always', 'yes', 'force', 'never', 'no', 'none', 'auto', 'tty', 'if-tty']);

const ls: Fix = async (args, ctx, next, fs) => {
  const color = args.find((arg) => arg.startsWith('--color='))?.slice(8);
  if (color !== undefined && !COLORS.has(color)) return failed(`ls: invalid argument ‘${color}’ for ‘--color’\nValid arguments are:\n  - ‘always’, ‘yes’, ‘force’\n  - ‘never’, ‘no’, ‘none’\n  - ‘auto’, ‘tty’, ‘if-tty’\n${tryHelp('ls')}`, 1);
  // No name, or a final slash on a file: each said, and the rest listed (T378, T385).
  let said = '';
  const kept: string[] = [];
  for (const arg of args) {
    const wrong = arg === '' ? 'No such file or directory' : isOption(arg) ? null : await notFolder(fs, ctx, arg);
    if (wrong === null) kept.push(arg);
    else said += `ls: cannot access '${arg}': ${wrong}\n`;
  }
  if (said === '') return addTry('ls', 2)(args, ctx, next, fs);
  if (kept.every((arg) => isOption(arg))) return failed(said, 2);
  const result = await addTry('ls', 2)(kept, ctx, next, fs);
  // Named beside another, a folder's listing still says which.
  const paths = kept.filter((arg) => !isOption(arg));
  const header = paths.length === 1 && (await isFolder(fs, ctx, paths[0]!)) ? `${paths[0]!}:\n` : '';
  return { ...result, stdout: `${header}${result.stdout}`, stderr: `${said}${result.stderr}`, exitCode: 2 };
};

const touch: Fix = async (args, ctx, next, fs) => {
  let said = '';
  const kept: string[] = [];
  for (const [at, arg] of args.entries()) {
    const value = args[at - 1] === '-d' || args[at - 1] === '--date';
    const wrong = value || isOption(arg) ? null : arg === '' ? 'No such file or directory' : await notFolder(fs, ctx, arg);
    if (wrong === null) kept.push(arg);
    else said += `touch: cannot touch '${arg}': ${wrong}\n`;
  }
  if (said !== '' && kept.every((arg) => isOption(arg))) return failed(said, 1);
  const result = await addTry('touch')(kept, ctx, next, fs);
  const stderr = result.stderr.replace(/^(touch: invalid date format )'(.*)'$/gm, '$1‘$2’');
  return { ...result, stderr: `${said}${stderr}`, exitCode: said === '' ? result.exitCode : 1 };
};

// `cat`: a file that's also where its output is being added isn't read (T355).
const cat: Fix = async (typed, ctx, next, fs) => {
  // No name, or a final slash on a file: said in their place (T378, T385).
  let said = '';
  const args: string[] = [];
  for (const arg of typed) {
    const wrong = arg === '' ? 'No such file or directory' : isOption(arg) ? null : await notFolder(fs, ctx, arg);
    if (wrong === null) args.push(arg);
    else said += `cat: ${arg === '' ? "''" : arg}: ${wrong}\n`;
  }
  if (said !== '') {
    if (args.every((arg) => isOption(arg))) return failed(said, 1);
    const result = await cat(args, ctx, next, fs);
    return { ...result, stderr: `${said}${result.stderr}`, exitCode: 1 };
  }
  const output = ctx.env.get(OUTPUT_FILE);
  if (output === undefined) return addTry('cat')(args, ctx, next, fs);
  const input = ctx.env.get(INPUT_FILE);
  const operands = args.filter((arg) => !isOption(arg));
  const selfInput = input !== undefined && samePath(ctx, fs, input, output);
  const own = (arg: string) => (arg === '-' ? selfInput : samePath(ctx, fs, arg, output));
  const refused = (operands.length === 0 ? (selfInput ? ['-'] : []) : operands.filter(own)).map((arg) => `cat: ${arg}: input file is output file\n`).join('');
  if (refused === '') return addTry('cat')(args, ctx, next, fs);
  const kept = args.filter((arg) => isOption(arg) || !own(arg));
  if (kept.every((arg) => isOption(arg))) return failed(refused, 1);
  const result = await addTry('cat')(kept, ctx, next, fs);
  return { ...result, stderr: `${refused}${result.stderr}`, exitCode: 1 };
};

// `tee` to a folder says so, and writes the rest (T365).
const tee: Fix = async (args, ctx, next, fs) => {
  if (args.includes('--help')) return next(args);
  const folders: string[] = [];
  for (const file of args) if (!isOption(file) && (await isFolder(fs, ctx, file))) folders.push(file);
  if (folders.length === 0) return addTry('tee')(args, ctx, next, fs);
  const result = await addTry('tee')(args.filter((arg) => !folders.includes(arg)), ctx, next, fs);
  return { ...result, stderr: `${folders.map((file) => `tee: ${file}: Is a directory\n`).join('')}${result.stderr}`, exitCode: 1 };
};

// An empty name isn't looked for (T373).
const which: Fix = async (args, ctx, next, fs) => {
  if (args.includes('--help') || !args.includes('')) return addTry('which')(args, ctx, next, fs);
  const rest = args.filter((arg) => arg !== '');
  if (rest.every((arg) => isOption(arg))) return failed('', 1);
  const result = await addTry('which')(rest, ctx, next, fs);
  return { ...result, exitCode: 1 };
};

// `rm`: what GNU refuses by the name alone (T377, T385), each said and the rest
// gone on with.
const rm: Fix = async (args, ctx, next, fs) => {
  if (args.includes('--help')) return next(args);
  const end = args.indexOf('--');
  const options = (end < 0 ? args : args.slice(0, end)).filter((arg) => isOption(arg));
  const recursive = options.some((arg) => arg === '--recursive' || /^-[a-zA-Z]*[rR]/.test(arg));
  const force = options.some((arg) => arg === '--force' || /^-[a-zA-Z]*f/.test(arg));
  let said = '';
  let status = 0;
  let removed = false;
  const kept = args.filter((arg, at) => {
    if (isOption(arg) && (end < 0 || at < end)) return true;
    if (arg === '--') return true;
    if (arg === '') {
      removed = true;
      if (!force) {
        said += "rm: cannot remove '': No such file or directory\n";
        status = 1;
      }
      return false;
    }
    if (recursive && /(?:^|\/)\.\.?\/*$/.test(arg)) {
      removed = true;
      said += `rm: refusing to remove '.' or '..' directory: skipping '${arg}'\n`;
      status = 1;
      return false;
    }
    return true;
  });
  if (!removed) return addTry('rm')(args, ctx, next, fs);
  if (kept.every((arg) => arg === '--' || isOption(arg))) return failed(said, status);
  const result = await addTry('rm')(kept, ctx, next, fs);
  return { ...result, stderr: `${said}${result.stderr}`, exitCode: result.exitCode || status };
};

// `--` ends the options (T386): it goes, and what looks like an option past it is
// read as a path.
const pastDashes =
  (fix: Fix): Fix =>
  async (args, ctx, next, fs) => {
    const at = args.indexOf('--');
    if (at < 0) return fix(args, ctx, next, fs);
    const rest = args.slice(at + 1);
    const result = await fix([...args.slice(0, at), ...rest.map((word) => (isOption(word) ? `./${word}` : word))], ctx, next, fs);
    return rest.some(isOption) ? { ...result, stderr: result.stderr.replace(/(^|[ '‘])\.\/(-)/gm, '$1$2') } : result;
  };

// GNU's long options (T387), `=` after one that takes a value and `?` after one that
// may: a shortened name
// that's still unique is that name, a value may be the next word, and a name that
// could be two says so. `short` are the letters that take a value, and `stops`
// says the options end at the first operand.
const LONG: Readonly<Record<string, { names: string; short: string; stops?: boolean }>> = {
  head: { names: 'verbose version bytes= lines= quiet silent zero-terminated help', short: 'nc' },
  tail: { names: 'silent sleep-interval= verbose version bytes= debug follow? retry lines= max-unchanged-stats= pid= quiet zero-terminated help', short: 'nc' },
  grep: { names: 'basic-regexp before-context= binary-files= byte-offset binary context= color? colour? count devices= directories= dereference-recursive extended-regexp exclude= exclude-from= exclude-dir= fixed-regexp file= files-with-matches files-without-match include= ignore-case initial-tab invert-match label= line-buffered line-number line-regexp no-ignore-case no-filename no-group-separator no-messages null null-data recursive regexp= with-filename word-regexp fixed-strings perl-regexp version help max-count= only-matching quiet silent text after-context= group-separator=', short: 'efmABCdD' },
  wc: { names: 'files0-from= bytes chars lines debug max-line-length words total= help version', short: '' },
  sort: { names: 'batch-size= buffer-size= check compress-program= debug dictionary-order files0-from= field-separator= human-numeric-sort help ignore-leading-blanks ignore-case ignore-nonprinting merge month-sort random-sort random-source= reverse sort= stable version-sort version general-numeric-sort numeric-sort key= output= temporary-directory= parallel= unique zero-terminated', short: 'ktoST' },
  xargs: { names: 'eof? exit max-lines max-args= max-chars= max-procs= null no-run-if-empty verbose version arg-file= delimiter= replace? open-tty interactive process-slot-var= show-limits help', short: 'IdnPsLaE', stops: true },
  basename: { names: 'multiple suffix= zero help version', short: 's' },
  dirname: { names: 'zero help version', short: '' },
  diff: { names: 'binary brief changed-group-format= color? context? ed exclude= exclude-from= expand-tabs forward-ed from-file= help horizon-lines= ifdef= ignore-all-space ignore-blank-lines ignore-case ignore-file-name-case ignore-matching-lines= ignore-space-change ignore-tab-expansion ignore-trailing-space inhibit-hunk-merge initial-tab label= left-column line-format= new-file new-group-format= new-line-format= no-dereference no-ignore-file-name-case normal old-group-format= old-line-format= paginate palette= rcs recursive report-identical-files sdiff-merge-assist show-c-function show-function-line= side-by-side speed-large-files starting-file= strip-trailing-cr suppress-blank-empty suppress-common-lines tabsize= text to-file= unchanged-group-format= unchanged-line-format= unidirectional-new-file unified? width= minimal version', short: '' },
  seq: { names: 'format= separator= equal-width help version', short: 's' },
  env: { names: 'default-signal? debug ignore-environment ignore-signal? argv0= env0-from= null unset= chdir= split-string= block-signal? list-signal-handling help version', short: 'uCS', stops: true },
  date: { names: 'date= debug reference= resolution rfc-email rfc-822 rfc-2822 rfc-3339= file= iso-8601? set= utc universal help version', short: 'dfrsI' },
  tr: { names: 'complement delete squeeze-repeats truncate-set1 help version', short: '', stops: true },
  cut: { names: 'characters= complement only-delimited output-delimiter= bytes= delimiter= fields= no-partial whitespace-delimited? zero-terminated help version', short: 'bcfd' },
  uniq: { names: 'count check-chars= skip-fields= skip-chars= repeated all-repeated? group? ignore-case unique zero-terminated help version', short: 'fsw' },
  tee: { names: 'append ignore-interrupts output-error? help version', short: '' },
  cat: { names: 'number-nonblank number squeeze-blank show-nonprinting show-ends show-tabs show-all help version', short: '' },
  touch: { names: 'no-create no-dereference date= reference= time= help version', short: 'drt' },
  mkdir: { names: 'verbose version mode= parents context? help', short: 'm' },
  cp: { names: 'archive attributes-only copy-contents context? debug dereference no-clobber no-dereference no-preserve= no-target-directory parents preserve? recursive remove-destination reflink? sparse= strip-trailing-slashes suffix= symbolic-link verbose version backup? force interactive keep-directory-symlink link update? target-directory= one-file-system help', short: 'St' },
  mv: { names: 'no-clobber no-copy no-target-directory strip-trailing-slashes suffix= verbose version backup? debug exchange force interactive update? target-directory= context help', short: 'St' },
  rm: { names: 'verbose version force interactive? one-file-system no-preserve-root preserve-root? recursive dir help', short: '' },
  ls: { names: 'all almost-all author classify? color? context directory dired dereference-command-line dereference-command-line-symlink-to-dir dereference full-time file-type format= human-readable hide-control-chars hide= hyperlink? help inode ignore-backups ignore= indicator-style= numeric-uid-gid no-group quote-name quoting-style= reverse recursive size si show-control-chars sort= tabsize= time= time-style= escape block-size= group-directories-first kibibytes literal width= zero version', short: 'IwTp' },
  sed: { names: 'file= follow-symlinks silent sandbox separate quiet debug expression= in-place? line-length= posix regexp-extended unbuffered null-data help version', short: 'efl' },
};

function longForms(name: string, args: readonly string[]): string[] | Output {
  const { names, short, stops } = LONG[name]!;
  const table = names.split(' ');
  const bare = table.map((each) => each.replace(/[=?]$/, ''));
  const list: string[] = [];
  for (let at = 0; at < args.length; at += 1) {
    const arg = args[at]!;
    if (arg === '--' || (stops === true && !isOption(arg))) {
      list.push(...args.slice(at));
      break;
    }
    if (/^-[a-zA-Z0-9]/.test(arg) && short.includes(arg.at(-1)!) && [...arg.slice(1)].every((letter) => /[a-zA-Z]/.test(letter))) {
      list.push(arg);
      if (at + 1 < args.length) list.push(args[(at += 1)]!);
      continue;
    }
    const long = /^--([^=]+)(=.*)?$/s.exec(arg);
    if (long === null) {
      list.push(arg);
      continue;
    }
    const typed = long[1]!;
    const found = bare.includes(typed) ? [typed] : bare.filter((each) => each.startsWith(typed));
    if (found.length > 1) return wrongUse(name, `option '--${typed}' is ambiguous; possibilities: ${found.map((each) => `'--${each}'`).join(' ')}`);
    if (found.length === 0) {
      list.push(arg);
      continue;
    }
    const full = found[0]!;
    const valued = table[bare.indexOf(full)]!.endsWith('=');
    if (!valued && long[2] !== undefined && !table[bare.indexOf(full)]!.endsWith('?')) return wrongUse(name, `option '--${full}' doesn't allow an argument`);
    if (valued && long[2] === undefined && at + 1 === args.length) return wrongUse(name, `option '--${full}' requires an argument`);
    list.push(valued && long[2] === undefined ? `--${full}=${args[(at += 1)]!}` : `--${full}${long[2] ?? ''}`);
  }
  return list;
}

const withLongForms =
  (name: string, fix: Fix): Fix =>
  (args, ctx, next, fs) => {
    const list = longForms(name, args);
    return Array.isArray(list) ? fix(list, ctx, next, fs) : Promise.resolve(list);
  };

const FIXES: Readonly<Record<string, Fix>> = {
  head: pastDashes(bundled('nc', needsValue('head', 'nc', counted('head', head)))),
  tail: pastDashes(bundled('nc', needsValue('tail', 'nc', counted('tail', tail)))),
  uniq: bundled('fsw', needsValue('uniq', 'fsw', uniq)),
  sed: pastDashes(sed),
  date: needsValue('date', 'd', date),
  env: pastDashes(async (args, ctx, next, fs) => (valueMissing(args, 'u') === null ? env(args, ctx, next, fs) : noValue('env', 'u', 125))),
  xargs,
  cp: copy('cp'),
  mv: copy('mv'),
  diff,
  sort: bundled('ktoST', sort),
  find: pastDashes(find),
  mkdir,
  grep,
  pwd,
  ls,
  tree,
  touch: needsValue('touch', 'd', touch),
  awk: pastDashes(awk),
  wc,
  cut: bundled('bcfd', cut),
  seq: needsValue('seq', 's', seq),
  tr,
  basename: bundled('s', needsValue('basename', 's', basename)),
  dirname,
  cat,
  tee,
  which,
  rm,
};

export const GNU: Readonly<Record<string, Fix>> = Object.fromEntries(Object.entries(FIXES).map(([name, fix]) => [name, LONG[name] === undefined ? fix : withLongForms(name, fix)]));
