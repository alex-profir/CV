// 004's spec is amended for the shell (FR-051, research R15): its root
// redirect and its offline requirement are marked removed, each naming its
// replacement, and the new offline requirement is active.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { listFiles } from '../../../../tools/traceability/src/files.ts';
import { parseSpec, requirementsOf } from '../../../../tools/traceability/src/specs.ts';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const SPEC = 'specs/004-cv-page/spec.md';

const text = fs.readFileSync(path.join(ROOT, SPEC), 'utf8');
const requirements = requirementsOf(parseSpec('004-cv-page', SPEC, text));
const state = (id: string) => requirements.find((requirement) => requirement.id === id)?.state;
// The requirement's entry: its line and the indented lines that continue it,
// joined with single spaces.
function entry(id: string): string {
  const lines = text.split('\n');
  const start = lines.findIndex((candidate) => candidate.includes(`**${id}**`));
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((candidate) => !candidate.startsWith('  '));
  return [lines[start]!, ...rest.slice(0, end === -1 ? rest.length : end)].map((part) => part.trim()).join(' ');
}

describe('005-os-shell-FR-051: 004 is amended before the root changes', () => {
  test('the root redirect is removed and replaced by the shell', () => {
    expect(state('FR-018')).toBe('removed');
    expect(entry('FR-018')).toMatch(/^- ~~\*\*FR-018\*\*~~: Removed .* – replaced by 005-os-shell-FR-001/);
  });

  test('the old offline requirement is removed and replaced by the new one, which is active', () => {
    expect(state('FR-038')).toBe('removed');
    expect(entry('FR-038')).toMatch(/^- ~~\*\*FR-038\*\*~~: Removed .* – replaced by 004-cv-page-FR-059\./);
    expect(state('FR-059')).toBe('active');
    expect(entry('FR-059')).toContain('005-os-shell-FR-052 covers the site root');
  });

  test('no test file references a removed requirement of 004', () => {
    const removed = ['FR-018', 'FR-038'].map((id) => `004-cv-page-${id}`);
    const offenders = listFiles(ROOT).testFiles.filter((file) => {
      const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
      return removed.some((id) => source.includes(id));
    });
    expect(offenders).toEqual([]);
  });
});
