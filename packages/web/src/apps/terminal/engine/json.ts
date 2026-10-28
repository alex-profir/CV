// The JSON printer behind `jq` and the vim view (006 research R11,
// data-model.md JSON rows). It lexes the text and never calls `JSON.parse`,
// so keys keep their order, integer-like ones too, and numbers keep their
// spelling. It prints 2 spaces per level, as rows of classed tokens, and
// gives each top-level object or array's first and last line for the folds.
import type { JsonFold, JsonRow, JsonToken } from './block.ts';

type Lexeme = { kind: 'open' | 'close' | 'colon' | 'comma' | 'string' | 'number' | 'literal'; text: string };

type Value =
  | { kind: 'object'; members: { key: string; value: Value }[] }
  | { kind: 'array'; items: Value[] }
  | { kind: 'scalar'; token: JsonToken };

const NUMBER = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
const STRING = /"(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"/y;
const LITERAL = /true|false|null/y;
const SPACE = /[ \t\n\r]*/y;

class NotJson extends Error {}

function lex(text: string): Lexeme[] {
  const lexemes: Lexeme[] = [];
  const at = (pattern: RegExp, from: number) => {
    pattern.lastIndex = from;
    return pattern.exec(text)?.[0] ?? null;
  };
  let index = 0;
  while (true) {
    index += at(SPACE, index)!.length;
    if (index >= text.length) return lexemes;
    const char = text[index]!;
    if (char === '{' || char === '[') lexemes.push({ kind: 'open', text: char });
    else if (char === '}' || char === ']') lexemes.push({ kind: 'close', text: char });
    else if (char === ':') lexemes.push({ kind: 'colon', text: char });
    else if (char === ',') lexemes.push({ kind: 'comma', text: char });
    else {
      const string = char === '"' ? at(STRING, index) : null;
      const number = string === null ? at(NUMBER, index) : null;
      const literal = string === null && number === null ? at(LITERAL, index) : null;
      const found = string ?? number ?? literal;
      if (found === null || found === '') throw new NotJson();
      // A number or literal runs into nothing but punctuation or space.
      const next = text[index + found.length];
      if (string === null && next !== undefined && !/[\s,:\]}]/.test(next)) throw new NotJson();
      lexemes.push({ kind: string !== null ? 'string' : number !== null ? 'number' : 'literal', text: found });
      index += found.length;
      continue;
    }
    index += 1;
  }
}

function parse(lexemes: Lexeme[]): Value {
  let index = 0;
  const next = () => lexemes[index++] ?? null;
  const peek = () => lexemes[index] ?? null;
  const value = (): Value => {
    const lexeme = next();
    if (lexeme === null) throw new NotJson();
    if (lexeme.kind === 'string' || lexeme.kind === 'number' || lexeme.kind === 'literal') return { kind: 'scalar', token: { kind: lexeme.kind, text: lexeme.text } };
    if (lexeme.kind !== 'open') throw new NotJson();
    if (lexeme.text === '[') {
      const items: Value[] = [];
      if (peek()?.text === ']') {
        next();
        return { kind: 'array', items };
      }
      while (true) {
        items.push(value());
        const after = next();
        if (after?.kind === 'close' && after.text === ']') return { kind: 'array', items };
        if (after?.kind !== 'comma') throw new NotJson();
      }
    }
    const members: { key: string; value: Value }[] = [];
    if (peek()?.text === '}') {
      next();
      return { kind: 'object', members };
    }
    while (true) {
      const key = next();
      if (key?.kind !== 'string' || next()?.kind !== 'colon') throw new NotJson();
      members.push({ key: key.text, value: value() });
      const after = next();
      if (after?.kind === 'close' && after.text === '}') return { kind: 'object', members };
      if (after?.kind !== 'comma') throw new NotJson();
    }
  };
  const root = value();
  if (index !== lexemes.length) throw new NotJson();
  return root;
}

const INDENT = 2;
const punctuation = (text: string): JsonToken => ({ kind: 'punctuation', text });
const COLON: readonly JsonToken[] = [punctuation(':'), { kind: 'space', text: ' ' }];

// Prints a value from `indent`, after `prefix` (a key) and before `suffix`
// (a comma), and returns its first and last row.
function print(value: Value, indent: number, prefix: readonly JsonToken[], suffix: readonly JsonToken[], rows: JsonRow[]): { start: number; end: number } {
  const start = rows.length;
  if (value.kind === 'scalar') {
    rows.push({ indent, tokens: [...prefix, value.token, ...suffix] });
    return { start, end: start };
  }
  const [open, close] = value.kind === 'object' ? ['{', '}'] : ['[', ']'];
  const children = value.kind === 'object' ? value.members.map((member) => ({ prefix: [{ kind: 'key', text: member.key } as JsonToken, ...COLON], value: member.value })) : value.items.map((item) => ({ prefix: [], value: item }));
  if (children.length === 0) {
    rows.push({ indent, tokens: [...prefix, punctuation(`${open}${close}`), ...suffix] });
    return { start, end: start };
  }
  rows.push({ indent, tokens: [...prefix, punctuation(open)] });
  children.forEach((child, index) => print(child.value, indent + INDENT, child.prefix, index < children.length - 1 ? [punctuation(',')] : [], rows));
  rows.push({ indent, tokens: [punctuation(close), ...suffix] });
  return { start, end: rows.length - 1 };
}

// A key's text without its quotes, its escapes read.
const keyName = (raw: string): string => raw.slice(1, -1).replace(/\\u([0-9a-fA-F]{4})|\\(.)/g, (_match, code: string | undefined, char: string) => (code !== undefined ? String.fromCharCode(Number.parseInt(code, 16)) : char === 'n' ? '\n' : char === 't' ? '\t' : char));

export function printJson(text: string): { rows: JsonRow[]; folds: JsonFold[] } | { error: 'not-json' } {
  let root: Value;
  try {
    root = parse(lex(text));
  } catch (error) {
    if (error instanceof NotJson) return { error: 'not-json' };
    throw error;
  }
  const rows: JsonRow[] = [];
  const folds: JsonFold[] = [];
  if (root.kind === 'scalar') {
    print(root, 0, [], [], rows);
    return { rows, folds };
  }
  // The root's own lines, with each top-level member printed in between.
  const [open, close] = root.kind === 'object' ? ['{', '}'] : ['[', ']'];
  const members = root.kind === 'object' ? root.members.map((member) => ({ key: keyName(member.key), prefix: [{ kind: 'key', text: member.key } as JsonToken, ...COLON], value: member.value })) : root.items.map((item, index) => ({ key: String(index), prefix: [], value: item }));
  if (members.length === 0) {
    rows.push({ indent: 0, tokens: [punctuation(`${open}${close}`)] });
    return { rows, folds };
  }
  rows.push({ indent: 0, tokens: [punctuation(open)] });
  members.forEach((member, index) => {
    const lines = print(member.value, INDENT, member.prefix, index < members.length - 1 ? [punctuation(',')] : [], rows);
    if (lines.end > lines.start) folds.push({ key: member.key, start: lines.start, end: lines.end });
  });
  rows.push({ indent: 0, tokens: [punctuation(close)] });
  return { rows, folds };
}

// A row as plain text, with its indent.
export const rowText = (row: JsonRow): string => ' '.repeat(row.indent) + row.tokens.map((token) => token.text).join('');
