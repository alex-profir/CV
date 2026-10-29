// The Terminal's commands (006 research R7, R29, contracts/commands.md): one
// table that `help` and the suggestions read, so no command can be missing
// from `help` (FR-008). The shell runs every line (research R25); each row
// with a `run` is a site command, which takes the shell's arguments and
// gives the text it prints, the block that text shows, and what it asks of
// the interface. The rest are the shell's own, wrapped where the site adds
// to them. Every word is site text or CV text, given in the run context,
// never imported here.
import type { Resume, SiteData } from '@cv/content';
import type { SpecEntry, SpecList } from '../../../../scripts/spec-list.ts';
import { counted, fill } from '../../../site-text.ts';
import type { SiteText } from '../../../site-text.ts';
import { blockText, command, line, link, text } from './block.ts';
import type { Block, Effect, Node, Tone, VimSource } from './block.ts';
import { aboutBlock, contactBlock, entriesBlock, listBlock } from './cv.ts';
import type { CvInput, Formatters } from './cv.ts';
import { buildFileSystem } from './files.ts';
import type { Folder } from './files.ts';
import { printJson } from './json.ts';

export type CommandName =
  | 'help' | 'about' | 'work' | 'projects' | 'education' | 'skills' | 'languages' | 'interests'
  | 'contact' | 'cv' | 'site' | 'specs' | 'ls' | 'cd' | 'cat' | 'jq' | 'vim' | 'pwd' | 'open'
  | 'history' | 'clear' | 'exit';

export type ArgKind = keyof SiteText['terminal']['takes'];

// What a site command runs with: the site's words and data, the file tree,
// and from the shell, the working folder, the history and which shell
// shows the output.
export type RunContext = {
  text: SiteText;
  format: Formatters;
  resume: Resume;
  siteData: SiteData;
  specs: SpecList;
  cvJson: string;
  fs: Folder;
  cwd: string;
  history: readonly string[];
  shell: 'desktop' | 'mobile';
};

// What a site command gives the shell (data-model.md Site command run):
// `text` is what it prints, `blockText(block)` when there is a block.
export type SiteRun = { text: string; block: Block | null; stderr?: string; status: number; effect?: Effect };

// `word` is the name the command was run by, as typed: an alias names
// itself in replies (FR-017).
export type Command = { name: CommandName; aliases: readonly string[]; args: ArgKind; run?: (args: readonly string[], context: RunContext, word: string) => SiteRun };

export const printed = (block: Block): SiteRun => ({ text: blockText(block), block, status: 0 });

const nothing = (effect?: Effect): SiteRun => ({ text: '', block: null, status: 0, ...(effect === undefined ? {} : { effect }) });

// A site text pattern as nodes: each `{key}` is the node given for it, the
// rest is text in `tone`.
export function pattern(template: string, fills: Record<string, Node>, tone?: Tone): Node[] {
  return template
    .split(/(\{\w+\})/)
    .filter((part) => part !== '')
    .map((part) => fills[part.slice(1, -1)] ?? text(part, tone));
}

export const usageOf = (context: Pick<RunContext, 'text'>, name: CommandName) => {
  const { args } = context.text.terminal.commands[name];
  return args === '' ? name : `${name} ${args}`;
};

// `{command} takes {what}. Usage: {usage}`, naming the word as typed, on
// stderr with status 2 (FR-017).
export function usage(word: string, context: Pick<RunContext, 'text'>, name: CommandName): SiteRun {
  const kind = COMMANDS.find((row) => row.name === name)!.args;
  const reply = fill(context.text.terminal.replies.usage, { command: word, what: context.text.terminal.takes[kind], usage: usageOf(context, name) });
  return { text: '', block: null, stderr: `${reply}\n`, status: 2 };
}

const cvInput = (context: RunContext): CvInput => ({ resume: context.resume, text: context.text, format: context.format });

// A command that takes no arguments.
const plain =
  (name: CommandName, run: (context: RunContext) => SiteRun) =>
  (args: readonly string[], context: RunContext, word: string): SiteRun =>
    args.length > 0 ? usage(word, context, name) : run(context);

// The row a name or alias names, matched in lower case (FR-007).
export const commandNamed = (word: string): Command | null => {
  const typed = word.toLowerCase();
  return COMMANDS.find((row) => row.name === typed || row.aliases.includes(typed)) ?? null;
};

// `help`: the lead, then a row per command, its name, arguments and aliases
// as controls, and its description (FR-008, FR-015).
export function helpBlock(context: RunContext): Block {
  const { commands, helpLead } = context.text.terminal;
  const rows = COMMANDS.map((row): Block[] => {
    const { args, description } = commands[row.name];
    const names: Node[] = [command(row.name, 'inline'), ...(args === '' ? [] : [text(` ${args}`, 'dim')]), ...row.aliases.flatMap((alias) => [text('  '), command(alias, 'inline')])];
    return [names, [text(description, 'secondary')]];
  });
  return [line(text(context.shell === 'mobile' ? helpLead.phone : helpLead.desktop, 'secondary')), { kind: 'rows', rows, req: 'help' }];
}

// `help <name>`: a site command's usage, description and own help. A name
// that is no command gets the shell's "command not found", which the
// interface turns into the unknown-command reply (FR-016).
function help(args: readonly string[], context: RunContext, word: string): SiteRun {
  if (args.length > 1) return usage(word, context, 'help');
  if (args.length === 0) return printed(helpBlock(context));
  const named = commandNamed(args[0]!);
  if (named === null) return { text: '', block: null, stderr: `bash: ${args[0]}: command not found\n`, status: 1 };
  const own = context.text.terminal.commands[named.name];
  return printed([line(text(usageOf(context, named.name), 'primary')), line(text(own.description, 'secondary')), line(text(own.help))]);
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

// The vim view's source: JSON rows and folds when the text is JSON, else
// its lines (FR-058).
export function vimSource(textValue: string, name: string, pipe: string | null): VimSource {
  const printedJson = printJson(textValue);
  if (!('error' in printedJson)) return { name, pipe, rows: printedJson.rows, folds: printedJson.folds, type: 'json' };
  const rows = textValue.split('\n').map((row) => {
    const indent = /^ */.exec(row)![0].length;
    return { indent, tokens: [{ kind: 'string' as const, text: row.slice(indent) }] };
  });
  return { name, pipe, rows, folds: [], type: 'text' };
}

// What `cv` runs, from the home folder (FR-059).
export const CV_PIPE = 'cat cv.json | jq | vim -';

function open(args: readonly string[], context: RunContext, word: string): SiteRun {
  if (args.length !== 1) return usage(word, context, 'open');
  const name = args[0]!.toLowerCase();
  if (name === 'cv' || name === 'about') return nothing({ kind: 'open', view: name });
  const block = pattern(context.text.terminal.replies.open, { cv: command('open cv', 'inline', { label: 'cv' }), about: command('open about', 'inline', { label: 'about' }) });
  return { ...printed(block), status: 1 };
}

// `history`: a numbered line per command run, oldest first, or the last
// `n`; `history -c` empties it (FR-020, FR-029).
function history(args: readonly string[], context: RunContext, word: string): SiteRun {
  if (args.length > 1) return usage(word, context, 'history');
  if (args[0] === '-c') return nothing({ kind: 'clear-history' });
  const last = args.length === 0 ? context.history.length : /^\d+$/.test(args[0]!) ? Number(args[0]) : null;
  if (last === null) return usage(word, context, 'history');
  const from = Math.max(0, context.history.length - last);
  return printed([{ kind: 'list', items: context.history.slice(from).map((entry, index) => [text(`${from + index + 1}`, 'dim'), text(`  ${entry}`)]), req: 'history' }]);
}

const SECTION = (name: 'work' | 'projects' | 'education') => plain(name, (context) => printed(entriesBlock(cvInput(context), name)));
const LIST = (name: 'skills' | 'languages' | 'interests') => plain(name, (context) => printed(listBlock(cvInput(context), name)));

// In `help`'s order (FR-008). `cv` and `vim` are the shell's site commands,
// as they read the file system; `ls`, `cd`, `cat`, `jq`, `pwd` and `exit`
// are the shell's own.
export const COMMANDS: readonly Command[] = [
  { name: 'help', aliases: ['?'], args: 'optional-command', run: help },
  { name: 'about', aliases: ['whoami'], args: 'none', run: plain('about', (context) => printed(aboutBlock(cvInput(context)))) },
  { name: 'work', aliases: ['experience'], args: 'none', run: SECTION('work') },
  { name: 'projects', aliases: [], args: 'none', run: SECTION('projects') },
  { name: 'education', aliases: [], args: 'none', run: SECTION('education') },
  { name: 'skills', aliases: [], args: 'none', run: LIST('skills') },
  { name: 'languages', aliases: [], args: 'none', run: LIST('languages') },
  { name: 'interests', aliases: [], args: 'none', run: LIST('interests') },
  { name: 'contact', aliases: [], args: 'none', run: plain('contact', (context) => printed(contactBlock(cvInput(context)))) },
  { name: 'cv', aliases: [], args: 'none' },
  { name: 'site', aliases: [], args: 'none', run: plain('site', (context) => printed(siteBlock(context))) },
  { name: 'specs', aliases: [], args: 'none', run: plain('specs', (context) => printed(specsBlock(context))) },
  { name: 'ls', aliases: [], args: 'optional-path' },
  { name: 'cd', aliases: [], args: 'optional-path' },
  { name: 'cat', aliases: [], args: 'path' },
  { name: 'jq', aliases: [], args: 'optional-path-or-input' },
  { name: 'vim', aliases: [], args: 'path-or-input' },
  { name: 'pwd', aliases: [], args: 'none' },
  { name: 'open', aliases: [], args: 'name', run: open },
  { name: 'history', aliases: [], args: 'none', run: history },
  { name: 'clear', aliases: [], args: 'none', run: plain('clear', () => nothing({ kind: 'clear' })) },
  { name: 'exit', aliases: [], args: 'none' },
];

// The words a site command or alias can be run by.
export const SITE_WORDS: readonly string[] = COMMANDS.flatMap((row) => [row.name, ...row.aliases]);

export type SiteInput = Omit<RunContext, 'fs' | 'cwd' | 'history' | 'shell'>;

// The context the site's commands run in, the file tree built once (R9).
export function engineContext(data: SiteInput): RunContext {
  const context: RunContext = { ...data, fs: { kind: 'folder', name: '~', children: [] }, cwd: '/home/guest', history: [], shell: 'desktop' };
  context.fs = buildFileSystem(cvInput(context), data.specs, { cvJson: data.cvJson, readme: () => siteBlock(context), spec: (entry) => specBlock(entry, context) });
  return context;
}
