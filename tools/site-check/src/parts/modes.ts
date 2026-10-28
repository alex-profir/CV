// The modes part's page measurements (FR-030, FR-031): with forced colors,
// separators, links and the focus outline stay visible and nothing relies on
// a background image; and no element moves, with or without reduced motion.
import type { Page } from 'playwright';
import type { Problem } from '../report.ts';
import { SHELL, control, openAbout, openCvApp, settle } from '../shell-states.ts';

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

// ---- The site root (005 FR-046, FR-047, contracts/cli.md Parts) -----------

type Edge = { width: number; color: string };

// The widest visible border side, or outline, of each element `selector`
// matches; null for one with none.
function edges(page: Page, selector: string): Promise<{ subject: string; edge: Edge | null }[]> {
  return page.evaluate((target) => {
    const describe = (element: Element) => {
      const classes = typeof element.className === 'string' && element.className.trim() !== '' ? `.${element.className.trim().split(/\s+/).join('.')}` : '';
      const view = element.getAttribute('data-view');
      return `${element.tagName.toLowerCase()}${classes}${view === null ? '' : `[data-view="${view}"]`}`;
    };
    return [...document.querySelectorAll(target)]
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => {
        const style = getComputedStyle(element);
        const sides = ['top', 'right', 'bottom', 'left'].map((side) => ({
          width: Number.parseFloat(style.getPropertyValue(`border-${side}-width`)),
          style: style.getPropertyValue(`border-${side}-style`),
          color: style.getPropertyValue(`border-${side}-color`),
        }));
        sides.push({ width: Number.parseFloat(style.outlineWidth), style: style.outlineStyle, color: style.outlineColor });
        const shown = sides.filter((side) => side.width > 0 && side.style !== 'none' && side.color !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(side.color));
        const widest = shown.length === 0 ? null : shown.reduce((a, b) => (b.width > a.width ? b : a));
        return { subject: describe(element), edge: widest === null ? null : { width: widest.width, color: widest.color } };
      });
  }, selector);
}

// The shell's parts that must keep an edge in forced colors, by the state
// they're shown in.
const EDGED = ['#os .window', '#os .dock', '#os .menu-bar'];

async function edgeProblems(page: Page, selector: string, found: Found[]): Promise<void> {
  const list = await edges(page, selector);
  if (list.length === 0) found.push({ type: 'invisible-edge', subject: selector, detail: 'not shown, so its edge could not be checked in forced colors' });
  for (const { subject, edge } of list) if (edge === null) found.push({ type: 'invisible-edge', subject, detail: 'no border in forced colors' });
}

// On the root opened with forced colors active, after hydration: 004's
// checks on the first state and on the CV app, and on the desktop a border
// on the windows, a menu, the dock, the pad and the menu bar, and the
// focused window told apart from the others by its border.
export async function shellForcedColorsProblems(page: Page, shell: 'desktop' | 'mobile', pageLabel: string, variant: string): Promise<Problem[]> {
  const found: Found[] = [];
  const take = (list: Problem[]) => found.push(...list.map(({ type, subject, detail }) => ({ type, subject, detail })));
  take(await forcedColorsProblems(page, pageLabel));
  if (shell === 'mobile') {
    await openCvApp(page, 'mobile');
    take(await forcedColorsProblems(page, pageLabel));
    return problems(found, pageLabel, variant);
  }
  await openAbout(page);
  take(await forcedColorsProblems(page, pageLabel));
  for (const selector of EDGED) await edgeProblems(page, selector, found);
  const [focused] = await edges(page, '#os .window[aria-current="true"]');
  const others = await edges(page, '#os .window:not([aria-current="true"])');
  if (focused === undefined) found.push({ type: 'indistinct-focus', subject: '#os .window[aria-current="true"]', detail: 'no window is marked as focused' });
  else if (others.some(({ edge }) => edge !== null && focused.edge !== null && edge.width === focused.edge.width && edge.color === focused.edge.color)) {
    found.push({ type: 'indistinct-focus', subject: focused.subject, detail: 'the focused window has the same border as the others in forced colors' });
  }
  await page.click(SHELL.siteMenuTitle);
  await page.locator(SHELL.siteMenu).waitFor({ timeout: 5_000 });
  await settle(page);
  await edgeProblems(page, '#os .menu', found);
  await page.keyboard.press('Escape');
  await page.click(`${SHELL.cvWindow} .title-bar`);
  await page.keyboard.press('Alt+Shift+P');
  await page.locator(SHELL.pad).waitFor({ timeout: 5_000 });
  await edgeProblems(page, SHELL.pad, found);
  await page.keyboard.press('Escape');
  return problems(found, pageLabel, variant);
}

type Recorded = { subject: string; properties: string[]; scales: number[]; transforms: string[]; translates: string[] };

declare global {
  interface Window {
    __cvMotion?: { log: Recorded[] };
  }
}

// Records, from now on, every animation an element starts through the Web
// Animations API, with its properties and its computed scale, transform and
// translate at four points of it, and every CSS transition or animation
// that starts. Installed on the visitor's side, as an extension would be.
function recordMotion(page: Page): Promise<void> {
  return page.evaluate(() => {
    if (window.__cvMotion !== undefined) return;
    const log: Recorded[] = [];
    window.__cvMotion = { log };
    const describe = (element: Element) => {
      const view = element.getAttribute('data-view');
      return `${element.tagName.toLowerCase()}${element.classList.length === 0 ? '' : `.${element.classList[0]}`}${view === null ? '' : `[data-view="${view}"]`}`;
    };
    const original = Element.prototype.animate;
    Element.prototype.animate = function (this: Element, keyframes, options) {
      const animation = original.call(this, keyframes, options);
      const list = Array.isArray(keyframes) ? keyframes : keyframes === null || keyframes === undefined ? [] : [keyframes as Keyframe];
      const properties = [...new Set(list.flatMap((frame) => Object.keys(frame).filter((key) => !['offset', 'easing', 'composite'].includes(key))))].sort();
      const duration = Number(animation.effect?.getTiming().duration) || 0;
      const scales: number[] = [];
      const transforms: string[] = [];
      const translates: string[] = [];
      for (const share of [0, 0.25, 0.5, 0.75]) {
        animation.currentTime = duration * share;
        const style = getComputedStyle(this);
        if (style.scale !== 'none') scales.push(Number(style.scale.split(' ')[0]));
        if (style.transform !== 'none') transforms.push(style.transform);
        if (style.translate !== 'none') translates.push(style.translate);
      }
      animation.currentTime = 0;
      log.push({ subject: describe(this), properties, scales, transforms, translates });
      return animation;
    };
    const css = (event: TransitionEvent | AnimationEvent) => {
      const target = event.target as Element;
      const property = 'propertyName' in event ? event.propertyName : `animation ${event.animationName}`;
      log.push({ subject: describe(target), properties: [property], scales: [], transforms: [], translates: [] });
    };
    document.addEventListener('transitionrun', css, true);
    document.addEventListener('animationstart', css, true);
  });
}

const MOVING = /^(?:transform|scale|translate|rotate|left|top|right|bottom|inset|width|height|margin|animation .*)/;

// What moved or scaled since the last call, as `moved` problems for `action`.
async function movedSince(page: Page, action: string, found: Found[]): Promise<void> {
  await settle(page);
  const log = await page.evaluate(() => window.__cvMotion!.log.splice(0));
  for (const { subject, properties, scales, transforms, translates } of log) {
    const scaled = scales.find((value) => value !== 1);
    if (scaled !== undefined) found.push({ type: 'moved', subject, detail: `scaled to ${scaled} while ${action}` });
    else if (transforms.length > 0 || translates.length > 0) found.push({ type: 'moved', subject, detail: `moved while ${action}` });
    else {
      const moving = properties.find((property) => MOVING.test(property));
      if (moving !== undefined) found.push({ type: 'moved', subject, detail: `animated ${moving} while ${action}` });
    }
  }
}

// On the root opened with reduced motion, after hydration: 004's check of
// the computed durations, then the actions FR-046 names, each by a click or
// a tap. Any element that moves or scales is reported; a fade is allowed.
export async function shellMotionProblems(page: Page, shell: 'desktop' | 'mobile', pageLabel: string, variant: string): Promise<Problem[]> {
  const found: Found[] = (await motionProblems(page, pageLabel, variant)).map(({ type, subject, detail }) => ({ type, subject, detail }));
  await recordMotion(page);
  const step = async (action: string, run: () => Promise<void>) => {
    await run();
    await movedSince(page, action, found);
  };
  if (shell === 'mobile') {
    await step('opening the CV app', () => page.tap(SHELL.cvIcon));
    await step('closing the CV app', () => page.tap(SHELL.homeButton));
    await step('opening About this site', () => page.tap(SHELL.aboutButton));
    await step('closing About this site', () => page.tap(SHELL.homeButton));
    return problems(found, pageLabel, variant);
  }
  await step('closing the CV window', () => page.click(control('cv', 'close')));
  await step('opening the CV window', () => page.click(SHELL.cvDockItem));
  await step('opening a menu', () => page.click(SHELL.siteMenuTitle));
  await step('opening About this site', () => page.click(SHELL.aboutItem));
  await step('closing About this site', () => page.click(control('about', 'close')));
  await step('minimizing the CV window', () => page.click(control('cv', 'minimize')));
  await step('restoring the CV window', () => page.click(SHELL.cvDockItem));
  await step('maximizing the CV window', () => page.click(control('cv', 'maximize')));
  await step('restoring its size', () => page.click(control('cv', 'maximize')));
  return problems(found, pageLabel, variant);
}
