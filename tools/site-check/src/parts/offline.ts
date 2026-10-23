// The offline part (research R4, R16, FR-053). At 375 px: visit the CV page
// once online and wait for the service worker to take control; then stop the
// server, clear the browser's HTTP cache (so only the worker's stored copy
// can answer) and set the browser offline; then open the CV page, the site
// root and an unknown path. Each must show its full content, styled, with
// text drawn in the site's fonts.
//
// The part serves the site on a server of its own, so stopping it leaves the
// check's other parts alone.
import type { Browser, Page } from 'playwright';
import type { SiteManifest } from '../../../../packages/web/src/routes.ts';
import type { ExpectedField } from '../expected.ts';
import type { Problem } from '../report.ts';
import { startServer } from '../server.ts';
import { unservedFonts } from './fonts.ts';
import { fieldProblems, mainSequence, unstyledDetail } from './no-script.ts';

export const OFFLINE_VARIANT = '375px';

export type OfflineTargets = {
  // The CV page, the redirecting root and the fixed unknown path.
  cvPath: string;
  rootPath: string;
  notFoundPath: string;
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

const mainText = (page: Page) => page.evaluate(() => (document.querySelector('main')?.textContent ?? '').replace(/\s+/g, ' ').trim());

export async function offlineProblems(browser: Browser, input: OfflineInput): Promise<{ page: string; problems: Problem[] }[]> {
  const { cvPath, rootPath, notFoundPath, fields, families } = input;
  const results = new Map<string, Problem[]>([cvPath, rootPath, notFoundPath].map((path) => [path, []]));
  const problem = (page: string, type: string, subject: string, detail: string) =>
    results.get(page)!.push({ part: 'offline', page, variant: OFFLINE_VARIANT, type, subject, detail });

  const server = await startServer({ siteDir: input.siteDir, manifest: input.manifest });
  let serverOpen = true;
  const context = await browser.newContext({ viewport: { width: 375, height: 900 } });
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

    for (const target of [cvPath, rootPath, notFoundPath]) {
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
      const named = new Set<string>();
      for (const { selector, family, drawnIn } of await unservedFonts(page, families)) {
        if (named.has(family)) continue;
        named.add(family);
        problem(target, 'missing-font', JSON.stringify(family), `text in ${selector} was drawn in ${JSON.stringify(drawnIn)} ${WHEN}`);
      }
    }
  } finally {
    await context.close();
    if (serverOpen) await server.close();
  }
  return [...results].map(([page, problems]) => ({ page, problems }));
}
