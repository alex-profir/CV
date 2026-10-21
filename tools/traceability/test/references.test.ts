import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { fullId, parseFullId } from '../src/ids.ts';
import { makeProject } from './helpers/project.ts';

function approvedSpec(entries: string[]): string {
  return ['# Feature Specification', '', '**Status**: Approved', '', '### Functional Requirements', '', ...entries, ''].join('\n');
}

describe('001-requirement-traceability-FR-009: a full ID is the spec directory name plus the requirement ID', () => {
  test('builds and splits full IDs', () => {
    expect(fullId('002-example', 'FR-003')).toBe('002-example-FR-003');
    expect(fullId('001-requirement-traceability', 'FR-001')).toBe('001-requirement-traceability-FR-001');
    expect(parseFullId('002-example-FR-003')).toEqual({ feature: '002-example', id: 'FR-003' });
    expect(parseFullId('001-requirement-traceability-FR-029')).toEqual({
      feature: '001-requirement-traceability',
      id: 'FR-029',
    });
  });

  test('rejects anything that is not exactly a full ID', () => {
    for (const text of [
      'FR-003',
      '002-example-fr-003',
      '002-Example-FR-003',
      '002-example-FR-03',
      '002-example-FR-0003',
      '002-example-FR-003x',
      '-FR-003',
      '002--example-FR-003',
      '002-example-FR-003 ',
      '',
    ]) {
      expect(parseFullId(text)).toBeNull();
    }
  });

  test('the same FR number in two approved specs gives two distinct IDs', () => {
    const root = makeProject({
      'specs/002-example/spec.md': approvedSpec(['- **FR-001**: One.']),
      'specs/003-other/spec.md': approvedSpec(['- **FR-001**: One.']),
      'src/example.test.ts': "test('covers 002-example-FR-001', () => {});\n",
    });
    const report = runCheck(root);
    expect(report.activeRequirements).toBe(2);
    expect(report.coveredRequirements).toBe(1);
    expect(report.problems.map((problem) => [problem.type, problem.subject])).toEqual([
      ['uncovered', '003-other-FR-001'],
    ]);
  });
});
