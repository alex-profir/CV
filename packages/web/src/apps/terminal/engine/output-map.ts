// From the shell's output to the screen (006 research R30, data-model.md
// Shown run): a run's stdout, split around the blocks the site's commands
// recorded, and its stderr after it, with the site's replies added to some of
// the shell's lines. Pure: the result arrives as data, the words as site
// text. Typed, piped or printed text stays text (FR-018).
import { fill } from '../../../site-text.ts';
import type { SiteText } from '../../../site-text.ts';
import { announce, counted, rows } from './announce.ts';
import { command, line, plainText, text } from './block.ts';
import type { Announcement, Block, Node } from './block.ts';
import { commandNamed, COMMANDS, pattern } from './commands.ts';
import { suggest } from './suggest.ts';

// What output-map reads of a run's result (contracts/shell-worker.md
// RunResult), as data.
export type ShownResult = {
  stdout: string;
  stderr: string;
  recorded: readonly { text: string; block: Block }[];
  end: 'done' | 'exited' | 'limit' | 'syntax';
  limit?: 'time' | 'commands' | 'output' | 'cancelled';
  state: { cwd: string };
};

export type MapContext = {
  text: SiteText;
  // The desktop window's column count, for announcements (FR-028).
  columns: number;
  // The working folder before the line, so a change is announced.
  cwd?: string;
};

const HOME = '/home/guest';

// The prompt's path: `~` for the home folder, `~/work` below it, the path
// itself outside it (FR-046).
export const formatPrompt = (cwd: string): string => (cwd === HOME ? '~' : cwd.startsWith(`${HOME}/`) ? `~${cwd.slice(HOME.length)}` : cwd);

const lines = (value: string) => {
  const parts = value.split('\n');
  if (parts.at(-1) === '') parts.pop();
  return parts;
};

const stdoutLine = (value: string): Node => line({ kind: 'text', text: value, stream: 'stdout' });
const stderrLine = (value: string): Node => line({ kind: 'text', text: value, stream: 'stderr', tone: 'error' });

// A site text pattern with `{path}` and `{command}` as a regular expression,
// `{path}` captured.
function patternOf(template: string): RegExp {
  const escaped = template.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace('\\{path\\}', '(.+)').replace('\\{command\\}', '\\S+ \\1')}$`);
}

// `{path} is a file. Try cat {path}.` with its control (FR-048).
const tryLine = (template: string, path: string, run: string): Node => line(...pattern(fill(template, { path }), { command: command(`${run} ${path}`, 'inline', { req: 'path' }) }));

// `{typed}: command not found. Run help to see them all, or try:` and the
// suggestions as chips, over the site's commands only (FR-016).
function unknown(word: string, context: MapContext): Node[] {
  const { replies } = context.text.terminal;
  const suggestions = suggest(word, COMMANDS);
  const lead = line(
    text(word, 'primary'),
    ...pattern(replies.unknown.replace('{typed}', ''), {}, 'error'),
    text(' '),
    ...pattern(suggestions.length > 0 ? replies.unknownRun : replies.unknownRunAlone, { help: command('help', 'inline') }),
  );
  if (suggestions.length === 0) return [lead];
  return [lead, line(...suggestions.flatMap((name, index) => [...(index === 0 ? [] : [text(' ')]), command(name, 'chip', { req: 'suggestion' })]))];
}

// The line a stopped run ends with: `stopped` in the error tone, the reason
// after it in the secondary one (design/wireframes.md, FR-069).
export function stoppedLine(message: string): Node {
  const at = message.indexOf(':');
  const children = at < 0 ? [text(message, 'error')] : [text(message.slice(0, at), 'error'), text(message.slice(at), 'secondary')];
  return { kind: 'line', children, req: 'stopped' };
}

// A limit's own message, which FR-069's site text replaces.
const LIMIT_MESSAGE = /^bash: (?:.*: )?(?:execution exceeded execution deadline|too many commands executed|output size limit exceeded|total output size exceeded)/;

function stderrNodes(result: ShownResult, context: MapContext): Node[] {
  const { replies } = context.text.terminal;
  const isFolder = patternOf(replies.isFolder);
  const nodes: Node[] = [];
  for (const entry of lines(result.stderr)) {
    if (result.end === 'limit' && LIMIT_MESSAGE.test(entry)) continue;
    if (result.end === 'syntax') {
      nodes.push(stderrLine(entry.replace(/^bash: /, '').replace(/^(?:line \d+: |Parse error at \d+:\d+: )/, '')));
      continue;
    }
    const notFound = /^bash: (.+): command not found$/.exec(entry);
    if (notFound !== null) {
      nodes.push(...unknown(notFound[1]!, context));
      continue;
    }
    nodes.push(stderrLine(entry));
    const notFolder = /^bash: cd: (.+): Not a directory$/.exec(entry);
    if (notFolder !== null) nodes.push(tryLine(replies.isFile, notFolder[1]!, 'cat'));
    const folder = /^cat: (.+): Is a directory$/.exec(entry);
    if (folder !== null) nodes.push(tryLine(replies.isFolder, folder[1]!, 'ls'));
    // `vim` on a folder says so in the site's words; its path is a control.
    const vimFolder = isFolder.exec(entry);
    if (vimFolder !== null) nodes.splice(-1, 1, tryLine(replies.isFolder, vimFolder[1]!, 'ls'));
  }
  return nodes;
}

// The run's block, and what the status region says (FR-028).
export function mapOutput(result: ShownResult, typed: string, context: MapContext): { block: Block; announce: Announcement } {
  const block: Node[] = [];
  let recordedOnly = true;
  let at = 0;
  const textOut = (value: string) => {
    for (const entry of lines(value)) {
      block.push(stdoutLine(entry));
      recordedOnly = false;
    }
  };
  for (const recorded of result.recorded) {
    const found = result.stdout.indexOf(recorded.text, at);
    if (found < 0 || recorded.text === '') continue;
    textOut(result.stdout.slice(at, found));
    block.push(...recorded.block);
    at = found + recorded.text.length;
  }
  textOut(result.stdout.slice(at));
  const errors = stderrNodes(result, context);
  if (errors.length > 0) recordedOnly = false;
  block.push(...errors);
  if (result.end === 'limit' && result.limit !== undefined) {
    const stopped = context.text.terminal.replies.stopped[result.limit];
    block.push(stoppedLine(stopped));
    // A stopped line is announced by its "stopped" text alone (FR-028).
    return { block, announce: { full: stopped } };
  }

  const word = /^\s*(\S+)/.exec(typed)?.[1] ?? '';
  const name = commandNamed(word)?.name ?? word;
  if (block.length === 0) {
    const moved = context.cwd !== undefined && context.cwd !== result.state.cwd;
    return { block, announce: { full: moved ? fill(context.text.terminal.announce.cd, { path: formatPrompt(result.state.cwd) }) : '' } };
  }
  if (recordedOnly) return { block, announce: announce(name, block, context.columns) };
  // Text: in full when it takes at most 5 rows, else its lines counted.
  if (rows(block, context.columns) <= 5) return { block, announce: { full: plainText(block) } };
  return { block, announce: { command: word, ...counted(block, true) } };
}
