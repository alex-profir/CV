// The shell's own words (FR-043, FR-066): site text in English with no CV
// fact, and the site name from the CV document, or CV without one.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { resume } from '@cv/content';
import { siteText } from '../../src/site-text.ts';
import { fixture } from '../helpers/fixtures.ts';
import { openShell, serveShellFixture } from '../helpers/shell.ts';

vi.setConfig({ testTimeout: 240_000 });

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

const SHELL_TEXT = strings([siteText.os, siteText.desktop, siteText.mobile, siteText.about, siteText.noScript]);

const ENGLISH = /^[\x20-\x7E–—·’↗…]*$/u;

// A site text pattern as a regular expression: each `{key}` stands for any
// text.
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const asPattern = (text: string) => new RegExp(`^${text.split(/\{\w+\}/).map(escape).join('.+')}$`, 's');

// Every label the shell shows or names outside the CV itself: the text of
// each leaf element and each `aria-label`.
const shellLabels = (page: Page) =>
  page.evaluate(() => {
    const labels: string[] = [];
    for (const element of document.querySelectorAll('#os *')) {
      if (element.closest('.cv') !== null || element.closest('[aria-hidden="true"]') !== null) continue;
      const label = element.getAttribute('aria-label');
      if (label !== null) labels.push(label);
      for (const node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent!.trim() !== '') labels.push(node.textContent!.trim());
      }
    }
    return labels;
  });

describe('005-os-shell-FR-043: every shell label is site text or CV text', () => {
  test('every value under os, desktop, mobile, about and noScript is English and holds no key fact of the real CV', () => {
    expect(SHELL_TEXT.length).toBeGreaterThan(60);
    const facts = [resume.basics?.name, resume.basics?.email, resume.basics?.location?.city, ...(resume.work ?? []).map((work) => work.name), ...(resume.projects ?? []).map((project) => project.name)].filter(
      (fact): fact is string => typeof fact === 'string' && fact !== '',
    );
    for (const value of SHELL_TEXT) {
      expect(value, value).toMatch(ENGLISH);
      for (const fact of facts) expect(value.toLowerCase(), value).not.toContain(fact.toLowerCase());
    }
  });

  test('every label in the rendered root, in both shells and with menus and About open, comes from site text or the CV', async () => {
    const patterns = [...strings(siteText), ...strings(resume)].map(asPattern);
    const known = (label: string) => patterns.some((pattern) => pattern.test(label)) || /^(?:Alt|Option)\+Shift\+[A-Z]$/.test(label);
    const desktop = await openShell({ width: 1440, height: 900 });
    await desktop.click('#menu-title-site');
    await desktop.getByRole('menuitem', { name: 'About this site' }).click();
    const seen = [...(await shellLabels(desktop))];
    for (const menu of ['site', 'app', 'window']) {
      await desktop.click(`#menu-title-${menu}`);
      seen.push(...(await shellLabels(desktop)));
      await desktop.keyboard.press('Escape');
    }
    const phone = await openShell({ width: 375, height: 812, hasTouch: true });
    seen.push(...(await shellLabels(phone)));
    await phone.locator('#os .home .about').tap();
    seen.push(...(await shellLabels(phone)));
    expect(seen.length).toBeGreaterThan(30);
    expect([...new Set(seen)].filter((label) => !known(label))).toEqual([]);
  });
});

describe('005-os-shell-FR-066: the shell names the site after the CV document', () => {
  async function names(url?: string): Promise<{ menuBar: string; title: string; home: string; about: string }> {
    const desktop = await openShell({ width: 1440, height: 900, ...(url === undefined ? {} : { url }) });
    await desktop.getByRole('button', { name: 'Close CV' }).click();
    const menuBar = (await desktop.locator('#os .menu-bar span.menu-title').textContent())!.trim();
    const title = await desktop.title();
    await desktop.click('#menu-title-site');
    await desktop.getByRole('menuitem', { name: 'About this site' }).click();
    const about = (await desktop.locator('#os .window[data-view="about"] .about-view p').first().textContent())!;
    const phone = await openShell({ width: 375, height: 812, ...(url === undefined ? {} : { url }) });
    const home = (await phone.locator('#os .site-name').textContent())!.trim();
    return { menuBar, title, home, about };
  }

  test("the menu bar with no window focused, the title, the home screen and About this site show the CV's name", async () => {
    const name = resume.basics!.name!;
    const shown = await names();
    expect(shown.menuBar).toBe(name);
    expect(shown.title).toBe(name);
    expect(shown.home).toBe(name);
    expect(shown.about).toContain(`This is ${name}'s CV`);
  });

  test('with no name in the CV document, they show CV', async () => {
    const { url } = await serveShellFixture({ resume: fixture('no-name') });
    const shown = await names(url);
    expect(shown.menuBar).toBe('CV');
    expect(shown.title).toBe('CV');
    expect(shown.home).toBe('CV');
    expect(shown.about).toContain("This is CV's CV");
  });
});
