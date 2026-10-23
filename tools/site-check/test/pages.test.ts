// The pages the check covers come from the site manifest (research R11).
import { describe, expect, test, vi } from 'vitest';
import { NOT_FOUND_PATH, runCheck } from '../src/check.ts';
import { PARTS } from '../src/report.ts';
import { fixture } from './helpers/sites.ts';

vi.setConfig({ testTimeout: 300_000 });

describe('004-cv-page-FR-056: every page the site serves is checked, with no change to the command', () => {
  test('second-page/: /about answers 200 and is checked by every page part and by Lighthouse', async () => {
    const report = await runCheck(fixture('second-page'));
    expect(report.pages).toEqual([
      { path: '/cv', status: 200, notFound: false },
      { path: '/about', status: 200, notFound: false },
      { path: '/missing-page', status: 404, notFound: true },
    ]);
    for (const part of ['accessibility', 'lighthouse', 'keyboard', 'other-sites', 'fonts', 'layout', 'modes'] as const) {
      expect(report.results.some((result) => result.part === part && result.page === '/about'), part).toBe(true);
    }
    for (const part of ['accessibility', 'keyboard', 'other-sites', 'fonts', 'layout', 'modes'] as const) {
      expect(report.results.some((result) => result.part === part && result.page === NOT_FOUND_PATH), part).toBe(true);
    }
    expect(report.results.filter((result) => result.part === 'lighthouse').map((result) => `${result.page} ${result.variant}`)).toEqual([
      '/cv mobile',
      '/cv desktop',
      '/about mobile',
      '/about desktop',
    ]);
    expect(new Set(report.results.map((result) => result.part))).toEqual(new Set(PARTS));
  });

  test('the not-found page is requested at the fixed unknown path /missing-page', () => {
    expect(NOT_FOUND_PATH).toBe('/missing-page');
  });
});
