// The other-sites part (research R17): every request of each page and its
// service worker goes to the local server.
import { describe, expect, test, vi } from 'vitest';
import { runCheck } from '../src/check.ts';
import { renderProblem } from '../src/report.ts';
import { fixture, siteProject } from './helpers/sites.ts';

vi.setConfig({ testTimeout: 120_000 });

describe('004-cv-page-FR-055: no request from /cv or the not-found page goes to another site, and any is named', () => {
  test('other-sites/ fails naming both full addresses on both pages, and the service worker request', async () => {
    const report = await runCheck(fixture('other-sites'), { parts: ['other-sites'] });
    const lines = report.problems.map(renderProblem);
    for (const page of ['/cv', '/missing-page']) {
      for (const variant of ['375px', '1440px']) {
        expect(lines).toContain(`other-sites ${page} ${variant} other-site-request https://www.googletagmanager.com/gtag/js?id=G-X: requested by the page`);
        expect(lines).toContain(`other-sites ${page} ${variant} other-site-request https://example.com/x.css: requested by the page`);
        expect(lines).toContain(`other-sites ${page} ${variant} other-site-request https://example.org/worker.json: requested by the service worker`);
      }
    }
    expect(lines).toHaveLength(12);
  });

  test('minimal/ passes', async () => {
    const report = await runCheck(fixture('minimal'), { parts: ['other-sites'] });
    expect(report.problems).toEqual([]);
    expect(report.results.map((result) => `${result.page} ${result.variant}`)).toEqual(['/cv 375px', '/cv 1440px', '/missing-page 375px', '/missing-page 1440px']);
  });
});

describe('004-cv-page-FR-016: every page loads everything it uses from the site itself', () => {
  test("a data: address is the page's own, and passes", async () => {
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>x</title><link rel="icon" href="data:,"></head><body><main><img alt="dot" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></main></body></html>';
    const root = siteProject({ 'packages/web/dist/site/cv.html': html });
    const report = await runCheck(root, { parts: ['other-sites'] });
    expect(report.problems.filter((problem) => problem.page === '/cv')).toEqual([]);
  });
});
