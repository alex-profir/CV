// About this site's spec view (FR-011, contracts/inspector.md The spec
// view): About has "Show specs" as an app does, and its view is the shell's
// own, listing what the menu bar, the dock, the windows' frames, the home
// screen and the inspector's own controls carry.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { fill, siteText } from '../../src/site-text.ts';
import { axNodes } from '../helpers/ax.ts';
import { leaveSpecs, openView, readView, requirementData, showSpecs, specViewSelector, viewSelector } from '../helpers/inspector.ts';
import type { InspectorShell } from '../helpers/inspector.ts';
import { openShell, settle } from '../helpers/shell.ts';
import { SHELL_PAGE } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 180_000 });

const SHELLS: readonly InspectorShell[] = ['desktop', 'mobile'];
const text = siteText.inspector;
const ABOUT = siteText.os.views.about;

// The IDs the shell's own parts carry in the page, as found there.
const carriedIn = (page: Page, selector: string) =>
  page.evaluate(
    (within) => [...new Set([...document.querySelectorAll(within)].flatMap((root) => [root, ...root.querySelectorAll('[data-req]')]).flatMap((element) => (element.getAttribute('data-req') ?? '').split(/\s+/).filter(Boolean)))],
    selector,
  );

const listed = async (page: Page) => (await readView(page, 'about')).flatMap((group) => group.requirements.map((requirement) => requirement.fullId));

describe('007-requirement-inspector-FR-011: About this site shows the shell\'s own specs', () => {
  for (const shell of SHELLS) {
    test(`${shell}: About has Show specs for About this site, and its view is the shell's, headed and named for it`, async () => {
      const data = requirementData();
      const page = await openShell(SHELL_PAGE[shell]);
      await openView(page, 'about', shell);
      const view = viewSelector('about', shell);
      expect(await page.locator(view).getByRole('button', { name: fill(text.showName, { view: ABOUT }), exact: true }).count()).toBe(1);

      // What the shell's parts carry, before the view replaces About's content.
      const parts = shell === 'desktop' ? '#os .menu-bar, #os .dock, #os .window .title-bar' : `#os .full-screen .app-header`;
      const own = await carriedIn(page, parts);
      let home: string[] = [];
      if (shell === 'mobile') {
        await page.locator('#os .full-screen .home-button').tap();
        await page.waitForSelector('#os .home', { state: 'visible' });
        home = await carriedIn(page, '#os .home');
        await openView(page, 'about', shell);
      }

      await showSpecs(page, 'about', shell);
      const spec = specViewSelector('about');
      const [region] = await axNodes(page, spec);
      expect(region?.role).toBe('region');
      expect(region?.name).toBe(fill(text.region, { view: text.shellName }));
      expect((await page.locator(`${spec} h1.spec-heading`).innerText()).trim()).toBe(fill(text.heading, { view: text.shellName }));
      expect((await page.locator(`${spec} p.spec-lede`).innerText()).replace(/\s+/g, ' ').trim()).toBe(text.ledeShell);

      const ids = await listed(page);
      expect(ids).toEqual(data.views.shell);
      // The menu bar, the dock and the windows' frames, or the full-screen
      // header and the home screen, and the inspector's own control.
      expect(own.length + home.length).toBeGreaterThan(0);
      for (const id of [...own, ...home]) expect(ids, `${shell}: carried by the shell's parts`).toContain(id);
      if (shell === 'mobile') expect(home.length, 'the home screen carries requirements').toBeGreaterThan(0);
      expect(ids.some((id) => id.startsWith('005-os-shell-'))).toBe(true);
      expect(ids).toContain('007-requirement-inspector-FR-001');
      // None of the CV's content alone: what only the CV app carries.
      const cvOnly = data.views.cv!.filter((id) => !data.views.shell!.includes(id));
      expect(cvOnly.length).toBeGreaterThan(0);
      for (const id of cvOnly) expect(ids, `${shell}: only the CV carries it`).not.toContain(id);
    });
  }

  test('desktop: the window title reads About this site · Specs, Back to About this site returns to About, and its menu has Show specs first', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await openView(page, 'about', 'desktop');
    const items = () => page.locator('#menu-app [role^="menuitem"]').evaluateAll((list) => list.map((item) => (item.querySelector('.label')?.textContent ?? '').trim()));
    await page.click('#menu-title-app');
    expect((await items())[0]).toBe(text.show);
    await page.keyboard.press('Escape');
    await settle(page);

    await showSpecs(page, 'about', 'desktop');
    expect((await page.locator(`${viewSelector('about', 'desktop')} .window-title`).innerText()).replace(/\s+/g, ' ').trim()).toBe(fill(text.windowTitle, { view: ABOUT }));
    const back = page.locator(`${specViewSelector('about')} button.spec-back`);
    expect((await back.innerText()).trim()).toBe(fill(text.back, { view: ABOUT }));
    await page.click('#menu-title-app');
    expect((await items())[0]).toBe(fill(text.back, { view: ABOUT }));
    await page.keyboard.press('Escape');
    await settle(page);

    await leaveSpecs(page, 'about', 'desktop');
    expect(await page.locator(`${viewSelector('about', 'desktop')} button.show-specs`).isVisible()).toBe(true);
    expect((await page.locator(`${viewSelector('about', 'desktop')} .window-title`).innerText()).trim()).toBe(ABOUT);
  });

  test('mobile: the header names About this site · Specs, and Back to About this site returns to About', async () => {
    const page = await openShell(SHELL_PAGE.mobile);
    await showSpecs(page, 'about', 'mobile');
    const [node] = await axNodes(page, viewSelector('about', 'mobile'));
    expect(node?.name).toBe(fill(text.windowTitle, { view: ABOUT }));
    await leaveSpecs(page, 'about', 'mobile');
    expect(await page.locator(`${viewSelector('about', 'mobile')} button.show-specs`).isVisible()).toBe(true);
  });
});
