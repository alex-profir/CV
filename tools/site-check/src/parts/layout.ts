// The layout part's page measurements (research R19): horizontal scrolling,
// clipped or overlapping text, and whether the layout is one column, at the
// spec's widths, zoomed and with text spacing overridden (FR-020 to FR-022).
import type { Page } from 'playwright';
import type { Problem } from '../report.ts';

export type LayoutVariant = { variant: string; width: number; height: number; deviceScaleFactor: number; textSpacing: boolean };

// A 1280 px window at 200% is a 640 px viewport at scale 2, and at 400% a
// 320 px viewport at scale 4. Text spacing is checked at the desktop width.
export const LAYOUT_VARIANTS: readonly LayoutVariant[] = Object.freeze([
  ...[320, 375, 768, 1024, 1440, 2560].map((width) => ({ variant: `${width}px`, width, height: 900, deviceScaleFactor: 1, textSpacing: false })),
  { variant: '200%-zoom', width: 640, height: 450, deviceScaleFactor: 2, textSpacing: false },
  { variant: '400%-zoom', width: 320, height: 225, deviceScaleFactor: 4, textSpacing: false },
  { variant: 'text-spacing', width: 1440, height: 900, deviceScaleFactor: 1, textSpacing: true },
]);

// WCAG 2.2 success criterion 1.4.12's text spacing, on everything.
export const TEXT_SPACING_CSS = `
* {
  line-height: 1.5 !important;
  letter-spacing: 0.12em !important;
  word-spacing: 0.16em !important;
}
p, li, dd, dt, h1, h2, h3, h4, h5, h6 {
  margin-bottom: 2em !important;
}
`;

type Found = { type: string; subject: string; detail: string };

function problems(found: Found[], pageLabel: string, variant: string): Problem[] {
  const seen = new Set<string>();
  return found
    .filter(({ type, subject, detail }) => {
      const key = `${type} ${subject} ${detail}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((entry) => ({ part: 'layout' as const, page: pageLabel, variant, ...entry }));
}

// The document wider than the viewport, or a text box reaching past it.
export async function horizontalScroll(page: Page, pageLabel: string, variant: string): Promise<Problem[]> {
  const found = await page.evaluate(() => {
    const describe = (element: Element) => {
      const classes = typeof element.className === 'string' && element.className.trim() !== '' ? `.${element.className.trim().split(/\s+/).join('.')}` : '';
      return `${element.tagName.toLowerCase()}${classes}`;
    };
    const result: { type: string; subject: string; detail: string }[] = [];
    const root = document.documentElement;
    const width = root.clientWidth;
    if (root.scrollWidth > width) result.push({ type: 'horizontal-scroll', subject: 'document', detail: `${root.scrollWidth}px wide in a ${width}px viewport` });
    for (const element of document.body.querySelectorAll('*')) {
      const ownText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '');
      if (!ownText) continue;
      const box = element.getBoundingClientRect();
      if (box.width <= 1 && box.height <= 1) continue;
      const right = box.right + window.scrollX;
      const left = box.left + window.scrollX;
      if (right > width + 0.5 || left < -0.5) {
        result.push({ type: 'horizontal-scroll', subject: describe(element), detail: `reaches ${Math.round(left)}px to ${Math.round(right)}px in a ${width}px viewport` });
      }
    }
    return result;
  });
  return problems(found, pageLabel, variant);
}

// Content larger than a box that hides its overflow, and text drawn over
// other text. Boxes of 1 px or less, the visually hidden pattern, are left
// out.
export async function clippedOrOverlapping(page: Page, pageLabel: string, variant: string): Promise<Problem[]> {
  const found = await page.evaluate(() => {
    const describe = (element: Element) => {
      const classes = typeof element.className === 'string' && element.className.trim() !== '' ? `.${element.className.trim().split(/\s+/).join('.')}` : '';
      return `${element.tagName.toLowerCase()}${classes}`;
    };
    const result: { type: string; subject: string; detail: string }[] = [];
    const hidden = (element: Element) => {
      for (let current: Element | null = element; current !== null; current = current.parentElement) {
        const box = current.getBoundingClientRect();
        if (box.width <= 1 || box.height <= 1) return true;
      }
      return false;
    };
    for (const element of document.body.querySelectorAll('*')) {
      const style = getComputedStyle(element);
      const clips = [style.overflowX, style.overflowY].some((value) => value === 'hidden' || value === 'clip');
      if (!clips || hidden(element)) continue;
      if (element.scrollHeight > element.clientHeight + 1) {
        result.push({ type: 'clipped', subject: describe(element), detail: `content ${element.scrollHeight}px tall in a ${element.clientHeight}px box with overflow hidden` });
      } else if (element.scrollWidth > element.clientWidth + 1) {
        result.push({ type: 'clipped', subject: describe(element), detail: `content ${element.scrollWidth}px wide in a ${element.clientWidth}px box with overflow hidden` });
      }
    }

    // Each text node's line boxes, by the element holding it.
    const lines: { element: Element; rect: DOMRect }[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (parent === null || (node.textContent ?? '').trim() === '' || hidden(parent)) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) if (rect.width > 0.5 && rect.height > 0.5) lines.push({ element: parent, rect });
    }
    const reported = new Set<string>();
    for (let a = 0; a < lines.length; a += 1) {
      for (let b = a + 1; b < lines.length; b += 1) {
        const first = lines[a]!;
        const second = lines[b]!;
        if (first.element === second.element) continue;
        const overlapX = Math.min(first.rect.right, second.rect.right) - Math.max(first.rect.left, second.rect.left);
        const overlapY = Math.min(first.rect.bottom, second.rect.bottom) - Math.max(first.rect.top, second.rect.top);
        if (overlapX > 1 && overlapY > 1) {
          const key = `${describe(first.element)} ${describe(second.element)}`;
          if (reported.has(key)) continue;
          reported.add(key);
          result.push({ type: 'overlap', subject: describe(second.element), detail: `overlaps ${describe(first.element)}` });
        }
      }
    }
    return result;
  });
  return problems(found, pageLabel, variant);
}

// Two sibling blocks that each hold content, side by side. A block holds
// content when it has two or more elements with text, or 40 characters or
// more: a label and its value on one row are not two columns.
export async function isOneColumn(page: Page, pageLabel: string, variant: string): Promise<Problem[]> {
  const found = await page.evaluate(() => {
    const describe = (element: Element) => {
      const classes = typeof element.className === 'string' && element.className.trim() !== '' ? `.${element.className.trim().split(/\s+/).join('.')}` : '';
      return `${element.tagName.toLowerCase()}${classes}`;
    };
    const holdsContent = (element: Element) => {
      const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (text.length >= 40) return true;
      const withText = [element, ...element.querySelectorAll('*')].filter((child) =>
        [...child.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== ''),
      );
      return withText.length >= 2;
    };
    const result: { type: string; subject: string; detail: string }[] = [];
    for (const parent of document.body.querySelectorAll('*')) {
      const blocks = [...parent.children].filter((child) => {
        const display = getComputedStyle(child).display;
        const box = child.getBoundingClientRect();
        return !display.startsWith('inline') && display !== 'none' && box.width > 1 && box.height > 1 && holdsContent(child);
      });
      for (let a = 0; a < blocks.length; a += 1) {
        for (let b = a + 1; b < blocks.length; b += 1) {
          const first = blocks[a]!.getBoundingClientRect();
          const second = blocks[b]!.getBoundingClientRect();
          const overlapY = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
          const apartX = second.left >= first.right - 1 || first.left >= second.right - 1;
          if (overlapY > 1 && apartX) {
            result.push({ type: 'not-one-column', subject: describe(blocks[b]!), detail: `laid out beside ${describe(blocks[a]!)}` });
          }
        }
      }
    }
    return result;
  });
  return problems(found, pageLabel, variant);
}
