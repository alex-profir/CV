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
import type { FullText } from '../../../shell-text.ts';
import { blockText, command, line, link, text } from './block.ts';
import { COMMAND_TABLE, commandNamed, pattern } from './command-table.ts';
import type { ArgKind, CommandName } from './command-table.ts';
import type { Block, Effect, Node, Tone } from './block.ts';
import { aboutBlock, contactBlock, entriesBlock, listBlock } from './cv.ts';
import type { CvInput, Formatters } from './cv.ts';
import { buildFileSystem } from './files.ts';
import type { Folder } from './files.ts';

export type { ArgKind, CommandName } from './command-table.ts';
export { commandNamed, pattern };

// What a site command runs with: the site's words and data, the file tree,
// and from the shell, the working folder, the history and which shell
// shows the output.
export type RunContext = {
  text: FullText;
  format: Formatters;
  resume: Resume;
  siteData: SiteData;
  specs: SpecList;
  cvJson: string;
  fs: Folder;
  cwd: string;
  history: readonly string[];
  shell: 'desktop' | 'mobile';
  // The standard commands and builtins `help` lists after the site's, in
  // name order: the shell's, given by it (FR-008, research R32).
  standard: readonly string[];
};

// What a site command gives the shell (data-model.md Site command run):
// `text` is what it prints, `blockText(block)` when there is a block.
export type SiteRun = { text: string; block: Block | null; stderr?: string; status: number; effect?: Effect };

// `word` is the name the command was run by, as typed: an alias names
// itself in replies (FR-017).
export type Command = { name: CommandName; aliases: readonly string[]; args: ArgKind; run?: (args: readonly string[], context: RunContext, word: string) => SiteRun };

export const printed = (block: Block): SiteRun => ({ text: blockText(block), block, status: 0 });

const nothing = (effect?: Effect): SiteRun => ({ text: '', block: null, status: 0, ...(effect === undefined ? {} : { effect }) });

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

// `help`: the lead, then a row per command, its name, arguments and aliases
// as controls, and its description (FR-008, FR-015); then the standard
// group, each name a control running `help <name>` (research R32).
export function helpBlock(context: RunContext): Block {
  const { commands, helpLead, helpTab, standard } = context.text.terminal;
  const rows = COMMANDS.map((row): Block[] => {
    const { args, description } = commands[row.name];
    const names: Node[] = [command(row.name, 'inline'), ...(args === '' ? [] : [text(` ${args}`, 'dim')]), ...row.aliases.flatMap((alias) => [text('  '), command(alias, 'inline')])];
    return [names, [text(description, 'secondary')]];
  });
  const form = context.shell === 'mobile' ? 'phone' : 'desktop';
  const block: Node[] = [line(text(helpLead[form], 'secondary')), line(text(helpTab[form], 'secondary')), { kind: 'rows', rows, req: 'help' }];
  if (context.standard.length === 0) return block;
  return [
    ...block,
    { kind: 'line', children: [text(standard.heading, 'primary'), text('  '), text(standard.note, 'dim')], req: 'standard' },
    { kind: 'columns', cells: context.standard.map((name) => command(`help ${name}`, 'inline', { label: name, req: 'standard' })), req: 'standard' },
  ];
}

// `help <name>`: a site command's usage, description and own help. The
// shell answers for its standard commands and builtins; any other name gets
// a reply that no command has that name (FR-017).
function help(args: readonly string[], context: RunContext, word: string): SiteRun {
  if (args.length > 1) return usage(word, context, 'help');
  if (args.length === 0) return printed(helpBlock(context));
  const named = commandNamed(args[0]!);
  // bash's status for a name it has no help on (FR-017).
  if (named === null) return { text: '', block: null, stderr: `${fill(context.text.terminal.replies.helpUnknown, { name: args[0]!, help: 'help' })}\n`, status: 1 };
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
// What `cv` runs, from the home folder (FR-059).
export const CV_PIPE = 'cat cv.json | jq | vim -';
// And with its output going anywhere but the screen (T303).
export const CV_PRINT = 'cat cv.json | jq';

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
const RUNS: Partial<Record<CommandName, NonNullable<Command['run']>>> = {
  help,
  about: plain('about', (context) => printed(aboutBlock(cvInput(context)))),
  work: SECTION('work'),
  projects: SECTION('projects'),
  education: SECTION('education'),
  skills: LIST('skills'),
  languages: LIST('languages'),
  interests: LIST('interests'),
  contact: plain('contact', (context) => printed(contactBlock(cvInput(context)))),
  site: plain('site', (context) => printed(siteBlock(context))),
  specs: plain('specs', (context) => printed(specsBlock(context))),
  open,
  history,
  clear: plain('clear', () => nothing({ kind: 'clear' })),
};

export const COMMANDS: readonly Command[] = COMMAND_TABLE.map((row) => {
  const run = RUNS[row.name];
  return run === undefined ? row : { ...row, run };
});

// The words a site command or alias can be run by.
export const SITE_WORDS: readonly string[] = COMMANDS.flatMap((row) => [row.name, ...row.aliases]);

export type SiteInput = Omit<RunContext, 'fs' | 'cwd' | 'history' | 'shell' | 'standard'>;

// The context the site's commands run in, the file tree built once (R9).
export function engineContext(data: SiteInput): RunContext {
  const context: RunContext = { ...data, fs: { kind: 'folder', name: '~', children: [] }, cwd: '/home/guest', history: [], shell: 'desktop', standard: [] };
  context.fs = buildFileSystem(cvInput(context), data.specs, { cvJson: data.cvJson, readme: () => siteBlock(context), spec: (entry) => specBlock(entry, context) });
  return context;
}
