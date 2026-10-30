// Target sizes (spec US6, FR-067): every control the Playground draws is at
// least 24 × 24 CSS px in every state; the phone's two buttons are 44 px
// tall. Monaco's own widgets are its, and are left out.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { siteText } from '../../src/site-text.ts';
import { openShell, PHONE_USER_AGENT, settle } from '../helpers/shell.ts';
import { freshProfile, holdEngine, MESSAGE, openPlayground, openPlaygroundPage, PLAYGROUND, POPUP, TOOLBAR } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 240_000 });

type Target = { what: string; width: number; height: number };

// The Playground's own controls on screen, with their sizes.
const targets = (page: Page, root: string) =>
  page.locator(root).evaluateAll((roots) =>
    roots.flatMap((element) =>
      [...element.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [role="tab"], [tabindex="0"]')]
        .filter((control) => control.closest('.monaco-editor') === null && control.getClientRects().length > 0)
        .map((control) => {
          // A box drawn smaller than its label takes clicks through that label.
          const label = control instanceof HTMLInputElement && control.type === 'checkbox' ? control.closest('label') : null;
          const box = (label ?? control).getBoundingClientRect();
          const name = control.getAttribute('aria-label') ?? control.textContent ?? '';
          return { what: `${control.tagName.toLowerCase()}.${control.className} ${name.trim().slice(0, 30)}`, width: box.width, height: box.height };
        }),
    ),
  );

function expectSizes(found: Target[], state: string): void {
  expect(found.length, state).toBeGreaterThan(0);
  for (const target of found) {
    expect(target.width, `${state}: ${target.what} width`).toBeGreaterThanOrEqual(24);
    expect(target.height, `${state}: ${target.what} height`).toBeGreaterThanOrEqual(24);
  }
}

describe('008-typescript-playground-FR-067: every control is at least 24 × 24 px', () => {
  test('ready, with a message, the options and examples panels, the reset popup and the offline state', async () => {
    const page = await openPlaygroundPage({ permissions: ['clipboard-read', 'clipboard-write'] });
    expectSizes(await targets(page, PLAYGROUND), 'ready');

    await page.locator(`${TOOLBAR} button.share`).click();
    await page.waitForSelector(MESSAGE);
    expectSizes(await targets(page, MESSAGE), 'a message');

    await page.locator(`${TOOLBAR} button.options`).click();
    await page.waitForSelector(`${PLAYGROUND} section.options-panel`);
    expectSizes(await targets(page, `${PLAYGROUND} section.options-panel`), 'the options panel');
    await page.locator(`${TOOLBAR} button.options`).click();

    await page.locator(`${TOOLBAR} button.examples`).click();
    await page.waitForSelector(`${PLAYGROUND} section.examples-panel`);
    expectSizes(await targets(page, `${PLAYGROUND} section.examples-panel`), 'the examples panel');
    await page.keyboard.press('Escape');

    await page.click('#menu-title-app');
    await page.getByRole('menuitem', { name: siteText.playground.menu.reset, exact: true }).click();
    await page.waitForSelector(POPUP);
    expectSizes(await targets(page, POPUP), 'the reset popup');
    await page.keyboard.press('Escape');

    const offline = await freshProfile({ serviceWorkers: 'block' });
    await offline.route(/\/playground\//, (route) => route.abort('internetdisconnected'));
    await openPlayground(offline);
    await offline.waitForSelector(`${PLAYGROUND} button.playground-retry`, { timeout: 60_000 });
    expectSizes(await targets(offline, PLAYGROUND), 'offline');
  });

  test('the download in progress has no control smaller than 24 × 24', async () => {
    const page = await freshProfile();
    const held = await holdEngine(page);
    await openPlayground(page);
    await page.waitForSelector(`${PLAYGROUND} .playground-loading`);
    const found = await targets(page, PLAYGROUND);
    for (const target of found) expect(Math.min(target.width, target.height), target.what).toBeGreaterThanOrEqual(24);
    held.release();
  });

  test("the phone's Share link and Copy link are the full width and 44 px tall", async () => {
    const page = await openShell({ width: 375, height: 812, hasTouch: true, userAgent: PHONE_USER_AGENT });
    await page.locator('#os .home .app-icon[data-view="playground"]').tap();
    await page.waitForSelector('#os section.playground-mobile');
    await settle(page);
    const found = await targets(page, '#os section.playground-mobile');
    expect(found).toHaveLength(2);
    for (const target of found) expect(target.height, target.what).toBeGreaterThanOrEqual(44);
    expect(found[0]!.width).toBe(found[1]!.width);
  });
});
