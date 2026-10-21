import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { listFiles } from '../src/files.ts';
import { readUiFile } from '../src/ui-files.ts';
import { makeProject } from './helpers/project.ts';

// Sample markup lives only in string literals: the check reads UI source, and
// these tests must not look like UI source to it.

function references(file: string, text: string) {
  const { references, problem } = readUiFile(file, text);
  expect(problem).toBeNull();
  return references.map((reference) => `${reference.location.line}:${reference.location.column} ${reference.text}`);
}

function col(line: string, text: string): number {
  return line.indexOf(text) + 1;
}

function approvedSpec(entries: string[]): string {
  return ['# Feature Specification', '', '**Status**: Approved', '', '### Functional Requirements', '', ...entries, ''].join('\n');
}

describe('001-requirement-traceability-FR-013: every data-req attribute in UI source is read', () => {
  test('JSX attributes with string, expression and template values', () => {
    const lines = [
      'export const A = () => (',
      '  <main data-req="002-example-FR-001">',
      "    <p data-req={'002-example-FR-002'} />",
      '    <p data-req={`002-example-FR-003`} />',
      '  </main>',
      ');',
    ];
    expect(references('src/A.tsx', lines.join('\n'))).toEqual([
      `2:${col(lines[1]!, '002')} 002-example-FR-001`,
      `3:${col(lines[2]!, '002')} 002-example-FR-002`,
      `4:${col(lines[3]!, '002')} 002-example-FR-003`,
    ]);
  });

  test('object properties, including createElement props', () => {
    const lines = [
      "const props = { 'data-req': '002-example-FR-001' };",
      'createElement(\'div\', { "data-req": `002-example-FR-002` });',
    ];
    expect(references('src/a.ts', lines.join('\n'))).toEqual([
      `1:${col(lines[0]!, '002')} 002-example-FR-001`,
      `2:${col(lines[1]!, '002')} 002-example-FR-002`,
    ]);
  });

  test('computed values are skipped', () => {
    const text = [
      'export const A = () => <div data-req={ids} />;',
      'export const B = () => <div data-req={`002-example-FR-${n}`} />;',
      "const props = { 'data-req': ids, ['data-req']: '002-example-FR-001' };",
    ].join('\n');
    expect(references('src/A.tsx', text)).toEqual([]);
  });

  test('a file without data-req is not parsed', () => {
    expect(readUiFile('src/a.ts', 'const broken = (;')).toEqual({ references: [], problem: null });
  });

  test('space-separated values give one reference each, at its own column', () => {
    const line = 'export const A = () => <div data-req="002-example-FR-001  002-example-FR-002\t003-x-FR-001" />;';
    expect(references('src/A.tsx', line)).toEqual([
      `1:${col(line, '002-example-FR-001')} 002-example-FR-001`,
      `1:${col(line, '002-example-FR-002')} 002-example-FR-002`,
      `1:${col(line, '003-x-FR-001')} 003-x-FR-001`,
    ]);
  });
});

describe('001-requirement-traceability-FR-014: only the project own UI source is read', () => {
  test('selects UI source, leaves out test files and excluded directories, and reports unreadable files', () => {
    const markup = (id: string) => `export const A = () => <div data-req="${id}" />;\n`;
    const root = makeProject({
      'specs/002-example/spec.md': approvedSpec(['- **FR-001**: One.']),
      'src/covered.test.ts': "test('002-example-FR-001', () => {});\n",
      'src/A.tsx': markup('002-example-FR-009'),
      'src/a.ts': "export const props = { 'data-req': '002-example-FR-008' };\n",
      'src/A.jsx': markup('002-example-FR-007'),
      'src/markup.test.tsx': markup('002-example-FR-006'),
      'node_modules/pkg/A.tsx': markup('002-example-FR-005'),
      '__fixtures__/A.tsx': markup('002-example-FR-005'),
      '.cache/A.tsx': markup('002-example-FR-005'),
      'dist/A.js': markup('002-example-FR-005'),
      'src/Broken.tsx': 'export const A = () => <div data-req="002-example-FR-001">;\n',
      'README.md': markup('002-example-FR-005'),
    });
    expect(listFiles(root).uiFiles).toEqual(['src/A.jsx', 'src/A.tsx', 'src/Broken.tsx', 'src/a.ts']);
    expect(runCheck(root).problems.map((problem) => `${problem.location.file} ${problem.type} ${problem.subject}`)).toEqual([
      'src/A.jsx unknown-reference 002-example-FR-007',
      'src/A.tsx unknown-reference 002-example-FR-009',
      'src/Broken.tsx unreadable-file "src/Broken.tsx"',
      'src/a.ts unknown-reference 002-example-FR-008',
    ]);
  });
});
