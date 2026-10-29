// Engine test helpers: a run context built from a fixture CV and a fixture
// spec list, as the Terminal builds its own from the real ones, and ways to
// read a block. Tests may hold literal values and CV text.
import type { Resume } from '@cv/content';
import { resume as realResume, siteData } from '@cv/content';
import { dateRange } from '../../../src/format/dates.ts';
import { locationLine } from '../../../src/format/location.ts';
import { withoutScheme } from '../../../src/cv/CvLink.tsx';
import { siteText } from '../../../src/site-text.ts';
import { engineContext, runLine } from '../../../src/apps/terminal/engine/commands.ts';
import type { RunContext } from '../../../src/apps/terminal/engine/commands.ts';
import { plainText } from '../../../src/apps/terminal/engine/block.ts';
import type { Block, Node, Result } from '../../../src/apps/terminal/engine/block.ts';
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
    ...engineContext({ text: siteText, format: FORMAT, resume, siteData, specs: SPECS, cvJson: JSON.stringify(resume, null, 2), columns: COLUMNS }),
    ...extra,
  };
}

export const contextFor = (name: FixtureName, extra: Partial<RunContext> = {}) => contextOf(fixture(name), extra);

export function output(result: Result): Block {
  if (result.kind === 'output' || result.kind === 'cd' || result.kind === 'os') return result.block;
  throw new Error(`expected an output, got ${result.kind}`);
}

export const run = (line: string, context: RunContext) => runLine(line, context);

export const textOf = (line: string, context: RunContext) => plainText(output(runLine(line, context)));

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
  const { fs } = engineContext({ text: siteText, format: FORMAT, resume: realResume, siteData, specs: readSpecList(), cvJson: JSON.stringify(realResume, null, 2), columns: COLUMNS });
  const walk = (node: FsNode, path: string[]): string[] =>
    node.kind === 'file' ? [`cat ~/${[...path, node.name].join('/')}`] : node.children.flatMap((child) => walk(child, node.name === '~' ? path : [...path, node.name]));
  return walk(fs, []);
}
