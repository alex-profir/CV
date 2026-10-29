// WCAG 2.2 A and AA in every inspector state of both shells, and zoomed,
// text-zoomed or with text spacing (FR-024, SC-007). axe runs through the
// site check's accessibility part, sideways scroll through its layout
// part, and clipping and overlap in the view by the check below.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { axeProblems } from '../../../../tools/site-check/src/parts/accessibility.ts';
import { horizontalScroll, TEXT_SPACING_CSS, zoomText } from '../../../../tools/site-check/src/parts/layout.ts';
import { openView, scrollerSelector, showSpecs, specViewSelector, viewSelector } from '../helpers/inspector.ts';
import type { InspectorShell, InspectorView } from '../helpers/inspector.ts';
import { openShell, settle } from '../helpers/shell.ts';
import type { ShellOptions } from '../helpers/shell.ts';
import { SHELL_PAGE } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 300_000 });

async function openWhatsThis(page: Page, view: InspectorView, shell: InspectorShell): Promise<void> {
  const button = page.locator(`${specViewSelector(view)} button.whats-this`);
  if (shell === 'desktop') await button.click();
  else await button.tap();
  await settle(page);
}

type State = { name: string; reach: (page: Page, shell: InspectorShell) => Promise<void> };

const STATES: readonly State[] = [
  { name: 'cv-specs', reach: (page, shell) => showSpecs(page, 'cv', shell) },
  {
    name: 'cv-specs-whats-this',
    reach: async (page, shell) => {
      await showSpecs(page, 'cv', shell);
      await openWhatsThis(page, 'cv', shell);
    },
  },
  { name: 'terminal-specs', reach: (page, shell) => showSpecs(page, 'terminal', shell) },
  { name: 'about-specs', reach: (page, shell) => showSpecs(page, 'about', shell) },
];

describe('007-requirement-inspector-FR-024: axe finds nothing in any inspector state (SC-007)', () => {
  for (const shell of ['desktop', 'mobile'] as const) {
    for (const state of STATES) {
      test(`${shell}, ${state.name}`, async () => {
        const page = await openShell(SHELL_PAGE[shell]);
        await state.reach(page, shell);
        expect(await axeProblems(page, '/', `${shell}/${state.name}`)).toEqual([]);
      });
    }
  }

  test('desktop, the Terminal\'s specs beside the CV showing the CV', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await openView(page, 'cv', 'desktop');
    await showSpecs(page, 'terminal', 'desktop');
    expect(await page.locator(`${viewSelector('cv', 'desktop')}`).isVisible()).toBe(true);
    expect(await page.locator(specViewSelector('cv')).count()).toBe(0);
    expect(await axeProblems(page, '/', 'desktop/terminal-specs-beside-cv')).toEqual([]);
  });
});

// What a zoomed or spaced view must not do, inside its window or full-screen
// view: show text past the scroller's sides, cut off a box's content or a
// control's text, or draw text over other text in the part of the view
// that shows. Visually hidden text is left out.
function viewProblems(page: Page, view: InspectorView, shell: InspectorShell): Promise<string[]> {
  return page.evaluate(
    ([scrollerSelector, specSelector]) => {
      const found: string[] = [];
      const describe = (element: Element) => `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}`;
      const scroller = document.querySelector(scrollerSelector)!;
      const edge = scroller.getBoundingClientRect();
      const hidden = (element: Element) => {
        for (let current: Element | null = element; current !== null; current = current.parentElement) {
          const box = current.getBoundingClientRect();
          if (box.width <= 1 || box.height <= 1) return true;
        }
        return false;
      };
      const view = document.querySelector(specSelector)!;
      const barBottom = view.querySelector('.spec-bar')!.getBoundingClientRect().bottom;
      for (const element of [view, ...view.querySelectorAll('*')]) {
        if (hidden(element) || element.closest('[hidden]') !== null) continue;
        const style = getComputedStyle(element);
        const clips = [style.overflowX, style.overflowY].some((value) => value === 'hidden' || value === 'clip');
        if (clips && (element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1)) found.push(`${describe(element)} cuts off its content`);
        if (element.tagName === 'BUTTON' && (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1)) found.push(`${describe(element)} "${(element.textContent ?? '').trim()}" cuts off its text`);
      }
      const lines: { element: Element; rect: DOMRect }[] = [];
      const walker = document.createTreeWalker(view, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const parent = node.parentElement;
        if (parent === null || (node.textContent ?? '').trim() === '' || hidden(parent) || parent.closest('[hidden]') !== null) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) {
          if (rect.width <= 0.5 || rect.height <= 0.5) continue;
          if (rect.right > edge.right + 0.5 || rect.left < edge.left - 0.5) found.push(`${describe(parent)} "${(node.textContent ?? '').trim().slice(0, 30)}" is past the view's side`);
          // Only what shows in the scroller now: text scrolled under the
          // sticky bar, which is opaque, is hidden by it, as designed.
          // A line partly under it counts by the part that shows.
          const top = Math.max(rect.top, parent.closest('.spec-bar') === null ? barBottom : edge.top);
          if (rect.bottom > top && rect.top < edge.bottom) lines.push({ element: parent, rect: new DOMRect(rect.x, top, rect.width, rect.bottom - top) });
        }
      }
      for (let a = 0; a < lines.length; a += 1) {
        for (let b = a + 1; b < lines.length; b += 1) {
          const [one, other] = [lines[a]!, lines[b]!];
          if (one.element === other.element) continue;
          const x = Math.min(one.rect.right, other.rect.right) - Math.max(one.rect.left, other.rect.left);
          const y = Math.min(one.rect.bottom, other.rect.bottom) - Math.max(one.rect.top, other.rect.top);
          if (x > 1 && y > 1) found.push(`${describe(other.element)} overlaps ${describe(one.element)}`);
        }
      }
      return [...new Set(found)];
    },
    [scrollerSelector(view, shell), specViewSelector(view)] as const,
  );
}

async function expectEveryPartVisible(page: Page, shell: InspectorShell, label: string): Promise<void> {
  await settle(page);
  expect(await horizontalScroll(page, '/', label), label).toEqual([]);
  expect(await viewProblems(page, 'cv', shell), label).toEqual([]);
  // And further down, past the first screen.
  await page.locator(scrollerSelector('cv', shell)).evaluate((element) => element.scrollTo(0, element.scrollHeight / 2));
  await settle(page);
  expect(await viewProblems(page, 'cv', shell), `${label}, scrolled`).toEqual([]);
}

// Each zoom, as a page size and scale, in the shell the size gives: both
// are narrower than the desktop shell's 1024 px, so the phone's.
const ZOOMS: { name: string; options: ShellOptions }[] = [
  { name: '200% zoom of 1440 × 900', options: { ...SHELL_PAGE.mobile, width: 720, height: 450, deviceScaleFactor: 2 } },
  { name: '400% zoom of 1280 × 1024', options: { ...SHELL_PAGE.mobile, width: 320, height: 256, deviceScaleFactor: 4 } },
];

describe('007-requirement-inspector-FR-024: zoomed, text-zoomed and spaced, the view\'s text is neither clipped nor overlapping', () => {
  for (const zoom of ZOOMS) {
    test(zoom.name, async () => {
      const page = await openShell(zoom.options);
      await showSpecs(page, 'cv', 'mobile');
      await openWhatsThis(page, 'cv', 'mobile');
      await expectEveryPartVisible(page, 'mobile', zoom.name);
      expect(await axeProblems(page, '/', zoom.name)).toEqual([]);
    });
  }

  for (const shell of ['desktop', 'mobile'] as const) {
    test(`${shell}: text-only 200%`, async () => {
      const page = await openShell(SHELL_PAGE[shell]);
      await showSpecs(page, 'cv', shell);
      await openWhatsThis(page, 'cv', shell);
      await zoomText(page, 2);
      await expectEveryPartVisible(page, shell, `${shell}, text 200%`);
    });

    test(`${shell}: text spacing`, async () => {
      const page = await openShell(SHELL_PAGE[shell]);
      await page.addStyleTag({ content: TEXT_SPACING_CSS });
      await showSpecs(page, 'cv', shell);
      await openWhatsThis(page, 'cv', shell);
      await expectEveryPartVisible(page, shell, `${shell}, text spacing`);
    });
  }
});
