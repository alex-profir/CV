// What the status region says after a command (006 research R13, FR-028):
// the output's text when it is at most 5 rows at the desktop window's column
// count, else `{command}: {count} {unit}`, counting what the output lists.
import { plainText } from './block.ts';
import type { Announcement, Block, Node } from './block.ts';

const FULL_ROWS = 5;

// The rows a block takes: a line of text wraps every `columns` characters,
// and each line, heading, list item and row takes at least one, as does
// each of `ls`'s names, which are a list.
export function rows(block: Block, columns: number): number {
  const names = block.reduce((sum, node) => sum + (node.kind === 'columns' ? node.cells.length : 0), 0);
  const rest = block.filter((node) => node.kind !== 'columns');
  const lines = rest.length === 0 ? [] : plainText(rest).split('\n');
  return names + lines.reduce((sum, text) => sum + Math.max(1, Math.ceil(text.length / columns)), 0);
}

// What a long output counts, by the first node that lists something.
function counted(block: Block): Pick<Extract<Announcement, { count: number }>, 'count' | 'unit'> {
  const find = <K extends Node['kind']>(kind: K) => block.find((node): node is Extract<Node, { kind: K }> => node.kind === kind);
  const table = find('rows');
  if (table !== undefined) return { count: table.rows.length, unit: table.req === 'specs' ? 'specs' : 'commands' };
  const columns = find('columns');
  if (columns !== undefined) return { count: columns.cells.length, unit: 'entries' };
  const entries = block.filter((node) => node.kind === 'heading' && node.depth === 1).length;
  if (entries > 0) return { count: entries, unit: 'entries' };
  const items = find('list');
  if (items !== undefined) return { count: items.items.length, unit: items.req === 'history' ? 'lines' : 'entries' };
  return { count: plainText(block).split('\n').length, unit: 'lines' };
}

export function announce(command: string, block: Block, columns: number): Announcement {
  if (rows(block, columns) <= FULL_ROWS) return { full: plainText(block) };
  return { command, ...counted(block) };
}
