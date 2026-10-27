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
    expect(await page.locator('#os .dock-item').evaluateAll((items) => items.map((item) => item.getAttribute('data-app')))).toEqual(['cv']);
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
