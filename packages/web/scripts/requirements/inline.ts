// A requirement's text as a tree of inline nodes (007 research R7,
// data-model.md Inline). Nothing here makes markup: the browser renders every
// node as React text, so a spec can't put HTML in the page. Only the marks
// the specs use are read; anything else stays text, as written.
import path from 'node:path';

export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'strong' | 'em' | 's'; children: Inline[] }
  | { kind: 'link'; href: string; children: Inline[] }
  | { kind: 'file'; path: string; children: Inline[] }
  | { kind: 'ref'; feature: string; id: string; line: number; text: string };

export type InlineContext = {
  // The spec the text is from, '005-os-shell', and its folder from the
  // repository root, 'specs/005-os-shell'.
  feature: string;
  specDir: string;
  // Each feature's active requirements and their lines.
  lines: Map<string, Map<string, number>>;
};

type Mark = '**' | '~~' | '*' | '_';

const NUMBERED = /^(\d{3}) (FR-\d{3})(?![\w-])/;
const BARE = /^FR-\d{3}(?![\w-])/;
// What may stand between two references of one run: `001 FR-010 to FR-012`.
const RUN_SEPARATOR = /^(?: to | and | or |, |, and |, or )$/;
const WORD = /[\p{L}\p{N}_]/u;
const SPACE = /\s/;

const isWord = (char: string | undefined) => char !== undefined && WORD.test(char);
const isSpace = (char: string | undefined) => char === undefined || SPACE.test(char);

// The code span whose opening backtick run starts at `start`: its end and
// its text, or null when no run of the same length closes it.
function codeSpan(text: string, start: number): { end: number; code: string } | null {
  let open = start;
  while (text[open] === '`') open += 1;
  const size = open - start;
  for (let at = open; at < text.length; ) {
    const next = text.indexOf('`', at);
    if (next === -1) return null;
    let end = next;
    while (text[end] === '`') end += 1;
    if (end - next === size) {
      let code = text.slice(open, next);
      // As CommonMark: one space each side is dropped, so a span can start
      // or end with a backtick.
      if (code.length > 2 && code.startsWith(' ') && code.endsWith(' ') && code.trim() !== '') code = code.slice(1, -1);
      return { end, code };
    }
    at = end;
  }
  return null;
}

// The index of the bracket or parenthesis closing the one at `start`, or -1.
function closing(text: string, start: number, open: string, close: string): number {
  let depth = 0;
  for (let at = start; at < text.length; at += 1) {
    if (text[at] === '`') {
      at = (codeSpan(text, at)?.end ?? at + 1) - 1;
      continue;
    }
    if (text[at] === open) depth += 1;
    if (text[at] === close && --depth === 0) return at;
  }
  return -1;
}

// A link target from a spec: an http or https address, or a repository path
// resolved from the spec's folder. Anything else is null.
function target(address: string, specDir: string): { kind: 'link'; href: string } | { kind: 'file'; path: string } | null {
  if (/^https?:\/\/\S+$/i.test(address)) return { kind: 'link', href: address };
  if (/^[a-z][a-z0-9+.-]*:/i.test(address) || address.startsWith('/') || address.startsWith('#') || address.startsWith('\\')) return null;
  const file = address.replace(/[?#].*$/, '');
  if (file === '') return null;
  const resolved = path.posix.normalize(path.posix.join(specDir, file));
  return resolved.startsWith('../') || resolved === '..' || path.posix.isAbsolute(resolved) ? null : { kind: 'file', path: resolved };
}

export function parseInline(text: string, context: InlineContext): Inline[] {
  // Where the last reference ended, and the feature its run belongs to: a
  // bare ID right after it, with only a run separator between, is that
  // feature's. A run that starts at an unknown spec stays unknown.
  let run: { feature: string | null; end: number } | null = null;
  // Positions where a mark was looked for and never closed, so a text full
  // of lone marks is read in linear passes, not exponential ones.
  const unclosed = new Set<string>();

  const featureOf = (number: string) => [...context.lines.keys()].find((feature) => feature.startsWith(`${number}-`)) ?? null;
  const lineOf = (feature: string | null, id: string) => (feature === null ? undefined : context.lines.get(feature)?.get(id));

  // Whether the mark at `at` can open or close emphasis there.
  const opens = (mark: Mark, at: number) => {
    if (isSpace(text[at + mark.length])) return false;
    return mark !== '_' || !isWord(text[at - 1]);
  };
  const closes = (mark: Mark, at: number) => {
    if (isSpace(text[at - 1])) return false;
    return mark !== '_' || !isWord(text[at + 1]);
  };
  const markAt = (at: number): Mark | null => {
    if (text.startsWith('**', at)) return '**';
    if (text.startsWith('~~', at)) return '~~';
    if (text[at] === '*' || text[at] === '_') return text[at] as Mark;
    return null;
  };

  // The nodes from `start` until `closer` closes them, or the text's end
  // when there's no closer. Null when the closer never comes.
  const parse = (start: number, end: number, closer: Mark | null): { nodes: Inline[]; end: number } | null => {
    if (closer !== null && unclosed.has(`${start}:${closer}`)) return null;
    const nodes: Inline[] = [];
    let buffer = '';
    const flush = () => {
      if (buffer !== '') nodes.push({ kind: 'text', text: buffer });
      buffer = '';
    };
    let at = start;
    while (at < end) {
      const char = text[at]!;
      const mark = markAt(at);
      if (closer !== null && mark !== null && text.startsWith(closer, at) && (closer.length === 2 || mark.length === 1 || mark === closer) && closes(closer, at)) {
        flush();
        return { nodes, end: at + closer.length };
      }
      if (char === '`') {
        const span = codeSpan(text, at);
        if (span !== null && span.end <= end) {
          flush();
          nodes.push({ kind: 'code', text: span.code });
          at = span.end;
        } else {
          let run = at;
          while (text[run] === '`') run += 1;
          buffer += text.slice(at, run);
          at = run;
        }
        continue;
      }
      if (mark !== null && opens(mark, at)) {
        const inner = parse(at + mark.length, end, mark);
        if (inner !== null) {
          flush();
          nodes.push({ kind: mark === '**' ? 'strong' : mark === '~~' ? 's' : 'em', children: inner.nodes });
          at = inner.end;
          continue;
        }
        buffer += mark;
        at += mark.length;
        continue;
      }
      if (char === '[') {
        const close = closing(text, at, '[', ']');
        const parenClose = close !== -1 && close < end && text[close + 1] === '(' ? closing(text, close + 1, '(', ')') : -1;
        const address = parenClose === -1 || parenClose >= end ? '' : text.slice(close + 2, parenClose);
        const resolved = address === '' || /\s/.test(address) ? null : target(address, context.specDir);
        if (resolved !== null) {
          flush();
          const children = parse(at + 1, close, null)!.nodes;
          nodes.push(resolved.kind === 'link' ? { kind: 'link', href: resolved.href, children } : { kind: 'file', path: resolved.path, children });
          at = parenClose + 1;
          continue;
        }
        if (address !== '') {
          // A link with another scheme stays text, as written.
          buffer += text.slice(at, parenClose + 1);
          at = parenClose + 1;
          continue;
        }
      }
      const boundary = !/[\w-]/.test(text[at - 1] ?? ' ');
      const numbered = boundary && /\d/.test(char) ? NUMBERED.exec(text.slice(at, end)) : null;
      const bare = boundary && char === 'F' ? BARE.exec(text.slice(at, end)) : null;
      if (numbered !== null || bare !== null) {
        const written = (numbered ?? bare)![0];
        const inRun = run !== null && RUN_SEPARATOR.test(text.slice(run.end, at));
        const feature = numbered !== null ? featureOf(numbered[1]!) : inRun ? run!.feature : context.feature;
        const id = numbered !== null ? numbered[2]! : written;
        const line = lineOf(feature, id);
        if (line !== undefined) {
          flush();
          nodes.push({ kind: 'ref', feature: feature!, id, line, text: written });
        } else {
          buffer += written;
        }
        run = { feature, end: at + written.length };
        at += written.length;
        continue;
      }
      buffer += char;
      at += 1;
    }
    if (closer !== null) {
      unclosed.add(`${start}:${closer}`);
      return null;
    }
    flush();
    return { nodes, end };
  };

  return merge(parse(0, text.length, null)!.nodes);
}

// Adjacent text nodes joined, at every depth.
function merge(nodes: Inline[]): Inline[] {
  const merged: Inline[] = [];
  for (const node of nodes) {
    const last = merged.at(-1);
    if (node.kind === 'text' && last?.kind === 'text') merged[merged.length - 1] = { kind: 'text', text: last.text + node.text };
    else merged.push('children' in node ? { ...node, children: merge(node.children) } : node);
  }
  return merged;
}
