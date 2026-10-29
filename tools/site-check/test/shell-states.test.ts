// The state driver on the real build (005 research R17), and the root's
// runs in the report (005 contracts/cli.md).
import type { Browser, Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, onTestFinished, test, vi } from 'vitest';
import { launchChromium } from '../src/browser.ts';
import { SITE_DIR, readManifest, runCheck } from '../src/check.ts';
import { SHELL, SHELL_STATES, TERMINAL, TERMINAL_STATES, reachState, shellContext, stateVariant, waitForShell } from '../src/shell-states.ts';
import type { ShellState } from '../src/shell-states.ts';
import { renderReport } from '../src/report.ts';
import { startServer } from '../src/server.ts';
import { realSiteProject } from './helpers/root.ts';

vi.setConfig({ testTimeout: 180_000 });

let browser: Browser;

beforeAll(async () => {
  browser = await launchChromium();
});

afterAll(async () => {
  await browser?.close();
});

const shown = (page: Page, selector: string) => page.locator(selector).first().isVisible();

const count = (page: Page, selector: string) => page.locator(selector).count();

// The Terminal's states (006 contracts/cli.md States): what the newest run,
// the vim view or the window shows.
const runs = (page: Page) => count(page, TERMINAL.run);

const lastRun = (page: Page) => page.locator(TERMINAL.run).last().locator('.run-line').textContent();

const lineLength = (page: Page) => page.locator(TERMINAL.commandLine).evaluate((input) => (input as HTMLInputElement).value.length);

const vim = async (page: Page) => ({ vim: await shown(page, TERMINAL.vimText), help: await shown(page, TERMINAL.vimHelp) });

const searched = async (page: Page) => ({ vim: await shown(page, TERMINAL.vimText), matches: (await count(page, `${TERMINAL.vim} mark`)) > 0 });

const TERMINAL_SHOWS: Record<string, (page: Page) => Promise<unknown>> = {
  'desktop/terminal-open': async (page) => ({ window: await shown(page, SHELL.terminalWindow), runs: await runs(page), focused: await page.getAttribute('#os .window[aria-current="true"]', 'data-view') }),
  'desktop/terminal-help': async (page) => ({ run: await lastRun(page), help: await shown(page, `${TERMINAL.run} .out-help`) }),
  'desktop/terminal-vim': vim,
  'desktop/terminal-vim-search': searched,
  'desktop/terminal-vim-help': vim,
  'desktop/terminal-unknown': async (page) => ({ run: await lastRun(page), suggestions: (await count(page, `${TERMINAL.run} .command-chip`)) > 0 }),
  'desktop/terminal-ls': async (page) => ({ run: await lastRun(page), names: (await count(page, `${TERMINAL.run} ul.out-columns li`)) > 0 }),
  'desktop/terminal-cat': async (page) => ({ run: (await lastRun(page))?.startsWith('cat ~/work/'), runs: await runs(page) }),
  'desktop/terminal-clear': async (page) => ({ runs: await runs(page), line: await shown(page, TERMINAL.commandLine) }),
  'desktop/terminal-long-command': async (page) => ({ length: await lineLength(page), runs: await runs(page) }),
  'desktop/terminal-minimized': async (page) => ({ window: await shown(page, SHELL.terminalWindow), dock: await shown(page, SHELL.terminalDockItem) }),
  'desktop/terminal-maximized': async (page) => ({ maximized: await count(page, `${SHELL.terminalWindow}[data-maximized]`), runs: await runs(page) }),
  'desktop/terminal-two-windows': async (page) => ({ windows: await count(page, '#os .window'), focused: await page.getAttribute('#os .window[aria-current="true"]', 'data-view') }),
  'desktop/terminal-specs': async (page) => ({ run: await lastRun(page), specs: await shown(page, `${TERMINAL.run} .out-specs`) }),
  'desktop/terminal-menu': async (page) => ({ menu: await shown(page, SHELL.appMenu), expanded: await page.getAttribute(SHELL.appMenuTitle, 'aria-expanded') }),
  'mobile/pocket': async (page) => ({ app: await shown(page, SHELL.terminalFullScreen), pocket: await shown(page, TERMINAL.pocket) }),
  'mobile/pocket-landscape': async (page) => ({ pocket: await shown(page, TERMINAL.pocket), size: page.viewportSize() }),
  'mobile/pocket-keyboard': async (page) => ({ keyboard: await count(page, `${TERMINAL.pocket}[data-keyboard]`), size: page.viewportSize() }),
  'mobile/pocket-vim': vim,
  'mobile/pocket-help': async (page) => ({ run: await lastRun(page), help: await shown(page, `${TERMINAL.run} .out-help`) }),
  'mobile/pocket-unknown': async (page) => ({ run: await lastRun(page), suggestions: (await count(page, `${TERMINAL.run} .command-chip`)) > 0 }),
  'mobile/pocket-ls': async (page) => ({ run: await lastRun(page), names: (await count(page, `${TERMINAL.run} ul.out-columns li`)) > 0 }),
  'mobile/pocket-cat': async (page) => ({ run: (await lastRun(page))?.startsWith('cat ~/work/'), runs: await runs(page) }),
  'mobile/pocket-clear': async (page) => ({ runs: await runs(page), pocket: await shown(page, TERMINAL.pocket) }),
  'mobile/pocket-long-command': async (page) => ({ length: await lineLength(page), runs: await runs(page) }),
  'mobile/pocket-vim-search': searched,
  'mobile/pocket-vim-help': vim,
};

const TERMINAL_EXPECTED: Record<string, unknown> = {
  'desktop/terminal-open': { window: true, runs: 0, focused: 'terminal' },
  'desktop/terminal-help': { run: 'help', help: true },
  'desktop/terminal-vim': { vim: true, help: false },
  'desktop/terminal-vim-search': { vim: true, matches: true },
  'desktop/terminal-vim-help': { vim: true, help: true },
  'desktop/terminal-unknown': { run: 'wrok', suggestions: true },
  'desktop/terminal-ls': { run: 'ls', names: true },
  'desktop/terminal-cat': { run: true, runs: 3 },
  'desktop/terminal-clear': { runs: 0, line: true },
  'desktop/terminal-long-command': { length: 500, runs: 0 },
  'desktop/terminal-minimized': { window: false, dock: true },
  'desktop/terminal-maximized': { maximized: 1, runs: 1 },
  'desktop/terminal-two-windows': { windows: 2, focused: 'terminal' },
  'desktop/terminal-specs': { run: 'specs', specs: true },
  'desktop/terminal-menu': { menu: true, expanded: 'true' },
  'mobile/pocket': { app: true, pocket: true },
  'mobile/pocket-landscape': { pocket: true, size: { width: 812, height: 375 } },
  'mobile/pocket-keyboard': { keyboard: 1, size: { width: 375, height: 512 } },
  'mobile/pocket-vim': { vim: true, help: false },
  'mobile/pocket-help': { run: 'help', help: true },
  'mobile/pocket-unknown': { run: 'wrok', suggestions: true },
  'mobile/pocket-ls': { run: 'ls', names: true },
  'mobile/pocket-cat': { run: true, runs: 3 },
  'mobile/pocket-clear': { runs: 0, pocket: true },
  'mobile/pocket-long-command': { length: 500, runs: 0 },
  'mobile/pocket-vim-search': { vim: true, matches: true },
  'mobile/pocket-vim-help': { vim: true, help: true },
};

// What each state's page shows, as a visitor would see it.
const SHOWS: Record<string, (page: Page) => Promise<unknown>> = {
  'desktop/first-load': async (page) => ({ cv: await shown(page, SHELL.cvWindow), windows: await count(page, '#os .window'), focused: await page.getAttribute('#os .window[aria-current="true"]', 'data-view') }),
  'desktop/no-window': async (page) => ({ windows: await count(page, '#os .window') }),
  'desktop/about': async (page) => ({ about: await shown(page, SHELL.aboutWindow), windows: await count(page, '#os .window') }),
  'desktop/two-windows': async (page) => ({ windows: await count(page, '#os .window'), focused: await page.getAttribute('#os .window[aria-current="true"]', 'data-view') }),
  'desktop/site-menu': async (page) => ({ menu: await shown(page, SHELL.siteMenu), expanded: await page.getAttribute(SHELL.siteMenuTitle, 'aria-expanded') }),
  'desktop/window-menu': async (page) => ({ menu: await shown(page, SHELL.windowMenu), expanded: await page.getAttribute(SHELL.windowMenuTitle, 'aria-expanded') }),
  'desktop/minimized': async (page) => ({ cv: await shown(page, SHELL.cvWindow), dock: await shown(page, SHELL.cvDockItem) }),
  'desktop/maximized': async (page) => ({ maximized: await count(page, `${SHELL.cvWindow}[data-maximized]`) }),
  'desktop/keyboard-move': async (page) => ({ pad: await shown(page, SHELL.pad), label: await page.getAttribute(SHELL.pad, 'aria-label') }),
  'desktop/keyboard-resize': async (page) => ({ pad: await shown(page, SHELL.pad), label: await page.getAttribute(SHELL.pad, 'aria-label') }),
  'mobile/home': async (page) => ({ icon: await shown(page, SHELL.cvIcon), apps: await count(page, '#os .full-screen') }),
  'mobile/home-landscape': async (page) => ({ icon: await shown(page, SHELL.cvIcon), apps: await count(page, '#os .full-screen'), size: page.viewportSize() }),
  'mobile/cv-app': async (page) => ({ app: await shown(page, SHELL.cvFullScreen), cv: await shown(page, `${SHELL.cvFullScreen} .cv`) }),
  'mobile/about': async (page) => ({ app: await shown(page, SHELL.aboutFullScreen) }),
  ...TERMINAL_SHOWS,
};

const EXPECTED: Record<string, unknown> = {
  'desktop/first-load': { cv: true, windows: 1, focused: 'cv' },
  'desktop/no-window': { windows: 0 },
  'desktop/about': { about: true, windows: 1 },
  'desktop/two-windows': { windows: 2, focused: 'about' },
  'desktop/site-menu': { menu: true, expanded: 'true' },
  'desktop/window-menu': { menu: true, expanded: 'true' },
  'desktop/minimized': { cv: false, dock: true },
  'desktop/maximized': { maximized: 1 },
  'desktop/keyboard-move': { pad: true, label: expect.stringMatching(/^Moving /) },
  'desktop/keyboard-resize': { pad: true, label: expect.stringMatching(/^Resizing /) },
  'mobile/home': { icon: true, apps: 0 },
  'mobile/home-landscape': { icon: true, apps: 0, size: { width: 812, height: 375 } },
  'mobile/cv-app': { app: true, cv: true },
  'mobile/about': { app: true },
  ...TERMINAL_EXPECTED,
};

describe('005-os-shell-FR-048: the checks measure the root in every shell state', () => {
  test("the driver lists data-model.md's states at their sizes, and names each variant", () => {
    expect(SHELL_STATES.filter((state) => !TERMINAL_STATES.includes(state)).map(({ shell, state, width, height }) => `${stateVariant(shell, state, width)} ${height}`)).toEqual([
      'desktop/first-load/1440px 900',
      'desktop/no-window/1440px 900',
      'desktop/about/1440px 900',
      'desktop/two-windows/1440px 900',
      'desktop/site-menu/1440px 900',
      'desktop/window-menu/1440px 900',
      'desktop/minimized/1440px 900',
      'desktop/maximized/1440px 900',
      'desktop/keyboard-move/1440px 900',
      'desktop/keyboard-resize/1440px 900',
      'mobile/home/375px 812',
      'mobile/home-landscape/812px 375',
      'mobile/cv-app/375px 812',
      'mobile/about/375px 812',
    ]);
  });

  test.each(SHELL_STATES.map((state) => [`${state.shell}/${state.state}`, state] as [string, ShellState]))('on the real build, a fresh page reaches %s by real input, and shows it', async (name, state) => {
    const root = realSiteProject();
    const server = await startServer({ siteDir: `${root}/${SITE_DIR}`, manifest: readManifest(root) });
    onTestFinished(() => server.close());
    const context = await browser.newContext({ serviceWorkers: 'block', ...shellContext(state) });
    onTestFinished(() => context.close());
    const page = await context.newPage();
    await page.goto(`${server.url}/`, { waitUntil: 'load' });
    await waitForShell(page);
    await reachState(page, state);
    expect(await SHOWS[name]!(page)).toEqual(EXPECTED[name]);
  });

  test('a state of the other shell is not reached, and the error names the variant', async () => {
    const root = realSiteProject();
    const server = await startServer({ siteDir: `${root}/${SITE_DIR}`, manifest: readManifest(root) });
    onTestFinished(() => server.close());
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 375, height: 812 } });
    onTestFinished(() => context.close());
    const page = await context.newPage();
    await page.goto(`${server.url}/`, { waitUntil: 'load' });
    await waitForShell(page);
    await expect(reachState(page, SHELL_STATES[0]!)).rejects.toThrow('could not reach desktop/first-load/1440px: the page shows the mobile shell');
  });
});

describe("006-terminal-FR-038: the checks measure the Terminal in every state of contracts/cli.md", () => {
  test('the driver lists 15 desktop states at 1440 × 900 and 12 mobile states at 375 × 812, the pocket on its side at 812 × 375', () => {
    expect(TERMINAL_STATES.map(({ shell, state, width, height }) => `${stateVariant(shell, state, width)} ${height}`)).toEqual([
      ...[
        'terminal-open',
        'terminal-help',
        'terminal-vim',
        'terminal-vim-search',
        'terminal-vim-help',
        'terminal-unknown',
        'terminal-ls',
        'terminal-cat',
        'terminal-clear',
        'terminal-long-command',
        'terminal-minimized',
        'terminal-maximized',
        'terminal-two-windows',
        'terminal-specs',
        'terminal-menu',
      ].map((state) => `desktop/${state}/1440px 900`),
      'mobile/pocket/375px 812',
      'mobile/pocket-landscape/812px 375',
      ...['pocket-keyboard', 'pocket-vim', 'pocket-help', 'pocket-unknown', 'pocket-ls', 'pocket-cat', 'pocket-clear', 'pocket-long-command', 'pocket-vim-search', 'pocket-vim-help'].map((state) => `mobile/${state}/375px 812`),
    ]);
  });

  test('the summary lists / under accessibility in every Terminal state at both widths, with no problem', async () => {
    const report = await runCheck(realSiteProject(), { parts: ['accessibility'] });
    const variants = report.results.filter((result) => result.page === '/').map((result) => result.variant);
    expect(variants).toEqual(expect.arrayContaining(TERMINAL_STATES.map(({ shell, state, width }) => stateVariant(shell, state, width))));
    expect(report.problems).toEqual([]);
    const summary = renderReport(report);
    for (const { shell, state, width } of TERMINAL_STATES) expect(summary).toContain(stateVariant(shell, state, width));
  });
});

describe('005-os-shell-FR-056: the checks cover the root in both shells', () => {
  test('the report lists / under accessibility in every desktop state at 1440px and every mobile state, and under other-sites with the CV app open', async () => {
    const report = await runCheck(realSiteProject(), { parts: ['accessibility', 'other-sites'] });
    const variants = (part: string) => report.results.filter((result) => result.part === part && result.page === '/').map((result) => result.variant);
    expect(variants('accessibility')).toEqual(SHELL_STATES.map(({ shell, state, width }) => stateVariant(shell, state, width)));
    expect(variants('other-sites')).toEqual(['desktop/cv-app/1440px', 'mobile/cv-app/375px', 'desktop/terminal-open/1440px', 'mobile/pocket/375px']);
    expect(report.problems).toEqual([]);
    expect(report.pages.find((page) => page.path === '/')).toEqual({ path: '/', status: 200, notFound: false });
  });

  test.skipIf(process.env.CI)('the report lists / under lighthouse on both profiles', { timeout: 600_000 }, async () => {
    const report = await runCheck(realSiteProject(), { parts: ['lighthouse'] });
    expect(report.results.filter((result) => result.page === '/').map((result) => result.variant)).toEqual(['mobile', 'desktop']);
  });
});
