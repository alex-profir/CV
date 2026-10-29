// The inspector on a phone (FR-019, contracts/inspector.md Keyboard and
// focus): at 375 px every step works by touch and by an external keyboard,
// every control and link is a target of 24 × 24 px or more, and Specs fills
// the header's height.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { siteData } from '@cv/content';
import { siteText } from '../../src/site-text.ts';
import { openView, specViewSelector, viewSelector, waitForSpecView } from '../helpers/inspector.ts';
import type { InspectorShell } from '../helpers/inspector.ts';
import { box, openShell, settle } from '../helpers/shell.ts';
import type { Box } from '../helpers/shell.ts';
import { SHELL_PAGE } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 180_000 });

const text = siteText.inspector;
const SPEC = specViewSelector('cv');
const VIEW = viewSelector('cv', 'mobile');
const TARGETS = 'button.show-specs, button.spec-back, button.whats-this, .whats-this-panel a, a.build-commit, a.open-spec, a.spec-line, a.test-name, .requirement-text a';

const isFocused = (page: Page, selector: string) => page.evaluate((target) => document.activeElement !== null && document.activeElement === document.querySelector(target), selector);

// Every inspector control and link in the page with its target's size.
const targets = (page: Page, shell: InspectorShell) =>
  page.evaluate(
    ([within, selector]) =>
      [...document.querySelectorAll(within)].flatMap((root) =>
        [...root.querySelectorAll<HTMLElement>(selector)]
          .filter((element) => element.getClientRects().length > 0)
          .map((element) => {
            const rects = [...element.getClientRects()];
            const whole = element.getBoundingClientRect();
            // A link broken over lines is one target of all its line boxes:
            // each line as tall as a target, the whole as wide.
            const height = Math.min(...rects.map((rect) => rect.height));
            return { what: `${element.tagName.toLowerCase()}.${[...element.classList].join('.')} "${(element.textContent ?? '').trim().slice(0, 40)}"`, lines: rects.length, width: whole.width, height };
          }),
      ),
    [shell === 'desktop' ? '#os .desktop .window' : '#os .full-screen', TARGETS] as const,
  );

function expectTargets(found: Awaited<ReturnType<typeof targets>>, where: string) {
  expect(found.length, where).toBeGreaterThan(0);
  for (const target of found) {
    expect(target.width, `${where} ${target.what}: width`).toBeGreaterThanOrEqual(24);
    expect(target.height, `${where} ${target.what}: height`).toBeGreaterThanOrEqual(24);
  }
}

describe('007-requirement-inspector-FR-019: the inspector works on a phone, by touch or keyboard', () => {
  test('at 375 by touch: tap Specs, open What\'s this?, read a link, tap Back', async () => {
    const page = await openShell(SHELL_PAGE.mobile);
    await openView(page, 'cv', 'mobile');
    await page.locator(`${VIEW} button.show-specs`).tap();
    await waitForSpecView(page, 'cv');
    await page.locator(`${SPEC} button.whats-this`).tap();
    await settle(page);
    expect(await page.locator(`${SPEC} .whats-this-panel`).isVisible()).toBe(true);
    expect(await page.locator(`${SPEC} .whats-this-panel a`).getAttribute('href')).toBe(siteData.repository);
    expect(await page.locator(`${SPEC} a.spec-line`).first().getAttribute('href')).toMatch(/\/blob\/[0-9a-f]{40}\/specs\/.+\/spec\.md\?plain=1#L\d+$/);
    await page.locator(`${SPEC} button.spec-back`).tap();
    await page.waitForSelector(SPEC, { state: 'detached' });
    expect(await page.locator(`${VIEW} button.show-specs`).isVisible()).toBe(true);
  });

  test('at 375 with an external keyboard: Tab to Specs, Enter, What\'s this? by Enter, Tab to its link, Back by Enter', async () => {
    const page = await openShell(SHELL_PAGE.mobile);
    await openView(page, 'cv', 'mobile');
    await page.locator(`${VIEW} .home-button`).focus();
    await page.keyboard.press('Tab');
    expect(await isFocused(page, `${VIEW} button.show-specs`)).toBe(true);
    await page.keyboard.press('Enter');
    await waitForSpecView(page, 'cv');
    expect(await isFocused(page, `${SPEC} h1.spec-heading`)).toBe(true);
    await page.keyboard.press('Shift+Tab');
    expect(await isFocused(page, `${SPEC} button.whats-this`)).toBe(true);
    await page.keyboard.press('Enter');
    await settle(page);
    await page.keyboard.press('Tab');
    expect(await isFocused(page, `${SPEC} .whats-this-panel a`)).toBe(true);
    expect(await page.evaluate(() => document.activeElement?.getAttribute('href'))).toBe(siteData.repository);
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Shift+Tab');
    expect(await isFocused(page, `${SPEC} button.spec-back`)).toBe(true);
    // On a phone, Home comes before Back.
    await page.keyboard.press('Shift+Tab');
    expect(await isFocused(page, `${VIEW} .home-button`)).toBe(true);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await page.waitForSelector(SPEC, { state: 'detached' });
    await settle(page);
    expect(await isFocused(page, `${VIEW} button.show-specs`)).toBe(true);
  });

  test('every inspector control and link is at least 24 × 24 px, on a phone and on the desktop', async () => {
    for (const shell of ['mobile', 'desktop'] as const) {
      const page = await openShell(SHELL_PAGE[shell]);
      await openView(page, 'cv', shell);
      expectTargets(await targets(page, shell), `${shell} app`);
      const control = page.locator(`${viewSelector('cv', shell)} button.show-specs`);
      if (shell === 'mobile') await control.tap();
      else await control.click();
      await waitForSpecView(page, 'cv');
      const button = page.locator(`${SPEC} button.whats-this`);
      if (shell === 'mobile') await button.tap();
      else await button.click();
      await settle(page);
      const inView = await targets(page, shell);
      expect(inView.length, `${shell} specs`).toBeGreaterThan(5);
      expectTargets(inView, `${shell} specs`);
    }
  });

  test('Specs fills the header\'s 52 px height and is at least 44 px wide', async () => {
    const page = await openShell(SHELL_PAGE.mobile);
    await openView(page, 'cv', 'mobile');
    const header = (await box(page, `${VIEW} .app-header`)) as Box;
    const control = (await box(page, `${VIEW} button.show-specs`)) as Box;
    expect(header.height).toBe(52);
    // The whole height inside the header's bottom rule.
    const inner = await page.locator(`${VIEW} .app-header`).evaluate((element) => element.clientHeight);
    expect(control.height).toBeCloseTo(inner, 0);
    expect(control.y).toBeCloseTo(header.y, 0);
    expect(control.width).toBeGreaterThanOrEqual(44);
    expect((await page.locator(`${VIEW} button.show-specs`).innerText()).trim()).toBe(text.showShort);
  });
});
