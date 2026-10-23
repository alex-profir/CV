// The site check (research R11): serves the built site, launches one
// isolated Chromium, and runs each part over its pages and variants. Pages
// come from the site manifest: every page of the route table, and the
// not-found page at a fixed unknown path, so a later page is checked with no
// change here (FR-056). A run that throws becomes an `error` result, and
// every other run still happens (FR-058).
import fs from 'node:fs';
import path from 'node:path';
import type { Browser, BrowserContextOptions, Page } from 'playwright';
import type { Resume } from '@cv/content';
import type { SiteManifest } from '../../../packages/web/src/routes.ts';
import { launchChromium } from './browser.ts';
import { expectedFields } from './expected.ts';
import { axeProblems } from './parts/accessibility.ts';
import { contentProblems } from './parts/content.ts';
import { fontProblems } from './parts/fonts.ts';
import { keyboardProblems } from './parts/keyboard.ts';
import { LAYOUT_VARIANTS, TEXT_SPACING_CSS, clippedOrOverlapping, horizontalScroll, isOneColumn } from './parts/layout.ts';
import { PROFILES, lighthouseProblems } from './parts/lighthouse.ts';
import { forcedColorsProblems, motionProblems } from './parts/modes.ts';
import { noScriptProblems } from './parts/no-script.ts';
import { OFFLINE_VARIANT, offlineProblems } from './parts/offline.ts';
import { otherSiteProblems, recordRequests } from './parts/other-sites.ts';
import { PAPER_SIZES, printProblems } from './parts/print.ts';
import { PARTS } from './report.ts';
import type { CheckResult, Part, Problem, Report } from './report.ts';
import { startServer } from './server.ts';

// Where the built site and the CV document are, from the repository root.
export const SITE_DIR = 'packages/web/dist/site';

export const MANIFEST_FILE = 'packages/web/dist/site-manifest.json';

export const RESUME_FILE = 'packages/content/resume.json';

// The families the site serves (contracts/fonts.md).
const FONTS_FILE = path.resolve(import.meta.dirname, '../../../packages/web/src/fonts/fonts.json');

// The not-found page is requested at this path (FR-056).
export const NOT_FOUND_PATH = '/missing-page';

const ACCESSIBILITY_WIDTHS = [320, 375, 1440];

const NO_SCRIPT_WIDTHS = [320, 1440];

const PAGE_WIDTHS = [375, 1440];

export type CheckOptions = { parts?: readonly Part[] };

export function readManifest(root: string): SiteManifest {
  return JSON.parse(fs.readFileSync(path.join(root, MANIFEST_FILE), 'utf8'));
}

function readFamilies(): string[] {
  const fonts: { families: { family: string }[] } = JSON.parse(fs.readFileSync(FONTS_FILE, 'utf8'));
  return fonts.families.map((entry) => entry.family);
}

const crashed = (part: Part, page: string, variant: string, error: unknown): CheckResult => ({
  part,
  page,
  variant,
  status: 'error',
  problems: [{ part, page, variant, type: 'error', subject: part, detail: `the part crashed: ${error instanceof Error ? error.message : String(error)}` }],
});

const result = (part: Part, page: string, variant: string, problems: Problem[], scores?: CheckResult['scores']): CheckResult => ({
  part,
  page,
  variant,
  status: problems.length === 0 ? 'pass' : 'fail',
  problems,
  ...(scores === undefined ? {} : { scores }),
});

// Runs one part on one page and variant. A throw becomes an `error` result.
async function run(part: Part, page: string, variant: string, body: () => Promise<Problem[] | CheckResult>): Promise<CheckResult> {
  try {
    const outcome = await body();
    return Array.isArray(outcome) ? result(part, page, variant, outcome) : outcome;
  } catch (error) {
    return crashed(part, page, variant, error);
  }
}

// A page in a fresh context, closed after `body`. Service workers are
// blocked unless asked for, so they don't add requests to a part that
// doesn't measure them.
async function withPage<T>(browser: Browser, url: string, options: BrowserContextOptions, body: (page: Page) => Promise<T>): Promise<T> {
  const context = await browser.newContext({ serviceWorkers: 'block', ...options });
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    return await body(page);
  } finally {
    await context.close();
  }
}

const viewport = (width: number, height = 900) => ({ viewport: { width, height } });

export async function runCheck(root: string, { parts = PARTS }: CheckOptions = {}): Promise<Report> {
  const manifest = readManifest(root);
  const siteDir = path.join(root, SITE_DIR);
  // Read when a part needs it, so an unreadable CV document fails only
  // the parts that read it.
  let resume: Resume | undefined;
  const readResume = (): Resume => (resume ??= JSON.parse(fs.readFileSync(path.join(root, RESUME_FILE), 'utf8')) as Resume);
  const families = readFamilies();
  const routes = manifest.routes;
  const cvPath = (routes.pages.find((page) => page.path === '/cv') ?? routes.pages[0])?.path;
  if (cvPath === undefined) throw new Error('the site manifest lists no page');
  const rootPath = routes.redirects.find((redirect) => redirect.to === cvPath)?.from ?? '/';

  const server = await startServer({ siteDir, manifest });
  let browser: Browser | undefined;
  try {
    const status = async (pagePath: string) => (await fetch(`${server.url}${pagePath}`, { redirect: 'manual' })).status;
    const pages: Report['pages'] = [];
    for (const page of routes.pages) pages.push({ path: page.path, status: await status(page.path), notFound: false });
    pages.push({ path: NOT_FOUND_PATH, status: await status(NOT_FOUND_PATH), notFound: true });
    const allPaths = pages.map((page) => page.path);
    const okPaths = pages.filter((page) => page.status === 200).map((page) => page.path);
    const url = (pagePath: string) => `${server.url}${pagePath}`;
    browser = await launchChromium();
    const chromium = browser;

    const results: CheckResult[] = [];
    const runs: Record<Part, () => Promise<void>> = {
      content: async () => {
        results.push(await run('content', '-', '-', async () => contentProblems(readResume())));
      },
      accessibility: async () => {
        for (const pagePath of allPaths) {
          for (const width of ACCESSIBILITY_WIDTHS) {
            const variant = `${width}px`;
            results.push(await run('accessibility', pagePath, variant, () => withPage(chromium, url(pagePath), viewport(width), (page) => axeProblems(page, pagePath, variant))));
          }
        }
      },
      lighthouse: async () => {
        for (const pagePath of okPaths) {
          for (const profile of PROFILES) {
            results.push(
              await run('lighthouse', pagePath, profile, async () => {
                const { scores, problems } = await lighthouseProblems(url(pagePath), pagePath, profile);
                return result('lighthouse', pagePath, profile, problems, scores);
              }),
            );
          }
        }
      },
      'no-script': async () => {
        for (const width of NO_SCRIPT_WIDTHS) {
          const variant = `${width}px`;
          results.push(
            await run('no-script', cvPath, variant, async () => {
              const fields = expectedFields(readResume());
              return withPage(chromium, url(cvPath), { ...viewport(width), javaScriptEnabled: false }, (page) => noScriptProblems(page, fields, cvPath, variant));
            }),
          );
        }
      },
      offline: async () => {
        const targets = [cvPath, rootPath, NOT_FOUND_PATH];
        try {
          const fields = expectedFields(readResume());
          const outcome = await offlineProblems(chromium, { siteDir, manifest, fields, families, cvPath, rootPath, notFoundPath: NOT_FOUND_PATH });
          for (const { page, problems } of outcome) results.push(result('offline', page, OFFLINE_VARIANT, problems));
        } catch (error) {
          for (const target of targets) results.push(crashed('offline', target, OFFLINE_VARIANT, error));
        }
      },
      keyboard: async () => {
        for (const pagePath of allPaths) {
          for (const width of PAGE_WIDTHS) {
            const variant = `${width}px`;
            results.push(await run('keyboard', pagePath, variant, () => withPage(chromium, url(pagePath), viewport(width), (page) => keyboardProblems(page, pagePath, variant))));
          }
        }
      },
      'other-sites': async () => {
        for (const pagePath of allPaths) {
          for (const width of PAGE_WIDTHS) {
            const variant = `${width}px`;
            results.push(
              await run('other-sites', pagePath, variant, async () => {
                const context = await chromium.newContext(viewport(width));
                try {
                  const foreign = await recordRequests(context, server.url);
                  return await otherSiteProblems(context, foreign, url(pagePath), pagePath, variant);
                } finally {
                  await context.close();
                }
              }),
            );
          }
        }
      },
      fonts: async () => {
        for (const pagePath of allPaths) {
          for (const width of PAGE_WIDTHS) {
            const variant = `${width}px`;
            results.push(await run('fonts', pagePath, variant, () => withPage(chromium, url(pagePath), viewport(width), (page) => fontProblems(page, families, pagePath, variant))));
          }
        }
      },
      layout: async () => {
        for (const pagePath of allPaths) {
          for (const { variant, width, height, deviceScaleFactor, textSpacing } of LAYOUT_VARIANTS) {
            results.push(
              await run('layout', pagePath, variant, () =>
                withPage(chromium, url(pagePath), { ...viewport(width, height), deviceScaleFactor }, async (page) => {
                  if (textSpacing) await page.addStyleTag({ content: TEXT_SPACING_CSS });
                  return [
                    ...(await horizontalScroll(page, pagePath, variant)),
                    ...(await clippedOrOverlapping(page, pagePath, variant)),
                    ...(variant === '400%-zoom' ? await isOneColumn(page, pagePath, variant) : []),
                  ];
                }),
              ),
            );
          }
        }
      },
      print: async () => {
        for (const paper of PAPER_SIZES) {
          results.push(await run('print', cvPath, paper, () => withPage(chromium, url(cvPath), viewport(1440), (page) => printProblems(page, cvPath, paper))));
        }
      },
      modes: async () => {
        for (const pagePath of allPaths) {
          for (const width of PAGE_WIDTHS) {
            const variant = `${width}px`;
            results.push(await run('modes', pagePath, variant, () => withPage(chromium, url(pagePath), viewport(width), (page) => motionProblems(page, pagePath, variant))));
          }
          results.push(
            await run('modes', pagePath, 'forced-colors', () => withPage(chromium, url(pagePath), { ...viewport(1440), forcedColors: 'active' }, (page) => forcedColorsProblems(page, pagePath))),
          );
          results.push(
            await run('modes', pagePath, 'reduced-motion', () =>
              withPage(chromium, url(pagePath), { ...viewport(375), reducedMotion: 'reduce' }, (page) => motionProblems(page, pagePath, 'reduced-motion')),
            ),
          );
        }
      },
    };

    for (const part of PARTS) if (parts.includes(part)) await runs[part]();

    const problems = results.flatMap((entry) => entry.problems);
    return {
      siteDir: SITE_DIR,
      version: manifest.version,
      pages,
      results,
      problems,
      result: results.every((entry) => entry.status === 'pass') ? 'pass' : 'fail',
    };
  } finally {
    await browser?.close();
    await server.close();
  }
}
