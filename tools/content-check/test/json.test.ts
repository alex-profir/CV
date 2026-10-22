import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { formatPath, locate, readDocument } from '../src/json.ts';
import { makeProject } from './helpers/cli.ts';

const FILE = 'doc.json';

// Reads `content` as a document. Bytes are written as given, so tests can
// include a byte order mark or invalid UTF-8.
function read(content: string | Buffer) {
  const root = makeProject({});
  fs.writeFileSync(path.join(root, FILE), content);
  return readDocument(root, FILE);
}

describe('002-cv-content-FR-029: an unreadable document is reported at its first error', () => {
  test('a missing comma, a trailing comma and an unclosed string give the error position', () => {
    const missing = read('{\n  "a": 1\n  "b": 2\n}\n');
    expect(missing.state).toBe('unreadable');
    expect(missing.problem).toEqual({
      type: 'unreadable-document',
      subject: FILE,
      location: { file: FILE, line: 3, column: 3 },
      detail: 'invalid JSON: comma expected',
    });

    const trailing = read('{\n  "a": 1,\n}\n');
    expect(trailing.state).toBe('unreadable');
    expect(trailing.problem?.type).toBe('unreadable-document');
    expect(trailing.problem?.location).toEqual({ file: FILE, line: 3, column: 1 });
    expect(trailing.problem?.detail).toMatch(/^invalid JSON: /);

    const unclosed = read('{\n  "a": "Timi');
    expect(unclosed.state).toBe('unreadable');
    expect(unclosed.problem?.location).toEqual({ file: FILE, line: 2, column: 8 });
    expect(unclosed.problem?.detail).toBe('invalid JSON: unexpected end of string');
  });

  test('a byte order mark is reported at 1:1', () => {
    const result = read(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('{}\n')]));
    expect(result.state).toBe('unreadable');
    expect(result.problem).toEqual({
      type: 'unreadable-document',
      subject: FILE,
      location: { file: FILE, line: 1, column: 1 },
      detail: 'starts with a byte order mark',
    });
  });

  test('invalid UTF-8 is reported at the first invalid byte', () => {
    const result = read(Buffer.from([0x7b, 0x0a, 0xff, 0x7d]));
    expect(result.state).toBe('unreadable');
    expect(result.problem).toEqual({
      type: 'unreadable-document',
      subject: FILE,
      location: { file: FILE, line: 2, column: 1 },
      detail: 'not valid UTF-8',
    });
  });

  test('a missing file is missing-document at 1:1', () => {
    const result = readDocument(makeProject({}), FILE);
    expect(result.state).toBe('missing');
    expect(result.problem).toEqual({
      type: 'missing-document',
      subject: FILE,
      location: { file: FILE, line: 1, column: 1 },
      detail: 'file not found',
    });
  });

  test('locate gives the key, the value or the entry, counting UTF-16 code units', () => {
    const text = '{\n  "city": "Timișoara", "mood": "🙂", "next": 1,\n  "list": [\n    { "a": 1 }\n  ]\n}\n';
    const result = read(text);
    expect(result.state).toBe('ok');
    expect(locate(result, ['city'], 'key')).toEqual({ file: FILE, line: 2, column: 3 });
    expect(locate(result, ['city'], 'value')).toEqual({ file: FILE, line: 2, column: 11 });
    // `ș` is one code unit and the emoji two, so `next` starts at column 38.
    expect(locate(result, ['next'], 'key')).toEqual({ file: FILE, line: 2, column: 38 });
    expect(locate(result, ['list', 0], 'entry')).toEqual({ file: FILE, line: 4, column: 5 });
    // A path that doesn't exist falls back to its nearest existing ancestor.
    expect(locate(result, ['list', 0, 'missing'], 'value')).toEqual({ file: FILE, line: 4, column: 5 });
    expect(locate(result, [], 'value')).toEqual({ file: FILE, line: 1, column: 1 });
  });

  test('formatPath writes field paths', () => {
    expect(formatPath(['basics', 'picture'])).toBe('basics.picture');
    expect(formatPath(['work', 0, 'featured'])).toBe('work[0].featured');
    expect(formatPath(['basics', 'odd key'])).toBe('basics["odd key"]');
    expect(formatPath(['1x'])).toBe('["1x"]');
    expect(formatPath([])).toBe('(document)');
  });
});
