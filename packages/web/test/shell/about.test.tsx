// About this site (FR-038): a window on the desktop, opened from the site
// menu, and full screen on a phone.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { resume, siteData } from '@cv/content';
import { fixture } from '../helpers/fixtures.ts';
import { openShell, serveShellFixture } from '../helpers/shell.ts';

vi.setConfig({ testTimeout: 240_000 });

const ABOUT = '#os .window[data-view="about"]';

async function openAboutWindow(page: Page): Promise<void> {
  await page.click('#menu-title-site');
  await page.getByRole('menuitem', { name: 'About this site' }).click();
  await page.locator(ABOUT).waitFor();
}

// The view's heading, paragraph and links.
const content = (page: Page, root: string) =>
  page.evaluate((selector) => {
    const view = document.querySelector(`${selector} .about-view`)!;
    return {
      heading: view.querySelector('h1')?.textContent?.trim(),
      paragraph: view.querySelector('p')?.textContent?.trim(),
      links: [...view.querySelectorAll('.about-links a')].map((link) => [link.textContent?.trim(), link.getAttribute('href')]),
    };
  }, root);

const paragraph = (name: string) =>
  `This is ${name}'s CV, presented as a small operating system that runs in the browser. It was built spec first: every feature has a public spec, a reviewed design and tests that trace back to its requirements.`;

describe('005-os-shell-FR-038: About this site says what the site is and links to /cv and the source', () => {
  test('on the desktop it opens from the site menu as a window listed in the Window menu, with no dock item', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    await openAboutWindow(page);
    expect(await page.locator(ABOUT).getAttribute('aria-current')).toBe('true');
    expect(await page.locator('#os .dock-item').evaluateAll((items) => items.map((item) => item.getAttribute('data-app')))).toEqual(['cv', 'terminal', 'playground']);
    await page.click('#menu-title-window');
    expect(await page.getByRole('menuitemradio', { name: 'About this site' }).count()).toBe(1);
    await page.keyboard.press('Escape');
    expect(await content(page, ABOUT)).toEqual({
      heading: 'About this site',
      paragraph: paragraph(resume.basics!.name!),
      links: [
        ['Open the CV as a page', '/cv'],
        ['Source code, specs and history on GitHub', siteData.repository],
      ],
    });
  });

  test('the name in the paragraph comes from the CV document', async () => {
    const changed = { ...fixture('every-field') };
    const { url } = await serveShellFixture({ resume: changed });
    const page = await openShell({ width: 1440, height: 900, url });
    await openAboutWindow(page);
    expect((await content(page, ABOUT)).paragraph).toBe(paragraph(changed.basics!.name!));
  });
});

describe('005-os-shell-FR-038: on a phone, About this site opens full screen', () => {
  test('from the home screen, with the same header and Home as an app, its text and both links, and no shortcut list', async () => {
    const page = await openShell({ width: 375, height: 812, hasTouch: true });
    await page.locator('#os .home .about').tap();
    const view = '#os .full-screen[data-view="about"]';
    await page.locator(view).waitFor();
    expect((await page.locator(`${view} .app-title`).textContent())?.trim()).toBe('About this site');
    expect(await page.locator(`${view} .home-button`).isVisible()).toBe(true);
    expect(await content(page, view)).toEqual({
      heading: 'About this site',
      paragraph: paragraph(resume.basics!.name!),
      links: [
        ['Open the CV as a page', '/cv'],
        ['Source code, specs and history on GitHub', siteData.repository],
      ],
    });
    expect(await page.locator(`${view} .shortcuts, ${view} .about-shortcuts`).count()).toBe(0);
  });
});

describe('005-os-shell-FR-029: About this site on the desktop lists the eight shortcuts', () => {
  const shortcuts = (page: Page) =>
    page.locator(`${ABOUT} .about-shortcuts`).evaluate((section) => ({
      heading: section.querySelector('h2')?.textContent?.trim(),
      entries: [...section.querySelectorAll('dl > div')].map((entry) => [entry.querySelector('dt')?.textContent?.trim(), entry.querySelector('dd')?.textContent?.trim()]),
      notes: [...section.querySelectorAll('p.note')].map((note) => note.textContent?.trim()),
      req: section.getAttribute('data-req'),
    }));

  test('in SHORTCUTS order with the two notes, as Alt+Shift off a Mac and Option+Shift on one', async () => {
    for (const [platform, modifier] of [
      ['Windows', 'Alt'],
      ['macOS', 'Option'],
    ] as const) {
      const page = await openShell({ width: 1440, height: 900, platform });
      await openAboutWindow(page);
      expect(await shortcuts(page), platform).toEqual({
        heading: 'Keyboard shortcuts',
        entries: [
          [`${modifier}+Shift+M`, 'Go to the menu bar'],
          [`${modifier}+Shift+D`, 'Go to the dock'],
          [`${modifier}+Shift+N`, 'Next window'],
          [`${modifier}+Shift+W`, 'Close window'],
          [`${modifier}+Shift+H`, 'Minimize window'],
          [`${modifier}+Shift+F`, 'Maximize or restore window'],
          [`${modifier}+Shift+P`, 'Move window'],
          [`${modifier}+Shift+S`, 'Resize window'],
        ],
        notes: ['On a Mac, use Option+Shift in place of Alt+Shift.', 'In menus and the dock, use the arrow keys, Enter and Escape.'],
        req: '005-os-shell-FR-029',
      });
      await page.context().close();
    }
  });
});
