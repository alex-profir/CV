// The site's commands as commands of the shell (006 research R29): one
// just-bash custom command per row of the command table and per alias,
// printing the text of its block, and wrappers of `cat`, `ls` and `jq` that
// add what the site shows for their output. Each records the block it
// printed with the exact text, so the interface can draw that text as the
// block where it reaches the screen unchanged (FR-009, FR-015, FR-047). A
// recording is made only here, from what the site printed, never from typed
// or piped text (FR-018).
import { defineCommand } from 'just-bash/browser';
import { command } from '../engine/block.ts';
import type { Block, Effect, Node, Tone, VimFile } from '../engine/block.ts';
import { COMMANDS, CV_PIPE, SITE_WORDS, usage } from '../engine/commands.ts';
import type { CommandName, RunContext, SiteRun } from '../engine/commands.ts';
import type { File, FsNode } from '../engine/files.ts';
import { printJson } from '../engine/json.ts';
import { fill } from '../../../site-text.ts';
import { fileText, HOME } from './fs.ts';
import type { TerminalFs } from './fs.ts';
import type { Recorded } from './protocol.ts';
import { helpText, MISSING_HELP, SHELL_BUILTINS, STANDARD_COMMANDS } from './standard.ts';

export type ShellCommand = ReturnType<typeof defineCommand>;
type Context = Parameters<ShellCommand['execute']>[1];
type Output = Awaited<ReturnType<ShellCommand['execute']>>;

// The names the site's commands run under in the shell where a builtin of
// the same name would win: the adapter renames the typed word (research R29).
export const RENAMED: Readonly<Record<string, string>> = { help: '__cv_help' };

// What one line's run collects, and what it was sent with.
export type RunRecord = {
  line: string;
  history: readonly string[];
  shell: 'desktop' | 'mobile';
  recorded: Recorded[];
  effects: Effect[];
  // The pipe the vim view's status line shows, when not the line itself.
  pipe: string | null;
};

export type SiteShell = {
  context: RunContext;
  fs: TerminalFs;
  run: () => RunRecord;
};

// Set by the adapter on a command whose output goes into a pipe: what it
// prints there is text, never a block (research R29).
export const PIPED = '__CV_PIPED';

// Set by the adapter on a site command typed in another case, to the word as
// typed: replies name it (FR-017).
export const TYPED = '__CV_TYPED';

const piped = (ctx: Context) => ctx.env.get(PIPED) === '1';

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
  const runContext = (ctx: Context): RunContext => {
    const run = shell.run();
    return { ...shell.context, cwd: ctx.cwd, history: run.history, shell: run.shell, standard: STANDARD_GROUP };
  };

  // Prints a site command's run, records its block and keeps its effect.
  const emit = (ctx: Context, result: SiteRun): Output => {
    const run = shell.run();
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
    return ctx.exec!(BUILTINS.has(name) && !STANDARD_COMMANDS.includes(name as never) ? `builtin help ${name}` : `${name} --help`, { cwd: ctx.cwd });
  };

  const rows = COMMANDS.filter((row) => row.run !== undefined).flatMap((row) =>
    [row.name, ...row.aliases].map((word) =>
      defineCommand(RENAMED[word] ?? word, async (args, ctx) => {
        const typed = typedAs(word, ctx);
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
      const file = { name: shell.context.text.terminal.vim.noName, path: null, readonly: false, new: false };
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
    if (stat.isDirectory) return ok('', `${fill(replies.isFolder, { path: typed, command: `ls ${typed}` })}\n`, 1);
    const content = await shell.fs.readFile(path);
    run.effects.push(vimEffect({ name: shownPath(typed), path, readonly: shell.fs.isProtected(path), new: false }, null, content.replace(/\n$/, '')));
    return ok();
  });

  // `cv`: `cat cv.json | jq | vim -` from the home folder (FR-059).
  const cv = defineCommand('cv', async (args, ctx) => {
    if (args.length > 0) return usageOf(typedAs('cv', ctx), 'cv');
    const run = shell.run();
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
  // FR-050).
  // `ls -l`: just-bash gives every entry `user user` and its own modes
  // (research G7); the owner is `root` for a protected entry, which is read
  // only, and `guest` for the visitor's (FR-049, research R28). Shown
  // unchanged, it is drawn with its names as controls, as `ls` is.
  // Mode, links, owner, group, then the size and date with the padding
  // before them, then the name.
  const LONG_LINE = /^([-dl])([-rwx]{9}) +(\d+) (\S+) +(\S+)( +\d+ \S+ +\d+ +(?:\d\d:\d\d|\d{4})) (.+)$/;
  const longListing = async (args: readonly string[], ctx: Context, result: Output): Promise<Output> => {
    const flags = args.filter((arg) => arg.startsWith('-')).join('');
    const paths = args.filter((arg) => !arg.startsWith('-'));
    if (paths.length > 1 || result.exitCode !== 0) return result;
    const target = shell.fs.canonical(ctx.fs.resolvePath(ctx.cwd, paths[0] ?? '.'));
    const stat = await shell.fs.stat(target).catch(() => null);
    if (stat === null) return result;
    const inside = stat.isDirectory && !flags.includes('d');
    const pathOf = (name: string) => (!inside ? target : name === '.' ? target : name === '..' ? parentOf(target) : `${target === '/' ? '' : target}/${name}`);
    const lines = stdoutText(result).split('\n');
    const entries = await Promise.all(
      lines.map(async (entry) => {
        const match = LONG_LINE.exec(entry);
        if (match === null) return null;
        const [, kind, mode, links, , , rest, name] = match;
        const path = pathOf(name!);
        const folder = kind === 'd';
        const info = shell.fs.info(path, folder ? 'folder' : 'file');
        return { kind: kind!, mode: info.protected ? (folder ? 'r-xr-xr-x' : 'r--r--r--') : mode!, links: links!, owner: info.owner as string, rest: rest!, name: name!, path, folder };
      }),
    );
    const width = Math.max(0, ...entries.map((entry) => entry?.owner.length ?? 0));
    const text = lines.map((entry, index) => {
      const found = entries[index];
      return found === null || found === undefined ? entry : `${found.kind}${found.mode} ${found.links} ${found.owner.padEnd(width)} ${found.owner.padEnd(width)}${found.rest} ${found.name}`;
    });
    const stdout = text.join('\n');
    if (!piped(ctx)) {
      const out = (value: string, tone?: Tone): Node => ({ kind: 'text', text: value, stream: 'stdout', ...(tone === undefined ? {} : { tone }) });
      const block: Block = text
        .filter((entry) => entry !== '')
        .map((entry, index) => {
          const found = entries.filter((_, at) => lines[at] !== '')[index];
          if (found === null || found === undefined || found.name === '.' || found.name === '..') return { kind: 'line', children: [out(entry, 'dim')] } as Node;
          const owners = `${found.owner.padEnd(width)} ${found.owner.padEnd(width)}`;
          const name = found.folder ? command(`ls ${shownPath(found.path)}`, 'inline', { label: `${found.name}/`, req: 'ls', tone: 'folder' }) : command(`cat ${shownPath(found.path)}`, 'inline', { label: found.name, req: 'ls' });
          return { kind: 'line', children: [out(`${found.kind}${found.mode} ${found.links} `, 'dim'), out(owners, found.owner === 'guest' ? 'secondary' : 'dim'), out(`${found.rest} `, 'dim'), name] } as Node;
        });
      shell.run().recorded.push({ text: stdout, block });
    }
    return { ...result, stdout, stdoutKind: undefined, stdoutEncoding: undefined } as Output;
  };

  const ls = defineCommand('ls', async (args, ctx) => {
    const result = await ctx.origCommand!(args);
    if (args.some((arg) => /^-[a-zA-Z]*l[a-zA-Z]*$/.test(arg))) return longListing(args, ctx, result);
    const paths = args.filter((arg) => !arg.startsWith('-'));
    if (result.exitCode !== 0 || result.stdout === '' || piped(ctx) || paths.length < args.length || paths.length > 1) return result;
    const target = shell.fs.canonical(ctx.fs.resolvePath(ctx.cwd, paths[0] ?? '.'));
    const stat = await shell.fs.stat(target).catch(() => null);
    if (stat === null) return result;
    const names = stdoutText(result).split('\n').filter((name) => name !== '');
    const folder = stat.isDirectory ? target : parentOf(target);
    const order = stat.isDirectory ? (await shell.fs.readdir(target)).filter((name) => names.includes(name)) : [nameOf(target)];
    if (order.length !== names.length) return result;
    const cells: Node[] = [];
    for (const name of order) {
      const at = `${folder === '/' ? '' : folder}/${name}`;
      const isFolder = (await shell.fs.stat(at).catch(() => null))?.isDirectory === true;
      cells.push(isFolder ? command(`ls ${shownPath(at)}`, 'inline', { label: `${name}/`, req: 'ls', tone: 'folder' }) : command(`cat ${shownPath(at)}`, 'inline', { label: name, req: 'ls' }));
    }
    const block: Block = [{ kind: 'columns', cells, req: 'ls' }];
    shell.run().recorded.push({ text: stdoutText(result), block });
    return result;
  });

  // `jq`: what it printed, when it is one JSON value, as JSON rows (R31).
  const jq = defineCommand('jq', async (args, ctx) => {
    const result = await ctx.origCommand!(args);
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
    if (!has('r', '--recursive') && !has('R', '--recursive')) return ctx.origCommand!(args);
    const force = has('f', '--force');
    const targets = end < 0 ? args.filter((arg) => !options.includes(arg)) : [...args.slice(0, end).filter((arg) => !options.includes(arg)), ...args.slice(end + 1)];
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
    return ok('', stderr, status);
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
      if (mask.every((arg, index) => arg === args[index])) return ctx.origCommand!(args);
      const result = await ctx.origCommand!(mask);
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

  return [...rows, vim, cv, cat, ls, jq, rm, deniedMessage('sed'), deniedMessage('tee'), destinationMessage('cp'), destinationMessage('mv'), byteExact('printf', () => true), byteExact('echo', (args) => args.some((arg) => /^-[neE]*e[neE]*$/.test(arg))), ...helped];
}
