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
import { CASE_MARK, CHECK_FILE, CLEARED, FATAL, GONE, HOME, MARK, OPENING, TerminalFs, WROTE } from './fs.ts';
import { INPUT_FILE, OUTPUT_FILE } from './gnu.ts';
import { INITIAL_STATE, QUOTA } from './protocol.ts';
import type { CompleteRequest, Completion, Limit, RunRequest, RunResult, ShellOption, ShellState, VisitorFiles, WriteOutcome, WriteRequest } from './protocol.ts';
import { PIPED, RENAMED, SCREEN_COMMANDS, siteCommands, TYPED } from './site-commands.ts';
import type { RunRecord } from './site-commands.ts';
import { NAMED_NOT_RUN, SHELL_BUILTINS, SHELL_KEYWORDS, STANDARD_COMMANDS } from './standard.ts';

type Script = ReturnType<Bash['transform']>['ast'];
type Plugin = Parameters<Bash['registerTransformPlugin']>[0];
type AstNode = { type: string; [key: string]: unknown };

const ENV = { HOME, USER: 'guest', LOGNAME: 'guest', SHELL: '/bin/bash', SHLVL: '1' };

// FR-069's limits: the spec's numbers, not design values (research R33).
// `output` is what the line prints; `pipe`, all its commands may pass on
// inside it, so `seq 1000000 | wc -l` runs as in bash (T325).
export const LIMITS = { time: 5000, commands: 10_000, output: QUOTA, pipe: 32 * QUOTA };

export type Limits = typeof LIMITS;

// just-bash's other limits, which bash doesn't have: out of reach, so FR-069's
// three are what stop a line (research R33, G15, T315). Recursion runs into the
// limit on commands, the one bash's line would meet here, not a depth bash
// doesn't have (T286).
const UNREACHED = { maxLoopIterations: 1_000_000_000, maxAwkIterations: 1_000_000_000, maxSedIterations: 1_000_000_000, maxQueryElements: 20_000_000, maxBraceExpansionResults: 20_000_000, maxArrayElements: 20_000_000, maxStringLength: 128 * 1024 * 1024, maxCallDepth: 20_000, maxSubstitutionDepth: 20_000, maxExecDepth: 20_000, maxSourceDepth: 20_000, maxWorkUnits: 1_000_000_000_000 };

// The `shopt` names just-bash keeps.
const KNOWN_SHOPTS = ['extglob', 'dotglob', 'nullglob', 'failglob', 'globstar', 'globskipdots', 'nocaseglob', 'nocasematch', 'expand_aliases', 'lastpipe', 'xpg_echo'];

const OPTIONS: readonly ShellOption[] = ['errexit', 'nounset', 'pipefail', 'noglob', 'noclobber', 'xtrace', 'allexport', 'verbose'];

// The shell's own variables, left to it (research R27).
const OWN = new Set(['PWD', 'SHELLOPTS', 'BASHOPTS', 'LINENO', 'RANDOM', 'SECONDS', 'PIPESTATUS', 'FUNCNAME', 'PPID', 'UID', 'EUID', 'BASHPID', 'OPTIND', 'OPTARG', '_', 'BASH_VERSINFO']);

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const TWO_SLASHES = /^\/\/(?!\/)/;

// The adapter's own variables and commands (T299): no other name holds MARK.
const isOwn = (name: string) => name.startsWith(MARK);
const WORDS = `${MARK}a`;
const TARGET = `${MARK}to`;
const COMMAND = `${MARK}w`;
const LAST = `${MARK}l`;

// The last thing a line stopped by one of just-bash's own limits says (T314).
export const LIMIT_WORDS = /(limit exceeded|size exceeded|exceeded maximum|too many|maximum recursion|invalid bounded allocation|Invalid string length|Maximum call stack|out of memory)[^\n]*\n?$/i;

const LIMIT_LINE = /[^\n]*\n$/;

// Errors a group reports by their message alone; the line's group stops at one.
const GROUP_MESSAGE = /(^|\n)(\S+: unbound variable|.*: bad substitution)\n$/;

type Captured = { status: number; functions: string[]; declarations: string[]; options: string[]; shopts: string[]; cwd: string; env: Map<string, string>; exported: string[]; bare: string[]; last: string; pipes: number[]; stack: string[] };

// A value at least this long isn't listed by the checkpoint's `declare -p`:
// what that prints counts towards the line's output.
const LISTED = 65_536;

// What the checkpoint runs and the prelude adds, on top of a line's 10,000
// commands.
const CHECK_COMMANDS = 8;

// What a check prints between statements, gone before anyone sees it.
const STATEMENT = `${MARK}s\n`;

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

type Tools = { parse: Parse; serialize: (node: unknown) => string; done: WeakSet<object>; builtinHelp: () => boolean; noCase: () => boolean; failGlob: () => boolean; globStar: () => boolean; setsSeconds: () => boolean; integers: () => ReadonlySet<string>; isFile: (typed: string) => boolean };

// `${x:?word}` ends the line as `exit` does in just-bash; the mark tells them
// apart (T286), and the name is bash's wording of it.
function markFatal(node: AstNode) {
  const operation = node.operation as { type: string; word: { parts: unknown[] } | null; checkEmpty: boolean } | null;
  if (operation?.type !== 'ErrorIfUnset' || typeof node.parameter !== 'string') return;
  if (node.parameter === BAD_ARITHMETIC) {
    operation.word = { type: 'Word', parts: [{ type: 'Literal', value: `${FATAL}${decodeURIComponent((operation.word!.parts[0] as { value: string }).value)}` }] } as never;
    return;
  }
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
const CD_TEMPLATE = `${WORDS}=(); ${hidden('cd')} "\${${WORDS}[@]}" && builtin cd -- "$${TARGET}" && ${hidden('slashes')} "$_"; ${CLEAN_UP}`;

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
        if (node.type === 'ParameterExpansion') {
          markFatal(node);
          countOfAll(node);
          firstCase(node, tools);
          if (node.parameter === 'SECONDS' && tools.setsSeconds()) readSeconds(node, tools);
        }
        if (node.type === 'Word' && Array.isArray(node.parts)) {
          expandTildePlus(node);
          tildeHome(node, tools);
          tildeMinus(node, tools);
          if (tools.noCase()) caselessGlob(node);
        }
        if (node.type === 'ArithmeticExpansion' && typeof (node.expression as { originalText?: string } | undefined)?.originalText === 'string') {
          const value = bigArithmetic((node.expression as { originalText: string }).originalText);
          if (value !== null) {
            for (const key of Object.keys(node)) delete node[key];
            Object.assign(node, { type: 'Literal', value });
            return;
          }
        }
        if (node.type === 'For') {
          // `for a; do` holds every parameter whole, as `in "$@"` does (T362).
          node.words ??= [allParameters()];
          if ((node.words as { parts?: AstNode[] }[]).some((word) => slashGlob(word) && !(tools.globStar() && starSlash(word)))) return wrapSlashGlobs(node, 'words', tools);
          return void listFirst(node, 'words', tools);
        }
        if (node.type === 'CommandSubstitution' && holdsNul(node.body)) return withoutNul(node, tools);
        if (node.type !== 'SimpleCommand' || tools.done.has(node)) return;
        if ((node.args as { parts?: AstNode[] }[]).some((word) => slashGlob(word) && !(tools.globStar() && starSlash(word)))) return wrapSlashGlobs(node, 'args', tools);
        if (listFirst(node, 'args', tools) || listAssigned(node, tools)) return;
        const name = node.name as { parts?: AstNode[] } | null;
        if (name === null) {
          if (floatSubscript(node, tools) || setSeconds(node, tools)) return;
          return void checkInteger(node, tools);
        }
        if (readsFolder(node, tools)) return;
        if (tools.failGlob() && stopAtFailedGlob(node, tools)) return;
        const word = staticWord(name);
        if (word === null) return rewriteExpanded(node, piped, tools);
        // Its words are expanded before its assignments apply.
        const assigned = (node.assignments as { name: string }[]).map((assignment) => assignment.name).filter((each) => each !== PIPED && each !== TYPED);
        let reads = false;
        if (assigned.length > 0) walk(node.args, (part) => {
          if (part.type === 'ParameterExpansion' && assigned.includes(part.parameter as string)) reads = true;
        });
        if (reads) return rewriteExpanded(node, piped, tools);
        if (!defined.has(word) && (rewriteDeclareF(node, word, tools) || rewriteCommandV(node, word, tools) || rewriteType(node, word, tools) || rewriteExec(node, word, tools))) return;
        const assignments = node.assignments as unknown[];
        const mark = (assignment: string, value: string) => assignments.unshift({ type: 'Assignment', name: assignment, value: literalWord(value), append: false, array: null });
        // `command help` and `builtin help` reach the site's too (T304).
        if ((word === 'command' || word === 'builtin') && !defined.has(word) && !tools.builtinHelp()) renameFirstArgument(node, word);
        if (!defined.has(word) && rewriteBashBuiltin(node, word, tools)) return;
        // `>&-`: nowhere to write (T397).
        if (!defined.has(word) && (word === 'echo' || word === 'printf') && (node.redirections as Redirection[]).some((redirection) => redirection.operator === '>&' && (redirection.fd === null || redirection.fd === 1) && staticWord(redirection.target as never) === '-')) {
          node.name = literalWord(hidden('closed-output'));
          node.args = [literalWord(word)];
          node.redirections = (node.redirections as Redirection[]).filter((redirection) => redirection.operator !== '>&');
          return;
        }
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

// What brace expansion gives past just-bash's fixed caps, which cut a list in
// silence (T315): 10,000 from a range, 100,000 in all. The adapter expands such
// a word itself, up to a list that can't be printed in FR-069's 1 MB.
const BRACE_OWN = 1000;
const BRACE_MOST = LIMITS.output;

type BraceItem = { type: 'Word'; word: { parts: AstNode[] } } | { type: 'Range'; start: string | number; end: string | number; step?: number; startStr?: string; endStr?: string };

function rangeWords(item: Extract<BraceItem, { type: 'Range' }>): string[] {
  const { start, end, startStr, endStr } = item;
  const numbers = typeof start === 'number' && typeof end === 'number';
  const [from, to] = numbers ? [start, end] : [String(start).codePointAt(0)!, String(end).codePointAt(0)!];
  const step = Math.max(1, Math.abs(item.step ?? 1));
  const pad = [startStr, endStr].some((each) => each !== undefined && /^-?0\d/.test(each)) ? Math.max(startStr?.replace(/^-/, '').length ?? 0, endStr?.replace(/^-/, '').length ?? 0) : 0;
  const words: string[] = [];
  const add = (value: number) => words.push(!numbers ? String.fromCodePoint(value) : `${value < 0 ? '-' : ''}${String(Math.abs(value)).padStart(pad, '0')}`);
  if (from <= to) for (let value = from; value <= to; value += step) add(value);
  else for (let value = from; value >= to; value -= step) add(value);
  return words;
}

const rangeCount = (item: Extract<BraceItem, { type: 'Range' }>) => {
  const [from, to] = [item.start, item.end].map((each) => (typeof each === 'number' ? each : String(each).codePointAt(0)!));
  return Math.floor(Math.abs(to! - from!) / Math.max(1, Math.abs(item.step ?? 1))) + 1;
};

const braceCount = (parts: readonly AstNode[]): number =>
  parts.reduce((total, part) => (part.type !== 'BraceExpansion' ? total : total * (part.items as BraceItem[]).reduce((sum, item) => sum + (item.type === 'Range' ? rangeCount(item) : braceCount(item.word.parts)), 0)), 1);

function braceWords(parts: readonly AstNode[]): AstNode[][] {
  let words: AstNode[][] = [[]];
  for (const part of parts) {
    const options = part.type !== 'BraceExpansion' ? [[part]] : (part.items as BraceItem[]).flatMap((item) => (item.type === 'Range' ? rangeWords(item).map((word): AstNode[] => [{ type: 'Literal', value: word }]) : braceWords(item.word.parts)));
    words = words.flatMap((word) => options.map((option) => [...word, ...option]));
  }
  return words;
}

// `stop` in place of a list too long to hold: a `$(…)`, as it may stand in any
// word.
const stopWord = () => ({ type: 'Word', parts: [{ type: 'CommandSubstitution', body: { type: 'Script', statements: [{ type: 'Statement', pipelines: [{ type: 'Pipeline', commands: [{ type: 'SimpleCommand', name: literalWord(hidden('stop')), args: [], assignments: [], redirections: [] }], negated: false, timed: false, timePosix: false }], operators: [], background: false }] }, legacy: false }] });

function expandBraces(ast: unknown) {
  const list = (words: { parts?: AstNode[] }[]) =>
    words.flatMap((word) => {
      const count = word.parts === undefined ? 1 : braceCount(word.parts);
      if (count <= BRACE_OWN) return [word];
      if (count > BRACE_MOST) return [stopWord()];
      return braceWords(word.parts!).map((parts) => ({ type: 'Word', parts: parts.every((part) => part.type === 'Literal') ? parts : structuredClone(parts) }));
    });
  walk(ast, (node) => {
    if (node.type === 'SimpleCommand') node.args = list(node.args as never);
    if (node.type === 'For' && Array.isArray(node.words)) node.words = list(node.words as never);
    if (node.type === 'Assignment' && Array.isArray(node.array)) node.array = list(node.array as never);
  });
}

// `exit` where it ends the shell, not a subshell or a pipe's part, says so first:
// only that and `set -e` close the Terminal (FR-021, T314).
function markExits(node: unknown) {
  if (Array.isArray(node)) {
    for (const child of node) markExits(child);
    return;
  }
  if (node === null || typeof node !== 'object') return;
  const typed = node as AstNode;
  if (typed.type === 'Subshell' || typed.type === 'CommandSubstitution' || typed.type === 'ProcessSubstitution') return markInnerExits(typed);
  if (typed.type === 'Pipeline' && (typed.commands as unknown[]).length > 1) return markInnerExits(typed);
  if (typed.type === 'SimpleCommand') {
    if (staticWord(typed.name as never) === 'exec') typed.ends = true;
    if (!runsExit(typed)) return;
    const statement = (command: unknown) => ({ type: 'Statement', pipelines: [{ type: 'Pipeline', commands: [command], negated: false, timed: false, timePosix: false }], operators: [], background: false });
    const words = withoutDashes(typed);
    const command = { ...typed };
    for (const key of Object.keys(typed)) delete typed[key];
    const closing = { type: 'Group', body: [statement(simpleCommand(hidden('exiting'), [LAST_RESULT()[0]])), statement(command)], redirections: [] };
    return void Object.assign(typed, mayBeRefused(words) ? refusedExit(words, closing) : closing);
  }
  for (const [key, value] of Object.entries(typed)) if (key !== 'type') markExits(value);
}

const simpleCommand = (name: string, args: unknown[]) => ({ type: 'SimpleCommand', name: literalWord(name), args, assignments: [], redirections: [] });

// `exit`'s words, past `builtin` or `command` and a `--`, which just-bash refuses.
function withoutDashes(node: AstNode) {
  const args = node.args as { parts?: AstNode[] }[];
  const words = staticWord(node.name as never) === 'exit' ? args : args.slice(1);
  if (staticWord(words[0]) !== '--') return words;
  node.args = args.filter((arg) => arg !== words[0]);
  return words.slice(1);
}

// bash refuses it and stays open: a word that's no number fails alone, too many
// ends the line there (T357).
function refusedExit(words: readonly unknown[], closing: unknown) {
  const pipeline = (one: unknown) => ({ type: 'Pipeline', commands: [one], negated: false, timed: false, timePosix: false });
  const stop = { type: 'Group', body: [{ type: 'Statement', pipelines: [pipeline(simpleCommand(hidden('exit-stop'), [])), pipeline(simpleCommand('exit', [literalWord('1')]))], operators: ['&&'], background: false }], redirections: [] };
  return { type: 'Group', body: [{ type: 'Statement', pipelines: [pipeline(simpleCommand(hidden('exit-check'), structuredClone(words) as unknown[])), pipeline(closing), pipeline(stop)], operators: ['&&', '||'], background: false }], redirections: [] };
}

// The same in a subshell or a pipe's part, where `exit` closes nothing.
function markInnerExits(root: AstNode) {
  const seen = new WeakSet<object>();
  walk(root, (node) => {
    if (node.type !== 'SimpleCommand' || seen.has(node) || !runsExit(node)) return;
    const words = withoutDashes(node);
    if (!mayBeRefused(words)) return;
    const command = { ...node };
    seen.add(command);
    for (const key of Object.keys(node)) delete node[key];
    Object.assign(node, refusedExit(words, command));
  });
}

// Whether `exit` with these words may be refused: not when they have effects to
// repeat, or are one plain number.
function mayBeRefused(words: readonly { parts?: AstNode[] }[]): boolean {
  if (words.length === 0) return false;
  let effects = false;
  walk(words, (part) => {
    if (EFFECTS.has(part.type)) effects = true;
  });
  const first = staticWord(words[0]);
  return !effects && first !== '--help' && !(words.length === 1 && first !== null && first !== undefined && EXIT_NUMBER.test(first));
}

const EXIT_NUMBER = /^\s*[-+]?\d+\s*$/;

const runsExit = (node: AstNode) => {
  const word = staticWord(node.name as never);
  const args = node.args as never[];
  return word === 'exit' || ((word === 'builtin' || word === 'command') && staticWord(args[0]) === 'exit');
};

// What the line's `set` commands last made of errexit, or null if none touches it.
function errexitSet(ast: unknown): boolean | null {
  let on: boolean | null = null;
  walk(ast, (node) => {
    if (node.type !== 'SimpleCommand' || staticWord(node.name as never) !== 'set') return;
    const words = (node.args as never[]).map((arg) => staticWord(arg));
    words.forEach((word, at) => {
      if (word === null) return;
      if (/^[-+][a-zA-Z]*e/.test(word) && !word.startsWith('--')) on = word.startsWith('-');
      if (/^[-+]o$/.test(word) && words[at + 1] === 'errexit') on = word === '-o';
    });
  });
  return on;
}

const INTEGER_TESTS = new Set(['-eq', '-ne', '-lt', '-le', '-gt', '-ge']);

// bash's builtins, where just-bash's differ and the adapter can run them
// itself (T305). True when `node` was rewritten.
function rewriteBashBuiltin(node: AstNode, word: string, tools: Tools): boolean {
  const args = node.args as { parts?: AstNode[] }[];
  const words = args.map((arg) => staticWord(arg));
  const to = (name: string, list: unknown[] = args) => {
    node.name = literalWord(hidden(name));
    node.args = list;
    return true;
  };
  if (word === 'export' && words[0] === '-f') return to('export-f', args.slice(1));
  // `export d` leaves an unset `d` unset; the lists go through here to say so
  // and to leave out `?` (T337).
  const names = (list: readonly (string | null)[]) => list.length > 0 && list.every((each) => each !== null && NAME.test(each));
  const isDeclare = word === 'declare' || word === 'typeset';
  if (word === 'export' && names(words)) return to('export-bare');
  if (isDeclare && words[0] === '-x' && names(words.slice(1))) return to('export-bare', args.slice(1));
  if ((word === 'export' && words.length === 1 && words[0] === '-p') || (isDeclare && words.length === 1 && words[0] === '-x')) return rewriteListing(node, 'export', [literalWord('-p')], false, tools);
  if (isDeclare && words[0] === '-p' && names(words.slice(1))) return rewriteListing(node, 'declare', args, true, tools);
  if (isDeclare && words.every((each) => each !== null && /^[-+][aAgilnprtuxI]+$/.test(each))) return rewriteListing(node, 'declare', args, false, tools);
  if (word === 'set') {
    const bad = badSetOption(words);
    if (bad !== null) return to('set-bad', [literalWord(bad)]);
  }
  if (word === 'compgen') {
    const kind = words[0] === '-A' ? { function: '-A', command: '-c', builtin: '-b', keyword: '-k', user: '-u' }[words[1] ?? ''] && words[1] : words[0];
    const rest = words[0] === '-A' ? words.slice(2) : words.slice(1);
    if (COMPGEN_KINDS.has(kind ?? '') && rest.length <= 1 && rest.every((each) => each !== null)) return to('compgen', [literalWord(kind!), ...args.slice(words[0] === '-A' ? 2 : 1)]);
  }
  if ((word === 'mapfile' || word === 'readarray') && rewriteMapfile(node, words, tools)) return true;
  if (word === 'shopt' && names(words)) return to('shopt', [literalWord('names'), BASHOPTS_WORD(), ...args]);
  if (word === 'shopt' && (words.length === 0 || (words.length === 1 && words[0] === '-p'))) return to('shopt', [literalWord(words[0] ?? ''), BASHOPTS_WORD()]);
  if (word === 'set' && words.length === 1 && (words[0] === '-o' || words[0] === '+o')) return to('set-o', [literalWord(words[0]), { type: 'Word', parts: [{ type: 'DoubleQuoted', parts: [{ type: 'ParameterExpansion', parameter: 'SHELLOPTS', operation: null }] }] }]);
  // Two words of which the first isn't an operator, and the integer tests.
  if ((word === 'test' || word === '[') && (args.length - (word === '[' ? 1 : 0) === 2 || words.some((each) => each !== null && INTEGER_TESTS.has(each)))) return to('integer-test', [literalWord(word), ...args]);
  return false;
}

const COMPGEN_KINDS: ReadonlySet<string> = new Set(['-c', '-b', '-k', '-u', 'function', 'command', 'builtin', 'keyword', 'user']);

// `mapfile`'s options, which just-bash takes and doesn't do (T391): what they ask
// for is read by a command, which leaves the assignments to run in the line's shell.
function rewriteMapfile(node: AstNode, words: readonly (string | null)[], tools: Tools): boolean {
  if (words.some((each) => each === null) || !words.some((each) => /^-[a-zA-Z]*[nsOdCc]/.test(each!))) return false;
  const typed = typedWord(tools.serialize({ ...node, assignments: [] }));
  const { statements } = tools.parse(`${hidden('hold')} "$?" ${typed} "$_" && ((1)); ${hidden('mapfile')}; builtin eval "$${TARGET}"; ${CLEAN_UP}`);
  const run = statements[1]!.pipelines[0]!.commands[0] as unknown as AstNode;
  Object.assign(run, { args: node.args, redirections: node.redirections });
  tools.done.add(run);
  for (const key of Object.keys(node)) delete node[key];
  Object.assign(node, { type: 'Group', body: statements, redirections: [] });
  return true;
}

const BASHOPTS_WORD = () => ({ type: 'Word', parts: [{ type: 'DoubleQuoted', parts: [{ type: 'ParameterExpansion', parameter: 'BASHOPTS', operation: null }] }] });

// The first of `set`'s words bash refuses, or null.
function badSetOption(words: readonly (string | null)[]): string | null {
  for (let at = 0; at < words.length; at += 1) {
    const word = words[at]!;
    if (word === null || word.startsWith('--') || word === '-' || !/^[-+]./.test(word)) return null;
    if (/^[-+]o$/.test(word)) {
      const option = words[(at += 1)];
      if (option === undefined || option === null) return null;
      if (!SET_OPTIONS.includes(option)) return option;
      continue;
    }
    const letter = [...word.slice(1)].find((each) => !'abefhkmnoptuvxBCEHPT'.includes(each));
    if (letter !== undefined) return `${word[0]!}${letter}`;
  }
  return null;
}

// `type`, and `command -v` and `-V`: what doesn't run isn't found (T336). Each
// word is looked at once expanded.
function rewriteType(node: AstNode, word: string, tools: Tools): boolean {
  const args = node.args as never[];
  if (staticWord(args[0]) === '--help') return false;
  const finds = word === 'type' || (word === 'command' && /^-[vV]+$/.test(staticWord(args[0]) ?? ''));
  if (!finds) return false;
  const typed = typedWord(tools.serialize({ ...node, assignments: [] }));
  const { statements } = tools.parse(`${hidden('hold')} "$?" ${typed} "$_" && ((1)); ${WORDS}=(); for ${TARGET} in "\${!${WORDS}[@]}"; do ${hidden('runs')} "\${${WORDS}[${TARGET}]}" || ${WORDS}[${TARGET}]="${GONE}\${${WORDS}[${TARGET}]}"; done; builtin ${word} "\${${WORDS}[@]}"; ${CLEAN_UP}`);
  const top = statements as unknown as { pipelines: { commands: { assignments?: { array: unknown }[]; [key: string]: unknown }[] }[] }[];
  top[1]!.pipelines[0]!.commands[0]!.assignments![0]!.array = args;
  const redirections = node.redirections;
  for (const key of Object.keys(node)) delete node[key];
  Object.assign(node, { type: 'Group', body: statements, redirections });
  return true;
}

// The shell's lists, through a command that leaves out `?` and the positional
// parameters and adds what's exported and unset (T337).
function rewriteListing(node: AstNode, word: 'export' | 'declare', args: unknown[], named: boolean, tools: Tools): true {
  const { statements } = tools.parse(`builtin ${word} ${named ? '2>/dev/null' : ''} | ${hidden('listed')} ${word}`);
  const [list, filter] = statements[0]!.pipelines[0]!.commands as unknown as AstNode[];
  list!.args = [literalWord(word), ...args];
  filter!.args = [literalWord(word), ...(named ? args.slice(1) : [])];
  const redirections = node.redirections;
  for (const key of Object.keys(node)) delete node[key];
  Object.assign(node, { type: 'Group', body: statements, redirections });
  return true;
}

// `exec` with a command: that command in place of the shell, so the line stops
// there and, outside a subshell or pipe, the Terminal closes (T343). One it can't
// find fails alone, as in an interactive bash.
function rewriteExec(node: AstNode, word: string, tools: Tools): boolean {
  if (word !== 'exec') return false;
  const args = [...(node.args as { parts?: AstNode[] }[])];
  while (args.length > 0) {
    const option = staticWord(args[0]);
    if (option === '--') {
      args.shift();
      break;
    }
    if (option === null || option === undefined || !/^-[cl]*a?$/.test(option)) break;
    args.splice(0, option.endsWith('a') ? 2 : 1);
  }
  if (args.length === 0 || staticWord(args[0]) === '--help') return false;
  const typed = typedWord(tools.serialize({ ...node, assignments: [] }));
  const { statements } = tools.parse(`${hidden('hold')} "$?" ${typed} "$_" && ((1)); ${hidden('exec')}; ${hidden('exec-ran')} ${node.ends === true ? 1 : 0} "$?" && builtin exit "$${TARGET}"; ${hidden('held')} && ((1)); ${CLEAN_UP}`);
  const run = statements[1]!.pipelines[0]!.commands[0] as unknown as AstNode;
  Object.assign(run, { args, redirections: node.redirections });
  tools.done.add(run);
  for (const key of Object.keys(node)) delete node[key];
  Object.assign(node, { type: 'Group', body: statements, redirections: [] });
  return true;
}

// With `failglob` on, a word that matches nothing stops the line where it stood:
// its words are expanded once first, by a command that does nothing, and the exit
// there isn't one `markExits` saw, so the Terminal stays open (T341).
const globChecked = new WeakSet<object>();

function stopAtFailedGlob(node: AstNode, tools: Tools): boolean {
  const words = [node.name, ...(node.args as unknown[])] as { parts?: AstNode[] }[];
  if (globChecked.has(node) || !words.some((word) => word?.parts?.some((part) => part.type === 'Glob') === true)) return false;
  let effects = false;
  walk(words, (part) => {
    if (EFFECTS.has(part.type)) effects = true;
  });
  if (effects) return false;
  const { statements } = tools.parse(`${hidden('hold')} "$?" && ((1)); ${hidden('ok')} || builtin exit 1; ${hidden('held')} && ((1)); :`);
  const check = statements[1]!.pipelines[0]!.commands[0] as unknown as AstNode;
  check.args = structuredClone(words);
  tools.done.add(check);
  const command = { ...node };
  globChecked.add(command);
  (statements as unknown as { pipelines: { commands: unknown[] }[] }[])[3]!.pipelines[0]!.commands[0] = command;
  for (const key of Object.keys(node)) delete node[key];
  Object.assign(node, { type: 'Group', body: statements, redirections: [] });
  return true;
}

// An assignment to a `declare -i` variable with a bad expression: bash's error
// stops the line, where just-bash reads it as 0 (T337).
function checkInteger(node: AstNode, tools: Tools) {
  if (tools.done.has(node)) return;
  const assignment = (node.assignments as { name: string; value: { parts?: unknown[] } | null; array: unknown }[]).find((each) => tools.integers().has(each.name) && each.value !== null && each.array === null);
  if (assignment === undefined) return;
  const { statements } = tools.parse(`${hidden('integer')} || builtin exit 1; :`);
  (statements[0]!.pipelines[0]!.commands[0] as unknown as AstNode).args = [structuredClone(assignment.value)];
  const command = { ...node };
  tools.done.add(command);
  (statements as unknown as { pipelines: { commands: unknown[] }[] }[])[1]!.pipelines[0]!.commands[0] = command;
  for (const key of Object.keys(node)) delete node[key];
  Object.assign(node, { type: 'Group', body: statements, redirections: [] });
}

// `$BASH_SUBSHELL`, which just-bash doesn't have: how many subshells the text
// is inside (T345).
function countSubshells(node: unknown, depth = 0) {
  if (Array.isArray(node)) {
    for (const child of node) countSubshells(child, depth);
    return;
  }
  if (node === null || typeof node !== 'object') return;
  const typed = node as AstNode;
  if (typed.type === 'ParameterExpansion' && typed.parameter === 'BASH_SUBSHELL' && typed.operation === null) {
    for (const key of Object.keys(typed)) delete typed[key];
    Object.assign(typed, { type: 'Literal', value: String(depth) });
    return;
  }
  // just-bash's own, which says 5.1.0 beside `BASH_VERSINFO` (T397).
  if (typed.type === 'ParameterExpansion' && typed.parameter === 'BASH_VERSION' && typed.operation === null) {
    for (const key of Object.keys(typed)) delete typed[key];
    Object.assign(typed, { type: 'Literal', value: '5.3.0(1)-release' });
    return;
  }
  const inside = typed.type === 'Subshell' || typed.type === 'CommandSubstitution' || typed.type === 'ProcessSubstitution' ? depth + 1 : depth;
  for (const [key, value] of Object.entries(typed)) if (key !== 'type') countSubshells(value, inside);
}

// What's put before a `!(` to keep it a word, taken out once it's parsed.
const WORD_START = '\uF8FE';
function withoutMark(ast: Script): Script {
  walk(ast, (node) => {
    if ((node.type === 'Literal' || node.type === 'SingleQuoted') && typeof node.value === 'string') node.value = node.value.replaceAll(WORD_START, '');
    if (node.type === 'Word' && Array.isArray(node.parts)) node.parts = (node.parts as AstNode[]).filter((part) => part.type !== 'Literal' || part.value !== WORD_START);
  });
  return ast;
}

// The first `!(…)` a line holds: just-bash reads it as a lookahead its regular
// expressions don't have, so it matches nothing or fails in JavaScript's words
// (T344, research G31).
function negatedPattern(ast: Script): string | null {
  let found: string | null = null;
  walk(ast, (node) => {
    if (node.type === 'Glob' && (node.pattern as string).includes('!(')) found ??= node.pattern as string;
  });
  return found;
}

// An extended pattern where `extglob` is off, which bash can't parse outside
// `[[ ]]` and an expansion's own pattern (T344).
function holdsExtendedPattern(node: unknown): boolean {
  if (Array.isArray(node)) return node.some(holdsExtendedPattern);
  if (node === null || typeof node !== 'object') return false;
  const typed = node as AstNode;
  if (typed.type === 'ConditionalCommand' || typed.type === 'ParameterExpansion') return false;
  if (typed.type === 'Glob') return /^[@*+?!]\(/.test(typed.pattern as string);
  return Object.entries(typed).some(([key, value]) => key !== 'type' && holdsExtendedPattern(value));
}

// Whether the loop being read holds a `break 0`.
let outOfRange = false;

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
    } else if (!help && (word === 'break' || word === 'continue') && /^-?\d+$/.test(staticWord((typed.args as never[])[0]) ?? '') && Number(staticWord((typed.args as never[])[0])) <= 0) {
      // Out of range: every loop ends, with status 1, and the line goes on (T397).
      const count = (typed.args as unknown[])[0];
      if (inLoop) {
        outOfRange = true;
        const statement = (command: unknown) => ({ type: 'Statement', pipelines: [{ type: 'Pipeline', commands: [command], negated: false, timed: false, timePosix: false }], operators: [], background: false });
        for (const key of Object.keys(typed)) delete typed[key];
        Object.assign(typed, { type: 'Group', body: [statement(simpleCommand(hidden('loop-count'), [literalWord(word), count])), statement(simpleCommand('break', [literalWord('1000')]))], redirections: [] });
      } else {
        typed.name = literalWord(hidden('out-of-place'));
        typed.args = [literalWord(word)];
      }
    }
    return;
  }
  const loop = inLoop || typed.type === 'For' || typed.type === 'CStyleFor' || typed.type === 'While' || typed.type === 'Until';
  const inside = inFunction || typed.type === 'FunctionDef';
  const outermost = loop && !inLoop;
  if (outermost) outOfRange = false;
  for (const [key, value] of Object.entries(typed)) if (key !== 'type') markOutOfPlace(value, loop, inside);
  if (!outermost || !outOfRange) return;
  outOfRange = false;
  const statement = (command: unknown) => ({ type: 'Statement', pipelines: [{ type: 'Pipeline', commands: [command], negated: false, timed: false, timePosix: false }], operators: [], background: false });
  const whole = { ...typed };
  for (const key of Object.keys(typed)) delete typed[key];
  Object.assign(typed, { type: 'Group', body: [statement(whole), statement(simpleCommand(hidden('loop-ended'), LAST_RESULT()))], redirections: [] });
}

// A glob ending in `/` matches only folders and keeps the slash, as bash's
// (T317): just-bash drops the slash and takes any entry. The glob expands
// without it, the folders are kept, and with none the word stays as typed.
const slashGlob = (word: { parts?: AstNode[] }) => word.parts !== undefined && word.parts.some((part) => part.type === 'Glob') && word.parts.at(-1)?.type === 'Literal' && (word.parts.at(-1)!.value as string).endsWith('/');

function wrapSlashGlobs(node: AstNode, field: 'args' | 'words', tools: Tools) {
  const words = node[field] as { parts?: AstNode[] }[] | null;
  if (words === null || !words.some(slashGlob)) return;
  const typed = typedWord(tools.serialize({ ...node, assignments: [] }));
  const names: string[] = [];
  const list = words.map((word) => {
    if (!slashGlob(word)) return word;
    const name = `${WORDS}${names.length}`;
    names.push(name);
    return { type: 'Word', parts: [{ type: 'DoubleQuoted', parts: [{ type: 'ParameterExpansion', parameter: `${name}t[@]`, operation: null }] }] };
  });
  const expansions = names.map((name) => `${name}=(); ${name}f=(); ${name}t=(); for ${name}l in "\${${name}[@]}"; do ${hidden('folder')} "$${name}l" && ${name}t+=("$${name}l/"); done; ((\${#${name}t[@]})) || { ${hidden('keeps')} "$BASHOPTS" && ${name}t=("\${${name}f[@]}"); };`).join(' ');
  const gone = names.flatMap((name) => [name, `${name}f`, `${name}t`, `${name}l`]).join(' ');
  const { statements } = tools.parse(`${hidden('hold')} "$?" ${typed} "$_" && ((1)); ${expansions} ${hidden('held')} && ((1)); ${CLEAN_UP.replace('builtin unset -v', `builtin unset -v ${gone}`)}`);
  const globbed = words.filter(slashGlob).flatMap((word) => {
    const parts = word.parts!;
    const last = (parts.at(-1)!.value as string).slice(0, -1);
    const candidates = { type: 'Word', parts: [...parts.slice(0, -1), ...(last === '' ? [] : [{ type: 'Literal', value: last }])] };
    const asTyped = { type: 'Word', parts: parts.map((part) => (part.type === 'Glob' ? { type: 'SingleQuoted', value: part.pattern } : part.type === 'Literal' ? { type: 'SingleQuoted', value: part.value } : part)) };
    return [candidates, asTyped];
  });
  let at = 0;
  const top = statements.flatMap((statement) => statement.pipelines.flatMap((pipeline) => pipeline.commands)) as AstNode[];
  for (const command of top) {
    const assignment = (command.assignments as { name: string; array: unknown[] | null }[] | undefined)?.[0];
    if (assignment?.array?.length === 0 && !assignment.name.endsWith('t')) assignment.array = [globbed[at++]];
  }
  const command = { ...node, [field]: list };
  const body = statements as unknown as unknown[];
  const statement = { type: 'Statement', pipelines: [{ type: 'Pipeline', commands: [command], negated: false, timed: false, timePosix: false }], operators: [], background: false };
  body.splice(body.length - 3, 0, statement);
  for (const key of Object.keys(node)) delete node[key];
  Object.assign(node, { type: 'Group', body, redirections: [] });
}

// `"$@"`, as a word.
const allParameters = () => ({ type: 'Word', parts: [{ type: 'DoubleQuoted', parts: [{ type: 'ParameterExpansion', parameter: '@', operation: null }] }] });

// `${#@}` and `${#*}`: how many, where just-bash gives the joined text's length
// (T367).
function countOfAll(node: AstNode) {
  if ((node.parameter === '@' || node.parameter === '*') && (node.operation as { type?: string } | null)?.type === 'Length') Object.assign(node, { parameter: '#', operation: null });
}

// `${x^b}`: a pattern tests the first character alone, where just-bash changes the
// first that matches (T390).
function firstCase(node: AstNode, tools: Tools) {
  const operation = node.operation as { type?: string; direction?: string; all?: boolean; pattern?: { parts?: AstNode[] } | null } | null;
  if (operation?.type !== 'CaseModification' || operation.all === true || operation.pattern === null || operation.pattern === undefined) return;
  if (/^(?:@|\*|\w+\[[@*]\])$/.test(node.parameter as string)) return;
  const statement = tools.parse(`: "$(${hidden('case')} ${operation.direction!})"`).statements[0]!.pipelines[0]!.commands[0] as unknown as { args: { parts: { parts: AstNode[] }[] }[] };
  const substitution = statement.args[0]!.parts[0]!.parts[0]!;
  const inner = (substitution.body as { statements: { pipelines: { commands: AstNode[] }[] }[] }).statements[0]!.pipelines[0]!.commands[0]!;
  (inner.args as unknown[]).push(operation.pattern, { type: 'Word', parts: [{ type: 'DoubleQuoted', parts: [{ type: 'ParameterExpansion', parameter: node.parameter, operation: null }] }] });
  tools.done.add(inner);
  for (const key of Object.keys(node)) delete node[key];
  Object.assign(node, substitution);
}

// `${a[@]~}`, which just-bash's parser refuses (T390): written as a case change
// whose pattern says which, and made item by item in `listing`.
const TOGGLE = `${MARK}t`;

// `"${a[@]^}"`: each item, where just-bash changes only the first (T390).
function caseOfItems(word: { parts?: AstNode[] }): AstNode | null {
  const only = word.parts?.length === 1 ? word.parts[0]! : null;
  const inner = only?.type === 'DoubleQuoted' && (only.parts as AstNode[]).length === 1 ? (only.parts as AstNode[])[0]! : only;
  const operation = inner?.operation as { type?: string; all?: boolean; pattern?: unknown } | null | undefined;
  if (inner?.type !== 'ParameterExpansion' || operation?.type !== 'CaseModification' || !/^(?:@|\*|\w+\[[@*]\])$/.test(inner.parameter as string)) return null;
  const toggles = (staticWord(operation.pattern as never) ?? '').startsWith(TOGGLE);
  return operation.all !== true || toggles ? inner : null;
}

// An unquoted `${a[@]#x}`: bash drops what comes out empty, just-bash keeps it
// (T367).
const emptiedArray = (word: { parts?: AstNode[] }) => {
  const part = word.parts?.length === 1 ? word.parts[0]! : null;
  const operation = (part?.operation as { type?: string } | null | undefined)?.type;
  return part?.type === 'ParameterExpansion' && /^(?:@|\*|\w+\[@\])$/.test(part.parameter as string) && (operation === 'PatternRemoval' || operation === 'PatternReplacement');
};

// `**` at a word's end under `globstar`, with no other pattern before it (T375):
// just-bash matches it only with a `/` after it.
const starWord = (word: { parts?: AstNode[] }) => {
  const parts = word.parts;
  if (parts === undefined || parts.at(-1)?.type !== 'Glob' || parts.at(-1)!.pattern !== '**' || parts.slice(0, -1).some((part) => part.type === 'Glob')) return false;
  const before = parts.at(-2);
  return before === undefined || (before.type === 'Literal' && (before.value as string).endsWith('/'));
};

// `**/` at a word's end: every folder below (T397).
const starSlash = (word: { parts?: AstNode[] }) => {
  const parts = word.parts;
  if (parts === undefined || parts.at(-1)?.type !== 'Literal' || parts.at(-1)!.value !== '/' || parts.at(-2)?.type !== 'Glob' || parts.at(-2)!.pattern !== '**' || parts.slice(0, -2).some((part) => part.type === 'Glob')) return false;
  const before = parts.at(-3);
  return before === undefined || (before.type === 'Literal' && (before.value as string).endsWith('/'));
};

// Where a word goes in the text below, as just-bash's `For` can't take it as text.
const IN_PLACE = `${MARK}p`;

// What makes a list for a word, into the array `name`, or null for any other word.
const listedWords = new WeakSet<object>();
function listing(word: { parts?: AstNode[] }, name: string, tools: Tools): { text: string; into: unknown; joined?: boolean } | null {
  if (listedWords.has(word)) return null;
  const items = caseOfItems(word);
  if (items !== null) {
    const operation = items.operation as { direction: string; pattern: { parts?: AstNode[] } | null };
    const parameter = items.parameter as string;
    const whole = { type: 'Word', parts: [{ type: 'DoubleQuoted', parts: [{ type: 'ParameterExpansion', parameter: parameter.replace('*', '@'), operation: null }] }] };
    const pattern = staticWord(operation.pattern as never);
    const toggled = pattern?.startsWith(TOGGLE) === true ? pattern.slice(TOGGLE.length) : null;
    const made = toggled !== null ? `"$(${hidden('toggle')} ${toggled} "$${name}l")"` : pattern === null || pattern === undefined || pattern === '' ? `"\${${name}l${operation.direction === 'upper' ? '^' : ','}}"` : `"$(${hidden('case')} ${operation.direction} '${pattern.replaceAll("'", `'\\''`)}' "$${name}l")"`;
    return { text: `${name}=(); for ${name}l in ${IN_PLACE}; do ${name}+=(${made}); done;`, into: whole, joined: parameter.includes('*') };
  }
  if (tools.globStar() && starSlash(word)) return { text: `builtin mapfile -t ${name} < <(${hidden('globstar')} "$BASHOPTS" ${word.parts!.length > 2 ? IN_PLACE : "''"} folders);`, into: { type: 'Word', parts: word.parts!.slice(0, -2) } };
  if (emptiedArray(word)) return { text: `${name}=(); for ${name}l in ${IN_PLACE}; do [[ -z $${name}l ]] || ${name}+=("$${name}l"); done;`, into: word };
  if (!tools.globStar() || !starWord(word)) return null;
  return { text: `builtin mapfile -t ${name} < <(${hidden('globstar')} "$BASHOPTS" ${word.parts!.length > 1 ? IN_PLACE : "''"});`, into: { type: 'Word', parts: word.parts!.slice(0, -1) } };
}

// A command whose words need a list made first: a group that makes each, then
// runs the command with `"${name[@]}"` in the word's place. `assignment` is the
// array assignment that holds them, if it's not the command's own field.
function listFirst(node: AstNode, field: 'args' | 'words' | 'array', tools: Tools, assignment?: AstNode): boolean {
  const words = (assignment ?? node)[field] as { parts?: AstNode[] }[];
  const made: { name: string; text: string; into: unknown }[] = [];
  const list = words.map((word) => {
    const name = `${WORDS}${made.length}`;
    const one = listing(word, name, tools);
    if (one === null) return word;
    made.push({ name, ...one });
    return { type: 'Word', parts: [{ type: 'DoubleQuoted', parts: [{ type: 'ParameterExpansion', parameter: `${name}[${one.joined === true ? '*' : '@'}]`, operation: null }] }] };
  });
  if (made.length === 0) return false;
  const typed = typedWord(tools.serialize({ ...node, assignments: [] }));
  const gone = made.flatMap(({ name }) => [name, `${name}l`]).join(' ');
  const { statements } = tools.parse(`${hidden('hold')} "$?" ${typed} "$_" && ((1)); ${made.map(({ text }) => text).join(' ')} ${hidden('held')} && ((1)); ${CLEAN_UP.replace('builtin unset -v', `builtin unset -v ${gone}`)}`);
  let at = 0;
  const inPlace = made.filter(({ text }) => text.includes(IN_PLACE));
  walk(statements, (part) => {
    if (part.type !== 'Word' || staticWord(part as never) !== IN_PLACE) return;
    part.parts = (inPlace[at++]!.into as { parts: unknown[] }).parts;
    listedWords.add(part);
  });
  const command = assignment === undefined ? { ...node, [field]: list } : { ...node, assignments: (node.assignments as AstNode[]).map((each) => (each === assignment ? { ...each, array: list } : each)) };
  const body = statements as unknown as unknown[];
  body.splice(body.length - 3, 0, { type: 'Statement', pipelines: [{ type: 'Pipeline', commands: [command], negated: false, timed: false, timePosix: false }], operators: [], background: false });
  for (const key of Object.keys(node)) delete node[key];
  Object.assign(node, { type: 'Group', body, redirections: [] });
  return true;
}

function listAssigned(node: AstNode, tools: Tools): boolean {
  const assignment = (node.assignments as AstNode[]).find((each) => Array.isArray(each.array) && (each.array as { parts?: AstNode[] }[]).some((word) => emptiedArray(word)));
  return assignment !== undefined && listFirst(node, 'array', tools, assignment);
}

// `SECONDS=5`: counts on from there, where just-bash's only counts from the start
// (T375). A running line can't change that, so it reads what it assigned.
const SECONDS_SET = `${MARK}c`;
function readSeconds(node: AstNode, tools: Tools) {
  if (node.operation !== null || tools.done.has(node)) return;
  const statement = tools.parse(`: "\${${SECONDS_SET}-$SECONDS}"`).statements[0]!.pipelines[0]!.commands[0] as unknown as { args: { parts: { parts: AstNode[] }[] }[] };
  const read = statement.args[0]!.parts[0]!.parts[0]!;
  walk(read.operation, (part) => {
    if (part.type === 'ParameterExpansion') tools.done.add(part);
  });
  Object.assign(node, read);
}

function setSeconds(node: AstNode, tools: Tools): boolean {
  if (tools.done.has(node)) return false;
  const assignment = (node.assignments as { name: string; value: { parts?: unknown[] } | null }[]).find((each) => each.name === 'SECONDS' && each.value !== null);
  if (assignment === undefined) return false;
  const { statements } = tools.parse(`:; ${hidden('seconds')}`);
  (statements[1]!.pipelines[0]!.commands[0] as unknown as AstNode).args = [structuredClone(assignment.value)];
  const command = { ...node };
  tools.done.add(command);
  (statements as unknown as { pipelines: { commands: unknown[] }[] }[])[0]!.pipelines[0]!.commands[0] = command;
  for (const key of Object.keys(node)) delete node[key];
  Object.assign(node, { type: 'Group', body: statements, redirections: [] });
  return true;
}

// `nocaseglob`, which just-bash takes and doesn't do (T323): a word's letters
// beside a glob match either case.
function caselessGlob(word: AstNode) {
  const parts = word.parts as AstNode[];
  if (!parts.some((part) => part.type === 'Glob')) return;
  word.parts = parts.flatMap((part) => {
    if (part.type !== 'Literal') return [part];
    return [...(part.value as string)].map((char) => (char.toLowerCase() !== char.toUpperCase() ? { type: 'Glob', pattern: `[${char}${CASE_MARK}${char === char.toLowerCase() ? char.toUpperCase() : char.toLowerCase()}]` } : { type: 'Literal', value: char }));
  });
}

// `~` with HOME unset is the user's home folder, here this one (T323).
function tildeHome(word: AstNode, tools: Tools) {
  const parts = word.parts as AstNode[];
  if (parts[0]?.type !== 'TildeExpansion' || parts[0].user !== null) return;
  const statement = tools.parse(`: "\${HOME-${HOME}}"`).statements[0]!.pipelines[0]!.commands[0] as unknown as { args: { parts: AstNode[] }[] };
  parts[0] = (statement.args[0] as { parts: AstNode[] }).parts[0]!;
}

// `~-`: the last folder, and as typed when there's none (T375).
function tildeMinus(word: AstNode, tools: Tools) {
  const parts = word.parts as AstNode[];
  if (parts[0]?.type !== 'TildeExpansion' || parts[0].user !== '-') return;
  const statement = tools.parse(': "${OLDPWD-x}"').statements[0]!.pipelines[0]!.commands[0] as unknown as { args: { parts: AstNode[] }[] };
  const value = statement.args[0]!.parts[0]!;
  ((value.parts as AstNode[])[0]!.operation as { word: unknown }).word = literalWord('~-');
  parts[0] = value;
}

// `$((…))` of numbers alone, in bash's 64 bits, where just-bash's are a double
// (T323). Null for anything else, which just-bash reads.
function bigArithmetic(text: string): string | null {
  const tokens = text.match(/0[xX][0-9a-fA-F]*|\d+|\*\*|<<|>>|[-+*/%&^|~()]|\S/g) ?? [];
  let at = 0;
  const wrap = (value: bigint) => BigInt.asIntN(64, value);
  const atom = (): bigint | null => {
    const token = tokens[at++];
    if (token === undefined) return null;
    if (token === '(') {
      const inner = binary(0);
      return tokens[at++] === ')' ? inner : null;
    }
    if (token === '-' || token === '+' || token === '~') {
      const inner = power();
      return inner === null ? null : token === '-' ? wrap(-inner) : token === '~' ? wrap(~inner) : inner;
    }
    if (!/^\d/.test(token)) return null;
    if (/^0\d/.test(token)) return /^[0-7]+$/.test(token) ? wrap(BigInt(`0o${token.slice(1)}`)) : null;
    // `0x` alone is 0 (T397).
    return wrap(BigInt(/^0[xX]$/.test(token) ? 0 : token));
  };
  const power = (): bigint | null => {
    const base = atom();
    if (base === null || tokens[at] !== '**') return base;
    at += 1;
    const exponent = power();
    if (exponent === null || exponent < 0n || exponent > 100_000n) return null;
    let value = 1n;
    for (let index = 0n; index < exponent; index += 1n) value = wrap(value * base);
    return value;
  };
  const LEVELS = [['|'], ['^'], ['&'], ['<<', '>>'], ['+', '-'], ['*', '/', '%']];
  const binary = (level: number): bigint | null => {
    if (level === LEVELS.length) return power();
    let left = binary(level + 1);
    while (left !== null && LEVELS[level]!.includes(tokens[at]!)) {
      const operator = tokens[at++]!;
      const right = binary(level + 1);
      if (right === null) return null;
      if ((operator === '/' || operator === '%') && right === 0n) return null;
      const shift = right & 63n;
      left = wrap({ '|': left | right, '^': left ^ right, '&': left & right, '<<': left << shift, '>>': left >> shift, '+': left + right, '-': left - right, '*': left * right, '/': operator === '/' ? left / right : 0n, '%': operator === '%' ? left % right : 0n }[operator]!);
    }
    return left;
  };
  if (tokens.length === 0 || tokens.some((token) => !/^(?:0[xX][0-9a-fA-F]*|\d+|\*\*|<<|>>|[-+*/%&^|~()])$/.test(token))) return null;
  const value = binary(0);
  return value === null || at !== tokens.length ? null : value.toString();
}

const SITE_DECLARE = new Set(['declare', 'typeset']);

// `declare -f` prints no body in just-bash (T323); `type` does, after a line.
function rewriteDeclareF(node: AstNode, word: string, tools: Tools): boolean {
  const args = node.args as never[];
  if (!SITE_DECLARE.has(word) || staticWord(args[0]) !== '-f') return false;
  const names = args.slice(1).map((arg) => staticWord(arg));
  if (names.some((name) => name === null || !NAME.test(name))) return false;
  const shown = (name: string) => `builtin type ${name} 2>/dev/null | ${hidden('function-text')}`;
  const text = names.length > 0 ? (names as string[]).map(shown).join('; ') : `for ${WORDS} in $(builtin declare -F | ${hidden('function-names')}); do ${shown(`"$${WORDS}"`)}; done; builtin unset -v ${WORDS}`;
  const { statements } = tools.parse(text);
  for (const key of Object.keys(node)) if (key !== 'redirections') delete node[key];
  Object.assign(node, { type: 'Group', body: statements });
  return true;
}

// `command -v a b`: bash 5.3 says found if any is (T323).
function rewriteCommandV(node: AstNode, word: string, tools: Tools): boolean {
  const args = node.args as never[];
  if (word !== 'command' || staticWord(args[0]) !== '-v' || args.length < 3) return false;
  const { statements } = tools.parse(`: | ${hidden('any-found')}`);
  const pipeline = statements[0]!.pipelines[0]!;
  const copy = { ...node, redirections: [] };
  rewriteType(copy, word, tools);
  pipeline.commands[0] = copy as never;
  const redirections = node.redirections;
  for (const key of Object.keys(node)) delete node[key];
  Object.assign(node, { type: 'Group', body: statements, redirections });
  return true;
}

// `$(…)` in arithmetic and in an array's subscript, which just-bash runs in a
// shell of its own, with none of the line's functions or variables (T348,
// research G35): run before the command that holds it, in the line's shell, and
// read from a variable.
let hoisted = 0;
const ARITHMETIC_HOLDERS = new Set(['SimpleCommand', 'ArithmeticCommand', 'ConditionalCommand', 'For', 'Case', 'CStyleFor']);
const SUBSCRIPT_SUBSTITUTION = /\[([^\]]*)\$\(((?:[^()]|\([^()]*\))*)\)([^\]]*)\]/;

function hoistArithmetic(node: unknown, parse: (text: string) => Script) {
  if (Array.isArray(node)) {
    for (const child of node) hoistArithmetic(child, parse);
    return;
  }
  if (node === null || typeof node !== 'object') return;
  const typed = node as AstNode;
  if (ARITHMETIC_HOLDERS.has(typed.type)) {
    const found: { name: string; command: string }[] = [];
    const texts: AstNode[] = [];
    const held = (command: string) => {
      const name = `${MARK}n${(hoisted += 1)}`;
      found.push({ name, command });
      return name;
    };
    const scan = (value: unknown) => {
      if (Array.isArray(value)) return value.forEach(scan);
      if (value === null || typeof value !== 'object') return;
      const part = value as AstNode;
      if (part.type === 'CommandSubstitution' || part.type === 'ProcessSubstitution' || part.type === 'FunctionDef') return;
      if (typeof part.originalText === 'string') texts.push(part);
      if (part.type === 'ArithCommandSubst') {
        const name = held(part.command as string);
        delete part.command;
        Object.assign(part, { type: 'ArithVariable', name, hasDollarPrefix: true });
        return;
      }
      for (const field of ['name', 'parameter']) {
        if (typeof part[field] !== 'string' || !(part.type === 'Assignment' || part.type === 'ParameterExpansion')) continue;
        for (let match = SUBSCRIPT_SUBSTITUTION.exec(part[field]); match !== null; match = SUBSCRIPT_SUBSTITUTION.exec(part[field] as string)) part[field] = (part[field] as string).replace(match[0], `[${match[1]!}$${held(match[2]!)}${match[3]!}]`);
      }
      for (const [key, inner] of Object.entries(part)) if (key !== 'type') scan(inner);
    };
    // A loop's and a `case`'s own words, not what runs inside it.
    if (typed.type === 'For') scan(typed.words);
    else if (typed.type === 'Case') scan(typed.word);
    else if (typed.type === 'CStyleFor') scan(typed.init);
    else scan(typed);
    if (found.length > 0) {
      // just-bash reads the text again when it holds a `$x`.
      for (const text of texts) for (const { name, command } of found) text.originalText = (text.originalText as string).replace(`$(${command})`, () => `$${name}`).replace(`\`${command}\``, () => `$${name}`);
      const status = `${MARK}n${(hoisted += 1)}`;
      const lines = found.map(({ name, command }) => `${name}=$(${command}) || :`).join('\n');
      const { statements } = parse(`${status}=$?\n${lines}\n${hidden('hold')} "$${status}" && ((1))`);
      const command = { ...typed };
      for (const key of Object.keys(typed)) delete typed[key];
      Object.assign(typed, { type: 'Group', body: [...(statements as unknown[]), { type: 'Statement', pipelines: [{ type: 'Pipeline', commands: [command], negated: false, timed: false, timePosix: false }], operators: [], background: false }], redirections: [] });
    }
  }
  for (const [key, value] of Object.entries(typed)) if (key !== 'type') hoistArithmetic(value, parse);
}

// A `$(…)` whose text can print a NUL, which bash drops with a warning (T360).
function holdsNul(body: unknown): boolean {
  let holds = false;
  walk(body, (part) => {
    if (typeof part.value === 'string' && /\\0|\\x00|^-print0$/.test(part.value)) holds = true;
  });
  return holds;
}

function withoutNul(node: AstNode, tools: Tools) {
  const { statements } = tools.parse(`{ :; ${hidden('nul-status')} "$?"; } | ${hidden('nul')}`);
  const group = statements[0]!.pipelines[0]!.commands[0] as unknown as { body: unknown[] };
  group.body.splice(0, 1, ...((node.body as { statements: unknown[] }).statements));
  node.body = { type: 'Script', statements };
}

// A command reading a folder on its standard input: its own error, where
// just-bash can't open it (T360).
const READS_FOLDER = new Set(['cat', 'wc', 'grep', 'read', 'sort', 'head', 'tail', 'tr']);
const folderChecked = new WeakSet<object>();

function readsFolder(node: AstNode, tools: Tools): boolean {
  if (folderChecked.has(node)) return false;
  const word = staticWord(node.name as never);
  const redirections = node.redirections as Redirection[];
  const input = redirections.find((redirection) => redirection.operator === '<' && redirection.fd === null);
  const target = input === undefined ? null : staticWord(input.target as never);
  if (word === null || !READS_FOLDER.has(word) || target === null || tools.isFile(target)) return false;
  const { statements } = tools.parse(`if ${hidden('folder')} x; then ${hidden('read-folder')} x; else :; fi`);
  const branching = statements[0]!.pipelines[0]!.commands[0] as unknown as { clauses: { condition: { pipelines: { commands: AstNode[] }[] }[]; body: { pipelines: { commands: unknown[] }[] }[] }[]; elseBody: { pipelines: { commands: unknown[] }[] }[] };
  branching.clauses[0]!.condition[0]!.pipelines[0]!.commands[0]!.args = [structuredClone(input!.target)];
  const say = branching.clauses[0]!.body[0]!.pipelines[0]!.commands[0] as AstNode;
  say.args = [literalWord(word), ...(node.args as unknown[])];
  say.redirections = redirections.filter((redirection) => redirection !== input);
  const command = { ...node };
  folderChecked.add(command);
  branching.elseBody[0]!.pipelines[0]!.commands[0] = command;
  for (const key of Object.keys(node)) delete node[key];
  Object.assign(node, { type: 'Group', body: statements, redirections: [] });
  return true;
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
// `/dev/fd/1` and `/dev/fd/2` as the targets the shell writes to itself (T332).
const FD_STREAMS: Readonly<Record<string, string>> = { '/dev/fd/1': '/dev/stdout', '/dev/fd/2': '/dev/stderr' };
function namedStream(redirection: Redirection) {
  const parts = redirection.target.parts as { type: string; value?: string }[] | undefined;
  const stream = parts?.length === 1 && parts[0]!.type === 'Literal' ? FD_STREAMS[parts[0]!.value!] : undefined;
  if (stream !== undefined) parts![0]!.value = stream;
}

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

// `a[1.5]=1`: bash's error, which stops the line, as `$((1.5))`'s does (T397).
function floatSubscript(node: AstNode, tools: Tools): boolean {
  const subscript = (node.assignments as { name: string }[]).flatMap((each) => /^\w+\[(\d*\.\d[^\]]*)\]$/.exec(each.name)?.[1] ?? [])[0];
  if (subscript === undefined) return false;
  const { statements } = tools.parse(`: \${${BAD_ARITHMETIC}:?${typedWord(floatMessage(subscript))}}`);
  for (const key of Object.keys(node)) delete node[key];
  Object.assign(node, { type: 'Group', body: statements, redirections: [] });
  return true;
}

const redirectTarget = (redirection: Redirection) => (redirection.target.type === 'Word' ? staticWord(redirection.target as never) : null);
const plainPath = (path: string) => path.replace(/^(?:\.\/+)+/, '');
const EMPTIES = new Set(['>', '>|', '&>']);

// The redirects to open before a command that reads a file it also empties: its
// own, or `tee`'s file given by name.
function emptied(node: AstNode, redirections: readonly Redirection[]): Redirection[] {
  const operands = node.type === 'SimpleCommand' ? (node.args as never[]).map((arg) => staticWord(arg)) : [];
  if (node.type === 'SimpleCommand' && staticWord(node.name as never) === 'tee' && !operands.some((word) => word === '--append' || /^-[a-z]*a/.test(word ?? ''))) {
    const input = redirections.find((redirection) => redirection.operator === '<');
    const from = input === undefined ? null : redirectTarget(input);
    const named = from === null ? null : operands.find((word) => word !== null && word !== undefined && plainPath(word) === plainPath(from));
    if (input !== undefined && named !== null && named !== undefined) return [input, { type: 'Redirection', fd: null, operator: '>', target: literalWord(named) } as unknown as Redirection];
  }
  return redirections.filter((redirection) => redirection.operator === '<' || EMPTIES.has(redirection.operator));
}

function opensFirst(node: AstNode, redirections: readonly Redirection[]): boolean {
  if (node.type !== 'SimpleCommand') return false;
  const operands = (node.args as never[]).flatMap((arg) => staticWord(arg) ?? []).map(plainPath);
  const inputs = redirections.filter((redirection) => redirection.operator === '<').flatMap((redirection) => redirectTarget(redirection) ?? []).map(plainPath);
  if (staticWord(node.name as never) === 'tee' && inputs.some((input) => operands.includes(input)) && emptied(node, redirections).length === 2 && !redirections.some((redirection) => WRITES.has(redirection.operator))) return true;
  return redirections.some((redirection) => {
    if (!EMPTIES.has(redirection.operator)) return false;
    const target = redirectTarget(redirection);
    return target !== null && !target.startsWith('/dev/') && (inputs.includes(plainPath(target)) || operands.includes(plainPath(target)));
  });
}

// What `cat`, `grep` and `wc` need of their redirects (T355, T360).
function tellRedirects(node: AstNode, redirections: readonly Redirection[]) {
  if (node.type !== 'SimpleCommand') return;
  const word = staticWord(node.name as never);
  if (word !== 'cat' && word !== 'grep' && word !== 'wc') return;
  const assignments = node.assignments as unknown[];
  const tell = (name: string, value: string) => assignments.unshift({ type: 'Assignment', name, value: literalWord(value), append: false, array: null });
  const output = redirections.findLast((redirection) => WRITES.has(redirection.operator) && redirection.operator !== '>&' && (redirection.fd === null || redirection.fd === 1) && (word === 'grep' || redirection.operator.endsWith('>>')));
  const to = output === undefined ? null : redirectTarget(output);
  if (to !== null && !to.startsWith('/dev/')) tell(OUTPUT_FILE, to);
  const input = redirections.findLast((redirection) => redirection.operator === '<' && redirection.fd === null);
  const from = input === undefined ? null : redirectTarget(input);
  if (from !== null) tell(INPUT_FILE, from);
}

const redirectPlugin: Plugin = {
  name: 'cv-redirect-check',
  transform(context) {
    const done = new WeakSet<object>();
    walk(context.ast, (node) => {
      if (done.has(node) || node.type === 'FunctionDef' || !Array.isArray(node.redirections)) return;
      done.add(node);
      const redirections = node.redirections as Redirection[];
      redirections.forEach(namedStream);
      tellRedirects(node, redirections);
      const opens = opensFirst(node, redirections);
      if (!opens && !redirections.some((redirection) => WRITES.has(redirection.operator) && (redirection.operator !== '>&' || checkable(redirection)))) return;
      node.redirections = redirections.flatMap((redirection) => (checkable(redirection) ? [{ type: 'Redirection', fd: CHECK_FD, operator: '>>', target: { type: 'Word', parts: [...redirection.target.parts!, { type: 'Literal', value: OPENING }] } }, redirection] : [redirection]));
      const statement = (command: unknown) => ({ type: 'Statement', pipelines: [{ type: 'Pipeline', commands: [command], negated: false, timed: false, timePosix: false }], operators: [], background: false });
      const wrote = { type: 'SimpleCommand', name: literalWord(hidden(WROTE)), args: LAST_RESULT(), assignments: [], redirections: [] };
      const command = { ...node };
      for (const key of Object.keys(node)) delete node[key];
      const pipeline = (one: unknown) => ({ type: 'Pipeline', commands: [one], negated: false, timed: false, timePosix: false });
      // bash opens a command's redirects before it runs, so a file it also reads
      // is empty by then; just-bash writes after (T355).
      const opening = { type: 'SimpleCommand', name: literalWord(hidden('open')), args: [], assignments: [], redirections: structuredClone(emptied(command, command.redirections as Redirection[])) };
      done.add(opening);
      const first = opens ? { type: 'Statement', pipelines: [pipeline(opening), pipeline(command)], operators: ['&&'], background: false } : statement(command);
      Object.assign(node, { type: 'Group', body: [first, statement(wrote)], redirections: [] });
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
    if (node.type === 'Pipeline' && Array.isArray(node.commands) && node.commands.length > 1 && (node.commands as AstNode[]).some(bare)) error = (node.commands as AstNode[]).slice(0, -1).some(bare) ? "syntax error near unexpected token `|'" : END_OF_FILE;
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

// bash 5.3's `shopt` names, those on by default marked (T323).
const SHOPTS = 'array_expand_once assoc_expand_once autocd bash_source_fullpath cdable_vars cdspell checkhash checkjobs +checkwinsize +cmdhist compat31 compat32 compat40 compat41 compat42 compat43 compat44 +complete_fullquote direxpand dirspell dotglob execfail expand_aliases extdebug extglob +extquote failglob +force_fignore +globasciiranges +globskipdots globstar gnu_errfmt histappend histreedit histverify +hostcomplete huponexit inherit_errexit +interactive_comments lastpipe lithist localvar_inherit localvar_unset login_shell mailwarn no_empty_cmd_completion nocaseglob nocasematch noexpand_translation nullglob +patsub_replacement +progcomp progcomp_alias +promptvars restricted_shell shift_verbose +sourcepath varredir_close xpg_echo'.split(' ');

// bash's `set -o`, on in a shell that runs a line, whatever else is set.
const ALWAYS_ON = ['braceexpand', 'hashall', 'interactive-comments'];
const SET_OPTIONS = ['allexport', 'braceexpand', 'emacs', 'errexit', 'errtrace', 'functrace', 'hashall', 'histexpand', 'history', 'ignoreeof', 'interactive-comments', 'keyword', 'monitor', 'noclobber', 'noexec', 'noglob', 'nolog', 'notify', 'nounset', 'onecmd', 'physical', 'pipefail', 'posix', 'privileged', 'verbose', 'vi', 'xtrace'];

// What's left of a run's output after the last `clear` in it (T298).
const afterClear = (text: string) => text.slice(text.lastIndexOf(CLEARED) + 1);

// A line with its quoted text taken out.
const unquoted = (line: string) => line.replace(/\\.|'[^']*'|"(?:\\.|[^"\\])*"/g, (quoted) => (quoted.startsWith('\\') ? '_' : `_${' '.repeat(Math.max(0, quoted.length - 1))}`));

// just-bash's text for `${x}y` is `$xy`, a different name, so a function's body
// lost it on the next line (T361, research G37). What it prints for a bad
// substitution is the text it's given, so that gives it the braces.
function closedNames(node: unknown): unknown {
  const copy = structuredClone(node);
  walk(copy, (each) => {
    if (!Array.isArray(each.parts)) return;
    const parts = each.parts as AstNode[];
    parts.forEach((part, at) => {
      const after = parts[at + 1];
      if (part.type === 'ParameterExpansion' && part.operation === null && NAME.test(part.parameter as string) && after?.type === 'Literal' && /^\w/.test(after.value as string)) part.operation = { type: 'BadSubstitution', text: part.parameter };
    });
  });
  return copy;
}

// `"$x""y"`, which just-bash's parser reads as `"$xy"` (T361, research G37): the
// name closed off, and a lone `$` escaped, before the two quotes join.
function keepNames(line: string): string {
  if (!line.includes('""')) return line;
  const open: string[] = [];
  let out = '';
  for (let at = 0; at < line.length; at += 1) {
    const char = line[at]!;
    const top = open.at(-1);
    if (char === '\\') {
      out += line.slice(at, at + 2);
      at += 1;
    } else if (char === "'" && top !== '"') {
      const end = line.indexOf("'", at + 1);
      out += line.slice(at, end < 0 ? line.length : end + 1);
      at = end < 0 ? line.length : end;
    } else if (char === '"' && top === '"') {
      open.pop();
      if (line[at + 1] === '"' && /\w/.test(line[at + 2] ?? '')) out = out.replace(/(?<!\\)\$([A-Za-z_]\w*)?$/, (_, name?: string) => (name === undefined ? '\\$' : `\${${name}}`));
      out += char;
    } else {
      if (char === '"') open.push(char);
      else if (char === '(' && (top === '(' || line[at - 1] === '$')) open.push(char);
      else if (char === ')' && top === '(') open.pop();
      out += char;
    }
  }
  return out;
}

// What just-bash's parser refuses before anything runs: a number with a point in
// arithmetic. In its place, what fails when the line gets there (T368).
const BAD_ARITHMETIC = `${MARK}b`;
const FLOAT_EXPANSION = /(\$?)\(\(((?:(?!\)\)).)*?\d*\.\d(?:(?!\)\)).)*)\)\)/g;
const floatMessage = (typed: string, text = typed.trimStart()) => `${text}: arithmetic syntax error: invalid arithmetic operator (error token is "${text.slice(text.indexOf('.'))}")`;
const withoutFloats = (line: string) => line.replace(FLOAT_EXPANSION, (_, dollar: string, text: string) => (dollar === '$' ? `\${${BAD_ARITHMETIC}:?${typedWord(floatMessage(text))}}` : `${hidden('bad-arithmetic')} ${typedWord(`((: ${floatMessage(text)}`)}`));

// The construct the line leaves open, the innermost, as bash names it (T324).
const CLOSERS: Readonly<Record<string, string>> = { if: 'fi', for: 'done', while: 'done', until: 'done', select: 'done', case: 'esac', '{': '}', '(': ')', '[[': ']]' };
function openConstruct(line: string): string | null {
  const stack: string[] = [];
  let start = true;
  for (const word of unquoted(line).match(/\[\[|\]\]|;;|[;|&(){}]|[^\s;|&(){}]+/g) ?? []) {
    if (stack.at(-1) === '[[' && word !== ']]') continue;
    const opener: boolean = start && word in CLOSERS;
    if (opener) stack.push(word);
    else if (word === ')' || word === 'esac' || word === 'done' || word === 'fi' || word === '}' || word === ']]') {
      if (stack.at(-1) !== undefined && CLOSERS[stack.at(-1)!] === word) stack.pop();
      else if (word === ')' && stack.at(-1) === 'case') {
        start = true;
        continue;
      }
    }
    start = opener ? word !== 'for' && word !== 'select' && word !== 'case' : /^(?:;;|[;|&({]|then|do|else|elif|!|time|in)$/.test(word) || word === ')';
  }
  return stack.at(-1) ?? null;
}

// A `;` where bash needs a command or a word (T342), which just-bash reads as
// the end of the input.
const STRAY_SEMICOLON = /(?:&&|\|\||\||^\s*\(|(?:^|[;&|(]\s*)(?:\{|if|then|else|elif|while|until|do)|\bcase\s+\S+\s+in|(?<!=)\(\s*\)|;[ \t])\s*;(?!;)|(?<![&>;|])&[ \t]*;(?!;)/;

const BARE_BODY = /((?:^|[;&|{(]\s*)(?:function\s+)?[A-Za-z_][\w-]*\s*\(\s*\)\s*)(\[\[.*?\]\]|\(\(.*?\)\))/g;

// What's after `[[` where bash stops reading it, in its words.
function conditionalMessage(test: string): string {
  const [before = '', stop] = test.split(/\s*([;&|()])/);
  const words = before.split(/\s+/).filter((word) => word !== '');
  const token = stop ?? 'newline';
  const near = stop ?? words.at(-1);
  const wording = words.length === 0 ? `unexpected token \`${token}' in conditional command` : words.length === 1 && /^-[a-zA-Z]$/.test(words[0]!) ? `unexpected argument \`${token}' to conditional unary operator` : words.length === 1 ? `unexpected token \`${token}', conditional binary operator expected` : `unexpected argument \`${token}' to conditional binary operator`;
  return `line 1: ${wording}\nbash: line 1: syntax error near \`${near}'`;
}

// just-bash's parse errors as bash words them (T293): `line 1: …`, and an
// unfinished line as the end of the input bash would have reached.
function parseMessage(message: string, line: string): string {
  const text = message.replace(/^Parse error at \d+:\d+: /, '').replace(/^line \d+: /, '');
  const plain = unquoted(line);
  const emptyTest = /\[\[\s*\]\]\s*(;|&&|\|\||\||&)?/.exec(plain);
  if (/^Expected conditional expression/.test(text) && emptyTest !== null) return `line 1: syntax error near \`${emptyTest[1] ?? ']]'}'`;
  if (STRAY_SEMICOLON.test(plain)) return "line 1: syntax error near unexpected token `;'";
  const list = /^\s*for\s+\w+(?:\s+in\b[^;]*)?;\s*([^\s;]+)/.exec(plain)?.[1];
  if (list !== undefined && list !== 'do') return `line 1: syntax error near unexpected token \`${list}'`;
  if (/\$\{[^}]*$/.test(plain) && /bad substitution$/.test(text)) return "line 1: unexpected EOF while looking for matching `}'";
  if (/\[\[\s+\S+\s+(?:-eq|-ne|-lt|-le|-gt|-ge|-nt|-ot|-ef|==?|!=|=~|<|>)\s+\]\]/.test(plain)) return "line 1: unexpected argument `]]' to conditional binary operator\nbash: line 1: syntax error near `]]'";
  const unexpected = /^Expected .*, got (\S+)$/.exec(text);
  const closing = /near unexpected token `(fi|done|esac)'$/.exec(text);
  const test = /\[\[(?:\s+(.*?))?\s*$/.exec(unquoted(line))?.[1];
  const opens = openConstruct(line);
  if (opens === '[[') {
    if (test === undefined) return "line 1: unexpected token `EOF' in conditional command\nbash: line 1: syntax error: unexpected end of file from `[[' command on line 1";
    return conditionalMessage(test);
  }
  if (/^(select|coproc)\s*$/.test(line.trim())) return "line 1: syntax error near unexpected token `newline'";
  if (/^Expected (redirection target|here-.ocument delimiter|function name|variable name in for loop|word after 'case')/.test(text)) {
    const column = Number(/^Parse error at \d+:(\d+)/.exec(message)?.[1] ?? 0);
    const after = column > 0 ? line.slice(column - 1).trim().split(/\s+/)[0] : '';
    return `line 1: syntax error near unexpected token \`${after || 'newline'}'`;
  }
  if (opens !== null) return `line 1: ${END_OF_FILE} from \`${opens}' command on line 1`;
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
  const commands: string[] = [];
  walk(ast, (node) => {
    const text = (node.expression as { originalText?: string } | undefined)?.originalText;
    if (node.type === 'ArithmeticExpansion' && text !== undefined) texts.push(text);
    else if (text !== undefined) commands.push(text);
  });
  return stderr
    .replace(/(^|\n)\S+: syntax error: invalid arithmetic operator (\(error token is "(.).*"\))\n$/, (_, lead: string, rest: string, token: string) => `${lead}bash: ${texts[0] ?? ''}: arithmetic syntax error${token === '.' ? ': invalid arithmetic operator' : ' in expression'} ${rest}\n`)
    .replace(/^bash: let: (\S+): \S+\.\.\.: syntax error: invalid arithmetic operator$/m, (_, text: string) => `bash: let: ${floatMessage(text)}`)
    .replace(/(^|\n)value too great for base\n$/, (_, lead: string) => `${lead}bash: ${texts[0] ?? ''}: value too great for base (error token is "${texts[0] ?? ''}")\n`)
    .replace(/^bash: arithmetic expression: syntax error: (.*)$/m, (_, rest: string) => `bash: ((: ${commands[0] ?? ''}: arithmetic syntax error: ${rest}`)
    .replace(/^bash: ((?:let: )?[^:\n]*): syntax error: (operand expected.*)$/gm, 'bash: $1: arithmetic syntax error: $2')
    .replace(/^bash: let: (.*): Parse error at .*Expected DPAREN_END, got EOF$/m, (_, text: string) => `bash: let: ${text}: missing \`)' (error token is "${/(\w+|\S)\s*$/.exec(text)?.[1] ?? ''}")`)
    .replace(/(^|\n)division by 0\n$/, (whole, lead: string) => {
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
  let record: RunRecord = { line: '', history: [], shell: 'desktop', recorded: [], effects: [], pipe: null, pipedFunctions: 0, builtinHelp: false, stopped: null, deadline: 0 };
  // The last checkpoint the line reached, and whether it was the one after
  // the line (T286).
  let captured: Captured | null = null;
  let previous: Captured | null = null;
  let finished = false;
  let baseline = new Map<string, string>();
  let lastFiles = JSON.stringify({ folders: [], files: {}, bytes: 0 });

  // The checkpoint's three steps, which run as commands of the shell: the
  // status, `$_`, PIPESTATUS, the working folder and the variables; then, from
  // a pipe, the stack, the functions and what `declare -p` lists, with the
  // settings; then all that `$?`, `$_` and PIPESTATUS were, again (research R27).
  let reading: { taken: Captured; held: [string, string][]; last: boolean } | null = null;
  const quiet = (exitCode = 0) => ({ stdout: '', stderr: '', exitCode });
  const quoted = (word: string) => `'${word.replaceAll("'", `'\\''`)}'`;
  // The running shell's state, for what has no command to reach it.
  let running: { state: { exportedVars?: Set<string>; startTime: number } } | null = null;
  // Where `$SECONDS` counts from.
  let secondsFrom = Date.now();
  const activeState = () => running?.state ?? null;
  // A command's result that sets PIPESTATUS, as just-bash's own restore does.
  const resulting = (exitCode: number, pipes: readonly number[]) => ({ ...quiet(exitCode), ...(pipes.length > 0 ? { internalPipeStatusOverride: [...pipes] } : {}) });
  const own = (name: string, run: Parameters<typeof defineCommand>[1]) => defineCommand(`${MARK}${name}`, run);
  const decodeStdin = (ctx: { stdin: unknown }) => new TextDecoder().decode(Uint8Array.from(String(ctx.stdin), (char) => char.charCodeAt(0)));
  let baselineKnown: readonly string[] = [];
  const cvBegin = own('begin', async (args, ctx) => {
    const [status, position, last = '', ...pipes] = args;
    const held = [...ctx.env].filter(([, value]) => value.length >= LISTED);
    const taken: Captured = { status: Number(status ?? 0), functions: [], declarations: [], options: [], shopts: [], cwd: ctx.cwd, env: new Map(ctx.env), exported: Object.keys(ctx.exportedEnv ?? {}), bare: bareExports(ctx), last, pipes: pipes.map(Number), stack: [] };
    for (const [name] of held) ctx.env.delete(name);
    ctx.env.set(LAST, last.length < LISTED ? last : '');
    reading = { taken, held, last: position === 'last' };
    return quiet();
  });
  const cvRead = own('read', async (args) => {
    const { taken } = reading!;
    const lines = fs.takeCheck().split('\n');
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
    previous = captured;
    captured = taken;
    finished = last;
    // Where a statement ended in what the line printed (T325), unless `exec`
    // may have sent the text elsewhere.
    return { ...resulting(taken.status, taken.pipes), ...(last || !marking ? {} : { stdout: STATEMENT, stderr: STATEMENT }) };
  });
  let marking = false;
  const cvOk = own('ok', async () => quiet());
  // `yes` as just-bash can't give it, as nothing stops it: what the output limit
  // lets through, however much of the line's budget is gone (T325, G13).
  const yes = defineCommand('yes', async (args, ctx) => {
    if (args[0] === '--help') return ctx.origCommand!(args);
    const text = `${args.join(' ') || 'y'}\n`;
    return { stdout: text.repeat(Math.ceil(limits.output / new TextEncoder().encode(text).length)), stderr: '', exitCode: 0 };
  });
  // The prelude's last: `$?` and PIPESTATUS as the last line left them, and
  // `$_` by its argument (T299, T305).
  let starting: ShellState = INITIAL_STATE;
  const cvStart = own('start', async () => resulting(starting.status, starting.pipes));
  // `<builtin> --help`: `help <builtin>`'s text, with bash's status (T294).
  const cvUsage = own('usage', async (args, ctx) => {
    const help = commands.find((command) => command.name === RENAMED.help)!;
    return { ...(await help.execute(args, ctx)), exitCode: 2 };
  });

  // How this line may end (T314): an `exit` it reached, `set -e` in text only
  // the run itself reads, and a limit a command met by its own means.
  let exiting = false;
  let evalErrexit = false;
  const cvExiting = own('exiting', async (args) => {
    exiting = true;
    return quiet(Number(args[0] ?? 0));
  });
  // `exit`'s words, as bash reads them before it goes (T357).
  let tooManyExits = false;
  const cvExitCheck = own('exit-check', async (args) => {
    const words = args[0] === '--' ? args.slice(1) : args;
    tooManyExits = false;
    if (words.length === 0 || (EXIT_NUMBER.test(words[0]!) && words.length === 1)) return quiet();
    if (!EXIT_NUMBER.test(words[0]!)) return { stdout: '', stderr: `bash: exit: ${words[0]!}: numeric argument required\n`, exitCode: 2 };
    tooManyExits = true;
    return { stdout: '', stderr: 'bash: exit: too many arguments\n', exitCode: 1 };
  });
  const cvExitStop = own('exit-stop', async () => quiet(tooManyExits ? 0 : 2));
  // A command's redirects, opened ahead of it (T355).
  const cvOpen = own('open', async () => quiet());
  // What's left of `$(…)` once bash drops its NULs (T360).
  let nulStatus = 0;
  const cvNulStatus = own('nul-status', async (args) => {
    nulStatus = Number(args[0] ?? 0);
    return quiet(nulStatus);
  });
  const cvNul = own('nul', async (_args, ctx) => {
    const text = String(ctx.stdin ?? '');
    const kept = text.replaceAll('\0', '');
    return { stdout: decodeLatin(kept), stderr: kept === text ? '' : 'bash: warning: command substitution: ignored null byte in input\n', exitCode: nulStatus };
  });
  const decodeLatin = (text: string) => new TextDecoder().decode(Uint8Array.from(text, (char) => char.charCodeAt(0)));
  // A folder on a command's standard input, in its own words (T360).
  const cvReadFolder = own('read-folder', async (args) => {
    const [word, ...rest] = args as [string, ...string[]];
    if (word === 'wc') {
      const counts = rest.filter((arg) => /^-[a-zA-Z]/.test(arg)).join('').replace(/-/g, '').length || 3;
      return { stdout: `${Array.from({ length: counts }, () => (counts === 1 ? '0' : '0'.padStart(7))).join(' ')}\n`, stderr: "wc: 'standard input': Is a directory\n", exitCode: 1 };
    }
    const says: Readonly<Record<string, [string, number]>> = { cat: ['cat: -: Is a directory', 1], grep: ['grep: (standard input): Is a directory', 2], read: ['bash: read: 0: read error: Is a directory', 1], sort: ['sort: read failed: -: Is a directory', 2], head: ["head: error reading 'standard input': Is a directory", 1], tail: ["tail: error reading 'standard input': Is a directory", 1], tr: ['tr: read error: Is a directory', 1] };
    const [message, exitCode] = says[word]!;
    return { stdout: '', stderr: `${message}\n`, exitCode };
  });
  const cvStop = own('stop', async () => {
    record.stopped = 'output';
    return quiet();
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
    if (word === 'exit') exiting = true;
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
  const cvSetBad = own('set-bad', async (args) => {
    const bad = args[0]!;
    return { stdout: '', stderr: /^[-+]/.test(bad) ? `bash: set: ${bad}: invalid option\nset: usage: set [-abefhkmnptuvxBCEHPT] [-o option-name] [--] [-] [arg ...]\n` : `bash: set: ${bad}: invalid option name\n`, exitCode: 2 };
  });
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
    if (rest.length === 2 && left !== '!' && !/^-[abcdefghkLnNOoprRsStuvwxzG]$/.test(left!)) return fail(`${left!}: unary operator expected`);
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
  // `shopt` with bash's full table, over the settings just-bash carries (T323).
  const cvShopt = own('shopt', async (args) => {
    const on = new Set((args[1] ?? '').split(':'));
    const known = new Set(baselineKnown);
    const isSet = (name: string, entry: string) => (known.has(name) ? on.has(name) : entry.startsWith('+') || on.has(name));
    const row = (name: string, set: boolean) => `${name.padEnd(20)}\t${set ? 'on' : 'off'}\n`;
    if (args[0] === 'names') {
      let stdout = '';
      let stderr = '';
      let exitCode = 0;
      for (const name of args.slice(2)) {
        const entry = SHOPTS.find((each) => each.replace('+', '') === name);
        if (entry === undefined) stderr += `bash: shopt: ${name}: invalid shell option name\n`;
        else stdout += row(name, isSet(name, entry));
        if (entry === undefined || !isSet(name, entry)) exitCode = 1;
      }
      return { stdout, stderr, exitCode };
    }
    const stdout = SHOPTS.map((entry) => {
      const name = entry.replace('+', '');
      return args[0] === '-p' ? `shopt ${isSet(name, entry) ? '-s' : '-u'} ${name}\n` : row(name, isSet(name, entry));
    }).join('');
    return { stdout, stderr: '', exitCode: 0 };
  });
  // Whether `type` may look for a name: 1 for what doesn't run (T336).
  const cvRuns = own('runs', async (args) => {
    const name = args[0] ?? '';
    return quiet(NAMED_NOT_RUN.has(name) && !functions.has(name) && !ran.has(name) ? 1 : 0);
  });
  // What's exported and has no value yet (T337).
  const bareExports = (ctx: { env: Map<string, string> }) => [...(activeState()?.exportedVars ?? [])].filter((name) => NAME.test(name) && !isOwn(name) && !ctx.env.has(name));
  const cvListed = own('listed', async (args, ctx) => {
    const [word, ...named] = args as [string, ...string[]];
    const bare = bareExports(ctx);
    const stdout = decodeStdin(ctx).replace(/^(?:declare -\S+ )?(?:\?|#|@|\*|\d+)=.*\n/gm, '');
    if (named.length === 0) {
      if (word !== 'export' || bare.length === 0) return { stdout, stderr: '', exitCode: 0 };
      return { stdout: `${[...stdout.split('\n').filter((entry) => entry !== ''), ...bare.map((each) => `declare -x ${each}`)].sort().join('\n')}\n`, stderr: '', exitCode: 0 };
    }
    const shows = (name: string) => new RegExp(`^declare -\\S+ ${name}(?:=|$)`, 'm').test(stdout);
    const missing = named.filter((name) => !shows(name) && !bare.includes(name));
    return { stdout: `${stdout}${named.filter((name) => !shows(name) && bare.includes(name)).map((name) => `declare -x ${name}\n`).join('')}`, stderr: missing.map((name) => `bash: declare: ${name}: not found\n`).join(''), exitCode: missing.length > 0 ? 1 : 0 };
  });
  const cvExportBare = own('export-bare', async (args) => {
    const state = activeState();
    if (state !== null) (state.exportedVars ??= new Set()) && args.forEach((name) => state.exportedVars!.add(name));
    return quiet();
  });
  // `declare -i`'s value, read with `let`, whose errors it words as bash does.
  const cvInteger = own('integer', async (args, ctx) => {
    const value = args[0] ?? '';
    if (value === '' || /^\s*-?\d+\s*$/.test(value)) return quiet();
    const result = await ctx.exec!(`builtin let ${quoted(`${LAST}=${value}`)}`, { cwd: ctx.cwd });
    const wrong = /(?:syntax error|Parse error)[^\n]*?(operand expected[^\n]*|$)/.exec(result.stderr);
    if (wrong === null) return quiet();
    return { stdout: '', stderr: `bash: ${value}: arithmetic syntax error: ${wrong[1] || `operand expected (error token is "${value.at(-1)!}")`}\n`, exitCode: 1 };
  });
  // `exec`'s command (T343).
  let execRan = false;
  const cvExec = own('exec', async (args, ctx) => {
    const word = args[0]!;
    const onPath = word.includes('/') ? fs.exists(fs.resolvePath(ctx.cwd, word)) : Promise.all((ctx.env.get('PATH') ?? '').split(':').map((folder) => fs.exists(`${folder}/${word}`))).then((found) => found.includes(true));
    // A builtin is no file to run, unless it's one of the site's commands.
    const builtin = (SHELL_BUILTINS as readonly string[]).includes(word) && !PATH_BUILTINS.has(word) && word !== 'help';
    execRan = !builtin && (commandNamed(word) !== null || (await onPath));
    if (!execRan) return { stdout: '', stderr: `bash: exec: ${word}: not found\n`, exitCode: 127 };
    return ctx.exec!(args.map(quoted).join(' '), { cwd: ctx.cwd, stdin: String(ctx.stdin ?? ''), env: Object.fromEntries(ctx.env) });
  });
  const cvExecRan = own('exec-ran', async (args, ctx) => {
    heldStatus = Number(args[1] ?? 0);
    if (!execRan) return quiet(1);
    if (args[0] === '1') exiting = true;
    ctx.env.set(TARGET, String(heldStatus));
    return quiet();
  });
  const cvFunctionText = own('function-text', async (_args, ctx) => {
    const text = decodeStdin(ctx);
    return text === '' ? quiet(1) : { stdout: fs.plainText(text.slice(text.indexOf('\n') + 1)), stderr: '', exitCode: 0 };
  });
  const cvFunctionNames = own('function-names', async (_args, ctx) => ({ stdout: decodeStdin(ctx).replace(/^declare -f /gm, ''), stderr: '', exitCode: 0 }));
  const cvAnyFound = own('any-found', async (_args, ctx) => {
    const text = decodeStdin(ctx);
    return { stdout: text, stderr: '', exitCode: text === '' ? 1 : 0 };
  });
  const cvHeld = own('held', async () => quiet(heldStatus));
  const cvFolder = own('folder', async (args, ctx) => quiet((await fs.stat(fs.resolvePath(ctx.cwd, args[0] ?? '')).catch(() => null))?.isDirectory === true ? 0 : 1));
  const cvKeeps = own('keeps', async (args) => quiet((args[0] ?? '').split(':').includes('nullglob') ? 1 : 0));
  // `\${x~}` and `\${x~~}`, which just-bash's parser refuses (T323).
  const cvToggle = own('toggle', async (args) => {
    const [kind, value = ''] = args;
    const flip = (text: string) => [...text].map((char) => (char === char.toLowerCase() ? char.toUpperCase() : char.toLowerCase())).join('');
    const chars = [...value];
    return { stdout: kind === '~~' ? flip(value) : `${flip(chars[0] ?? '')}${chars.slice(1).join('')}`, stderr: '', exitCode: 0 };
  });
  // `((1.5))`, which fails alone (T368).
  const cvBadArithmetic = own('bad-arithmetic', async (args) => ({ stdout: '', stderr: `bash: ${decodeURIComponent(args[0] ?? '')}\n`, exitCode: 1 }));
  // `SECONDS=n`, kept for later lines (T375).
  const cvSeconds = own('seconds', async (args, ctx) => {
    const value = Number.parseInt(args[0] ?? '', 10) || 0;
    secondsFrom = Date.now() - 1000 * value;
    ctx.env.set(SECONDS_SET, String(value));
    return quiet();
  });
  // Every path under a folder, for `**` at a word's end, sorted as bash's (T375).
  const cvGlobstar = own('globstar', async (args, ctx) => {
    const [settings = '', prefix = '', kind = ''] = args;
    const on = settings.split(':');
    const folders = kind === 'folders';
    const paths: string[] = prefix === '' ? [] : [prefix];
    const under = async (typed: string, path: string) => {
      for (const name of await fs.readdir(path).catch(() => [] as string[])) {
        if (name.startsWith('.') && !on.includes('dotglob')) continue;
        const inner = `${typed}${name}`;
        const at = `${path === '/' ? '' : path}/${name}`;
        const isFolder = (await fs.stat(at).catch(() => null))?.isDirectory === true;
        if (!folders) paths.push(inner);
        else if (isFolder) paths.push(`${inner}/`);
        if (isFolder) await under(`${inner}/`, at);
      }
    };
    const root = fs.resolvePath(ctx.cwd, prefix === '' ? '.' : prefix);
    if ((await fs.stat(root).catch(() => null))?.isDirectory === true) await under(prefix, root);
    else paths.length = 0;
    if (paths.length === 0) return { stdout: on.includes('nullglob') ? '' : `${prefix}**${folders ? '/' : ''}\n`, stderr: '', exitCode: 0 };
    return { stdout: `${paths.sort().join('\n')}\n`, stderr: '', exitCode: 0 };
  });
  // `${x^b}`: the first character alone (T390).
  const cvCase = own('case', async (args) => {
    const [direction, pattern = '', value = ''] = args;
    const [first = ''] = value;
    const source = `^(?:${pattern.replace(/[.+^$(){}|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')})$`;
    const matches = first !== '' && new RegExp(source, 'su').test(first);
    return { stdout: matches ? `${direction === 'upper' ? first.toUpperCase() : first.toLowerCase()}${value.slice(first.length)}` : value, stderr: '', exitCode: 0 };
  });
  // `mapfile`'s options (T391): the assignments and calls, for the line's shell to run.
  const cvMapfile = own('mapfile', async (args, ctx) => {
    let [most, skip, origin, delimiter, callback, quantum, strip, name] = [0, 0, -1, '\n', '', 5000, false, 'MAPFILE'];
    const valued = (letter: string, value: string) => {
      if (letter === 'n') most = Number(value);
      else if (letter === 's') skip = Number(value);
      else if (letter === 'O') origin = Number(value);
      else if (letter === 'd') delimiter = value === '' ? '\0' : [...value][0]!;
      else if (letter === 'C') callback = value;
      else if (letter === 'c') quantum = Number(value);
    };
    for (let at = 0; at < args.length; at += 1) {
      const option = /^-([a-zA-Z])(.*)$/s.exec(args[at]!);
      if (option === null) name = args[at]!;
      else if (option[1] === 't') strip = true;
      else valued(option[1]!, option[2] !== '' ? option[2]! : (args[(at += 1)] ?? ''));
    }
    const text = decodeStdin(ctx);
    const items = text.split(delimiter).map((item, at, all) => (at < all.length - 1 ? `${item}${delimiter}` : item)).filter((item) => item !== '');
    const taken = items.slice(skip, most > 0 ? skip + most : undefined);
    const kept = (item: string) => (strip && item.endsWith(delimiter) ? item.slice(0, -delimiter.length) : item);
    let script = origin < 0 ? `${name}=();` : '';
    taken.forEach((item, at) => {
      const place = Math.max(origin, 0) + at;
      if (callback !== '' && (at + 1) % quantum === 0) script += ` ${callback} ${place} ${quoted(item)};`;
      script += ` ${name}[${place}]=${quoted(kept(item))};`;
    });
    ctx.env.set(TARGET, script === '' ? ':' : script);
    return quiet();
  });
  // `compgen`'s kinds, as Tab has them (T392).
  const cvCompgen = own('compgen', async (args) => {
    const [kind = '', prefix = ''] = args;
    const named = [...functions, ...ran.keys()];
    const lists: Readonly<Record<string, readonly string[]>> = {
      '-k': SHELL_KEYWORDS,
      keyword: SHELL_KEYWORDS,
      '-b': SHELL_BUILTINS,
      builtin: SHELL_BUILTINS,
      function: named,
      '-u': ['guest'],
      user: ['guest'],
    };
    const all = lists[kind] ?? [...SHELL_KEYWORDS, ...named, ...SHELL_BUILTINS, ...SITE_WORDS, ...STANDARD_COMMANDS];
    const found = [...new Set(all)].filter((name) => name.startsWith(prefix));
    return { stdout: found.map((name) => `${name}\n`).join(''), stderr: '', exitCode: found.length > 0 ? 0 : 1 };
  });
  let rangeFailed = false;
  const cvLoopCount = own('loop-count', async (args) => {
    rangeFailed = true;
    return { stdout: '', stderr: `bash: ${args[0]!}: ${args[1]!}: loop count out of range\n`, exitCode: 1 };
  });
  const cvLoopEnded = own('loop-ended', async (args) => {
    const failed = rangeFailed;
    rangeFailed = false;
    return quiet(failed ? 1 : Number(args[0] ?? 0));
  });
  const cvClosedOutput = own('closed-output', async (args) => ({ stdout: '', stderr: `bash: ${args[0]!}: write error: Bad file descriptor\n`, exitCode: 1 }));
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
      const script = parse(text);
      for (const [name, body] of Object.entries(definitions(script))) ran.set(name, body);
      walk(script, (node) => {
        if (node.type === 'SimpleCommand' && runsExit(node)) exiting = true;
      });
      if (errexitSet(script) === true) evalErrexit = true;
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
    if (to === '') return refuse(typed === undefined ? 'bash: cd: HOME not set\n' : 'bash: cd: null directory\n');
    let stdout = '';
    if (typed === '-') {
      to = ctx.env.get('OLDPWD') ?? '';
      if (to === '') return refuse('bash: cd: OLDPWD not set\n');
      stdout = `${to}\n`;
    }
    const asked = to;
    if (typed !== '-' && to.split('/').includes('..')) {
      const shown = to;
      const at = fs.resolvePath(ctx.cwd, to);
      const stat = await fs.stat(at).catch(() => null);
      if (stat === null) return refuse(`bash: cd: ${shown}: No such file or directory\n`);
      if (!stat.isDirectory) return refuse(`bash: cd: ${shown}: Not a directory\n`);
      to = at;
    }
    ctx.env.set(TARGET, to);
    // A path that starts with exactly two slashes keeps them, and so does what's
    // reached from it (T375).
    twoSlashes = TWO_SLASHES.test(asked) || (!asked.startsWith('/') && TWO_SLASHES.test(ctx.env.get('PWD') ?? ''));
    leaving = ctx.env.get('PWD') ?? ctx.cwd;
    return { stdout, stderr: '', exitCode: 0 };
  });
  let twoSlashes = false;
  let leaving = '';
  const cvSlashes = own('slashes', async (_args, ctx) => {
    if (TWO_SLASHES.test(leaving)) ctx.env.set('OLDPWD', leaving);
    if (twoSlashes) ctx.env.set('PWD', `/${ctx.cwd}`);
    return quiet();
  });

  // After a command with an output redirect: its status, or 1 with bash's
  // error when a write past the 1 MB limit was refused (research G1).
  const cvWrote = defineCommand(WROTE, async (args) => {
    const full = fs.takeFull();
    return { stdout: '', stderr: full.map((target) => `bash: ${target}: No space left on device\n`).join(''), exitCode: full.length > 0 ? 1 : Number(args[0] ?? 0) };
  });

  const commands = siteCommands({ context, fs, run: () => record, limits });

  // The visitor's functions, which win over a site command in another case.
  let functions: ReadonlySet<string> = new Set();

  // What this line runs: the setup, the functions, `$?`, the line and the
  // checkpoints, all parsed already (research R27). The exec's own text is
  // a placeholder; the plugins see the functions and the line.
  let pending: { functions: unknown[]; setup: unknown[]; status: unknown[]; line: unknown[]; check: (last: boolean) => unknown[]; between: boolean } | null = null;
  let pathChanged = false;
  let noCase = false;
  let failGlob = false;
  let globStar = false;
  // What the line's `<` redirects name that's a file when it starts: only the
  // rest may be folders, by the time the command runs (T365).
  let filesAtStart: ReadonlySet<string> = new Set();
  let integers: ReadonlySet<string> = new Set();

  const bashFor = (overhead: number) => {
    const bash = new Bash({
      fs,
      cwd: HOME,
      env: ENV,
      commands: [...STANDARD_COMMANDS],
      customCommands: [...commands, cvBegin, cvRead, cvEnd, cvOk, cvStart, cvUsage, cvHold, cvKeep, cvAfter, cvName, cvExportF, cvSetO, cvIntegerTest, cvOutOfPlace, cvPipedOn, cvPipedOff, cvSaw, cvDefined, cvCd, cvWrote, cvExiting, cvStop, yes, cvShopt, cvFunctionText, cvFunctionNames, cvAnyFound, cvHeld, cvToggle, cvFolder, cvKeeps, cvSetBad, cvRuns, cvListed, cvExportBare, cvInteger, cvExec, cvExecRan, cvExitCheck, cvExitStop, cvOpen, cvNulStatus, cvNul, cvReadFolder, cvBadArithmetic, cvSeconds, cvGlobstar, cvSlashes, cvCase, cvMapfile, cvCompgen, cvLoopCount, cvLoopEnded, cvClosedOutput],
      executionLimits: { maxExecutionTimeMs: limits.time, maxCommandCount: limits.commands + overhead, maxOutputSize: limits.pipe, ...UNREACHED },
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
    bash.registerTransformPlugin(sitePlugin(() => functions, () => pathChanged, { parse: parseOwn as unknown as Parse, serialize, done: new WeakSet(), builtinHelp: () => record.builtinHelp, noCase: () => noCase, failGlob: () => failGlob, globStar: () => globStar, setsSeconds: () => /\bSECONDS\+?=/.test(record.line), integers: () => integers, isFile: (typed) => filesAtStart.has(typed) }));
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
    swap = { type: 'Script', statements: [{ type: 'Statement', pipelines: [{ type: 'Pipeline', commands: [closedNames(node)], negated: false }], operators: [], background: false }] } as unknown as Script;
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
    const lines: string[] = ['declare -ar BASH_VERSINFO=(5 3 0 1 release aarch64-unknown-linux-gnu)', 'BASH=/bin/bash TERM=xterm-256color'];
    if (logicalCwd !== null && fs.canonical(logicalCwd) === state.cwd) lines.push(`PWD=${logicalCwd}`);
    const gone = [...state.unset, ...('OLDPWD' in state.variables ? [] : ['OLDPWD'])];
    if (gone.length > 0) lines.push(`unset ${gone.join(' ')}`);
    const exported = state.exported.filter((name) => NAME.test(name) && name in state.variables);
    if (exported.length > 0) lines.push(`export ${exported.join(' ')}`);
    const bare = state.exported.filter((name) => NAME.test(name) && !(name in state.variables));
    if (bare.length > 0) lines.push(`${hidden('export-bare')} ${bare.join(' ')}`);
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

  // The listings go to a path the file system keeps apart, each by its own
  // redirect: what `exec` did to the line's output doesn't reach them (T326).
  const checkpoint = (last: boolean) => `${hidden('begin')} "$?" ${last ? 'last' : 'mid'} "$_" "\${PIPESTATUS[@]}"\nbuiltin dirs -l -p >| ${CHECK_FILE}\nbuiltin declare -F >> ${CHECK_FILE}\nbuiltin declare -p >> ${CHECK_FILE}\n${hidden('read')} "$SHELLOPTS" "$BASHOPTS"\n${hidden('end')} "$${LAST}" && ((1))`;

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
      exported: [...taken.exported.filter((name) => name in variables), ...taken.bare],
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

  // A function as `type` prints it holds what the adapter runs: each is printed
  // again from the text it was typed as, by a shell with none of that (T336).
  const typedBodies = async (stdout: string, state: ShellState) => {
    let text = stdout;
    for (const [name, typed] of [...Object.entries(state.functions), ...ran]) {
      const block = new RegExp(`^${name.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&')} \\(\\) \\n\\{ \\n[\\s\\S]*?^\\}\\n`, 'gm');
      if (!block.test(text)) continue;
      const shown = await new Bash({ commands: [] }).exec(`${typed}\ntype ${name}`);
      text = text.replace(block, () => shown.stdout.slice(shown.stdout.indexOf('\n') + 1).replace(/ \\\]$/gm, ' ]'));
    }
    return text;
  };

  const filesChanged = async (): Promise<VisitorFiles | undefined> => {
    const snapshot = await fs.snapshot();
    const key = JSON.stringify(snapshot);
    if (key === lastFiles) return undefined;
    lastFiles = key;
    return snapshot;
  };

  const limitOf = (stdout: string, stderr: string, status: number): Limit | null => {
    if (record.stopped !== null) return record.stopped;
    if (status === 124 && /execution exceeded execution deadline/.test(stderr)) return 'time';
    if (status === 126 && !finished && !exiting && LIMIT_WORDS.test(stderr)) return /too many commands|recursion/.test(stderr) ? 'commands' : /iterations/.test(stderr) ? 'time' : 'output';
    // What the line printed reached 1 MB; `yes` stops at a limit with
    // status 0 (G13).
    if (new TextEncoder().encode(stdout + stderr).length >= limits.output) return 'output';
    return null;
  };

  // The working folder bash shows, where it isn't just-bash's (T375).
  let logicalCwd: string | null = null;
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
      baselineKnown = KNOWN_SHOPTS;
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
    record = { line: request.line, history: request.history, shell: request.shell ?? 'desktop', recorded: [], effects: [], pipe: null, pipedFunctions: 0, builtinHelp: false, stopped: null, deadline: Date.now() + limits.time };
    if (request.line.trim() === '') return { ...base, stdout: '', stderr: '', status: state.status, end: 'done' };
    const { line } = request;
    let ast: Script;
    const source = keepNames(line).replace(/\$\{(\w+)(~~?)\}/g, (_, name: string, kind: string) => `$(${hidden('toggle')} ${kind} "\${${name}}")`).replace(/\$\{(\w+\[[@*]\]|[@*])(~~?)\}/g, (_, name: string, kind: string) => `\${${name}^${TOGGLE}${kind}}`);
    const extglob = state.shopts.includes('extglob');
    try {
      try {
        ast = parse(source);
      } catch (error) {
        // A function whose body is `[[ ]]` or `(( ))`, which only bash's parser
        // takes bare (T360).
        const braced = source.replace(BARE_BODY, '$1{ $2; }');
        const floats = withoutFloats(source);
        if (floats !== source && /invalid arithmetic operator/.test((error as Error).message)) ast = parse(floats);
        else if (braced !== source) ast = parse(braced);
        // just-bash reads `!` at a word's start as the operator (T344).
        else if (!extglob || !source.includes('!(')) throw error;
        else ast = withoutMark(parse(source.replace(/(?<=[^\s;|&(]\s+)!\(/g, `${WORD_START}!(`)));
      }
    } catch (error) {
      const message = parseMessage((error as Error).message, line);
      // Not a syntax error to bash, which finds it when it expands the word.
      if (/: bad substitution$/.test(message)) return { ...base, stdout: '', stderr: `bash: ${message.replace(/^line 1: /, '')}\n`, status: 1, end: 'syntax' };
      return { ...base, stdout: '', stderr: `bash: ${message}\n`, status: /^\s*\w+=\([^);]*;[^)]*$/.test(line) ? 1 : 2, end: 'syntax' };
    }
    if (/\$\{\}/.test(unquoted(line))) return { ...base, stdout: '', stderr: 'bash: ${}: bad substitution\n', status: 1, end: 'done', state: { ...state, status: 1 } };
    const open = /\$\(\((?:(?!\)\)).)*$/.test(unquoted(line));
    const stray = STRAY_SEMICOLON.test(unquoted(line)) || (!extglob && holdsExtendedPattern(ast));
    if (open || stray) return { ...base, stdout: '', stderr: open ? "bash: line 1: unexpected EOF while looking for matching `)'\n" : `bash: line 1: syntax error near unexpected token \`${STRAY_SEMICOLON.test(unquoted(line)) ? ';' : '('}'\n`, status: 2, end: 'syntax' };
    const negated = negatedPattern(ast);
    if (negated !== null) return { ...base, stdout: '', stderr: `bash: ${negated}: negated patterns aren't supported\n`, status: 1, end: 'done', state: { ...state, status: 1 } };
    const error = syntaxError(ast);
    if (error !== null) return { ...base, stdout: '', stderr: `bash: ${parseMessage(error, line)}\n`, status: 2, end: 'syntax' };

    const warning = unterminated(ast);
    const setup = setupOf(state);
    // An error can end the line as `exit` does (T286), and a limit stop it
    // anywhere (T310): only a check before that can keep what ran. A check
    // leaves `$?`, `$_` and PIPESTATUS as it found them.
    const between = ast.statements.length > 1;
    marking = between && !/\bexec\b/.test(line);
    captured = null;
    previous = null;
    finished = false;
    reading = null;
    exiting = false;
    evalErrexit = false;
    ran.clear();
    defined.length = 0;
    const functionTexts = Object.values(state.functions);
    functions = new Set([...Object.keys(state.functions), ...Object.keys(definitions(ast))]);
    noCase = (state.shopts.includes('nocaseglob') && !/shopt\s+-u\s+nocaseglob/.test(line)) || /shopt\s+-s\s+nocaseglob/.test(line);
    failGlob = (state.shopts.includes('failglob') && !/shopt\s+-u\s+failglob/.test(line)) || /shopt\s+-s\s+failglob/.test(line);
    globStar = (state.shopts.includes('globstar') && !/shopt\s+-u\s+globstar/.test(line)) || /shopt\s+-s\s+globstar/.test(line);
    integers = new Set([...state.declarations.flatMap((text) => /^declare -\S*i\S* (\w+)/.exec(text)?.[1] ?? []), ...[...line.matchAll(/\b(?:declare|typeset|local)\s+-\w*i\w*\s+(\w+)/g)].map((match) => match[1]!)]);
    pathChanged = 'PATH' in state.variables || state.unset.includes('PATH') || /\bPATH\b/.test(line);
    const functionStatements = functionTexts.flatMap((text) => parseOwn(text).statements as unknown[]);
    hoistArithmetic(functionStatements, parseOwn);
    markExits(functionStatements);
    expandBraces(functionStatements);
    const inputs = new Set<string>();
    walk([ast, functionStatements], (node) => {
      if (!Array.isArray(node.redirections)) return;
      for (const redirection of node.redirections as Redirection[]) if (redirection.operator === '<') inputs.add(staticWord(redirection.target as never) ?? '');
    });
    const fileInputs = new Set<string>();
    for (const typed of inputs) if (typed !== '' && (await fs.stat(fs.resolvePath(state.cwd, typed)).catch(() => null))?.isFile === true) fileInputs.add(typed);
    filesAtStart = fileInputs;
    const setsErrexit = errexitSet(ast);
    starting = state;
    // Words for the messages, before the plugins change the tree.
    const wording = structuredClone(ast);
    walk(ast, (node) => {
      if (node.type === 'For') node.words ??= [allParameters()];
    });
    reported(ast);
    hoistArithmetic(ast, parseOwn);
    markOutOfPlace(ast);
    countSubshells(ast);
    countSubshells(functionStatements);
    markExits(ast);
    expandBraces(ast);
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
      running = bash as unknown as { state: { exportedVars?: Set<string>; startTime: number } };
      running.state.startTime = secondsFrom;
      // The one piece of just-bash's state a run can't set otherwise: the
      // stack has no command that sets it whole (T305, research R27).
      (bash as unknown as { state: { directoryStack?: string[] } }).state.directoryStack = [...state.stack];
      result = await bash.exec(':', { cwd: state.cwd, env: variables, rawScript: true });
      failed = /^bash: syntax error: /.test(result.stderr) && !finished;
    } catch (thrown) {
      const { message } = thrown as Error;
      failed = !LIMIT_WORDS.test(`${message}\n`);
      result = { stdout: '', stderr: `${message.startsWith('bash: ') ? '' : 'bash: '}${message}\n`, exitCode: failed ? 1 : 126 };
    }
    pending = null;
    const left = fs.takeStreamed();
    result = { ...result, stdout: `${result.stdout}${left.stdout}`, stderr: `${result.stderr}${left.stderr}` };
    const unwritten = fs.takeFull().map((target) => `bash: ${target}: No space left on device\n`).join('');
    const taken = captured as Captured | null;
    const shownCwd = taken?.env.get('PWD') ?? '';
    logicalCwd = TWO_SLASHES.test(shownCwd) ? shownCwd : null;
    const fatal = result.stderr.includes(FATAL);
    const cleaned = (text: string) => arithmeticWording(fs
      .plainText(afterClear(text))
      .split('\n')
      .map((entry) => entry.replace(MARK_ASSIGNMENT, '$1'))
      .filter((entry) => !TRACED_OWN.test(entry))
      .map((entry) => entry.replace(/^(\++ )builtin (cd --|eval|source|\.) /, (_, lead: string, word: string) => `${lead}${word === 'cd --' ? 'cd' : word} `))
      // bash says nothing of a shift past the end, and names itself on `[`'s
      // and `test`'s errors (T305).
      .filter((entry) => entry !== 'bash: shift: shift count out of range')
      .map((entry) => entry.replace(/^(?:bash: )?(\d+): unbound variable$/, 'bash: $$$1: unbound variable'))
      .map((entry) => (/\bcommand\s+-[a-zA-Z]*V/.test(line) ? entry.replace(/^([^:\s]+: not found)$/, 'bash: command: $1') : entry))
      .map((entry) => entry.replace(/^shopt: /, 'bash: shopt: ').replace(/^\[: /, 'bash: [: ').replace(/^test: /, `bash: ${/(^|[\s;|&(])\[\s/.test(line) ? '[' : 'test'}: `))
      .map((entry) => entry.replace(/^bash: line \d+: (.*\(error token is ".*"\))$/, 'bash: $1').replace(/^(\S+: value too great for base \(error token is ".*"\))$/, 'bash: $1').replace(/^compopt: /, 'bash: compopt: '))
      .map((entry) => entry.replace(/^bash: eval: (Parse error at .*)$/, (_, message: string) => `bash: eval: ${parseMessage(message, '')}`))
      // A command only just-bash's Node build has is unknown, as in bash
      // (research G17).
      .map((entry) => entry.replace(/^bash: (\S+): command not available in browser environments\..*$/, 'bash: $1: command not found'))
      .join('\n')
      .replace(GROUP_MESSAGE, '$1bash: $2\n'), wording);
    const stderr = cleaned(`${verbose}${warning}${result.stderr.replaceAll(STATEMENT, '')}${unwritten}`);
    const stdout = await typedBodies(afterClear(fs.plainText(result.stdout.replaceAll(STATEMENT, ''))), state);
    fs.endLine();
    const limit = limitOf(stdout, stderr, result.exitCode);
    const files = await filesChanged();
    const shared = { id, stdout, stderr, recorded: record.recorded, ...(files === undefined ? {} : { files }) };
    // Stopped by the output limit, the line shows none of what it printed,
    // only the stopped line (research G14), so a megabyte of text never
    // reaches the screen.
    // What ran up to the last check stays, as bash stopped with Ctrl+C keeps it
    // (T310).
    const lastGood = finished ? previous : taken;
    const stopped = lastGood === null ? state : stateFrom(lastGood, state);
    if (limit === 'output') {
      const before = (text: string) => afterClear(text.includes(STATEMENT) ? text.slice(0, text.lastIndexOf(STATEMENT)).replaceAll(STATEMENT, '') : '');
      const [keptOut, keptErr] = [fs.plainText(before(result.stdout)), cleaned(before(result.stderr))];
      const kept = new TextEncoder().encode(keptOut + keptErr).length < limits.output;
      return { ...shared, stdout: kept ? keptOut : '', stderr: kept ? keptErr : '', recorded: kept ? record.recorded : [], effects: [], status: result.exitCode, end: 'limit', limit, state: stopped };
    }
    // FR-069's text says why, not just-bash's words (T315).
    if (limit !== null) return { ...shared, stderr: result.exitCode === 126 ? stderr.replace(LIMIT_LINE, '') : stderr, effects: [], status: result.exitCode, end: 'limit', limit, state: stopped };
    if (finished) return { ...shared, effects: record.effects, status: taken!.status, end: 'done', state: stateFrom(taken!, state) };
    // Ended by an error that leaves an interactive bash open (FR-021, T286):
    // what ran up to the last check stays.
    const errexit = evalErrexit || (setsErrexit ?? (taken?.options ?? state.options).includes('errexit'));
    if (!failed && !fatal && (exiting || errexit)) return { ...shared, effects: record.effects, status: result.exitCode, end: 'exited', state };
    return { ...shared, effects: record.effects, status: result.exitCode, end: 'done', state: { ...(taken === null ? state : stateFrom(taken, state)), status: result.exitCode } };
  }

  async function write(request: WriteRequest): Promise<WriteOutcome> {
    const { id, path: typed, text, force, cwd } = request;
    const home = typed === '~' || typed.startsWith('~/') ? `${HOME}${typed.slice(1)}` : typed;
    const path = fs.canonical(home.startsWith('/') ? home : `${cwd}/${home}`);
    const refuse = (error: 'exists' | 'cant-open' | 'full' | 'readonly'): WriteOutcome => ({ id, ok: false, error, path });
    // The open file under another name is the file itself, as in vim.
    const own = request.own !== undefined && fs.canonical(request.own) === path;
    const stat = await fs.stat(path).catch(() => null);
    if (own && !force && fs.isProtected(path)) return refuse('readonly');
    if (stat?.isDirectory === true || fs.refusesWrite(path)) return refuse('cant-open');
    if (stat !== null && !force && !own) return refuse('exists');
    try {
      await fs.writeFile(path, text);
    } catch (error) {
      return refuse((error as { code?: string }).code === 'ENOSPC' ? 'full' : 'cant-open');
    }
    const files = await fs.snapshot();
    lastFiles = JSON.stringify(files);
    return { id, ok: true, path, created: stat === null, lines: text.split('\n').length - 1, bytes: new TextEncoder().encode(text).length, files, ...(own ? { own } : {}) };
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
