// Where just-bash's standard commands differ from GNU's in an option their
// own `--help` lists, or in how they word a wrong use (006 FR-017, FR-068,
// SC-014, T302, T306). Each runs in front of the command, which `next` runs.
import type { TerminalFs } from './fs.ts';
import type { ShellCommand } from './site-commands.ts';

type Context = Parameters<ShellCommand['execute']>[1];
type Output = Awaited<ReturnType<ShellCommand['execute']>>;
type Next = (args: string[]) => Promise<Output>;
export type Fix = (args: string[], ctx: Context, next: Next, fs: TerminalFs) => Promise<Output>;

const failed = (stderr: string, exitCode: number): Output => ({ stdout: '', stderr, exitCode });
const tryHelp = (name: string) => `Try '${name} --help' for more information.\n`;
const isOption = (arg: string) => arg.startsWith('-') && arg !== '-';
const quote = (word: string) => `'${word.replaceAll("'", `'\\''`)}'`;

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

const head: Fix = async (args, ctx, next, fs) => {
  const lines = countOption(args, 'n', 'lines');
  if (lines !== null && /^-\d+$/.test(lines.count)) return eachInput(lines.rest, ctx, next, ['-n', WHOLE], (bytes) => withoutLastLines(bytes, Number(lines.count.slice(1))));
  const bytes = countOption(args, 'c', 'bytes');
  if (bytes !== null && /^-\d+$/.test(bytes.count)) return eachInput(bytes.rest, ctx, next, ['-n', WHOLE], (all) => all.slice(0, Math.max(0, all.length - Number(bytes.count.slice(1)))));
  return addTry('head')(args, ctx, next, fs);
};

const tail: Fix = async (args, ctx, next, fs) => {
  const bytes = countOption(args, 'c', 'bytes');
  if (bytes !== null && /^\+?\d+$/.test(bytes.count)) {
    const from = bytes.count.startsWith('+');
    const count = Number(bytes.count);
    return eachInput(bytes.rest, ctx, next, ['-n', `+1`], (all) => (from ? all.slice(Math.max(0, count - 1)) : count === 0 ? all.slice(all.length) : all.slice(-count)));
  }
  return addTry('tail')(args, ctx, next, fs);
};

// `uniq -c`: GNU's count takes 7 columns.
const uniq: Fix = async (args, ctx, next, fs) => {
  const result = await addTry('uniq')(args, ctx, next, fs);
  if (!args.some((arg) => arg === '--count' || /^-[a-z]*c/.test(arg))) return result;
  return { ...result, stdout: result.stdout.replace(/^ *(\d+) /gm, (_, count: string) => `${count.padStart(7)} `) };
};

// `sed`'s options that take a value, so a file is told from one.
const SED_VALUED = new Set(['-e', '-f', '-l', '--expression', '--file']);

// `s…w file` as just-bash doesn't run it: it writes every line.
const WRITE_FLAG = /^((?:\d+|\$|\/[^/]*\/)?,?(?:\d+|\$|\/[^/]*\/)?s(.)(?:(?!\2).|\\.)*\2(?:(?!\2).|\\.)*\2[gip0-9]*)w +(.+)$/;

const sed: Fix = async (args, ctx, next, fs) => {
  let list = [...args];
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

// A time with no zone is UTC here, as `date` prints UTC; just-bash reads it in
// the browser's zone. `-I` is GNU's: the date alone, or to its TIMESPEC.
const ISO: Readonly<Record<string, string>> = { date: '+%F', hours: '+%FT%H+00:00', minutes: '+%FT%H:%M+00:00', seconds: '+%FT%T+00:00' };
const NO_ZONE = /^\d{4}-\d\d-\d\d[ T]\d\d:\d\d(:\d\d)?$/;

const date: Fix = async (args, ctx, next, fs) => {
  const list = args.flatMap((arg, at): string[] => {
    const iso = /^(?:-I|--iso-8601(?:=|$))(.*)$/.exec(arg);
    if (iso !== null) return [ISO[iso[1] || 'date'] ?? arg];
    if (args[at - 1] === '-d' || args[at - 1] === '--date') return [NO_ZONE.test(arg) ? `${arg} UTC` : arg];
    if (arg.startsWith('--date=') && NO_ZONE.test(arg.slice(7))) return [`${arg} UTC`];
    return [arg];
  });
  return addTry('date')(list, ctx, next, fs);
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
  // GNU runs the command once with no input, unless told not to.
  if (new TextDecoder().decode(inputBytes(ctx)).trim() === '' && !list.some((arg) => arg === '-r' || arg === '--no-run-if-empty' || arg === '-I')) {
    return ctx.exec!((command.length === 0 ? ['echo'] : command).map(quote).join(' '), { cwd: ctx.cwd, env: Object.fromEntries(ctx.env) }).then(notFound(command));
  }
  return next([...list, ...command]).then(notFound(command));
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
    const result = await addTry(name)(args, ctx, next, fs);
    // `-v` names a path as typed, where just-bash's are absolute.
    if (operands.at(-1)?.startsWith('/') === true || result.stdout === '') return result;
    return { ...result, stdout: result.stdout.replaceAll(` -> '${ctx.cwd === '/' ? '' : ctx.cwd}/`, " -> '") };
  };

const diff: Fix = async (args, ctx, next, fs) => {
  if (args.includes('--help')) return next(args);
  const operands = args.filter((arg) => !isOption(arg));
  if (operands.length < 2) return failed(`diff: missing operand after ‘${operands[0] ?? 'diff'}’\ndiff: ${tryHelp('diff')}`, 2);
  const missing: string[] = [];
  for (const operand of operands.slice(0, 2)) if (operand !== '-' && !(await fs.exists(fs.resolvePath(ctx.cwd, operand)))) missing.push(`diff: ${operand}: No such file or directory\n`);
  if (missing.length > 0) return failed(missing.join(''), 2);
  return addTry('diff')(args, ctx, next, fs);
};

const sort: Fix = async (args, ctx, next, fs) => {
  const result = await addTry('sort', 2)(args, ctx, next, fs);
  const missing = /^sort: (.+): No such file or directory\n/.exec(result.stderr);
  return missing === null ? result : { ...result, stderr: `sort: cannot read: ${missing[1]!}: No such file or directory\n`, exitCode: 2 };
};

const find: Fix = async (args, _ctx, next) => {
  const result = await next(args);
  return { ...result, stderr: result.stderr.replace(/^find: ([^‘\n].*?): (No such file or directory|Permission denied)$/gm, 'find: ‘$1’: $2') };
};

const mkdir: Fix = async (args, ctx, next, fs) => {
  const result = await addTry('mkdir')(args, ctx, next, fs);
  return { ...result, stderr: result.stderr.replace(/^(mkdir: cannot create directory )'(.+)'/gm, '$1‘$2’') };
};

const grep: Fix = async (args, _ctx, next) => {
  const result = await next(args);
  return result.stderr === 'grep: missing pattern\n' ? failed(`Usage: grep [OPTION]... PATTERNS [FILE]...\n${tryHelp('grep')}`, 2) : result;
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
  ...Object.fromEntries(['rm', 'touch', 'cut', 'tr', 'seq', 'basename', 'dirname', 'cat', 'wc', 'tee'].map((name) => [name, addTry(name)])),
};
