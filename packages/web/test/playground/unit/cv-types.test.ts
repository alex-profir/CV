// The CV's declaration file for the Playground (research R10), generated from
// 002's shape.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { typescript as ts } from 'monaco-editor/languages/features/typescript/lib/typescriptServices';
import { SHAPE_FILE, cvTypes, cvTypesPlugin, readCvTypes } from '../../../scripts/cv-types.ts';

const shape = fs.readFileSync(SHAPE_FILE, 'utf8');

describe('008-typescript-playground-FR-029: the CV\'s type is generated from its shape, never typed by hand', () => {
  test('every exported interface is a global interface with its JSDoc, and cv is declared as a Resume', () => {
    const text = readCvTypes();
    const exported = [...shape.matchAll(/^export interface (\w+)/gm)].map((match) => match[1]);
    expect(exported.length).toBeGreaterThan(5);
    for (const name of exported) expect(text, name).toMatch(new RegExp(`^interface ${name} \\{`, 'm'));
    expect(text).not.toMatch(/\bexport\b/);
    expect(text).toContain('declare const cv: Resume;');
    for (const doc of [...shape.matchAll(/\/\*\*[^*]*\*\//g)].map((match) => match[0])) expect(text).toContain(doc);
    expect(text).toMatch(/interface ResumeProject \{/);
    expect(text).toMatch(/interface ResumeSkill \{/);
    expect(text).toMatch(/^\s+projects\?: ResumeProject\[\];/m);
  });

  test('the declaration is a valid script for TypeScript, with no error', () => {
    const text = readCvTypes();
    const file = ts.createSourceFile('cv.d.ts', text, ts.ScriptTarget.Latest, true);
    expect((file as unknown as { parseDiagnostics: unknown[] }).parseDiagnostics).toEqual([]);
    expect(ts.isExternalModule(file)).toBe(false);
  });

  test('a copy of the shape with a field renamed changes the output', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-types-'));
    try {
      const copy = path.join(dir, 'shape.generated.ts');
      fs.writeFileSync(copy, shape.replace(/^(\s+)projects\?: ResumeProject\[\];/m, '$1works?: ResumeProject[];'));
      const changed = readCvTypes(copy);
      expect(changed).not.toEqual(readCvTypes());
      expect(changed).toMatch(/^\s+works\?: ResumeProject\[\];/m);
      expect(changed).not.toMatch(/^\s+projects\?: ResumeProject\[\];/m);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('a shape exporting anything but interfaces fails', () => {
    expect(() => cvTypes(`${shape}\nexport const answer = 42;\n`)).toThrow(/isn't an interface/);
  });

  test('the plugin resolves virtual:cv-types to that text', () => {
    const plugin = cvTypesPlugin();
    const resolveId = plugin.resolveId as (id: string) => string | null;
    const resolved = resolveId('virtual:cv-types');
    expect(resolved).toBe('\0virtual:cv-types');
    expect(resolveId('virtual:other')).toBeNull();
    const load = plugin.load as (this: { addWatchFile(file: string): void }, id: string) => string | null;
    const code = load.call({ addWatchFile: () => undefined }, resolved!);
    expect(code).toBe(`export default ${JSON.stringify(readCvTypes())};`);
  });
});
