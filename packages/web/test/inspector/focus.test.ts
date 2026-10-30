// Where focus goes (FR-017, contracts/inspector.md Keyboard and focus):
// to the spec view's heading on "Show specs", back to "Show specs" on Back,
// by control or menu, and nowhere else when "What's this?" opens or closes.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { fill, siteText } from '../../src/site-text.ts';
import { axNodes } from '../helpers/ax.ts';
import { openView, specViewSelector, viewSelector, waitForSpecView } from '../helpers/inspector.ts';
import type { InspectorShell, InspectorView } from '../helpers/inspector.ts';
import { openShell, settle } from '../helpers/shell.ts';
import { COMMAND_LINE, SHELL_PAGE } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 180_000 });

const text = siteText.inspector;
const nameOf = (view: InspectorView) => siteText.os.views[view];

const isFocused = (page: Page, selector: string) => page.evaluate((target) => document.activeElement !== null && document.activeElement === document.querySelector(target), selector);

async function activate(page: Page, selector: string, shell: InspectorShell): Promise<void> {
  if (shell === 'desktop') await page.locator(selector).click();
  else await page.locator(selector).tap();
}

// Shows the specs by the control, and checks focus is on the heading.
async function showByControl(page: Page, view: InspectorView, shell: InspectorShell): Promise<void> {
  await activate(page, `${viewSelector(view, shell)} button.show-specs`, shell);
  await waitForSpecView(page, view);
  await expectOnHeading(page, view);
}

async function expectOnHeading(page: Page, view: InspectorView): Promise<void> {
  const heading = `${specViewSelector(view)} h1.spec-heading`;
  expect(await isFocused(page, heading), `${view}: focus on the heading`).toBe(true);
  const [node] = await axNodes(page, heading);
  expect(node?.name).toBe(fill(text.heading, { view: view === 'about' ? text.shellName : nameOf(view) }));
}

async function backByControl(page: Page, view: InspectorView, shell: InspectorShell): Promise<void> {
  await activate(page, `${specViewSelector(view)} button.spec-back`, shell);
  await page.waitForSelector(specViewSelector(view), { state: 'detached' });
  await settle(page);
  expect(await isFocused(page, `${viewSelector(view, shell)} button.show-specs`), `${view}: focus back on Show specs`).toBe(true);
}

// The Tab stops from the focused element to the Terminal's command line.
async function stopsToCommandLine(page: Page): Promise<string[]> {
  const line = `${viewSelector('terminal', 'desktop')} ${COMMAND_LINE}`;
  const stops: string[] = [];
  for (let step = 0; step < 100 && !(await isFocused(page, line)); step += 1) {
    await page.keyboard.press('Tab');
    stops.push(await page.evaluate(() => {
      const active = document.activeElement!;
      return `${active.tagName.toLowerCase()}.${[...active.classList].join('.')}${(active.textContent ?? '').trim() === '' ? '' : ` ${(active.textContent ?? '').trim()}`}`;
    }));
  }
  return stops;
}

async function chooseInMenu(page: Page, name: string): Promise<void> {
  await page.click('#menu-title-app');
  await page.locator('#menu-app').getByRole('menuitem', { name, exact: true }).click();
}

describe('007-requirement-inspector-FR-017: focus moves to the view\'s heading, and back to Show specs', () => {
  test('desktop CV: by control and by menu, to the heading named Specs for CV, and back to Show specs', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await openView(page, 'cv', 'desktop');
    await showByControl(page, 'cv', 'desktop');
    await backByControl(page, 'cv', 'desktop');

    await chooseInMenu(page, text.show);
    await waitForSpecView(page, 'cv');
    await expectOnHeading(page, 'cv');
    await chooseInMenu(page, fill(text.back, { view: nameOf('cv') }));
    await page.waitForSelector(specViewSelector('cv'), { state: 'detached' });
    await settle(page);
    expect(await isFocused(page, `${viewSelector('cv', 'desktop')} button.show-specs`)).toBe(true);
  });

  test('desktop Terminal: the same, then Tab from Show specs reaches the command line as before', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await openView(page, 'terminal', 'desktop');
    await showByControl(page, 'terminal', 'desktop');
    await backByControl(page, 'terminal', 'desktop');
    // From Show specs, Tab goes on as it does from the window's controls:
    // through the Terminal's output to its command line.
    const fromShowSpecs = await stopsToCommandLine(page);
    await page.locator(`${viewSelector('terminal', 'desktop')} .controls button`).last().focus();
    await page.keyboard.press('Tab');
    expect(await isFocused(page, `${viewSelector('terminal', 'desktop')} button.show-specs`)).toBe(true);
    expect(await stopsToCommandLine(page)).toEqual(fromShowSpecs);
    expect(fromShowSpecs.at(-1)).toBe('input.command-line');

    await chooseInMenu(page, text.show);
    await waitForSpecView(page, 'terminal');
    await expectOnHeading(page, 'terminal');
    await chooseInMenu(page, fill(text.back, { view: nameOf('terminal') }));
    await page.waitForSelector(specViewSelector('terminal'), { state: 'detached' });
    await settle(page);
    expect(await isFocused(page, `${viewSelector('terminal', 'desktop')} button.show-specs`)).toBe(true);
  });

  test('desktop About this site: by control, to the heading named Specs for the shell, and back', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await openView(page, 'about', 'desktop');
    await showByControl(page, 'about', 'desktop');
    await backByControl(page, 'about', 'desktop');
  });

  test('opening and closing What\'s this? keeps focus on its button', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await openView(page, 'cv', 'desktop');
    await showByControl(page, 'cv', 'desktop');
    const button = `${specViewSelector('cv')} button.whats-this`;
    await page.locator(button).click();
    await settle(page);
    expect(await isFocused(page, button)).toBe(true);
    await page.locator(button).click();
    await settle(page);
    expect(await isFocused(page, button)).toBe(true);
  });

  for (const view of ['cv', 'terminal', 'about'] as const) {
    test(`mobile ${view}: taps move focus to the heading and back to Specs; What's this? keeps it`, async () => {
      const page = await openShell(SHELL_PAGE.mobile);
      await openView(page, view, 'mobile');
      await showByControl(page, view, 'mobile');
      const button = `${specViewSelector(view)} button.whats-this`;
      await page.locator(button).tap();
      await settle(page);
      expect(await isFocused(page, button)).toBe(true);
      await page.locator(button).tap();
      await settle(page);
      expect(await isFocused(page, button)).toBe(true);
      await backByControl(page, view, 'mobile');
    });
  }
});
