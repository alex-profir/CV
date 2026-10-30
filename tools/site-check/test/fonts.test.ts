// The fonts part on a fixture site (research R16).
import { describe, expect, test, vi } from 'vitest';
import { runCheck } from '../src/check.ts';
import { renderProblem } from '../src/report.ts';
import { realSiteProject } from './helpers/root.ts';
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

describe('008-typescript-playground-FR-079: the checks measure the Playground in the fonts, layout and modes parts, and name each state', () => {
  test('the real build passes fonts, layout and modes, listing its states', { timeout: 900_000 }, async () => {
    const report = await runCheck(realSiteProject(), { parts: ['fonts', 'layout', 'modes'] });
    expect(report.problems.map(renderProblem)).toEqual([]);
    const variants = (part: string) => report.results.filter((result) => result.part === part && result.page === '/').map((result) => result.variant);
    expect(variants('fonts')).toEqual(expect.arrayContaining(['desktop/playground-ready/1440px', 'mobile/playground-best-on-desktop/375px']));
    expect(variants('layout')).toEqual(
      expect.arrayContaining([
        'desktop/playground-narrow/1440px',
        'desktop/playground-errors-200%-zoom/1280px',
        'desktop/playground-errors-text-spacing/1440px',
        'mobile/playground-best-on-desktop-320/320px',
        'mobile/playground-best-on-desktop-landscape/812px',
        'mobile/playground-best-on-desktop-200%-zoom/640px',
        'mobile/playground-best-on-desktop-400%-zoom/320px',
        'mobile/playground-best-on-desktop-text-spacing/375px',
      ]),
    );
    expect(variants('modes')).toEqual(expect.arrayContaining(['desktop/playground-reduced-motion/1440px', ...['ready', 'errors', 'running', 'stuck'].map((state) => `desktop/playground-${state}/1440px`)]));
  });
});
