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

// A wrapped line's next rows start this many characters past its indent
// (FR-063).
export const WRAP_INDENT = 2;

// A row's indent and wrap, as the style sheet reads them, in characters.
export const rowIndent = (indent: number) => ({ '--indent': `${indent}ch`, '--wrap': `${indent + WRAP_INDENT}ch` });
export type JsonFold = { key: string; start: number; end: number };

// What the vim view has open (data-model.md Vim view): `name` as typed, or
// `[No Name]` for piped text, whose `path` is null until `:w <path>` names it.
// `readonly`: a protected file (FR-081). `new`: the path didn't exist when
// opened, until first written (FR-080).
// `blank`: one blank line, where the text alone reads as an empty file (T309).
export type VimFile = { name: string; path: string | null; readonly: boolean; new: boolean; blank?: boolean };

// Only sets a color token: the words carry the meaning (FR-031).
export type Tone = 'primary' | 'secondary' | 'dim' | 'heading' | 'error' | 'approved' | 'draft' | 'folder';

export type Node =
  // `stream`: which of the shell's streams printed it, for text the shell
  // printed as text (research R30).
  | { kind: 'text'; text: string; tone?: Tone; stream?: 'stdout' | 'stderr' }
  // `stopped`: the line a stopped run ends with (FR-069); `standard`, the
  // heading of `help`'s standard group (FR-008).
  | { kind: 'line'; children: Block; req?: 'stopped' | 'standard' }
  // Depth 1 is a section, 2 an entry, relative to the command's heading
  // (FR-029); a command showing one section uses 1 for its entries.
  | { kind: 'heading'; depth: 1 | 2; children: Block }
  | { kind: 'list'; items: readonly Block[]; req?: 'history' }
  | { kind: 'link'; href: string; children: Block; external: boolean }
  | { kind: 'time'; datetime: string; text: string; spoken?: string }
  // A command control (FR-015): `line` is the exact command line it runs,
  // `label` the shorter text it may show.
  | { kind: 'command'; line: string; label?: string; style: 'chip' | 'inline'; req?: 'suggestion' | 'path' | 'ls' | 'standard'; tone?: Tone }
  // `ls`'s names (FR-043), and `help`'s standard commands (FR-008).
  | { kind: 'columns'; cells: readonly Node[]; req?: 'ls' | 'standard' }
  // `help`'s and `specs`' table rows.
  | { kind: 'rows'; rows: readonly (readonly Block[])[]; req?: 'help' | 'specs' }
  // `jq`'s output (FR-056).
  | { kind: 'json'; rows: readonly JsonRow[] }
  // A second Tab's list: names as text, never controls (FR-076).
  | { kind: 'completion'; matches: readonly { name: string; folder: boolean }[] };

export type Block = readonly Node[];

// What screen readers hear after a command (FR-028): the output in full, or
// a counted summary.
export type Unit = 'entries' | 'commands' | 'files' | 'lines' | 'specs';
export type Announcement = { full: string } | { command: string; count: number; unit: Unit };

// What a site command asks of the interface after its line (data-model.md
// Run request and result): clear the output, open the vim view, open an
// app, or empty the history (FR-019, FR-058, FR-014, FR-020).
export type Effect =
  | { kind: 'clear' }
  | { kind: 'vim'; file: VimFile; pipe: string | null; text: string; type: 'json' | 'text' }
  | { kind: 'open'; view: 'cv' | 'about' }
  | { kind: 'clear-history' };

export const text = (value: string, tone?: Tone): Node => (tone === undefined ? { kind: 'text', text: value } : { kind: 'text', text: value, tone });

export const line = (...children: Node[]): Node => ({ kind: 'line', children });

export const heading = (depth: 1 | 2, ...children: Node[]): Node => ({ kind: 'heading', depth, children });

export const list = (items: readonly Block[]): Node => ({ kind: 'list', items });

export const link = (href: string, children: Block, external: boolean): Node => ({ kind: 'link', href, children, external });

export const time = (datetime: string, value: string, spoken?: string): Node =>
  spoken === undefined ? { kind: 'time', datetime, text: value } : { kind: 'time', datetime, text: value, spoken };

// What bash puts a backslash before, outside quotes, in a name it inserts.
export const QUOTED = /[ \t\n\\"'@<>=;|&()#$`?*[!:{]/g;

// A path as one word of a command line: as Tab would write it, `~/` outside the
// quotes, so a name is only ever a name (FR-018, T316).
export function pathWord(path: string): string {
  const home = path === '~' || path.startsWith('~/') ? '~' : '';
  const rest = path.slice(home.length);
  if (/[\x00-\x1f\x7f]/.test(rest)) return `${home}${rest.startsWith('/') ? '/' : ''}$'${rest.slice(rest.startsWith('/') ? 1 : 0).replace(/[\\']/g, '\\$&').replace(/\n/g, '\\n').replace(/\t/g, '\\t')}'`;
  return `${home}${rest.replace(QUOTED, '\\$&').replace(/^~/, '\\~')}`;
}

// A command line running `word` on `path`.
export const pathLine = (word: string, path: string): string => `${word} ${path.startsWith('-') ? '-- ' : ''}${pathWord(path)}`;

export const command = (commandLine: string, style: 'chip' | 'inline', options: { label?: string; req?: 'suggestion' | 'path' | 'ls' | 'standard'; tone?: Tone } = {}): Node => ({
  kind: 'command',
  line: commandLine,
  style,
  ...options,
});

// A block's lines: each line, heading, list item and row on a line of its
// own; with `marks`, list items start with `- `, except history's numbered
// lines.
function textLines(block: Block, marks: boolean): string[] {
  const lines: string[] = [];
  let current = '';
  // A list item's mark, put before its first line.
  let mark = '';
  const flush = () => {
    if (current !== '') {
      lines.push(mark + current);
      mark = '';
    }
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
            if (marks && node.req !== 'history') mark = '- ';
            walk(item);
            flush();
          }
          break;
        case 'columns':
          flush();
          current = node.cells.map((cell) => textLines([cell], marks).join(' ')).join('  ');
          flush();
          break;
        case 'rows':
          flush();
          for (const row of node.rows) {
            current = row.map((cell) => textLines(cell, marks).join(' ')).join('  ');
            flush();
          }
          break;
        case 'completion':
          flush();
          current = node.matches.map((match) => match.name).join('  ');
          flush();
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
  return lines;
}

// A block's text as a summary reads it.
export const plainText = (block: Block): string => textLines(block, false).join('\n');

// A block's visible text in reading order, as a site command prints it and a
// protected file holds it (research R29, data-model.md Site command run):
// links by their text, times by their text, controls by their label, JSON
// rows as their tokens, list items marked `- `.
export const blockText = (block: Block): string => textLines(block, true).join('\n');
