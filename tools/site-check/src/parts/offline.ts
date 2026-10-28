// The offline part (research R4, R16, FR-053). At 375 px: visit the CV page
// once online and wait for the service worker to take control; then stop the
// server, clear the browser's HTTP cache (so only the worker's stored copy
// can answer) and set the browser offline; then open the CV page, the site
// root and an unknown path. Each must show its full content, styled, with
// text drawn in the site's fonts.
//
// When the site root is a page, the shell (005 FR-052, FR-059), it is opened
// offline at 375 and 1440 px, in its two shells, twice: after the visit to
// the CV page alone, and in a fresh browser context after one visit to the
// root alone. Each time the shell must start and show its icons and
// wallpaper, styled, and the CV app must open with every field, in the
// site's fonts. Its variants are `<shell>/cv-app/<width>px` after the visit
// to the root and `<shell>/cv-app-after-cv/<width>px` after the visit to the
// CV page.
//
// The part serves the site on a server of its own, so stopping it leaves the
// check's other parts alone.
import type { Browser, BrowserContext, Page } from 'playwright';
import type { SiteManifest } from '../../../../packages/web/src/routes.ts';
import type { ExpectedField } from '../expected.ts';
import type { Problem } from '../report.ts';
import { startServer } from '../server.ts';
import { SHELL_SIZES, openCvApp, stateVariant, waitForShell } from '../shell-states.ts';
import type { Shell } from '../shell-states.ts';
import { cvAppFieldProblems } from './cv-app.ts';
import { unservedFonts } from './fonts.ts';
import { fieldProblems, mainSequence, unstyledDetail } from './no-script.ts';

export const OFFLINE_VARIANT = '375px';

// The shell root's variants, in the order `offlineProblems` gives them:
// after the visit to the root, then after the visit to the CV page.
export const rootOfflineVariants = (): string[] =>
  ['cv-app', 'cv-app-after-cv'].flatMap((state) => (['mobile', 'desktop'] as const).map((shell) => stateVariant(shell, state, SHELL_SIZES[shell].width)));

export type OfflineTargets = {
  // The CV page, the root and the fixed unknown path. The root redirects to
  // the CV page unless `shellRoot` says it's the shell's page.
  cvPath: string;
  rootPath: string;
  notFoundPath: string;
  shellRoot?: boolean;
};

export type OfflineInput = OfflineTargets & {
  siteDir: string;
  manifest: SiteManifest;
  fields: readonly ExpectedField[];
  families: readonly string[];
};

const WHEN = 'with the network off';

// How long to wait for a registration to appear after the page loads, and
// then for the worker to install and take control.
const REGISTRATION_WAIT_MS = 3_000;

const CONTROL_WAIT_MS = 20_000;

// Whether a service worker controls the page, waiting for one to register,
// install and claim it.
export async function waitForWorker(page: Page): Promise<boolean> {
  return page.evaluate(
    async ({ registrationWait, controlWait }) => {
      if (!('serviceWorker' in navigator)) return false;
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const until = async (test: () => Promise<boolean> | boolean, ms: number) => {
        const end = Date.now() + ms;
        while (Date.now() < end) {
          if (await test()) return true;
          await sleep(50);
        }
        return test();
      };
      if (!(await until(async () => (await navigator.serviceWorker.getRegistrations()).length > 0, registrationWait))) return false;
      return until(() => navigator.serviceWorker.controller !== null && navigator.serviceWorker.controller.state === 'activated', controlWait);
    },
    { registrationWait: REGISTRATION_WAIT_MS, controlWait: CONTROL_WAIT_MS },
  );
}

// How long the shell may take to start from the worker's stored copy.
const SHELL_START_MS = 10_000;

export type OfflineResult = { page: string; variant: string; problems: Problem[] };

type Add = (type: string, subject: string, detail: string) => void;

// Each family that drew none of an element's text, named once.
async function fontProblems(page: Page, families: readonly string[], add: Add): Promise<void> {
  const named = new Set<string>();
  for (const { selector, family, drawnIn } of await unservedFonts(page, families)) {
    if (named.has(family)) continue;
    named.add(family);
    add('missing-font', JSON.stringify(family), `text in ${selector} was drawn in ${JSON.stringify(drawnIn)} ${WHEN}`);
  }
}

// The shell's page at one size, offline, in a context the worker controls.
async function shellOffline(context: BrowserContext, url: string, shell: Shell, fields: readonly ExpectedField[], families: readonly string[], add: Add): Promise<void> {
  const page = await context.newPage();
  try {
    await page.setViewportSize(SHELL_SIZES[shell]);
    try {
      await page.goto(`${url}/`, { waitUntil: 'load' });
    } catch {
      add('not-available', '/', `did not open ${WHEN} (got a browser error page)`);
      return;
    }
    try {
      await waitForShell(page, SHELL_START_MS);
    } catch {
      add('not-ready', '#os', `the shell did not start ${WHEN}`);
      return;
    }
    const missing = await page.evaluate((name) => {
      const found: string[] = [];
      const shown = document.documentElement.getAttribute('data-shell');
      if (shown !== name) found.push(`the ${shown ?? 'no-script'} shell is shown, expected the ${name} shell`);
      const icons = [...document.querySelectorAll(name === 'mobile' ? '#os .app-icon svg' : '#os .dock-icon svg')];
      if (icons.length === 0 || icons.some((icon) => icon.getBoundingClientRect().width === 0)) found.push('the shell shows no icons');
      const wallpaper = document.querySelector(name === 'mobile' ? '#os .home' : '#os .desktop');
      if (wallpaper === null || getComputedStyle(wallpaper).backgroundImage === 'none') found.push('the shell shows no wallpaper');
      for (const link of document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')) if (link.sheet === null) found.push(`the style sheet ${link.getAttribute('href')} did not load`);
      return found;
    }, shell);
    for (const detail of missing) add('missing-content', '#os', `${detail} ${WHEN}`);
    try {
      await openCvApp(page, shell);
    } catch {
      add('not-available', 'cv-app', `the CV app did not open ${WHEN}`);
      return;
    }
    for (const { type, subject, detail } of await cvAppFieldProblems(page, shell, fields, WHEN)) add(type, subject, detail);
    await fontProblems(page, families, add);
  } finally {
    await page.close();
  }
}

// One visit to `first` online, in a fresh context, then the root offline in
// both shells.
async function rootAfterVisit(browser: Browser, input: OfflineInput, first: string, state: string): Promise<OfflineResult[]> {
  const results = (['mobile', 'desktop'] as const).map((shell) => ({ shell, result: { page: input.rootPath, variant: stateVariant(shell, state, SHELL_SIZES[shell].width), problems: [] as Problem[] } }));
  const server = await startServer({ siteDir: input.siteDir, manifest: input.manifest });
  let serverOpen = true;
  const context = await browser.newContext({ viewport: SHELL_SIZES.mobile, hasTouch: true });
  try {
    const page = await context.newPage();
    await page.goto(`${server.url}${first}`, { waitUntil: 'load' });
    const controlled = await waitForWorker(page);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.clearBrowserCache');
    await cdp.detach();
    await server.close();
    serverOpen = false;
    await context.setOffline(true);
    for (const { shell, result } of results) {
      const add: Add = (type, subject, detail) => result.problems.push({ part: 'offline', page: result.page, variant: result.variant, type, subject, detail });
      if (!controlled) {
        add('no-service-worker', first, 'no service worker took control after the first visit');
        continue;
      }
      await shellOffline(context, server.url, shell, input.fields, input.families, add);
    }
  } finally {
    await context.close();
    if (serverOpen) await server.close();
  }
  return results.map(({ result }) => result);
}

const mainText = (page: Page) => page.evaluate(() => (document.querySelector('main')?.textContent ?? '').replace(/\s+/g, ' ').trim());

export async function offlineProblems(browser: Browser, input: OfflineInput): Promise<OfflineResult[]> {
  const { cvPath, rootPath, notFoundPath, fields, families, shellRoot = false } = input;
  // The root is a target of the visit to the CV page only when it
  // redirects; the shell's page is opened in both shells instead.
  const targets = shellRoot ? [cvPath, notFoundPath] : [cvPath, rootPath, notFoundPath];
  const results = new Map<string, Problem[]>(targets.map((path) => [path, []]));
  const afterCv = (['mobile', 'desktop'] as const).map((shell) => ({ shell, result: { page: rootPath, variant: stateVariant(shell, 'cv-app-after-cv', SHELL_SIZES[shell].width), problems: [] as Problem[] } }));
  const problem = (page: string, type: string, subject: string, detail: string) =>
    results.get(page)!.push({ part: 'offline', page, variant: OFFLINE_VARIANT, type, subject, detail });

  const server = await startServer({ siteDir: input.siteDir, manifest: input.manifest });
  let serverOpen = true;
  const context = await browser.newContext({ viewport: { width: 375, height: 900 }, hasTouch: shellRoot });
  try {
    // Online: the first visit, then the not-found page's text to compare
    // against.
    const first = await context.newPage();
    await first.goto(`${server.url}${cvPath}`, { waitUntil: 'load' });
    const controlled = await waitForWorker(first);
    if (!controlled) problem(cvPath, 'no-service-worker', cvPath, 'no service worker took control after the first visit');
    const notFoundOnline = await context.newPage();
    await notFoundOnline.goto(`${server.url}${notFoundPath}`, { waitUntil: 'load' });
    const expectedNotFound = await mainText(notFoundOnline);

    // Offline: only the worker's stored copy can answer.
    const cdp = await context.newCDPSession(first);
    await cdp.send('Network.clearBrowserCache');
    await cdp.detach();
    await server.close();
    serverOpen = false;
    await context.setOffline(true);

    for (const target of targets) {
      const page = await context.newPage();
      try {
        await page.goto(`${server.url}${target}`, { waitUntil: 'load' });
      } catch {
        if (target === rootPath) problem(target, 'no-redirect', target, `did not lead to ${cvPath} ${WHEN} (got a browser error page)`);
        else problem(target, 'not-available', target, `did not open ${WHEN} (got a browser error page)`);
        continue;
      }
      const reached = new URL(page.url()).pathname;
      if (target === rootPath && reached !== cvPath) {
        problem(target, 'no-redirect', target, `did not lead to ${cvPath} ${WHEN} (ended at ${reached})`);
        continue;
      }
      // Content.
      if (target === notFoundPath) {
        if ((await mainText(page)) !== expectedNotFound) problem(target, 'missing-content', 'main', `the not-found page's text is not shown ${WHEN}`);
      } else {
        for (const { type, subject, detail } of fieldProblems(await mainSequence(page), fields, WHEN)) problem(target, type, subject, detail);
      }
      // Styles.
      const unstyled = await unstyledDetail(page);
      if (unstyled !== null) problem(target, 'unstyled', 'body', `${unstyled} ${WHEN}`);
      // Fonts: each family that didn't load, named once per page.
      await fontProblems(page, families, (type, subject, detail) => problem(target, type, subject, detail));
    }
    if (shellRoot) {
      for (const { shell, result } of afterCv) {
        const add: Add = (type, subject, detail) => result.problems.push({ part: 'offline', page: result.page, variant: result.variant, type, subject, detail });
        if (controlled) await shellOffline(context, server.url, shell, fields, families, add);
        else add('no-service-worker', cvPath, 'no service worker took control after the first visit');
      }
    }
  } finally {
    await context.close();
    if (serverOpen) await server.close();
  }
  const pages = [...results].map(([page, problems]) => ({ page, variant: OFFLINE_VARIANT, problems }));
  if (!shellRoot) return pages;
  // In 004's order: the CV page, the root, the unknown path.
  const root = [...(await rootAfterVisit(browser, input, rootPath, 'cv-app')), ...afterCv.map(({ result }) => result)];
  return [pages[0]!, ...root, ...pages.slice(1)];
}
