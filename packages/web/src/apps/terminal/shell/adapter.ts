// The shell adapter (006 research R27, contracts/shell-worker.md "The shell
// just-bash is given"): just-bash with TerminalFs, the standard commands and
// the site's, run one line at a time. just-bash starts every run from a
// fresh state (G4), so the adapter carries the variables, functions,
// options, `$?` and the working folder itself: a prelude before the line
// sets them, and a checkpoint after it reads them back. Each is parsed apart
// from the line and joined as trees, so neither can be changed by its text.
import { Bash, defineCommand } from 'just-bash/browser';
import { commandNamed, engineContext, SITE_WORDS } from '../engine/commands.ts';
import type { SiteInput } from '../engine/commands.ts';
import { complete } from './complete.ts';
import { FATAL, HOME, OPENING, TerminalFs, WROTE } from './fs.ts';
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

const OPTIONS: readonly ShellOption[] = ['errexit', 'nounset', 'pipefail', 'noglob', 'noclobber', 'xtrace', 'allexport'];

// The shell's own variables, left to it (research R27).
const OWN = new Set(['PWD', 'SHELLOPTS', 'BASHOPTS', 'LINENO', 'RANDOM', 'SECONDS', 'PIPESTATUS', 'FUNCNAME', 'PPID', 'UID', 'EUID', 'BASHPID', 'OPTIND', 'OPTARG', '_']);

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

// The adapter's own words: a line that names one is refused.
const HIDDEN = /__cv_/i;

// just-bash's errors that end a line and, in an interactive bash, nothing else.
const FATAL_MESSAGE = /(^|\n)bash: \S+: readonly variable\n$/;

// Errors a group reports by their message alone; the line's group stops at one.
const GROUP_MESSAGE = /(^|\n)(\S+: unbound variable|.*: bad substitution)\n$/;

type Captured = { status: number; functions: string[]; declarations: string[]; options: string[]; shopts: string[]; cwd: string; env: Map<string, string>; exported: string[] };

// A value at least this long isn't listed by the checkpoint's `declare -p`:
// what that prints counts towards the line's output.
const LISTED = 65_536;

// What the checkpoint runs and the prelude adds, on top of a line's 10,000
// commands.
const CHECK_COMMANDS = 7;

// bash's builtins that just-bash runs as commands, so found only on PATH.
const PATH_BUILTINS = new Set(['echo', 'printf', 'pwd', 'true', 'false', 'test', '[']);

// The builtins that answer `--help` in bash with their `help` text (T294).
const HELPED_BUILTINS = new Set(['.', 'break', 'builtin', 'cd', 'command', 'compgen', 'complete', 'continue', 'declare', 'dirs', 'eval', 'exec', 'exit', 'export', 'getopts', 'hash', 'help', 'let', 'local', 'mapfile', 'popd', 'pushd', 'pwd', 'read', 'readarray', 'readonly', 'return', 'set', 'shift', 'shopt', 'source', 'type', 'typeset', 'unset', 'wait', 'history']);

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

// A hidden command under a path, so a visitor's PATH can't hide it (T286).
const hidden = (name: string) => `/usr/bin/${name}`;

// `${x:?word}` ends the line as `exit` does in just-bash; the mark tells them
// apart (T286), and the name is bash's wording of it.
function markFatal(node: AstNode) {
  const operation = node.operation as { type: string; word: { parts: unknown[] } | null; checkEmpty: boolean } | null;
  if (operation?.type !== 'ErrorIfUnset' || typeof node.parameter !== 'string') return;
  const empty = operation.word === null || operation.word.parts.every((part) => (part as { value?: string }).value === '');
  const words = empty ? [{ type: 'Literal', value: operation.checkEmpty ? 'parameter null or not set' : 'parameter not set' }] : operation.word!.parts;
  operation.word = { type: 'Word', parts: [{ type: 'Literal', value: `${FATAL}${node.parameter}: ` }, ...words] } as never;
}

type Parse = (text: string) => { statements: { pipelines: { commands: { assignments?: { array: unknown }[] }[] }[] }[] };

// The builtins the adapter finishes for just-bash (T287, T289, T294), and
// PATH's (T286). Each is a literal name the visitor hasn't redefined.
function rewriteBuiltin(node: AstNode, word: string | null, defined: ReadonlySet<string>, pathChanged: boolean, tools: { parse: Parse; serialize: (node: unknown) => string }) {
  if (word === null || defined.has(word)) return;
  const args = node.args as { parts: { type: string; value?: string }[] }[];
  const first = args[0]?.parts.length === 1 && args[0]!.parts[0]!.type === 'Literal' ? args[0]!.parts[0]!.value : undefined;
  if (first === '--help' && HELPED_BUILTINS.has(word)) {
    node.name = literalWord(hidden('__cv_usage'));
    node.args = [literalWord(word)];
    return;
  }
  if (pathChanged && PATH_BUILTINS.has(word)) node.name = literalWord(hidden(word));
  if ((node.assignments as { name: string }[]).some((assignment) => assignment.name !== PIPED)) return;
  const template = word === 'cd' ? CD_TEMPLATE : word === 'eval' || word === 'source' || word === '.' ? sawTemplate(word) : null;
  if (template === null) return;
  // The command as typed is the first word, for `type` to print (`plainText`).
  const typed = encodeURIComponent(tools.serialize({ ...node, assignments: [] })).replace(/[!'()*~]/g, (char) => `%${char.charCodeAt(0).toString(16)}`);
  const { statements } = tools.parse(`${hidden('__cv_hold')} "$?" ${typed} && ${hidden('__cv_ok')}; ${template}`);
  // The words are expanded once, into `__cv_a`, as they may have effects.
  for (const statement of statements) for (const pipeline of statement.pipelines) for (const command of pipeline.commands) if (Array.isArray(command.assignments?.[0]?.array)) command.assignments[0]!.array = args;
  const redirections = node.redirections;
  for (const key of Object.keys(node)) delete node[key];
  Object.assign(node, { type: 'Group', body: statements, redirections });
}

// What the groups below end with: `$?` kept past the clean-up.
const CLEAN_UP = `${hidden('__cv_hold')} "$?" && ${hidden('__cv_ok')}; builtin unset -v __cv_a __cv_to; ${hidden('__cv_after')}`;

// `cd`: __cv_cd decides as bash does, the builtin moves (T287).
const CD_TEMPLATE = `__cv_a=(); ${hidden('__cv_cd')} "\${__cv_a[@]}" && builtin cd -- "$__cv_to"; ${CLEAN_UP}`;

// `eval` and `source`: __cv_saw reads the text for the functions it defines,
// which just-bash can't print (T289, G10), leaving `$?` as it was for the text.
const sawTemplate = (word: string) => `__cv_a=(); ${hidden('__cv_saw')} ${word === 'eval' ? 'eval' : 'source'} "\${__cv_a[@]}" && ${hidden('__cv_ok')}; builtin ${word} "\${__cv_a[@]}"; ${CLEAN_UP}`;

// The site's part of every run (research R29): the site's commands under
// the names the shell runs them by, in any case wherever a command can stand
// (FR-007), unless the visitor's function has that name; and each command
// whose output goes into a pipe marked, so it prints text there and no block.
function sitePlugin(functions: () => ReadonlySet<string>, pathChanged: () => boolean, tools: { parse: Parse; serialize: (node: unknown) => string }): Plugin {
  return {
    name: 'cv-site',
    transform(context) {
      const defined = functions();
      walk(context.ast, (node, piped) => {
        if (node.type === 'ParameterExpansion') markFatal(node);
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
        rewriteBuiltin(node, word, defined, pathChanged(), tools);
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
      const wrote = { type: 'SimpleCommand', name: literalWord(hidden(WROTE)), args: [{ type: 'Word', parts: [{ type: 'ParameterExpansion', parameter: '?', operation: null }] }], assignments: [], redirections: [] };
      const command = { ...node };
      for (const key of Object.keys(node)) delete node[key];
      Object.assign(node, { type: 'Group', body: [statement(command), statement(wrote)], redirections: [] });
      done.add(command);
      done.add(node);
    });
    return { ast: context.ast };
  },
};

// A line's syntax error, or null: what just-bash's parser lets through (G2).
function syntaxError(ast: Script): string | null {
  let error: string | null = null;
  walk(ast, (node) => {
    if (error !== null) return;
    const deferred = node.deferredError as { message: string } | undefined;
    if (node.type === 'Statement' && deferred !== undefined) error = deferred.message;
    const bare = (command: AstNode) => command.type === 'SimpleCommand' && command.name === null && (command.args as unknown[]).length === 0 && (command.assignments as unknown[]).length === 0 && (command.redirections as unknown[]).length === 0;
    if (node.type === 'Pipeline' && Array.isArray(node.commands) && node.commands.length > 1 && (node.commands as AstNode[]).some(bare)) error = "syntax error near unexpected token `|'";
    // `true &&` with nothing after it.
    if (node.type === 'Statement' && Array.isArray(node.operators) && node.operators.length > 0) {
      const last = (node.pipelines as { commands: AstNode[] }[]).at(-1)!;
      if (last.commands.length === 1 && bare(last.commands[0]!)) error = END_OF_FILE;
    }
  });
  return error;
}

const END_OF_FILE = 'syntax error: unexpected end of file';

// just-bash's parse errors as bash words them (T293): `line 1: …`, and an
// unfinished line as the end of the input bash would have reached.
function parseMessage(message: string, line: string): string {
  const text = message.replace(/^Parse error at \d+:\d+: /, '').replace(/^line \d+: /, '');
  const unexpected = /^Expected .*, got (\S+)$/.exec(text);
  const closing = /near unexpected token `(fi|done|esac)'$/.exec(text);
  if (unexpected?.[1] === 'EOF' || /^Expected compound command/.test(text) || (closing !== null && !new RegExp(`\\b${closing[1]}\\b`).test(line))) return `line 1: ${END_OF_FILE}`;
  if (unexpected !== null) {
    const column = Number(/^Parse error at \d+:(\d+)/.exec(message)?.[1] ?? 1);
    const token = line.slice(column - 1).trim().split(/\s+/)[0] || 'newline';
    return `line 1: syntax error near unexpected token \`${token}'`;
  }
  return `line 1: ${text.replace(/matching '(.)'$/, "matching `$1'")}`;
}

// The arithmetic bash names in its errors, which just-bash's leave out: the
// first expansion the line holds that the error can be about.
function arithmeticWording(stderr: string, ast: Script): string {
  const texts: string[] = [];
  walk(ast, (node) => {
    const text = (node.expression as { originalText?: string } | undefined)?.originalText;
    if (node.type === 'ArithmeticExpansion' && text !== undefined) texts.push(text);
  });
  return stderr.replace(/(^|\n)division by 0\n$/, (whole, lead: string) => {
    const text = texts.find((each) => /[/%]/.test(each));
    return text === undefined ? `${lead}bash: division by 0\n` : `${lead}bash: ${text}: division by 0 (error token is "${text.split(/[/%]/).at(-1)!.trim()}")\n`;
  }).replace(/(^|\n)syntax error: (.*\(error token is ".*"\))\n$/, (_, lead: string, rest: string) => `${lead}bash: ${texts[0] ?? ''}${texts.length > 0 ? ': ' : ''}arithmetic syntax error: ${rest}\n`);
}

// A here-document the line never ended: bash warns and runs it.
function unterminated(ast: Script): string {
  let warning = '';
  walk(ast, (node) => {
    if (node.type === 'HereDoc' && node.terminated === false) warning += `bash: warning: here-\u0064ocument at line 1 delimited by end-of-file (wanted \`${node.delimiter as string}')\n`;
  });
  return warning;
}

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
  // The last checkpoint the line reached, and whether it was the one after
  // the line (T286).
  let captured: Captured | null = null;
  let finished = false;
  let baseline = new Map<string, string>();
  let lastFiles = JSON.stringify({ folders: [], files: {}, bytes: 0 });

  // The checkpoint's three steps, which run as commands of the shell: the
  // status, the working folder and the variables; then, from a pipe, the
  // functions and what `declare -p` lists, with the settings; then the
  // status again, as `$?` (research R27).
  let reading: { taken: Captured; held: [string, string][]; last: boolean } | null = null;
  const quiet = (exitCode = 0) => ({ stdout: '', stderr: '', exitCode });
  const cvBegin = defineCommand('__cv_begin', async (args, ctx) => {
    const held = [...ctx.env].filter(([, value]) => value.length >= LISTED);
    const taken: Captured = { status: Number(args[0] ?? 0), functions: [], declarations: [], options: [], shopts: [], cwd: ctx.cwd, env: new Map(ctx.env), exported: Object.keys(ctx.exportedEnv ?? {}) };
    for (const [name] of held) ctx.env.delete(name);
    reading = { taken, held, last: args[1] === 'last' };
    return quiet();
  });
  const cvRead = defineCommand('__cv_read', async (args, ctx) => {
    const { taken } = reading!;
    const lines = new TextDecoder().decode(Uint8Array.from(String(ctx.stdin), (char) => char.charCodeAt(0))).split('\n');
    taken.functions = lines.flatMap((entry) => /^declare -f (\S+)$/.exec(entry.trim())?.slice(1) ?? []);
    taken.declarations = lines.filter((entry) => {
      const match = /^declare -(\S+) ([^=\s]+)/.exec(entry);
      return match !== null && /[^x-]/.test(match[1]!) && match[1] !== 'f' && NAME.test(match[2]!) && !OWN.has(match[2]!) && !HIDDEN.test(match[2]!) && match[2] !== PIPED;
    });
    taken.options = (args[0] ?? '').split(':');
    taken.shopts = (args[1] ?? '').split(':').filter((name) => name !== '');
    return quiet();
  });
  const cvEnd = defineCommand('__cv_end', async (_args, ctx) => {
    const { taken, held, last } = reading!;
    for (const [name, value] of held) ctx.env.set(name, value);
    captured = taken;
    finished = last;
    return quiet(taken.status);
  });
  const cvOk = defineCommand('__cv_ok', async () => quiet());
  // `<builtin> --help`: `help <builtin>`'s text, with bash's status (T294).
  const cvUsage = defineCommand('__cv_usage', async (args, ctx) => {
    const help = commands.find((command) => command.name === RENAMED.help)!;
    return { ...(await help.execute(args, ctx)), exitCode: 2 };
  });

  // `$?` kept across the commands the adapter runs around a builtin.
  let heldStatus = 0;
  const cvHold = defineCommand('__cv_hold', async (args) => {
    heldStatus = Number(args[0] ?? 0);
    return quiet(heldStatus);
  });
  // An eval whose text doesn't parse: bash's status 2, where just-bash says 1.
  let evalFailed = false;
  const cvAfter = defineCommand('__cv_after', async () => {
    const status = evalFailed ? 2 : heldStatus;
    evalFailed = false;
    return quiet(status);
  });

  // `eval` and `source`: the functions their text defines (T289).
  const ran = new Map<string, string>();
  const cvSaw = defineCommand('__cv_saw', async (args, ctx) => {
    const [kind, ...words] = args;
    let text = words.join(' ');
    if (kind === 'source') text = await fs.readFile(fs.resolvePath(ctx.cwd, words[0] ?? '')).catch(() => '');
    try {
      for (const [name, body] of Object.entries(definitions(parse(text)))) ran.set(name, body);
    } catch {
      // eval says what's wrong with its text when it runs.
      evalFailed = kind === 'eval';
    }
    return quiet(heldStatus);
  });
  // A definition that ran: the one in force, wherever the text holds another.
  const defined: string[] = [];
  const cvDefined = defineCommand('__cv_def', async (args) => {
    const [name, id] = args;
    if (name !== undefined) ran.set(name, defined[Number(id)] ?? '');
    return quiet();
  });

  // `cd` as bash decides it (T287): too many operands, OLDPWD or HOME unset,
  // and `..` going up from a folder that has gone.
  const cvCd = defineCommand('__cv_cd', async (args, ctx) => {
    const refuse = (stderr: string, exitCode = 1) => ({ stdout: '', stderr, exitCode });
    const operands: string[] = [];
    let options = true;
    for (const arg of args) {
      if (options && arg === '--') options = false;
      else if (options && /^-[LPe@]+$/.test(arg)) continue;
      else if (options && arg.startsWith('-') && arg !== '-') return refuse(`bash: cd: ${arg.slice(0, 2)}: invalid option\ncd: usage: cd [-L|[-P [-e]] [-@]] [dir]\n`, 2);
      else {
        options = false;
        operands.push(arg);
      }
    }
    if (operands.length > 1) return refuse('bash: cd: too many arguments\n', 2);
    const [typed] = operands;
    let to = typed ?? ctx.env.get('HOME') ?? '';
    if (to === '') {
      if (typed === undefined) return refuse('bash: cd: HOME not set\n');
      to = '.';
    }
    let stdout = '';
    if (typed === '-') {
      to = ctx.env.get('OLDPWD') ?? '';
      if (to === '') return refuse('bash: cd: OLDPWD not set\n');
      stdout = `${to}\n`;
    } else if (to.split('/').includes('..')) {
      const shown = to;
      const at = fs.resolvePath(ctx.cwd, to);
      const stat = await fs.stat(at).catch(() => null);
      if (stat === null) return refuse(`bash: cd: ${shown}: No such file or directory\n`);
      if (!stat.isDirectory) return refuse(`bash: cd: ${shown}: Not a directory\n`);
      to = at;
    }
    ctx.env.set('__cv_to', to);
    return { stdout, stderr: '', exitCode: 0 };
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

  // What this line runs: the setup, the functions, `$?`, the line and the
  // checkpoints, all parsed already (research R27). The exec's own text is
  // a placeholder; the plugins see the functions and the line.
  let pending: { functions: unknown[]; setup: unknown[]; status: unknown[]; line: unknown[]; check: (last: boolean) => unknown[]; between: boolean } | null = null;
  let pathChanged = false;

  const bashFor = (overhead: number) => {
    const bash = new Bash({
      fs,
      cwd: HOME,
      env: ENV,
      commands: [...STANDARD_COMMANDS],
      customCommands: [...commands, cvBegin, cvRead, cvEnd, cvOk, cvUsage, cvHold, cvAfter, cvSaw, cvDefined, cvCd, cvWrote],
      // Recursion runs into FR-069's limit on commands, the one bash's line
      // would meet here, not a depth bash doesn't have (T286).
      executionLimits: { maxExecutionTimeMs: limits.time, maxCommandCount: limits.commands + overhead, maxOutputSize: limits.pipe, maxLoopIterations: 1_000_000_000, maxCallDepth: 20_000 },
    });
    // Runs on the first parse only: a command's own `exec` is its own script.
    let spliced = false;
    bash.registerTransformPlugin({
      name: 'cv-line',
      transform(context) {
        if (spliced || pending === null) return { ast: context.ast };
        return { ast: { type: 'Script', statements: [...pending.functions, ...pending.line] } as unknown as Script };
      },
    });
    bash.registerTransformPlugin(sitePlugin(() => functions, () => pathChanged, { parse: parse as unknown as Parse, serialize }));
    bash.registerTransformPlugin(redirectPlugin);
    bash.registerTransformPlugin({
      name: 'cv-check',
      transform(context) {
        if (spliced || pending === null) return { ast: context.ast };
        spliced = true;
        const { setup, status, line, check, between } = pending;
        const all = context.ast.statements as unknown[];
        const definitions = all.slice(0, all.length - line.length);
        // In one group, so an arithmetic error drops the rest of the line
        // (T293) and the checkpoint after it still runs.
        const statement = (command: unknown) => ({ type: 'Statement', pipelines: [{ type: 'Pipeline', commands: [command], negated: false, timed: false, timePosix: false }], operators: [], background: false });
        const body = line.flatMap((each, index) => (between && index < line.length - 1 ? [each, ...check(false)] : [each]));
        return { ast: { type: 'Script', statements: [...setup, ...definitions, ...status, statement({ type: 'Group', body, redirections: [] }), ...check(true)] } as unknown as Script };
      },
    });
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
    parsed = null;
    try {
      parser.transform(line);
    } catch (error) {
      // Parsed, but it can't be serialized: an unterminated here-document.
      if (parsed === null) throw error;
    }
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

  // Each definition reports itself when it runs (T289): only those not inside
  // another's body, so a body stays as typed. Serialized before anything is
  // rewritten.
  const reported = (ast: Script) => {
    const definitionsAt: AstNode[] = [];
    const seek = (node: unknown) => {
      if (Array.isArray(node)) return node.forEach(seek);
      if (node === null || typeof node !== 'object') return;
      const typed = node as AstNode;
      if (typed.type === 'FunctionDef') {
        definitionsAt.push(typed);
        return;
      }
      for (const [key, value] of Object.entries(typed)) if (key !== 'type') seek(value);
    };
    seek(ast);
    for (const node of definitionsAt) {
      const id = defined.push(serialize(node)) - 1;
      const statement = (command: unknown) => ({ type: 'Statement', pipelines: [{ type: 'Pipeline', commands: [command], negated: false, timed: false, timePosix: false }], operators: [], background: false });
      const report = { type: 'SimpleCommand', name: literalWord(hidden('__cv_def')), args: [literalWord(node.name as string), literalWord(String(id))], assignments: [], redirections: [] };
      const definition = { ...node };
      for (const key of Object.keys(node)) delete node[key];
      Object.assign(node, { type: 'Group', body: [statement(definition), statement(report)], redirections: [] });
    }
  };

  // The variables go with `exec`'s `env`, not in the script: the parser
  // takes 1,000,000 bytes at most, and a variable may be bigger (research R27).
  // Before the functions, so none of them runs in it (T290).
  const setupOf = (state: ShellState): string[] => {
    const lines: string[] = [];
    const gone = [...state.unset, ...('OLDPWD' in state.variables ? [] : ['OLDPWD'])];
    if (gone.length > 0) lines.push(`unset ${gone.join(' ')}`);
    const exported = state.exported.filter((name) => NAME.test(name) && name in state.variables);
    if (exported.length > 0) lines.push(`export ${exported.join(' ')}`);
    lines.push(...state.declarations);
    const on = state.shopts.filter((name) => !baselineShopts.includes(name));
    const off = baselineShopts.filter((name) => !state.shopts.includes(name));
    if (state.shopts.length > 0 && on.length > 0) lines.push(`shopt -s ${on.join(' ')}`);
    if (state.shopts.length > 0 && off.length > 0) lines.push(`shopt -u ${off.join(' ')}`);
    const options = state.options.filter((option) => OPTIONS.includes(option));
    if (options.length > 0) lines.push(`set ${options.map((option) => `-o ${option}`).join(' ')}`);
    return lines;
  };

  // `$?` as the last line left it, even under errexit.
  const statusOf = (state: ShellState) => `(exit ${state.status}) && ${hidden('__cv_ok')}`;

  const checkpoint = (last: boolean) => `${hidden('__cv_begin')} "$?"${last ? ' last' : ''}\n{ builtin declare -F; builtin declare -p; } | ${hidden('__cv_read')} "$SHELLOPTS" "$BASHOPTS"\n${hidden('__cv_end')} && ${hidden('__cv_ok')}`;

  const stateFrom = (taken: Captured, before: ShellState): ShellState => {
    const variables: Record<string, string> = {};
    for (const [name, value] of taken.env) {
      if (!NAME.test(name) || OWN.has(name) || HIDDEN.test(name) || name.startsWith('BASH') || name === PIPED) continue;
      if (baseline.get(name) === value) continue;
      variables[name] = value;
    }
    const functions: Record<string, string> = {};
    for (const name of taken.functions) {
      const body = ran.get(name) ?? before.functions[name];
      if (body !== undefined && !HIDDEN.test(name)) functions[name] = body;
    }
    const count = Number(taken.env.get('#') ?? 0);
    return {
      cwd: taken.cwd,
      variables,
      exported: taken.exported.filter((name) => name in variables),
      functions,
      options: OPTIONS.filter((option) => taken.options.includes(option)),
      status: taken.status,
      unset: [...baseline.keys()].filter((name) => NAME.test(name) && !OWN.has(name) && !taken.env.has(name)),
      declarations: taken.declarations,
      positional: Array.from({ length: count }, (_, index) => taken.env.get(String(index + 1)) ?? ''),
      shopts: taken.shopts,
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
    if (status === 126 && /maximum recursion depth/.test(stderr)) return 'commands';
    // What the line printed reached 1 MB; `yes` stops at a limit with
    // status 0 (G13).
    if (new TextEncoder().encode(stdout + stderr).length >= limits.output) return 'output';
    return null;
  };

  let baselineShopts: readonly string[] = [];
  let warmed: Promise<void> | null = null;
  // The shell's own variables on a fresh line, so only the visitor's are
  // carried (research R27).
  const warm = () => {
    warmed ??= runLine({ id: 0, line: 'true', state: INITIAL_STATE, history: [] }).then(() => {
      const taken = captured as Captured | null;
      baseline = new Map(taken === null ? [] : taken.env);
      // Unset until the first `cd` (bash's `OLDPWD not set`).
      baseline.delete('OLDPWD');
      baselineShopts = taken === null ? [] : taken.shopts;
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
      return { ...base, stdout: '', stderr: `bash: ${parseMessage((error as Error).message, line)}\n`, status: 2, end: 'syntax' };
    }
    const error = syntaxError(ast);
    if (error !== null) return { ...base, stdout: '', stderr: `bash: ${parseMessage(error, line)}\n`, status: 2, end: 'syntax' };

    const warning = unterminated(ast);
    const setup = setupOf(state);
    // These can end the line as `exit` does, in a way only a check before them
    // can keep what ran (T286); elsewhere a check would change `$_` and
    // PIPESTATUS for the next statement.
    const between = ast.statements.length > 1 && (state.declarations.some((entry) => /^declare -\S*r/.test(entry)) || /readonly|declare|typeset|[\w\]]:?\?|\beval\b|\bsource\b|(^|\s)\.\s/.test(line));
    captured = null;
    finished = false;
    reading = null;
    ran.clear();
    defined.length = 0;
    const functionTexts = Object.values(state.functions);
    functions = new Set([...Object.keys(state.functions), ...Object.keys(definitions(ast))]);
    pathChanged = 'PATH' in state.variables || state.unset.includes('PATH') || /\bPATH\b/.test(line);
    const functionStatements = functionTexts.flatMap((text) => parse(text).statements as unknown[]);
    // Words for the messages, before the plugins change the tree.
    const wording = structuredClone(ast);
    reported(ast);
    const marks = (between ? ast.statements.length - 1 : 0) + 1;
    pending = {
      functions: functionStatements,
      setup: setup.flatMap((text) => parse(text).statements as unknown[]),
      status: parse(statusOf(state)).statements as unknown[],
      line: ast.statements as unknown[],
      check: (last) => parse(checkpoint(last)).statements as unknown[],
      between,
    };
    const overhead = setup.length + functionTexts.length * 2 + 2 + marks * CHECK_COMMANDS;
    const variables: Record<string, string> = Object.fromEntries(Object.entries(state.variables).filter(([name]) => NAME.test(name)));
    if (state.positional.length > 0) {
      variables['#'] = String(state.positional.length);
      state.positional.forEach((value, index) => (variables[String(index + 1)] = value));
      variables['@'] = state.positional.join(' ');
      variables['*'] = state.positional.join(' ');
    }
    // `exec` rejecting, or the script not parsing, isn't the line ending the
    // shell as `exit` and `set -e` do: the Terminal stays open (FR-021).
    let failed = false;
    let result: { stdout: string; stderr: string; exitCode: number };
    try {
      result = await bashFor(overhead).exec(':', { cwd: state.cwd, env: variables, rawScript: true });
      failed = /^bash: syntax error: /.test(result.stderr) && !finished;
    } catch (thrown) {
      failed = true;
      const { message } = thrown as Error;
      result = { stdout: '', stderr: `${message.startsWith('bash: ') ? '' : 'bash: '}${message}\n`, exitCode: 1 };
    }
    pending = null;
    const unwritten = fs.takeFull().map((target) => `bash: ${target}: No space left on device\n`).join('');
    const taken = captured as Captured | null;
    const fatal = result.stderr.includes(FATAL);
    const stderr = arithmeticWording(fs
      .plainText(`${warning}${result.stderr}${unwritten}`)
      .split('\n')
      .filter((entry) => !/^\++ .*(__cv_(?!to)|builtin declare -[Fp]$)|^\++ builtin unset -v|^\+ \(?exit \d+\)?$/i.test(entry))
      .map((entry) => entry.replace(/^(\++ )builtin (cd --|eval|source|\.) /, (_, lead: string, word: string) => `${lead}${word === 'cd --' ? 'cd' : word} `))
      .map((entry) => entry.replace(/^bash: eval: (Parse error at .*)$/, (_, message: string) => `bash: eval: ${parseMessage(message, '')}`))
      // A command only just-bash's Node build has is unknown, as in bash
      // (research G17).
      .map((entry) => entry.replace(/^bash: (\S+): command not available in browser environments\..*$/, 'bash: $1: command not found'))
      .join('\n')
      .replace(GROUP_MESSAGE, '$1bash: $2\n'), wording);
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
    if (finished) return { ...shared, effects: record.effects, status: taken!.status, end: 'done', state: stateFrom(taken!, state) };
    // Ended by an error that leaves an interactive bash open (FR-021, T286):
    // what ran up to the last check stays.
    if (failed || fatal || FATAL_MESSAGE.test(stderr)) return { ...shared, effects: record.effects, status: result.exitCode, end: 'done', state: { ...(taken === null ? state : stateFrom(taken, state)), status: result.exitCode } };
    return { ...shared, effects: record.effects, status: result.exitCode, end: 'exited', state };
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
