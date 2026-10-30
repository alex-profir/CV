// The state driver on the real build (005 research R17), and the root's
// runs in the report (005 contracts/cli.md).
import type { Browser, Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, onTestFinished, test, vi } from 'vitest';
import { launchChromium } from '../src/browser.ts';
import { SITE_DIR, readManifest, runCheck } from '../src/check.ts';
import { ENDLESS_LINE, INSPECTOR, INSPECTOR_SHELL_STATES, PLAYGROUND, PLAYGROUND_SHELL_STATES, SHELL, SHELL_STATES, TERMINAL, TERMINAL_STATES, playgroundRunning, reachState, shellContext, stateVariant, waitForShell } from '../src/shell-states.ts';
import type { ShellState } from '../src/shell-states.ts';
import { renderProblem, renderReport } from '../src/report.ts';
import { startServer } from '../src/server.ts';
import { realSiteProject } from './helpers/root.ts';
import { siteText } from '../../../packages/web/src/site-text.ts';

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

// The amendment's states (2026-10-29): the shell's state, the cursor, a
// stopped line and the page's selection.
const shellState = (page: Page) => page.getAttribute('#os .terminal', 'data-shell-state');

const lineFocused = (page: Page) => page.locator(TERMINAL.commandLine).evaluate((input) => input === document.activeElement);

const stoppedRun = async (page: Page) => ({ run: await lastRun(page), stopped: await page.locator(TERMINAL.run).last().locator(TERMINAL.stopped).textContent(), state: await shellState(page) });

// Whether the help's standard group is in the screen's view.
const standardInView = (page: Page) =>
  page.evaluate(([screen, group]) => {
    const view = document.querySelector(screen)!.getBoundingClientRect();
    const box = document.querySelector(`${screen} ${group}`)?.getBoundingClientRect();
    return box !== undefined && box.top < view.bottom && box.bottom > view.top;
  }, [TERMINAL.screen, TERMINAL.standard] as const);

const selection = (page: Page) =>
  page.evaluate((screen) => {
    const chosen = document.getSelection()!;
    const view = document.querySelector(screen)!;
    return { inside: !chosen.isCollapsed && view.contains(chosen.anchorNode) && view.contains(chosen.focusNode), text: chosen.toString() };
  }, TERMINAL.screen);

const STOPPED = expect.stringMatching(/^stopped: it /);

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
  'desktop/terminal-unfocused': async (page) => ({ run: await lastRun(page), focused: await lineFocused(page), filled: await count(page, `${TERMINAL.cursorMirror}[data-focused]`) }),
  'desktop/terminal-help-standard': async (page) => ({ run: await lastRun(page), heading: await page.locator(`${TERMINAL.run} p.out-standard-heading`).count(), inView: await standardInView(page) }),
  'desktop/terminal-loading': async (page) => ({ state: await shellState(page), waiting: await shown(page, TERMINAL.shellLoading), busy: await count(page, TERMINAL.busyRun), run: await lastRun(page) }),
  'desktop/terminal-load-failed': async (page) => ({ state: await shellState(page), failed: await page.locator(TERMINAL.shellFailed).textContent() }),
  'desktop/terminal-stopped': stoppedRun,
  'desktop/terminal-selected-all': async (page) => {
    const { inside, text } = await selection(page);
    return { inside, help: text.includes('help'), focused: await lineFocused(page) };
  },
  'mobile/pocket-stopped': stoppedRun,
  'desktop/terminal-tab-list': async (page) => ({ list: await shown(page, TERMINAL.completionList), line: await page.locator(TERMINAL.commandLine).inputValue() }),
  'desktop/terminal-vim-insert': async (page) => ({ mode: await page.locator(`${TERMINAL.vim} .vim-mode`).textContent(), focused: await page.locator(TERMINAL.vimInsert).evaluate((area) => area === document.activeElement) }),
  'desktop/terminal-vim-readonly': async (page) => ({ marks: (await page.locator(`${TERMINAL.vim} :is(.vim-ro, .vim-modified)`).allTextContents()).join(' '), message: (await page.locator(TERMINAL.vimMessage).textContent())?.slice(0, 3) }),
  'mobile/pocket-tab-key': async (page) => ({ list: await shown(page, TERMINAL.completionList), key: await page.locator(`${TERMINAL.pocketStrip} button`).textContent() }),
  'mobile/pocket-vim-insert': async (page) => ({ mode: await page.locator(`${TERMINAL.vim} .vim-mode`).textContent(), key: await page.locator(`${TERMINAL.pocketStrip} button`).textContent() }),
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
  'desktop/terminal-unfocused': { run: 'help', focused: false, filled: 0 },
  'desktop/terminal-help-standard': { run: 'help', heading: 1, inView: true },
  'desktop/terminal-loading': { state: 'loading', waiting: true, busy: 1, run: 'help' },
  'desktop/terminal-load-failed': { state: 'failed', failed: `${siteText.terminal.shellFailed} ${siteText.terminal.tryAgain}` },
  'desktop/terminal-stopped': { run: ENDLESS_LINE, stopped: STOPPED, state: 'ready' },
  'desktop/terminal-selected-all': { inside: true, help: true, focused: true },
  'mobile/pocket-stopped': { run: ENDLESS_LINE, stopped: STOPPED, state: 'ready' },
  'desktop/terminal-tab-list': { list: true, line: 'cat ~/' },
  'desktop/terminal-vim-insert': { mode: '-- INSERT --', focused: true },
  'desktop/terminal-vim-readonly': { marks: '[RO] [+]', message: 'E45' },
  'mobile/pocket-tab-key': { list: true, key: 'Tab' },
  'mobile/pocket-vim-insert': { mode: '-- INSERT --', key: 'Esc' },
};

// The inspector's states (007 contracts/cli.md States): which spec view
// shows, with its groups, and what else the state sets.
const specs = async (page: Page, view: 'cv' | 'terminal' | 'about') => ({ view: await shown(page, INSPECTOR.specView(view)), groups: (await count(page, INSPECTOR.groups(view))) > 0 });

const cvWidth = (page: Page) => page.evaluate((selector) => document.querySelector(selector)?.getBoundingClientRect().width ?? 0, SHELL.cvWindow);

const INSPECTOR_SHOWS: Record<string, (page: Page) => Promise<unknown>> = {
  'desktop/cv-specs': (page) => specs(page, 'cv'),
  'desktop/cv-specs-whats-this': async (page) => ({ ...(await specs(page, 'cv')), expanded: await page.getAttribute(INSPECTOR.whatsThis('cv'), 'aria-expanded') }),
  'desktop/terminal-app-specs': async (page) => ({ ...(await specs(page, 'terminal')), focused: await page.getAttribute('#os .window[aria-current="true"]', 'data-view') }),
  'desktop/terminal-app-specs-beside-cv': async (page) => ({ ...(await specs(page, 'terminal')), focused: await page.getAttribute('#os .window[aria-current="true"]', 'data-view'), cv: await shown(page, `${SHELL.cvWindow} .cv`) }),
  'desktop/about-specs': (page) => specs(page, 'about'),
  'desktop/cv-specs-narrow': async (page) => ({ ...(await specs(page, 'cv')), narrow: (await cvWidth(page)) <= 400 }),
  'mobile/cv-specs': (page) => specs(page, 'cv'),
  'mobile/cv-specs-whats-this': async (page) => ({ ...(await specs(page, 'cv')), expanded: await page.getAttribute(INSPECTOR.whatsThis('cv'), 'aria-expanded') }),
  'mobile/terminal-app-specs': (page) => specs(page, 'terminal'),
  'mobile/about-specs': (page) => specs(page, 'about'),
  'mobile/cv-specs-320': async (page) => ({ ...(await specs(page, 'cv')), size: page.viewportSize() }),
  'mobile/cv-specs-landscape': async (page) => ({ ...(await specs(page, 'cv')), size: page.viewportSize() }),
};

const SPECS = { view: true, groups: true };

const INSPECTOR_EXPECTED: Record<string, unknown> = {
  'desktop/cv-specs': SPECS,
  'desktop/cv-specs-whats-this': { ...SPECS, expanded: 'true' },
  'desktop/terminal-app-specs': { ...SPECS, focused: 'terminal' },
  'desktop/terminal-app-specs-beside-cv': { ...SPECS, focused: 'cv', cv: true },
  'desktop/about-specs': SPECS,
  'desktop/cv-specs-narrow': { ...SPECS, narrow: true },
  'mobile/cv-specs': SPECS,
  'mobile/cv-specs-whats-this': { ...SPECS, expanded: 'true' },
  'mobile/terminal-app-specs': SPECS,
  'mobile/about-specs': SPECS,
  'mobile/cv-specs-320': { ...SPECS, size: { width: 320, height: 568 } },
  'mobile/cv-specs-landscape': { ...SPECS, size: { width: 812, height: 375 } },
};

// What each state's page shows, as a visitor would see it.
// The Playground's states (008 contracts/cli.md States): the element each
// shows, and whether a run is going on.
const PLAYGROUND_SHOWN: Record<string, string> = {
  'desktop/playground-downloading': PLAYGROUND.loading,
  'desktop/playground-offline': PLAYGROUND.retry,
  'desktop/playground-ready': `${PLAYGROUND.editor} .monaco-editor`,
  'desktop/playground-errors': `${PLAYGROUND.root} li > button.error`,
  'desktop/playground-hover': `${PLAYGROUND.editor} .monaco-hover:not(.hidden)`,
  'desktop/playground-suggestions': `${PLAYGROUND.editor} .suggest-widget.visible`,
  'desktop/playground-peek': `${PLAYGROUND.editor} .peekview-widget`,
  'desktop/playground-rename': `${PLAYGROUND.editor} .rename-box input`,
  'desktop/playground-quick-fixes': '.action-widget',
  'desktop/playground-palette': `${PLAYGROUND.editor} .quick-input-widget`,
  'desktop/playground-menu': SHELL.appMenu,
  'desktop/playground-options': `${PLAYGROUND.root} section.options-panel`,
  'desktop/playground-examples': `${PLAYGROUND.root} section.examples-panel`,
  'desktop/playground-running': `${PLAYGROUND.editor} .monaco-editor`,
  'desktop/playground-stuck': PLAYGROUND.popup,
  'desktop/playground-shared': PLAYGROUND.message,
  'desktop/playground-too-long': `${PLAYGROUND.message}[data-kind="warn"]`,
  'desktop/playground-broken-link': `${PLAYGROUND.message}[data-kind="error"]`,
  'desktop/playground-shared-opened': PLAYGROUND.message,
  'desktop/playground-reset': PLAYGROUND.popup,
  'desktop/playground-specs': '#os section.spec-view[data-view="playground"]',
  'desktop/playground-narrow': `${PLAYGROUND.editor} .monaco-editor`,
  'mobile/playground-best-on-desktop': PLAYGROUND.phoneScreen,
  'mobile/playground-shared-link': PLAYGROUND.phoneScreen,
  'mobile/playground-best-on-desktop-320': PLAYGROUND.phoneScreen,
  'mobile/playground-best-on-desktop-landscape': PLAYGROUND.phoneScreen,
};

const PLAYGROUND_SHOWS: Record<string, (page: Page) => Promise<unknown>> = Object.fromEntries(
  Object.entries(PLAYGROUND_SHOWN).map(([name, selector]) => [
    name,
    async (page: Page) => ({
      shown: await shown(page, selector),
      running: name.startsWith('desktop/') && (await count(page, `${PLAYGROUND.toolbar} button.stop`)) > 0 ? await playgroundRunning(page) : false,
      width: name === 'desktop/playground-narrow' ? Math.round((await page.locator(PLAYGROUND.window).boundingBox())!.width) : null,
    }),
  ]),
);

const PLAYGROUND_EXPECTED: Record<string, unknown> = Object.fromEntries(
  Object.keys(PLAYGROUND_SHOWN).map((name) => [name, { shown: true, running: name === 'desktop/playground-running' || name === 'desktop/playground-stuck', width: name === 'desktop/playground-narrow' ? 600 : null }]),
);

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
  ...INSPECTOR_SHOWS,
  ...PLAYGROUND_SHOWS,
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
  ...INSPECTOR_EXPECTED,
  ...PLAYGROUND_EXPECTED,
};

describe('005-os-shell-FR-048: the checks measure the root in every shell state', () => {
  test("the driver lists data-model.md's states at their sizes, and names each variant", () => {
    expect(SHELL_STATES.filter((state) => !TERMINAL_STATES.includes(state) && !INSPECTOR_SHELL_STATES.includes(state) && !PLAYGROUND_SHELL_STATES.includes(state)).map(({ shell, state, width, height }) => `${stateVariant(shell, state, width)} ${height}`)).toEqual([
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

// The states contracts/cli.md adds on 2026-10-29.
const AMENDMENT_STATES = [
  'desktop/terminal-tab-list/1440px',
  'desktop/terminal-vim-insert/1440px',
  'desktop/terminal-vim-readonly/1440px',
  'mobile/pocket-tab-key/375px',
  'mobile/pocket-vim-insert/375px',
  'desktop/terminal-unfocused/1440px',
  'desktop/terminal-help-standard/1440px',
  'desktop/terminal-loading/1440px',
  'desktop/terminal-load-failed/1440px',
  'desktop/terminal-stopped/1440px',
  'desktop/terminal-selected-all/1440px',
  'mobile/pocket-stopped/375px',
];

describe("006-terminal-FR-038: the checks measure the Terminal in every state of contracts/cli.md", () => {
  test('the driver lists 24 desktop states at 1440 × 900 and 15 mobile states at 375 × 812, the pocket on its side at 812 × 375', () => {
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
        'terminal-unfocused',
        'terminal-help-standard',
        'terminal-loading',
        'terminal-load-failed',
        'terminal-stopped',
        'terminal-selected-all',
        'terminal-tab-list',
        'terminal-vim-insert',
        'terminal-vim-readonly',
      ].map((state) => `desktop/${state}/1440px 900`),
      'mobile/pocket/375px 812',
      'mobile/pocket-landscape/812px 375',
      ...['pocket-keyboard', 'pocket-vim', 'pocket-help', 'pocket-unknown', 'pocket-ls', 'pocket-cat', 'pocket-clear', 'pocket-long-command', 'pocket-vim-search', 'pocket-vim-help', 'pocket-stopped', 'pocket-tab-key', 'pocket-vim-insert'].map(
        (state) => `mobile/${state}/375px 812`,
      ),
    ]);
  });

  test('the summary lists / under accessibility in every Terminal state at both widths, with no problem', async () => {
    const report = await runCheck(realSiteProject(), { parts: ['accessibility'] });
    const variants = report.results.filter((result) => result.page === '/').map((result) => result.variant);
    expect(variants).toEqual(expect.arrayContaining(TERMINAL_STATES.map(({ shell, state, width }) => stateVariant(shell, state, width))));
    expect(report.problems).toEqual([]);
    const summary = renderReport(report);
    for (const { shell, state, width } of TERMINAL_STATES) expect(summary).toContain(stateVariant(shell, state, width));
    // The amendment's states (2026-10-29), each measured on `/`.
    expect(variants).toEqual(expect.arrayContaining(AMENDMENT_STATES));
    const line = summary.split('\n').find((text) => text.startsWith('  accessibility '))!;
    for (const variant of AMENDMENT_STATES) expect(line).toContain(`/ ${variant}`);
  });
});

describe('005-os-shell-FR-056: the checks cover the root in both shells', () => {
  test('the report lists / under accessibility in every desktop state at 1440px and every mobile state, and under other-sites with the CV app open', async () => {
    const report = await runCheck(realSiteProject(), { parts: ['accessibility', 'other-sites'] });
    const variants = (part: string) => report.results.filter((result) => result.part === part && result.page === '/').map((result) => result.variant);
    expect(variants('accessibility')).toEqual(SHELL_STATES.map(({ shell, state, width }) => stateVariant(shell, state, width)));
    expect(variants('other-sites')).toEqual([
      'desktop/cv-app/1440px',
      'mobile/cv-app/375px',
      'desktop/terminal-open/1440px',
      'mobile/pocket/375px',
      ...['desktop/%s-specs/1440px', 'mobile/%s-specs/375px'].flatMap((form) => ['cv', 'terminal', 'about'].map((view) => form.replace('%s', view))),
    ]);
    expect(report.problems).toEqual([]);
    expect(report.pages.find((page) => page.path === '/')).toEqual({ path: '/', status: 200, notFound: false });
  });

  test.skipIf(process.env.CI)('the report lists / under lighthouse on both profiles', { timeout: 600_000 }, async () => {
    const report = await runCheck(realSiteProject(), { parts: ['lighthouse'] });
    expect(report.results.filter((result) => result.page === '/').map((result) => result.variant)).toEqual(['mobile', 'desktop']);
  });
});

describe("007-requirement-inspector-FR-031: the checks measure the inspector in every state of contracts/cli.md", () => {
  test('the driver lists six desktop states at 1440 × 900 and six mobile states, at 320 × 568 and 812 × 375 where named', () => {
    expect(INSPECTOR_SHELL_STATES.map(({ shell, state, width, height }) => `${stateVariant(shell, state, width)} ${height}`)).toEqual([
      ...['cv-specs', 'cv-specs-whats-this', 'terminal-app-specs', 'terminal-app-specs-beside-cv', 'about-specs', 'cv-specs-narrow'].map((state) => `desktop/${state}/1440px 900`),
      ...['cv-specs', 'cv-specs-whats-this', 'terminal-app-specs', 'about-specs'].map((state) => `mobile/${state}/375px 812`),
      'mobile/cv-specs-320/320px 568',
      'mobile/cv-specs-landscape/812px 375',
    ]);
  });

  test('the summary lists / under accessibility and modes in every inspector state, and under fonts and layout at both widths, with no problem', { timeout: 900_000 }, async () => {
    const report = await runCheck(realSiteProject(), { parts: ['accessibility', 'fonts', 'layout', 'modes'] });
    const variants = (part: string) => report.results.filter((result) => result.part === part && result.page === '/').map((result) => result.variant);
    const states = INSPECTOR_SHELL_STATES.map(({ shell, state, width }) => stateVariant(shell, state, width));
    expect(variants('accessibility')).toEqual(expect.arrayContaining(states));
    expect(variants('modes')).toEqual(expect.arrayContaining(states));
    expect(variants('fonts')).toEqual(expect.arrayContaining(['desktop/cv-specs/1440px', 'mobile/about-specs/375px']));
    expect(variants('layout')).toEqual(
      expect.arrayContaining([
        'desktop/cv-specs-narrow/1440px',
        'mobile/cv-specs-320/320px',
        'mobile/cv-specs-landscape/812px',
        ...['cv-specs', 'terminal-app-specs', 'about-specs'].flatMap((state) => [`mobile/${state}-200%-zoom/640px`, `mobile/${state}-400%-zoom/320px`, `desktop/${state}-text-spacing/1440px`, `mobile/${state}-text-spacing/375px`]),
      ]),
    );
    expect(report.problems.map(renderProblem)).toEqual([]);
    const summary = renderReport(report);
    for (const variant of states) expect(summary).toContain(variant);
  });
});

describe('008-typescript-playground-FR-076: the checks measure the Playground in every state of contracts/cli.md', () => {
  test('the driver lists 22 desktop states at 1440 × 900 and four mobile states, at 320 × 568 and 812 × 375 where named', () => {
    expect(PLAYGROUND_SHELL_STATES.map(({ shell, state, width, height }) => `${stateVariant(shell, state, width)} ${height}`)).toEqual([
      ...Object.keys(PLAYGROUND_SHOWN)
        .filter((name) => name.startsWith('desktop/'))
        .map((name) => `${name}/1440px 900`),
      'mobile/playground-best-on-desktop/375px 812',
      'mobile/playground-shared-link/375px 812',
      'mobile/playground-best-on-desktop-320/320px 568',
      'mobile/playground-best-on-desktop-landscape/812px 375',
    ]);
  });

  test('the summary lists / under accessibility in every Playground state, with no problem', { timeout: 1_800_000 }, async () => {
    const report = await runCheck(realSiteProject(), { parts: ['accessibility'] });
    const states = PLAYGROUND_SHELL_STATES.map(({ shell, state, width }) => stateVariant(shell, state, width));
    expect(report.results.filter((result) => result.part === 'accessibility' && result.page === '/').map((result) => result.variant)).toEqual(expect.arrayContaining(states));
    expect(report.problems.map(renderProblem)).toEqual([]);
    const summary = renderReport(report);
    for (const variant of states) expect(summary).toContain(variant);
  });
});
