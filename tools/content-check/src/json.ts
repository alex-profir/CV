import fs from 'node:fs';
import path from 'node:path';
import { findNodeAtLocation, parseTree, printParseErrorCode } from 'jsonc-parser';
import type { Node, ParseError } from 'jsonc-parser';
import type { Location, Problem } from './report.ts';

export type FieldPath = (string | number)[];

// One JSON document as read for a run (data-model.md, DocumentRead). `value`,
// `tree` and `lineStarts` are set when the state is `ok`, `problem` otherwise.
export type DocumentRead = {
  file: string;
  state: 'ok' | 'missing' | 'unreadable';
  value?: unknown;
  tree?: Node;
  lineStarts?: number[];
  problem?: Problem;
};

const START = { line: 1, column: 1 };

function unreadable(file: string, at: { line: number; column: number }, detail: string): DocumentRead {
  return { file, state: 'unreadable', problem: { type: 'unreadable-document', subject: file, location: { file, ...at }, detail } };
}

// The offsets where each line starts. Lines end at `\n` only.
function lineStartsOf(text: string): number[] {
  const starts = [0];
  for (let index = text.indexOf('\n'); index !== -1; index = text.indexOf('\n', index + 1)) starts.push(index + 1);
  return starts;
}

// Lines and columns count from 1. Columns count UTF-16 code units.
export function offsetToLocation(file: string, lineStarts: number[], offset: number): Location {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (lineStarts[middle]! <= offset) low = middle;
    else high = middle - 1;
  }
  return { file, line: low + 1, column: offset - lineStarts[low]! + 1 };
}

// The byte offset where the first invalid UTF-8 sequence starts. A byte that
// completes a character moves the boundary past it, so the sequence a failing
// byte belongs to starts at the last boundary.
function firstInvalidByte(bytes: Uint8Array): number {
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let boundary = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    try {
      if (decoder.decode(bytes.subarray(index, index + 1), { stream: true }) !== '') boundary = index + 1;
    } catch {
      return boundary;
    }
  }
  return boundary;
}

// `CommaExpected` → `comma expected`.
function reason(error: ParseError): string {
  return printParseErrorCode(error.error)
    .replace(/(?<=[a-z])(?=[A-Z])/g, ' ')
    .toLowerCase();
}

export function readDocument(root: string, file: string): DocumentRead {
  let bytes: Buffer;
  try {
    bytes = fs.readFileSync(path.join(root, file));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return { file, state: 'missing', problem: { type: 'missing-document', subject: file, location: { file, ...START }, detail: 'file not found' } };
    }
    return unreadable(file, START, `cannot be read: ${code ?? 'unknown error'}`);
  }

  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return unreadable(file, START, 'starts with a byte order mark');

  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    const prefix = new TextDecoder('utf-8').decode(bytes.subarray(0, firstInvalidByte(bytes)));
    const at = offsetToLocation(file, lineStartsOf(prefix), prefix.length);
    return unreadable(file, at, 'not valid UTF-8');
  }

  const lineStarts = lineStartsOf(text);
  const errors: ParseError[] = [];
  const tree = parseTree(text, errors, { disallowComments: true, allowTrailingComma: false, allowEmptyContent: false });
  if (errors.length > 0 || tree === undefined) {
    const first = errors[0];
    const at = first === undefined ? START : offsetToLocation(file, lineStarts, first.offset);
    return unreadable(file, at, `invalid JSON: ${first === undefined ? 'no value' : reason(first)}`);
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return unreadable(file, START, `invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  return { file, state: 'ok', value, tree, lineStarts };
}

// Where a field is: its key, its value, or (for an array item) its opening
// brace. A path that doesn't exist falls back to the nearest existing
// ancestor's value, and an absent document to 1:1.
export function locate(read: DocumentRead, fieldPath: FieldPath, target: 'key' | 'value' | 'entry'): Location {
  if (read.tree === undefined || read.lineStarts === undefined) return { file: read.file, ...START };
  for (let length = fieldPath.length; length >= 0; length -= 1) {
    const node = findNodeAtLocation(read.tree, fieldPath.slice(0, length));
    if (node === undefined) continue;
    const exact = length === fieldPath.length;
    const key = exact && target === 'key' && node.parent?.type === 'property' ? node.parent.children?.[0] : undefined;
    return offsetToLocation(read.file, read.lineStarts, (key ?? node).offset);
  }
  return { file: read.file, ...START };
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

// `basics.picture`, `work[0].featured`, `basics["odd key"]`, or `(document)`.
export function formatPath(fieldPath: FieldPath): string {
  if (fieldPath.length === 0) return '(document)';
  let result = '';
  for (const part of fieldPath) {
    if (typeof part === 'number') result += `[${part}]`;
    else if (IDENTIFIER.test(part)) result += result === '' ? part : `.${part}`;
    else result += `[${JSON.stringify(part)}]`;
  }
  return result;
}
