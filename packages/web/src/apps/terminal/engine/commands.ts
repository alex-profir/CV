// The Terminal's commands (006 research R7, contracts/commands.md): one table
// that `help`, the parser and the suggestions all read, so no command can be
// missing from `help` (FR-008), and `runLine`, which runs a typed line's
// stages, passing each one's text on to the next (FR-057). Every word is
// site text or CV text, given in the run context, never imported here.
import type { Resume, SiteData } from '@cv/content';
import type { SpecEntry, SpecList } from '../../../../scripts/spec-list.ts';
import { counted, fill } from '../../../site-text.ts';
import type { SiteText } from '../../../site-text.ts';
import { command, line, link, plainText, text } from './block.ts';
import type { Block, Node, Path, Result, Tone, VimSource } from './block.ts';
import { announce } from './announce.ts';
import { aboutBlock, contactBlock, entriesBlock, listBlock } from './cv.ts';
import type { CvInput, Formatters } from './cv.ts';
import { buildFileSystem, formatPath, nodeAt, resolve } from './files.ts';
import type { File, Folder } from './files.ts';
import { printJson, rowText } from './json.ts';
import { parseLine } from './parse.ts';
import { suggest } from './suggest.ts';

export type CommandName =
  | 'help' | 'about' | 'work' | 'projects' | 'education' | 'skills' | 'languages' | 'interests'
  | 'contact' | 'cv' | 'site' | 'specs' | 'ls' | 'cd' | 'cat' | 'jq' | 'vim' | 'pwd' | 'open'
  | 'history' | 'clear' | 'exit';

export type ArgKind = keyof SiteText['terminal']['takes'];

// What a stage gets: its arguments as typed, the word that named it, the
// whole line, and what a `|` passed it.
export type Piped = { text: string; name: string | null };
export type Call = { word: string; args: readonly string[]; input: Piped | null; line: string };

export type RunContext = {
  text: SiteText;
  format: Formatters;
  resume: Resume;
  siteData: SiteData;
  specs: SpecList;
  cvJson: string;
  // The desktop window's column count (metrics.ts `TERMINAL.columns`).
  columns: number;
  fs: Folder;
  folder: Path;
  history: readonly string[];
  shell: 'desktop' | 'mobile';
};

export type Command = { name: CommandName; aliases: readonly string[]; args: ArgKind; readsInput: boolean; run: (call: Call, context: RunContext) => Result };

const output = (block: Block, extra: { text?: string; name?: string } = {}): Result => ({ kind: 'output', block, announce: { full: plainText(block) }, ...extra });

// A site text pattern as nodes: each `{key}` is the node given for it, the
// rest is text in `tone`.
function pattern(template: string, fills: Record<string, Node>, tone?: Tone): Node[] {
  return template
    .split(/(\{\w+\})/)
    .filter((part) => part !== '')
    .map((part) => fills[part.slice(1, -1)] ?? text(part, tone));
}

const usageOf = (context: RunContext, name: CommandName) => {
  const { args } = context.text.terminal.commands[name];
  return args === '' ? name : `${name} ${args}`;
};

// `{command} takes {what}. Usage: {usage}`, naming the word as typed (FR-017).
function usage(call: Call, context: RunContext, name: CommandName): Result {
  const kind = COMMANDS.find((row) => row.name === name)!.args;
  return output([text(fill(context.text.terminal.replies.usage, { command: call.word, what: context.text.terminal.takes[kind], usage: usageOf(context, name) }))]);
}

// `{typed} is not a command. Run help to see them all, or try:` and the
// suggestions as chips (FR-016). Replies are inline nodes at the top of the
// block, so typed text is only ever held by a text node (FR-018).
function unknown(word: string, context: RunContext): Result {
  const { replies } = context.text.terminal;
  const suggestions = suggest(word, COMMANDS);
  const lead = [
    text(word, 'primary'),
    ...pattern(replies.unknown.replace('{typed}', ''), {}, 'error'),
    text(' '),
    ...pattern(suggestions.length > 0 ? replies.unknownRun : replies.unknownRunAlone, { help: command('help', 'inline') }),
  ];
  if (suggestions.length === 0) return output(lead);
  return output([...lead, line(...suggestions.flatMap((name, index) => [...(index === 0 ? [] : [text(' ')]), command(name, 'chip', { req: 'suggestion' })]))]);
}

const reply = (template: string, values: Record<string, string>, controls: Record<string, Node> = {}): Result =>
  output(pattern(fill(template, values), controls));

const noSuchPath = (path: string, context: RunContext) => reply(context.text.terminal.replies.noSuchPath, { path });

const isFolder = (path: string, context: RunContext) => reply(context.text.terminal.replies.isFolder, { path }, { command: command(`ls ${path}`, 'inline', { req: 'path' }) });

const isFile = (path: string, context: RunContext) => reply(context.text.terminal.replies.isFile, { path }, { command: command(`cat ${path}`, 'inline', { req: 'path' }) });

// A path to a file, or the reply that says why it isn't one.
function fileAt(path: string, context: RunContext): { file: File } | { reply: Result } {
  const found = resolve(context.fs, path, context.folder);
  if (found === null) return { reply: noSuchPath(path, context) };
  const node = nodeAt(context.fs, found)!;
  return node.kind === 'folder' ? { reply: isFolder(path, context) } : { file: node };
}

const fileText = (file: File) => file.text ?? plainText(file.show());

const cvInput = (context: RunContext): CvInput => ({ resume: context.resume, text: context.text, format: context.format });

// A command that takes no arguments.
const plain =
  (name: CommandName, run: (context: RunContext) => Result) =>
  (call: Call, context: RunContext): Result =>
    call.args.length > 0 ? usage(call, context, name) : run(context);

// `help`: the lead, then a row per command, its name, arguments and aliases
// as controls, and its description (FR-008, FR-015).
function helpBlock(context: RunContext): Block {
  const { commands, helpLead } = context.text.terminal;
  const rows = COMMANDS.map((row): Block[] => {
    const { args, description } = commands[row.name];
    const names: Node[] = [command(row.name, 'inline'), ...(args === '' ? [] : [text(` ${args}`, 'dim')]), ...row.aliases.flatMap((alias) => [text('  '), command(alias, 'inline')])];
    return [names, [text(description, 'secondary')]];
  });
  return [line(text(context.shell === 'mobile' ? helpLead.phone : helpLead.desktop, 'secondary')), { kind: 'rows', rows, req: 'help' }];
}

function help(call: Call, context: RunContext): Result {
  if (call.args.length > 1) return usage(call, context, 'help');
  if (call.args.length === 0) return output(helpBlock(context));
  const row = parseLine(call.args[0]!, COMMANDS);
  const named = row.kind === 'stages' ? row.stages[0]!.command : null;
  if (named === null) return unknown(call.args[0]!, context);
  const own = context.text.terminal.commands[named.name];
  return output([line(text(usageOf(context, named.name), 'primary')), line(text(own.description, 'secondary')), line(text(own.help))]);
}

// A lead in words, then the repository's link, when the site data has one.
function repositoryLine(lead: string, context: RunContext): Node {
  const { repository } = context.siteData;
  return repository === undefined ? line(text(lead, 'dim')) : line(text(lead, 'dim'), text(' '), link(repository, [text(context.format.withoutScheme(repository))], true));
}

// `site`: what the site is and how it was built, then the repository.
export function siteBlock(context: RunContext): Block {
  const { site } = context.text.terminal;
  return [...site.paragraphs.map((paragraph) => line(text(paragraph, 'secondary'))), repositoryLine(site.source, context)];
}

// One spec's row: number, name as a link to its spec.md, status in words and
// active requirement count (FR-013).
export function specRow(entry: SpecEntry, context: RunContext): Block[] {
  const { specs } = context.text.terminal;
  const href = fill(specs.link, { repository: context.siteData.repository ?? '', folder: entry.folder });
  const tone: Tone = entry.status === 'Approved' ? 'approved' : entry.status === 'Draft' ? 'draft' : 'error';
  return [[text(entry.number, 'dim')], [link(href, [text(entry.name)], true)], [text(specs.statuses[entry.status], tone)], [text(fill(counted(specs.requirements, entry.requirements), { n: entry.requirements }), 'dim')]];
}

export const specBlock = (entry: SpecEntry, context: RunContext): Block => [{ kind: 'rows', rows: [specRow(entry, context)], req: 'specs' }];

function specsBlock(context: RunContext): Block {
  const { specs } = context.text.terminal;
  return [
    line(text(fill(counted(specs.lead, context.specs.length), { n: context.specs.length }), 'secondary')),
    { kind: 'rows', rows: context.specs.map((entry) => specRow(entry, context)), req: 'specs' },
    repositoryLine(specs.tail, context),
  ];
}

// `ls`'s names as controls: a folder runs `ls ~/{path}`, a file `cat ~/{path}`
// (FR-043, FR-050).
function lsBlock(context: RunContext, path: Path): Block {
  const node = nodeAt(context.fs, path)!;
  const entries = node.kind === 'folder' ? node.children.map((child) => ({ child, at: [...path, child.name] })) : [{ child: node, at: [...path] }];
  const cells = entries.map(({ child, at }) =>
    child.kind === 'folder'
      ? command(`ls ${formatPath(at)}`, 'inline', { label: `${child.name}/`, req: 'ls', tone: 'folder' })
      : command(`cat ${formatPath(at)}`, 'inline', { label: child.name, req: 'ls' }),
  );
  return [{ kind: 'columns', cells, req: 'ls' }];
}

function ls(call: Call, context: RunContext): Result {
  if (call.args.length > 1) return usage(call, context, 'ls');
  const path = call.args.length === 0 ? context.folder : resolve(context.fs, call.args[0]!, context.folder);
  if (path === null) return noSuchPath(call.args[0]!, context);
  return output(lsBlock(context, path));
}

function cd(call: Call, context: RunContext): Result {
  if (call.args.length > 1) return usage(call, context, 'cd');
  const path = call.args.length === 0 ? [] : resolve(context.fs, call.args[0]!, context.folder);
  if (path === null) return noSuchPath(call.args[0]!, context);
  if (nodeAt(context.fs, path)!.kind === 'file') return isFile(call.args[0]!, context);
  return { kind: 'cd', folder: path, block: [], announce: { full: fill(context.text.terminal.announce.cd, { path: formatPath(path) }) } };
}

function cat(call: Call, context: RunContext): Result {
  if (call.args.length !== 1) return usage(call, context, 'cat');
  const found = fileAt(call.args[0]!, context);
  if ('reply' in found) return found.reply;
  return output(found.file.show(), { text: fileText(found.file), name: found.file.name });
}

// `jq`: pretty-prints a file or what is piped in, with the filter `.` only
// (FR-056). An argument starting with `./` or `../`, or naming something in
// the tree, is a path (FR-045); any other starting with `.` is a filter.
function jq(call: Call, context: RunContext): Result {
  const { replies } = context.text.terminal;
  let args = call.args;
  const first = args[0];
  if (first === '.') args = args.slice(1);
  else if (first?.startsWith('.') && !/^\.\.?\//.test(first) && resolve(context.fs, first, context.folder) === null) return output([text(replies.jqFilter)]);
  if (args.length > 1 || (args.length === 0 && call.input === null)) return usage(call, context, 'jq');
  let source: { text: string; name: string | null; from: string };
  if (args.length === 1) {
    const found = fileAt(args[0]!, context);
    if ('reply' in found) return found.reply;
    source = { text: fileText(found.file), name: found.file.name, from: args[0]! };
  } else source = { text: call.input!.text, name: call.input!.name, from: '|' };
  const printed = printJson(source.text);
  if ('error' in printed) return output([text(fill(replies.jqNotJson, { source: source.from }), 'error')]);
  return output([{ kind: 'json', rows: printed.rows }], { text: printed.rows.map(rowText).join('\n'), ...(source.name === null ? {} : { name: source.name }) });
}

// The vim view's source: JSON rows and folds when the text is JSON, else
// its lines (FR-058).
function vimSource(textValue: string, name: string, pipe: string | null): VimSource {
  const printed = printJson(textValue);
  if (!('error' in printed)) return { name, pipe, rows: printed.rows, folds: printed.folds, type: 'json' };
  const rows = textValue.split('\n').map((row) => {
    const indent = /^ */.exec(row)![0].length;
    return { indent, tokens: [{ kind: 'string' as const, text: row.slice(indent) }] };
  });
  return { name, pipe, rows, folds: [], type: 'text' };
}

function vim(call: Call, context: RunContext): Result {
  if (call.args.length !== 1 || (call.args[0] === '-' && call.input === null)) return usage(call, context, 'vim');
  if (call.args[0] === '-') return { kind: 'open-vim', file: vimSource(call.input!.text, call.input!.name ?? '-', call.line) };
  const found = fileAt(call.args[0]!, context);
  if ('reply' in found) return found.reply;
  return { kind: 'open-vim', file: vimSource(fileText(found.file), found.file.name, call.input === null ? null : call.line) };
}

const CV_PIPE = 'cat cv.json | jq | vim -';

function open(call: Call, context: RunContext): Result {
  if (call.args.length !== 1) return usage(call, context, 'open');
  const name = call.args[0]!.toLowerCase();
  if (name === 'cv' || name === 'about') return { kind: 'os', action: { open: name }, block: [] };
  return reply(context.text.terminal.replies.open, {}, { cv: command('open cv', 'inline', { label: 'cv' }), about: command('open about', 'inline', { label: 'about' }) });
}

function history(context: RunContext): Result {
  return output(context.history.map((entry, index) => line(text(`${index + 1}`, 'dim'), text(`  ${entry}`))));
}

const SECTION = (name: 'work' | 'projects' | 'education') => plain(name, (context) => output(entriesBlock(cvInput(context), name)));
const LIST = (name: 'skills' | 'languages' | 'interests') => plain(name, (context) => output(listBlock(cvInput(context), name)));

// In `help`'s order (FR-008).
export const COMMANDS: readonly Command[] = [
  { name: 'help', aliases: ['?'], args: 'optional-command', readsInput: false, run: help },
  { name: 'about', aliases: ['whoami'], args: 'none', readsInput: false, run: plain('about', (context) => output(aboutBlock(cvInput(context)))) },
  { name: 'work', aliases: ['experience'], args: 'none', readsInput: false, run: SECTION('work') },
  { name: 'projects', aliases: [], args: 'none', readsInput: false, run: SECTION('projects') },
  { name: 'education', aliases: [], args: 'none', readsInput: false, run: SECTION('education') },
  { name: 'skills', aliases: [], args: 'none', readsInput: false, run: LIST('skills') },
  { name: 'languages', aliases: [], args: 'none', readsInput: false, run: LIST('languages') },
  { name: 'interests', aliases: [], args: 'none', readsInput: false, run: LIST('interests') },
  { name: 'contact', aliases: [], args: 'none', readsInput: false, run: plain('contact', (context) => output(contactBlock(cvInput(context)))) },
  // From any folder: `cv.json` is in the home folder.
  { name: 'cv', aliases: [], args: 'none', readsInput: false, run: plain('cv', (context) => runLine(CV_PIPE, { ...context, folder: [] })) },
  { name: 'site', aliases: [], args: 'none', readsInput: false, run: plain('site', (context) => output(siteBlock(context))) },
  { name: 'specs', aliases: [], args: 'none', readsInput: false, run: plain('specs', (context) => output(specsBlock(context))) },
  { name: 'ls', aliases: [], args: 'optional-path', readsInput: false, run: ls },
  { name: 'cd', aliases: [], args: 'optional-path', readsInput: false, run: cd },
  { name: 'cat', aliases: [], args: 'path', readsInput: false, run: cat },
  { name: 'jq', aliases: [], args: 'optional-path-or-input', readsInput: true, run: jq },
  { name: 'vim', aliases: [], args: 'path-or-input', readsInput: true, run: vim },
  { name: 'pwd', aliases: [], args: 'none', readsInput: false, run: plain('pwd', (context) => output([line(text(formatPath(context.folder)))])) },
  { name: 'open', aliases: [], args: 'name', readsInput: false, run: open },
  { name: 'history', aliases: [], args: 'none', readsInput: false, run: plain('history', history) },
  { name: 'clear', aliases: [], args: 'none', readsInput: false, run: plain('clear', () => ({ kind: 'clear' })) },
  { name: 'exit', aliases: [], args: 'none', readsInput: false, run: plain('exit', () => ({ kind: 'os', action: { exit: true }, block: [] })) },
];

// What a stage passes on to the next one.
function piped(result: Result): Piped {
  if (result.kind === 'output') return { text: result.text ?? plainText(result.block), name: result.name ?? null };
  if (result.kind === 'open-vim') return { text: result.file.rows.map(rowText).join('\n'), name: result.file.name };
  return { text: result.kind === 'clear' ? '' : plainText(result.block), name: null };
}

// Runs a typed line (FR-006, FR-007, FR-057).
export function runLine(typed: string, context: RunContext): Result {
  const parsed = parseLine(typed, COMMANDS);
  if (parsed.kind === 'empty') return output([]);
  if (parsed.kind === 'pipe-usage') {
    const first = typed.replace(/\r\n|\r|\n/g, ' ').split('|')[0]!.trim();
    const example = first === '' ? context.text.terminal.replies.pipeExample : first;
    return output([text(fill(context.text.terminal.replies.pipeUsage, { command: example }))]);
  }
  let input: Piped | null = null;
  let result: Result = output([]);
  for (const [index, stage] of parsed.stages.entries()) {
    if (stage.command === null) return unknown(stage.word, context);
    if (index > 0 && !stage.command.readsInput) return output([text(fill(context.text.terminal.replies.noInput, { command: stage.word }))]);
    result = stage.command.run({ word: stage.word, args: stage.args, input, line: typed }, context);
    input = piped(result);
    // Announced as FR-028 sets, by the command's own name.
    if (result.kind === 'output') result = { ...result, announce: announce(stage.command.name, result.block, context.columns) };
  }
  return result;
}

// The context the Terminal runs in, its file system built once (R9).
export function engineContext(data: { text: SiteText; format: Formatters; resume: Resume; siteData: SiteData; specs: SpecList; cvJson: string; columns: number }): RunContext {
  const context: RunContext = { ...data, fs: { kind: 'folder', name: '~', children: [] }, folder: [], history: [], shell: 'desktop' };
  context.fs = buildFileSystem(cvInput(context), data.specs, { cvJson: data.cvJson, readme: () => siteBlock(context), spec: (entry) => specBlock(entry, context) });
  return context;
}
