// The inspector's `data-req` targets (FR-029, contracts/inspector.md
// `data-req` targets): in the rendered page, each element carries exactly
// the IDs the table lists, in both shells, with "What's this?" open; the
// uncommitted note in a dirty build and the offline note offline.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { copyBuild, openView, showSpecs, specViewSelector, viewSelector } from '../helpers/inspector.ts';
import type { InspectorView } from '../helpers/inspector.ts';
import { openShell, settle } from '../helpers/shell.ts';
import { SHELL_PAGE } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 300_000 });

const VIEWS: readonly InspectorView[] = ['cv', 'terminal', 'about'];

const ids = (...numbers: number[]) => numbers.map((number) => `007-requirement-inspector-FR-${String(number).padStart(3, '0')}`);

// The table's rows inside a spec view: a selector and the IDs each element
// it matches carries.
const SPEC_VIEW_TARGETS = (view: InspectorView): [string, string[]][] => {
  const root = specViewSelector(view);
  return [
    [root, view === 'about' ? ids(2, 6, 11, 12, 18, 20, 24) : ids(2, 6, 18, 20, 24)],
    [`${root} button.spec-back`, ids(3, 17)],
    [`${root} h1.spec-heading`, ids(17, 18)],
    [`${root} button.whats-this`, ids(9)],
    [`${root} section.whats-this-panel`, ids(9)],
    [`${root} p.spec-build`, ids(10, 13)],
    [`${root} a.build-commit`, ids(10, 13)],
    [`${root} section.spec-group`, ids(6)],
    [`${root} li.requirement`, ids(7, 8)],
    [`${root} a.spec-line`, ids(10)],
    [`${root} a.open-spec`, ids(10)],
    [`${root} a.test-name`, ids(10)],
  ];
};

const SHOW_SPECS = ids(1, 5, 16, 19);

const MENU_ITEM = ids(1, 3);

// Each element `selector` matches, and the IDs it carries, sorted. Fails
// when it matches none.
async function carried(page: Page, selector: string): Promise<string[][]> {
  const found = await page.evaluate((target) => [...document.querySelectorAll(target)].map((element) => (element.getAttribute('data-req') ?? '').split(/\s+/).filter(Boolean).sort()), selector);
  expect(found.length, `${selector} is in the page`).toBeGreaterThan(0);
  return found;
}

async function expectCarries(page: Page, selector: string, expected: string[]): Promise<void> {
  for (const list of await carried(page, selector)) expect(list, selector).toEqual([...expected].sort());
}

// The app menu's specs item, read by its label.
async function menuItem(page: Page, label: string): Promise<string[]> {
  await page.click('#menu-title-app');
  await page.waitForSelector('#menu-app', { state: 'visible' });
  const found = await page.evaluate((name) => {
    const item = [...document.querySelectorAll('#menu-app [role="menuitem"]')].find((element) => (element.textContent ?? '').replace(/\s+/g, ' ').trim() === name);
    return item === undefined ? null : (item.closest('[data-req]')?.getAttribute('data-req') ?? '').split(/\s+/).filter(Boolean).sort();
  }, label);
  await page.keyboard.press('Escape');
  await settle(page);
  expect(found, `the app menu's ${label}`).not.toBeNull();
  return found!;
}

async function openWhatsThis(page: Page, view: InspectorView, shell: 'desktop' | 'mobile'): Promise<void> {
  const button = page.locator(`${specViewSelector(view)} button.whats-this`);
  if (shell === 'desktop') await button.click();
  else await button.tap();
  await page.waitForSelector(`${specViewSelector(view)} section.whats-this-panel`, { state: 'visible' });
}

describe('007-requirement-inspector-FR-029: every inspector target carries exactly its IDs', () => {
  test('desktop: Show specs, the menu item, the title span and every spec view with What\'s this? open', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await expectCarries(page, `${viewSelector('cv', 'desktop')} button.show-specs`, SHOW_SPECS);
    expect(await menuItem(page, 'Show specs')).toEqual([...MENU_ITEM].sort());
    for (const view of VIEWS) {
      await showSpecs(page, view, 'desktop');
      await openWhatsThis(page, view, 'desktop');
      for (const [selector, expected] of SPEC_VIEW_TARGETS(view)) await expectCarries(page, selector, expected);
      await expectCarries(page, `${viewSelector(view, 'desktop')} .window-title span[data-req]`, ids(2));
      if (view === 'cv') expect(await menuItem(page, 'Back to CV')).toEqual([...MENU_ITEM].sort());
    }
  });

  test("mobile: the header's Specs, its title suffix and every spec view with What's this? open", async () => {
    const page = await openShell(SHELL_PAGE.mobile);
    for (const view of VIEWS) {
      await openView(page, view, 'mobile');
      await expectCarries(page, `${viewSelector(view, 'mobile')} button.show-specs`, SHOW_SPECS);
      await showSpecs(page, view, 'mobile');
      await openWhatsThis(page, view, 'mobile');
      for (const [selector, expected] of SPEC_VIEW_TARGETS(view)) await expectCarries(page, selector, expected);
      await expectCarries(page, `${viewSelector(view, 'mobile')} .app-title span.title-suffix`, ids(2));
    }
  });

  test('the uncommitted note in a dirty build, and the offline note offline', async () => {
    const { server } = await copyBuild(() => undefined, { dirty: true });
    const page = await openShell({ ...SHELL_PAGE.desktop, url: server.url });
    await showSpecs(page, 'cv', 'desktop');
    const view = specViewSelector('cv');
    await expectCarries(page, `${view} p.note-uncommitted`, ids(10));
    await page.context().setOffline(true);
    await page.waitForSelector(`${view} p.note-offline`);
    await expectCarries(page, `${view} p.note-offline`, ids(27));
    await page.context().setOffline(false);
  });
});
