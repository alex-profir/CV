// Lines in the visitor's code from positions in the JavaScript that ran
// (research R13), through maps the bundled TypeScript writes.
import { describe, expect, test } from 'vitest';
import { typescript as ts } from 'monaco-editor/languages/features/typescript/lib/typescriptServices';
import { decodeMappings, mapPosition } from '../../../src/apps/playground/engine/source-map.ts';

// The fixture compiled as the Playground compiles it, with its map.
function compile(code: string): { js: string; map: string } {
  const out = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, sourceMap: true }, fileName: 'playground.ts' });
  return { js: out.outputText.replace(/\n\/\/# sourceMappingURL=.*$/, ''), map: out.sourceMapText! };
}

// The 1-based line and column of `needle` in `text`.
function where(text: string, needle: string): { line: number; column: number } {
  const lines = text.split('\n');
  const line = lines.findIndex((entry) => entry.includes(needle));
  return { line: line + 1, column: lines[line]!.indexOf(needle) + 1 };
}

const FIXTURE = [
  'type Job = { title: string };',
  '',
  'interface Shape {',
  '  side: number;',
  '}',
  '',
  'function fail(job: Job): never {',
  '  throw new Error(job.title);',
  '}',
  '',
  'const area = (shape: Shape): number => shape.side ** 2;',
  'console.log(area({ side: 2 }));',
  'fail({ title: "x" });',
].join('\n');

describe('008-typescript-playground-FR-035: an uncaught error names the line of the code', () => {
  test("VLQ decoding of TypeScript's maps gives every generated line its segments", () => {
    const { js, map } = compile(FIXTURE);
    const lines = decodeMappings(JSON.parse(map).mappings);
    expect(lines.length).toBe(js.split('\n').length);
    expect(decodeMappings('AAAA;AACA,EAAE')).toEqual([[[0, 0, 0, 0]], [[0, 0, 1, 0], [2, 0, 1, 2]]]);
  });

  test('a generated position maps to its source line', () => {
    const { js, map } = compile(FIXTURE);
    expect(mapPosition(map, where(js, 'throw new Error').line, where(js, 'throw new Error').column)?.line).toBe(8);
    expect(mapPosition(map, where(js, 'shape.side').line, where(js, 'shape.side').column)?.line).toBe(11);
    expect(mapPosition(map, where(js, 'fail({').line, 1)?.line).toBe(13);
  });

  test('a position that maps to nothing gives no line, never a wrong one', () => {
    const { js, map } = compile(FIXTURE);
    expect(mapPosition(map, js.split('\n').length + 5, 1)).toBeNull();
    expect(mapPosition(map, 0, 1)).toBeNull();
    expect(mapPosition('not json', 1, 1)).toBeNull();
    expect(mapPosition(JSON.stringify({ mappings: '!!' }), 1, 1)).toBeNull();
    expect(mapPosition(JSON.stringify({ mappings: ';;AAAA' }), 1, 1)).toBeNull();
  });
});
