// The accessibility part on fixture sites (research R12).
import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { fixture } from './helpers/sites.ts';

describe('004-cv-page-FR-050: no automated WCAG 2.2 AA violation on either page at a phone and a desktop width', () => {
  test('no-link-name/ fails with axe:link-name, naming the page, the width and the element', async () => {
    const report = await runCheck(fixture('no-link-name'), { parts: ['accessibility'] });
    for (const page of ['/cv', '/missing-page']) {
      for (const variant of ['320px', '375px', '1440px']) {
        expect(report.problems).toContainEqual({ part: 'accessibility', page, variant, type: 'axe:link-name', subject: 'footer > a', detail: 'Links must have discernible text' });
      }
    }
    expect(report.result).toBe('fail');
  }, 120_000);

  test('low-contrast/ fails with axe:color-contrast on the summary, with the ratio', async () => {
    const report = await runCheck(fixture('low-contrast'), { parts: ['accessibility'] });
    const contrast = report.problems.filter((problem) => problem.type === 'axe:color-contrast');
    expect(contrast.map((problem) => `${problem.page} ${problem.variant} ${problem.subject}`)).toEqual(['/cv 320px .summary', '/cv 375px .summary', '/cv 1440px .summary']);
    expect(contrast[0]!.detail).toMatch(/insufficient color contrast of 2\.\d+ .*#a8a8a0.*#f4f4ef/);
  }, 120_000);

  test('minimal/ passes at 320, 375 and 1440 px on both pages', async () => {
    const report = await runCheck(fixture('minimal'), { parts: ['accessibility'] });
    expect(report.results.map((result) => `${result.page} ${result.variant} ${result.status}`)).toEqual([
      '/cv 320px pass',
      '/cv 375px pass',
      '/cv 1440px pass',
      '/missing-page 320px pass',
      '/missing-page 375px pass',
      '/missing-page 1440px pass',
    ]);
  }, 120_000);
});
