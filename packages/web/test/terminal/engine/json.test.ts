// cv.json, jq and the JSON printer (006 research R11, data-model.md JSON rows).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { resume } from '@cv/content';
import { cvJson } from '../../../src/apps/terminal/data.ts';
import { lexLine, printJson } from '../../../src/apps/terminal/engine/json.ts';
import type { JsonRow } from '../../../src/apps/terminal/engine/block.ts';
import { fixture } from '../../helpers/fixtures.ts';
import { contextFor, contextOf, output, run, textOf } from './context.ts';

const RESUME_FILE = path.resolve(import.meta.dirname, '../../../../content/resume.json');

const rowText = (row: JsonRow) => ' '.repeat(row.indent) + row.tokens.map((token) => token.text).join('');

function printed(text: string) {
  const result = printJson(text);
  if ('error' in result) throw new Error(`not JSON: ${text}`);
  return result;
}

describe('006-terminal-FR-055: cv.json is the CV document as the content source holds it', () => {
  test("cvJson is JSON.stringify(resume, null, 2) and resume.json's text without its final line break", () => {
    expect(cvJson).toBe(JSON.stringify(resume, null, 2));
    expect(cvJson).toBe(fs.readFileSync(RESUME_FILE, 'utf8').replace(/\n$/, ''));
  });

  test("the printer's text parses back to the CV, every key in order", () => {
    const text = printed(cvJson).rows.map(rowText).join('\n');
    expect(text).toBe(cvJson);
    expect(JSON.stringify(JSON.parse(text))).toBe(JSON.stringify(resume));
  });
});

describe('006-terminal-FR-056: jq pretty-prints JSON with keys and numbers as written', () => {
  test('2-space indents and every token classed', () => {
    const { rows } = printed('{"a":[1,true,null,"x"],"b":{"c":false}}');
    expect(rows.map(rowText)).toEqual(['{', '  "a": [', '    1,', '    true,', '    null,', '    "x"', '  ],', '  "b": {', '    "c": false', '  }', '}']);
    expect(rows.map((row) => row.indent)).toEqual([0, 2, 4, 4, 4, 4, 2, 2, 4, 2, 0]);
    const kinds = new Set(rows.flatMap((row) => row.tokens.map((token) => token.kind)));
    expect([...kinds].sort()).toEqual(['key', 'literal', 'number', 'punctuation', 'space', 'string']);
    expect(rows[1]!.tokens).toEqual([
      { kind: 'key', text: '"a"' },
      { kind: 'punctuation', text: ':' },
      { kind: 'space', text: ' ' },
      { kind: 'punctuation', text: '[' },
    ]);
  });

  test('integer-like keys keep their order, and numbers their spelling', () => {
    expect(printed('{"2":1,"1":2}').rows.map(rowText)).toEqual(['{', '  "2": 1,', '  "1": 2', '}']);
    expect(printed('[1.50, 1e3, -0, 2E-7]').rows.map(rowText)).toEqual(['[', '  1.50,', '  1e3,', '  -0,', '  2E-7', ']']);
    expect(printed('"a \\"quoted\\" \\u00e9"').rows.map(rowText)).toEqual(['"a \\"quoted\\" \\u00e9"']);
    expect(printed('{}').rows.map(rowText)).toEqual(['{}']);
    expect(printed('{"a":[],"b":{}}').rows.map(rowText)).toEqual(['{', '  "a": [],', '  "b": {}', '}']);
  });

  test('each top-level object or array is a fold, with its key and its first and last line', () => {
    const { folds } = printed('{"$schema":"x","basics":{"name":"n"},"work":[{"a":1}],"empty":[]}');
    expect(folds).toEqual([
      { key: 'basics', start: 2, end: 4 },
      { key: 'work', start: 5, end: 9 },
    ]);
  });

  test('text that is not JSON is an error', () => {
    for (const text of ['{', '', 'about', '{"a":}', '[1,]', '{"a":1}x', "{'a':1}", '01', '1.', 'tru']) expect(printJson(text), text).toEqual({ error: 'not-json' });
  });

  test('jq . cv.json and cat cv.json | jq . show the JSON block', async () => {
    const context = contextFor('every-field');
    expect(output(await run('jq . cv.json', context)).some((node) => node.kind === 'json')).toBe(true);
    expect(output(await run('cat cv.json | jq .', context)).some((node) => node.kind === 'json')).toBe(true);
    expect(output(await run('jq . ./cv.json', context)).some((node) => node.kind === 'json')).toBe(true);
  });

  test("jq's output passes on the printed text", async () => {
    const context = contextOf(resume);
    const result = await run('cat cv.json | jq', context);
    expect(result.kind === 'output' && result.result.stdout).toBe(`${cvJson}\n`);
  });
});

describe('006-terminal-FR-079: lexLine colors one line at a time', () => {
  test('each line printJson prints gets the same tokens, and joins back to the line', () => {
    const printed = printJson(JSON.stringify(fixture('every-field'), null, 2));
    if ('error' in printed) throw new Error('not JSON');
    for (const row of printed.rows) {
      const line = rowText(row);
      const tokens = lexLine(line);
      expect(tokens.map((token) => token.text).join('')).toBe(line);
      expect(row.indent === 0 ? tokens : tokens.slice(1)).toEqual(row.tokens);
    }
  });

  test('an unfinished line is colored as far as it lexes, and the rest is plain', () => {
    expect(lexLine('"work": [')).toEqual([{ kind: 'key', text: '"work"' }, { kind: 'punctuation', text: ':' }, { kind: 'space', text: ' ' }, { kind: 'punctuation', text: '[' }]);
    expect(lexLine('"na')).toEqual([{ kind: 'space', text: '"na' }]);
    expect(lexLine('12,')).toEqual([{ kind: 'number', text: '12' }, { kind: 'punctuation', text: ',' }]);
    expect(lexLine('12x, y')).toEqual([{ kind: 'space', text: '12x, y' }]);
    expect(lexLine('')).toEqual([]);
  });
});
