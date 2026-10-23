// The content part: the CV document may hold only what /cv shows
// (data-model.md Supported content Validation).
import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { contentProblems } from '../src/parts/content.ts';
import { renderProblem } from '../src/report.ts';
import { fixture } from './helpers/sites.ts';

describe('004-cv-page-FR-005: the checks fail on a section or field /cv does not show, and name it', () => {
  test('certificates/ reports the section with its entry count and each unsupported field', async () => {
    const report = await runCheck(fixture('certificates'), { parts: ['content'] });
    expect(report.results).toEqual([expect.objectContaining({ part: 'content', page: '-', variant: '-', status: 'fail' })]);
    expect(report.problems.map(renderProblem).sort()).toEqual([
      "content - - unsupported-field basics.phone: /cv doesn't show this field",
      "content - - unsupported-field work[0].contact: /cv doesn't show this field",
      "content - - unsupported-section certificates: the CV document has 2 certificates entries, which /cv doesn't show yet",
    ]);
  });

  test('empty-unsupported/ passes: an empty unsupported section, $schema and meta are not reported', async () => {
    const report = await runCheck(fixture('empty-unsupported'), { parts: ['content'] });
    expect(report.problems).toEqual([]);
    expect(report.result).toBe('pass');
  });

  test('every unsupported section and field of the table is named, and nothing shown is', () => {
    const problems = contentProblems({
      $schema: 'x',
      meta: { version: '1' },
      basics: { name: 'A', image: 'i.png', location: { city: 'C', address: '1 Street', postalCode: '1' }, profiles: [{ network: 'N', extra: 'x' }] },
      volunteer: [{}],
      awards: [{}],
      publications: [],
      references: [{}, {}, {}],
      projects: [{ name: 'P', keywords: ['k'] }],
      education: [{ institution: 'I', minor: 'x' }],
      somethingElse: true,
    });
    expect(problems.map((problem) => `${problem.type} ${problem.subject}`).sort()).toEqual([
      'unsupported-field basics.image',
      'unsupported-field basics.location.address',
      'unsupported-field basics.location.postalCode',
      'unsupported-field basics.profiles[0].extra',
      'unsupported-field education[0].minor',
      'unsupported-field somethingElse',
      'unsupported-section awards',
      'unsupported-section references',
      'unsupported-section volunteer',
    ]);
    expect(problems.find((problem) => problem.subject === 'awards')!.detail).toBe("the CV document has 1 awards entry, which /cv doesn't show yet");
  });
});
