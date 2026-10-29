// The site check (research R11): serves the built site, launches one
// isolated Chromium, and runs each part over its pages and variants. Pages
// come from the site manifest: every page of the route table, and the
// not-found page at a fixed unknown path, so a later page is checked with no
// change here (FR-056). A run that throws becomes an `error` result, and
// every other run still happens (FR-058).
//
// When the manifest lists the site root as a page, the OS shell (005
// contracts/cli.md), every part but `print` also runs on it, in its shells
// and states, with variants `<shell>/<state>/<width>px`. When the root
// redirects, as in 004's fixture sites, the check runs as 004's.
import fs from 'node:fs';
import path from 'node:path';
import type { Browser, BrowserContext, BrowserContextOptions, Page } from 'playwright';
import type { Resume } from '@cv/content';
import type { SiteManifest } from '../../../packages/web/src/routes.ts';
import { launchChromium } from './browser.ts';
import { siteText } from '../../../packages/web/src/site-text.ts';
import { expectedFields } from './expected.ts';
import { axeProblems } from './parts/accessibility.ts';
import { contentProblems } from './parts/content.ts';
import { cvAppProblems } from './parts/cv-app.ts';
import { shellLineProblems, terminalProblems, terminalVariants } from './parts/terminal.ts';
import { fontProblems } from './parts/fonts.ts';
import { asLinux, desktopKeyboardProblems, keyboardProblems, mobileKeyboardProblems, terminalKeyboardProblems } from './parts/keyboard.ts';
import { LAYOUT_VARIANTS, TEXT_SPACING_CSS, boxScroll, clippedLabels, clippedOrOverlapping, horizontalScroll, isOneColumn, narrowWindow, rootLayoutVariant, zoomText } from './parts/layout.ts';
import { PROFILES, lighthouseProblems } from './parts/lighthouse.ts';
import { cursorBlinkProblems, forcedColorsProblems, motionProblems, shellForcedColorsProblems, shellMotionProblems } from './parts/modes.ts';
import { noScriptProblems, rootNoScriptProblems } from './parts/no-script.ts';
import { OFFLINE_VARIANT, offlineProblems, rootOfflineVariants, terminalRows } from './parts/offline.ts';
import { otherSiteProblems, recordRequests } from './parts/other-sites.ts';
import { PAPER_SIZES, printProblems } from './parts/print.ts';
import { PARTS } from './report.ts';
import type { CheckResult, Part, Problem, Report } from './report.ts';
import { startServer } from './server.ts';
import { CV_APP_ROOT, SHELL, SHELL_SIZES, SHELL_STATES, findState, openCvApp, openTerminal, reachState, runCommand, shellContext, stateVariant, waitForShell } from './shell-states.ts';
import type { Shell, ShellState } from './shell-states.ts';

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

// The site root's path when it's the shell's page.
const ROOT = '/';

const SHELLS: readonly Shell[] = ['desktop', 'mobile'];

// The root's extra layout runs (contracts/cli.md Parts): the CV window
// narrowed as far as a resize goes, which must still fit 400 px with no
// horizontal scroll, and text-only zoom at 200% on the desktop.
const NARROW_WINDOW_MAX = 400;

const TEXT_ZOOM = 2;

// The Terminal's layout runs (006 contracts/cli.md `layout`): its states in
// the shell each size gives, at 320 × 568 and 568 × 320, in a window
// narrowed to 400 px, at 200% and 400% zoom and with text spacing.
const TERMINAL_LAYOUT_STATES: Record<Shell, readonly string[]> = { desktop: ['terminal-help', 'terminal-vim'], mobile: ['pocket', 'pocket-vim'] };

const TERMINAL_LAYOUTS: readonly { condition: string; shell: Shell; width: number; height: number; deviceScaleFactor: number; textSpacing: boolean; narrow: boolean }[] = [
  { condition: '', shell: 'mobile', width: 320, height: 568, deviceScaleFactor: 1, textSpacing: false, narrow: false },
  { condition: '', shell: 'mobile', width: 568, height: 320, deviceScaleFactor: 1, textSpacing: false, narrow: false },
  { condition: 'narrow-window', shell: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1, textSpacing: false, narrow: true },
  { condition: '200%-zoom', shell: 'mobile', width: 640, height: 450, deviceScaleFactor: 2, textSpacing: false, narrow: false },
  { condition: '400%-zoom', shell: 'mobile', width: 320, height: 225, deviceScaleFactor: 4, textSpacing: false, narrow: false },
  { condition: 'text-spacing', shell: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1, textSpacing: true, narrow: false },
  { condition: 'text-spacing', shell: 'mobile', width: 375, height: 812, deviceScaleFactor: 1, textSpacing: true, narrow: false },
];

const TERMINAL_ROOT = '#os .terminal';

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
// doesn't measure them. `setup` prepares the context before the page opens.
async function withPage<T>(browser: Browser, url: string, options: BrowserContextOptions, body: (page: Page) => Promise<T>, setup?: (context: BrowserContext) => Promise<void>): Promise<T> {
  const context = await browser.newContext({ serviceWorkers: 'block', ...options });
  try {
    await setup?.(context);
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    return await body(page);
  } finally {
    await context.close();
  }
}

// The root in a fresh context for `shell` at a size, once the shell has
// hydrated.
function withShell<T>(browser: Browser, url: string, target: { shell: Shell; width: number; height: number }, options: BrowserContextOptions, body: (page: Page) => Promise<T>, setup?: (context: BrowserContext) => Promise<void>): Promise<T> {
  return withPage(
    browser,
    url,
    { ...shellContext(target), ...options },
    async (page) => {
      await waitForShell(page);
      return body(page);
    },
    setup,
  );
}

const shellAt = (shell: Shell) => ({ shell, ...SHELL_SIZES[shell] });

// The site's name as the root's no-script page shows it: the CV document's
// name, else the site heading (005 FR-066). The site's own `siteName` is in
// a module Node can't load without the build.
const siteName = (resume: Resume) => (typeof resume.basics?.name === 'string' && resume.basics.name !== '' ? resume.basics.name : siteText.siteHeading);

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
  const rootPath = routes.redirects.find((redirect) => redirect.to === cvPath)?.from ?? ROOT;
  const shellRoot = routes.pages.some((page) => page.path === ROOT);

  const server = await startServer({ siteDir, manifest });
  let browser: Browser | undefined;
  try {
    const status = async (pagePath: string) => (await fetch(`${server.url}${pagePath}`, { redirect: 'manual' })).status;
    const pages: Report['pages'] = [];
    for (const page of routes.pages) pages.push({ path: page.path, status: await status(page.path), notFound: false });
    pages.push({ path: NOT_FOUND_PATH, status: await status(NOT_FOUND_PATH), notFound: true });
    const okPaths = pages.filter((page) => page.status === 200).map((page) => page.path);
    // The pages 004's runs measure: every page but the shell's root, which
    // has runs of its own.
    const allPaths = pages.map((page) => page.path).filter((pagePath) => !(shellRoot && pagePath === ROOT));
    const url = (pagePath: string) => `${server.url}${pagePath}`;
    const rootUrl = url(ROOT);
    browser = await launchChromium();
    const chromium = browser;

    const results: CheckResult[] = [];
    const runs: Record<Part, () => Promise<void>> = {
      content: async () => {
        results.push(await run('content', '-', '-', async () => contentProblems(readResume())));
      },
      'cv-app': async () => {
        // With no shell at the root there's no CV app to open: the part
        // passes with nothing measured, and keeps its line in the summary.
        if (!shellRoot) {
          results.push(result('cv-app', '-', '-', []));
          return;
        }
        for (const shell of SHELLS) {
          const target = shellAt(shell);
          const variant = stateVariant(shell, 'cv-app', target.width);
          results.push(await run('cv-app', ROOT, variant, async () => {
            const fields = expectedFields(readResume());
            return withShell(chromium, rootUrl, target, {}, (page) => cvAppProblems(page, shell, fields, ROOT, variant));
          }));
        }
      },
      terminal: async () => {
        // As `cv-app`: with no shell at the root, there's no Terminal.
        if (!shellRoot) {
          results.push(result('terminal', '-', '-', []));
          return;
        }
        for (const shell of SHELLS) {
          const target = shellAt(shell);
          try {
            const runs = await withShell(chromium, rootUrl, target, {}, (page) => terminalProblems(page, shell, readResume(), ROOT, target.width));
            for (const { variant, problems } of runs) results.push(result('terminal', ROOT, variant, problems));
          } catch (error) {
            for (const variant of terminalVariants(shell, target.width)) results.push(crashed('terminal', ROOT, variant, error));
          }
        }
      },
      accessibility: async () => {
        for (const pagePath of allPaths) {
          for (const width of ACCESSIBILITY_WIDTHS) {
            const variant = `${width}px`;
            results.push(await run('accessibility', pagePath, variant, () => withPage(chromium, url(pagePath), viewport(width), (page) => axeProblems(page, pagePath, variant))));
          }
        }
        if (!shellRoot) return;
        for (const state of SHELL_STATES) {
          const variant = stateVariant(state.shell, state.state, state.width);
          results.push(
            await run('accessibility', ROOT, variant, () =>
              withShell(chromium, rootUrl, state, {}, async (page) => {
                await reachState(page, state);
                return axeProblems(page, ROOT, variant);
              }),
            ),
          );
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
          if (!shellRoot) continue;
          results.push(
            await run('no-script', ROOT, variant, () =>
              withPage(chromium, rootUrl, { ...viewport(width), javaScriptEnabled: false }, (page) => rootNoScriptProblems(page, siteName(readResume()), cvPath, ROOT, variant)),
            ),
          );
        }
      },
      offline: async () => {
        const targets = [cvPath, rootPath, NOT_FOUND_PATH];
        try {
          const fields = expectedFields(readResume());
          const outcome = await offlineProblems(chromium, { siteDir, manifest, fields, families, cvPath, rootPath, notFoundPath: NOT_FOUND_PATH, shellRoot });
          for (const { page, variant, problems } of outcome) results.push(result('offline', page, variant, problems));
        } catch (error) {
          // The shell root's lines keep their `<shell>/<state>/<width>px`.
          for (const target of targets) {
            for (const variant of shellRoot && target === rootPath ? rootOfflineVariants() : [OFFLINE_VARIANT]) results.push(crashed('offline', target, variant, error));
          }
        }
      },
      keyboard: async () => {
        for (const pagePath of allPaths) {
          for (const width of PAGE_WIDTHS) {
            const variant = `${width}px`;
            results.push(await run('keyboard', pagePath, variant, () => withPage(chromium, url(pagePath), viewport(width), (page) => keyboardProblems(page, pagePath, variant))));
          }
        }
        if (!shellRoot) return;
        for (const shell of SHELLS) {
          const target = shellAt(shell);
          const variant = stateVariant(shell, 'keyboard', target.width);
          const flow = shell === 'desktop' ? desktopKeyboardProblems : mobileKeyboardProblems;
          results.push(await run('keyboard', ROOT, variant, () => withShell(chromium, rootUrl, target, {}, (page) => flow(page, ROOT, variant))));
        }
        // The Terminal's flow (006 FR-039), on the desktop, with the page
        // reporting Linux for the command line's keys.
        const desktop = shellAt('desktop');
        const terminalVariant = stateVariant('desktop', 'terminal-keyboard', desktop.width);
        results.push(await run('keyboard', ROOT, terminalVariant, () => withShell(chromium, rootUrl, desktop, {}, (page) => terminalKeyboardProblems(page, ROOT, terminalVariant), asLinux)));
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
        if (!shellRoot) return;
        for (const shell of SHELLS) {
          const target = shellAt(shell);
          const variant = stateVariant(shell, 'cv-app', target.width);
          results.push(
            await run('other-sites', ROOT, variant, async () => {
              const context = await chromium.newContext(shellContext(target));
              try {
                const foreign = await recordRequests(context, server.url);
                return await otherSiteProblems(context, foreign, rootUrl, ROOT, variant, async (page) => {
                  await waitForShell(page);
                  await openCvApp(page, shell);
                });
              } finally {
                await context.close();
              }
            }),
          );
        }
        // The Terminal opened, every command `help` lists run, and, with it
        // opened again after `exit`, the `terminal` part's added lines (006
        // FR-038), under the state it opens in. Only the requests count here.
        for (const shell of SHELLS) {
          const target = shellAt(shell);
          const variant = stateVariant(shell, shell === 'desktop' ? 'terminal-open' : 'pocket', target.width);
          results.push(
            await run('other-sites', ROOT, variant, async () => {
              const context = await chromium.newContext(shellContext(target));
              try {
                const foreign = await recordRequests(context, server.url);
                return await otherSiteProblems(context, foreign, rootUrl, ROOT, variant, async (page) => {
                  await waitForShell(page);
                  await terminalRows(page, shell);
                  await openTerminal(page, shell);
                  await runCommand(page, 'cd');
                  await shellLineProblems(page, shell, readResume());
                });
              } finally {
                await context.close();
              }
            }),
          );
        }
      },
      fonts: async () => {
        for (const pagePath of allPaths) {
          for (const width of PAGE_WIDTHS) {
            const variant = `${width}px`;
            results.push(await run('fonts', pagePath, variant, () => withPage(chromium, url(pagePath), viewport(width), (page) => fontProblems(page, families, pagePath, variant))));
          }
        }
        if (!shellRoot) return;
        for (const state of [findState('desktop', 'two-windows'), findState('mobile', 'cv-app'), findState('desktop', 'terminal-help'), findState('mobile', 'pocket-vim')]) {
          const variant = stateVariant(state.shell, state.state, state.width);
          results.push(
            await run('fonts', ROOT, variant, () =>
              withShell(chromium, rootUrl, state, {}, async (page) => {
                await reachState(page, state);
                return fontProblems(page, families, ROOT, variant);
              }),
            ),
          );
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
        if (!shellRoot) return;
        for (const layout of LAYOUT_VARIANTS) {
          const { shell, variant } = rootLayoutVariant(layout);
          const { width, height, deviceScaleFactor, textSpacing } = layout;
          results.push(
            await run('layout', ROOT, variant, () =>
              withShell(chromium, rootUrl, { shell, width, height }, { deviceScaleFactor }, async (page) => {
                if (textSpacing) await page.addStyleTag({ content: TEXT_SPACING_CSS });
                return [...(await horizontalScroll(page, ROOT, variant)), ...(await clippedOrOverlapping(page, ROOT, variant))];
              }),
            ),
          );
        }
        const desktop = shellAt('desktop');
        const narrowVariant = stateVariant('desktop', 'narrow-window', desktop.width);
        results.push(
          await run('layout', ROOT, narrowVariant, () =>
            withShell(chromium, rootUrl, desktop, {}, async (page) => {
              const width = await narrowWindow(page, SHELL.cvWindow);
              const found = await boxScroll(page, CV_APP_ROOT.desktop, ROOT, narrowVariant);
              if (width > NARROW_WINDOW_MAX) found.push({ part: 'layout', page: ROOT, variant: narrowVariant, type: 'too-wide', subject: SHELL.cvWindow, detail: `narrows only to ${Math.round(width)}px, wider than ${NARROW_WINDOW_MAX}px` });
              return found;
            }),
          ),
        );
        // The Terminal (006 contracts/cli.md `layout`): no horizontal scroll
        // in it, in each of its states the size gives, at each condition.
        for (const { condition, shell, width, height, deviceScaleFactor, textSpacing, narrow } of TERMINAL_LAYOUTS) {
          for (const state of TERMINAL_LAYOUT_STATES[shell]) {
            const variant = stateVariant(shell, condition === '' ? state : `${state}-${condition}`, width);
            results.push(
              await run('layout', ROOT, variant, () =>
                withShell(chromium, rootUrl, { shell, width, height }, { deviceScaleFactor }, async (page) => {
                  await reachState(page, { ...findState(shell, state), width, height } as ShellState);
                  if (textSpacing) await page.addStyleTag({ content: TEXT_SPACING_CSS });
                  const found: Problem[] = [];
                  if (narrow) {
                    const narrowed = await narrowWindow(page, SHELL.terminalWindow);
                    if (narrowed > NARROW_WINDOW_MAX) found.push({ part: 'layout', page: ROOT, variant, type: 'too-wide', subject: SHELL.terminalWindow, detail: `narrows only to ${Math.round(narrowed)}px, wider than ${NARROW_WINDOW_MAX}px` });
                  }
                  return [...found, ...(await horizontalScroll(page, ROOT, variant)), ...(await boxScroll(page, TERMINAL_ROOT, ROOT, variant))];
                }),
              ),
            );
          }
        }
        const zoomVariant = stateVariant('desktop', 'text-zoom', desktop.width);
        results.push(
          await run('layout', ROOT, zoomVariant, () =>
            withShell(chromium, rootUrl, desktop, {}, async (page) => {
              await zoomText(page, TEXT_ZOOM);
              return clippedLabels(page, ROOT, zoomVariant);
            }),
          ),
        );
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
        if (!shellRoot) return;
        // The shell animates without reduced motion (005 research R13), so
        // the root is measured with forced colors and with reduced motion.
        for (const shell of SHELLS) {
          const target = shellAt(shell);
          const forced = stateVariant(shell, 'forced-colors', target.width);
          results.push(await run('modes', ROOT, forced, () => withShell(chromium, rootUrl, target, { forcedColors: 'active' }, (page) => shellForcedColorsProblems(page, shell, ROOT, forced))));
          const reduced = stateVariant(shell, 'reduced-motion', target.width);
          results.push(await run('modes', ROOT, reduced, () => withShell(chromium, rootUrl, target, { reducedMotion: 'reduce' }, (page) => shellMotionProblems(page, shell, ROOT, reduced))));
          // Without reduced motion, the Terminal's cursor blinks after a key
          // press and stops (006 FR-032).
          const blink = stateVariant(shell, 'cursor-blink', target.width);
          results.push(await run('modes', ROOT, blink, () => withShell(chromium, rootUrl, target, { reducedMotion: 'no-preference' }, (page) => cursorBlinkProblems(page, shell, ROOT, blink))));
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
