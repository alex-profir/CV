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
    // Text in a box of 1 px or less, the visually hidden pattern, isn't
    // drawn, however wide its own box.
    const hidden = (element: Element) => {
      for (let box: Element | null = element; box !== null; box = box.parentElement) {
        const rect = box.getBoundingClientRect();
        if (rect.width <= 1 && rect.height <= 1) return true;
      }
      return false;
    };
    for (const element of document.body.querySelectorAll('*')) {
      const ownText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '');
      if (!ownText) continue;
      const box = element.getBoundingClientRect();
      if (hidden(element)) continue;
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

// ---- The site root (005 contracts/cli.md Parts, FR-008, FR-048) ----------

// 004's variants on the root, named `<shell>/<state>/<width>px`: the shell
// the size gets (at least 1024 × 640 is the desktop), measured on its first
// state, or the variant's own name for zoom and text spacing.
export function rootLayoutVariant({ variant, width, height }: LayoutVariant): { shell: 'desktop' | 'mobile'; variant: string } {
  const shell = width >= 1024 && height >= 640 ? 'desktop' : 'mobile';
  const state = /^\d+px$/.test(variant) ? (shell === 'desktop' ? 'first-load' : 'home') : variant;
  return { shell, variant: `${shell}/${state}/${width}px` };
}

// Text in the element `root` names reaching past its box, and the box's
// content wider than the box: horizontal scrolling inside a window.
export async function boxScroll(page: Page, root: string, pageLabel: string, variant: string): Promise<Problem[]> {
  const found = await page.evaluate((target) => {
    const describe = (element: Element) => {
      const classes = typeof element.className === 'string' && element.className.trim() !== '' ? `.${element.className.trim().split(/\s+/).join('.')}` : '';
      return `${element.tagName.toLowerCase()}${classes}`;
    };
    const result: { type: string; subject: string; detail: string }[] = [];
    // As `horizontalScroll`: visually hidden text isn't drawn.
    const hidden = (element: Element) => {
      for (let box: Element | null = element; box !== null; box = box.parentElement) {
        const rect = box.getBoundingClientRect();
        if (rect.width <= 1 && rect.height <= 1) return true;
      }
      return false;
    };
    const box = document.querySelector(target);
    if (box === null) return [{ type: 'missing', subject: target, detail: 'not on the page' }];
    const edge = box.getBoundingClientRect();
    for (const element of [box, ...box.querySelectorAll('*')]) {
      if (element.scrollWidth > element.clientWidth + 1 && ['auto', 'scroll'].includes(getComputedStyle(element).overflowX)) {
        result.push({ type: 'horizontal-scroll', subject: describe(element), detail: `content ${element.scrollWidth}px wide in a ${element.clientWidth}px box, in a ${Math.round(edge.width)}px window` });
      }
      const ownText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '');
      if (!ownText) continue;
      const rect = element.getBoundingClientRect();
      if (hidden(element)) continue;
      if (rect.right > edge.right + 0.5 || rect.left < edge.left - 0.5) {
        result.push({ type: 'horizontal-scroll', subject: describe(element), detail: `reaches past the ${Math.round(edge.width)}px window` });
      }
    }
    return result;
  }, root);
  return problems(found, pageLabel, variant);
}

// Narrows the focused window as far as it goes by a keyboard resize, wide
// steps to the left until its width stops changing, then Enter. Its width
// afterwards.
export async function narrowWindow(page: Page, window: string): Promise<number> {
  const width = () => page.evaluate((target) => document.querySelector(target)?.getBoundingClientRect().width ?? 0, window);
  await page.click(`${window} .title-bar`);
  await page.keyboard.press('Alt+Shift+S');
  await page.locator(`${window} .pad`).waitFor({ timeout: 5_000 });
  for (let presses = 0, last = -1; presses < 40; presses += 1) {
    await page.keyboard.press('Shift+ArrowLeft');
    const now = await width();
    if (now === last) break;
    last = now;
  }
  await page.keyboard.press('Enter');
  await page.locator(`${window} .pad`).waitFor({ state: 'detached', timeout: 5_000 });
  return width();
}

// Text-only zoom, as Firefox's: each element's font size, as computed,
// multiplied. Chromium has no text-only zoom of its own.
export async function zoomText(page: Page, factor: number): Promise<void> {
  await page.evaluate((scale) => {
    const elements = [...document.querySelectorAll<HTMLElement>('body, body *')];
    const sizes = elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    elements.forEach((element, index) => element.style.setProperty('font-size', `${sizes[index]! * scale}px`, 'important'));
  }, factor);
}

// The desktop's labels: menu titles, dock names and window titles.
const DESKTOP_LABELS = ['#os .menu-title', '#os .dock-name', '#os .window-title'];

// Each label whose text a box hiding its overflow cuts off, or an ellipsis
// shortens.
export async function clippedLabels(page: Page, pageLabel: string, variant: string): Promise<Problem[]> {
  const found = await page.evaluate((labels) => {
    const describe = (element: Element) => {
      const classes = typeof element.className === 'string' && element.className.trim() !== '' ? `.${element.className.trim().split(/\s+/).join('.')}` : '';
      return `${element.tagName.toLowerCase()}${classes}`;
    };
    const result: { type: string; subject: string; detail: string }[] = [];
    const shown = labels.flatMap((selector) => [...document.querySelectorAll(selector)]).filter((element) => element.getClientRects().length > 0 && element.closest('[inert], [hidden]') === null);
    for (const element of shown) {
      const range = document.createRange();
      range.selectNodeContents(element);
      const rects = [...range.getClientRects()].filter((rect) => rect.width > 0.5 && rect.height > 0.5);
      for (let box: Element | null = element; box !== null && box !== document.body; box = box.parentElement) {
        const style = getComputedStyle(box);
        if (![style.overflowX, style.overflowY].some((value) => value === 'hidden' || value === 'clip')) continue;
        const edge = box.getBoundingClientRect();
        if (rects.some((rect) => rect.left < edge.left - 1 || rect.right > edge.right + 1 || rect.top < edge.top - 1 || rect.bottom > edge.bottom + 1)) {
          result.push({ type: 'clipped', subject: describe(element), detail: `its text is cut off by ${describe(box)}` });
          break;
        }
      }
      if (getComputedStyle(element).textOverflow === 'ellipsis' && element.scrollWidth > element.clientWidth + 1) result.push({ type: 'clipped', subject: describe(element), detail: 'its text is cut off with an ellipsis' });
    }
    return result;
  }, DESKTOP_LABELS);
  return problems(found, pageLabel, variant);
}
