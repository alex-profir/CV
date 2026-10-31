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
import { CLEARED, FATAL, HOME, MARK, OPENING, TerminalFs, WROTE } from './fs.ts';
import { INITIAL_STATE, QUOTA } from './protocol.ts';
import type { CompleteRequest, Completion, Limit, RunRequest, RunResult, ShellOption, ShellState, VisitorFiles, WriteOutcome, WriteRequest } from './protocol.ts';
import { PIPED, RENAMED, SCREEN_COMMANDS, siteCommands, TYPED } from './site-commands.ts';
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

const OPTIONS: readonly ShellOption[] = ['errexit', 'nounset', 'pipefail', 'noglob', 'noclobber', 'xtrace', 'allexport', 'verbose'];

// The shell's own variables, left to it (research R27).
const OWN = new Set(['PWD', 'SHELLOPTS', 'BASHOPTS', 'LINENO', 'RANDOM', 'SECONDS', 'PIPESTATUS', 'FUNCNAME', 'PPID', 'UID', 'EUID', 'BASHPID', 'OPTIND', 'OPTARG', '_']);

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

// The adapter's own variables and commands (T299): no other name holds MARK.
const isOwn = (name: string) => name.startsWith(MARK);
const WORDS = `${MARK}a`;
const TARGET = `${MARK}to`;
const COMMAND = `${MARK}w`;
const LAST = `${MARK}l`;

// just-bash's errors that end a line and, in an interactive bash, nothing else.
const FATAL_MESSAGE = /(^|\n)bash: \S+: readonly variable\n$/;

// Errors a group reports by their message alone; the line's group stops at one.
const GROUP_MESSAGE = /(^|\n)(\S+: unbound variable|.*: bad substitution)\n$/;

type Captured = { status: number; functions: string[]; declarations: string[]; options: string[]; shopts: string[]; cwd: string; env: Map<string, string>; exported: string[]; last: string; pipes: number[]; stack: string[] };

// A value at least this long isn't listed by the checkpoint's `declare -p`:
// what that prints counts towards the line's output.
const LISTED = 65_536;

// What the checkpoint runs and the prelude adds, on top of a line's 10,000
// commands.
const CHECK_COMMANDS = 8;

// bash's builtins that just-bash runs as commands, so found only on PATH.
const PATH_BUILTINS = new Set(['echo', 'printf', 'pwd', 'true', 'false', 'test', '[']);

// The builtins that answer `--help` in bash with their `help` text (T294).
const HELPED_BUILTINS = new Set(['.', 'break', 'builtin', 'cd', 'command', 'compgen', 'complete', 'continue', 'declare', 'dirs', 'eval', 'exec', 'exit', 'export', 'getopts', 'hash', 'help', 'let', 'local', 'mapfile', 'popd', 'pushd', 'pwd', 'read', 'readarray', 'readonly', 'return', 'set', 'shift', 'shopt', 'source', 'type', 'typeset', 'unset', 'wait', 'history']);

// The output redirects, of `WRITES`, a command can have.
const WRITES = new Set(['>', '>>', '>|', '&>', '&>>', '>&']);

// Whether a command's own redirects send its output to a file (T303).
const redirectsOutput = (node: AstNode) => Array.isArray(node.redirections) && (node.redirections as Redirection[]).some((redirection) => WRITES.has(redirection.operator) && (redirection.fd === null || redirection.fd === 1));

// Every node of an AST, depth first, with whether its output goes somewhere
// other than the screen: into a pipe, a `$(…)` or a file.
function walk(node: unknown, visit: (node: AstNode, piped: boolean) => void, outer = false) {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit, outer);
    return;
  }
  if (node === null || typeof node !== 'object') return;
  const typed = node as AstNode;
  const piped = outer || redirectsOutput(typed);
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
const hidden = (name: string) => `/usr/bin/${name.startsWith(MARK) ? name : `${MARK}${name}`}`;

type Tools = { parse: Parse; serialize: (node: unknown) => string; done: WeakSet<object>; builtinHelp: () => boolean };

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

// A word's text when no expansion can change it: `help`, `"help"`, `\\help`.
function staticWord(word: { parts?: AstNode[] } | null | undefined): string | null {
  if (word?.parts === undefined) return null;
  let text = '';
  for (const part of word.parts) {
    if (part.type === 'Literal' || part.type === 'SingleQuoted' || part.type === 'Escaped') text += part.value as string;
    // `[`, the command.
    else if (part.type === 'Glob' && part.pattern === '[') text += '[';
    else if (part.type === 'DoubleQuoted') {
      const inner = staticWord({ parts: part.parts as AstNode[] });
      if (inner === null) return null;
      text += inner;
    } else return null;
  }
  return text;
}

// A command as `type` shows it, carried through a rewrite in the first word.
const typedWord = (text: string) => encodeURIComponent(text).replace(/[!'()*~]/g, (char) => `%${char.charCodeAt(0).toString(16)}`);

// A name that only an expansion gives: split and globbed as bash does, then
// run under the name the site's commands have (T297, T304). just-bash takes
// the name whole, and runs a first argument as the command when it is empty.
function rewriteExpanded(node: AstNode, piped: boolean, tools: Tools) {
  const typed = typedWord(tools.serialize({ ...node, assignments: [] }));
  const { statements } = tools.parse(`${hidden('hold')} "$?" ${typed} "$_" && ((1)); ${WORDS}=(); ${hidden('name')} ${piped ? 1 : 0} "\${${WORDS}[@]:0:1}" && ((1)); \${${COMMAND}} "\${${WORDS}[@]:1}"; ${CLEAN_UP}`);
  const words = [node.name, ...(node.args as unknown[])];
  const [, , , run] = statements.flatMap((statement) => statement.pipelines[0]!.commands) as AstNode[];
  for (const statement of statements) for (const pipeline of statement.pipelines) for (const command of pipeline.commands) if (Array.isArray(command.assignments?.[0]?.array)) command.assignments[0]!.array = words;
  Object.assign(run!, { assignments: node.assignments, redirections: node.redirections });
  tools.done.add(run!);
  for (const key of Object.keys(node)) delete node[key];
  Object.assign(node, { type: 'Group', body: statements, redirections: [] });
}

// The builtins the adapter finishes for just-bash (T287, T289, T294), and
// PATH's (T286). Each is a literal name the visitor hasn't redefined.
function rewriteBuiltin(node: AstNode, word: string | null, defined: ReadonlySet<string>, pathChanged: boolean, tools: Tools) {
  if (word === null || defined.has(word)) return;
  const args = node.args as { parts: { type: string; value?: string }[] }[];
  const first = args[0]?.parts.length === 1 && args[0]!.parts[0]!.type === 'Literal' ? args[0]!.parts[0]!.value : undefined;
  if (first === '--help' && HELPED_BUILTINS.has(word)) {
    node.name = literalWord(hidden('usage'));
    node.args = [literalWord(word)];
    return;
  }
  if (pathChanged && PATH_BUILTINS.has(word)) node.name = literalWord(`/usr/bin/${word}`);
  if ((node.assignments as { name: string }[]).some((assignment) => assignment.name !== PIPED)) return;
  const template = word === 'cd' ? CD_TEMPLATE : word === 'eval' || word === 'source' || word === '.' ? sawTemplate(word) : null;
  if (template === null) return;
  // The command as typed is the first word, for `type` to print (`plainText`).
  const typed = typedWord(tools.serialize({ ...node, assignments: [] }));
  const { statements } = tools.parse(`${hidden('hold')} "$?" ${typed} "$_" && ((1)); ${template}`);
  // The words are expanded once, into an array, as they may have effects.
  for (const statement of statements) for (const pipeline of statement.pipelines) for (const command of pipeline.commands) if (Array.isArray(command.assignments?.[0]?.array)) command.assignments[0]!.array = args;
  const redirections = node.redirections;
  for (const key of Object.keys(node)) delete node[key];
  Object.assign(node, { type: 'Group', body: statements, redirections });
}

// What the groups below end with: `$?`, `$_` and PIPESTATUS kept past the
// clean-up.
const CLEAN_UP = `${hidden('keep')} "$?" "$_" "\${PIPESTATUS[@]}"; builtin unset -v ${WORDS} ${TARGET} ${COMMAND} ${TYPED} ${PIPED}; ${hidden('after')} "$${LAST}"`;

// `cd`: the check decides as bash does, the builtin moves (T287).
const CD_TEMPLATE = `${WORDS}=(); ${hidden('cd')} "\${${WORDS}[@]}" && builtin cd -- "$${TARGET}"; ${CLEAN_UP}`;

// `eval` and `source`: the check reads the text for the functions it defines,
// which just-bash can't print (T289, G10), leaving `$?` as it was for the text.
const sawTemplate = (word: string) => `${WORDS}=(); ${hidden('saw')} ${word === 'eval' ? 'eval' : 'source'} "\${${WORDS}[@]}" && ((1)); builtin ${word} "\${${WORDS}[@]}"; ${CLEAN_UP}`;

// The site's part of every run (research R29): the site's commands under
// the names the shell runs them by, in any case wherever a command can stand
// (FR-007), unless the visitor's function has that name; and each command
// whose output goes into a pipe marked, so it prints text there and no block.
function sitePlugin(functions: () => ReadonlySet<string>, pathChanged: () => boolean, tools: Tools): Plugin {
  return {
    name: 'cv-site',
    transform(context) {
      const defined = functions();
      walk(context.ast, (node, piped) => {
        if (node.type === 'ParameterExpansion') markFatal(node);
        if (node.type === 'Word' && Array.isArray(node.parts)) expandTildePlus(node);
        if (node.type !== 'SimpleCommand' || tools.done.has(node)) return;
        const name = node.name as { parts?: AstNode[] } | null;
        if (name === null) return;
        const word = staticWord(name);
        if (word === null) return rewriteExpanded(node, piped, tools);
        const assignments = node.assignments as unknown[];
        const mark = (assignment: string, value: string) => assignments.unshift({ type: 'Assignment', name: assignment, value: literalWord(value), append: false, array: null });
        // `command help` and `builtin help` reach the site's too (T304).
        if ((word === 'command' || word === 'builtin') && !defined.has(word) && !tools.builtinHelp()) renameFirstArgument(node, word);
        if (!defined.has(word) && rewriteBashBuiltin(node, word)) return;
        const lower = word.toLowerCase();
        const site = commandNamed(word) !== null && !defined.has(word);
        if (site) {
          // Replies name the word as typed (FR-017).
          if (lower !== word) mark(TYPED, word);
          node.name = literalWord(RENAMED[lower] ?? lower);
        }
        if (piped) {
          // A function isn't given the mark: all it runs would see it.
          if (defined.has(word)) return runPiped(node, tools);
          if (SCREEN_COMMANDS.has(site ? lower : word)) mark(PIPED, '1');
        }
        rewriteBuiltin(node, word, defined, pathChanged(), tools);
      });
      return { ast: context.ast };
    },
  };
}

const INTEGER_TESTS = new Set(['-eq', '-ne', '-lt', '-le', '-gt', '-ge']);

// bash's builtins, where just-bash's differ and the adapter can run them
// itself (T305). True when `node` was rewritten.
function rewriteBashBuiltin(node: AstNode, word: string): boolean {
  const args = node.args as { parts?: AstNode[] }[];
  const words = args.map((arg) => staticWord(arg));
  const to = (name: string, list: unknown[] = args) => {
    node.name = literalWord(hidden(name));
    node.args = list;
    return true;
  };
  if (word === 'export' && words[0] === '-f') return to('export-f', args.slice(1));
  if (word === 'set' && words.length === 1 && (words[0] === '-o' || words[0] === '+o')) return to('set-o', [literalWord(words[0]), { type: 'Word', parts: [{ type: 'DoubleQuoted', parts: [{ type: 'ParameterExpansion', parameter: 'SHELLOPTS', operation: null }] }] }]);
  if ((word === 'test' || word === '[') && words.some((each) => each !== null && INTEGER_TESTS.has(each))) return to('integer-test', [literalWord(word), ...args]);
  return false;
}

// `break`, `continue` and `return` where bash says they mean nothing: the
// ones no loop or function holds in the line itself (T305).
function markOutOfPlace(node: unknown, inLoop = false, inFunction = false) {
  if (Array.isArray(node)) {
    for (const child of node) markOutOfPlace(child, inLoop, inFunction);
    return;
  }
  if (node === null || typeof node !== 'object') return;
  const typed = node as AstNode;
  if (typed.type === 'SimpleCommand') {
    const word = staticWord(typed.name as never);
    const help = staticWord((typed.args as never[])[0]) === '--help';
    if (!help && (((word === 'break' || word === 'continue') && !inLoop && !inFunction) || (word === 'return' && !inFunction))) {
      typed.name = literalWord(hidden('out-of-place'));
      typed.args = [literalWord(word)];
    }
    return;
  }
  const loop = inLoop || typed.type === 'For' || typed.type === 'CStyleFor' || typed.type === 'While' || typed.type === 'Until';
  const inside = inFunction || typed.type === 'FunctionDef';
  for (const [key, value] of Object.entries(typed)) if (key !== 'type') markOutOfPlace(value, loop, inside);
}

// `~+` and `~+/x`: the working folder (T305).
function expandTildePlus(word: AstNode) {
  const parts = word.parts as AstNode[];
  const first = parts[0];
  if (first?.type !== 'Literal' || !/^~\+(\/|$)/.test(first.value as string)) return;
  word.parts = [{ type: 'DoubleQuoted', parts: [{ type: 'ParameterExpansion', parameter: 'PWD', operation: null }] }, ...((first.value as string).length > 2 ? [{ type: 'Literal', value: (first.value as string).slice(2) }] : []), ...parts.slice(1)];
}

// `command help` and `builtin help`: the site's command by its name there.
function renameFirstArgument(node: AstNode, word: string) {
  const args = node.args as { parts?: AstNode[] }[];
  const at = args.findIndex((arg) => !/^-/.test(staticWord(arg) ?? ''));
  const typed = at < 0 ? null : staticWord(args[at]);
  if (typed === null || typed === undefined) return;
  const renamed = RENAMED[typed.toLowerCase()];
  if (renamed !== undefined) {
    args[at] = literalWord(renamed) as never;
    // `builtin` takes builtins only; this is a command now.
    node.name = literalWord('command');
  } else if (word === 'command' && commandNamed(typed) !== null) args[at] = literalWord(typed.toLowerCase()) as never;
}

// A function whose output goes into a pipe: the site's commands in it print
// text there, by a count no variable holds (T299).
function runPiped(node: AstNode, tools: Tools) {
  const statement = (command: unknown) => ({ type: 'Statement', pipelines: [{ type: 'Pipeline', commands: [command], negated: false, timed: false, timePosix: false }], operators: [], background: false });
  const call = (name: string, args: unknown[]) => ({ type: 'SimpleCommand', name: literalWord(hidden(name)), args, assignments: [], redirections: [] });
  const command = { ...node, redirections: [] };
  const redirections = node.redirections;
  tools.done.add(command);
  for (const key of Object.keys(node)) delete node[key];
  Object.assign(node, { type: 'Group', body: [statement(call('piped-on', [])), statement(command), statement(call('piped-off', LAST_RESULT()))], redirections });
}

// `$?` and `$_` as arguments, to end a group with them.
const LAST_RESULT = () => [{ type: 'Word', parts: [{ type: 'ParameterExpansion', parameter: '?', operation: null }] }, { type: 'Word', parts: [{ type: 'DoubleQuoted', parts: [{ type: 'ParameterExpansion', parameter: '_', operation: null }] }] }];

// The redirect check, until just-bash's G1 fix is released (research R28, G1;
// T129's upstream issue): just-bash rejects `exec` when the file system
// refuses `>`, `>>`, `>|`, `&>` or `&>>`, and ends the whole line, where bash
// says why and fails that command alone. It only reports the refusal of a
// redirect to a descriptor above 2. So each output redirect first opens its
// target on `CHECK_FD`, marked OPENING: the file system answers for that
// target without creating it, in the redirects' order and as the target
// expands when the command runs. A write past the 1 MB limit is only known
// after the command, so the `wrote` command follows it and gives its status. Delete
// this plugin, OPENING and `wrote` once the fix ships (plan,
// Dependencies).
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
      const wrote = { type: 'SimpleCommand', name: literalWord(hidden(WROTE)), args: LAST_RESULT(), assignments: [], redirections: [] };
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

// What `set -x` prints of the adapter's own: a mark on a command goes, and a
// line of nothing else.
const MARK_ASSIGNMENT = new RegExp(`^(\\++ )(?:${MARK}\\w*=\\S* )+`);
const TRACED_OWN = new RegExp(`^\\++ .*${MARK}(?!to)|^\\++ builtin (?:declare -[Fp]|dirs -l -p)$|^\\++ builtin unset -v|^\\++ \\(\\(.*\\)\\)$`);

// bash's `set -o`, on in a shell that runs a line, whatever else is set.
const ALWAYS_ON = ['braceexpand', 'hashall', 'interactive-comments'];
const SET_OPTIONS = ['allexport', 'braceexpand', 'emacs', 'errexit', 'errtrace', 'functrace', 'hashall', 'histexpand', 'history', 'ignoreeof', 'interactive-comments', 'keyword', 'monitor', 'noclobber', 'noexec', 'noglob', 'nolog', 'notify', 'nounset', 'onecmd', 'physical', 'pipefail', 'posix', 'privileged', 'verbose', 'vi', 'xtrace'];

// What's left of a run's output after the last `clear` in it (T298).
const afterClear = (text: string) => text.slice(text.lastIndexOf(CLEARED) + 1);

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
  let record: RunRecord = { line: '', history: [], shell: 'desktop', recorded: [], effects: [], pipe: null, pipedFunctions: 0, builtinHelp: false };
  // The last checkpoint the line reached, and whether it was the one after
  // the line (T286).
  let captured: Captured | null = null;
  let finished = false;
  let baseline = new Map<string, string>();
  let lastFiles = JSON.stringify({ folders: [], files: {}, bytes: 0 });

  // The checkpoint's three steps, which run as commands of the shell: the
  // status, `$_`, PIPESTATUS, the working folder and the variables; then, from
  // a pipe, the stack, the functions and what `declare -p` lists, with the
  // settings; then all that `$?`, `$_` and PIPESTATUS were, again (research R27).
  let reading: { taken: Captured; held: [string, string][]; last: boolean } | null = null;
  const quiet = (exitCode = 0) => ({ stdout: '', stderr: '', exitCode });
  // A command's result that sets PIPESTATUS, as just-bash's own restore does.
  const resulting = (exitCode: number, pipes: readonly number[]) => ({ ...quiet(exitCode), ...(pipes.length > 0 ? { internalPipeStatusOverride: [...pipes] } : {}) });
  const own = (name: string, run: Parameters<typeof defineCommand>[1]) => defineCommand(`${MARK}${name}`, run);
  const cvBegin = own('begin', async (args, ctx) => {
    const [status, position, last = '', ...pipes] = args;
    const held = [...ctx.env].filter(([, value]) => value.length >= LISTED);
    const taken: Captured = { status: Number(status ?? 0), functions: [], declarations: [], options: [], shopts: [], cwd: ctx.cwd, env: new Map(ctx.env), exported: Object.keys(ctx.exportedEnv ?? {}), last, pipes: pipes.map(Number), stack: [] };
    for (const [name] of held) ctx.env.delete(name);
    ctx.env.set(LAST, last.length < LISTED ? last : '');
    reading = { taken, held, last: position === 'last' };
    return quiet();
  });
  const cvRead = own('read', async (args, ctx) => {
    const { taken } = reading!;
    const lines = new TextDecoder().decode(Uint8Array.from(String(ctx.stdin), (char) => char.charCodeAt(0))).split('\n');
    const end = lines.findIndex((entry) => entry.startsWith('declare '));
    taken.stack = lines.slice(1, end < 0 ? lines.length : end).filter((entry) => entry !== '');
    taken.functions = lines.flatMap((entry) => /^declare -f (\S+)$/.exec(entry.trim())?.slice(1) ?? []);
    taken.declarations = lines.filter((entry) => {
      const match = /^declare -(\S+) ([^=\s]+)/.exec(entry);
      return match !== null && /[^x-]/.test(match[1]!) && match[1] !== 'f' && NAME.test(match[2]!) && !OWN.has(match[2]!) && !isOwn(match[2]!);
    });
    taken.options = (args[0] ?? '').split(':');
    taken.shopts = (args[1] ?? '').split(':').filter((name) => name !== '');
    return quiet();
  });
  const cvEnd = own('end', async (_args, ctx) => {
    const { taken, held, last } = reading!;
    for (const [name, value] of held) ctx.env.set(name, value);
    ctx.env.delete(LAST);
    captured = taken;
    finished = last;
    return resulting(taken.status, taken.pipes);
  });
  const cvOk = own('ok', async () => quiet());
  // The prelude's last: `$?` and PIPESTATUS as the last line left them, and
  // `$_` by its argument (T299, T305).
  let starting: ShellState = INITIAL_STATE;
  const cvStart = own('start', async () => resulting(starting.status, starting.pipes));
  // `<builtin> --help`: `help <builtin>`'s text, with bash's status (T294).
  const cvUsage = own('usage', async (args, ctx) => {
    const help = commands.find((command) => command.name === RENAMED.help)!;
    return { ...(await help.execute(args, ctx)), exitCode: 2 };
  });

  // `$?` kept across the commands the adapter runs around a builtin.
  let heldStatus = 0;
  let heldPipes: number[] = [];
  const cvHold = own('hold', async (args) => {
    heldStatus = Number(args[0] ?? 0);
    return quiet(heldStatus);
  });
  const cvKeep = own('keep', async (args, ctx) => {
    const [status, last = '', ...pipes] = args;
    heldStatus = Number(status ?? 0);
    heldPipes = pipes.map(Number);
    ctx.env.set(LAST, last);
    return quiet();
  });
  // An eval whose text doesn't parse: bash's status 2, where just-bash says 1.
  let evalFailed = false;
  const cvAfter = own('after', async (_args, ctx) => {
    const status = evalFailed ? 2 : heldStatus;
    evalFailed = false;
    ctx.env.delete(LAST);
    return resulting(status, evalFailed ? [] : heldPipes);
  });
  // A name from an expansion: the one the shell runs it by (T297, T304).
  const cvName = own('name', async (args, ctx) => {
    const [piping, word = ''] = args;
    const lower = word.toLowerCase();
    const known = functions.has(word) || ran.has(word);
    const site = !known && commandNamed(word) !== null;
    if (site && lower !== word) ctx.env.set(TYPED, word);
    ctx.env.set(COMMAND, site ? (RENAMED[lower] ?? lower) : word);
    if (piping === '1' && (known || SCREEN_COMMANDS.has(site ? lower : word))) ctx.env.set(PIPED, '1');
    return quiet(heldStatus);
  });
  // `export -f`: nothing runs in a child here, so a function need only exist.
  const cvExportF = own('export-f', async (args) => {
    const missing = args.filter((name) => !functions.has(name) && !ran.has(name));
    return { stdout: '', stderr: missing.map((name) => `bash: export: ${name}: not a function\n`).join(''), exitCode: missing.length > 0 ? 1 : 0 };
  });
  // `set -o` and `set +o`, with bash's spacing and bash's always-on options.
  const cvSetO = own('set-o', async (args) => {
    const on = new Set([...(args[1] ?? '').split(':'), ...ALWAYS_ON]);
    const stdout = SET_OPTIONS.map((name) => (args[0] === '-o' ? `${name.padEnd(15)}\t${on.has(name) ? 'on' : 'off'}\n` : `set ${on.has(name) ? '-' : '+'}o ${name}\n`)).join('');
    return { stdout, stderr: '', exitCode: 0 };
  });
  // `test` and `[` with an integer operator: bash's errors, which just-bash
  // doesn't give.
  const cvIntegerTest = own('integer-test', async (args, ctx) => {
    const [word, ...rest] = args as [string, ...string[]];
    const fail = (message: string) => ({ stdout: '', stderr: `bash: ${word}: ${message}\n`, exitCode: 2 });
    if (word === '[' && rest.pop() !== ']') return fail("missing `]'");
    const [left, operator, right] = rest;
    if (rest.length === 3 && left !== undefined && right !== undefined && INTEGER_TESTS.has(operator!)) {
      const bad = [left, right].find((each) => !/^\s*[-+]?\d+\s*$/.test(each));
      if (bad !== undefined) return fail(`${bad}: integer expected`);
      const [a, b] = [BigInt(left.trim()), BigInt(right.trim())];
      const holds = { '-eq': a === b, '-ne': a !== b, '-lt': a < b, '-le': a <= b, '-gt': a > b, '-ge': a >= b }[operator!];
      return quiet(holds === true ? 0 : 1);
    }
    const result = await ctx.exec!(`builtin test ${rest.map((each) => `'${each.replaceAll("'", `'\\''`)}'`).join(' ')}`, { cwd: ctx.cwd });
    return { ...result, stderr: result.stderr.replace(/^(?:bash: )?test: /m, `bash: ${word}: `) };
  });
  const cvOutOfPlace = own('out-of-place', async (args) => {
    const word = args[0]!;
    if (word === 'return') return { stdout: '', stderr: "bash: return: can only `return' from a function or sourced script\n", exitCode: 2 };
    return { stdout: '', stderr: `bash: ${word}: only meaningful in a \`for', \`while', or \`until' loop\n`, exitCode: 0 };
  });
  const cvPipedOn = own('piped-on', async () => {
    record.pipedFunctions += 1;
    return quiet();
  });
  const cvPipedOff = own('piped-off', async (args) => {
    record.pipedFunctions -= 1;
    return quiet(Number(args[0] ?? 0));
  });

  // `eval` and `source`: the functions their text defines (T289).
  const ran = new Map<string, string>();
  const cvSaw = own('saw', async (args, ctx) => {
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
  const cvDefined = own('def', async (args) => {
    const [name, id] = args;
    if (name !== undefined) ran.set(name, defined[Number(id)] ?? '');
    return quiet();
  });

  // `cd` as bash decides it (T287): too many operands, OLDPWD or HOME unset,
  // and `..` going up from a folder that has gone.
  const cvCd = own('cd', async (args, ctx) => {
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
    ctx.env.set(TARGET, to);
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
      customCommands: [...commands, cvBegin, cvRead, cvEnd, cvOk, cvStart, cvUsage, cvHold, cvKeep, cvAfter, cvName, cvExportF, cvSetO, cvIntegerTest, cvOutOfPlace, cvPipedOn, cvPipedOff, cvSaw, cvDefined, cvCd, cvWrote],
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
    bash.registerTransformPlugin(sitePlugin(() => functions, () => pathChanged, { parse: parseOwn as unknown as Parse, serialize, done: new WeakSet(), builtinHelp: () => record.builtinHelp }));
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
  // Text of the adapter's: `set -v` doesn't print it (T299).
  const parseOwn = (text: string): Script => {
    const script = parse(text);
    walk(script, (node) => {
      delete node.sourceText;
    });
    return script;
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
      const report = { type: 'SimpleCommand', name: literalWord(hidden('def')), args: [literalWord(node.name as string), literalWord(String(id)), LAST_RESULT()[1]], assignments: [], redirections: [] };
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

  // `$?`, `$_` and PIPESTATUS as the last line left them, even under errexit:
  // `((1))` changes none of them.
  const statusOf = (state: ShellState) => {
    const script = parseOwn(`${hidden('start')} x && ((1))`);
    const start = (script.statements as unknown as { pipelines: { commands: AstNode[] }[] }[])[0]!.pipelines[0]!.commands[0]!;
    start.args = [{ type: 'Word', parts: [{ type: 'SingleQuoted', value: state.last }] }];
    return script.statements as unknown[];
  };

  const checkpoint = (last: boolean) => `${hidden('begin')} "$?" ${last ? 'last' : 'mid'} "$_" "\${PIPESTATUS[@]}"\n{ builtin dirs -l -p; builtin declare -F; builtin declare -p; } | ${hidden('read')} "$SHELLOPTS" "$BASHOPTS"\n${hidden('end')} "$${LAST}" && ((1))`;

  const stateFrom = (taken: Captured, before: ShellState): ShellState => {
    const variables: Record<string, string> = {};
    for (const [name, value] of taken.env) {
      if (!NAME.test(name) || OWN.has(name) || isOwn(name) || name.startsWith('BASH')) continue;
      if (baseline.get(name) === value) continue;
      variables[name] = value;
    }
    const functions: Record<string, string> = {};
    for (const name of taken.functions) {
      const body = ran.get(name) ?? before.functions[name];
      if (body !== undefined) functions[name] = body;
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
      last: taken.last,
      pipes: taken.pipes,
      stack: taken.stack,
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
    record = { line: request.line, history: request.history, shell: request.shell ?? 'desktop', recorded: [], effects: [], pipe: null, pipedFunctions: 0, builtinHelp: false };
    if (request.line.trim() === '') return { ...base, stdout: '', stderr: '', status: state.status, end: 'done' };
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
    // An error can end the line as `exit` does (T286), and a limit stop it
    // anywhere (T310): only a check before that can keep what ran. A check
    // leaves `$?`, `$_` and PIPESTATUS as it found them.
    const between = ast.statements.length > 1;
    captured = null;
    finished = false;
    reading = null;
    ran.clear();
    defined.length = 0;
    const functionTexts = Object.values(state.functions);
    functions = new Set([...Object.keys(state.functions), ...Object.keys(definitions(ast))]);
    pathChanged = 'PATH' in state.variables || state.unset.includes('PATH') || /\bPATH\b/.test(line);
    const functionStatements = functionTexts.flatMap((text) => parseOwn(text).statements as unknown[]);
    starting = state;
    // Words for the messages, before the plugins change the tree.
    const wording = structuredClone(ast);
    reported(ast);
    markOutOfPlace(ast);
    // bash prints a line under `set -v` when it reads it, whole.
    walk(ast, (node) => {
      delete node.sourceText;
    });
    const verbose = state.options.includes('verbose') ? `${line}\n` : '';
    const marks = (between ? ast.statements.length - 1 : 0) + 1;
    pending = {
      functions: functionStatements,
      setup: setup.flatMap((text) => parseOwn(text).statements as unknown[]),
      status: statusOf(state),
      line: ast.statements as unknown[],
      check: (last) => parseOwn(checkpoint(last)).statements as unknown[],
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
      const bash = bashFor(overhead);
      // The one piece of just-bash's state a run can't set otherwise: the
      // stack has no command that sets it whole (T305, research R27).
      (bash as unknown as { state: { directoryStack?: string[] } }).state.directoryStack = [...state.stack];
      result = await bash.exec(':', { cwd: state.cwd, env: variables, rawScript: true });
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
      .plainText(afterClear(`${verbose}${warning}${result.stderr}${unwritten}`))
      .split('\n')
      .map((entry) => entry.replace(MARK_ASSIGNMENT, '$1'))
      .filter((entry) => !TRACED_OWN.test(entry))
      .map((entry) => entry.replace(/^(\++ )builtin (cd --|eval|source|\.) /, (_, lead: string, word: string) => `${lead}${word === 'cd --' ? 'cd' : word} `))
      // bash says nothing of a shift past the end, and names itself on `[`'s
      // and `test`'s errors (T305).
      .filter((entry) => entry !== 'bash: shift: shift count out of range')
      .map((entry) => entry.replace(/^\[: /, 'bash: [: ').replace(/^test: /, `bash: ${/(^|[\s;|&(])\[\s/.test(line) ? '[' : 'test'}: `))
      .map((entry) => entry.replace(/^bash: eval: (Parse error at .*)$/, (_, message: string) => `bash: eval: ${parseMessage(message, '')}`))
      // A command only just-bash's Node build has is unknown, as in bash
      // (research G17).
      .map((entry) => entry.replace(/^bash: (\S+): command not available in browser environments\..*$/, 'bash: $1: command not found'))
      .join('\n')
      .replace(GROUP_MESSAGE, '$1bash: $2\n'), wording);
    const stdout = afterClear(fs.plainText(result.stdout));
    fs.endLine();
    const limit = limitOf(stdout, stderr, result.exitCode);
    const files = await filesChanged();
    const shared = { id, stdout, stderr, recorded: record.recorded, ...(files === undefined ? {} : { files }) };
    // Stopped by the output limit, the line shows none of what it printed,
    // only the stopped line (research G14), so a megabyte of text never
    // reaches the screen.
    // What ran up to the last check stays, as bash stopped with Ctrl+C keeps it
    // (T310).
    const stopped = taken === null ? state : stateFrom(taken, state);
    if (limit === 'output') return { ...shared, stdout: '', stderr: '', recorded: [], effects: [], status: result.exitCode, end: 'limit', limit, state: stopped };
    if (limit !== null) return { ...shared, effects: [], status: result.exitCode, end: 'limit', limit, state: stopped };
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
        variables: Object.fromEntries([...baseline].filter(([name]) => NAME.test(name) && !isOwn(name))),
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
