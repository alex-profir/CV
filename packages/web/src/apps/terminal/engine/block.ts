// What a command returns (006 research R3, data-model.md Result and output
// block): data, never markup. One renderer draws every block, and every
// string in it reaches the page as a text child, so typed text can never
// become markup or a link (FR-018).

// A folder's place: [] is the home folder, ['work'] its work folder
// (data-model.md File system).
export type Path = readonly string[];

// JSON as the printer gives it (data-model.md JSON rows): rows of classed
// tokens with their indent, and each top-level object or array's first and
// last line, 0-based, for the vim view's folds.
export type JsonToken = { kind: 'key' | 'string' | 'number' | 'literal' | 'punctuation' | 'space'; text: string };
export type JsonRow = { indent: number; tokens: readonly JsonToken[] };
export type JsonFold = { key: string; start: number; end: number };

// What the vim view shows (data-model.md Vim view): `name` as the status
// line shows it, `pipe` the command line that opened it, if any (FR-059).
export type VimSource = { name: string; pipe: string | null; rows: readonly JsonRow[]; folds: readonly JsonFold[]; type: 'json' | 'text' };

// Only sets a color token: the words carry the meaning (FR-031).
export type Tone = 'primary' | 'secondary' | 'dim' | 'heading' | 'error' | 'approved' | 'draft' | 'folder';

export type Node =
  | { kind: 'text'; text: string; tone?: Tone }
  | { kind: 'line'; children: Block }
  // Depth 1 is a section, 2 an entry, relative to the command's heading
  // (FR-029); a command showing one section uses 1 for its entries.
  | { kind: 'heading'; depth: 1 | 2; children: Block }
  | { kind: 'list'; items: readonly Block[] }
  | { kind: 'link'; href: string; children: Block; external: boolean }
  | { kind: 'time'; datetime: string; text: string; spoken?: string }
  // A command control (FR-015): `line` is the exact command line it runs,
  // `label` the shorter text it may show.
  | { kind: 'command'; line: string; label?: string; style: 'chip' | 'inline'; req?: 'suggestion' | 'path' | 'ls' }
  // `ls`'s names (FR-043).
  | { kind: 'columns'; cells: readonly Node[]; req?: 'ls' }
  // `help`'s and `specs`' table rows.
  | { kind: 'rows'; rows: readonly (readonly Block[])[]; req?: 'help' | 'specs' }
  // `jq`'s output (FR-056).
  | { kind: 'json'; rows: readonly JsonRow[] };

export type Block = readonly Node[];

// What screen readers hear after a command (FR-028): the output in full, or
// a counted summary.
export type Unit = 'entries' | 'commands' | 'files' | 'lines' | 'specs';
export type Announcement = { full: string } | { command: string; count: number; unit: Unit };

export type OsAction = { open: 'cv' | 'about' } | { exit: true };

export type Result =
  // `text`: what a pipe passes on to the next command.
  | { kind: 'output'; block: Block; announce: Announcement; text?: string }
  | { kind: 'clear' }
  | { kind: 'open-vim'; file: VimSource }
  | { kind: 'os'; action: OsAction; block: Block }
  | { kind: 'cd'; folder: Path; block: Block; announce: Announcement };

export const text = (value: string, tone?: Tone): Node => (tone === undefined ? { kind: 'text', text: value } : { kind: 'text', text: value, tone });

export const line = (...children: Node[]): Node => ({ kind: 'line', children });

export const heading = (depth: 1 | 2, ...children: Node[]): Node => ({ kind: 'heading', depth, children });

export const list = (items: readonly Block[]): Node => ({ kind: 'list', items });

export const link = (href: string, children: Block, external: boolean): Node => ({ kind: 'link', href, children, external });

export const time = (datetime: string, value: string, spoken?: string): Node =>
  spoken === undefined ? { kind: 'time', datetime, text: value } : { kind: 'time', datetime, text: value, spoken };

export const command = (commandLine: string, style: 'chip' | 'inline', options: { label?: string; req?: 'suggestion' | 'path' | 'ls' } = {}): Node => ({
  kind: 'command',
  line: commandLine,
  style,
  ...options,
});

// A block's text as a pipe passes it on and as a summary reads it: each
// line, heading, list item and row on a line of its own.
export function plainText(block: Block): string {
  const lines: string[] = [];
  let current = '';
  const flush = () => {
    if (current !== '') lines.push(current);
    current = '';
  };
  const walk = (nodes: Block) => {
    for (const node of nodes) {
      switch (node.kind) {
        case 'text':
        case 'time':
          current += node.text;
          break;
        case 'command':
          current += node.label ?? node.line;
          break;
        case 'link':
          walk(node.children);
          break;
        case 'line':
        case 'heading':
          flush();
          walk(node.children);
          flush();
          break;
        case 'list':
          flush();
          for (const item of node.items) {
            walk(item);
            flush();
          }
          break;
        case 'columns':
          flush();
          current = node.cells.map((cell) => plainText([cell])).join('  ');
          flush();
          break;
        case 'rows':
          flush();
          for (const row of node.rows) {
            current = row.map((cell) => plainText(cell)).join('  ');
            flush();
          }
          break;
        case 'json':
          flush();
          for (const row of node.rows) lines.push(' '.repeat(row.indent) + row.tokens.map((token) => token.text).join(''));
          break;
      }
    }
  };
  walk(block);
  flush();
  return lines.join('\n');
}
