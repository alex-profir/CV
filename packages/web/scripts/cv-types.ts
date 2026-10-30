// The CV's type for the Playground's code (008 research R10): 002's
// generated shape of the CV document, `packages/content/src/shape.generated.ts`,
// turned at build time into a declaration file where every exported
// interface is global and `cv` is declared, served to the Playground's
// interface as the string export of `virtual:cv-types`. No field is typed by
// hand, so a change to the schema reaches the Playground at the next build.
//
// The repository's own TypeScript (7) has no parser API in JavaScript, so the
// shape is read with the TypeScript parser Monaco bundles, the one the
// Playground itself runs.
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { typescript as ts } from 'monaco-editor/languages/features/typescript/lib/typescriptServices';

export const SHAPE_FILE = path.resolve(import.meta.dirname, '../../content/src/shape.generated.ts');

const MODULE = 'virtual:cv-types';
const RESOLVED = `\0${MODULE}`;

// The declaration text for a shape's source: each `export interface` with
// its JSDoc, without `export`, then `declare const cv: Resume;`. Anything
// else exported fails, so the declaration never drifts from the shape.
export function cvTypes(source: string): string {
  const file = ts.createSourceFile('shape.ts', source, ts.ScriptTarget.Latest, true);
  const parts: string[] = [];
  for (const statement of file.statements) {
    if (!ts.isInterfaceDeclaration(statement)) {
      const exported = ts.canHaveModifiers(statement) && (ts.getModifiers(statement) ?? []).some((modifier: { kind: number }) => modifier.kind === ts.SyntaxKind.ExportKeyword);
      if (exported) throw new Error(`the CV shape exports something that isn't an interface: ${statement.getText(file).split('\n')[0]}`);
      continue;
    }
    const exportKeyword = (statement.modifiers ?? []).find((modifier: { kind: number }) => modifier.kind === ts.SyntaxKind.ExportKeyword);
    const text = source.slice(statement.getFullStart(), statement.getEnd());
    parts.push(exportKeyword === undefined ? text : source.slice(statement.getFullStart(), exportKeyword.getStart(file)) + source.slice(exportKeyword.getEnd(), statement.getEnd()).replace(/^\s+/, ''));
  }
  if (!parts.some((part) => /\binterface Resume\b/.test(part))) throw new Error('the CV shape has no Resume interface');
  return `${parts.map((part) => part.replace(/^(?:\s*\/\/[^\n]*\n)*\s*/, '')).join('\n\n')}\n\n/** The CV document this site is built from. */\ndeclare const cv: Resume;\n`;
}

export function readCvTypes(shapeFile: string = SHAPE_FILE): string {
  return cvTypes(fs.readFileSync(shapeFile, 'utf8'));
}

export function cvTypesPlugin(shapeFile: string = SHAPE_FILE): Plugin {
  return {
    name: 'cv-types',
    resolveId: (id) => (id === MODULE ? RESOLVED : null),
    load(id) {
      if (id !== RESOLVED) return null;
      this.addWatchFile(shapeFile);
      return `export default ${JSON.stringify(readCvTypes(shapeFile))};`;
    },
  };
}
