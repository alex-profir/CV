// The Lighthouse part (research R13, FR-051): each page that answers 200 is
// measured three times on each profile, Lighthouse's default mobile config
// and its desktop config, and each category's score is the median of the
// three. A category under 90 fails. Chromium is Playwright's, started by
// chrome-launcher with the isolation flags, so Lighthouse can reach only
// 127.0.0.1 (research R17). Like Playwright's own launches, it runs without
// Chromium's renderer sandbox, which Linux CI runners and sandbox-exec can't
// provide. Lighthouse clears the page's storage before each run, so a service
// worker never answers a measured load.
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { ISOLATION_ARGS, chromiumPath } from '../browser.ts';
import type { Problem } from '../report.ts';

export const PROFILES = ['mobile', 'desktop'] as const;

export type Profile = (typeof PROFILES)[number];

export const RUNS = 3;

export const MIN_SCORE = 90;

// One run: every category's score, 0 to 100, in Lighthouse's order, and the
// first contentful paint in milliseconds (SC-003).
export type LighthouseRun = { scores: Record<string, number>; firstContentfulPaint: number };

export type LighthouseResult = { scores: Record<string, { median: number; runs: number[] }>; problems: Problem[] };

// `runs` runs of one page on one profile, in one Chromium.
export async function lighthouseRuns(url: string, profile: Profile, runs = RUNS): Promise<LighthouseRun[]> {
  const chrome = await chromeLauncher.launch({ chromePath: chromiumPath(), chromeFlags: [...ISOLATION_ARGS, '--headless=new', '--no-sandbox'], logLevel: 'silent' });
  try {
    const results: LighthouseRun[] = [];
    for (let run = 0; run < runs; run += 1) {
      const result = await lighthouse(url, { port: chrome.port, output: 'json', logLevel: 'silent' }, profile === 'desktop' ? desktopConfig : undefined);
      if (result === undefined) throw new Error(`Lighthouse returned no result for ${url}`);
      const { lhr } = result;
      if (lhr.runtimeError !== undefined) throw new Error(`Lighthouse could not measure ${url}: ${lhr.runtimeError.code} ${lhr.runtimeError.message}`);
      results.push({
        scores: Object.fromEntries(Object.entries(lhr.categories).map(([id, category]) => [id, Math.round((category.score ?? 0) * 100)])),
        firstContentfulPaint: lhr.audits['first-contentful-paint']?.numericValue ?? Number.POSITIVE_INFINITY,
      });
    }
    return results;
  } finally {
    chrome.kill();
  }
}

export const median = (values: readonly number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle]! : Math.round((sorted[middle - 1]! + sorted[middle]!) / 2);
};

// The medians of a page's runs on one profile, and a problem for each
// category under 90.
export function lighthouseResult(runs: readonly LighthouseRun[], pageLabel: string, profile: Profile): LighthouseResult {
  const categories = Object.keys(runs[0]?.scores ?? {});
  const scores: LighthouseResult['scores'] = {};
  const problems: Problem[] = [];
  for (const category of categories) {
    const values = runs.map((run) => run.scores[category] ?? 0);
    const value = median(values);
    scores[category] = { median: value, runs: values };
    if (value < MIN_SCORE) {
      const listed = [...values].sort((a, b) => a - b).join(', ');
      problems.push({ part: 'lighthouse', page: pageLabel, variant: profile, type: 'low-score', subject: category, detail: `${value} (runs ${listed}); needs ${MIN_SCORE}` });
    }
  }
  return { scores, problems };
}

export async function lighthouseProblems(url: string, pageLabel: string, profile: Profile): Promise<LighthouseResult> {
  return lighthouseResult(await lighthouseRuns(url, profile), pageLabel, profile);
}
