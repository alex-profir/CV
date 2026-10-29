// WCAG 2.2 A and AA in every FR-035 state of both shells, and zoomed or
// with text spacing (FR-035). axe runs through the site check's
// accessibility part; sideways scroll through its layout part, and the
// Terminal's own parts by the check below.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { axeProblems } from '../../../../tools/site-check/src/parts/accessibility.ts';
import { horizontalScroll, TEXT_SPACING_CSS, zoomText } from '../../../../tools/site-check/src/parts/layout.ts';
import { settle } from '../helpers/shell.ts';
import { openTerminalPage, runGroup, TERMINAL_STATES, terminalInState } from '../helpers/terminal.ts';
import type { TerminalShell } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 300_000 });

describe('006-terminal-FR-035: axe finds nothing in any Terminal state', () => {
  for (const shell of ['desktop', 'mobile'] as const) {
    for (const state of TERMINAL_STATES[shell]) {
      test(`${shell}, ${state.name}`, async () => {
        const page = await terminalInState(shell, state);
        expect(await axeProblems(page, '/', `${shell}/${state.name}`)).toEqual([]);
      });
    }
  }
});

// Each zoom, as a page size and scale, in the shell the size gives: both
// are narrower than the desktop shell's 1024 px, so the phone's.
const ZOOMS: { name: string; shell: TerminalShell; options: { width: number; height: number; deviceScaleFactor: number } }[] = [
  { name: '200% zoom of 1440 × 900', shell: 'mobile', options: { width: 720, height: 450, deviceScaleFactor: 2 } },
  { name: '400% zoom of 1280 × 1024', shell: 'mobile', options: { width: 320, height: 256, deviceScaleFactor: 4 } },
];

// What a zoomed or spaced Terminal must not do: scroll the page sideways;
// show text past its window or screen, or wider than its own scroll box;
// cut off a control's text; or draw its fixed parts (the header or title
// bar, the case, the screen, the keys) over each other or off the page.
// Output scrolled out of the screen's view, and visually hidden status
// text, are not shown, so not checked.
function terminalProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const found: string[] = [];
    const describe = (element: Element) => `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}`;
    const terminal = document.querySelector('#os .terminal')!;
    const frame = (terminal.closest('.window') ?? terminal.closest('.full-screen'))!;
    const edge = frame.getBoundingClientRect();
    const shown = (element: Element) => element.getClientRects().length > 0 && element.closest('.visually-hidden, [hidden]') === null;
    for (const element of terminal.querySelectorAll('*')) {
      if (!shown(element)) continue;
      const ownText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '');
      const rect = element.getBoundingClientRect();
      if (ownText && (rect.left < edge.left - 0.5 || rect.right > edge.right + 0.5)) found.push(`${describe(element)} reaches past the ${Math.round(edge.width)}px frame`);
      if (element.scrollWidth > element.clientWidth + 1 && getComputedStyle(element).overflowX !== 'visible') found.push(`${describe(element)} is ${element.scrollWidth}px wide in ${element.clientWidth}px`);
    }
    for (const control of frame.querySelectorAll('button')) {
      if (!shown(control)) continue;
      if (control.scrollWidth > control.clientWidth + 1 || control.scrollHeight > control.clientHeight + 1) found.push(`${describe(control)} "${(control.textContent ?? '').trim()}" cuts off its text`);
    }
    const parts = ['.title-bar', '.app-header', '.pocket-case', '.pocket-screen', '.pocket-keys', '.pocket-foot']
      .flatMap((selector) => [...frame.querySelectorAll(selector)])
      .filter(shown)
      .map((element) => ({ element, rect: element.getBoundingClientRect() }));
    for (const { element, rect } of parts) {
      if (rect.top < -0.5 || rect.bottom > window.innerHeight + 0.5 || rect.left < -0.5 || rect.right > window.innerWidth + 0.5) found.push(`${describe(element)} is off the page`);
    }
    for (let a = 0; a < parts.length; a += 1) {
      for (let b = a + 1; b < parts.length; b += 1) {
        const [one, other] = [parts[a]!.rect, parts[b]!.rect];
        if (Math.min(one.right, other.right) - Math.max(one.left, other.left) > 1 && Math.min(one.bottom, other.bottom) - Math.max(one.top, other.top) > 1) found.push(`${describe(parts[a]!.element)} overlaps ${describe(parts[b]!.element)}`);
      }
    }
    return found;
  });
}

async function expectEveryPartVisible(page: Page, label: string): Promise<void> {
  await settle(page);
  expect(await horizontalScroll(page, '/', label), label).toEqual([]);
  expect(await terminalProblems(page), label).toEqual([]);
}

describe('006-terminal-FR-035: zoomed, text-zoomed and spaced, every part stays visible', () => {
  for (const zoom of ZOOMS) {
    test(zoom.name, async () => {
      const page = await openTerminalPage(zoom.shell, { ...zoom.options, hasTouch: zoom.shell === 'mobile' });
      await runGroup(page, 'help');
      await runGroup(page, 'touch mine; ls -l');
      await expectEveryPartVisible(page, zoom.name);
      expect(await axeProblems(page, '/', zoom.name)).toEqual([]);
    });
  }

  for (const shell of ['desktop', 'mobile'] as const) {
    test(`${shell}: text-only 200%`, async () => {
      const page = await openTerminalPage(shell);
      await runGroup(page, 'help');
      await runGroup(page, 'touch mine; ls -l');
      await zoomText(page, 2);
      await expectEveryPartVisible(page, `${shell}, text 200%`);
    });

    test(`${shell}: text spacing`, async () => {
      const page = await openTerminalPage(shell);
      await page.addStyleTag({ content: TEXT_SPACING_CSS });
      await runGroup(page, 'help');
      await runGroup(page, 'touch mine; ls -l');
      await expectEveryPartVisible(page, `${shell}, text spacing`);
    });
  }
});
