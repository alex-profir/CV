// The site's commands as commands of the shell (006 research R29): one
// just-bash custom command per row of the command table and per alias,
// printing the text of its block, and wrappers of `cat`, `ls` and `jq` that
// add what the site shows for their output. Each records the block it
// printed with the exact text, so the interface can draw that text as the
// block where it reaches the screen unchanged (FR-009, FR-015, FR-047). A
// recording is made only here, from what the site printed, never from typed
// or piped text (FR-018).
import { defineCommand } from 'just-bash/browser';
import { command, pathLine } from '../engine/block.ts';
import type { Block, Effect, Node, Tone, VimFile } from '../engine/block.ts';
import { COMMANDS, CV_PIPE, CV_PRINT, SITE_WORDS, usage } from '../engine/commands.ts';
import type { CommandName, RunContext, SiteRun } from '../engine/commands.ts';
import type { File, FsNode } from '../engine/files.ts';
import { printJson } from '../engine/json.ts';
import { fill } from '../../../site-text.ts';
import { CLEARED, fileText, HOME, MARK } from './fs.ts';
import { GNU } from './gnu.ts';
import type { TerminalFs } from './fs.ts';
import type { Limit, Recorded } from './protocol.ts';
import { helpText, MISSING_HELP, SHELL_BUILTINS, STANDARD_COMMANDS } from './standard.ts';

export type ShellCommand = ReturnType<typeof defineCommand>;
type Context = Parameters<ShellCommand['execute']>[1];
type Output = Awaited<ReturnType<ShellCommand['execute']>>;

// The names the site's commands run under in the shell where a builtin of
// the same name would win: the adapter renames the typed word (research R29).
export const RENAMED: Readonly<Record<string, string>> = { help: `${MARK}help` };

// What one line's run collects, and what it was sent with.
export type RunRecord = {
  line: string;
  history: readonly string[];
  shell: 'desktop' | 'mobile';
  recorded: Recorded[];
  effects: Effect[];
  // The pipe the vim view's status line shows, when not the line itself.
  pipe: string | null;
  // How many functions now running have their output going into a pipe.
  pipedFunctions: number;
  // Set while `help <builtin>` asks just-bash's own `help` for its text.
  builtinHelp: boolean;
  // A limit a command met without just-bash stopping the line (T315).
  stopped: Limit | null;
};

export type SiteShell = {
  context: RunContext;
  fs: TerminalFs;
  run: () => RunRecord;
};

// Set by the adapter on a command whose output goes into a pipe: what it
// prints there is text, never a block (research R29).
export const PIPED = `${MARK}PIPED`;

// Set by the adapter on a site command typed in another case, to the word as
// typed: replies name it (FR-017).
export const TYPED = `${MARK}TYPED`;

// The commands that print otherwise when their output doesn't reach the
// screen: only these carry PIPED, so no other can show it (T299).
export const SCREEN_COMMANDS: ReadonlySet<string> = new Set([...SITE_WORDS, 'cat', 'ls', 'jq']);

// Standard input as text: just-bash hands it over as latin1 bytes.
const decode = (bytes: Context['stdin']) => new TextDecoder().decode(Uint8Array.from(bytes as unknown as string, (character) => character.charCodeAt(0)));

// A command's stdout as text: a bundled command may give it as latin1 bytes.
const stdoutText = (result: Output) => (result.stdoutKind === 'bytes' || result.stdoutEncoding === 'binary' ? decode(result.stdout as unknown as Context['stdin']) : result.stdout);

const parentOf = (path: string) => path.slice(0, path.lastIndexOf('/')) || '/';
const nameOf = (path: string) => path.slice(path.lastIndexOf('/') + 1);

// A path as the site's controls write it: `~/work/acme` under home.
export const shownPath = (path: string) => (path === HOME ? '~' : path.startsWith(`${HOME}/`) ? `~${path.slice(HOME.length)}` : path);

// Every protected file by its absolute path.
function filesOf(context: RunContext): Map<string, File> {
  const files = new Map<string, File>();
  const walk = (node: FsNode, at: string) => {
    if (node.kind === 'file') files.set(at, node);
    else for (const child of node.children) walk(child, `${at}/${child.name}`);
  };
  for (const child of context.fs.children) walk(child, `${HOME}/${child.name}`);
  return files;
}

// The vim view's effect: whether the text is JSON is settled here, where the
// printer is, and stays for the view's life (research R47).
const vimEffect = (file: VimFile, pipe: string | null, text: string): Effect => ({ kind: 'vim', file, pipe, text, type: 'error' in printJson(text) ? 'text' : 'json' });

const ok = (stdout = '', stderr = '', exitCode = 0): Output => ({ stdout, stderr, exitCode });

// `help`'s standard group: the standard commands and builtins the table
// doesn't list, in name order (research R32).
const SITE = new Set<string>(SITE_WORDS);
const BUILTINS = new Set<string>(SHELL_BUILTINS);
export const STANDARD_GROUP: readonly string[] = [...new Set<string>([...STANDARD_COMMANDS, ...SHELL_BUILTINS])].filter((name) => !SITE.has(name)).sort();

export function siteCommands(shell: SiteShell): ShellCommand[] {
  const files = filesOf(shell.context);
  const piped = (ctx: Context) => ctx.env.get(PIPED) === '1' || shell.run().pipedFunctions > 0;
  const runContext = (ctx: Context): RunContext => {
    const run = shell.run();
    return { ...shell.context, cwd: ctx.cwd, history: run.history, shell: run.shell, standard: STANDARD_GROUP };
  };

  // Prints a site command's run, records its block and keeps its effect.
  const emit = (ctx: Context, result: SiteRun): Output => {
    const run = shell.run();
    // `clear` empties the screen, so only where its output would reach it
    // (T303); what came before it goes, at its place in the line (T298).
    if (result.effect?.kind === 'clear') {
      if (piped(ctx)) return ok();
      run.recorded.length = 0;
      run.effects.push(result.effect);
      return ok(CLEARED, CLEARED);
    }
    const stdout = result.text === '' ? '' : `${result.text}\n`;
    if (result.block !== null && stdout !== '' && !piped(ctx)) run.recorded.push({ text: stdout, block: result.block });
    if (result.effect !== undefined) run.effects.push(result.effect);
    return ok(stdout, result.stderr ?? '', result.status);
  };

  const usageOf = (word: string, name: CommandName) => {
    const result = usage(word, shell.context, name);
    return ok('', result.stderr, result.status);
  };

  // The word a command was run by, as typed.
  const typedAs = (word: string, ctx: Context) => ctx.env.get(TYPED) ?? word;

  // `help <name>` for a standard command is its `--help`, for a builtin
  // the shell's own help (research R32).
  const standardHelp = (args: readonly string[], ctx: Context): Promise<Output> | null => {
    const name = args.length === 1 ? args[0]! : null;
    if (name === null || SITE.has(name.toLowerCase()) || !STANDARD_GROUP.includes(name)) return null;
    const run = shell.run();
    const builtin = BUILTINS.has(name) && !STANDARD_COMMANDS.includes(name as never);
    run.builtinHelp = builtin;
    return ctx.exec!(builtin ? `builtin help ${name}` : `${name} --help`, { cwd: ctx.cwd }).finally(() => {
      run.builtinHelp = false;
    });
  };

  const rows = COMMANDS.filter((row) => row.run !== undefined).flatMap((row) =>
    [row.name, ...row.aliases].map((word) =>
      defineCommand(RENAMED[word] ?? word, async (args, ctx) => {
        const typed = typedAs(word, ctx);
        // A wrong option gets bash's error (FR-017).
        const wrong = row.name === 'history' ? args.find((arg) => /^-./.test(arg) && arg !== '-c') : undefined;
        if (wrong !== undefined) return ok('', `bash: history: ${wrong.slice(0, 2)}: invalid option\nhistory: usage: history [-c] [-d offset] [n] or history -anrw [filename] or history -ps arg [arg...]\n`, 2);
        return (row.name === 'help' ? standardHelp(args, ctx) : null) ?? emit(ctx, row.run!(args, runContext(ctx), typed));
      }),
    ),
  );

  // `vim <path>` or `vim -` with input (FR-058).
  const vim = defineCommand('vim', async (args, ctx) => {
    const run = shell.run();
    const { replies } = shell.context.text.terminal;
    const word = typedAs('vim', ctx);
    if (args.length !== 1) return usageOf(word, 'vim');
    if (args[0] === '-') {
      const input = decode(ctx.stdin);
      if (input === '') return usageOf(word, 'vim');
      const file = { name: shell.context.text.terminal.vim.noName, path: null, readonly: false, new: false, ...(input === '\n' ? { blank: true } : {}) };
      run.effects.push(vimEffect(file, run.pipe ?? run.line, input.replace(/\n$/, '')));
      return ok();
    }
    const typed = args[0]!;
    const path = shell.fs.canonical(ctx.fs.resolvePath(ctx.cwd, typed));
    const stat = await shell.fs.stat(path).catch(() => null);
    // A path with nothing there opens empty, as vim does (research R49).
    if (stat === null) {
      run.effects.push(vimEffect({ name: shownPath(typed), path, readonly: false, new: true }, null, ''));
      return ok();
    }
    if (stat.isDirectory) return ok('', `${fill(replies.isFolder, { path: typed, command: pathLine('ls', typed) })}\n`, 1);
    const content = await shell.fs.readFile(path);
    run.effects.push(vimEffect({ name: shownPath(typed), path, readonly: shell.fs.isProtected(path), new: false, ...(content === '\n' ? { blank: true } : {}) }, null, content.replace(/\n$/, '')));
    return ok();
  });

  // `cv`: `cat cv.json | jq | vim -` from the home folder (FR-059).
  const cv = defineCommand('cv', async (args, ctx) => {
    if (args.length > 0) return usageOf(typedAs('cv', ctx), 'cv');
    const run = shell.run();
    // Going to a pipe, a file or a `$(…)`: the JSON, and no view (T303).
    if (piped(ctx)) return ctx.exec!(CV_PRINT, { cwd: HOME, env: { [PIPED]: '1' } });
    run.pipe = CV_PIPE;
    try {
      return await ctx.exec!(CV_PIPE, { cwd: HOME });
    } finally {
      run.pipe = null;
    }
  });

  // just-bash's `cat` on a folder says "No such file or directory"; bash's
  // says "Is a directory" (research G16).
  const folderMessage = async (result: Output, ctx: Context): Promise<Output> => {
    if (result.exitCode === 0 || result.stderr === '') return result;
    const lines = await Promise.all(
      result.stderr.split('\n').map(async (entry) => {
        const typed = /^cat: (.+): No such file or directory$/.exec(entry)?.[1];
        if (typed === undefined) return entry;
        const stat = await shell.fs.stat(shell.fs.canonical(ctx.fs.resolvePath(ctx.cwd, typed))).catch(() => null);
        return stat?.isDirectory === true ? `cat: ${typed}: Is a directory` : entry;
      }),
    );
    return { ...result, stderr: lines.join('\n') };
  };

  // just-bash's `sed -i` and `tee` say "No such file or directory" for any
  // write the file system refuses; bash's say "Permission denied" (research
  // G5, G19).
  const deniedMessage = (name: 'sed' | 'tee') =>
    defineCommand(name, async (args, ctx) => {
      const result = await ctx.origCommand!(args);
      if (result.exitCode === 0 || result.stderr === '') return result;
      const lines = await Promise.all(
        result.stderr.split('\n').map(async (entry) => {
          const typed = new RegExp(`^${name}: (.+): No such file or directory$`).exec(entry)?.[1];
          if (typed === undefined) return entry;
          // Refused, on a file `sed` read or in a folder `tee` can write
          // to: a missing one is still "No such file or directory".
          const path = shell.fs.canonical(ctx.fs.resolvePath(ctx.cwd, typed));
          return shell.fs.refusesWrite(path) && (await shell.fs.exists(name === 'sed' ? path : parentOf(path))) ? `${name}: ${typed}: Permission denied` : entry;
        }),
      );
      return { ...result, stderr: lines.join('\n') };
    });

  // just-bash's `cp` and `mv` name only the source of a refused copy or
  // move (`cp: cannot copy 'skills': Permission denied`); GNU's name where
  // it was going too, so the protected path is named as typed (FR-049,
  // research G20).
  const destinationMessage = (name: 'cp' | 'mv') =>
    defineCommand(name, async (args, ctx) => {
      const result = await ctx.origCommand!(args);
      const operands = args.filter((arg) => !arg.startsWith('-'));
      if (result.exitCode === 0 || operands.length < 2 || args.some((arg) => arg.startsWith('-t') || arg.startsWith('--target'))) return result;
      const destination = operands[operands.length - 1]!;
      const into = (await shell.fs.stat(shell.fs.canonical(ctx.fs.resolvePath(ctx.cwd, destination))).catch(() => null))?.isDirectory === true;
      const pattern = new RegExp(`^${name}: cannot (?:copy|move) '(.+)': Permission denied$`);
      const lines = await Promise.all(
        result.stderr.split('\n').map(async (entry) => {
          const source = pattern.exec(entry)?.[1];
          if (source === undefined) return entry;
          const target = into ? `${destination.replace(/\/+$/, '')}/${nameOf(source.replace(/\/+$/, ''))}` : destination;
          if (name === 'mv') return `mv: cannot move '${source}' to '${target}': Permission denied`;
          const folder = (await shell.fs.stat(shell.fs.canonical(ctx.fs.resolvePath(ctx.cwd, source))).catch(() => null))?.isDirectory === true;
          return `cp: cannot create ${folder ? 'directory' : 'regular file'} '${target}': Permission denied`;
        }),
      );
      return { ...result, stderr: lines.join('\n') };
    });

  // `cat`: each protected file it prints whole is recorded as its block
  // (FR-047).
  const cat = defineCommand('cat', async (args, ctx) => {
    const result = await folderMessage(await ctx.origCommand!(args), ctx);
    if (result.exitCode !== 0 || args.length === 0 || args.some((arg) => arg.startsWith('-'))) return result;
    const printed = args.map((arg) => {
      const path = shell.fs.canonical(ctx.fs.resolvePath(ctx.cwd, arg));
      const file = files.get(path);
      return file === undefined ? null : { name: nameOf(path), file, text: fileText(file) };
    });
    if (printed.some((entry) => entry === null) || printed.map((entry) => entry!.text).join('') !== stdoutText(result)) return result;
    const run = shell.run();
    if (!piped(ctx)) for (const entry of printed) run.recorded.push({ text: entry!.text, block: entry!.file.show() });
    return result;
  });

  // `ls`: a listing whose names are controls, a folder running `ls` on it
  // and a file `cat`, in the design's order for the home folder (FR-043,
  // FR-050). Plain, it draws columns; with any option or several paths, each
  // line as GNU's text has it (T327).
  // `ls -l`: just-bash gives every entry `user user` and its own modes
  // (research G7); the owner is `root` for a protected entry, which is read
  // only, and `guest` for the visitor's (FR-049, research R28). A folder has
  // GNU's size and links, and each column is as wide as its widest (T329).
  // Mode, links, owner, group, size, date, name.
  const LONG_LINE = /^([-dl])([-rwx]{9}) +(\d+) (\S+) +(\S+) +(\S+) (\S+ +\d+ +(?:\d\d:\d\d|\d{4})) (.+)$/;
  const CONTROL = (path: string, label: string, folder: boolean) => (folder ? command(pathLine('ls', shownPath(path)), 'inline', { label, req: 'ls', tone: 'folder' }) : command(pathLine('cat', shownPath(path)), 'inline', { label, req: 'ls' }));
  const statOf = (path: string) => shell.fs.stat(path).catch(() => null);
  const under = (folder: string, name: string) => `${folder === '/' ? '' : folder}/${name}`;
  const textNode = (value: string, tone?: Tone): Node => ({ kind: 'text', text: value, stream: 'stdout', ...(tone === undefined ? {} : { tone }) });

  // What a line of a listing names, its name with no `-F` mark, from `folder`.
  const named = async (shown: string, folder: string, ctx: Context) => {
    for (const name of [shown, shown.replace(/[/*@=|]$/, '')]) {
      if (name === '.' || name === '..') return null;
      const path = shell.fs.canonical(ctx.fs.resolvePath(folder, name));
      const stat = await statOf(path);
      if (stat !== null) return { path, folder: stat.isDirectory };
    }
    return null;
  };

  // Each section of a listing: its lines, and the folder its names are in. A
  // `path:` line starts one; the file operands of several paths come first.
  const sections = (lines: readonly string[], ctx: Context, inside: string) => {
    const found: { header: number; lines: number[]; folder: string }[] = [{ header: -1, lines: [], folder: inside }];
    lines.forEach((entry, at) => {
      const header = /^(.+):$/.exec(entry);
      if (header !== null && (at === 0 || lines[at - 1] === '')) found.push({ header: at, lines: [], folder: shell.fs.canonical(ctx.fs.resolvePath(ctx.cwd, header[1]!)) });
      else if (entry !== '' && !/^total \S+$/.test(entry)) found.at(-1)!.lines.push(at);
    });
    return found;
  };

  const longLines = async (lines: string[], part: { lines: number[]; folder: string }, ctx: Context) => {
    const entries = await Promise.all(
      part.lines.map(async (at) => {
        const match = LONG_LINE.exec(lines[at]!);
        if (match === null) return null;
        const [, kind, mode, links, , , size, date, name] = match;
        const path = shell.fs.canonical(ctx.fs.resolvePath(part.folder, name!));
        const folder = kind === 'd';
        const info = shell.fs.info(path, folder ? 'folder' : 'file');
        let inner = 0;
        if (folder) for (const child of await shell.fs.readdir(path).catch(() => [] as string[])) if ((await statOf(under(path, child)))?.isDirectory === true) inner += 1;
        return { at, kind: kind!, mode: info.protected ? (folder ? 'r-xr-xr-x' : 'r--r--r--') : mode!, links: folder ? String(inner + 2) : links!, owner: info.owner as string, size: folder ? '4096' : size!, date: date!, name: name!, path, folder };
      }),
    );
    const known = entries.filter((entry) => entry !== null);
    const newest = known.find((entry) => entry.name !== '.' && entry.name !== '..')?.date;
    const widest = (of: (entry: (typeof known)[number]) => string) => Math.max(0, ...known.map((entry) => of(entry).length));
    const [linkWidth, ownerWidth, sizeWidth] = [widest((entry) => entry.links), widest((entry) => entry.owner), widest((entry) => entry.size)];
    return known.map((entry) => {
      const date = (entry.name === '.' || entry.name === '..') && newest !== undefined ? newest : entry.date;
      const owners = `${entry.owner.padEnd(ownerWidth)} ${entry.owner.padEnd(ownerWidth)}`;
      const lead = `${entry.kind}${entry.mode} ${entry.links.padStart(linkWidth)} `;
      const tail = ` ${entry.size.padStart(sizeWidth)} ${date} `;
      lines[entry.at] = `${lead}${owners}${tail}${entry.name}`;
      return { ...entry, lead, owners, tail };
    });
  };

  // GNU's `-m` and `-C`, which just-bash doesn't have, over its one name a line.
  const WIDTH = 80;
  const commas = (names: readonly string[]) => {
    const rows: string[] = [];
    let row = '';
    names.forEach((name, at) => {
      const item = at === names.length - 1 ? name : `${name},`;
      if (row !== '' && row.length + 1 + item.length > WIDTH - 1) {
        rows.push(row);
        row = item;
      } else row = row === '' ? item : `${row} ${item}`;
    });
    return row === '' ? [] : [...rows, row];
  };
  const inColumns = (names: readonly string[]) => {
    for (let count = names.length; count > 1; count -= 1) {
      const height = Math.ceil(names.length / count);
      const columns = Array.from({ length: count }, (_, column) => names.slice(column * height, (column + 1) * height));
      const widths = columns.map((column) => Math.max(0, ...column.map((name) => name.length)));
      if (widths.reduce((sum, width) => sum + width + 2, -2) >= WIDTH) continue;
      return Array.from({ length: height }, (_, row) => {
        let text = '';
        let from = 0;
        let to = 0;
        columns.forEach((column, at) => {
          if (column[row] === undefined) return;
          // Tabs where they fit, as GNU does.
          while (from < to) {
            const tab = Math.floor(to / 8) > Math.floor((from + 1) / 8);
            text += tab ? '\t' : ' ';
            from = tab ? from + 8 - (from % 8) : from + 1;
          }
          text += column[row];
          from += column[row]!.length;
          to += widths[at]! + 2;
        });
        return text;
      });
    }
    return [...names];
  };

  const ls = defineCommand('ls', async (args, ctx) => {
    if (args.includes('--help')) {
      const help = await ctx.origCommand!(args);
      return { ...help, stdout: help.stdout.replace(/^(\s+--help)/m, '  -C                   list entries by columns\n      --color[=WHEN]   colors never show here; WHEN is always, auto or never\n  -m                   fill width with a comma separated list of entries\n  -p                   append / indicator to directories\n$1') };
    }
    // The options just-bash lacks: taken out, and done to its text below.
    const end = args.indexOf('--');
    const options = (end < 0 ? args : args.slice(0, end)).filter((arg) => arg.startsWith('-') && arg !== '-');
    const has = (letter: string) => options.some((arg) => !arg.startsWith('--') && arg.includes(letter));
    const [slashes, columns, comma] = [has('p'), has('C'), has('m')];
    const list = args.flatMap((arg, at) => {
      if (end >= 0 && at >= end) return [arg];
      if (/^--colou?r(=.*)?$/.test(arg)) return [];
      if (!arg.startsWith('-') || arg.startsWith('--') || arg === '-') return [arg];
      const left = arg.slice(1).replace(/[pCm]/g, '');
      return left === '' ? [] : [`-${left}`];
    });
    const result = await ctx.origCommand!(list);
    const flags = options.filter((arg) => !arg.startsWith('--')).join('');
    const paths = end < 0 ? list.filter((arg) => !arg.startsWith('-')) : [...list.slice(0, list.indexOf('--')).filter((arg) => !arg.startsWith('-')), ...list.slice(list.indexOf('--') + 1)];
    const long = flags.includes('l');
    const plain = list.length === paths.length && options.length === 0 && paths.length <= 1;
    if (result.stdout === '') return result;
    const target = paths.length === 1 ? shell.fs.canonical(ctx.fs.resolvePath(ctx.cwd, paths[0]!)) : ctx.cwd;
    const stat = await statOf(target);
    if (stat === null) return result;
    const inside = paths.length === 1 && stat.isDirectory && !flags.includes('d') ? target : ctx.cwd;

    if (plain && !piped(ctx) && result.exitCode === 0) {
      const names = stdoutText(result).split('\n').filter((name) => name !== '');
      const folder = stat.isDirectory ? target : parentOf(target);
      const order = stat.isDirectory ? (await shell.fs.readdir(target)).filter((name) => names.includes(name)) : [nameOf(target)];
      if (order.length === names.length) {
        const cells: Node[] = [];
        for (const name of order) {
          const at = under(folder, name);
          const isFolder = (await statOf(at))?.isDirectory === true;
          cells.push(CONTROL(at, isFolder ? `${name}/` : name, isFolder));
        }
        shell.run().recorded.push({ text: stdoutText(result), block: [{ kind: 'columns', cells, req: 'ls' }] });
        return result;
      }
    }

    const lines = stdoutText(result).split('\n');
    const parts = sections(lines, ctx, inside);
    const rows = new Map<number, Awaited<ReturnType<typeof longLines>>[number]>();
    if (long) for (const part of parts) for (const row of await longLines(lines, part, ctx)) rows.set(row.at, row);
    if (slashes && !long) for (const part of parts) for (const at of part.lines) if ((await named(lines[at]!, part.folder, ctx))?.folder === true && !lines[at]!.endsWith('/')) lines[at] += '/';
    if ((comma || columns) && !long) {
      const out: string[] = [];
      const skip = new Set(parts.flatMap((part) => part.lines));
      const firstOf = new Map(parts.filter((part) => part.lines.length > 0).map((part) => [part.lines[0]!, part] as const));
      lines.forEach((entry, at) => {
        const part = firstOf.get(at);
        if (part !== undefined) out.push(...(comma ? commas : inColumns)(part.lines.map((index) => lines[index]!)));
        else if (!skip.has(at)) out.push(entry);
      });
      const stdout = out.join('\n');
      return { ...result, stdout, stdoutKind: undefined, stdoutEncoding: undefined } as Output;
    }
    const stdout = lines.join('\n');
    const changed = long || slashes;
    if (piped(ctx)) return changed ? ({ ...result, stdout, stdoutKind: undefined, stdoutEncoding: undefined } as Output) : result;

    const block: Node[] = [];
    const folderOf = new Map(parts.flatMap((part) => part.lines.map((at) => [at, part.folder] as const)));
    for (const [at, entry] of lines.entries()) {
      if (at === lines.length - 1 && entry === '') break;
      const folder = folderOf.get(at);
      if (long) {
        const row = rows.get(at);
        if (row === undefined || row.name === '.' || row.name === '..') block.push({ kind: 'line', children: [textNode(entry, 'dim')] });
        else block.push({ kind: 'line', children: [textNode(row.lead, 'dim'), textNode(row.owners, row.owner === 'guest' ? 'secondary' : 'dim'), textNode(row.tail, 'dim'), CONTROL(row.path, row.folder ? `${row.name}/` : row.name, row.folder)] });
        continue;
      }
      const name = folder === undefined ? null : await named(entry, folder, ctx);
      block.push({ kind: 'line', children: [name === null ? textNode(entry) : CONTROL(name.path, entry, name.folder)] });
    }
    shell.run().recorded.push({ text: stdout, block });
    return changed ? ({ ...result, stdout, stdoutKind: undefined, stdoutEncoding: undefined } as Output) : result;
  });

  // `jq`: what it printed, when it is one JSON value, as JSON rows (R31).
  const jq = defineCommand('jq', async (args, ctx) => {
    const result = await ctx.origCommand!(args);
    // jq never ends where just-bash runs out of room (T315, research R25).
    if (result.exitCode !== 0 && /too many iterations|limit exceeded|Maximum call stack/.test(result.stderr)) {
      shell.run().stopped = 'time';
      return ok('', '', result.exitCode);
    }
    if (result.exitCode !== 0 || result.stdout === '' || piped(ctx)) return result;
    const printed = stdoutText(result);
    const json = printJson(printed);
    if (!('error' in json)) shell.run().recorded.push({ text: printed, block: [{ kind: 'json', rows: json.rows }] });
    return result;
  });


  // `rm -r` walks its targets itself, deepest first: the visitor's entries
  // go, and each protected file left says why, once. just-bash's refuses
  // the whole tree, in silence under -f (research R28). Without -r, and for
  // `--help`, it is just-bash's `rm` (research G18).
  const rm = defineCommand('rm', async (args, ctx) => {
    if (args.includes('--help')) return ok(helpText('rm', MISSING_HELP.rm!));
    const end = args.indexOf('--');
    const options = (end < 0 ? args : args.slice(0, end)).filter((arg) => arg.startsWith('-') && arg !== '-');
    const has = (short: string, long: string) => options.some((arg) => arg === long || (!arg.startsWith('--') && arg.includes(short)));
    const force = has('f', '--force');
    const targets = end < 0 ? args.filter((arg) => !options.includes(arg)) : [...args.slice(0, end).filter((arg) => !options.includes(arg)), ...args.slice(end + 1)];
    if (!has('r', '--recursive') && !has('R', '--recursive')) {
      if (!force) return ctx.origCommand!(args);
      // `-f` silences a missing file, and only that (T330): just-bash's says
      // nothing of a refusal.
      const there: string[] = [];
      for (const target of targets) if ((await shell.fs.stat(shell.fs.canonical(ctx.fs.resolvePath(ctx.cwd, target))).catch(() => null)) !== null) there.push(target);
      if (there.length === 0) return ok('');
      const rest = options.flatMap((option) => {
        if (option === '--force') return [];
        if (option.startsWith('--')) return [option];
        const letters = option.replaceAll('f', '');
        return letters === '-' ? [] : [letters];
      });
      return ctx.origCommand!([...rest, '--', ...there]);
    }
    const verbose = has('v', '--verbose');
    let stdout = '';
    let stderr = '';
    let status = 0;
    // Whether `path` is gone; `shown` is it as typed, for the messages.
    const remove = async (path: string, shown: string): Promise<boolean> => {
      const stat = await shell.fs.stat(path).catch(() => null);
      if (stat === null) return true;
      if (stat.isDirectory) {
        let emptied = true;
        for (const name of await shell.fs.readdir(path)) if (!(await remove(path === '/' ? `/${name}` : `${path}/${name}`, `${shown.replace(/\/+$/, '')}/${name}`))) emptied = false;
        // A folder that keeps a protected entry stays; that entry said why.
        if (!emptied) return false;
      }
      // A protected entry, or one in a protected folder (`/tmp` in `/`).
      const refused = shell.fs.isProtected(path) || (await shell.fs.rm(path, { recursive: true, force: true }).then(() => false, () => true));
      if (refused) {
        stderr += `rm: cannot remove '${shown}': Permission denied\n`;
        status = 1;
        return false;
      }
      if (verbose) stdout += `removed ${stat.isDirectory ? 'directory ' : ''}'${shown}'\n`;
      return true;
    };
    for (const target of targets) {
      const path = shell.fs.canonical(ctx.fs.resolvePath(ctx.cwd, target));
      // GNU's `--preserve-root`, on by default.
      if (path === '/') {
        stderr += `rm: it is dangerous to operate recursively on '${target}'\nrm: use --no-preserve-root to override this failsafe\n`;
        status = 1;
        continue;
      }
      if ((await shell.fs.stat(path).catch(() => null)) === null) {
        if (!force) {
          stderr += `rm: cannot remove '${target}': No such file or directory\n`;
          status = 1;
        }
        continue;
      }
      await remove(path, target);
    }
    if (targets.length === 0 && !force) return ok('', 'rm: missing operand\n', 1);
    return ok(stdout, stderr, status);
  });

  // What the adapter's redirect guard runs in place of a command whose
  // output would go to a protected path: bash's message (research R28, G1).

  // `printf` and `echo -e` with a byte that isn't valid UTF-8: just-bash prints
  // it as a character, so as two bytes (research G21). The byte is masked for
  // the command, and put back in what it prints.
  const bytesOf = (text: string) => {
    const bytes: number[] = [];
    for (const piece of text.split(/([\uF700-\uF7FF])/u)) {
      if (/^[\uF700-\uF7FF]$/u.test(piece)) bytes.push(piece.charCodeAt(0) - 0xf700);
      else for (const byte of new TextEncoder().encode(piece)) bytes.push(byte);
    }
    return bytes;
  };
  const masked = (arg: string) => arg.replace(/\\x([89a-fA-F][0-9a-fA-F])|\\0?([23][0-7]{2})/g, (_, hex?: string, octal?: string) => String.fromCharCode(0xf700 + Number.parseInt(hex ?? octal!, hex === undefined ? 8 : 16)));
  const byteExact = (name: string, reads: (args: readonly string[]) => boolean) =>
    defineCommand(name, async (args, ctx) => {
      const mask = reads(args) ? args.map(masked) : args;
      // bash's builtin names itself as the shell (T305).
      const named = (result: Output) => (name === 'printf' ? { ...result, stderr: result.stderr.replace(/^printf: /gm, 'bash: printf: ') } : result);
      if (mask.every((arg, index) => arg === args[index])) return named(await ctx.origCommand!(args));
      const result = named(await ctx.origCommand!(mask));
      const bytes = Uint8Array.from(bytesOf(result.stdout));
      try {
        return { ...result, stdout: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
      } catch {
        return { ...result, stdout: Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''), stdoutKind: 'bytes' } as Output;
      }
    });

  // `--help` for the standard commands just-bash gives none (research G18).
  const helped = Object.entries(MISSING_HELP).filter(([name]) => name !== 'rm').map(([name, help]) =>
    defineCommand(name, async (args, ctx) => (args.includes('--help') ? ok(helpText(name, help)) : ctx.origCommand!(args))),
  );

  const own = [...rows, vim, cv, cat, ls, jq, rm, deniedMessage('sed'), deniedMessage('tee'), destinationMessage('cp'), destinationMessage('mv'), byteExact('printf', () => true), byteExact('echo', (args) => args.some((arg) => /^-[neE]*e[neE]*$/.test(arg))), ...helped];
  // GNU's fixes (gnu.ts), in front of the wrapper or just-bash's command.
  // A command run again on other input (`Next`): `origCommand` keeps the input
  // it was given, so through the shell, this once past its fix.
  let passing: string | null = null;
  const shellWord = (word: string) => `'${word.replaceAll("'", `'\\''`)}'`;
  const fixed = (name: string, runs: (args: string[], ctx: Context) => Promise<Output>) =>
    defineCommand(name, async (args, ctx) => {
      if (passing === name) {
        passing = null;
        return runs(args, ctx);
      }
      // What it says it printed no longer holds if a fix changed that.
      const list = args.map((arg) => (arg === '/dev/stdin' || arg === '/dev/fd/0' ? '-' : arg));
      const { internalOutputAccounting: _accounted, ...result } = (await GNU[name]!(list, ctx, (each, input) => {
        if (input === undefined) return runs(each, ctx);
        passing = name;
        return ctx.exec!(`/usr/bin/${name} ${each.map(shellWord).join(' ')}`, { cwd: ctx.cwd, stdin: input, env: Object.fromEntries(ctx.env) }) as Promise<Output>;
      }, shell.fs)) as Output & { internalOutputAccounting?: unknown };
      // What it wrote to `/dev/stdout` and the like, by name (T332).
      const streamed = shell.fs.takeStreamed();
      const whole = streamed.stdout === '' && streamed.stderr === '' ? result : { ...result, stdout: `${result.stdout}${streamed.stdout}`, stderr: `${result.stderr}${streamed.stderr}` };
      // just-bash's redirects can't count a command's bytes beside an error, and
      // drop the line (T347, research G34): the same output, as text.
      return whole.stderr !== '' && (whole.stdoutKind === 'bytes' || whole.stdoutEncoding === 'binary') ? { ...whole, stdout: stdoutText(whole), stdoutKind: undefined, stdoutEncoding: undefined } as Output : whole;
    });
  return [...own.map((command) => (GNU[command.name] === undefined ? command : fixed(command.name, (args, ctx) => command.execute(args, ctx)))), ...Object.keys(GNU).filter((name) => !own.some((command) => command.name === name)).map((name) => fixed(name, (args, ctx) => ctx.origCommand!(args)))];
}
