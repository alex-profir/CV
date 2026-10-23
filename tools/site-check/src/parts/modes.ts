// The modes part's page measurements (FR-030, FR-031): with forced colors,
// separators, links and the focus outline stay visible and nothing relies on
// a background image; and no element moves, with or without reduced motion.
import type { Page } from 'playwright';
import type { Problem } from '../report.ts';

type Found = { type: string; subject: string; detail: string };

function problems(found: Found[], pageLabel: string, variant: string): Problem[] {
  const seen = new Set<string>();
  return found
    .filter(({ type, subject }) => {
      const key = `${type} ${subject}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((entry) => ({ part: 'modes' as const, page: pageLabel, variant, ...entry }));
}

// On a page opened with forced colors active. A decoration with no text that
// is drawn only with a background color disappears, because forced colors
// replace backgrounds: it needs a border. Links need an underline, as a text
// decoration or a bottom border, and a focus outline.
export async function forcedColorsProblems(page: Page, pageLabel: string): Promise<Problem[]> {
  const found = await page.evaluate(() => {
    const describe = (element: Element, pseudo = '') => {
      const classes = typeof element.className === 'string' && element.className.trim() !== '' ? `.${element.className.trim().split(/\s+/).join('.')}` : '';
      return `${element.tagName.toLowerCase()}${classes}${pseudo}`;
    };
    const sides = ['top', 'right', 'bottom', 'left'];
    const border = (style: CSSStyleDeclaration, side: string) =>
      Number.parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0 && style.getPropertyValue(`border-${side}-style`) !== 'none' && !/rgba\(.*,\s*0\)$/.test(style.getPropertyValue(`border-${side}-color`));
    const painted = (color: string) => color !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(color);
    const result: { type: string; subject: string; detail: string }[] = [];
    for (const element of document.querySelectorAll('body, body *')) {
      if (element.closest('svg') !== null) continue;
      for (const pseudo of ['', '::before', '::after']) {
        const style = getComputedStyle(element, pseudo || null);
        if (pseudo !== '' && (style.content === 'none' || style.content === 'normal')) continue;
        if (style.backgroundImage !== 'none') result.push({ type: 'background-image', subject: describe(element, pseudo), detail: 'has a background image, which forced colors remove' });
        const box = pseudo === '' ? element.getBoundingClientRect() : { width: Number.parseFloat(style.width), height: Number.parseFloat(style.height) };
        const hasText = pseudo === '' ? (element.textContent ?? '').trim() !== '' : style.content.replace(/^["']|["']$/g, '').trim() !== '';
        if (hasText || style.display === 'none' || !(box.width > 0 && box.height > 0)) continue;
        if (painted(style.backgroundColor) && !sides.some((side) => border(style, side))) {
          result.push({ type: 'invisible-separator', subject: describe(element, pseudo), detail: 'no border in forced colors' });
        }
      }
    }
    for (const link of document.querySelectorAll('a[href]')) {
      const style = getComputedStyle(link);
      if (!style.textDecorationLine.includes('underline') && !border(style, 'bottom')) {
        result.push({ type: 'invisible-link', subject: `a[href="${link.getAttribute('href')}"]`, detail: 'no underline in forced colors' });
      }
    }
    return result;
  });
  // The focus outline, with focus moved by the keyboard so `:focus-visible`
  // applies.
  const links = await page.locator('a[href]').count();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  const seen = new Set<number>();
  for (let step = 0; step < links + 20 && seen.size < links; step += 1) {
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => {
      const active = document.activeElement;
      const index = active === null ? -1 : [...document.querySelectorAll('a[href]')].indexOf(active);
      if (index < 0) return { index, href: '', visible: true, body: active === null || active === document.body };
      const style = getComputedStyle(active!);
      return { index, href: active!.getAttribute('href') ?? '', visible: style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0, body: false };
    });
    if (focus.body || seen.has(focus.index)) break;
    if (focus.index < 0) continue;
    seen.add(focus.index);
    if (!focus.visible) found.push({ type: 'invisible-focus', subject: `a[href="${focus.href}"]`, detail: 'no focus outline in forced colors' });
  }
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  return problems(found, pageLabel, 'forced-colors');
}

// Every element's computed transition and animation durations must be 0
// (FR-031). `variant` is `reduced-motion` or `-`.
export async function motionProblems(page: Page, pageLabel: string, variant: string): Promise<Problem[]> {
  const found = await page.evaluate(() => {
    const describe = (element: Element, pseudo = '') => {
      const classes = typeof element.className === 'string' && element.className.trim() !== '' ? `.${element.className.trim().split(/\s+/).join('.')}` : '';
      return `${element.tagName.toLowerCase()}${classes}${pseudo}`;
    };
    const seconds = (value: string) => (value.endsWith('ms') ? Number.parseFloat(value) / 1000 : Number.parseFloat(value));
    const result: { type: string; subject: string; detail: string }[] = [];
    for (const element of document.querySelectorAll('*')) {
      for (const pseudo of ['', '::before', '::after']) {
        const style = getComputedStyle(element, pseudo || null);
        for (const property of ['transition-duration', 'animation-duration']) {
          const value = style.getPropertyValue(property);
          const moving = value.split(',').map((part) => part.trim()).find((part) => part !== '' && part !== 'auto' && seconds(part) > 0);
          if (moving !== undefined) {
            result.push({ type: 'motion', subject: describe(element, pseudo), detail: `${property} ${moving.endsWith('ms') ? moving : `${Math.round(seconds(moving) * 1000)}ms`}` });
          }
        }
      }
    }
    return result;
  });
  return problems(found, pageLabel, variant);
}
