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
import type { Block, Effect, Node } from '../engine/block.ts';
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
  // The line's first word as typed, when the adapter lower-cased it to run
  // a site command: replies name the word as typed (FR-017).
  typed: string | null;
  history: readonly string[];
  shell: 'desktop' | 'mobile';
  recorded: Recorded[];
  effects: Effect[];
  // The protected file `cat` last printed whole, so `cat cv.json | vim -`
  // names it (FR-059).
  lastFile: { name: string; text: string } | null;
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

  // The word a command was run by: as typed, for the line's first.
  const typedAs = (word: string) => {
    const run = shell.run();
    const typed = run.typed?.toLowerCase() === word ? run.typed : word;
    run.typed = null;
    return typed;
  };

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
        const typed = typedAs(word);
        return (row.name === 'help' ? standardHelp(args, ctx) : null) ?? emit(ctx, row.run!(args, runContext(ctx), typed));
      }),
    ),
  );

  // `vim <path>` or `vim -` with input (FR-058).
  const vim = defineCommand('vim', async (args, ctx) => {
    const run = shell.run();
    const { replies } = shell.context.text.terminal;
    const word = typedAs('vim');
    if (args.length !== 1) return usageOf(word, 'vim');
    if (args[0] === '-') {
      const input = decode(ctx.stdin);
      if (input === '') return usageOf(word, 'vim');
      const name = run.lastFile !== null && run.lastFile.text === input ? run.lastFile.name : '-';
      run.effects.push({ kind: 'vim', name, pipe: run.pipe ?? run.line, text: input.replace(/\n$/, '') });
      return ok();
    }
    const typed = args[0]!;
    const path = shell.fs.canonical(ctx.fs.resolvePath(ctx.cwd, typed));
    const stat = await shell.fs.stat(path).catch(() => null);
    if (stat === null) return ok('', `${fill(replies.noSuchPath, { path: typed })}\n`, 1);
    if (stat.isDirectory) return ok('', `${fill(replies.isFolder, { path: typed, command: `ls ${typed}` })}\n`, 1);
    const content = await shell.fs.readFile(path);
    run.effects.push({ kind: 'vim', name: nameOf(path), pipe: null, text: content.replace(/\n$/, '') });
    return ok();
  });

  // `cv`: `cat cv.json | jq | vim -` from the home folder (FR-059).
  const cv = defineCommand('cv', async (args, ctx) => {
    if (args.length > 0) return usageOf(typedAs('cv'), 'cv');
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
    if (printed.length === 1) run.lastFile = { name: printed[0]!.name, text: printed[0]!.text };
    if (!piped(ctx)) for (const entry of printed) run.recorded.push({ text: entry!.text, block: entry!.file.show() });
    return result;
  });

  // `ls`: a listing whose names are controls, a folder running `ls` on it
  // and a file `cat`, in the design's order for the home folder (FR-043,
  // FR-050).
  const ls = defineCommand('ls', async (args, ctx) => {
    const result = await ctx.origCommand!(args);
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

  // `--help` for the standard commands just-bash gives none (research G18).
  const helped = Object.entries(MISSING_HELP).map(([name, help]) =>
    defineCommand(name, async (args, ctx) => (args.includes('--help') ? ok(helpText(name, help)) : ctx.origCommand!(args))),
  );

  return [...rows, vim, cv, cat, ls, jq, ...helped];
}
