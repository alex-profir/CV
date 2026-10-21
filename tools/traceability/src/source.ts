import { parseSync } from 'oxc-parser';
import type { Node, Program } from 'oxc-parser';
import type { Location, Problem } from './report.ts';

// Parses a JS or TS file, with the language inferred from its extension. Any
// parse error makes the file unreadable, and nothing from it is used: on a
// fatal error oxc returns an empty tree.
export function parseSource(file: string, text: string): { program: Program } | { problem: Problem } {
  const { program, errors } = parseSync(file, text);
  const error = errors[0];
  if (error === undefined) return { program };
  const start = error.labels[0]?.start;
  return {
    problem: {
      type: 'unreadable-file',
      subject: `"${file}"`,
      location: start === undefined ? { file, line: 1, column: 1 } : createLocator(file, text)(start),
      detail: `cannot be parsed: ${error.message}`,
    },
  };
}

// Maps a string offset to a line and column. oxc's offsets are UTF-16 indices,
// like JS string indices, so they need no conversion.
export function createLocator(file: string, text: string): (offset: number) => Location {
  const lineStarts = [0];
  for (let i = text.indexOf('\n'); i !== -1; i = text.indexOf('\n', i + 1)) lineStarts.push(i + 1);
  return (offset) => {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (lineStarts[middle]! <= offset) low = middle;
      else high = middle - 1;
    }
    return { file, line: low + 1, column: offset - lineStarts[low]! + 1 };
  };
}

// The raw source text of a string literal, or of each part of a template
// literal, with the offset where it starts. Any other node gives nothing.
export function literalParts(node: Node | null | undefined, text: string): { text: string; offset: number }[] {
  if (node?.type === 'Literal' && typeof node.value === 'string') {
    return [{ text: text.slice(node.start + 1, node.end - 1), offset: node.start + 1 }];
  }
  if (node?.type === 'TemplateLiteral') {
    // Each quasi's span starts at the backtick or `}` before its text.
    return node.quasis.map((quasi) => ({ text: quasi.value.raw, offset: quasi.start + 1 }));
  }
  return [];
}

// Calls `fn` on every node below `node`, in source order.
export function visitAll(node: unknown, fn: (node: Node) => void): void {
  if (typeof node !== 'object' || node === null) return;
  for (const [key, value] of Object.entries(node)) {
    if (key === 'parent') continue;
    for (const child of Array.isArray(value) ? value : [value]) {
      if (typeof child !== 'object' || child === null) continue;
      if (typeof (child as { type?: unknown }).type === 'string') fn(child as Node);
      visitAll(child, fn);
    }
  }
}
