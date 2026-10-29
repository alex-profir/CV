// The inspector by keyboard alone (FR-016, contracts/inspector.md Keyboard
// and focus): Tab reaches "Show specs", Enter and Space show the view, Tab
// visits its controls and links in reading order, each with a visible
// indicator, the arrow keys scroll it from its heading, Escape does
// nothing, and focus is never trapped.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { specViewSelector, scrollerSelector, viewSelector, waitForSpecView } from '../helpers/inspector.ts';
import { focusIndicator, openShell, settle } from '../helpers/shell.ts';
import { SHELL_PAGE } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 300_000 });

const CV = viewSelector('cv', 'desktop');
const SPEC = specViewSelector('cv');
const SCROLLER = scrollerSelector('cv', 'desktop');

// The focused element, as a key the expected order uses.
const focusKey = (page: Page) =>
  page.evaluate(() => {
    const active = document.activeElement;
    if (active === null || active === document.body) return 'body';
    const kind = ['show-specs', 'spec-back', 'whats-this', 'build-commit', 'open-spec', 'spec-line', 'test-name', 'spec-heading'].find((name) => active.classList.contains(name)) ?? active.tagName.toLowerCase();
    return `${kind} ${active.getAttribute('href') ?? (active.textContent ?? '').trim()}`;
  });

// The stops the contract sets, in order, from the page itself: Back, What's
// this?, the panel's link when open, the build commit, then per spec Open
// the spec and per requirement its text's links, its spec line and its tests.
const expectedStops = (page: Page) =>
  page.evaluate((selector) => {
    const view = document.querySelector(selector)!;
    const key = (element: Element | null, kind: string) => (element === null ? [] : [`${kind} ${element.getAttribute('href') ?? (element.textContent ?? '').trim()}`]);
    const stops = [...key(view.querySelector('button.spec-back'), 'spec-back'), ...key(view.querySelector('button.whats-this'), 'whats-this')];
    const panel = view.querySelector('.whats-this-panel');
    if (panel !== null && !panel.hasAttribute('hidden')) stops.push(...[...panel.querySelectorAll('a')].flatMap((link) => key(link, 'a')));
    stops.push(...key(view.querySelector('a.build-commit'), 'build-commit'));
    for (const group of view.querySelectorAll('section.spec-group')) {
      stops.push(...key(group.querySelector('a.open-spec'), 'open-spec'));
      for (const item of group.querySelectorAll('li.requirement')) {
        stops.push(...[...item.querySelectorAll('.requirement-text a')].flatMap((link) => key(link, 'a')));
        stops.push(...key(item.querySelector('a.spec-line'), 'spec-line'));
        stops.push(...[...item.querySelectorAll('a.test-name')].flatMap((link) => key(link, 'test-name')));
      }
    }
    return stops;
  }, SPEC);

const inWindow = (page: Page) => page.evaluate((selector) => document.querySelector(selector)?.contains(document.activeElement) === true, CV);
const focusables = (page: Page) => page.evaluate(() => document.querySelectorAll('a[href], button, input, textarea, select, [tabindex]').length);
const scrollTop = (page: Page) => page.locator(SCROLLER).evaluate((element) => element.scrollTop);

// Waits until the view's scroll position holds for a few frames, so the
// next key starts from where the last one ended, even on a busy machine.
const scrollSettled = (page: Page) =>
  page.locator(SCROLLER).evaluate(async (element) => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    for (let still = 0, last = element.scrollTop; still < 3; ) {
      await frame();
      still = element.scrollTop === last ? still + 1 : 0;
      last = element.scrollTop;
    }
  });

// Tabs until the CV's "Show specs" has focus.
async function tabToShowSpecs(page: Page): Promise<void> {
  const limit = await focusables(page);
  for (let step = 0; step <= limit; step += 1) {
    if ((await page.evaluate((selector) => document.activeElement === document.querySelector(`${selector} button.show-specs`), CV)) === true) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('Tab never reached the CV window\'s Show specs');
}

describe('007-requirement-inspector-FR-016: the inspector works with a keyboard alone', () => {
  test('Tab reaches Show specs; Enter shows the view; Tab visits Back, What\'s this?, the panel\'s link, the build commit, then each spec\'s and requirement\'s links in order, and leaves', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await tabToShowSpecs(page);
    await page.keyboard.press('Enter');
    await waitForSpecView(page, 'cv');
    expect(await focusKey(page)).toMatch(/^spec-heading /);

    // Back and What's this? come before the heading.
    await page.keyboard.press('Shift+Tab');
    expect(await focusKey(page)).toMatch(/^whats-this /);
    // Enter opens the panel and keeps focus on its button.
    await page.keyboard.press('Enter');
    await settle(page);
    expect(await page.locator(`${SPEC} button.whats-this`).getAttribute('aria-expanded')).toBe('true');
    expect(await focusKey(page)).toMatch(/^whats-this /);
    await page.keyboard.press('Shift+Tab');
    expect(await focusKey(page)).toMatch(/^spec-back /);

    const expected = await expectedStops(page);
    expect(expected.length).toBeGreaterThan(10);
    const visited = [await focusKey(page)];
    const limit = (await focusables(page)) + 1;
    for (let step = 0; step < limit; step += 1) {
      await page.keyboard.press('Tab');
      if (!(await inWindow(page))) break;
      visited.push(await focusKey(page));
    }
    expect(visited).toEqual(expected);
    // Tab left the window: focus isn't trapped.
    expect(await inWindow(page)).toBe(false);
    expect(await focusKey(page)).not.toBe('body');
  });

  test('Enter closes What\'s this? again, with focus kept on its button', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await tabToShowSpecs(page);
    await page.keyboard.press('Enter');
    await waitForSpecView(page, 'cv');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Enter');
    await settle(page);
    await page.keyboard.press('Enter');
    await settle(page);
    expect(await page.locator(`${SPEC} button.whats-this`).getAttribute('aria-expanded')).toBe('false');
    expect(await page.locator(`${SPEC} .whats-this-panel`).isVisible()).toBe(false);
    expect(await focusKey(page)).toMatch(/^whats-this /);
  });

  test('Space shows the view too, and Back works by Enter', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await tabToShowSpecs(page);
    await page.keyboard.press('Space');
    await waitForSpecView(page, 'cv');
    expect(await focusKey(page)).toMatch(/^spec-heading /);
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Shift+Tab');
    expect(await focusKey(page)).toMatch(/^spec-back /);
    await page.keyboard.press('Enter');
    await page.waitForSelector(SPEC, { state: 'detached' });
    await settle(page);
    expect(await focusKey(page)).toMatch(/^show-specs /);
  });

  test('with focus on the heading, the arrow keys, Page Down, End and Home scroll the view; Escape does nothing', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await tabToShowSpecs(page);
    await page.keyboard.press('Enter');
    await waitForSpecView(page, 'cv');
    expect(await scrollTop(page)).toBe(0);
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => scrollTop(page), { timeout: 5000 }).toBeGreaterThan(0);
    const afterArrow = await scrollTop(page);
    await page.keyboard.press('PageDown');
    await expect.poll(() => scrollTop(page), { timeout: 5000 }).toBeGreaterThan(afterArrow);
    await page.keyboard.press('End');
    const max = await page.locator(SCROLLER).evaluate((element) => element.scrollHeight - element.clientHeight);
    await expect.poll(() => scrollTop(page), { timeout: 5000 }).toBeGreaterThanOrEqual(max - 1);
    await scrollSettled(page);
    await page.keyboard.press('ArrowUp');
    await expect.poll(() => scrollTop(page), { timeout: 5000 }).toBeLessThan(max - 1);
    await page.keyboard.press('Home');
    await expect.poll(() => scrollTop(page), { timeout: 5000 }).toBe(0);

    const before = await focusKey(page);
    await page.keyboard.press('Escape');
    await settle(page);
    expect(await page.locator(SPEC).count()).toBe(1);
    expect(await page.locator(CV).isVisible()).toBe(true);
    expect(await focusKey(page)).toBe(before);
  });

  test('every stop shows a focus indicator of 3:1 or more', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await tabToShowSpecs(page);
    const control = await focusIndicator(page);
    expect(control.ok, `show-specs: ${JSON.stringify(control)}`).toBe(true);
    await page.keyboard.press('Enter');
    await waitForSpecView(page, 'cv');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Enter');
    await settle(page);
    await page.keyboard.press('Shift+Tab');
    const expected = await expectedStops(page);
    // Each kind of stop once, and the first and last.
    const kinds = new Set<string>();
    const checked: string[] = [];
    for (let index = 0; index < expected.length; index += 1) {
      const key = await focusKey(page);
      const kind = key.split(' ')[0]!;
      if (!kinds.has(kind) || index === expected.length - 1) {
        kinds.add(kind);
        const indicator = await focusIndicator(page);
        expect(indicator.ok, `${key}: ${JSON.stringify(indicator)}`).toBe(true);
        checked.push(kind);
      }
      await page.keyboard.press('Tab');
    }
    expect(new Set(checked)).toEqual(new Set(['spec-back', 'whats-this', 'a', 'build-commit', 'open-spec', 'spec-line', 'test-name']));
  });
});
