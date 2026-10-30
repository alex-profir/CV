// The Lighthouse part (research R13): three runs per page and profile, the
// median of each category, and 90 or more to pass.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, inject, onTestFinished, test, vi } from 'vitest';
import { launchChromium } from '../src/browser.ts';
import { runCheck } from '../src/check.ts';
import { screenEmulationMetrics } from 'lighthouse/core/config/constants.js';
import { lighthouseRuns, median } from '../src/parts/lighthouse.ts';
import { renderProblem } from '../src/report.ts';
import { startServer } from '../src/server.ts';
import { replaceIn, seededCopy } from './helpers/root.ts';
import { fixture, siteProject } from './helpers/sites.ts';

vi.setConfig({ testTimeout: 300_000 });

// 2 MB of text that doesn't compress much (base64 of SHA-256 digests in
// counter mode), as a classic script in the head, which blocks rendering
// until it has downloaded.
function blockingScript(): string {
  const parts: string[] = [];
  for (let length = 0, counter = 0; length < 2 * 1024 * 1024; counter += 1) {
    const part = crypto.createHash('sha256').update(String(counter)).digest('base64');
    parts.push(part);
    length += part.length;
  }
  return `window.payload = '${parts.join('')}';\n`;
}

describe('004-cv-page-FR-051: every Lighthouse category scores 90 or more on mobile and desktop for every page that answers 200', () => {
  test('a page with a 2 MB blocking script fails performance on the mobile profile, with its runs', async () => {
    const html = fs.readFileSync(path.join(fixture('minimal'), 'packages/web/dist/site/cv.html'), 'utf8').replace('</head>', '<script src="/assets/big.js"></script></head>');
    const root = siteProject({ 'packages/web/dist/site/cv.html': html, 'packages/web/dist/site/assets/big.js': blockingScript() });
    const report = await runCheck(root, { parts: ['lighthouse'] });
    const mobile = report.problems.find((problem) => problem.variant === 'mobile' && problem.subject === 'performance');
    expect(mobile).toMatchObject({ part: 'lighthouse', page: '/cv', type: 'low-score' });
    const [, value, runs] = /^(\d+) \(runs (\d+, \d+, \d+)\); needs 90$/.exec(mobile!.detail) ?? [];
    expect(Number(value)).toBeLessThan(90);
    const numbers = runs!.split(', ').map(Number);
    expect(median(numbers)).toBe(Number(value));
    expect(report.results.find((result) => result.variant === 'mobile')!.scores!.performance!.runs).toHaveLength(3);
  });

  test('minimal/ passes on both profiles, and only the page that answers 200 is scored', async () => {
    const report = await runCheck(fixture('minimal'), { parts: ['lighthouse'] });
    expect(report.results.map((result) => `${result.page} ${result.variant} ${result.status}`)).toEqual(['/cv mobile pass', '/cv desktop pass']);
    for (const result of report.results) {
      expect(Object.keys(result.scores!)).toEqual(expect.arrayContaining(['performance', 'accessibility', 'best-practices', 'seo']));
      for (const score of Object.values(result.scores!)) expect(score.median).toBeGreaterThanOrEqual(90);
    }
  });
});

describe('the name and role are visible within 2.5 s on the mobile profile (SC-003)', () => {
  test.skipIf(process.env.CI)('on the real build, the median first contentful paint is under 2,500 ms and the h1 and role are in the first viewport', async () => {
    const out = inject('siteDir');
    const manifest = JSON.parse(fs.readFileSync(path.join(out, 'site-manifest.json'), 'utf8'));
    const server = await startServer({ siteDir: path.join(out, 'site'), manifest });
    onTestFinished(() => server.close());
    const runs = await lighthouseRuns(`${server.url}/cv`, 'mobile');
    expect(median(runs.map((run) => run.firstContentfulPaint))).toBeLessThan(2500);

    const browser = await launchChromium();
    onTestFinished(() => browser.close());
    const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
    await page.goto(`${server.url}/cv`);
    for (const selector of ['h1', 'p.role']) {
      const box = (await page.locator(selector).first().boundingBox())!;
      expect(box.y + box.height, selector).toBeLessThanOrEqual(667);
      expect(box.x + box.width, selector).toBeLessThanOrEqual(375);
    }
  });
});

describe('the CV icon is visible within 2.5 s on the mobile profile, on the root (SC-003)', () => {
  test.skipIf(process.env.CI)("on the real build's root, the median first contentful paint is under 2,500 ms and the CV icon is in the first paint's viewport", async () => {
    const out = inject('siteDir');
    const manifest = JSON.parse(fs.readFileSync(path.join(out, 'site-manifest.json'), 'utf8'));
    const server = await startServer({ siteDir: path.join(out, 'site'), manifest });
    onTestFinished(() => server.close());
    const runs = await lighthouseRuns(`${server.url}/`, 'mobile');
    expect(median(runs.map((run) => run.firstContentfulPaint))).toBeLessThan(2500);

    // The first paint comes before the shell's script: the page as parsed,
    // with the script held back, in Lighthouse's mobile viewport.
    const { width, height } = screenEmulationMetrics.mobile as { width: number; height: number };
    const browser = await launchChromium();
    onTestFinished(() => browser.close());
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: true });
    await page.route(/\/assets\/os-[^/]*\.js$/, (route) => route.abort());
    await page.goto(`${server.url}/`);
    const icon = page.locator('#os .app-icon[data-view="cv"]');
    expect(await icon.isVisible()).toBe(true);
    const box = (await icon.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.y + box.height).toBeLessThanOrEqual(height);
  });
});

describe("the site root's first load leaves TypeScript alone (008 SC-009)", () => {
  test('a copy whose first load requests a file under /playground/ fails, naming it', async () => {
    const root = seededCopy((copy) => replaceIn(copy, 'packages/web/src/pages/ShellPage.tsx', '          <script key={src} type="module" src={src} />\n        ))}\n', '          <script key={src} type="module" src={src} />\n        ))}\n        <link rel="preload" as="fetch" href="/playground/x/files.json" />\n'));
    const report = await runCheck(root, { parts: ['lighthouse'] });
    expect(report.problems.filter((problem) => problem.variant === 'first-load').map(renderProblem)).toEqual([expect.stringMatching(/^lighthouse \/ first-load engine-on-first-load \/playground\/x\/files\.json: /)]);
  }, 900_000);
});
