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
// The Terminal (006 FR-041) is opened in the same offline pages, after both
// visits, in both shells: every command `help` lists is run, and each
// output's rows compared with the same run online. Its variants are
// `<shell>/terminal/<command>/<width>px` after the visit to the root and
// `<shell>/terminal-after-cv/<command>/<width>px` after the visit to the CV
// page.
//
// The inspector (007 FR-033) is opened in the same offline pages too: each
// app's and About this site's spec view, compared with the same view online
// and checked for the note that its links need a connection. Its variants
// are `<shell>/<view>-specs/<width>px` after the visit to the root and
// `<shell>/<view>-specs-after-cv/<width>px` after the visit to the CV page.
//
// The part serves the site on a server of its own, so stopping it leaves the
// check's other parts alone.
import type { Browser, BrowserContext, Page } from 'playwright';
import { COMMANDS } from '../../../../packages/web/src/apps/terminal/engine/commands.ts';
import type { SiteManifest } from '../../../../packages/web/src/routes.ts';
import type { ExpectedField } from '../expected.ts';
import type { Problem } from '../report.ts';
import { startServer } from '../server.ts';
import { siteText } from '../../../../packages/web/src/site-text.ts';
import { INSPECTOR, SHELL, SHELL_SIZES, TERMINAL, openCvApp, openTerminal, openView, shellContext, showSpecs, stateVariant, typeLine, vimEntry, waitForShell } from '../shell-states.ts';
import type { InspectorView, Shell } from '../shell-states.ts';
import { cvAppFieldProblems } from './cv-app.ts';
import { unservedFonts } from './fonts.ts';
import { fieldProblems, mainSequence, unstyledDetail } from './no-script.ts';

export const OFFLINE_VARIANT = '375px';

// Every command `help` lists, in its order; `exit` last, since it closes
// the Terminal.
export const TERMINAL_COMMANDS: readonly string[] = COMMANDS.map((command) => command.name);

const SHELLS = ['mobile', 'desktop'] as const;

// The Terminal's variants after a visit, in the order they're given.
export const terminalOfflineVariants = (state: 'terminal' | 'terminal-after-cv'): string[] =>
  SHELLS.flatMap((shell) => TERMINAL_COMMANDS.map((name) => stateVariant(shell, `${state}/${name}`, SHELL_SIZES[shell].width)));

const INSPECTOR_VIEWS: readonly InspectorView[] = ['cv', 'terminal', 'about'];

// The inspector's variants after a visit, in the order they're given.
export const inspectorOfflineVariants = (after: '' | '-after-cv'): string[] =>
  SHELLS.flatMap((shell) => INSPECTOR_VIEWS.map((view) => stateVariant(shell, `${view}-specs${after}`, SHELL_SIZES[shell].width)));

// The shell root's variants, in the order `offlineProblems` gives them:
// after the visit to the root, then after the visit to the CV page, then
// the Terminal's after each, then the inspector's after each.
export const rootOfflineVariants = (): string[] => [
  ...['cv-app', 'cv-app-after-cv'].flatMap((state) => SHELLS.map((shell) => stateVariant(shell, state, SHELL_SIZES[shell].width))),
  ...terminalOfflineVariants('terminal'),
  ...terminalOfflineVariants('terminal-after-cv'),
  ...inspectorOfflineVariants(''),
  ...inspectorOfflineVariants('-after-cv'),
];

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


// ---- The Terminal (006 FR-041) ---------------------------------------------

// What a command shows, as rows of text: its output's lines, the vim view's
// lines for `cv` (left with `:q`), or one row when it closed the Terminal.
async function commandRows(page: Page, line: string): Promise<string[]> {
  const before = await page.locator(TERMINAL.run).count();
  await typeLine(page, line);
  await page.waitForFunction(
    ([run, vim, window, count]) =>
      document.querySelector(vim as string) !== null || document.querySelector(window as string) === null || document.querySelectorAll(run as string).length !== count,
    [TERMINAL.run, TERMINAL.vimText, `${SHELL.terminalWindow}, ${SHELL.terminalFullScreen}`, before] as const,
    { timeout: SHELL_START_MS },
  );
  if (await page.locator(TERMINAL.vimText).count()) {
    const rows = await page.locator(`${TERMINAL.vimLine} .vim-code`).allTextContents();
    await vimEntry(page, ':', 'q');
    await page.locator(TERMINAL.commandLine).waitFor({ state: 'visible', timeout: SHELL_START_MS });
    return rows.map((row) => row.trimEnd());
  }
  if ((await page.locator(`${SHELL.terminalWindow}, ${SHELL.terminalFullScreen}`).count()) === 0) return ['(the Terminal closed)'];
  const run = page.locator(TERMINAL.run).last().locator('.run-output');
  if ((await page.locator(TERMINAL.run).count()) === 0 || (await run.count()) === 0) return [];
  return (await run.innerText()).split('\n').map((row) => row.trim()).filter((row) => row !== '');
}

export type TerminalRows = Map<string, string[]>;

// Opens the Terminal on a page showing `shell` and runs every command.
export async function terminalRows(page: Page, shell: Shell): Promise<TerminalRows> {
  await openTerminal(page, shell);
  const rows: TerminalRows = new Map();
  for (const name of TERMINAL_COMMANDS) rows.set(name, await commandRows(page, name));
  return rows;
}

// The rows of every command online, in each shell, as the baseline.
export async function onlineTerminalRows(browser: Browser, input: OfflineInput): Promise<Record<Shell, TerminalRows>> {
  const server = await startServer({ siteDir: input.siteDir, manifest: input.manifest });
  try {
    const found = {} as Record<Shell, TerminalRows>;
    for (const shell of SHELLS) {
      const context = await browser.newContext({ serviceWorkers: 'block', ...shellContext({ shell, ...SHELL_SIZES[shell] }) });
      try {
        const page = await context.newPage();
        await page.goto(`${server.url}/`, { waitUntil: 'load' });
        await waitForShell(page);
        found[shell] = await terminalRows(page, shell);
      } finally {
        await context.close();
      }
    }
    return found;
  } finally {
    await server.close();
  }
}

// The root offline in `shell`, its Terminal's commands compared with the
// online run, each under its own variant.
async function terminalOffline(context: BrowserContext, url: string, shell: Shell, state: 'terminal' | 'terminal-after-cv', online: TerminalRows, page: string): Promise<OfflineResult[]> {
  const results = TERMINAL_COMMANDS.map((name) => ({ page, variant: stateVariant(shell, `${state}/${name}`, SHELL_SIZES[shell].width), problems: [] as Problem[] }));
  const add = (index: number, type: string, detail: string) => results[index]!.problems.push({ part: 'offline', page, variant: results[index]!.variant, type, subject: TERMINAL_COMMANDS[index]!, detail });
  const tab = await context.newPage();
  try {
    await tab.setViewportSize(SHELL_SIZES[shell]);
    let opened = true;
    try {
      await tab.goto(`${url}/`, { waitUntil: 'load' });
      await waitForShell(tab, SHELL_START_MS);
      await openTerminal(tab, shell);
    } catch {
      opened = false;
    }
    for (const [index, name] of TERMINAL_COMMANDS.entries()) {
      if (!opened) {
        add(index, 'not-available', `the Terminal did not open ${WHEN}`);
        continue;
      }
      let rows: string[];
      try {
        rows = await commandRows(tab, name);
      } catch {
        add(index, 'not-available', `${name} showed nothing ${WHEN}`);
        continue;
      }
      const expected = online.get(name) ?? [];
      const row = [...Array(Math.max(rows.length, expected.length)).keys()].find((at) => rows[at] !== expected[at]);
      if (row !== undefined) add(index, 'offline-mismatch', `output differs from the online run at row ${row + 1}`);
    }
  } finally {
    await tab.close();
  }
  return results;
}

// ---- The inspector (007 FR-033) ---------------------------------------------

// A spec view as rows: its bar, heading, lede and build line, each group's
// heading and count, and each requirement's text, tests and links, keyed;
// the offline note apart.
type SpecRows = { rows: [string, string][]; note: string | null };

async function specRows(page: Page, view: InspectorView): Promise<SpecRows> {
  return page.evaluate((selector) => {
    const root = document.querySelector(selector)!;
    const words = (element: Element | null) => (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const rows: [string, string][] = [
      ['the bar', words(root.querySelector('.spec-bar'))],
      ['the heading', words(root.querySelector('.spec-heading'))],
      ['the lede', words(root.querySelector('.spec-lede'))],
      ['the build line', words(root.querySelector('.spec-build'))],
    ];
    for (const group of root.querySelectorAll('section.spec-group')) {
      rows.push([group.getAttribute('data-feature') ?? 'a group', `${words(group.querySelector('h2'))} ${words(group.querySelector('.not-shown'))}`]);
      for (const item of group.querySelectorAll('li.requirement')) {
        const links = [...item.querySelectorAll('a')].map((link) => link.getAttribute('href')).join(' ');
        rows.push([item.getAttribute('data-id') ?? 'a requirement', `${words(item)} ${links}`]);
      }
    }
    const note = root.querySelector('.note-offline');
    return { rows, note: note === null ? null : words(note) };
  }, INSPECTOR.specView(view));
}

export type InspectorRows = Map<InspectorView, SpecRows>;

// Each spec view's rows, in a page showing `shell`, each view's specs shown
// in turn.
async function inspectorRows(page: Page, shell: Shell): Promise<InspectorRows> {
  const found: InspectorRows = new Map();
  for (const view of INSPECTOR_VIEWS) {
    await openView(page, view, shell);
    await showSpecs(page, view, shell);
    found.set(view, await specRows(page, view));
  }
  return found;
}

// Every spec view's rows online, in each shell, as the baseline.
export async function onlineInspectorRows(browser: Browser, input: OfflineInput): Promise<Record<Shell, InspectorRows>> {
  const server = await startServer({ siteDir: input.siteDir, manifest: input.manifest });
  try {
    const found = {} as Record<Shell, InspectorRows>;
    for (const shell of SHELLS) {
      const context = await browser.newContext({ serviceWorkers: 'block', ...shellContext({ shell, ...SHELL_SIZES[shell] }) });
      try {
        const page = await context.newPage();
        await page.goto(`${server.url}/`, { waitUntil: 'load' });
        await waitForShell(page);
        found[shell] = await inspectorRows(page, shell);
      } finally {
        await context.close();
      }
    }
    return found;
  } finally {
    await server.close();
  }
}

// The root offline in `shell`, each spec view compared with the online run
// and checked for the offline note, each under its own variant.
async function inspectorOffline(context: BrowserContext, url: string, shell: Shell, after: '' | '-after-cv', online: InspectorRows, page: string): Promise<OfflineResult[]> {
  const results: OfflineResult[] = [];
  for (const view of INSPECTOR_VIEWS) {
    const variant = stateVariant(shell, `${view}-specs${after}`, SHELL_SIZES[shell].width);
    const problems: Problem[] = [];
    const add = (type: string, detail: string) => problems.push({ part: 'offline', page, variant, type, subject: view, detail });
    results.push({ page, variant, problems });
    const tab = await context.newPage();
    try {
      await tab.setViewportSize(SHELL_SIZES[shell]);
      try {
        await tab.goto(`${url}/`, { waitUntil: 'load' });
        await waitForShell(tab, SHELL_START_MS);
        await openView(tab, view, shell);
      } catch {
        add('not-available', `the ${view} view did not open ${WHEN}`);
        continue;
      }
      try {
        await showSpecs(tab, view, shell);
      } catch {
        add('not-available', `the spec view showed no requirements ${WHEN}`);
        continue;
      }
      const shown = await specRows(tab, view);
      const expected = online.get(view)!;
      const at = [...Array(Math.max(shown.rows.length, expected.rows.length)).keys()].find((index) => shown.rows[index]?.[0] !== expected.rows[index]?.[0] || shown.rows[index]?.[1] !== expected.rows[index]?.[1]);
      if (at !== undefined) add('offline-mismatch', `the offline view differs from the online one at ${(shown.rows[at] ?? expected.rows[at])![0]}`);
      if (shown.note !== siteText.inspector.offline) add('offline-mismatch', shown.note === null ? `shows no note that its links need a connection ${WHEN}` : `its offline note reads "${shown.note}"`);
    } finally {
      await tab.close();
    }
  }
  return results;
}

// The inspector's results when no worker took control: one line per shell.
function noWorkerInspector(shell: Shell, after: '' | '-after-cv', page: string, first: string): OfflineResult[] {
  return INSPECTOR_VIEWS.map((view, index) => {
    const variant = stateVariant(shell, `${view}-specs${after}`, SHELL_SIZES[shell].width);
    return { page, variant, problems: index === 0 ? [{ part: 'offline', page, variant, type: 'no-service-worker', subject: first, detail: 'no service worker took control after the first visit' }] : [] };
  });
}

// One visit to `first` online, in a fresh context, then the root offline in
// both shells, its CV app, its Terminal and its spec views.
async function rootAfterVisit(browser: Browser, input: OfflineInput, first: string, state: string, online: Record<Shell, TerminalRows>, onlineSpecs: Record<Shell, InspectorRows>): Promise<OfflineResult[]> {
  const terminal: OfflineResult[] = [];
  const inspector: OfflineResult[] = [];
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
    for (const shell of SHELLS) terminal.push(...(controlled ? await terminalOffline(context, server.url, shell, 'terminal', online[shell], input.rootPath) : noWorker(shell, 'terminal', input.rootPath, first)));
    for (const shell of SHELLS) inspector.push(...(controlled ? await inspectorOffline(context, server.url, shell, '', onlineSpecs[shell], input.rootPath) : noWorkerInspector(shell, '', input.rootPath, first)));
  } finally {
    await context.close();
    if (serverOpen) await server.close();
  }
  return [...results.map(({ result }) => result), ...terminal, ...inspector];
}

// The Terminal's results when no worker took control: one line per shell.
function noWorker(shell: Shell, state: 'terminal' | 'terminal-after-cv', page: string, first: string): OfflineResult[] {
  return TERMINAL_COMMANDS.map((name, index) => {
    const variant = stateVariant(shell, `${state}/${name}`, SHELL_SIZES[shell].width);
    return { page, variant, problems: index === 0 ? [{ part: 'offline', page, variant, type: 'no-service-worker', subject: first, detail: 'no service worker took control after the first visit' }] : [] };
  });
}

const mainText = (page: Page) => page.evaluate(() => (document.querySelector('main')?.textContent ?? '').replace(/\s+/g, ' ').trim());

export async function offlineProblems(browser: Browser, input: OfflineInput): Promise<OfflineResult[]> {
  const { cvPath, rootPath, notFoundPath, fields, families, shellRoot = false } = input;
  const online = shellRoot ? await onlineTerminalRows(browser, input) : null;
  const onlineSpecs = shellRoot ? await onlineInspectorRows(browser, input) : null;
  const terminalAfterCv: OfflineResult[] = [];
  const inspectorAfterCv: OfflineResult[] = [];
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
      for (const shell of SHELLS) terminalAfterCv.push(...(controlled ? await terminalOffline(context, server.url, shell, 'terminal-after-cv', online![shell], rootPath) : noWorker(shell, 'terminal-after-cv', rootPath, cvPath)));
      for (const shell of SHELLS) inspectorAfterCv.push(...(controlled ? await inspectorOffline(context, server.url, shell, '-after-cv', onlineSpecs![shell], rootPath) : noWorkerInspector(shell, '-after-cv', rootPath, cvPath)));
    }
  } finally {
    await context.close();
    if (serverOpen) await server.close();
  }
  const pages = [...results].map(([page, problems]) => ({ page, variant: OFFLINE_VARIANT, problems }));
  if (!shellRoot) return pages;
  // In 004's order: the CV page, the root, the unknown path.
  const [mobile, desktop, ...rest] = await rootAfterVisit(browser, input, rootPath, 'cv-app', online!, onlineSpecs!);
  const terminal = rest.slice(0, -inspectorOfflineVariants('').length);
  const inspector = rest.slice(-inspectorOfflineVariants('').length);
  const root = [mobile!, desktop!, ...afterCv.map(({ result }) => result), ...terminal, ...terminalAfterCv, ...inspector, ...inspectorAfterCv];
  return [pages[0]!, ...root, ...pages.slice(1)];
}
