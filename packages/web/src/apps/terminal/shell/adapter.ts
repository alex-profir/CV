// The shell adapter (006 research R27, contracts/shell-worker.md "The shell
// just-bash is given"): just-bash with TerminalFs, the standard commands and
// the site's, run one line at a time. just-bash starts every run from a
// fresh state (G4), so the adapter carries the variables, functions,
// options, `$?` and the working folder itself: a prelude before the line
// sets them, and an epilogue after it reads them back.
import { Bash, defineCommand } from 'just-bash/browser';
import { commandNamed, engineContext } from '../engine/commands.ts';
import type { SiteInput } from '../engine/commands.ts';
import { HOME, TerminalFs } from './fs.ts';
import { INITIAL_STATE, QUOTA } from './protocol.ts';
import type { Limit, RunRequest, RunResult, ShellOption, ShellState, VisitorFiles } from './protocol.ts';
import { PIPED, RENAMED, siteCommands } from './site-commands.ts';
import type { RunRecord } from './site-commands.ts';
import { STANDARD_COMMANDS } from './standard.ts';

type Script = ReturnType<Bash['transform']>['ast'];
type Plugin = Parameters<Bash['registerTransformPlugin']>[0];
type AstNode = { type: string; [key: string]: unknown };

const ENV = { HOME, USER: 'guest', LOGNAME: 'guest', SHELL: '/bin/bash' };

// FR-069's limits: the spec's numbers, not design values (research R33).
export const LIMITS = { time: 5000, commands: 10_000, output: QUOTA };

const OPTIONS: readonly ShellOption[] = ['errexit', 'nounset', 'pipefail', 'noglob', 'noclobber', 'xtrace'];

// The shell's own variables, left to it (research R27).
const OWN = new Set(['PWD', 'OLDPWD', 'IFS', 'SHELLOPTS', 'BASHOPTS', 'LINENO', 'RANDOM', 'SECONDS', 'PIPESTATUS', 'FUNCNAME', 'PPID', 'UID', 'EUID', 'BASHPID', 'OPTIND', 'OPTARG', '_', ...Object.keys(ENV)]);

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

// The adapter's own words: a line that names one is refused.
const HIDDEN = /__cv_/i;

const quote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;

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
// the names the shell runs them by, and each command whose output goes into
// a pipe marked, so it prints text there and no block.
const sitePlugin: Plugin = {
  name: 'cv-site',
  transform(context) {
    walk(context.ast, (node, piped) => {
      if (node.type !== 'SimpleCommand') return;
      const name = node.name as { parts?: { type: string; value?: string }[] } | null;
      const word = name?.parts?.length === 1 && name.parts[0]!.type === 'Literal' ? name.parts[0]!.value! : null;
      if (word !== null && RENAMED[word] !== undefined) node.name = literalWord(RENAMED[word]!);
      if (piped && name !== null) (node.assignments as unknown[]).unshift({ type: 'Assignment', name: PIPED, value: literalWord('1'), append: false, array: null });
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

// A typed first word that names a site command in another case runs it
// (FR-007).
function lowerFirst(line: string): string {
  const match = /^(\s*)([^\s;|&<>()]+)/.exec(line);
  if (match === null) return line;
  const word = match[2]!;
  return commandNamed(word) !== null && word !== word.toLowerCase() ? `${match[1]}${word.toLowerCase()}${line.slice(match[0].length)}` : line;
}

export type Shell = {
  // Runs `true` once, so the first line pays no first-run cost (research
  // R34) and the shell's own variables are known.
  warm(): Promise<void>;
  run(request: RunRequest): Promise<RunResult>;
  reset(): Promise<void>;
  restore(state: ShellState, files: VisitorFiles): Promise<void>;
};

export function createShell(input: SiteInput): Shell {
  const context = engineContext(input);
  const fs = new TerminalFs(context.fs);
  let record: RunRecord = { line: '', history: [], shell: 'desktop', recorded: [], effects: [], lastFile: null, pipe: null };
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

  const commands = siteCommands({ context, fs, run: () => record });

  const bashFor = (prelude: number) => {
    const bash = new Bash({
      fs,
      cwd: HOME,
      env: ENV,
      commands: [...STANDARD_COMMANDS],
      customCommands: [...commands, cvState],
      executionLimits: { maxExecutionTimeMs: LIMITS.time, maxCommandCount: LIMITS.commands + prelude, maxOutputSize: LIMITS.output, maxLoopIterations: 1_000_000_000 },
    });
    bash.registerTransformPlugin(sitePlugin);
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

  const prelude = (state: ShellState): string => {
    const lines: string[] = [];
    for (const [name, value] of Object.entries(state.variables)) if (NAME.test(name)) lines.push(`${name}=${quote(value)}`);
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
    if (status === 126 && /output size limit exceeded/.test(stderr)) return 'output';
    // `yes` stops at the limit with status 0 (G13).
    if (new TextEncoder().encode(stdout).length >= LIMITS.output) return 'output';
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
    record = { line: request.line, history: request.history, shell: request.shell ?? 'desktop', recorded: [], effects: [], lastFile: null, pipe: null };
    if (request.line.trim() === '') return { ...base, stdout: '', stderr: '', status: state.status, end: 'done' };
    if (HIDDEN.test(request.line)) {
      const word = /\S*__cv_\S*/i.exec(request.line)![0];
      return { ...base, stdout: '', stderr: `bash: ${word}: command not found\n`, status: 127, end: 'done', state: { ...state, status: 127 } };
    }
    const line = lowerFirst(request.line);
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
    let result: { stdout: string; stderr: string; exitCode: number };
    try {
      result = await bashFor(shift + 3).exec(`${before}\n${line}\n${EPILOGUE}`, { cwd: state.cwd, rawScript: true });
    } catch (thrown) {
      result = { stdout: '', stderr: `bash: ${(thrown as Error).message}\n`, exitCode: 1 };
    }
    const taken = captured as Captured | null;
    // A message naming a line names the visitor's (research R27).
    const stderr = result.stderr
      .replace(/(line |Parse error at )(\d+)(?=:)/g, (_, lead: string, at: string) => `${lead}${Math.max(1, Number(at) - shift)}`)
      .split('\n')
      .filter((entry) => !/^\++ .*(__cv_|declare -F$)|^\+ \(?exit \d+\)?$|^\+ :$/.test(entry))
      .join('\n');
    const limit = limitOf(result.stdout, stderr, result.exitCode);
    const files = await filesChanged();
    const shared = { id, stdout: result.stdout, stderr, recorded: record.recorded, ...(files === undefined ? {} : { files }) };
    if (limit !== null) return { ...shared, effects: [], status: result.exitCode, end: 'limit', limit, state };
    if (taken === null) return { ...shared, effects: record.effects, status: result.exitCode, end: 'exited', state };
    return { ...shared, effects: record.effects, status: taken.status, end: 'done', state: stateFrom(taken, state, bodies) };
  }

  return {
    warm,
    run,
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
