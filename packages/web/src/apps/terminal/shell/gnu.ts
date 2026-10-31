// Where just-bash's standard commands differ from GNU's in an option their
// own `--help` lists, or in how they word a wrong use (006 FR-017, FR-068,
// SC-014, T302, T306). Each runs in front of the command, which `next` runs.
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
async function eachInput(rest: readonly string[], ctx: Context, next: Next, whole: string[], cut: (bytes: Uint8Array) => Uint8Array): Promise<Output> {
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
    else {
      const result = await next([...whole, file]);
      stderr += result.stderr;
      if (result.exitCode !== 0) {
        exitCode = result.exitCode;
        continue;
      }
      bytes = result.stdoutKind === 'bytes' ? Uint8Array.from(result.stdout, (char) => char.charCodeAt(0)) : new TextEncoder().encode(result.stdout);
    }
    if (headers) add(`${first ? '' : '\n'}==> ${file === '-' ? 'standard input' : file} <==\n`);
    first = false;
    for (const byte of cut(bytes)) out.push(byte);
  }
  return bytesOutput(Uint8Array.from(out), stderr, exitCode);
}

// All but the last `count` lines.
function withoutLastLines(bytes: Uint8Array, count: number): Uint8Array {
  const ends: number[] = [];
  bytes.forEach((byte, at) => {
    if (byte === 10) ends.push(at + 1);
  });
  if (bytes.length > 0 && bytes.at(-1) !== 10) ends.push(bytes.length);
  return bytes.slice(0, ends.length > count ? ends[ends.length - count - 1] : 0);
}

const WHOLE = '1000000000';

// `head` and `tail`: GNU's words for a wrong count or a file it can't open.
const COUNT_WORDS = (name: string, args: readonly string[]) => (result: Output) => {
  const stderr = result.stderr
    .replace(new RegExp(`^${name}: invalid number of lines$`, 'm'), `${name}: invalid number of lines: ‘${countOption(args, 'n', 'lines')?.count ?? ''}’`)
    .replace(new RegExp(`^${name}: (.+): No such file or directory$`, 'gm'), `${name}: cannot open '$1' for reading: No such file or directory`);
  return stderr === result.stderr ? result : { ...result, stderr };
};

const head: Fix = async (args, ctx, next, fs) => {
  const lines = countOption(args, 'n', 'lines');
  if (lines !== null && /^-\d+$/.test(lines.count)) return eachInput(lines.rest, ctx, next, ['-n', WHOLE], (bytes) => withoutLastLines(bytes, Number(lines.count.slice(1))));
  const bytes = countOption(args, 'c', 'bytes');
  if (bytes !== null && /^-\d+$/.test(bytes.count)) return eachInput(bytes.rest, ctx, next, ['-n', WHOLE], (all) => all.slice(0, Math.max(0, all.length - Number(bytes.count.slice(1)))));
  return COUNT_WORDS('head', args)(await addTry('head')(args, ctx, next, fs));
};

const tail: Fix = async (args, ctx, next, fs) => {
  const bytes = countOption(args, 'c', 'bytes');
  if (bytes !== null && /^\+?\d+$/.test(bytes.count)) {
    const from = bytes.count.startsWith('+');
    const count = Number(bytes.count);
    return eachInput(bytes.rest, ctx, next, ['-n', `+1`], (all) => (from ? all.slice(Math.max(0, count - 1)) : count === 0 ? all.slice(all.length) : all.slice(-count)));
  }
  return COUNT_WORDS('tail', args)(await addTry('tail')(args, ctx, next, fs));
};

// `uniq -c`: GNU's count takes 7 columns.
const uniq: Fix = async (args, ctx, next, fs) => {
  const valued = new Set(['-f', '-s', '-w', '--skip-fields', '--skip-chars', '--check-chars']);
  const operands = operandsOf(args, valued);
  if (operands.length === 2) {
    const shown = await uniq(args.toSpliced(args.lastIndexOf(operands[1]!), 1), ctx, next, fs);
    if (shown.exitCode !== 0) return shown;
    await fs.writeFile(fs.resolvePath(ctx.cwd, operands[1]!), shown.stdout);
    return { ...shown, stdout: '' };
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
  let text = script.replace(/^((?:\d+|\$|\/[^/]*\/)?\s*[aic])\\(?=[^\n])/, '$1 ');
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

const sed: Fix = async (args, ctx, next, fs) => {
  if (args.length === 0) return failed(SED_USAGE, 1);
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
    if (/^sed: nope|^sed: .+: No such file or directory$/m.test(stderr)) {
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
  let text = typed.trim().toLowerCase().replace(/\s+utc$|z$/, '');
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
  take(/\b(\d{4})-(\d{1,2})-(\d{1,2})(?=$|[\st])/, (m) => dateAt(m[1]!, Number(m[2]) - 1, m[3]!)) ||
    take(/\b(\d{4})\/(\d{1,2})\/(\d{1,2})\b/, (m) => dateAt(m[1]!, Number(m[2]) - 1, m[3]!)) ||
    take(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/, (m) => dateAt(m[3]!, Number(m[1]) - 1, m[2]!)) ||
    take(/\b(\d{1,2})\s+([a-z]{3,9})\.?,?\s+(\d{4})\b/, (m) => dateAt(m[3]!, monthOf(m[2]!), m[1]!)) ||
    take(/\b([a-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/, (m) => dateAt(m[3]!, monthOf(m[1]!), m[2]!)) ||
    (monthWord(text) && take(/\b([a-z]{3,9})\.?\s+(\d{1,2})\b/, (m) => dateAt(String(year), monthOf(m[1]!), m[2]!)));
  if (month < 0 || month > 11) return null;
  take(/^t?\s*|\bt(?=\d)/, () => undefined);
  take(/\b(\d{1,2}):(\d\d)(?::(\d\d))?\b/, (m) => {
    seconds = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] ?? 0);
  });
  if (take(/^now$/, () => undefined) || take(/^today$/, () => undefined)) text = '';
  take(/\btomorrow\b/, () => (shift += 86_400));
  take(/\byesterday\b/, () => (shift -= 86_400));
  let weekday: { day: number; way: number } | null = null;
  take(/\b(next|last|this)?\s*(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/, (m) => {
    weekday = { day: DAYS.indexOf(m[2]!), way: m[1] === 'last' ? -1 : 1 };
    seconds = 0;
  });
  for (;;) {
    const matched = take(/([-+]?\d+)?\s*(sec|second|min|minute|hour|day|week|fortnight|month|year)s?(\s+ago)?\b/, (m) => {
      const count = Number(m[1] ?? 1) * (m[3] === undefined ? 1 : -1);
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

const ISO: Readonly<Record<string, string>> = { date: '+%F', hours: '+%FT%H+00:00', minutes: '+%FT%H:%M+00:00', seconds: '+%FT%T+00:00' };

const date: Fix = async (args, ctx, next, fs) => {
  const list: string[] = [];
  for (let at = 0; at < args.length; at += 1) {
    const arg = args[at]!;
    const iso = /^(?:-I|--iso-8601(?:=|$))(.*)$/.exec(arg);
    if (iso !== null) list.push(ISO[iso[1] || 'date'] ?? arg);
    else if (arg === '-d' || arg === '--date' || arg.startsWith('--date=') || (arg.startsWith('-d') && !arg.startsWith('--'))) {
      const typed = arg === '-d' || arg === '--date' ? args[(at += 1)] ?? '' : arg.startsWith('--date=') ? arg.slice(7) : arg.slice(2);
      const value = readDate(typed, new Date());
      if (value === null) return failed(`date: invalid date ‘${typed}’\n`, 1);
      list.push('-d', `@${value}`);
    } else if (arg.startsWith('+')) list.push(dateFormat(arg));
    else if (!isOption(arg)) return failed(`date: invalid date ‘${arg}’\n`, 1);
    else list.push(arg);
  }
  const result = await addTry('date')(list, ctx, next, fs);
  return { ...result, stdout: dateValues(result.stdout), stderr: result.stderr.replace(/^(date: invalid date )'(.*)'$/gm, '$1‘$2’') };
};

const env: Fix = async (args, ctx, next, fs) => {
  const result = await addTry('env')(args, ctx, next, fs);
  const missing = /^bash: (\S+): command not found\n$/.exec(result.stderr);
  if (missing !== null) return { ...result, stderr: `env: ‘${missing[1]!}’: No such file or directory\n`, exitCode: 127 };
  // just-bash adds the working folder to an emptied environment.
  const emptied = args.includes('-i') || args.includes('--ignore-environment') || args[0] === '-';
  const words = args.filter((arg) => !isOption(arg) && arg !== '-');
  if (!emptied || words.at(-1) !== 'env' || words.some((word) => word.startsWith('PWD='))) return result;
  return { ...result, stdout: result.stdout.replace(/^PWD=.*\n/m, '') };
};

// `xargs`' options that take a value.
const XARGS_VALUED = /^-([IdnPsLaE])(.+)$/;

const xargs: Fix = async (args, ctx, next) => {
  if (args.includes('--help')) return next(args);
  const list: string[] = [];
  let at = 0;
  for (; at < args.length && isOption(args[at]!); at += 1) {
    const arg = args[at]!;
    const joined = XARGS_VALUED.exec(arg);
    if (joined !== null) list.push(`-${joined[1]!}`, joined[2]!);
    else {
      list.push(arg);
      if (/^-[IdnPsLaE]$/.test(arg)) list.push(args[(at += 1)]!);
    }
  }
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
  // A command that fails makes `xargs` end with 123.
  const failing = (result: Output) => (result.exitCode >= 1 && result.exitCode <= 125 && command[0] !== undefined ? { ...result, exitCode: 123 } : result);
  // GNU runs the command once with no input, unless told not to.
  if (new TextDecoder().decode(inputBytes(ctx)).trim() === '' && !list.some((arg) => arg === '-r' || arg === '--no-run-if-empty' || arg === '-I')) {
    return ctx.exec!((command.length === 0 ? ['echo'] : command).map(quote).join(' '), { cwd: ctx.cwd, env: Object.fromEntries(ctx.env) }).then(notFound(command));
  }
  return next([...list, ...command], input).then(notFound(command)).then(failing);
};

const notFound = (command: readonly string[]) => (result: Output) => {
  const word = command[0];
  if (word === undefined || !result.stderr.includes(`bash: ${word}: command not found\n`)) return result;
  return { ...result, stderr: `xargs: failed to run command ‘${word}’: No such file or directory\n`, exitCode: 127 };
};

const copy =
  (name: 'cp' | 'mv'): Fix =>
  async (args, ctx, next, fs) => {
    if (args.includes('--help')) return next(args);
    const operands = args.filter((arg) => !isOption(arg));
    if (!args.some((arg) => arg.startsWith('-t') || arg.startsWith('--target'))) {
      if (operands.length === 0) return failed(`${name}: missing file operand\n${tryHelp(name)}`, 1);
      if (operands.length === 1) return failed(`${name}: missing destination file operand after '${operands[0]!}'\n${tryHelp(name)}`, 1);
    }
    if (operands.length === 2 && fs.canonical(fs.resolvePath(ctx.cwd, operands[0]!)) === fs.canonical(fs.resolvePath(ctx.cwd, operands[1]!)) && (await fs.exists(fs.resolvePath(ctx.cwd, operands[0]!)))) return failed(`${name}: '${operands[0]!}' and '${operands[1]!}' are the same file\n`, 1);
    if (operands.length > 2 && !(await fs.exists(fs.resolvePath(ctx.cwd, operands.at(-1)!)))) return failed(`${name}: target '${operands.at(-1)!}': No such file or directory\n`, 1);
    const result = await addTry(name)(args, ctx, next, fs);
    // `-v` names a path as typed, where just-bash's are absolute.
    if (operands.at(-1)?.startsWith('/') === true || result.stdout === '') return result;
    return { ...result, stdout: result.stdout.replaceAll(` -> '${ctx.cwd === '/' ? '' : ctx.cwd}/`, " -> '") };
  };

const diff: Fix = async (args, ctx, next, fs) => {
  if (args.includes('--help')) return next(args);
  if (args.includes('--version') || args.includes('-v')) return { stdout: 'diff (GNU diffutils) 3.12\n', stderr: '', exitCode: 0 };
  const operands = args.filter((arg) => !isOption(arg));
  if (operands.length < 2) return failed(`diff: missing operand after ‘${operands[0] ?? 'diff'}’\ndiff: ${tryHelp('diff')}`, 2);
  const missing: string[] = [];
  for (const operand of operands.slice(0, 2)) if (operand !== '-' && !operand.startsWith('/dev/fd/') && !(await fs.exists(fs.resolvePath(ctx.cwd, operand)))) missing.push(`diff: ${operand}: No such file or directory\n`);
  if (missing.length > 0) return failed(missing.join(''), 2);
  // A folder with itself, and a `<(…)`, which `diff` opens as a file (T322).
  if (fs.canonical(fs.resolvePath(ctx.cwd, operands[0]!)) === fs.canonical(fs.resolvePath(ctx.cwd, operands[1]!))) return { stdout: '', stderr: '', exitCode: 0 };
  const substituted = operands.slice(0, 2).filter((operand) => operand.startsWith('/dev/fd/'));
  if (substituted.length > 0) {
    const read = await Promise.all(substituted.map((operand) => ctx.exec!(`cat ${quote(operand)}`, { cwd: ctx.cwd })));
    if (substituted.length === 2 && read[0]!.stdout === read[1]!.stdout) return { stdout: '', stderr: '', exitCode: 0 };
  }
  return addTry('diff')(args, ctx, next, fs);
};

const sort: Fix = async (args, ctx, next, fs) => {
  if (args.at(-1) === '-k' || args.at(-1) === '-t') return usageError('sort', `option requires an argument -- '${args.at(-1)!.slice(1)}'`, 2);
  const result = await addTry('sort', 2)(args, ctx, next, fs);
  const missing = /^sort: (.+): No such file or directory\n/.exec(result.stderr);
  return missing === null ? result : { ...result, stderr: `sort: cannot read: ${missing[1]!}: No such file or directory\n`, exitCode: 2 };
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

const find: Fix = async (args, _ctx, next) => {
  const result = await next(findSize(args));
  const root = args.find((arg) => !isOption(arg) && arg.endsWith('/') && arg.length > 1);
  const stdout = root === undefined ? result.stdout : result.stdout.replace(new RegExp(`^${root.slice(0, -1).replace(/[.*+?^\${}()|[\]\\]/g, '\\$&')}$`, 'm'), root);
  return {
    ...result,
    stdout,
    stderr: result.stderr
      .replace(/^find: ‘?cannot delete '(.+?)'’?: (.*)$/gm, 'find: cannot delete ‘$1’: $2')
      .replace(/^find: unknown predicate '(.+)'$/gm, "find: unknown predicate `$1'")
      .replace(/^find: ([^‘\n].*?): (No such file or directory|Permission denied)$/gm, (whole, path: string, why: string) => (path.startsWith('cannot delete') ? whole : `find: ‘${path}’: ${why}`)),
  };
};

const mkdir: Fix = async (args, ctx, next, fs) => {
  const result = await addTry('mkdir')(args, ctx, next, fs);
  return { ...result, stderr: result.stderr.replace(/^(mkdir: cannot create directory )'(.+)'/gm, '$1‘$2’') };
};

// A pattern of `grep`'s basic or extended syntax as the extended syntax just-bash
// takes (T318), what GNU says of it, and whether it holds a back reference.
const GREP_VALUED = new Set(['-e', '-f', '-m', '-A', '-B', '-C', '--regexp', '--file', '--max-count', '--include', '--exclude', '--exclude-dir']);
const POSIX_CLASS: Readonly<Record<string, string>> = { alpha: 'a-zA-Z', digit: '0-9', alnum: 'a-zA-Z0-9', upper: 'A-Z', lower: 'a-z', space: ' \\t\\n\\r\\f\\v', blank: ' \\t', punct: '!-\\/:-@\\[-`{-~', print: ' -~', graph: '!-~', cntrl: '\\x00-\\x1f\\x7f', xdigit: '0-9A-Fa-f' };

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
async function jsGrep(patterns: readonly string[], flags: string, files: readonly string[], ctx: Context, fs: TerminalFs): Promise<Output> {
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

const grep: Fix = async (args, ctx, next, fs) => {
  if (args.includes('--help')) return next(args);
  const flags = args.filter((arg) => /^-[a-zA-Z]/.test(arg) && !GREP_VALUED.has(arg)).join('').replace(/-/g, '');
  const operandStart = args.findIndex((arg, at) => !isOption(arg) && !GREP_VALUED.has(args[at - 1] ?? ''));
  const given = args.flatMap((arg, at) => (args[at - 1] === '-e' || args[at - 1] === '--regexp' ? [at] : []));
  const patternAt = given.length > 0 ? given : operandStart >= 0 ? [operandStart] : [];
  if (patternAt.length === 0) return failed(`Usage: grep [OPTION]... PATTERNS [FILE]...\n${tryHelp('grep')}`, 2);
  const files = args.filter((arg, at) => !isOption(arg) && !GREP_VALUED.has(args[at - 1] ?? '') && !patternAt.includes(at));
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
  if (!literal && (references || perl || named) && !recursive) {
    const result = await jsGrep(js, flags, files, ctx, fs);
    return { ...result, stderr: `${warnings}${result.stderr}` };
  }
  if (recursive) {
    const gone: string[] = [];
    for (const file of files) if (!(await fs.exists(fs.resolvePath(ctx.cwd, file)))) gone.push(file);
    if (gone.length > 0 && gone.length === files.length) return failed(gone.map((file) => `grep: ${file}: No such file or directory\n`).join(''), 2);
  }
  const result = await next(basic && !literal ? ['-E', ...list.filter((arg) => arg !== '-G')] : list);
  // An error makes its status 2, whatever else it found.
  const errored = /^grep: .+: (?:Is a directory|No such file or directory|Permission denied)$/m.test(result.stderr);
  return { ...result, stderr: `${warnings}${result.stderr}`, exitCode: errored && !flags.includes('q') ? 2 : result.exitCode };
};

// `awk`: what can be done around just-bash's. `-v` and an operand `NAME=value`
// reach the built-in variables by the program; `length` alone; `RS` by the input;
// GNU's words and statuses. The rest of its language is in research R25 (T319).
const AWK_VALUED = new Set(['-F', '-v', '-f', '--field-separator', '--assign', '--file']);
const AWK_USAGE = 'Usage: awk [POSIX or GNU style options] -f progfile [--] file ...\nUsage: awk [POSIX or GNU style options] [--] \'program\' file ...\n';
const awkString = (value: string) => `"${value.replace(/["]/g, '\\"')}"`;

const awk: Fix = async (args, ctx, next, fs) => {
  if (args.includes('--help')) return next(args);
  if (args.length === 0) return failed(AWK_USAGE, 2);
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
  const assigned = set.map((each) => {
    const at = each.indexOf('=');
    return `${each.slice(0, at)}=${awkString(each.slice(at + 1))}`;
  });
  const records = /\bRS\s*=\s*"((?:[^"\\]|\\.)*)"/.exec(`${assigned.join(';')};${text}`);
  const body = text.replace(/("(?:[^"\\]|\\.)*")|\blength\b(?!\s*\()/g, (whole, quoted?: string) => quoted ?? 'length($0)').replace(/("(?:[^"\\]|\\.)*")|(?<![\w$])int\(/g, (whole, quoted?: string) => quoted ?? '__cvint(');
  list[program] = `${assigned.length > 0 ? `BEGIN{${assigned.join(';')}}\n` : ''}${body}${/__cvint\(/.test(body) ? '\nfunction __cvint(x){x=x+0;return x<0?-__cvfl(-x):__cvfl(x)}\nfunction __cvfl(x){return x-(x%1)}' : ''}`;
  let input: string | undefined;
  const operands = list.slice(program + 1).filter((arg) => !isOption(arg));
  if (records !== null && operands.length <= 1) {
    const separator = records[1]!;
    let source: string | null = operands.length === 0 ? new TextDecoder().decode(inputBytes(ctx)) : await fs.readFile(fs.resolvePath(ctx.cwd, operands[0]!)).catch(() => null);
    if (source !== null && (separator === '' || separator.length === 1) && separator !== '\n') {
      source = separator === '' ? `${source.replace(/^\n+|\n+$/g, '').replace(/\n{2,}/g, '\u0005').replace(/\n/g, ' ').replace(/\u0005/g, '\n')}\n` : `${source.replace(/\n$/, '').split(separator).join('\n')}\n`;
      input = source;
      if (operands.length === 1) list.splice(list.lastIndexOf(operands[0]!), 1);
    }
  }
  const result = await next(list, input);
  const missing = /^awk: (.+): No such file or directory$/m.exec(result.stderr);
  if (missing !== null) return { ...result, stderr: `awk: fatal: cannot open file \`${missing[1]!}' for reading: No such file or directory\n`, exitCode: 2 };
  const parse = /^awk: (?:Expected|Unexpected) .* at line \d+:(\d+)$/m.exec(result.stderr);
  if (parse !== null) {
    const ended = /got EOF/.test(result.stderr);
    return { ...result, stderr: `awk: cmd. line:1: ${text}\nawk: cmd. line:1: ${' '.repeat(Math.max(0, Number(parse[1]) - 1))}^ ${ended ? 'unexpected newline or end of string' : 'syntax error'}\n`, exitCode: 1 };
  }
  return result;
};

// `wc` of standard input with several counts: GNU's 7 columns.
const wc: Fix = async (args, ctx, next, fs) => {
  const result = await addTry('wc')(args, ctx, next, fs);
  const operands = args.filter((arg) => !isOption(arg));
  const counts = args.filter((arg) => /^-[a-zA-Z]/.test(arg)).join('').replace(/-/g, '').length;
  if (result.exitCode !== 0 || counts === 1 || (operands.length > 0 && !operands.every((arg) => arg === '-'))) return result;
  return { ...result, stdout: result.stdout.replace(/\d+/g, (count) => count.padStart(7)).replace(/^\s*(\d+)/, (whole) => whole) };
};

// `cut`'s list is in the line's order, whatever its order when typed.
const cutList = (list: string) => {
  const parts = list.split(',');
  const start = (part: string) => Number(/^\d+/.exec(part)?.[0] ?? 1);
  return parts.every((part) => /^\d*-?\d*$/.test(part)) ? [...parts].sort((a, b) => start(a) - start(b)).join(',') : list;
};

const cut: Fix = async (args, ctx, next, fs) => {
  if (args.at(-1) === '-f' || args.at(-1) === '-b' || args.at(-1) === '-c' || args.at(-1) === '-d') return usageError('cut', `option requires an argument -- '${args.at(-1)!.slice(1)}'`);
  const delimiter = args.find((arg, at) => (args[at - 1] === '-d' ? true : arg.startsWith('-d') && arg.length > 3));
  if (delimiter !== undefined && (delimiter.startsWith('-d') ? delimiter.slice(2) : delimiter).length > 1) return usageError('cut', 'the delimiter must be a single character');
  const list = args.map((arg, at) => {
    if (/^-[fbc]$/.test(args[at - 1] ?? '')) return cutList(arg);
    return /^-[fbc][\d,-]+$/.test(arg) ? `${arg.slice(0, 2)}${cutList(arg.slice(2))}` : arg;
  });
  return addTry('cut')(list, ctx, next, fs);
};

// `seq`: GNU's long options and words, and its digits from FIRST and INCREMENT.
const SEQ_VALUED = new Set(['-s', '-f', '--separator', '--format']);
const seq: Fix = async (args, ctx, next, fs) => {
  if (args.includes('--help')) return next(args);
  const list = args.flatMap((arg) => (arg.startsWith('--separator=') ? ['-s', arg.slice(12)] : arg.startsWith('--format=') ? ['-f', arg.slice(9)] : arg === '--equal-width' ? ['-w'] : [arg]));
  const operands = list.filter((arg, at) => !/^-[a-zA-Z]/.test(arg) && !SEQ_VALUED.has(list[at - 1] ?? ''));
  if (operands.length > 3) return usageError('seq', `extra operand ‘${operands[3]!}’`);
  const bad = operands.find((arg) => !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(arg));
  if (bad !== undefined) return usageError('seq', `invalid floating point argument: ‘${bad}’`);
  if (operands.length === 3 && Number(operands[1]) === 0) return usageError('seq', `invalid Zero increment value: ‘${operands[1]!}’`);
  const others = operands.slice(0, -1);
  const last = operands.at(-1);
  if (last !== undefined && last.includes('.') && others.every((arg) => !arg.includes('.'))) list[list.lastIndexOf(last)] = String(Math.floor(Number(last)));
  return addTry('seq')(list, ctx, next, fs);
};

// `tr`: a class it doesn't know, `[x*]` in the second set, and GNU's words.
const tr: Fix = async (args, ctx, next, fs) => {
  if (args.includes('--help')) return next(args);
  const sets = args.filter((arg) => !isOption(arg));
  const deleting = args.some((arg) => /^-[a-zA-Z]*[ds]/.test(arg));
  for (const set of sets) {
    const unknown = /\[:(\w+):\]/g.exec(set)?.[1];
    if (unknown !== undefined && !(unknown in POSIX_CLASS)) return failed(`tr: invalid character class ‘${unknown}’\n`, 1);
  }
  if (sets.length === 1 && !deleting) return failed(`tr: missing operand after ‘${sets[0]!}’\nTwo strings must be given when translating.\n${tryHelp('tr')}`, 1);
  const list = args.map((arg) => (arg === sets[1] ? arg.replace(/\[(.)\*(\d*)\]/g, (_, char: string, count: string) => char.repeat(count === '' ? 256 : Number(count))) : arg));
  return addTry('tr')(list, ctx, next, fs);
};

const basename: Fix = async (args, ctx, next, fs) => {
  if (args.includes('--help')) return next(args);
  const options = args.filter((arg) => isOption(arg));
  const operands = args.filter((arg) => !isOption(arg));
  if (options.length === 0 && operands.length > 2) return usageError('basename', `extra operand ‘${operands[2]!}’`);
  if (options.length === 0 && operands.length >= 1 && /^\/+$/.test(operands[0]!)) return { stdout: '/\n', stderr: '', exitCode: 0 };
  return addTry('basename')(args, ctx, next, fs);
};

const dirname: Fix = async (args, ctx, next, fs) => {
  const result = await addTry('dirname')(args, ctx, next, fs);
  const operands = args.filter((arg) => !isOption(arg));
  if (operands.length === 0 || result.exitCode !== 0 || args.includes('--help')) return result;
  const lines = result.stdout.split('\n');
  return { ...result, stdout: operands.map((operand, at) => (/^\/+$/.test(operand) ? '/' : lines[at])).join('\n') + '\n' };
};

const pwd: Fix = async (args, _ctx, next) => {
  const bad = args.find((arg) => isOption(arg) && arg !== '--' && !/^-[LP]+$/.test(arg));
  return bad === undefined || args.includes('--help') ? next(args) : failed(`bash: pwd: ${bad.slice(0, 2)}: invalid option\npwd: usage: pwd [-LP]\n`, 2);
};

export const GNU: Readonly<Record<string, Fix>> = {
  head,
  tail,
  uniq,
  sed,
  date,
  env,
  xargs,
  cp: copy('cp'),
  mv: copy('mv'),
  diff,
  sort,
  find,
  mkdir,
  grep,
  pwd,
  ls: addTry('ls', 2),
  awk,
  wc,
  cut,
  seq,
  tr,
  basename,
  dirname,
  ...Object.fromEntries(['rm', 'touch', 'cat', 'tee'].map((name) => [name, addTry(name)])),
};
