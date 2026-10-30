// Going back (FR-003, contracts/inspector.md The spec view and The app's
// menu): "Back to [view]" and the menu's same command bring the app back
// exactly as it was, and "Show specs" works again afterwards.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { fill, siteText } from '../../src/site-text.ts';
import { leaveSpecs, openView, scrollerSelector, showSpecs, specViewSelector, viewSelector, waitForSpecView } from '../helpers/inspector.ts';
import type { InspectorShell } from '../helpers/inspector.ts';
import { openShell, settle } from '../helpers/shell.ts';
import { COMMAND_LINE, openTerminal, openVimView, runGroup, SHELL_PAGE, typedLines, vimView } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 180_000 });

const SHELLS: readonly InspectorShell[] = ['desktop', 'mobile'];
const text = siteText.inspector;

const scrollTop = (page: Page, shell: InspectorShell) => page.locator(scrollerSelector('cv', shell)).evaluate((element) => element.scrollTop);

// The menu's labels, while it is open.
const menuItems = (page: Page) =>
  page.locator('#menu-app [role^="menuitem"]').evaluateAll((list) => list.map((item) => (item.querySelector('.label')?.textContent ?? '').trim()));

// What a visitor sees of the Terminal's output: every run's text, in order.
const outputText = (page: Page) =>
  page.locator('.terminal section.run').evaluateAll((runs) => runs.map((run) => (run as HTMLElement).innerText.replace(/\s+/g, ' ').trim()));

// The vim view as a visitor sees it: the cursor, each fold and whether it is
// open, and the message line.
const vimState = (page: Page) =>
  page.evaluate(() => {
    const view = document.querySelector('.terminal section.vim')!;
    const words = (element: Element | null) => (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
    return {
      cursor: words(view.querySelector('.vim-position')),
      folds: [...view.querySelectorAll('button.vim-fold')].map((fold) => `${words(fold)} ${fold.getAttribute('aria-expanded')}`),
      message: words(view.querySelector('.vim-message')),
      text: (view.querySelector('.vim-text') as HTMLElement | null)?.innerText ?? '',
    };
  });

describe('007-requirement-inspector-FR-003: Back brings the CV back at the same scroll position (SC-011)', () => {
  for (const shell of SHELLS) {
    test(`${shell}: the CV scrolled to 1,200 px is at 1,200 px after Back`, async () => {
      const page = await openShell(SHELL_PAGE[shell]);
      await openView(page, 'cv', shell);
      await page.locator(scrollerSelector('cv', shell)).evaluate((element) => element.scrollTo(0, 1200));
      await expect.poll(() => scrollTop(page, shell)).toBe(1200);
      await showSpecs(page, 'cv', shell);
      expect((await page.locator(`${specViewSelector('cv')} button.spec-back`).innerText()).trim()).toBe(fill(text.back, { view: 'CV' }));
      await leaveSpecs(page, 'cv', shell);
      expect(await page.locator(`${viewSelector('cv', shell)} .cv h1`).isVisible()).toBe(true);
      expect(await scrollTop(page, shell)).toBe(1200);
    });
  }
});

describe('007-requirement-inspector-FR-003: Back brings the Terminal back as it was (SC-011)', () => {
  test('after help, ls and a draft, the output, the draft and the history by Up are the same after Back', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await openTerminal(page, 'desktop');
    await runGroup(page, 'help');
    await runGroup(page, 'ls');
    const input = page.locator(COMMAND_LINE);
    await input.focus();
    // Up recalls ls; Down goes back to the empty line, then `hel` is typed.
    await page.keyboard.press('ArrowUp');
    expect(await input.inputValue()).toBe('ls');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.type('hel');
    const before = { output: await outputText(page), lines: await typedLines(page), draft: await input.inputValue() };
    expect(before.draft).toBe('hel');

    await showSpecs(page, 'terminal', 'desktop');
    expect(await page.locator(COMMAND_LINE).count()).toBe(0);
    await leaveSpecs(page, 'terminal', 'desktop');

    await page.waitForSelector(COMMAND_LINE, { state: 'visible' });
    expect(await outputText(page)).toEqual(before.output);
    expect(await typedLines(page)).toEqual(before.lines);
    expect(await input.inputValue()).toBe('hel');
    await input.focus();
    await page.keyboard.press('ArrowUp');
    expect(await input.inputValue()).toBe('ls');
    await page.keyboard.press('ArrowUp');
    expect(await input.inputValue()).toBe('help');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    expect(await input.inputValue()).toBe('hel');
  });

  test('an open vim view with a fold toggled is the same after Back', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await openTerminal(page, 'desktop');
    await openVimView(page);
    // Down a line, then za toggles the fold there.
    await page.locator('.terminal section.vim .vim-text').focus();
    await page.keyboard.press('j');
    await page.keyboard.press('z');
    await page.keyboard.press('a');
    await settle(page);
    const before = await vimState(page);
    expect(before.folds.some((fold) => fold.endsWith('true'))).toBe(true);

    await showSpecs(page, 'terminal', 'desktop');
    expect(await vimView(page).count()).toBe(0);
    await leaveSpecs(page, 'terminal', 'desktop');

    await vimView(page).waitFor();
    await settle(page);
    expect(await vimState(page)).toEqual(before);
  });
});

describe('007-requirement-inspector-FR-003: the menu holds Back to CV while the specs show', () => {
  test('the CV menu reads Back to CV in place of Show specs, and choosing it goes back', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await showSpecs(page, 'cv', 'desktop');
    await page.click('#menu-title-app');
    const items = await menuItems(page);
    expect(items).toContain(fill(text.back, { view: 'CV' }));
    expect(items).not.toContain(text.show);
    expect(items.indexOf(fill(text.back, { view: 'CV' }))).toBe(items.indexOf('Move…') - 1);
    await page.locator('#menu-app').getByRole('menuitem', { name: fill(text.back, { view: 'CV' }), exact: true }).click();
    await page.waitForSelector(specViewSelector('cv'), { state: 'detached' });
    await settle(page);
    expect(await page.locator(`${viewSelector('cv', 'desktop')} .cv h1`).isVisible()).toBe(true);
    await page.click('#menu-title-app');
    expect(await menuItems(page)).toContain(text.show);
  });
});

describe('007-requirement-inspector-FR-003: "Show specs" shows the specs again after Back', () => {
  for (const shell of SHELLS) {
    test(`${shell}: Show specs, Back, then Show specs again`, async () => {
      const page = await openShell(SHELL_PAGE[shell]);
      await showSpecs(page, 'cv', shell);
      expect(await page.locator(`${viewSelector('cv', shell)} button.show-specs`).count()).toBe(0);
      await leaveSpecs(page, 'cv', shell);
      const control = page.locator(`${viewSelector('cv', shell)} button.show-specs`);
      expect(await control.isVisible()).toBe(true);
      if (shell === 'desktop') await control.click();
      else await control.tap();
      await waitForSpecView(page, 'cv');
      expect(await page.locator(`${specViewSelector('cv')} section.spec-group`).count()).toBeGreaterThan(0);
    });
  }
});

describe('007-requirement-inspector-FR-003: the browser\'s Back on a phone goes home from the specs, as from the app', () => {
  test('Back while the CV shows its specs goes home, and opening the CV again shows the specs', async () => {
    const page = await openShell(SHELL_PAGE.mobile);
    // Start on an empty page, so a Back that left the site would land there.
    const url = page.url();
    await page.goto('about:blank');
    await page.goto(url);
    await page.waitForSelector('#os[data-ready]', { state: 'attached' });
    await showSpecs(page, 'cv', 'mobile');
    await page.goBack();
    await expect.poll(() => page.locator('#os .full-screen').count()).toBe(0);
    expect(new URL(page.url()).pathname).toBe('/');
    expect(await page.locator('#os .home').isVisible()).toBe(true);
    await page.locator('#os .home .app-icon[data-view="cv"]').tap();
    await page.waitForSelector(`${viewSelector('cv', 'mobile')} section.spec-view`, { state: 'visible' });
    expect(await page.locator(`${specViewSelector('cv')} section.spec-group`).count()).toBeGreaterThan(0);
  });
});
