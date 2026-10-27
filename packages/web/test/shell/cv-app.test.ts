// The CV app (FR-006 to FR-009): /cv's CV, laid out by its window or view,
// with a link to /cv.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { resume } from '@cv/content';
import { axText, headingOutline } from '../helpers/ax.ts';
import { openPage } from '../helpers/browser.ts';
import { fixture } from '../helpers/fixtures.ts';
import { serveBuilt } from '../helpers/site.ts';
import { openShell, serveShellFixture } from '../helpers/shell.ts';

vi.setConfig({ testTimeout: 240_000 });

const WINDOW_CV = '#os .window[data-view="cv"] .cv';
const PHONE_CV = '#os .full-screen[data-view="cv"] .cv';

async function openPhoneCv(options: { width: number; height: number; url?: string; cpuThrottling?: number }): Promise<Page> {
  const page = await openShell({ ...options, hasTouch: true });
  await page.locator('#os .app-icon[data-view="cv"]').tap();
  await page.locator(PHONE_CV).waitFor();
  return page;
}

// Whether every element of the CV ends inside its container.
const overflowing = (page: Page, container: string) =>
  page.evaluate((selector) => {
    const root = document.querySelector(selector)!;
    const right = root.getBoundingClientRect().right;
    return [...root.querySelectorAll('*')]
      .filter((element) => element.getClientRects().length > 0 && element.getBoundingClientRect().right > right + 0.5)
      .map((element) => element.tagName.toLowerCase());
  }, container);

// Whether the CV's sections lay their heading beside their entries.
const twoColumns = (page: Page, cv: string) =>
  page.evaluate((selector) => {
    const section = document.querySelector(`${selector} > section`)!;
    const head = section.querySelector('.section-head')!.getBoundingClientRect();
    const body = section.querySelector('.section-body')!.getBoundingClientRect();
    return head.right <= body.left && Math.abs(head.top - body.top) < 2;
  }, cv);

describe('005-os-shell-FR-006: the CV app shows the same CV as /cv', () => {
  test("in each shell, the CV app's text is /cv's main text", async () => {
    const { url } = await serveBuilt();
    const cvPage = await openPage(`${url}/cv`, { width: 1440 });
    const [expected] = await axText(cvPage, 'main');
    expect(expected!.length).toBeGreaterThan(200);
    const desktop = await openShell({ width: 1440, height: 900, url });
    expect(await axText(desktop, WINDOW_CV)).toEqual([expected]);
    const phone = await openPhoneCv({ width: 375, height: 812, url });
    expect(await axText(phone, PHONE_CV)).toEqual([expected]);
  });
});

describe('005-os-shell-FR-007: the CV app links to /cv to print or share', () => {
  test('the link reads as the design sets and goes to /cv, in both shells', async () => {
    const desktop = await openShell({ width: 1440, height: 900 });
    const link = desktop.locator('#os .window[data-view="cv"] .cv-app a.standalone').first();
    expect((await link.textContent())?.trim()).toBe('Open as a page to print or share');
    expect(await link.getAttribute('href')).toBe('/cv');
    const phone = await openPhoneCv({ width: 375, height: 812 });
    const phoneLink = phone.locator('#os .full-screen .cv-app a.standalone').first();
    expect((await phoneLink.textContent())?.trim()).toBe('Open as a page to print or share');
    expect(await phoneLink.getAttribute('href')).toBe('/cv');
  });

  test('Ctrl-click and middle-click open /cv in a new tab, leaving the shell as it was', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    const link = page.locator('#os .window[data-view="cv"] .cv-app a.standalone').first();
    for (const click of [() => link.click({ modifiers: ['ControlOrMeta'] }), () => link.click({ button: 'middle' })]) {
      const [tab] = await Promise.all([page.context().waitForEvent('page'), click()]);
      await tab.waitForURL(/\/cv$/);
      expect(new URL(tab.url()).pathname).toBe('/cv');
      expect(new URL(page.url()).pathname).toBe('/');
      await tab.close();
    }
  });
});

describe('005-os-shell-FR-008: the CV fits its window or view at any width', () => {
  test('full screen at 320 px there is no horizontal scroll', async () => {
    const page = await openPhoneCv({ width: 320, height: 640 });
    const scroll = await page.evaluate(() => {
      const view = document.querySelector('#os .full-screen .view-content')!;
      return { view: view.scrollWidth - view.clientWidth, page: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    expect(scroll).toEqual({ view: 0, page: 0 });
    expect(await overflowing(page, PHONE_CV)).toEqual([]);
  });

  test('a 120-character word stays in its column, full screen and in a window', async () => {
    const { url } = await serveShellFixture({ resume: fixture('long-words') });
    const phone = await openPhoneCv({ width: 320, height: 640, url });
    expect(await overflowing(phone, PHONE_CV)).toEqual([]);
    const desktop = await openShell({ width: 1024, height: 640, url });
    expect(await overflowing(desktop, WINDOW_CV)).toEqual([]);
  });

  test("two columns while the window's content is 900 px wide or more, one below", async () => {
    const desktop = await openShell({ width: 1024, height: 640 });
    const width = await desktop.evaluate(() => document.querySelector('#os .window .window-content')!.clientWidth);
    expect(width).toBeGreaterThanOrEqual(900);
    expect(await twoColumns(desktop, WINDOW_CV)).toBe(true);
    const phone = await openPhoneCv({ width: 812, height: 375 });
    expect(await twoColumns(phone, PHONE_CV)).toBe(false);
  });
});

function checkOutline(outline: { level: number; name: string }[], name: string): void {
  expect(outline.filter((heading) => heading.level === 1).map((heading) => heading.name)).toEqual([name]);
  expect(outline[0]).toEqual({ level: 1, name });
  expect(outline.filter((heading) => heading.level === 2).length).toBeGreaterThan(2);
  expect(outline.filter((heading) => heading.level === 3).length).toBeGreaterThan(2);
  for (let index = 1; index < outline.length; index += 1) expect(outline[index]!.level - outline[index - 1]!.level, JSON.stringify(outline[index])).toBeLessThanOrEqual(1);
}

describe('005-os-shell-FR-009: the CV keeps its heading outline in both shells', () => {
  test('one h1 with the name, an h2 per section, h3 per entry, no level skipped', async () => {
    const desktop = await openShell({ width: 1440, height: 900 });
    checkOutline(await headingOutline(desktop), resume.basics!.name!);
    const phone = await openPhoneCv({ width: 375, height: 812 });
    checkOutline(await headingOutline(phone), resume.basics!.name!);
  });

  test('with no name in the CV, the h1 is CV', async () => {
    const { url } = await serveShellFixture({ resume: fixture('no-name') });
    const desktop = await openShell({ width: 1440, height: 900, url });
    expect((await headingOutline(desktop)).filter((heading) => heading.level === 1).map((heading) => heading.name)).toEqual(['CV']);
    const phone = await openPhoneCv({ width: 375, height: 812, url });
    expect((await headingOutline(phone)).filter((heading) => heading.level === 1).map((heading) => heading.name)).toEqual(['CV']);
  });
});

describe('005-os-shell-FR-006: the CV is quick to reach on a phone (SC-003)', () => {
  test("at 375 px with the CPU four times slower, the CV's h1 is visible within 1 s of the tap", async () => {
    const page = await openShell({ width: 375, height: 812, hasTouch: true, cpuThrottling: 4 });
    const start = Date.now();
    await page.locator('#os .app-icon[data-view="cv"]').tap();
    await page.locator(`${PHONE_CV} h1`).waitFor({ state: 'visible' });
    expect(Date.now() - start).toBeLessThan(1000);
  });
});

describe('005-os-shell-FR-008: the CV fits a narrowed window', () => {
  async function narrow(url?: string): Promise<Page> {
    const page = await openShell({ width: 1440, height: 900, ...(url === undefined ? {} : { url }) });
    const handle = (await page.locator('#os .window[data-view="cv"] .resize-e').boundingBox())!;
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(0, handle.y + handle.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForFunction(() => Math.round(document.querySelector('#os .window[data-view="cv"]')!.getBoundingClientRect().width) === 400);
    return page;
  }

  test('at 400 px wide the CV window has no horizontal scroll', async () => {
    const page = await narrow();
    expect(await page.evaluate(() => {
      const content = document.querySelector('#os .window[data-view="cv"] .window-content')!;
      return content.scrollWidth - content.clientWidth;
    })).toBe(0);
    expect(await overflowing(page, WINDOW_CV)).toEqual([]);
  });

  test('a 120-character word stays in its column at 400 px wide', async () => {
    const { url } = await serveShellFixture({ resume: fixture('long-words') });
    const page = await narrow(url);
    expect(await overflowing(page, WINDOW_CV)).toEqual([]);
  });
});
