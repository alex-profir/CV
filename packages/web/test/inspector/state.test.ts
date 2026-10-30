// What the shell keeps of a spec view (FR-004, contracts/shell.md
// `@cv/os-core`): a view keeps showing its specs while it stays open in the
// visit, whatever happens to its window or the shell, and on its own; it
// opens afresh showing the app; and nothing is stored.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { fill, siteText } from '../../src/site-text.ts';
import { showSpecs, viewSelector } from '../helpers/inspector.ts';
import { box, centre, drag, openShell, resize, settle, waitForReady } from '../helpers/shell.ts';
import { COMMAND_LINE, openTerminal, SHELL_PAGE, typeLine } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 300_000 });

const CV = viewSelector('cv', 'desktop');
const TERMINAL = viewSelector('terminal', 'desktop');
const controls = siteText.desktop.controls;

async function stored(page: Page): Promise<{ local: number; session: number; databases: string[]; cookies: number }> {
  const inPage = await page.evaluate(async () => ({
    local: localStorage.length,
    session: sessionStorage.length,
    databases: (await indexedDB.databases()).map((database) => database.name ?? ''),
  }));
  return { ...inPage, cookies: (await page.context().cookies()).length };
}

const NOTHING_STORED = { local: 0, session: 0, databases: [], cookies: 0 };

// The CV, in whichever shell shows it, shows its spec view; the Terminal's
// window, when there is one, shows the Terminal; and nothing is stored.
async function expectState(page: Page, step: string, { terminal = true }: { terminal?: boolean } = {}): Promise<void> {
  await settle(page);
  await expect.poll(() => page.locator('#os [data-view="cv"] section.spec-view[data-view="cv"]').count(), { message: `${step}: the CV shows its specs` }).toBe(1);
  expect(await page.locator('#os [data-view="cv"] .cv h1').count(), `${step}: the CV app isn't shown`).toBe(0);
  if (terminal && (await page.locator(TERMINAL).count()) > 0) {
    expect(await page.locator(`${TERMINAL} section.spec-view`).count(), `${step}: the Terminal shows the Terminal`).toBe(0);
    expect(await page.locator(`${TERMINAL} .terminal`).count(), `${step}: the Terminal shows the Terminal`).toBe(1);
  }
  expect(await stored(page), `${step}: nothing stored`).toEqual(NOTHING_STORED);
}

async function front(page: Page): Promise<void> {
  await page.locator('#os .dock-item[data-app="cv"]').click();
  await settle(page);
}

describe('007-requirement-inspector-FR-004: a view keeps its specs while it stays open, on its own, and stores nothing', () => {
  test('desktop: through move, resize, minimize, maximize, a shell switch both ways, Home and open cv, beside the Terminal', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    expect(await stored(page)).toEqual(NOTHING_STORED);
    await showSpecs(page, 'cv', 'desktop');
    await openTerminal(page, 'desktop');
    await expectState(page, 'the Terminal opened beside');

    await front(page);
    const start = (await box(page, CV))!;
    const bar = (await box(page, `${CV} .title-bar`))!;
    const grip = { x: bar.x + bar.width * 0.75, y: bar.y + bar.height / 2 };
    await drag(page, grip, { x: grip.x - 120, y: grip.y + 60 });
    expect((await box(page, CV))!.x).toBeCloseTo(start.x - 120, 0);
    await expectState(page, 'moved');

    const corner = (await box(page, `${CV} .resize-se`))!;
    const before = (await box(page, CV))!;
    await drag(page, centre(corner), { x: centre(corner).x - 150, y: centre(corner).y - 100 });
    expect((await box(page, CV))!.width).toBeLessThan(before.width);
    await expectState(page, 'resized');

    await page.getByRole('button', { name: fill(controls.minimize, { window: 'CV' }) }).click();
    await settle(page);
    expect(await page.locator(CV).isHidden()).toBe(true);
    await front(page);
    expect(await page.locator(CV).isVisible()).toBe(true);
    await expectState(page, 'minimized and restored');

    await page.getByRole('button', { name: fill(controls.maximize, { window: 'CV' }) }).click();
    await expectState(page, 'maximized');
    await page.getByRole('button', { name: fill(controls.restore, { window: 'CV' }) }).click();
    await expectState(page, 'restored');

    await resize(page, 375, 812);
    await page.locator(viewSelector('cv', 'mobile')).waitFor();
    await expectState(page, 'switched to the phone shell');
    await page.getByRole('button', { name: siteText.mobile.home }).click();
    await expect.poll(() => page.locator('#os .full-screen').count()).toBe(0);
    expect(await stored(page)).toEqual(NOTHING_STORED);
    await page.locator('#os .home .app-icon[data-view="cv"]').click();
    await page.locator(viewSelector('cv', 'mobile')).waitFor();
    await expectState(page, 'home and reopened');
    await resize(page, 1440, 900);
    await page.locator(CV).waitFor();
    await expectState(page, 'switched back to the desktop');

    if ((await page.locator(TERMINAL).count()) === 0) await openTerminal(page, 'desktop');
    else await page.locator('#os .dock-item[data-app="terminal"]').click();
    await page.waitForSelector(COMMAND_LINE, { state: 'visible' });
    await typeLine(page, 'open cv');
    await expect.poll(() => page.locator(CV).getAttribute('aria-current')).toBe('true');
    await expectState(page, 'open cv typed in the Terminal');
  });

  test('desktop: closed and reopened from the dock, or after a reload, the CV shows the app', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await showSpecs(page, 'cv', 'desktop');
    await page.getByRole('button', { name: fill(controls.close, { window: 'CV' }) }).click();
    await expect.poll(() => page.locator(CV).count()).toBe(0);
    await page.locator('#os .dock-item[data-app="cv"]').click();
    await page.locator(CV).waitFor();
    await settle(page);
    expect(await page.locator(`${CV} section.spec-view`).count()).toBe(0);
    expect(await page.locator(`${CV} .cv h1`).isVisible()).toBe(true);
    expect(await page.locator(`${CV} button.show-specs`).isVisible()).toBe(true);
    expect(await stored(page)).toEqual(NOTHING_STORED);

    await showSpecs(page, 'cv', 'desktop');
    await page.reload();
    await waitForReady(page);
    await settle(page);
    expect(await page.locator('#os section.spec-view').count()).toBe(0);
    expect(await page.locator(`${CV} .cv h1`).isVisible()).toBe(true);
    expect(await stored(page)).toEqual(NOTHING_STORED);
  });

  test('mobile: Home and opening the CV again keep its specs; a reload shows the app', async () => {
    const page = await openShell(SHELL_PAGE.mobile);
    await showSpecs(page, 'cv', 'mobile');
    await page.getByRole('button', { name: siteText.mobile.home }).tap();
    await expect.poll(() => page.locator('#os .full-screen').count()).toBe(0);
    await page.locator('#os .home .app-icon[data-view="cv"]').tap();
    await page.locator(viewSelector('cv', 'mobile')).waitFor();
    await expectState(page, 'home and reopened');
    // Another app opens showing the app.
    await page.getByRole('button', { name: siteText.mobile.home }).tap();
    await page.locator('#os .home .app-icon[data-view="terminal"]').tap();
    await page.waitForSelector(COMMAND_LINE, { state: 'visible' });
    expect(await page.locator('#os section.spec-view[data-view="terminal"]').count()).toBe(0);

    await page.reload();
    await waitForReady(page);
    if ((await page.locator(viewSelector('cv', 'mobile')).count()) === 0) await page.locator('#os .home .app-icon[data-view="cv"]').tap();
    await page.locator(viewSelector('cv', 'mobile')).waitFor();
    await settle(page);
    expect(await page.locator('#os section.spec-view').count()).toBe(0);
    expect(await page.locator(`${viewSelector('cv', 'mobile')} .cv h1`).isVisible()).toBe(true);
    expect(await stored(page)).toEqual(NOTHING_STORED);
  });
});
