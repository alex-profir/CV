// The fonts part on a fixture site (research R16).
import { describe, expect, test, vi } from 'vitest';
import { runCheck } from '../src/check.ts';
import { renderProblem } from '../src/report.ts';
import { fixture } from './helpers/sites.ts';

vi.setConfig({ testTimeout: 120_000 });

describe("004-cv-page-FR-007: the site's fonts draw every character of the CV document", () => {
  test('missing-glyph/ fails with missing-glyph, naming the character, the section and the element', async () => {
    const report = await runCheck(fixture('missing-glyph'), { parts: ['fonts'] });
    expect(report.problems.map(renderProblem)).toEqual([
      'fonts /cv 375px missing-glyph U+0219 ș: in section "Experience" (p.org), drawn in a fallback font',
      'fonts /cv 1440px missing-glyph U+0219 ș: in section "Experience" (p.org), drawn in a fallback font',
    ]);
  });

  test('minimal/ passes', async () => {
    const report = await runCheck(fixture('minimal'), { parts: ['fonts'] });
    expect(report.problems).toEqual([]);
  });
});
