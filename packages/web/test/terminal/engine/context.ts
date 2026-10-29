// Engine test helpers: a run context built from a fixture CV and a fixture
// spec list, as the Terminal builds its own from the real ones, lines run
// through the shell on that context and shown as the session shows them,
// and ways to read a block. Tests may hold literal values and CV text.
import type { Resume } from '@cv/content';
import { resume as realResume, siteData } from '@cv/content';
import { dateRange } from '../../../src/format/dates.ts';
import { locationLine } from '../../../src/format/location.ts';
import { withoutScheme } from '../../../src/format/url.ts';
import { siteText } from '../../../src/site-text.ts';
import { engineContext, vimSource } from '../../../src/apps/terminal/engine/commands.ts';
import type { RunContext } from '../../../src/apps/terminal/engine/commands.ts';
import { plainText } from '../../../src/apps/terminal/engine/block.ts';
import type { Announcement, Block, Node, Path, VimSource } from '../../../src/apps/terminal/engine/block.ts';
import { mapOutput } from '../../../src/apps/terminal/engine/output-map.ts';
import { createShell } from '../../../src/apps/terminal/shell/adapter.ts';
import type { Shell } from '../../../src/apps/terminal/shell/adapter.ts';
import { INITIAL_STATE } from '../../../src/apps/terminal/shell/protocol.ts';
import type { RunResult } from '../../../src/apps/terminal/shell/protocol.ts';
import { readSpecList } from '../../../scripts/spec-list.ts';
import type { SpecList } from '../../../scripts/spec-list.ts';
import type { FsNode } from '../../../src/apps/terminal/engine/files.ts';
import { fixture } from '../../helpers/fixtures.ts';
import type { FixtureName } from '../../helpers/fixtures.ts';

export const SPECS: SpecList = [
  { number: '001', folder: '001-first-thing', name: 'First Thing', status: 'Approved', requirements: 12 },
  { number: '002', folder: '002-second-thing', name: 'Second Thing', status: 'Draft', requirements: 3 },
];

export const FORMAT = { dateRange, locationLine, withoutScheme };

// The desktop window's column count, as metrics.ts computes it: 85.
export const COLUMNS = 85;

export function contextOf(resume: Resume, extra: Partial<RunContext> = {}): RunContext {
  return {
    ...engineContext({ text: siteText, format: FORMAT, resume, siteData, specs: SPECS, cvJson: JSON.stringify(resume, null, 2) }),
    ...extra,
  };
}

export const contextFor = (name: FixtureName, extra: Partial<RunContext> = {}) => contextOf(fixture(name), extra);

// A line's run as the session shows it: its output, or what it asks of the
// interface.
export type Shown =
  | { kind: 'output'; block: Block; announce: Announcement; result: RunResult }
  | { kind: 'clear' }
  | { kind: 'open-vim'; file: VimSource }
  | { kind: 'os'; action: { open: 'cv' | 'about' } | { exit: true }; block: Block }
  | { kind: 'cd'; folder: Path; block: Block; announce: Announcement };

export function output(shown: Shown): Block {
  if (shown.kind === 'output' || shown.kind === 'cd' || shown.kind === 'os') return shown.block;
  throw new Error(`expected an output, got ${shown.kind}`);
}

const HOME = '/home/guest';

// The shell for a context, made once per context.
const shells = new WeakMap<RunContext, Shell>();
const shellOf = (context: RunContext): Shell => {
  let shell = shells.get(context);
  if (shell === undefined) {
    shell = createShell({ text: context.text, format: context.format, resume: context.resume, siteData: context.siteData, specs: context.specs, cvJson: context.cvJson });
    shells.set(context, shell);
  }
  return shell;
};

const folderOf = (cwd: string): Path => (cwd === HOME ? [] : cwd.startsWith(`${HOME}/`) ? cwd.slice(HOME.length + 1).split('/') : cwd.split('/').filter((part) => part !== ''));

// One line, from the context's working folder, with its history.
export async function run(line: string, context: RunContext): Promise<Shown> {
  const result = await shellOf(context).run({ id: 1, line, state: { ...INITIAL_STATE, cwd: context.cwd }, history: context.history, shell: context.shell });
  const { block, announce } = mapOutput(result, line, { text: context.text, columns: COLUMNS, cwd: context.cwd });
  if (result.end === 'exited') return { kind: 'os', action: { exit: true }, block };
  const effect = result.effects.find((entry) => entry.kind !== 'clear-history');
  if (effect?.kind === 'vim') return { kind: 'open-vim', file: vimSource(effect.text, effect.name, effect.pipe) };
  if (effect?.kind === 'open') return { kind: 'os', action: { open: effect.view }, block };
  if (effect?.kind === 'clear') return { kind: 'clear' };
  if (result.state.cwd !== context.cwd) return { kind: 'cd', folder: folderOf(result.state.cwd), block, announce };
  return { kind: 'output', block, announce, result };
}

export const textOf = async (line: string, context: RunContext) => plainText(output(await run(line, context)));

// Every node of a block, depth first.
export function nodes(block: Block): Node[] {
  const all: Node[] = [];
  const walk = (list: Block) => {
    for (const node of list) {
      all.push(node);
      if (node.kind === 'line' || node.kind === 'heading' || node.kind === 'link') walk(node.children);
      else if (node.kind === 'list') node.items.forEach(walk);
      else if (node.kind === 'rows') node.rows.forEach((row) => row.forEach(walk));
      else if (node.kind === 'columns') walk(node.cells);
    }
  };
  walk(block);
  return all;
}

// The command controls of a block, as the lines they run.
export const controls = (block: Block) => nodes(block).flatMap((node) => (node.kind === 'command' ? [node.line] : []));

// Every file of the real site's tree, as the line its `ls` control runs:
// `cat ~/{path}`.
export function siteFiles(): string[] {
  const { fs } = engineContext({ text: siteText, format: FORMAT, resume: realResume, siteData, specs: readSpecList(), cvJson: JSON.stringify(realResume, null, 2) });
  const walk = (node: FsNode, path: string[]): string[] =>
    node.kind === 'file' ? [`cat ~/${[...path, node.name].join('/')}`] : node.children.flatMap((child) => walk(child, node.name === '~' ? path : [...path, node.name]));
  return walk(fs, []);
}

// The block a printing command's run gives, with no arguments.
export const blockOf = async (name: string, context: RunContext): Promise<Block> => output(await run(name, context));
