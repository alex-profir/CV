// The report's text (contracts/cli.md Report format), on hand-built reports.
import { describe, expect, test } from 'vitest';
import { PARTS, renderProblem, renderReport, sortProblems } from '../src/report.ts';
import type { CheckResult, Part, Problem, Report } from '../src/report.ts';

const problem = (part: Part, page: string, variant: string, type: string, subject: string, detail: string): Problem => ({ part, page, variant, type, subject, detail });

const pass = (part: Part, page: string, variant: string): CheckResult => ({ part, page, variant, status: 'pass', problems: [] });

const fail = (part: Part, page: string, variant: string, problems: Problem[]): CheckResult => ({ part, page, variant, status: 'fail', problems });

const scores = (performance: number) => ({
  performance: { median: performance, runs: [performance - 1, performance, performance + 2] },
  accessibility: { median: 100, runs: [100, 100, 100] },
  'best-practices': { median: 100, runs: [100, 100, 100] },
  seo: { median: 100, runs: [100, 100, 100] },
});

const CONTRAST = problem(
  'accessibility',
  '/cv',
  '375px',
  'axe:color-contrast',
  'main > section:nth-of-type(2) p.summary',
  'Element has insufficient color contrast of 3.2 (foreground #8a8a85, background #f4f4ef, 4.5:1 expected)',
);
const LINK_NAME = problem('accessibility', '/missing-page', '1440px', 'axe:link-name', 'footer > a', 'Links must have discernible text');
const LOW_SCORE = problem('lighthouse', '/cv', 'mobile', 'low-score', 'performance', '85 (runs 84, 85, 87); needs 90');

const across = (part: Part, variants: string[], pages = ['/cv', '/missing-page']) => pages.flatMap((page) => variants.map((variant) => pass(part, page, variant)));

// contracts/cli.md's summary example, with the parts it elides written out.
const EXAMPLE: Report = {
  siteDir: 'packages/web/dist/site',
  version: '1a2b3c4d5e6f7a8b',
  pages: [
    { path: '/cv', status: 200 },
    { path: '/missing-page', status: 404 },
  ],
  results: [
    pass('content', '-', '-'),
    pass('accessibility', '/cv', '320px'),
    fail('accessibility', '/cv', '375px', [CONTRAST]),
    pass('accessibility', '/cv', '1440px'),
    pass('accessibility', '/missing-page', '320px'),
    pass('accessibility', '/missing-page', '375px'),
    fail('accessibility', '/missing-page', '1440px', [LINK_NAME]),
    { ...fail('lighthouse', '/cv', 'mobile', [LOW_SCORE]), scores: scores(85) },
    { ...pass('lighthouse', '/cv', 'desktop'), scores: scores(100) },
    ...across('no-script', ['320px', '1440px'], ['/cv']),
    pass('offline', '/cv', '375px'),
    pass('offline', '/', '375px'),
    pass('offline', '/missing-page', '375px'),
    ...across('keyboard', ['375px', '1440px']),
    ...across('other-sites', ['375px', '1440px']),
    ...across('fonts', ['375px', '1440px']),
    ...across('layout', ['320px', 'text-spacing']),
    ...across('print', ['A4', 'Letter'], ['/cv']),
    ...across('modes', ['forced-colors', 'reduced-motion']),
  ],
  problems: [CONTRAST, LINK_NAME, LOW_SCORE],
  result: 'fail',
};

// The example's text. Its parts written as `…` there are spelled out, and its
// closing count is the one for this report: the example's own `4 problems`
// doesn't match the three problems its results list.
const EXAMPLE_TEXT = `accessibility /cv 375px axe:color-contrast main > section:nth-of-type(2) p.summary: Element has insufficient color contrast of 3.2 (foreground #8a8a85, background #f4f4ef, 4.5:1 expected)
accessibility /missing-page 1440px axe:link-name footer > a: Links must have discernible text
lighthouse /cv mobile low-score performance: 85 (runs 84, 85, 87); needs 90

Site check: FAILED

  Site:   packages/web/dist/site (version 1a2b3c4d5e6f7a8b)
  Pages:  /cv (200), /missing-page (404, the not-found page)

  content         pass
  accessibility   fail    /cv 320px pass, /cv 375px fail (1), /cv 1440px pass,
                          /missing-page 320px pass, /missing-page 375px pass, /missing-page 1440px fail (1)
  lighthouse      fail    /cv mobile:  performance 85, accessibility 100, best-practices 100, seo 100
                          /cv desktop: performance 100, accessibility 100, best-practices 100, seo 100
  no-script       pass    /cv 320px, /cv 1440px
  offline         pass    /cv, /, /missing-page
  keyboard        pass    /cv 375px, /cv 1440px, /missing-page 375px, /missing-page 1440px
  other-sites     pass    /cv 375px, /cv 1440px, /missing-page 375px, /missing-page 1440px
  fonts           pass    /cv 375px, /cv 1440px, /missing-page 375px, /missing-page 1440px
  layout          pass    /cv 320px, /cv text-spacing, /missing-page 320px, /missing-page text-spacing
  print           pass    /cv A4, /cv Letter
  modes           pass    /cv forced-colors, /cv reduced-motion, /missing-page forced-colors, /missing-page reduced-motion

  3 problems in 2 parts. 9 of 11 parts passed.
`;

// A seeded shuffle, so the test is the same every run.
function shuffled<T>(items: readonly T[], seed: number): T[] {
  const copy = [...items];
  let state = seed;
  for (let index = copy.length - 1; index > 0; index -= 1) {
    state = (state * 1103515245 + 12345) % 2 ** 31;
    const other = state % (index + 1);
    [copy[index], copy[other]] = [copy[other]!, copy[index]!];
  }
  return copy;
}

describe('004-cv-page-FR-058: every failure names the check, the page, the variant and what failed, and every run ends with a summary', () => {
  test('a problem line is <part> <page> <variant> <type> <subject>: <detail>', () => {
    expect(renderProblem(LOW_SCORE)).toBe('lighthouse /cv mobile low-score performance: 85 (runs 84, 85, 87); needs 90');
    expect(renderProblem(problem('content', '-', '-', 'unsupported-field', 'basics.phone', "/cv doesn't show this field"))).toBe("content - - unsupported-field basics.phone: /cv doesn't show this field");
    for (const line of renderReport(EXAMPLE).split('\n\n')[0]!.split('\n')) {
      expect(line).toMatch(/^(?<part>[a-z-]+) (?<page>\/\S*|-) (?<variant>\S+) (?<type>\S+) (?<subject>.+?): (?<detail>.+)$/);
    }
  });

  test('problems are sorted by part in summary order, then page, variant, type and subject, whatever order they come in', () => {
    const problems = [
      problem('modes', '/cv', 'forced-colors', 'invisible-link', 'a[href="/b"]', 'x'),
      problem('content', '-', '-', 'unsupported-section', 'awards', 'x'),
      problem('accessibility', '/missing-page', '320px', 'axe:link-name', 'footer > a', 'x'),
      problem('accessibility', '/cv', '375px', 'axe:region', 'p', 'x'),
      problem('accessibility', '/cv', '1440px', 'axe:region', 'p', 'x'),
      problem('accessibility', '/cv', '375px', 'axe:color-contrast', 'p', 'x'),
      problem('accessibility', '/cv', '375px', 'axe:color-contrast', 'h1', 'x'),
      problem('keyboard', '/cv', '375px', 'covered', 'a[href="Z"]', 'x'),
      problem('keyboard', '/cv', '375px', 'covered', 'a[href="a"]', 'x'),
      problem('print', '/cv', 'A4', 'site-element-printed', 'footer', 'x'),
    ];
    const expected = [
      'content - - unsupported-section awards: x',
      'accessibility /cv 1440px axe:region p: x',
      'accessibility /cv 375px axe:color-contrast h1: x',
      'accessibility /cv 375px axe:color-contrast p: x',
      'accessibility /cv 375px axe:region p: x',
      'accessibility /missing-page 320px axe:link-name footer > a: x',
      'keyboard /cv 375px covered a[href="Z"]: x',
      'keyboard /cv 375px covered a[href="a"]: x',
      'print /cv A4 site-element-printed footer: x',
      'modes /cv forced-colors invisible-link a[href="/b"]: x',
    ];
    for (const seed of [1, 2, 3, 4, 5]) expect(sortProblems(shuffled(problems, seed)).map(renderProblem)).toEqual(expected);
    const report = { ...EXAMPLE, problems: [...EXAMPLE.problems] };
    expect(renderReport({ ...report, problems: shuffled(report.problems, 9) })).toBe(renderReport(report));
    expect(PARTS[0]).toBe('content');
  });

  test("the summary is byte for byte contracts/cli.md's example for the same report", () => {
    expect(renderReport(EXAMPLE)).toBe(EXAMPLE_TEXT);
  });

  test('a report with no problems starts at the summary and ends with exactly one newline', () => {
    const results = EXAMPLE.results.map((result) => ({ ...result, status: 'pass' as const, problems: [] }));
    const text = renderReport({ ...EXAMPLE, results, problems: [], result: 'pass' });
    expect(text.startsWith('Site check: PASSED\n\n  Site:   packages/web/dist/site (version 1a2b3c4d5e6f7a8b)\n')).toBe(true);
    expect(text).toMatch(/[^\n]\n$/);
    expect(text).toContain('  accessibility   pass    /cv 320px, /cv 375px, /cv 1440px, /missing-page 320px, /missing-page 375px, /missing-page 1440px\n');
    expect(text.endsWith('\n  No problems. 11 of 11 parts passed.\n')).toBe(true);
    expect(renderReport(EXAMPLE)).toMatch(/[^\n]\n$/);
  });

  test('a crashed part is listed as error, with its problem line, and counts as not passed', () => {
    const crash = problem('fonts', '/cv', '375px', 'error', 'fonts', 'the part crashed: Protocol error');
    const results = EXAMPLE.results.map((result) =>
      result.part === 'fonts' && result.page === '/cv' && result.variant === '375px' ? { ...result, status: 'error' as const, problems: [crash] } : result,
    );
    const text = renderReport({ ...EXAMPLE, results, problems: [...EXAMPLE.problems, crash] });
    expect(text).toContain('\nfonts /cv 375px error fonts: the part crashed: Protocol error\n');
    expect(text).toContain('  fonts           error   /cv 375px error, /cv 1440px pass,\n                          /missing-page 375px pass, /missing-page 1440px pass\n');
    expect(text).toContain('  4 problems in 3 parts. 8 of 11 parts passed.\n');
  });
});
