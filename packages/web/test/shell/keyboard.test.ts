// The desktop by keyboard alone (spec US4), at 1440 × 900: every action of
// US2 by keys, with a visible indicator at each step and no trap.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { tokenValue } from '@cv/tokens';
import { clipOf, decodePng, indicatorPixels } from '../../../../tools/site-check/src/parts/keyboard.ts';
import { box, focusedElement, focusIndicator, frontWindow, openShell, press } from '../helpers/shell.ts';
import type { Box } from '../helpers/shell.ts';

vi.setConfig({ testTimeout: 180_000 });

const CV = '#os .window[data-view="cv"]';
const ABOUT = '#os .window[data-view="about"]';
const STEP = Number.parseFloat(tokenValue('space.4'));
const BIG_STEP = Number.parseFloat(tokenValue('space.16'));

const desktop = () => openShell({ width: 1440, height: 900 });

const status = (page: Page) => page.locator('#os [role="status"]');

// The view of the window that holds focus, or null.
const focusedWindow = (page: Page) => page.evaluate(() => document.activeElement?.closest('#os .window')?.getAttribute('data-view') ?? null);

// Whether focus is on the element the selector names.
const focusIs = (page: Page, selector: string) => page.evaluate((target) => document.activeElement?.matches(target) ?? false, selector);
const expectFocus = (page: Page, selector: string) => expect.poll(() => focusIs(page, selector), { message: selector }).toBe(true);

const SITE = '#os .menu-title[data-menu="site"]';
const CV_TITLE = `${CV} .window-title`;
const ABOUT_TITLE = `${ABOUT} .window-title`;
const CV_DOCK = '#os .dock-item[data-app="cv"]';
const PAD_FIRST = '#os .pad button.pad-up';

const current = (page: Page) => page.locator('#os .window[aria-current="true"]').getAttribute('data-view');

// The focused element has a visible indicator (FR-024). Inside an open
// menu, blurring would close the menu, so the item is compared with itself
// while the next item has focus instead.
async function expectIndicator(page: Page, step: string): Promise<void> {
  const inMenu = await page.evaluate(() => document.activeElement?.closest('#os .menu') !== null && document.activeElement?.closest('#os .menu') !== undefined);
  if (!inMenu) {
    const indicator = await focusIndicator(page);
    expect(indicator.ok, `${step}: ${await focusedElement(page)} ${JSON.stringify(indicator)}`).toBe(true);
    return;
  }
  const outline = Number.parseFloat(tokenValue('border.thick'));
  const rect = (await page.evaluate(() => {
    const r = document.activeElement!.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  })) as Box;
  const clip = clipOf(page, rect, outline + 2)!;
  const focused = await page.screenshot({ clip, animations: 'disabled', caret: 'hide' });
  await press(page, 'ArrowDown');
  const other = await page.screenshot({ clip, animations: 'disabled', caret: 'hide' });
  await press(page, 'ArrowUp');
  const scale = decodePng(focused).width / clip.width;
  const changed = indicatorPixels(decodePng(other), decodePng(focused)) / (scale * scale);
  expect(changed, `${step}: ${await focusedElement(page)}`).toBeGreaterThan(0);
}

async function openAboutByKeys(page: Page): Promise<void> {
  await press(page, 'Alt+Shift+M', 'Enter');
  await expect.poll(() => focusedElement(page)).toMatch(/About this site/);
  await press(page, 'Enter');
  await page.locator(ABOUT).waitFor();
}

describe('005-os-shell-FR-024: every desktop action works by keys alone, with a visible indicator', () => {
  test('menus, About, switching, moving, resizing, maximizing, minimizing, restoring and closing', async () => {
    const page = await desktop();
    await press(page, 'Tab');
    expect(await focusIs(page, SITE)).toBe(true);
    await expectIndicator(page, 'menu bar');
    await press(page, 'Enter');
    await expect.poll(() => focusedElement(page)).toMatch(/About this site/);
    await expectIndicator(page, 'site menu');
    await press(page, 'Enter');
    await page.locator(ABOUT).waitFor();
    await expectFocus(page, ABOUT_TITLE);
    await expectIndicator(page, 'About opened');
    await press(page, 'Alt+Shift+N');
    await expectFocus(page, CV_TITLE);
    await expectIndicator(page, 'next window');
    await press(page, 'Alt+Shift+P');
    await expectFocus(page, PAD_FIRST);
    await expectIndicator(page, 'move pad');
    await press(page, 'ArrowRight', 'Enter');
    await expectFocus(page, CV_TITLE);
    await expectIndicator(page, 'moved');
    await press(page, 'Alt+Shift+S');
    await expectFocus(page, PAD_FIRST);
    await press(page, 'ArrowDown', 'Enter');
    await expectFocus(page, CV_TITLE);
    await expectIndicator(page, 'resized');
    await press(page, 'Alt+Shift+F');
    await expect.poll(() => page.locator(CV).getAttribute('data-maximized')).toBe('');
    await expectIndicator(page, 'maximized');
    await press(page, 'Alt+Shift+F');
    await expect.poll(() => page.locator(CV).getAttribute('data-maximized')).toBeNull();
    await press(page, 'Alt+Shift+H');
    await expect.poll(() => page.locator(CV).isHidden()).toBe(true);
    await expectFocus(page, ABOUT_TITLE);
    await expectIndicator(page, 'minimized');
    await press(page, 'Alt+Shift+D');
    await expectFocus(page, CV_DOCK);
    await expectIndicator(page, 'dock');
    await press(page, 'Enter');
    await expectFocus(page, CV_TITLE);
    await expectIndicator(page, 'restored from the dock');
    await press(page, 'Alt+Shift+W');
    await expect.poll(() => page.locator(CV).count()).toBe(0);
    await expectFocus(page, ABOUT_TITLE);
    await expectIndicator(page, 'closed the CV');
    await press(page, 'Alt+Shift+W');
    await expect.poll(() => page.locator(ABOUT).count()).toBe(0);
    await expectFocus(page, SITE);
    await expectIndicator(page, 'closed About');
  });

  test('a shortcut pressed after a click shows the indicator where focus lands', async () => {
    const page = await desktop();
    await openAboutByKeys(page);
    for (const [keys, target] of [['Alt+Shift+M', SITE], ['Alt+Shift+D', '#os .dock-item'], ['Alt+Shift+N', '#os .window .window-title']] as const) {
      await page.locator(`${CV} .title-bar`).click();
      await press(page, keys);
      await expectFocus(page, target);
      await expectIndicator(page, `${keys} after a click`);
    }
  });

  // Where glyph advances are whole pixels, as on Linux, a title can be an
  // odd whole width, so centering it by half its width put it half a pixel
  // off the grid and drew its outline too faint (found by CI). Odd and even
  // widths are forced here, so any platform shows it.
  test("a window title's indicator is visible whatever its width", async () => {
    const page = await desktop();
    await openAboutByKeys(page);
    for (const width of [95, 96]) {
      await page.addStyleTag({ content: `#os .window-title { inline-size: ${width}px !important; }` });
      await press(page, 'Alt+Shift+N');
      await expectFocus(page, '#os .window .window-title');
      await expectIndicator(page, `a ${width} px title`);
    }
  });
});

describe('005-os-shell-FR-025: shortcuts and the Window menu reach the menu bar, the dock and the next window', () => {
  test('from inside the CV content, Alt+Shift+M, D and N, and the Window menu commands', async () => {
    const page = await desktop();
    await openAboutByKeys(page);
    const intoContent = async () => {
      await page.locator(`${CV} .window-content a`).first().focus();
      expect(await focusedWindow(page)).toBe('cv');
    };
    await intoContent();
    await press(page, 'Alt+Shift+M');
    await expectFocus(page, SITE);
    await intoContent();
    await press(page, 'Alt+Shift+D');
    await expectFocus(page, CV_DOCK);
    await intoContent();
    await press(page, 'Alt+Shift+N');
    await expectFocus(page, ABOUT_TITLE);

    const windowMenu = async (item: string) => {
      await press(page, 'Alt+Shift+M', 'End', 'Enter');
      await expect.poll(() => page.locator('#menu-window').count()).toBe(1);
      await page.getByRole('menuitem', { name: item }).focus();
      await press(page, 'Enter');
    };
    await windowMenu('Go to the dock');
    await expectFocus(page, CV_DOCK);
    await windowMenu('Go to the menu bar');
    await expectFocus(page, SITE);
  });
});

describe('005-os-shell-FR-026: Alt+Shift+N goes to the next window and brings it to the front', () => {
  test('two windows alternate, each focused and in front in turn', async () => {
    const page = await desktop();
    await openAboutByKeys(page);
    expect(await current(page)).toBe('about');
    expect(await frontWindow(page)).toBe('about');
    for (const expected of ['cv', 'about', 'cv']) {
      await press(page, 'Alt+Shift+N');
      await expect.poll(() => current(page)).toBe(expected);
      expect(await frontWindow(page)).toBe(expected);
      expect(await focusedWindow(page)).toBe(expected);
    }
  });
});

describe('005-os-shell-FR-021 005-os-shell-FR-067: a keyboard move past the edge stays where the visitor put it', () => {
  test('confirming leaves the window past the edge, and a new move starts from there', async () => {
    const page = await desktop();
    await page.locator(CV_TITLE).focus();
    await press(page, 'Alt+Shift+P', ...Array.from({ length: 20 }, () => 'Shift+ArrowRight'));
    const moved = (await box(page, CV))!;
    expect(moved.x).toBe(1440 - 120);
    await press(page, 'Enter');
    await expect.poll(() => page.locator(`${CV} .pad`).count()).toBe(0);
    await expectFocus(page, CV_TITLE);
    expect(await box(page, CV)).toEqual(moved);
    await press(page, 'Alt+Shift+P');
    await expect.poll(() => page.locator(`${CV} .pad`).count()).toBe(1);
    expect(await box(page, CV)).toEqual(moved);
    await press(page, 'Escape');
    await expect.poll(() => page.locator(`${CV} .pad`).count()).toBe(0);
    expect(await box(page, CV)).toEqual(moved);
  });
});

describe('005-os-shell-FR-027: a keyboard move steps the window, announces it, and Escape puts it back', () => {
  test('Alt+Shift+P, arrows and Enter move and announce; Escape returns to the start', async () => {
    const page = await desktop();
    await page.locator(CV_TITLE).focus();
    const start = (await box(page, CV))!;
    await press(page, 'Alt+Shift+P');
    await expect.poll(() => page.locator(`${CV} .pad`).count()).toBe(1);
    await press(page, 'ArrowRight', 'ArrowRight', 'Shift+ArrowDown', 'Enter');
    await expect.poll(() => page.locator(`${CV} .pad`).count()).toBe(0);
    const moved = (await box(page, CV))!;
    expect({ dx: moved.x - start.x, dy: moved.y - start.y }).toEqual({ dx: 2 * STEP, dy: BIG_STEP });
    await expect.poll(() => status(page).textContent()).toBe('CV moved.');
    await press(page, 'Alt+Shift+P', 'ArrowLeft', 'ArrowUp', 'Escape');
    await expect.poll(() => page.locator(`${CV} .pad`).count()).toBe(0);
    expect(await box(page, CV)).toEqual(moved);
    await expect.poll(() => status(page).textContent()).toBe('Move cancelled.');
    await expectFocus(page, CV_TITLE);
  });

  test('Enter on Cancel puts the window back, and Enter on Done confirms', async () => {
    const page = await desktop();
    await page.locator(CV_TITLE).focus();
    const start = (await box(page, CV))!;
    await press(page, 'Alt+Shift+P', 'ArrowRight', 'ArrowRight');
    await page.locator(`${CV} .pad-cancel`).focus();
    await press(page, 'Enter');
    await expect.poll(() => page.locator(`${CV} .pad`).count()).toBe(0);
    expect(await box(page, CV)).toEqual(start);
    await expect.poll(() => status(page).textContent()).toBe('Move cancelled.');
    await press(page, 'Alt+Shift+P', 'ArrowRight');
    await page.locator(`${CV} .pad-done`).focus();
    await press(page, 'Enter');
    await expect.poll(() => page.locator(`${CV} .pad`).count()).toBe(0);
    expect((await box(page, CV))!.x - start.x).toBe(STEP);
    await expect.poll(() => status(page).textContent()).toBe('CV moved.');
  });
});

describe('005-os-shell-FR-028: the focused window closes by Alt+Shift+W or from its close control', () => {
  test('the shortcut closes it; Tab reaches the close control, and Enter and Space each close', async () => {
    const page = await desktop();
    await page.locator(CV_TITLE).focus();
    await press(page, 'Alt+Shift+W');
    await expect.poll(() => page.locator(CV).count()).toBe(0);
    for (const key of ['Enter', 'Space']) {
      await press(page, 'Alt+Shift+D', 'Enter');
      await expectFocus(page, CV_TITLE);
      await press(page, 'Tab');
      expect(await focusIs(page, `${CV} .control-close[aria-label="Close CV"]`)).toBe(true);
      await press(page, key);
      await expect.poll(() => page.locator(CV).count(), { message: key }).toBe(0);
    }
  });
});

describe('005-os-shell-FR-030: Tab reaches the menu bar, every window and the dock, in order, without a trap', () => {
  test('Tab and Shift+Tab go round the whole desktop within the page’s element count', async () => {
    const page = await desktop();
    await openAboutByKeys(page);
    const limit = await page.evaluate(() => document.querySelectorAll('#os *').length);
    for (const key of ['Tab', 'Shift+Tab']) {
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      const reached = new Set<string>();
      for (let presses = 0; presses < limit && reached.size < 4; presses += 1) {
        await press(page, key);
        const where = await page.evaluate(() => {
          const active = document.activeElement;
          if (active?.closest('#os .menu-bar')) return 'menu-bar';
          if (active?.closest('#os .dock')) return 'dock';
          return active?.closest('#os .window')?.getAttribute('data-view') ?? null;
        });
        if (where !== null) reached.add(where);
      }
      expect([...reached].sort(), key).toEqual(['about', 'cv', 'dock', 'menu-bar']);
    }
  });

  test('inside the CV, focus follows reading order; Tab into a window behind brings it to the front', async () => {
    const page = await desktop();
    await page.locator(CV_TITLE).focus();
    // Through the CV content to the window's end, each step later in the document.
    await page.evaluate(() => Object.assign(window, { visited: [] as Element[] }));
    for (;;) {
      await press(page, 'Tab');
      if ((await focusedWindow(page)) !== 'cv') break;
      await page.evaluate(() => (window as unknown as { visited: Element[] }).visited.push(document.activeElement!));
    }
    const order = await page.evaluate(() => {
      const visited = (window as unknown as { visited: Element[] }).visited;
      return visited.slice(1).map((element, index) => Boolean(visited[index]!.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING));
    });
    expect(order.length).toBeGreaterThanOrEqual(5);
    expect(order.every(Boolean)).toBe(true);

    await openAboutByKeys(page);
    expect(await frontWindow(page)).toBe('about');
    // About is first in the DOM, so Tab from its last element goes to the CV, behind it.
    await page.locator(ABOUT_TITLE).focus();
    for (let presses = 0; presses < 50 && (await focusedWindow(page)) !== 'cv'; presses += 1) await press(page, 'Tab');
    expect(await focusedWindow(page)).toBe('cv');
    await expect.poll(() => current(page)).toBe('cv');
    expect(await frontWindow(page)).toBe('cv');
  });
});

describe('005-os-shell-FR-062: a keyboard resize steps the window, announces it, and Escape restores it', () => {
  test('Alt+Shift+S, arrows and Enter resize and announce; Escape restores', async () => {
    const page = await desktop();
    await page.locator(CV_TITLE).focus();
    const start = (await box(page, CV))!;
    await press(page, 'Alt+Shift+S', 'ArrowLeft', 'ArrowUp', 'Enter');
    await expect.poll(() => page.locator(`${CV} .pad`).count()).toBe(0);
    const resized = (await box(page, CV))!;
    expect({ dw: resized.width - start.width, dh: resized.height - start.height }).toEqual({ dw: -STEP, dh: -STEP });
    await expect.poll(() => status(page).textContent()).toBe(`CV resized to ${resized.width} by ${resized.height}.`);
    await press(page, 'Alt+Shift+S', 'Shift+ArrowLeft', 'Escape');
    await expect.poll(() => page.locator(`${CV} .pad`).count()).toBe(0);
    expect(await box(page, CV)).toEqual(resized);
    await expect.poll(() => status(page).textContent()).toBe('Resize cancelled.');
  });

  test('Enter on Cancel restores the size', async () => {
    const page = await desktop();
    await page.locator(CV_TITLE).focus();
    const start = (await box(page, CV))!;
    await press(page, 'Alt+Shift+S', 'ArrowLeft', 'ArrowUp');
    await page.locator(`${CV} .pad-cancel`).focus();
    await press(page, 'Enter');
    await expect.poll(() => page.locator(`${CV} .pad`).count()).toBe(0);
    expect(await box(page, CV)).toEqual(start);
    await expect.poll(() => status(page).textContent()).toBe('Resize cancelled.');
  });

  test('minimizing the last window shown moves focus to its dock item, and Enter there restores it', async () => {
    const page = await desktop();
    await page.locator(CV_TITLE).focus();
    await press(page, 'Alt+Shift+H');
    await expect.poll(() => page.locator(CV).isHidden()).toBe(true);
    await expectFocus(page, `${CV_DOCK}[aria-label="CV, minimized"]`);
    await press(page, 'Enter');
    await expect.poll(() => page.locator(CV).isVisible()).toBe(true);
    await expectFocus(page, CV_TITLE);
  });
});

describe('… (SC-002)', () => {
  test('from first load, the open CV window is reached in at most 3 presses', async () => {
    const page = await desktop();
    let presses = 0;
    while (presses < 3 && (await focusedWindow(page)) !== 'cv') {
      await press(page, 'Tab');
      presses += 1;
    }
    expect(await focusedWindow(page)).toBe('cv');
    expect(presses).toBeLessThanOrEqual(3);
  });
});
