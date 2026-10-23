// The keyboard part on fixture sites (research R15).
import { describe, expect, test, vi } from 'vitest';
import { runCheck } from '../src/check.ts';
import { renderProblem } from '../src/report.ts';
import { fixture } from './helpers/sites.ts';

vi.setConfig({ testTimeout: 120_000 });

describe('004-cv-page-FR-054: every link is reached by keyboard, in reading order, with a visible focus indicator', () => {
  test('no-focus-outline/ fails, naming every link on both pages', async () => {
    const report = await runCheck(fixture('no-focus-outline'), { parts: ['keyboard'] });
    const lines = report.problems.map(renderProblem);
    for (const variant of ['375px', '1440px']) {
      expect(lines).toContain(`keyboard /cv ${variant} no-focus-indicator a[href="mailto:ada@example.com"] "ada@example.com": no visible change when focused`);
      expect(lines).toContain(`keyboard /cv ${variant} no-focus-indicator a[href="https://github.com/ada-example"] "GitHub: ada-example": no visible change when focused`);
      expect(lines).toContain(`keyboard /cv ${variant} no-focus-indicator a[href="https://github.com/ada-example/site"] "How this page was built": no visible change when focused`);
      expect(lines).toContain(`keyboard /missing-page ${variant} no-focus-indicator a[href="/cv"] "Go to the CV": no visible change when focused`);
    }
    expect(report.problems.every((problem) => problem.type === 'no-focus-indicator')).toBe(true);
  });

  test('positive-tabindex/ fails as out-of-order', async () => {
    const report = await runCheck(fixture('positive-tabindex'), { parts: ['keyboard'] });
    expect(report.problems.filter((problem) => problem.variant === '375px').map(renderProblem)).toEqual([
      'keyboard /cv 375px out-of-order a[href="https://github.com/ada-example"]: focus reached it 1st, its reading position is 2nd',
      'keyboard /cv 375px out-of-order a[href="mailto:ada@example.com"]: focus reached it 2nd, its reading position is 1st',
    ]);
  });

  test('covered-link/ fails as covered', async () => {
    const report = await runCheck(fixture('covered-link'), { parts: ['keyboard'] });
    expect(report.problems.length).toBeGreaterThan(0);
    expect(report.problems.map(renderProblem)).toContain('keyboard /cv 1440px covered a[href="mailto:ada@example.com"]: covered by div.banner when focused');
    expect(report.problems.every((problem) => problem.type === 'covered')).toBe(true);
  });

  test('minimal/ passes on both pages at 375 and 1440 px', async () => {
    const report = await runCheck(fixture('minimal'), { parts: ['keyboard'] });
    expect(report.problems).toEqual([]);
    expect(report.results).toHaveLength(4);
  });
});
