// "Show specs" (FR-001, contracts/inspector.md "Show specs" and The app's
// menu): every window's title bar and every full-screen header holds one,
// named for its view, at the bar's right end; the focused window's menu holds
// the same command; and one action shows the view's specs.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { siteData } from '@cv/content';
import { fill, siteText } from '../../src/site-text.ts';
import { openView, scrollerSelector, specViewSelector, viewSelector, waitForSpecView } from '../helpers/inspector.ts';
import type { InspectorShell, InspectorView } from '../helpers/inspector.ts';
import { box, centre, openShell, settle } from '../helpers/shell.ts';
import type { Box } from '../helpers/shell.ts';
import { SHELL_PAGE } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 180_000 });

const VIEWS: readonly InspectorView[] = ['cv', 'terminal', 'about'];
const text = siteText.inspector;
const nameOf = (view: InspectorView) => siteText.os.views[view];

const meet = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

// The view's bar: the title bar on the desktop, the header full screen.
const barSelector = (view: InspectorView, shell: InspectorShell) => `${viewSelector(view, shell)} ${shell === 'desktop' ? '.title-bar' : '.app-header'}`;

// Checks the view's one "Show specs": its name, its visible label, its place
// at the bar's right end, after the controls or the name, and its box
// outside the content.
async function expectControl(page: Page, view: InspectorView, shell: InspectorShell): Promise<void> {
  const where = `${shell} ${view}`;
  const bar = barSelector(view, shell);
  const controls = page.locator(`${viewSelector(view, shell)} button.show-specs`);
  expect(await controls.count(), where).toBe(1);
  expect(await page.locator(`${bar} button.show-specs`).count(), `${where}: in the bar`).toBe(1);
  const control = controls.first();
  expect(await control.isVisible(), where).toBe(true);
  expect(await page.locator(viewSelector(view, shell)).getByRole('button', { name: fill(text.showName, { view: nameOf(view) }), exact: true }).count(), where).toBe(1);
  expect((await control.innerText()).replace(/\s+/g, ' ').trim(), where).toBe(shell === 'desktop' ? text.show : text.showShort);
  // After 005's controls on the desktop, after the name full screen.
  const before = shell === 'desktop' ? '.controls' : '.app-title';
  expect(
    await control.evaluate((button, selector) => {
      const previous = button.closest('.title-bar, .app-header')?.querySelector(selector);
      return previous != null && (previous.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    }, before),
    `${where}: after ${before}`,
  ).toBe(true);
  const barBox = (await box(page, bar))!;
  const own = (await box(page, `${bar} button.show-specs`))!;
  // At the bar's right end: in its right quarter, nearer its edge than its
  // own height, and inside it top to bottom.
  expect(centre(own).x, `${where}: right quarter`).toBeGreaterThan(barBox.x + (barBox.width * 3) / 4);
  expect(barBox.x + barBox.width - (own.x + own.width), `${where}: gap to the bar's right edge`).toBeLessThan(barBox.height);
  expect(own.x + own.width, `${where}: inside the bar`).toBeLessThanOrEqual(barBox.x + barBox.width + 0.5);
  expect(own.y, where).toBeGreaterThanOrEqual(barBox.y - 0.5);
  expect(own.y + own.height, where).toBeLessThanOrEqual(barBox.y + barBox.height + 0.5);
  // It covers none of the content.
  const content = (await box(page, scrollerSelector(view, shell)))!;
  expect(meet(own, content), `${where}: outside the content`).toBe(false);
}

// The focused window's menu: each item's label.
const menuItems = (page: Page) =>
  page.locator('#menu-app [role^="menuitem"]').evaluateAll((list) => list.map((item) => (item.querySelector('.label')?.textContent ?? '').trim()));

const WINDOW_COMMANDS = ['Move…', 'Resize…', 'Minimize', 'Maximize', 'Close'];

describe('007-requirement-inspector-FR-001: every window has "Show specs" at its title bar\'s right end', () => {
  test('at 1440 the CV window, the Terminal and About this site each have one, named for the view and labelled Show specs, outside the content', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    for (const view of VIEWS) {
      await openView(page, view, 'desktop');
      await expectControl(page, view, 'desktop');
    }
  });

  test('a pointer down on it, dragged across the desktop, moves no window', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    for (const view of VIEWS) {
      await openView(page, view, 'desktop');
      const window = viewSelector(view, 'desktop');
      const before = (await box(page, window))!;
      const from = centre((await box(page, `${window} button.show-specs`))!);
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      for (let step = 1; step <= 10; step += 1) await page.mouse.move(from.x - step * 15, from.y + step * 8);
      await page.mouse.up();
      await settle(page);
      expect(await box(page, window), view).toEqual(before);
    }
  });
});

describe('007-requirement-inspector-FR-001: every full-screen view has "Specs" at its header\'s right end', () => {
  test('at 375 the CV, the Terminal and About this site each have one, named for the view and labelled Specs, outside the content', async () => {
    const page = await openShell(SHELL_PAGE.mobile);
    for (const view of VIEWS) {
      await openView(page, view, 'mobile');
      await expectControl(page, view, 'mobile');
    }
  });
});

describe('007-requirement-inspector-FR-001: the focused window\'s menu holds Show specs, after the app\'s own commands', () => {
  test('the CV, Terminal and About menus hold it with no shortcut, About\'s first; choosing it shows the specs', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    const expected: Record<InspectorView, string[]> = {
      cv: ['Open the CV as a page', text.show, ...WINDOW_COMMANDS],
      terminal: ['Clear output', text.show, ...WINDOW_COMMANDS],
      about: [text.show, ...WINDOW_COMMANDS],
    };
    for (const view of VIEWS) {
      await openView(page, view, 'desktop');
      await page.click('#menu-title-app');
      expect(await menuItems(page), view).toEqual(expected[view]);
      const item = page.locator('#menu-app').getByRole('menuitem', { name: text.show, exact: true });
      expect(await item.count(), view).toBe(1);
      expect(await item.getAttribute('aria-keyshortcuts'), view).toBeNull();
      expect(((await item.locator('.keys').allTextContents()).join('')).trim(), view).toBe('');
      await page.keyboard.press('Escape');
      await settle(page);
    }
    // Choosing it in About this site's menu shows its specs.
    await page.click('#menu-title-app');
    await page.locator('#menu-app').getByRole('menuitem', { name: text.show, exact: true }).click();
    await waitForSpecView(page, 'about');
    expect(await page.locator(viewSelector('about', 'desktop')).locator('section.spec-view').count()).toBe(1);
  });
});

describe('007-requirement-inspector-FR-001: one action shows a view\'s specs (SC-002)', () => {
  for (const shell of ['desktop', 'mobile'] as const) {
    test(`at ${SHELL_PAGE[shell].width}, one ${shell === 'desktop' ? 'click' : 'tap'} on Show specs shows each view's spec view`, async () => {
      const page = await openShell(SHELL_PAGE[shell]);
      for (const view of VIEWS) {
        await openView(page, view, shell);
        const control = page.locator(`${viewSelector(view, shell)} button.show-specs`);
        if (shell === 'desktop') await control.click();
        else await control.tap();
        await waitForSpecView(page, view);
        expect(await page.locator(`${specViewSelector(view)} section.spec-group`).count(), `${shell} ${view}`).toBeGreaterThan(0);
        expect(await page.locator(`${viewSelector(view, shell)} section.spec-view`).isVisible(), `${shell} ${view}`).toBe(true);
      }
    });
  }
});

describe('007-requirement-inspector-FR-001: a test that covers a view\'s requirement is one action past Show specs (SC-001)', () => {
  test('every spec view holds a test link into the repository, reachable from the view', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    for (const view of VIEWS) {
      await openView(page, view, 'desktop');
      await page.locator(`${viewSelector(view, 'desktop')} button.show-specs`).click();
      await waitForSpecView(page, view);
      const link = page.locator(`${specViewSelector(view)} a.test-name`).first();
      expect(await link.count(), view).toBe(1);
      expect(await link.getAttribute('href'), view).toMatch(new RegExp(`^${siteData.repository!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\/$/, '')}/`));
      // It is in the view's scroller, so scrolling, not another action, brings it into sight.
      expect(await link.evaluate((element) => element.closest('.window-content') !== null), view).toBe(true);
    }
  });
});
