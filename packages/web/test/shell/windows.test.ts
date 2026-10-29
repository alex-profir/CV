// Desktop windows by pointer (spec US2), at 1440 × 900.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { resume } from '@cv/content';
import { box, centre, drag, focusedElement, frontWindow, openShell, resize, settle } from '../helpers/shell.ts';
import type { Box } from '../helpers/shell.ts';

vi.setConfig({ testTimeout: 120_000 });

const CV = '#os .window[data-view="cv"]';
const ABOUT = '#os .window[data-view="about"]';

const desktop = (options: { hasTouch?: boolean } = {}) => openShell({ width: 1440, height: 900, ...options });

async function openAbout(page: Page): Promise<void> {
  await page.click('#menu-title-site');
  await page.getByRole('menuitem', { name: 'About this site' }).click();
  await page.locator(ABOUT).waitFor();
}

const meet = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function chrome(page: Page): Promise<{ menuBar: Box; dock: Box }> {
  return { menuBar: (await box(page, '#os .menu-bar'))!, dock: (await box(page, '#os .dock'))! };
}

const titleBar = async (page: Page, window: string) => (await box(page, `${window} .title-bar`))!;

// A point on the title bar away from its controls and its name.
async function grip(page: Page, window: string): Promise<{ x: number; y: number }> {
  const bar = await titleBar(page, window);
  return { x: bar.x + bar.width * 0.75, y: bar.y + bar.height / 2 };
}

// The element on top at a point, as its closest match of `selector`, or null.
const topAt = (page: Page, point: { x: number; y: number }, selector: string) =>
  page.evaluate(({ x, y, selector }) => document.elementFromPoint(x, y)?.closest(selector)?.className ?? null, { ...point, selector });

describe('005-os-shell-FR-010: windows never cover the menu bar, and pass behind the dock', () => {
  test('dragged up a window stops at the menu bar; dragged down and resized it passes behind the dock, which stays usable', async () => {
    const page = await desktop();
    const { menuBar, dock } = await chrome(page);
    const from = await grip(page, CV);
    await drag(page, from, { x: from.x, y: from.y - 300 });
    expect(meet((await box(page, CV))!, menuBar)).toBe(false);
    await drag(page, await grip(page, CV), { x: from.x, y: 2000 });
    expect(meet((await box(page, CV))!, dock)).toBe(true);
    expect(await topAt(page, centre(dock), '.dock')).toContain('dock');
    expect(await topAt(page, { x: menuBar.x + menuBar.width / 2, y: menuBar.y + menuBar.height / 2 }, '.menu-bar')).toContain('menu-bar');
    // The dock still works over the window: its CV item focuses the CV.
    await page.click('#os .dock-item[data-app="cv"]');
    await settle(page);
    expect(await focusedElement(page)).toContain('window-title');
    await drag(page, await grip(page, CV), { x: from.x, y: from.y });
    const corner = (await box(page, `${CV} .resize-se`))!;
    await drag(page, centre(corner), { x: 1439, y: 899 });
    expect(meet((await box(page, CV))!, dock)).toBe(true);
    expect(await topAt(page, centre(dock), '.dock')).toContain('dock');
    await page.getByRole('button', { name: 'Maximize CV' }).click();
    const maximized = (await box(page, CV))!;
    expect(meet(maximized, menuBar)).toBe(false);
    expect(meet(maximized, dock)).toBe(false);
  });
});

describe('005-os-shell-FR-016: every window has a title bar with its name and controls, content below', () => {
  test('the CV and About windows each show their name and Close, Minimize and Maximize', async () => {
    const page = await desktop();
    await openAbout(page);
    for (const [selector, name] of [
      [CV, 'CV'],
      [ABOUT, 'About this site'],
    ] as const) {
      expect((await page.locator(`${selector} .window-title`).textContent())?.trim()).toBe(name);
      expect(await page.locator(`${selector} .control`).evaluateAll((list) => list.map((control) => control.getAttribute('aria-label')))).toEqual([`Close ${name}`, `Minimize ${name}`, `Maximize ${name}`]);
      const bar = await titleBar(page, selector);
      const content = (await box(page, `${selector} .window-content`))!;
      expect(content.y).toBeGreaterThanOrEqual(bar.y + bar.height - 1);
    }
  });
});

describe('005-os-shell-FR-017: a click anywhere in a window behind brings it to the front', () => {
  test('the CV behind About comes forward on a click in its content, and the focused title bar looks different in grayscale', async () => {
    const page = await desktop();
    await openAbout(page);
    expect(await page.locator(ABOUT).getAttribute('aria-current')).toBe('true');
    const cv = (await box(page, CV))!;
    await page.mouse.click(cv.x + cv.width - 40, cv.y + cv.height - 60);
    expect(await page.locator(CV).getAttribute('aria-current')).toBe('true');
    expect(await page.locator(ABOUT).getAttribute('aria-current')).toBeNull();
    expect(await frontWindow(page)).toBe('cv');
    const gray = async (selector: string) => {
      const shot = await page.locator(`${selector} .title-bar`).screenshot({ animations: 'disabled', style: 'html { filter: grayscale(1) }' });
      return shot.toString('base64');
    };
    await page.mouse.move(5, 450);
    expect(await gray(CV)).not.toBe(await gray(ABOUT));
  });
});

describe('005-os-shell-FR-018: About opens clear of the CV window', () => {
  test('48 px right of and below the CV, its title bar clear of the CV title bar', async () => {
    const page = await desktop();
    const cv = (await box(page, CV))!;
    await openAbout(page);
    const about = (await box(page, ABOUT))!;
    expect({ x: about.x - cv.x, y: about.y - cv.y, width: about.width, height: about.height }).toEqual({ x: 48, y: 48, width: 560, height: 520 });
    expect(meet(await titleBar(page, ABOUT), await titleBar(page, CV))).toBe(false);
  });

  test("with the CV dragged 176 px down, About opens clear of the CV's whole title bar", async () => {
    const page = await desktop();
    await drag(page, await grip(page, CV), await grip(page, CV).then(({ x, y }) => ({ x, y: y + 176 })));
    const area = (await box(page, '#os .desktop-area'))!;
    expect((await box(page, CV))!.y - area.y).toBe(200);
    await openAbout(page);
    const about = (await box(page, ABOUT))!;
    expect({ x: about.x - area.x, y: about.y - area.y }).toEqual({ x: 240, y: 240 });
    // The title bar sits inside the window's 1 px border, so About's border
    // may rest on its last pixel row, as FR-021's drags allow.
    const bar = await titleBar(page, CV);
    expect(meet(about, { ...bar, height: bar.height - 1 })).toBe(false);
  });

  test("the CV opened from the dock while About is open alone leaves About's title bar uncovered", async () => {
    const page = await desktop();
    await page.getByRole('button', { name: 'Close CV' }).click();
    await settle(page);
    await openAbout(page);
    await settle(page);
    await page.click('#os .dock-item[data-app="cv"]');
    await page.locator(CV).waitFor();
    await settle(page);
    const area = (await box(page, '#os .desktop-area'))!;
    const cv = (await box(page, CV))!;
    expect({ x: cv.x - area.x, y: cv.y - area.y, width: cv.width, height: cv.height }).toEqual({ x: 220, y: 72, width: 1000, height: 668 });
    expect(await frontWindow(page)).toBe('cv');
    const bar = await titleBar(page, ABOUT);
    expect(meet(cv, bar)).toBe(false);
    const { x, y } = centre(bar);
    expect(await page.evaluate(([px, py]) => document.elementFromPoint(px!, py!)?.closest('.window')?.getAttribute('data-view'), [x, y])).toBe('about');
  });
});

describe('005-os-shell-FR-019: a window moves with any pointer dragging its title bar', () => {
  for (const pointerType of ['mouse', 'pen', 'touch'] as const) {
    test(`a ${pointerType} drag moves the window with the pointer, and it stays where released`, async () => {
      const page = await desktop({ hasTouch: pointerType === 'touch' });
      const before = (await box(page, CV))!;
      const from = await grip(page, CV);
      await drag(page, from, { x: from.x - 100, y: from.y + 60 }, { pointerType });
      const after = (await box(page, CV))!;
      expect({ x: after.x - before.x, y: after.y - before.y }).toEqual({ x: -100, y: 60 });
      await page.waitForTimeout(100);
      expect(await box(page, CV)).toEqual(after);
    });
  }

  test("a drag that starts on a control doesn't move the window, and releasing away from it does nothing", async () => {
    const page = await desktop();
    const before = (await box(page, CV))!;
    const close = (await box(page, `${CV} .control-close`))!;
    await drag(page, centre(close), { x: close.x + 300, y: close.y + 200 });
    expect(await box(page, CV)).toEqual(before);
    expect(await page.locator(CV).count()).toBe(1);
  });
});

describe('005-os-shell-FR-020: Move… and Resize… work by single clicks', () => {
  test('Move… then pad clicks move the window 16 px per click; Resize… then pad clicks resize it', async () => {
    const page = await desktop();
    const start = (await box(page, CV))!;
    await page.click('#menu-title-app');
    await page.getByRole('menuitem', { name: 'Move…' }).click();
    const pad = page.locator(`${CV} .pad`);
    expect(await pad.getAttribute('aria-label')).toBe('Moving CV');
    expect(await page.locator(`${CV} .pad-hint`).textContent()).toBe('Arrows: 16 px Shift+arrows: 64 px');
    await pad.getByRole('button', { name: 'Right' }).click();
    await pad.getByRole('button', { name: 'Right' }).click();
    await pad.getByRole('button', { name: 'Down' }).click();
    await pad.getByRole('button', { name: 'Done' }).click();
    const moved = (await box(page, CV))!;
    expect({ x: moved.x - start.x, y: moved.y - start.y }).toEqual({ x: 32, y: 16 });
    await page.click('#menu-title-app');
    await page.getByRole('menuitem', { name: 'Resize…' }).click();
    expect(await page.locator(`${CV} .pad`).getAttribute('aria-label')).toBe('Resizing CV');
    await page.locator(`${CV} .pad`).getByRole('button', { name: 'Narrower' }).click();
    await page.locator(`${CV} .pad`).getByRole('button', { name: 'Shorter' }).click();
    await page.locator(`${CV} .pad`).getByRole('button', { name: 'Done' }).click();
    const resized = (await box(page, CV))!;
    expect({ width: moved.width - resized.width, height: moved.height - resized.height }).toEqual({ width: 16, height: 16 });
  });
});

// How much of a box is inside the 1440 px wide screen.
const onScreen = (rect: Box) => Math.min(rect.x + rect.width, 1440) - Math.max(rect.x, 0);

describe('005-os-shell-FR-021: a window moves past the edges with its title bar kept on screen', () => {
  test('dragged past each edge, the title bar stays between the menu bar and the dock, with 120 px of it on screen', async () => {
    for (const target of [
      { x: -2000, y: 400 },
      { x: 4000, y: 400 },
      { x: 700, y: -2000 },
      { x: 700, y: 4000 },
    ]) {
      const page = await desktop();
      const area = (await box(page, '#os .desktop-area'))!;
      const from = await grip(page, CV);
      await drag(page, from, target);
      const window = (await box(page, CV))!;
      const bar = await titleBar(page, CV);
      const label = JSON.stringify(target);
      expect(bar.y, label).toBeGreaterThanOrEqual(area.y);
      expect(bar.y + bar.height, label).toBeLessThanOrEqual(area.y + area.height + 1);
      expect(onScreen(window), label).toBeGreaterThanOrEqual(120);
      if (target.x < 0) expect(window.x + window.width, label).toBe(120);
      if (target.x > 1440) expect(window.x, label).toBe(1440 - 120);
      if (target.y > 900) expect(window.y + window.height, label).toBeGreaterThan(900);
    }
  });

  test('narrowing the viewport to 1100 px moves a window past the right edge back only until 120 px of the title bar is on screen', async () => {
    const page = await desktop();
    await drag(page, await grip(page, CV), { x: 4000, y: 300 });
    expect((await box(page, CV))!.x).toBe(1320);
    await resize(page, 1100, 900);
    await expect.poll(async () => (await box(page, CV))!.x).toBe(1100 - 120);
  });
});

describe('005-os-shell-FR-067: focus by key on a hidden element brings its window into view', () => {
  // The CV's last link, at the end of its content, scrolled into the window's view.
  async function moveLowRight(page: Page): Promise<void> {
    const from = await grip(page, CV);
    await drag(page, from, { x: from.x + 700, y: from.y + 560 });
  }

  test('Tab to a link behind the dock or past the right edge moves the window just enough, keeping its size', async () => {
    const page = await desktop();
    await moveLowRight(page);
    const before = (await box(page, CV))!;
    expect(before.x + before.width).toBeGreaterThan(1440);
    expect(before.y + before.height).toBeGreaterThan(900 - 104);
    const area = (await box(page, '#os .desktop-area'))!;
    // Every link in the CV in turn: each one focused by Tab ends up inside the area with its outline.
    await page.focus(`${CV} .window-title`);
    for (let step = 0; step < 12; step += 1) {
      await page.keyboard.press('Tab');
      await settle(page);
      const focused = await page.evaluate(() => {
        const element = document.activeElement!;
        const rect = element.getBoundingClientRect();
        return { inCv: element.closest('.window[data-view="cv"]') !== null, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      });
      if (!focused.inCv) break;
      expect(focused.x - 4, `step ${step}`).toBeGreaterThanOrEqual(area.x - 1);
      expect(focused.x + focused.width + 4, `step ${step}`).toBeLessThanOrEqual(area.x + area.width + 1);
      expect(focused.y - 4, `step ${step}`).toBeGreaterThanOrEqual(area.y - 1);
      expect(focused.y + focused.height + 4, `step ${step}`).toBeLessThanOrEqual(area.y + area.height + 1);
    }
    const after = (await box(page, CV))!;
    expect({ width: after.width, height: after.height }).toEqual({ width: before.width, height: before.height });
    expect(after.x !== before.x || after.y !== before.y).toBe(true);
  });

  test('a click, a drag and the wheel never move it', async () => {
    const page = await desktop();
    // As low as it goes: the title bar on the dock's space, and the CV's
    // first link, below it, under the desktop area (whose bottom is at 796).
    const from = await grip(page, CV);
    await drag(page, from, { x: from.x + 700, y: 4000 });
    const before = (await box(page, CV))!;
    // A click on that link focuses it; the click itself is kept from following it.
    await page.evaluate(() => document.addEventListener('click', (event) => event.preventDefault(), true));
    const link = (await page.locator(CV).getByRole('link', { name: /Open as a page/ }).boundingBox())!;
    expect(link.y).toBeGreaterThan(796);
    await page.mouse.click(link.x + 2, link.y + 2);
    await settle(page);
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('A');
    expect(await box(page, CV)).toEqual(before);
    await page.mouse.move(before.x + 200, before.y + 100);
    await page.mouse.wheel(0, 600);
    await settle(page);
    expect(await box(page, CV)).toEqual(before);
  });

  test('a tap never moves it either', async () => {
    const page = await desktop({ hasTouch: true });
    const from = await grip(page, CV);
    await drag(page, from, { x: from.x + 700, y: 4000 });
    const before = (await box(page, CV))!;
    await page.evaluate(() => document.addEventListener('click', (event) => event.preventDefault(), true));
    const link = (await page.locator(CV).getByRole('link', { name: /Open as a page/ }).boundingBox())!;
    expect(link.y).toBeGreaterThan(796);
    await page.touchscreen.tap(link.x + 2, link.y + 2);
    await settle(page);
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('A');
    expect(await box(page, CV)).toEqual(before);
  });

  test('focus the shell gives after a click elsewhere, as on restoring from the dock, never moves it', async () => {
    const page = await desktop();
    // Right until 120 px of the title bar is left, the window's name off screen.
    const from = await grip(page, CV);
    await drag(page, from, { x: from.x + 2000, y: from.y });
    const before = (await box(page, CV))!;
    expect(before.x).toBe(1440 - 120);
    await page.getByRole('button', { name: 'Minimize CV' }).click();
    await settle(page);
    await page.locator('#os .dock-item[data-app="cv"]').click();
    await expect.poll(() => page.evaluate(() => document.activeElement?.matches('#os .window[data-view="cv"] .window-title') ?? false)).toBe(true);
    await settle(page);
    expect(await box(page, CV)).toEqual(before);
  });
});

describe('005-os-shell-FR-022: a window scrolls its own content, the desktop never scrolls', () => {
  test('the wheel over the CV window scrolls its content, not the page', async () => {
    const page = await desktop();
    const cv = (await box(page, CV))!;
    await page.mouse.move(cv.x + cv.width / 2, cv.y + cv.height / 2);
    await page.mouse.wheel(0, 800);
    await expect.poll(() => page.evaluate((selector) => document.querySelector(`${selector} .window-content`)!.scrollTop, CV)).toBeGreaterThan(0);
    expect(await page.evaluate(() => [window.scrollY, document.documentElement.scrollHeight - document.documentElement.clientHeight])).toEqual([0, 0]);
  });
});

describe('005-os-shell-FR-023: closing a window removes it, and the menu bar follows', () => {
  test("closing removes the window and its dock mark; the menu bar shows the next window's name, then the site name", async () => {
    const page = await desktop();
    await openAbout(page);
    await page.getByRole('button', { name: 'Close About this site' }).click();
    await settle(page);
    await expect.poll(() => page.locator(ABOUT).count()).toBe(0);
    expect((await page.locator('#menu-title-app').textContent())?.trim()).toBe('CV');
    await page.getByRole('button', { name: 'Close CV' }).click();
    await settle(page);
    await expect.poll(() => page.locator('#os .window').count()).toBe(0);
    expect(await page.locator('#os .dock-item[data-app="cv"]').getAttribute('aria-label')).toBe('CV');
    expect((await page.locator('#os .menu-bar span.menu-title').textContent())?.trim()).toBe(resume.basics!.name);
  });
});

describe('005-os-shell-FR-061: windows resize from every edge, down to 400 × 300', () => {
  test('each edge and the bottom-right corner resize, never below 400 × 300, and the CV reflows with no horizontal scroll', async () => {
    const page = await desktop();
    for (const edge of ['e', 'w', 'n', 's']) {
      const before = (await box(page, CV))!;
      const handle = centre((await box(page, `${CV} .resize-${edge}`))!);
      const inward = { e: { x: -80, y: 0 }, w: { x: 80, y: 0 }, n: { x: 0, y: 40 }, s: { x: 0, y: -40 } }[edge]!;
      await drag(page, handle, { x: handle.x + inward.x, y: handle.y + inward.y });
      const after = (await box(page, CV))!;
      expect(before.width - after.width + before.height - after.height, edge).toBe(Math.abs(inward.x) + Math.abs(inward.y));
    }
    // The bottom edge dragged down passes behind the dock, to the screen's bottom.
    const bottom = centre((await box(page, `${CV} .resize-s`))!);
    await drag(page, bottom, { x: bottom.x, y: 2000 });
    const taller = (await box(page, CV))!;
    expect(taller.y + taller.height).toBeGreaterThan(900 - 104);
    expect(taller.height).toBeLessThanOrEqual(764);
    const corner = centre((await box(page, `${CV} .resize-se`))!);
    await drag(page, corner, { x: 0, y: 0 });
    const smallest = (await box(page, CV))!;
    expect({ width: smallest.width, height: smallest.height }).toEqual({ width: 400, height: 300 });
    expect(await page.evaluate((selector) => {
      const content = document.querySelector(`${selector} .window-content`)!;
      return content.scrollWidth - content.clientWidth;
    }, CV)).toBe(0);
  });
});

describe('005-os-shell-FR-063: minimizing hides a window, which stays open', () => {
  test('the window hides, the dock mark goes hollow, and the Window menu notes it', async () => {
    const page = await desktop();
    await page.getByRole('button', { name: 'Minimize CV' }).click();
    await settle(page);
    expect(await page.locator(CV).isVisible()).toBe(false);
    expect(await page.locator(CV).count()).toBe(1);
    expect(await page.locator('#os .dock-item[data-app="cv"]').getAttribute('class')).toContain('is-minimized');
    await page.click('#menu-title-window');
    expect(await page.getByRole('menuitemradio', { name: 'CV (minimized)' }).count()).toBe(1);
  });
});

describe('005-os-shell-FR-064: a minimized window comes back where it was', () => {
  test('from the dock, the Window menu and, for About, the site menu: the same box, in front and focused', async () => {
    const page = await desktop();
    await openAbout(page);
    const about = (await box(page, ABOUT))!;
    const cv = (await box(page, CV))!;
    await page.getByRole('button', { name: 'Minimize CV' }).click();
    await settle(page);
    await page.locator('#os .dock-item[data-app="cv"]').click();
    expect(await box(page, CV)).toEqual(cv);
    expect(await page.locator(CV).getAttribute('aria-current')).toBe('true');
    expect(await focusedElement(page)).toMatch(/^div#window-title-cv/);
    await page.getByRole('button', { name: 'Minimize CV' }).click();
    await settle(page);
    await page.click('#menu-title-window');
    await page.getByRole('menuitemradio', { name: 'CV (minimized)' }).click();
    expect(await box(page, CV)).toEqual(cv);
    expect(await frontWindow(page)).toBe('cv');
    // About is behind the CV: bring it forward, minimize it, and open it
    // again from the site menu.
    await page.click('#menu-title-window');
    await page.getByRole('menuitemradio', { name: 'About this site' }).click();
    await page.getByRole('button', { name: 'Minimize About this site' }).click();
    await settle(page);
    expect(await page.locator(ABOUT).isVisible()).toBe(false);
    await openAbout(page);
    expect(await box(page, ABOUT)).toEqual(about);
    expect(await page.locator(ABOUT).getAttribute('aria-current')).toBe('true');
  });
});

describe('005-os-shell-FR-065: maximize fills the desktop between the menu bar and the dock', () => {
  test('it fills the area, its control becomes Restore CV, restoring brings the box back, and drags do nothing meanwhile', async () => {
    const page = await desktop();
    const before = (await box(page, CV))!;
    await page.getByRole('button', { name: 'Maximize CV' }).click();
    const area = (await box(page, '#os .desktop-area'))!;
    expect(await box(page, CV)).toEqual(area);
    expect(await page.getByRole('button', { name: 'Restore CV' }).count()).toBe(1);
    const from = await grip(page, CV);
    await drag(page, from, { x: from.x + 200, y: from.y + 200 });
    expect(await box(page, CV)).toEqual(area);
    expect(await page.locator(`${CV} .resize-handle`).count()).toBe(0);
    await resize(page, 1200, 800);
    await expect.poll(async () => box(page, CV)).toEqual(await box(page, '#os .desktop-area'));
    await resize(page, 1440, 900);
    await expect.poll(async () => box(page, CV)).toEqual(area);
    await page.getByRole('button', { name: 'Restore CV' }).click();
    expect(await box(page, CV)).toEqual(before);
  });
});
