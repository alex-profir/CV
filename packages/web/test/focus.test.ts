// Keyboard reach, order and a visible focus indicator for every link, using
// the site check's keyboard part (research R15).
import { describe, expect, test, vi } from 'vitest';
import { keyboardProblems } from '../../../tools/site-check/src/parts/keyboard.ts';
import { focusSelectors } from '../src/os/focus.ts';
import type { App } from '../src/apps/index.ts';
import { APPS } from '../src/apps/index.ts';
import { openHtml, openPage } from './helpers/browser.ts';
import { fixture } from './helpers/fixtures.ts';
import { serveBuilt, serveFixture } from './helpers/site.ts';

vi.setConfig({ testTimeout: 180_000 });

describe('004-cv-page-FR-029: every link is reached by keyboard in reading order, with a visible indicator, and is not covered', () => {
  test('the real CV and the not-found page at 375 and 1440 px', async () => {
    const { url } = await serveBuilt();
    for (const target of ['/cv', '/missing-page']) {
      for (const width of [375, 1440]) {
        const page = await openPage(`${url}${target}`, { width });
        expect(await keyboardProblems(page, target, `${width}px`), `${target} ${width}px`).toEqual([]);
        await page.context().close();
      }
    }
  });

  test('every-field.json, with a link of every kind, at 375 and 1440 px', async () => {
    const { url } = await serveFixture(fixture('every-field'));
    for (const width of [375, 1440]) {
      const page = await openPage(`${url}/cv`, { width });
      expect(await keyboardProblems(page, '/cv', `${width}px`), `${width}px`).toEqual([]);
      await page.context().close();
    }
  });

  test('the keyboard part reports every link whose focus indicator is removed', async () => {
    const { url } = await serveBuilt();
    const page = await openPage(`${url}/cv`, { width: 1440 });
    await page.addStyleTag({ content: 'a:focus, a:focus-visible { outline: none !important; }' });
    const links = await page.locator('a[href]').count();
    const problems = await keyboardProblems(page, '/cv', '1440px');
    const missing = problems.filter((problem) => problem.type === 'no-focus-indicator');
    expect(missing).toHaveLength(links);
    expect(missing[0]).toMatchObject({ part: 'keyboard', page: '/cv', variant: '1440px' });
    expect(missing.map((problem) => problem.subject)).toContain('a[href="https://github.com/alex-profir"] "GitHub: alex-profir"');
  });
});

describe("006-terminal-FR-004: an app declaring focusOnOpen gets focus inside its content, and the title otherwise", () => {
  const Stub = () => null;
  const typing: App = { id: 'typing', name: 'Typing', shells: ['desktop', 'mobile'], needsNetwork: false, Icon: Stub, Content: Stub, focusOnOpen: '.field [data-focus-home]' };
  const apps = [...APPS, typing];
  const page = (inner: string) => `<div id="os">
    <div class="desktop"><section class="window" data-view="typing"><div class="title-bar"><div class="window-title" tabindex="-1">Typing</div></div><div class="window-content">${inner}</div></section>
    <section class="window" data-view="cv"><div class="title-bar"><div class="window-title" tabindex="-1">CV</div></div><div class="window-content"><input class="cv-input" data-focus-home></div></section></div>
    <div class="mobile"><section class="full-screen" data-view="typing"><header><div class="app-title" tabindex="-1">Typing</div></header><div class="view-content">${inner}</div></section></div>
  </div>`;
  // The first element a target's selectors find, as focusTarget moves focus to it.
  const resolve = (html: string, selectors: string[]) =>
    openHtml(html).then(async (opened) => {
      const found = await opened.evaluate((list) => {
        for (const selector of list) {
          const element = document.querySelector(selector);
          if (element !== null) return `${element.tagName.toLowerCase()}.${element.className}`;
        }
        return null;
      }, selectors);
      await opened.context().close();
      return found;
    });

  test('a window-title or mobile-title target for its view finds the matching element inside its content', async () => {
    const html = page('<div class="field"><input class="line" data-focus-home></div>');
    expect(await resolve(html, focusSelectors({ kind: 'window-title', view: 'typing' as never }, apps))).toBe('input.line');
    expect(await resolve(html, focusSelectors({ kind: 'mobile-title', view: 'typing' as never }, apps))).toBe('input.line');
  });

  test('with nothing matching, focus falls back to the title, as 005 sets', async () => {
    const html = page('<div class="field"><p>nothing to focus</p></div>');
    expect(await resolve(html, focusSelectors({ kind: 'window-title', view: 'typing' as never }, apps))).toBe('div.window-title');
    expect(await resolve(html, focusSelectors({ kind: 'mobile-title', view: 'typing' as never }, apps))).toBe('div.app-title');
  });

  test('the CV app and About this site, which declare none, still focus their titles', async () => {
    const html = page('');
    expect(focusSelectors({ kind: 'window-title', view: 'cv' }, apps)).toHaveLength(1);
    expect(await resolve(html, focusSelectors({ kind: 'window-title', view: 'cv' }, apps))).toBe('div.window-title');
    expect(focusSelectors({ kind: 'window-title', view: 'about' }, apps)).toHaveLength(1);
    expect(focusSelectors({ kind: 'dock-item', app: 'typing' }, apps)).toEqual(['#os .dock-item[data-app="typing"]']);
  });
});
