// "What's this?" (FR-009, contracts/inspector.md The spec view): a toggle in
// the spec view's bar opens a panel above the heading, with the same site
// text in every view and a link to the repository; it starts closed.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { siteData } from '@cv/content';
import { siteText } from '../../src/site-text.ts';
import { leaveSpecs, scrollerSelector, showSpecs, specViewSelector } from '../helpers/inspector.ts';
import type { InspectorShell, InspectorView } from '../helpers/inspector.ts';
import { openShell, settle } from '../helpers/shell.ts';
import type { Box } from '../helpers/shell.ts';
import { SHELL_PAGE } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 180_000 });

const VIEWS: readonly InspectorView[] = ['cv', 'terminal', 'about'];
const whatsThis = siteText.inspector.whatsThis;

const button = (page: Page, view: InspectorView) => page.locator(`${specViewSelector(view)} button.whats-this`);
const panel = (page: Page, view: InspectorView) => page.locator(`${specViewSelector(view)} section.whats-this-panel`);

async function toggle(page: Page, view: InspectorView, shell: InspectorShell): Promise<void> {
  if (shell === 'desktop') await button(page, view).click();
  else await button(page, view).tap();
  await settle(page);
}

// The panel as a visitor reads it: its heading, its paragraphs other than
// the chain, the chain's shown labels and its spoken form, and its link.
const readPanel = (page: Page, view: InspectorView) =>
  panel(page, view).evaluate((section) => {
    const words = (element: Element | null) => (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const chain = section.querySelector('p.chain');
    const link = section.querySelector('a');
    return {
      heading: words(section.querySelector('h2')),
      paragraphs: [...section.querySelectorAll('p:not(.chain)')].map(words),
      chain: words(chain?.querySelector('[aria-hidden="true"]') ?? null)
        .split('›')
        .map((label) => label.trim()),
      chainSpoken: words(chain?.querySelector('.visually-hidden') ?? null),
      link: { text: words(link), href: link?.getAttribute('href') ?? null },
      all: words(section),
    };
  });

// Boxes in the scroller's content, so scrolling doesn't move them.
const boxIn = (page: Page, view: InspectorView, shell: InspectorShell, selector: string) =>
  page.evaluate(
    ({ scroller, target }) => {
      const content = document.querySelector(scroller)!;
      const element = document.querySelector(target);
      if (element === null || element.getClientRects().length === 0) return null;
      const rect = element.getBoundingClientRect();
      const origin = content.getBoundingClientRect();
      return { x: rect.x - origin.x, y: rect.y - origin.y + content.scrollTop, width: rect.width, height: rect.height };
    },
    { scroller: scrollerSelector(view, shell), target: selector },
  );

const meet = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

describe('007-requirement-inspector-FR-009: "What\'s this?" opens and closes a panel above the heading', () => {
  for (const shell of ['desktop', 'mobile'] as const) {
    test(`${shell}: it toggles aria-expanded and the panel, which pushes the heading down by its height and covers nothing`, async () => {
      const page = await openShell(SHELL_PAGE[shell]);
      await showSpecs(page, 'cv', shell);
      const view = specViewSelector('cv');
      expect(await button(page, 'cv').getAttribute('aria-expanded')).toBe('false');
      expect(await panel(page, 'cv').isHidden()).toBe(true);
      expect(await button(page, 'cv').getAttribute('aria-controls')).toBe(await panel(page, 'cv').getAttribute('id'));
      const closed = (await boxIn(page, 'cv', shell, `${view} h1.spec-heading`))!;

      await toggle(page, 'cv', shell);
      expect(await button(page, 'cv').getAttribute('aria-expanded')).toBe('true');
      expect(await panel(page, 'cv').isVisible()).toBe(true);
      const open = (await boxIn(page, 'cv', shell, `${view} h1.spec-heading`))!;
      const shown = (await boxIn(page, 'cv', shell, `${view} section.whats-this-panel`))!;
      // Above the heading, and the heading lower by at least the panel's height.
      expect(shown.y + shown.height).toBeLessThanOrEqual(open.y + 0.5);
      expect(open.y - closed.y).toBeGreaterThanOrEqual(shown.height - 0.5);
      // It overlaps nothing else in the view: the bar, the heading, the lede,
      // the build line and the first group.
      for (const other of ['.spec-bar', 'h1.spec-heading', 'p.spec-lede', 'p.spec-build', 'section.spec-group']) {
        const rect = await boxIn(page, 'cv', shell, `${view} ${other}`);
        if (rect !== null) expect(meet(shown, rect), other).toBe(false);
      }
      // Its own centre is its own: nothing lies on it.
      expect(
        await panel(page, 'cv').evaluate((section) => {
          section.scrollIntoView({ block: 'center' });
          const rect = section.getBoundingClientRect();
          const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
          return hit !== null && section.contains(hit);
        }),
      ).toBe(true);

      await toggle(page, 'cv', shell);
      expect(await button(page, 'cv').getAttribute('aria-expanded')).toBe('false');
      expect(await panel(page, 'cv').isHidden()).toBe(true);
      expect((await boxIn(page, 'cv', shell, `${view} h1.spec-heading`))!.y).toBeCloseTo(closed.y, 0);
    });
  }
});

describe('007-requirement-inspector-FR-009: the panel holds the same site text in every view, and links to the repository', () => {
  test('in the CV, Terminal and About views its text is siteText.inspector.whatsThis, and its link siteData.repository', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    const read: Awaited<ReturnType<typeof readPanel>>[] = [];
    for (const view of VIEWS) {
      await showSpecs(page, view, 'desktop');
      await toggle(page, view, 'desktop');
      expect((await button(page, view).innerText()).trim(), view).toBe(whatsThis.button);
      const panelRead = await readPanel(page, view);
      expect(panelRead.heading, view).toBe(whatsThis.heading);
      expect(panelRead.paragraphs, view).toEqual([...whatsThis.paragraphs]);
      expect(panelRead.chain, view).toEqual([...whatsThis.chain]);
      expect(panelRead.chainSpoken, view).toBe(whatsThis.chainSpoken);
      expect(panelRead.link, view).toEqual({ text: whatsThis.repository, href: siteData.repository });
      read.push(panelRead);
    }
    expect(read[1]!.all).toBe(read[0]!.all);
    expect(read[2]!.all).toBe(read[0]!.all);
  });

  test('it is closed again after Back and Show specs', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await showSpecs(page, 'cv', 'desktop');
    await toggle(page, 'cv', 'desktop');
    expect(await button(page, 'cv').getAttribute('aria-expanded')).toBe('true');
    await leaveSpecs(page, 'cv', 'desktop');
    await showSpecs(page, 'cv', 'desktop');
    expect(await button(page, 'cv').getAttribute('aria-expanded')).toBe('false');
    expect(await panel(page, 'cv').isHidden()).toBe(true);
  });
});
