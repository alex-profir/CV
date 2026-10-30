// The shell adapter (006 research R27, contracts/shell-worker.md "The shell
// just-bash is given"): just-bash with TerminalFs, the standard commands and
// the site's, run one line at a time. just-bash starts every run from a
// fresh state (G4), so the adapter carries the variables, functions,
// options, `$?` and the working folder itself: a prelude before the line
// sets them, and an epilogue after it reads them back.
import { Bash, defineCommand } from 'just-bash/browser';
import { commandNamed, engineContext, SITE_WORDS } from '../engine/commands.ts';
import type { SiteInput } from '../engine/commands.ts';
import { complete } from './complete.ts';
import { HOME, OPENING, TerminalFs, WROTE } from './fs.ts';
import { INITIAL_STATE, QUOTA } from './protocol.ts';
import type { CompleteRequest, Completion, Limit, RunRequest, RunResult, ShellOption, ShellState, VisitorFiles, WriteOutcome, WriteRequest } from './protocol.ts';
import { PIPED, RENAMED, siteCommands, TYPED } from './site-commands.ts';
import type { RunRecord } from './site-commands.ts';
import { SHELL_BUILTINS, SHELL_KEYWORDS, STANDARD_COMMANDS } from './standard.ts';

type Script = ReturnType<Bash['transform']>['ast'];
type Plugin = Parameters<Bash['registerTransformPlugin']>[0];
type AstNode = { type: string; [key: string]: unknown };

const ENV = { HOME, USER: 'guest', LOGNAME: 'guest', SHELL: '/bin/bash' };

// FR-069's limits: the spec's numbers, not design values (research R33).
// `output` is what the line prints; `pipe`, what any one command may pass
// on inside it, so `seq 200000 | tail -1` runs as in bash.
export const LIMITS = { time: 5000, commands: 10_000, output: QUOTA, pipe: 4 * QUOTA };

export type Limits = typeof LIMITS;

const OPTIONS: readonly ShellOption[] = ['errexit', 'nounset', 'pipefail', 'noglob', 'noclobber', 'xtrace'];

// The shell's own variables, left to it (research R27).
const OWN = new Set(['PWD', 'OLDPWD', 'IFS', 'SHELLOPTS', 'BASHOPTS', 'LINENO', 'RANDOM', 'SECONDS', 'PIPESTATUS', 'FUNCNAME', 'PPID', 'UID', 'EUID', 'BASHPID', 'OPTIND', 'OPTARG', '_', ...Object.keys(ENV)]);

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

// The adapter's own words: a line that names one is refused.
const HIDDEN = /__cv_/i;

type Captured = { status: number; functions: string[]; options: string[]; cwd: string; env: Map<string, string>; exported: string[] };

// Every node of an AST, depth first, with whether it sends its output into
// a pipe.
function walk(node: unknown, visit: (node: AstNode, piped: boolean) => void, piped = false) {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit, piped);
    return;
  }
  if (node === null || typeof node !== 'object') return;
  const typed = node as AstNode;
  if (typeof typed.type === 'string') visit(typed, piped);
  if (typed.type === 'Pipeline' && Array.isArray(typed.commands)) {
    const commands = typed.commands as unknown[];
    commands.forEach((child, index) => walk(child, visit, piped || index < commands.length - 1));
    return;
  }
  // What a `$(…)` prints becomes a word, not output (FR-018).
  const inner = piped || typed.type === 'CommandSubstitution' || typed.type === 'ProcessSubstitution';
  for (const [key, value] of Object.entries(typed)) if (key !== 'type') walk(value, visit, inner);
}

const literalWord = (value: string) => ({ type: 'Word', parts: [{ type: 'Literal', value }] });

// The site's part of every run (research R29): the site's commands under
// the names the shell runs them by, in any case wherever a command can stand
// (FR-007), unless the visitor's function has that name; and each command
// whose output goes into a pipe marked, so it prints text there and no block.
function sitePlugin(functions: () => ReadonlySet<string>): Plugin {
  return {
    name: 'cv-site',
    transform(context) {
      const defined = functions();
      walk(context.ast, (node, piped) => {
        if (node.type !== 'SimpleCommand') return;
        const name = node.name as { parts?: { type: string; value?: string }[] } | null;
        const word = name?.parts?.length === 1 && name.parts[0]!.type === 'Literal' ? name.parts[0]!.value! : null;
        const assignments = node.assignments as unknown[];
        if (word !== null && !defined.has(word)) {
          const lower = word.toLowerCase();
          // Replies name the word as typed (FR-017).
          if (lower !== word && commandNamed(word) !== null) assignments.unshift({ type: 'Assignment', name: TYPED, value: literalWord(word), append: false, array: null });
          if (commandNamed(word) !== null || RENAMED[word] !== undefined) node.name = literalWord(RENAMED[lower] ?? lower);
        }
        if (piped && name !== null) assignments.unshift({ type: 'Assignment', name: PIPED, value: literalWord('1'), append: false, array: null });
      });
      return { ast: context.ast };
    },
  };
}

// The redirect check, until just-bash's G1 fix is released (research R28, G1;
// T129's upstream issue): just-bash rejects `exec` when the file system
// refuses `>`, `>>`, `>|`, `&>` or `&>>`, and ends the whole line, where bash
// says why and fails that command alone. It only reports the refusal of a
// redirect to a descriptor above 2. So each output redirect first opens its
// target on `CHECK_FD`, marked OPENING: the file system answers for that
// target without creating it, in the redirects' order and as the target
// expands when the command runs. A write past the 1 MB limit is only known
// after the command, so `__cv_wrote` follows it and gives its status. Delete
// this plugin, OPENING and `__cv_wrote` once the fix ships (plan,
// Dependencies).
const WRITES = new Set(['>', '>>', '>|', '&>', '&>>', '>&']);
const CHECK_FD = 99;

// Expanding a word twice would do these twice (`> f$((i++))`).
const EFFECTS = new Set(['CommandSubstitution', 'ProcessSubstitution', 'ArithmeticExpansion', 'AssignDefault']);

type Redirection = { fd: number | null; operator: string; target: { type: string; parts?: unknown[] }; fdVariable?: string };

// A redirect that names a file: `>&` does only with a literal word that isn't
// a descriptor, and a word that has effects isn't expanded a second time.
function checkable(redirection: Redirection): boolean {
  if (!WRITES.has(redirection.operator) || redirection.target.type !== 'Word' || redirection.fdVariable !== undefined) return false;
  const parts = redirection.target.parts as { type: string; value?: string }[];
  if (redirection.operator === '>&' && !(parts.length === 1 && parts[0]!.type === 'Literal' && !/^(\d+-?|-)$/.test(parts[0]!.value!))) return false;
  let effects = false;
  walk(parts, (part) => {
    if (EFFECTS.has(part.type)) effects = true;
  });
  return !effects;
}

const redirectPlugin: Plugin = {
  name: 'cv-redirect-check',
  transform(context) {
    const done = new WeakSet<object>();
    walk(context.ast, (node) => {
      if (done.has(node) || node.type === 'FunctionDef' || !Array.isArray(node.redirections)) return;
      done.add(node);
      const redirections = node.redirections as Redirection[];
      if (!redirections.some((redirection) => WRITES.has(redirection.operator) && (redirection.operator !== '>&' || checkable(redirection)))) return;
      node.redirections = redirections.flatMap((redirection) => (checkable(redirection) ? [{ type: 'Redirection', fd: CHECK_FD, operator: '>>', target: { type: 'Word', parts: [...redirection.target.parts!, { type: 'Literal', value: OPENING }] } }, redirection] : [redirection]));
      const statement = (command: unknown) => ({ type: 'Statement', pipelines: [{ type: 'Pipeline', commands: [command], negated: false, timed: false, timePosix: false }], operators: [], background: false });
      const wrote = { type: 'SimpleCommand', name: literalWord(WROTE), args: [{ type: 'Word', parts: [{ type: 'ParameterExpansion', parameter: '?', operation: null }] }], assignments: [], redirections: [] };
      const command = { ...node };
      for (const key of Object.keys(node)) delete node[key];
      Object.assign(node, { type: 'Group', body: [statement(command), statement(wrote)], redirections: [] });
      done.add(command);
      done.add(node);
    });
    return { ast: context.ast };
  },
};

// A line's syntax error, worded as just-bash words it (research R27, G2), or
// null.
function syntaxError(ast: Script): string | null {
  let error: string | null = null;
  walk(ast, (node) => {
    if (error !== null) return;
    const deferred = node.deferredError as { message: string } | undefined;
    if (node.type === 'Statement' && deferred !== undefined) error = deferred.message;
    if (node.type === 'Pipeline' && Array.isArray(node.commands) && node.commands.length > 1) {
      const empty = (node.commands as AstNode[]).some((command) => command.type === 'SimpleCommand' && command.name === null && (command.args as unknown[]).length === 0 && (command.assignments as unknown[]).length === 0 && (command.redirections as unknown[]).length === 0);
      if (empty) error = "syntax error near unexpected token `|'";
    }
  });
  return error;
}

// just-bash's parse errors as bash's: `line 1: …`.
const parseMessage = (message: string) => message.replace(/^Parse error at (\d+):\d+: /, 'line $1: ').replace(/^(?!line \d+: )/, 'line 1: ');

export type Shell = {
  // Runs `true` once, so the first line pays no first-run cost (research
  // R34) and the shell's own variables are known.
  warm(): Promise<void>;
  run(request: RunRequest): Promise<RunResult>;
  reset(): Promise<void>;
  restore(state: ShellState, files: VisitorFiles): Promise<void>;
  // `:w` and its kin (research R49): through TerminalFs, so its rules and
  // the 1 MB limit hold.
  write(request: WriteRequest): Promise<WriteOutcome>;
  // Tab (research R43): over TerminalFs and the tables the shell is built from.
  complete(request: CompleteRequest): Promise<Completion>;
};

// `limits` only in tests, to reach one limit before another.
export function createShell(input: SiteInput, options: { limits?: Partial<Limits> } = {}): Shell {
  const limits: Limits = { ...LIMITS, ...options.limits };
  const context = engineContext(input);
  const fs = new TerminalFs(context.fs);
  let record: RunRecord = { line: '', history: [], shell: 'desktop', recorded: [], effects: [], pipe: null };
  let captured: Captured | null = null;
  let baseline = new Map<string, string>();
  let lastFiles = JSON.stringify({ folders: [], files: {}, bytes: 0 });

  // The epilogue's reader: the status, the functions that exist, the
  // options, the working folder and every variable (research R27).
  const cvState = defineCommand('__cv_state', async (args, ctx) => {
    captured = {
      status: Number(args[0] ?? 0),
      functions: (args[1] ?? '').split('\n').flatMap((entry) => /^declare -f (\S+)$/.exec(entry.trim())?.slice(1) ?? []),
      options: (args[2] ?? '').split(':'),
      cwd: ctx.cwd,
      env: new Map(ctx.env),
      exported: Object.keys(ctx.exportedEnv ?? {}),
    };
    return { stdout: '', stderr: '', exitCode: 0 };
  });

  // After a command with an output redirect: its status, or 1 with bash's
  // error when a write past the 1 MB limit was refused (research G1).
  const cvWrote = defineCommand(WROTE, async (args) => {
    const full = fs.takeFull();
    return { stdout: '', stderr: full.map((target) => `bash: ${target}: No space left on device\n`).join(''), exitCode: full.length > 0 ? 1 : Number(args[0] ?? 0) };
  });

  const commands = siteCommands({ context, fs, run: () => record });

  // The visitor's functions, which win over a site command in another case.
  let functions: ReadonlySet<string> = new Set();

  const bashFor = (prelude: number) => {
    const bash = new Bash({
      fs,
      cwd: HOME,
      env: ENV,
      commands: [...STANDARD_COMMANDS],
      customCommands: [...commands, cvState, cvWrote],
      executionLimits: { maxExecutionTimeMs: limits.time, maxCommandCount: limits.commands + prelude, maxOutputSize: limits.pipe, maxLoopIterations: 1_000_000_000 },
    });
    bash.registerTransformPlugin(sitePlugin(() => functions));
    bash.registerTransformPlugin(redirectPlugin);
    return bash;
  };

  // A second shell that only parses and serializes (research R27).
  const parser = new Bash({ commands: [] });
  let swap: Script | null = null;
  let parsed: Script | null = null;
  parser.registerTransformPlugin({
    name: 'cv-parse',
    transform(transform) {
      parsed = transform.ast;
      return { ast: swap ?? transform.ast };
    },
  });
  const parse = (line: string): Script => {
    swap = null;
    parser.transform(line);
    return parsed!;
  };
  const serialize = (node: unknown): string => {
    swap = { type: 'Script', statements: [{ type: 'Statement', pipelines: [{ type: 'Pipeline', commands: [node], negated: false }], operators: [], background: false }] } as unknown as Script;
    try {
      return parser.transform('true').script;
    } finally {
      swap = null;
    }
  };

  // The function definitions a line holds, serialized, by name.
  const definitions = (ast: Script): Record<string, string> => {
    const found: Record<string, string> = {};
    walk(ast, (node) => {
      if (node.type === 'FunctionDef' && typeof node.name === 'string') found[node.name] = serialize(node);
    });
    return found;
  };

  // The variables go with `exec`'s `env`, not in the script: the parser
  // takes 1,000,000 bytes at most, and a variable may be bigger (research R27).
  const prelude = (state: ShellState): string => {
    const lines: string[] = [];
    const exported = state.exported.filter((name) => NAME.test(name) && name in state.variables);
    if (exported.length > 0) lines.push(`export ${exported.join(' ')}`);
    lines.push(...Object.values(state.functions));
    const options = state.options.filter((option) => OPTIONS.includes(option));
    if (options.length > 0) lines.push(`set ${options.map((option) => `-o ${option}`).join(' ')}`);
    // `$?` as the last line left it, even under errexit.
    lines.push(`(exit ${state.status}) && :`);
    return lines.join('\n');
  };

  const EPILOGUE = '__cv_s=$?; __cv_state "$__cv_s" "$(declare -F)" "$SHELLOPTS"';

  const stateFrom = (taken: Captured, before: ShellState, bodies: Record<string, string>): ShellState => {
    const variables: Record<string, string> = {};
    for (const [name, value] of taken.env) {
      if (!NAME.test(name) || OWN.has(name) || HIDDEN.test(name) || name.startsWith('BASH') || name === PIPED) continue;
      if (baseline.get(name) === value) continue;
      variables[name] = value;
    }
    const functions: Record<string, string> = {};
    for (const name of taken.functions) {
      const body = bodies[name] ?? before.functions[name];
      if (body !== undefined && !HIDDEN.test(name)) functions[name] = body;
    }
    return {
      cwd: taken.cwd,
      variables,
      exported: taken.exported.filter((name) => name in variables),
      functions,
      options: OPTIONS.filter((option) => taken.options.includes(option)),
      status: taken.status,
    };
  };

  const filesChanged = async (): Promise<VisitorFiles | undefined> => {
    const snapshot = await fs.snapshot();
    const key = JSON.stringify(snapshot);
    if (key === lastFiles) return undefined;
    lastFiles = key;
    return snapshot;
  };

  const limitOf = (stdout: string, stderr: string, status: number): Limit | null => {
    if (status === 124 && /execution exceeded execution deadline/.test(stderr)) return 'time';
    if (status === 126 && /too many commands executed/.test(stderr)) return 'commands';
    if (status === 126 && /output size limit exceeded|total output size exceeded/.test(stderr)) return 'output';
    // What the line printed reached 1 MB; `yes` stops at a limit with
    // status 0 (G13).
    if (new TextEncoder().encode(stdout + stderr).length >= limits.output) return 'output';
    return null;
  };

  let warmed: Promise<void> | null = null;
  // The shell's own variables on a fresh line, so only the visitor's are
  // carried (research R27).
  const warm = () => {
    warmed ??= runLine({ id: 0, line: 'true', state: INITIAL_STATE, history: [] }).then(() => {
      baseline = new Map(captured === null ? [] : (captured as Captured).env);
    });
    return warmed;
  };

  async function run(request: RunRequest): Promise<RunResult> {
    await warm();
    return runLine(request);
  }

  async function runLine(request: RunRequest): Promise<RunResult> {
    const { id, state } = request;
    const base = { id, recorded: [], effects: [], state };
    record = { line: request.line, history: request.history, shell: request.shell ?? 'desktop', recorded: [], effects: [], pipe: null };
    if (request.line.trim() === '') return { ...base, stdout: '', stderr: '', status: state.status, end: 'done' };
    if (HIDDEN.test(request.line)) {
      const word = /\S*__cv_\S*/i.exec(request.line)![0];
      return { ...base, stdout: '', stderr: `bash: ${word}: command not found\n`, status: 127, end: 'done', state: { ...state, status: 127 } };
    }
    const { line } = request;
    let ast: Script;
    try {
      ast = parse(line);
    } catch (error) {
      return { ...base, stdout: '', stderr: `bash: ${parseMessage((error as Error).message)}\n`, status: 2, end: 'syntax' };
    }
    const error = syntaxError(ast);
    if (error !== null) return { ...base, stdout: '', stderr: `bash: ${parseMessage(error)}\n`, status: 2, end: 'syntax' };

    const before = prelude(state);
    const shift = before.split('\n').length;
    const bodies = definitions(ast);
    captured = null;
    functions = new Set([...Object.keys(state.functions), ...Object.keys(bodies)]);
    const variables = Object.fromEntries(Object.entries(state.variables).filter(([name]) => NAME.test(name)));
    // `exec` rejecting, or the script not parsing, isn't the line ending the
    // shell as `exit` and `set -e` do: the Terminal stays open (FR-021).
    let failed = false;
    let result: { stdout: string; stderr: string; exitCode: number };
    try {
      result = await bashFor(shift + 3).exec(`${before}\n${line}\n${EPILOGUE}`, { cwd: state.cwd, env: variables, rawScript: true });
      failed = /^bash: syntax error: /.test(result.stderr) && captured === null;
    } catch (thrown) {
      failed = true;
      const { message } = thrown as Error;
      result = { stdout: '', stderr: `${message.startsWith('bash: ') ? '' : 'bash: '}${message}\n`, exitCode: 1 };
    }
    const unwritten = fs.takeFull().map((target) => `bash: ${target}: No space left on device\n`).join('');
    const taken = captured as Captured | null;
    // A message naming a line names the visitor's (research R27).
    const stderr = fs
      .plainText(`${result.stderr}${unwritten}`)
      .replace(/(line |Parse error at )(\d+)(?=:)/g, (_, lead: string, at: string) => `${lead}${Math.max(1, Number(at) - shift)}`)
      .split('\n')
      .filter((entry) => !/^\++ .*(__cv_|declare -F$)|^\+ \(?exit \d+\)?$|^\+ :$/i.test(entry))
      // A command only just-bash's Node build has is unknown, as in bash
      // (research G17).
      .map((entry) => entry.replace(/^bash: (\S+): command not available in browser environments\..*$/, 'bash: $1: command not found'))
      .join('\n');
    const stdout = fs.plainText(result.stdout);
    fs.endLine();
    const limit = limitOf(stdout, stderr, result.exitCode);
    const files = await filesChanged();
    const shared = { id, stdout, stderr, recorded: record.recorded, ...(files === undefined ? {} : { files }) };
    // Stopped by the output limit, the line shows none of what it printed,
    // only the stopped line (research G14), so a megabyte of text never
    // reaches the screen.
    if (limit === 'output') return { ...shared, stdout: '', stderr: '', recorded: [], effects: [], status: result.exitCode, end: 'limit', limit, state };
    if (limit !== null) return { ...shared, effects: [], status: result.exitCode, end: 'limit', limit, state };
    if (taken === null && failed) return { ...shared, effects: record.effects, status: result.exitCode, end: 'done', state: { ...state, status: result.exitCode } };
    if (taken === null) return { ...shared, effects: record.effects, status: result.exitCode, end: 'exited', state };
    return { ...shared, effects: record.effects, status: taken.status, end: 'done', state: stateFrom(taken, state, bodies) };
  }

  async function write(request: WriteRequest): Promise<WriteOutcome> {
    const { id, path: typed, text, force, cwd } = request;
    const home = typed === '~' || typed.startsWith('~/') ? `${HOME}${typed.slice(1)}` : typed;
    const path = fs.canonical(home.startsWith('/') ? home : `${cwd}/${home}`);
    const refuse = (error: 'exists' | 'cant-open' | 'full'): WriteOutcome => ({ id, ok: false, error, path });
    const stat = await fs.stat(path).catch(() => null);
    if (stat?.isDirectory === true || fs.refusesWrite(path)) return refuse('cant-open');
    if (stat !== null && !force) return refuse('exists');
    try {
      await fs.writeFile(path, text);
    } catch (error) {
      return refuse((error as { code?: string }).code === 'ENOSPC' ? 'full' : 'cant-open');
    }
    const files = await fs.snapshot();
    lastFiles = JSON.stringify(files);
    return { id, ok: true, path, created: stat === null, lines: text.split('\n').length - 1, bytes: new TextEncoder().encode(text).length, files };
  }

  return {
    warm,
    run,
    write,
    complete: (request) =>
      complete(request, {
        fs,
        home: HOME,
        commands: [...SITE_WORDS, ...STANDARD_COMMANDS, ...SHELL_BUILTINS, ...SHELL_KEYWORDS],
        keywords: ['then', 'else', 'elif', 'if', 'do', 'while', 'until', '!', 'time', '{'],
        variables: Object.fromEntries([...baseline].filter(([name]) => NAME.test(name) && !HIDDEN.test(name) && name !== PIPED)),
      }),
    async reset() {
      await fs.reset();
      lastFiles = JSON.stringify(await fs.snapshot());
    },
    async restore(_state, files) {
      await fs.restore(files);
      lastFiles = JSON.stringify(await fs.snapshot());
    },
  };
}
