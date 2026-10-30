// The keyboard part's page measurement (research R15). Every link must be
// reached by Tab in reading order, which is DOM order on this site (R8),
// show a focus indicator of 3:1 or more against the same pixels unfocused,
// and not be covered by other content when focused.
import zlib from 'node:zlib';
import type { BrowserContext, Page } from 'playwright';
import { tokenValue } from '@cv/tokens';
import type { Problem } from '../report.ts';
import { INSPECTOR, SHELL, TERMINAL, settle } from '../shell-states.ts';
import type { InspectorView } from '../shell-states.ts';

export type Box = { x: number; y: number; width: number; height: number };

type LinkInfo = { index: number; href: string; text: string; box: Box };

type Image = { width: number; height: number; channels: number; data: Buffer };

// A Chromium screenshot: 8-bit RGB or RGBA, not interlaced (PNG spec,
// filters 0 to 4).
export function decodePng(png: Buffer): Image {
  let offset = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  const chunks: Buffer[] = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('latin1', offset + 4, offset + 8);
    const body = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const [depth, color, , , interlace] = [body[8], body[9], body[10], body[11], body[12]];
      if (depth !== 8 || (color !== 2 && color !== 6) || interlace !== 0) throw new Error('unsupported screenshot format');
      channels = color === 6 ? 4 : 3;
    } else if (type === 'IDAT') {
      chunks.push(body);
    }
    offset += 12 + length;
  }
  const raw = zlib.inflateSync(Buffer.concat(chunks));
  const stride = width * channels;
  const data = Buffer.alloc(stride * height);
  for (let row = 0; row < height; row += 1) {
    const filter = raw[row * (stride + 1)]!;
    const line = raw.subarray(row * (stride + 1) + 1, (row + 1) * (stride + 1));
    for (let column = 0; column < stride; column += 1) {
      const left = column >= channels ? data[row * stride + column - channels]! : 0;
      const up = row > 0 ? data[(row - 1) * stride + column]! : 0;
      const upLeft = row > 0 && column >= channels ? data[(row - 1) * stride + column - channels]! : 0;
      let value = line[column]!;
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += Math.floor((left + up) / 2);
      else if (filter === 4) {
        const estimate = left + up - upLeft;
        const [a, b, c] = [Math.abs(estimate - left), Math.abs(estimate - up), Math.abs(estimate - upLeft)];
        value += a <= b && a <= c ? left : b <= c ? up : upLeft;
      }
      data[row * stride + column] = value & 0xff;
    }
  }
  return { width, height, channels, data };
}

function luminance(r: number, g: number, b: number): number {
  const linear = (value: number) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

// WCAG's contrast ratio between two colors.
export function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [light, dark] = [luminance(...a), luminance(...b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

// How many pixels changed between two shots of the same box with a contrast
// of 3:1 or more.
export function indicatorPixels(before: Image, after: Image): number {
  let count = 0;
  const pixels = Math.min(before.width * before.height, after.width * after.height);
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const a = pixel * before.channels;
    const b = pixel * after.channels;
    const from: [number, number, number] = [before.data[a]!, before.data[a + 1]!, before.data[a + 2]!];
    const to: [number, number, number] = [after.data[b]!, after.data[b + 1]!, after.data[b + 2]!];
    if ((from[0] !== to[0] || from[1] !== to[1] || from[2] !== to[2]) && contrast(from, to) >= 3) count += 1;
  }
  return count;
}

const px = (value: string) => Number.parseFloat(value);

function ordinal(number: number): string {
  const tens = number % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[number % 10] ?? 'th';
  return `${number}${suffix}`;
}

// The links in DOM order that are rendered, so a keyboard can reach them.
function links(page: Page): Promise<LinkInfo[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('a[href]')].flatMap((link, index) => {
      if (link.getClientRects().length === 0) return [];
      const rect = link.getBoundingClientRect();
      return [
        {
          index,
          href: link.getAttribute('href') ?? '',
          text: (link.textContent ?? '').replace(/\s+/g, ' ').trim(),
          box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        },
      ];
    }),
  );
}

type Focused = { index: number; scroll: { x: number; y: number }; box: Box; coveredBy: string | null; body: boolean };

// Where focus is now: the link's index among every `a[href]`, -1 for any
// other element, its box in the viewport, and what sits on its centre.
function focused(page: Page): Promise<Focused> {
  return page.evaluate(() => {
    const active = document.activeElement;
    const all = [...document.querySelectorAll('a[href]')];
    const body = active === null || active === document.body || active === document.documentElement;
    const index = active === null ? -1 : all.indexOf(active);
    let box = { x: 0, y: 0, width: 0, height: 0 };
    let coveredBy: string | null = null;
    if (!body && active !== null) {
      const rect = active.getBoundingClientRect();
      box = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      const first = active.getClientRects()[0];
      if (first !== undefined) {
        const hit = document.elementFromPoint(first.x + first.width / 2, first.y + first.height / 2);
        if (hit !== null && !active.contains(hit)) {
          const classes = typeof hit.className === 'string' && hit.className.trim() !== '' ? `.${hit.className.trim().split(/\s+/).join('.')}` : '';
          coveredBy = `${hit.tagName.toLowerCase()}${classes}`;
        }
      }
    }
    return { index, scroll: { x: window.scrollX, y: window.scrollY }, box, coveredBy, body };
  });
}

// The box enlarged by the focus outline's width and offset, clamped to the
// viewport.
export function clipOf(page: Page, box: Box, pad: number): Box | null {
  const viewport = page.viewportSize() ?? { width: 0, height: 0 };
  const x = Math.max(0, Math.floor(box.x - pad));
  const y = Math.max(0, Math.floor(box.y - pad));
  const right = Math.min(viewport.width, Math.ceil(box.x + box.width + pad));
  const bottom = Math.min(viewport.height, Math.ceil(box.y + box.height + pad));
  return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null;
}

export async function keyboardProblems(page: Page, pageLabel: string, variant: string): Promise<Problem[]> {
  const problem = (type: string, subject: string, detail: string): Problem => ({ part: 'keyboard', page: pageLabel, variant, type, subject, detail });
  const list = await links(page);
  const byIndex = new Map(list.map((link) => [link.index, link]));
  const subject = (link: LinkInfo) => `a[href="${link.href}"]`;
  const outline = px(tokenValue('border.thick'));
  const pad = outline + px(tokenValue('space.0_5')) + 2;

  // 1 and 2: Tab from the top of the page until focus leaves the document or
  // comes back to an element it has visited.
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    window.scrollTo(0, 0);
  });
  const order: number[] = [];
  const shots = new Map<number, { focused: Focused; image: Buffer | null }>();
  const visited = new Set<string>();
  for (let step = 0; step < list.length + 20; step += 1) {
    await page.keyboard.press('Tab');
    const now = await focused(page);
    if (now.body) break;
    const key = now.index >= 0 ? `link-${now.index}` : `other-${JSON.stringify(now.box)}`;
    if (visited.has(key)) break;
    visited.add(key);
    if (now.index < 0 || !byIndex.has(now.index)) continue;
    order.push(now.index);
    const clip = clipOf(page, now.box, pad);
    shots.set(now.index, { focused: now, image: clip === null ? null : await page.screenshot({ clip, animations: 'disabled', caret: 'hide' }) });
  }

  const problems: Problem[] = [];
  for (const link of list) if (!order.includes(link.index)) problems.push(problem('not-reached', subject(link), 'never received focus'));
  const reading = [...order].sort((a, b) => a - b);
  order.forEach((index, position) => {
    if (reading[position] !== index) {
      const link = byIndex.get(index)!;
      const readingPosition = list.indexOf(link) + 1;
      problems.push(problem('out-of-order', subject(link), `focus reached it ${ordinal(position + 1)}, its reading position is ${ordinal(readingPosition)}`));
    }
  });

  // 3 and 4: the indicator, against the same box unfocused, and whether
  // anything covers the link when it's focused.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  for (const index of order) {
    const link = byIndex.get(index)!;
    const shot = shots.get(index)!;
    if (shot.focused.coveredBy !== null) problems.push(problem('covered', subject(link), `covered by ${shot.focused.coveredBy} when focused`));
    const clip = clipOf(page, shot.focused.box, pad);
    let changed = 0;
    if (clip !== null && shot.image !== null) {
      await page.evaluate(({ x, y }) => window.scrollTo(x, y), shot.focused.scroll);
      const before = await page.screenshot({ clip, animations: 'disabled', caret: 'hide' });
      const scale = decodePng(shot.image).width / clip.width;
      changed = indicatorPixels(decodePng(before), decodePng(shot.image)) / (scale * scale);
    }
    // At least the box's perimeter at the token's outline width.
    const needed = 2 * (shot.focused.box.width + shot.focused.box.height) * outline;
    if (changed < needed) problems.push(problem('no-focus-indicator', `${subject(link)} ${JSON.stringify(link.text)}`, 'no visible change when focused'));
  }
  return problems;
}

// ---- The site root's flows (005 FR-057, contracts/cli.md Parts) ----------
//
// The desktop at 1440 × 900 and the phone at 375 × 812, by keys alone, plus
// the browser's Back on the phone. Each step names the element focus must
// land on (FR-023, FR-040, FR-063) and checks its indicator as the link
// check above does. A step whose keys don't act ends the flow with a
// `shortcut` problem, since every later step depends on it; a focus that
// lands elsewhere is a `focus-target` problem, and the flow goes on.

const FOCUS_PROBE = 'data-cv-focus-probe';

// Takes focus from an item in an open menu while it is shot unfocused.
const MENU_PROBE = 'data-cv-menu-probe';

// How long a step's change may take to show, animations included.
const STEP_WAIT_MS = 3_000;

async function until(test: () => Promise<boolean>, ms = STEP_WAIT_MS): Promise<boolean> {
  const end = Date.now() + ms;
  for (;;) {
    if (await test()) return true;
    if (Date.now() > end) return false;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

const focusIn = (page: Page, selector: string) => page.evaluate((target) => document.activeElement?.closest(target) !== null && document.activeElement?.closest(target) !== undefined, selector);

const focusOn = (page: Page, selector: string) => page.evaluate((target) => document.activeElement?.matches(target) ?? false, selector);

const count = (page: Page, selector: string) => page.locator(selector).count();

const visible = (page: Page, selector: string) => page.locator(selector).first().isVisible();

// The focused element, described stably: `body`, or its tag, classes, and
// `data-view` or `data-app`.
export function describeFocus(page: Page): Promise<string> {
  return page.evaluate(() => {
    const active = document.activeElement;
    if (active === null || active === document.body || active === document.documentElement) return 'body';
    const classes = typeof active.className === 'string' && active.className.trim() !== '' ? `.${active.className.trim().split(/\s+/).join('.')}` : '';
    const data = ['data-view', 'data-app'].map((name) => (active.hasAttribute(name) ? `[${name}="${active.getAttribute(name)}"]` : '')).join('');
    return `${active.tagName.toLowerCase()}${active.id === '' ? '' : `#${active.id}`}${classes}${data}`;
  });
}

// The focused element's indicator: the pixels that change by 3:1 or more
// against the same box unfocused must cover at least its perimeter at the
// outline's width, less what rounded corners take off (WCAG 2.4.13), and
// nothing may sit on its centre. Focus is put back afterwards, with its
// indicator. Inside an open menu, losing focus would close the menu, so
// focus moves to a probe in the menu, out of view, instead. Null when it
// passes, else what's wrong.
export async function indicatorProblem(page: Page): Promise<string | null> {
  const outline = px(tokenValue('border.thick'));
  const pad = outline + px(tokenValue('space.0_5')) + 2;
  const state = await page.evaluate((probe) => {
    const active = document.activeElement as HTMLElement | null;
    if (active === null || active === document.body) return null;
    const rect = active.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    const describe = (element: Element) => `${element.tagName.toLowerCase()}${typeof element.className === 'string' && element.className.trim() !== '' ? `.${element.className.trim().split(/\s+/).join('.')}` : ''}`;
    const coveredBy = hit !== null && !active.contains(hit) && !hit.contains(active) ? describe(hit) : null;
    active.setAttribute(probe, '');
    const radius = Math.min(Number.parseFloat(getComputedStyle(active).borderTopLeftRadius) || 0, rect.width / 2, rect.height / 2);
    return { box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, coveredBy, radius };
  }, FOCUS_PROBE);
  if (state === null) return 'nothing is focused';
  try {
    if (state.coveredBy !== null) return `covered by ${state.coveredBy} when focused`;
    const clip = clipOf(page, state.box, pad);
    if (clip === null) return 'the focused element is outside the viewport';
    const needed = (2 * (state.box.width + state.box.height) - (8 - 2 * Math.PI) * state.radius) * outline;
    const focused = await page.screenshot({ clip, animations: 'disabled', caret: 'hide' });
    await page.evaluate((probe) => {
      const active = document.activeElement as HTMLElement | null;
      const menu = active?.closest('[role="menu"]');
      if (menu === null || menu === undefined) return active?.blur();
      const away = document.createElement('span');
      away.setAttribute(probe, '');
      away.tabIndex = -1;
      away.style.cssText = 'position: fixed; inset-inline-start: -100px; inset-block-start: -100px; inline-size: 1px; block-size: 1px; overflow: hidden';
      menu.append(away);
      away.focus();
    }, MENU_PROBE);
    const unfocused = await page.screenshot({ clip, animations: 'disabled', caret: 'hide' });
    const scale = decodePng(focused).width / clip.width;
    const changed = indicatorPixels(decodePng(unfocused), decodePng(focused)) / (scale * scale);
    return changed >= needed ? null : 'no visible change when focused';
  } finally {
    await page.evaluate(([probe, away]) => {
      const element = document.querySelector<HTMLElement>(`[${probe}]`);
      element?.removeAttribute(probe);
      element?.focus({ focusVisible: true } as FocusOptions);
      document.querySelector(`[${away}]`)?.remove();
    }, [FOCUS_PROBE, MENU_PROBE] as const);
  }
}

type Flow = {
  problems: Problem[];
  // One step: press `keys` (or run `act`), wait for `done` when given, then
  // check focus is on `target` and, unless `indicator` is false, its
  // indicator. False when `done` never held, so the flow must end.
  step: (label: string, options: StepOptions) => Promise<boolean>;
};

type StepOptions = {
  keys?: string[];
  act?: () => Promise<void>;
  done?: () => Promise<boolean>;
  // The `shortcut` problem when `done` never holds: the keys, and what
  // didn't happen.
  failed?: { subject: string; detail: string };
  target: string;
  targetName: string;
  // `target` is a container focus must be inside, not the element itself.
  inside?: boolean;
  indicator?: boolean;
  // Scroll the focused element into view before its indicator is measured,
  // as typing into it would: the Terminal keeps a new output's start in
  // view, so its command line may be below (006 FR-019).
  reveal?: boolean;
  // What else the step must show once focus has landed: each problem's type
  // and detail, named by the step.
  check?: () => Promise<{ type: string; detail: string }[]>;
};

function flow(page: Page, pageLabel: string, variant: string): Flow {
  const problems: Problem[] = [];
  const problem = (type: string, subject: string, detail: string) => problems.push({ part: 'keyboard', page: pageLabel, variant, type, subject, detail });
  let number = 0;
  return {
    problems,
    step: async (label, { keys = [], act, done, failed, target, targetName, inside = false, indicator = true, reveal = false, check }) => {
      number += 1;
      const name = `step ${number} "${label}"`;
      for (const key of keys) await page.keyboard.press(key);
      await act?.();
      if (done !== undefined && !(await until(done))) {
        problem('shortcut', failed?.subject ?? keys.join(' '), failed?.detail ?? `${label} did not happen`);
        return false;
      }
      await settle(page);
      const landed = () => (inside ? focusIn(page, target) : focusOn(page, target));
      if (!(await until(landed))) {
        problem('focus-target', name, `focus went to ${await describeFocus(page)}, expected ${targetName}`);
        return true;
      }
      if (indicator) {
        if (reveal) await page.evaluate(() => document.activeElement?.scrollIntoView({ block: 'nearest' }));
        const wrong = await indicatorProblem(page);
        if (wrong !== null) problem('no-focus-indicator', name, `${wrong} (${await describeFocus(page)})`);
      }
      for (const { type, detail } of (await check?.()) ?? []) problem(type, name, detail);
      return true;
    },
  };
}

type Box2 = { x: number; y: number; width: number; height: number };

const boxOf = (page: Page, selector: string): Promise<Box2 | null> =>
  page.evaluate((target) => {
    const element = document.querySelector(target);
    if (element === null) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }, selector);

const sameBox = (a: Box2 | null, b: Box2 | null) => a !== null && b !== null && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

// Presses Tab from inside `window` until focus leaves it. The limit is the
// window's elements plus the shell's outside every window: a Tab order that
// stays inside after that many presses is a trap.
async function trapProblem(page: Page, window: string, pageLabel: string, variant: string): Promise<Problem | null> {
  const { limit, subject } = await page.evaluate((target) => {
    const element = document.querySelector(target)!;
    const outside = [...document.querySelectorAll('#os *')].filter((node) => node.closest('#os .window') === null).length;
    const view = element.getAttribute('data-view');
    return { limit: element.querySelectorAll('*').length + outside, subject: `${element.tagName.toLowerCase()}.window${view === null ? '' : `[data-view="${view}"]`}` };
  }, window);
  for (let presses = 0; presses < limit; presses += 1) {
    if (!(await focusIn(page, window))) return null;
    await page.keyboard.press('Tab');
  }
  if (!(await focusIn(page, window))) return null;
  return { part: 'keyboard', page: pageLabel, variant, type: 'trapped', subject, detail: `Tab stayed inside the window after ${limit} presses` };
}

// Tab from the top of the page, at most `presses` times, until focus is on
// or inside `target`.
async function tabTo(page: Page, target: string, presses: number, inside: boolean): Promise<void> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  for (let press = 0; press < presses; press += 1) {
    if (await (inside ? focusIn(page, target) : focusOn(page, target))) return;
    await page.keyboard.press('Tab');
  }
}

// SC-002: the open CV, or the CV icon, is reached in at most 3 presses.
const FIRST_PRESSES = 3;

const MOVE = { subject: 'Alt+Shift+P', detail: 'the move pad did not open' };

const RESIZE = { subject: 'Alt+Shift+S', detail: 'the resize pad did not open' };

export async function desktopKeyboardProblems(page: Page, pageLabel: string, variant: string): Promise<Problem[]> {
  const { problems, step } = flow(page, pageLabel, variant);
  const S = SHELL;
  const cvName = "the CV window's title";
  const aboutName = "the About this site window's title";
  const current = () => page.locator('#os .window[aria-current="true"]').first().getAttribute('data-view');
  const run = async (): Promise<void> => {
    if (!(await step('reach the CV window', { act: () => tabTo(page, S.cvWindow, FIRST_PRESSES, true), target: S.cvWindow, targetName: `the CV window within ${FIRST_PRESSES} presses of Tab`, inside: true }))) return;
    if (!(await step('close the CV window', { keys: ['Alt+Shift+W'], done: async () => (await count(page, S.cvWindow)) === 0, failed: { subject: 'Alt+Shift+W', detail: 'the CV window did not close' }, target: S.cvDockItem, targetName: 'the CV dock item' }))) return;
    if (!(await step('go to the dock', { keys: ['Alt+Shift+D'], done: () => focusIn(page, '#os .dock'), failed: { subject: 'Alt+Shift+D', detail: 'focus did not move to the dock' }, target: S.cvDockItem, targetName: 'the CV dock item' }))) return;
    if (!(await step('open the CV from the dock', { keys: ['Enter'], done: () => visible(page, S.cvWindow), failed: { subject: 'Enter', detail: 'the CV dock item did not open the CV window' }, target: S.cvTitle, targetName: cvName }))) return;
    if (!(await step('go to the menu bar', { keys: ['Alt+Shift+M'], done: () => focusIn(page, '#os .menu-bar'), failed: { subject: 'Alt+Shift+M', detail: 'focus did not move to the menu bar' }, target: S.siteMenuTitle, targetName: "the site menu's title" }))) return;
    if (!(await step('open the site menu', { keys: ['Enter'], done: () => visible(page, S.siteMenu), failed: { subject: 'Enter', detail: 'the site menu did not open' }, target: S.aboutItem, targetName: 'About this site in the site menu' }))) return;
    if (!(await step('open About this site', { keys: ['Enter'], done: () => visible(page, S.aboutWindow), failed: { subject: 'Enter', detail: 'About this site did not open' }, target: S.aboutTitle, targetName: aboutName }))) return;

    // No trap: Tab leaves About, then the CV it reaches.
    for (const window of [S.aboutWindow, S.cvWindow]) {
      if (!(await focusIn(page, window))) continue;
      const trapped = await trapProblem(page, window, pageLabel, variant);
      if (trapped !== null) {
        problems.push(trapped);
        return;
      }
    }

    // Switch windows until the CV is in front, each press going to the
    // other window.
    for (let presses = 0; presses < 3; presses += 1) {
      const from = await current();
      if (presses >= 2 && from === 'cv' && (await focusOn(page, S.cvTitle))) break;
      const to = from === 'cv' ? 'about' : 'cv';
      const switched = await step('switch windows', {
        keys: ['Alt+Shift+N'],
        done: async () => (await current()) === to,
        failed: { subject: 'Alt+Shift+N', detail: 'focus did not move to the next window' },
        target: to === 'cv' ? S.cvTitle : S.aboutTitle,
        targetName: to === 'cv' ? cvName : aboutName,
      });
      if (!switched) return;
    }

    const start = await boxOf(page, S.cvWindow);
    if (!(await step('start a move', { keys: ['Alt+Shift+P'], done: () => visible(page, S.pad), failed: MOVE, target: S.padFirst, targetName: "the move pad's first button" }))) return;
    if (
      !(await step('move the CV window', {
        keys: ['ArrowRight', 'Enter'],
        done: async () => (await count(page, S.pad)) === 0 && ((await boxOf(page, S.cvWindow))?.x ?? 0) > (start?.x ?? 0),
        failed: { subject: 'ArrowRight Enter', detail: 'the CV window did not move' },
        target: S.cvTitle,
        targetName: cvName,
      }))
    )
      return;
    const moved = await boxOf(page, S.cvWindow);
    if (!(await step('start another move', { keys: ['Alt+Shift+P'], done: () => visible(page, S.pad), failed: MOVE, target: S.padFirst, targetName: "the move pad's first button", indicator: false }))) return;
    if (
      !(await step('cancel the move', {
        keys: ['ArrowRight', 'Escape'],
        done: async () => (await count(page, S.pad)) === 0 && sameBox(await boxOf(page, S.cvWindow), moved),
        failed: { subject: 'Escape', detail: 'the move was not cancelled' },
        target: S.cvTitle,
        targetName: cvName,
      }))
    )
      return;
    if (!(await step('start a resize', { keys: ['Alt+Shift+S'], done: () => visible(page, S.pad), failed: RESIZE, target: S.padFirst, targetName: "the resize pad's first button" }))) return;
    if (
      !(await step('resize the CV window', {
        keys: ['ArrowLeft', 'Enter'],
        done: async () => (await count(page, S.pad)) === 0 && ((await boxOf(page, S.cvWindow))?.width ?? 0) < (moved?.width ?? 0),
        failed: { subject: 'ArrowLeft Enter', detail: 'the CV window did not resize' },
        target: S.cvTitle,
        targetName: cvName,
      }))
    )
      return;
    const resized = await boxOf(page, S.cvWindow);
    if (!(await step('start another resize', { keys: ['Alt+Shift+S'], done: () => visible(page, S.pad), failed: RESIZE, target: S.padFirst, targetName: "the resize pad's first button", indicator: false }))) return;
    if (
      !(await step('cancel the resize', {
        keys: ['ArrowLeft', 'Escape'],
        done: async () => (await count(page, S.pad)) === 0 && sameBox(await boxOf(page, S.cvWindow), resized),
        failed: { subject: 'Escape', detail: 'the resize was not cancelled' },
        target: S.cvTitle,
        targetName: cvName,
      }))
    )
      return;
    if (!(await step('minimize the CV window', { keys: ['Alt+Shift+H'], done: async () => !(await visible(page, S.cvWindow)), failed: { subject: 'Alt+Shift+H', detail: 'the CV window was not minimized' }, target: S.aboutTitle, targetName: aboutName }))) return;
    if (!(await step('go to the dock', { keys: ['Alt+Shift+D'], done: () => focusIn(page, '#os .dock'), failed: { subject: 'Alt+Shift+D', detail: 'focus did not move to the dock' }, target: S.cvDockItem, targetName: 'the CV dock item' }))) return;
    if (!(await step('restore the CV window', { keys: ['Enter'], done: () => visible(page, S.cvWindow), failed: { subject: 'Enter', detail: 'the CV dock item did not restore the CV window' }, target: S.cvTitle, targetName: cvName }))) return;
    if (!(await step('maximize the CV window', { keys: ['Alt+Shift+F'], done: async () => (await count(page, `${S.cvWindow}[data-maximized]`)) === 1, failed: { subject: 'Alt+Shift+F', detail: 'the CV window was not maximized' }, target: S.cvTitle, targetName: cvName }))) return;
    if (!(await step('restore its size', { keys: ['Alt+Shift+F'], done: async () => (await count(page, `${S.cvWindow}[data-maximized]`)) === 0, failed: { subject: 'Alt+Shift+F', detail: 'the CV window was not restored from maximized' }, target: S.cvTitle, targetName: cvName }))) return;
    if (!(await step('close the CV window', { keys: ['Alt+Shift+W'], done: async () => (await count(page, S.cvWindow)) === 0, failed: { subject: 'Alt+Shift+W', detail: 'the CV window did not close' }, target: S.aboutTitle, targetName: aboutName }))) return;
    await step('close About this site', { keys: ['Alt+Shift+W'], done: async () => (await count(page, S.aboutWindow)) === 0, failed: { subject: 'Alt+Shift+W', detail: 'About this site did not close' }, target: S.siteMenuTitle, targetName: "the site menu's title" });
  };
  await run();
  return problems;
}

export async function mobileKeyboardProblems(page: Page, pageLabel: string, variant: string): Promise<Problem[]> {
  const { problems, step } = flow(page, pageLabel, variant);
  const S = SHELL;
  const appTitle = `${S.cvFullScreen} .app-title`;
  const closed = async () => (await count(page, S.cvFullScreen)) === 0;
  const run = async (): Promise<void> => {
    if (!(await step('reach the CV icon', { act: () => tabTo(page, S.cvIcon, FIRST_PRESSES, false), target: S.cvIcon, targetName: `the CV icon within ${FIRST_PRESSES} presses of Tab` }))) return;
    if (!(await step('open the CV', { keys: ['Enter'], done: () => visible(page, S.cvFullScreen), failed: { subject: 'Enter', detail: 'the CV icon did not open the CV' }, target: appTitle, targetName: "the CV app's title" }))) return;
    if (!(await step('go to Home', { keys: ['Shift+Tab'], target: S.homeButton, targetName: 'the Home button' }))) return;
    if (!(await step('Home to the home screen', { keys: ['Enter'], done: closed, failed: { subject: 'Enter', detail: 'Home did not go back to the home screen' }, target: S.cvIcon, targetName: 'the CV icon' }))) return;
    if (!(await step('open the CV again', { keys: ['Enter'], done: () => visible(page, S.cvFullScreen), failed: { subject: 'Enter', detail: 'the CV icon did not open the CV' }, target: appTitle, targetName: "the CV app's title" }))) return;
    await step('Back to the home screen', { act: async () => void (await page.goBack()), done: closed, failed: { subject: 'Back', detail: 'Back did not go back to the home screen' }, target: S.cvIcon, targetName: 'the CV icon' });
  };
  await run();
  return problems;
}

// The Terminal with the keyboard alone (006 FR-039, contracts/cli.md
// `keyboard`), at 1440 × 900 from a fresh page. Each step checks where focus
// lands and its indicator; `Alt+Shift+D` reaches the dock before Enter on
// the Terminal's dock item brings focus back to the command line.
export async function terminalKeyboardProblems(page: Page, pageLabel: string, variant: string): Promise<Problem[]> {
  const { problems, step } = flow(page, pageLabel, variant);
  const S = SHELL;
  const T = TERMINAL;
  // The command line has no box: its cursor is its focus indicator, filled
  // with focus and hollow without (FR-072, research R36), so a step that
  // lands there checks the cursor instead of a change around the field.
  const atLine = { target: T.commandLine, targetName: "the Terminal's command line", indicator: false, check: () => filledCursor(page) };
  const toTerminalItem = async () => void ((await focusOn(page, S.terminalDockItem)) || (await page.keyboard.press('ArrowRight')));
  const vimName = "the vim view's text";
  const runs = () => count(page, T.run);
  const lastLine = () => page.locator(T.run).last().locator('.run-line').textContent();
  const lineValue = () => page.locator(T.commandLine).inputValue();
  const cursorFold = (expanded: boolean) => count(page, `${T.vimLine}:has(.vim-cursor) button.vim-fold[aria-expanded="${expanded}"]`);
  const typed = (line: string) => async () => {
    // The line's text selected, so the typed line replaces it.
    await pressLinux(page, 'Home');
    await pressLinux(page, 'Shift+End');
    await page.keyboard.type(line);
    await page.keyboard.press('Enter');
  };
  const run = async (): Promise<void> => {
    // With the CV window closed first, `exit` has no next window, so focus
    // goes to the Terminal's dock item (contracts/terminal.md Focus).
    if (!(await step('reach the CV window', { act: () => tabTo(page, S.cvWindow, FIRST_PRESSES, true), target: S.cvWindow, targetName: `the CV window within ${FIRST_PRESSES} presses of Tab`, inside: true }))) return;
    if (!(await step('close the CV window', { keys: ['Alt+Shift+W'], done: async () => (await count(page, S.cvWindow)) === 0, failed: { subject: 'Alt+Shift+W', detail: 'the CV window did not close' }, target: S.cvDockItem, targetName: 'the CV dock item' }))) return;
    if (!(await step("move to the Terminal's dock item", { act: toTerminalItem, target: S.terminalDockItem, targetName: "the Terminal's dock item" }))) return;
    if (!(await step('open the Terminal', { keys: ['Enter'], done: () => visible(page, T.commandLine), failed: { subject: 'Enter', detail: "the Terminal's dock item did not open the Terminal" }, ...atLine }))) return;
    const before = await runs();
    if (!(await step('run help', { act: typed('help'), done: async () => (await runs()) > before && (await lastLine()) === 'help', failed: { subject: 'help Enter', detail: 'help did not run' }, ...atLine }))) return;
    // Back from the command line through help's controls to `about`'s.
    const reached = await until(async () => {
      if (await focusOn(page, `${T.run} button[aria-label="about"]`)) return true;
      await page.keyboard.press('Shift+Tab');
      return false;
    }, 10_000);
    if (!reached) {
      problems.push({ part: 'keyboard', page: pageLabel, variant, type: 'focus-target', subject: 'Shift+Tab', detail: `focus went to ${await describeFocus(page)}, expected about's control in help's output` });
      return;
    }
    if (!(await step("run about from help's output", { keys: ['Enter'], done: async () => (await lastLine()) === 'about', failed: { subject: 'Enter', detail: "about's control did not run about" }, ...atLine }))) return;
    if (!(await step('recall it with Up', { keys: ['ArrowUp'], done: async () => (await lineValue()) === 'about', failed: { subject: 'ArrowUp', detail: 'Up did not recall about' }, ...atLine }))) return;
    if (!(await step('run cv', { act: typed('cv'), done: () => visible(page, T.vimText), failed: { subject: 'cv Enter', detail: 'cv did not open the vim view' }, target: T.vimText, targetName: vimName }))) return;
    const moved = async () => {
      for (let presses = 0; presses < 50 && (await cursorFold(false)) === 0; presses += 1) await page.keyboard.press('j');
    };
    if (!(await step('move with j to a fold', { act: moved, done: async () => (await cursorFold(false)) === 1, failed: { subject: 'j', detail: 'j did not reach a closed fold' }, target: T.vimText, targetName: vimName }))) return;
    if (!(await step('open the fold with za', { keys: ['z', 'a'], done: async () => (await cursorFold(true)) === 1, failed: { subject: 'za', detail: 'za did not open the fold' }, target: T.vimText, targetName: vimName }))) return;
    if (!(await step('leave the vim view with :q', { keys: [':', 'q', 'Enter'], done: () => visible(page, T.commandLine), failed: { subject: ':q Enter', detail: ':q did not leave the vim view' }, ...atLine }))) return;
    await page.keyboard.press('Tab');
    if (await until(() => focusOn(page, T.commandLine).then((on) => !on), 500).then((left) => !left)) {
      problems.push({ part: 'keyboard', page: pageLabel, variant, type: 'trapped', subject: 'input.command-line', detail: "Tab didn't move focus out of the command line" });
      return;
    }
    if (!(await step('come back with Shift+Tab', { keys: ['Shift+Tab'], ...atLine }))) return;
    if (!(await step('go to the dock again', { keys: ['Alt+Shift+D'], done: () => focusIn(page, '#os .dock'), failed: { subject: 'Alt+Shift+D', detail: 'focus did not move to the dock' }, target: '#os .dock', targetName: 'the dock', inside: true }))) return;
    if (!(await step("move to the Terminal's dock item again", { act: toTerminalItem, target: S.terminalDockItem, targetName: "the Terminal's dock item" }))) return;
    if (!(await step('back to the Terminal', { keys: ['Enter'], ...atLine }))) return;
    if (!(await step('exit', { act: typed('exit'), done: async () => (await count(page, S.terminalWindow)) === 0, failed: { subject: 'exit Enter', detail: 'exit did not close the Terminal' }, target: S.terminalDockItem, targetName: 'the Terminal dock item' }))) return;
    // The added steps start from the Terminal's dock item; when `exit` sent
    // focus elsewhere, that step has said so already.
    if (await focusOn(page, S.terminalDockItem)) await commandLineSteps(page, step);
  };
  await run();
  return problems;
}

// ---- The command line's cursor and keys (006 FR-039, FR-072, FR-074,
// FR-075, SC-015; contracts/cli.md `keyboard`, added 2026-10-29) -----------

// The flow's page reports Linux, so the command line takes Linux's keys.
export async function asLinux(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'platform', { get: () => 'Linux x86_64', configurable: true });
    Object.defineProperty(Navigator.prototype, 'userAgentData', { get: () => ({ platform: 'Linux', mobile: false, brands: [] }), configurable: true });
  });
}

// Playwright gives a key the editing command of the machine it runs on, not
// of the page's platform: on a Mac, Home and End scroll and Ctrl+Left does
// nothing in a field. There these keys are sent through CDP with the command
// Chromium gives them on Linux, or none where the Terminal takes the key;
// elsewhere they are pressed as they are.
const MAC_HOST = process.platform === 'darwin';

type LinuxKey = { key: string; code: string; keyCode: number; modifiers: number; command?: string };

const CTRL = 2;

const SHIFT = 8;

const LINUX_KEYS: Record<string, LinuxKey> = {
  Home: { key: 'Home', code: 'Home', keyCode: 36, modifiers: 0, command: 'moveToBeginningOfLine' },
  End: { key: 'End', code: 'End', keyCode: 35, modifiers: 0, command: 'moveToEndOfLine' },
  'Shift+End': { key: 'End', code: 'End', keyCode: 35, modifiers: SHIFT, command: 'moveToEndOfLineAndModifySelection' },
  'Control+ArrowLeft': { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37, modifiers: CTRL, command: 'moveWordLeft' },
  'Control+ArrowRight': { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, modifiers: CTRL, command: 'moveWordRight' },
  'Control+Backspace': { key: 'Backspace', code: 'Backspace', keyCode: 8, modifiers: CTRL, command: 'deleteWordBackward' },
  'Control+A': { key: 'a', code: 'KeyA', keyCode: 65, modifiers: CTRL },
  'Control+C': { key: 'c', code: 'KeyC', keyCode: 67, modifiers: CTRL },
};

export async function pressLinux(page: Page, name: string): Promise<void> {
  const key = LINUX_KEYS[name];
  if (!MAC_HOST || key === undefined) return page.keyboard.press(name);
  const cdp = await page.context().newCDPSession(page);
  try {
    const event = { key: key.key, code: key.code, windowsVirtualKeyCode: key.keyCode, modifiers: key.modifiers };
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...event, ...(key.command === undefined ? {} : { commands: [key.command] }) });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...event });
  } finally {
    await cdp.detach();
  }
}

type Found = { type: string; detail: string };

// The command line's cursor as drawn, read with its blink held at the start
// (the filled half) so a blink's other half isn't taken for hollow; and any
// outline or border on the line or its field.
function cursorLook(page: Page) {
  return page.evaluate(([mirrorSelector, lineSelector]) => {
    const mirror = document.querySelector(mirrorSelector);
    const block = mirror?.querySelector<HTMLElement>('.cursor-block');
    const line = document.querySelector<HTMLElement>(lineSelector);
    if (mirror === null || mirror === undefined || block === null || block === undefined || line === null) return null;
    const animations = block.getAnimations();
    const times = animations.map((animation) => animation.currentTime);
    for (const animation of animations) {
      animation.pause();
      animation.currentTime = 0;
    }
    const style = getComputedStyle(block);
    const painted = (color: string) => color !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(color);
    const filled = painted(style.backgroundColor);
    const hollow = !filled && style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0;
    animations.forEach((animation, index) => {
      animation.currentTime = times[index] ?? 0;
      animation.play();
    });
    const edge = (element: HTMLElement | null): string | null => {
      if (element === null) return null;
      const box = getComputedStyle(element);
      if (box.outlineStyle !== 'none' && Number.parseFloat(box.outlineWidth) > 0) return `an outline (${box.outlineStyle} ${box.outlineWidth})`;
      const side = ['top', 'right', 'bottom', 'left'].find((name) => Number.parseFloat(box.getPropertyValue(`border-${name}-width`)) > 0 && box.getPropertyValue(`border-${name}-style`) !== 'none');
      return side === undefined ? null : `a border (${box.getPropertyValue(`border-${side}-style`)} ${box.getPropertyValue(`border-${side}-width`)})`;
    };
    return { focused: mirror.hasAttribute('data-focused'), filled, hollow, edge: edge(line) ?? edge(line.closest<HTMLElement>('.command-field')) };
  }, [TERMINAL.cursorMirror, TERMINAL.commandLine] as const);
}

// With focus in the command line: the cursor filled, and no box (SC-015).
async function filledCursor(page: Page): Promise<Found[]> {
  const look = await cursorLook(page);
  if (look === null) return [{ type: 'cursor', detail: 'the command line draws no cursor' }];
  const found: Found[] = [];
  if (!look.focused || !look.filled) found.push({ type: 'cursor', detail: 'the cursor is not filled with focus in the command line' });
  if (look.edge !== null) found.push({ type: 'outline', detail: `the focused command line has ${look.edge}` });
  return found;
}

// Focus elsewhere: the cursor hollow, and still no box.
async function hollowCursor(page: Page): Promise<Found[]> {
  const look = await cursorLook(page);
  if (look === null) return [{ type: 'cursor', detail: 'the command line draws no cursor' }];
  const found: Found[] = [];
  if (look.focused || look.filled) found.push({ type: 'cursor', detail: 'the cursor stays filled after Tab left the command line' });
  else if (!look.hollow) found.push({ type: 'cursor', detail: 'the cursor is not hollow after Tab left the command line' });
  if (look.edge !== null) found.push({ type: 'outline', detail: `the command line has ${look.edge} without focus` });
  return found;
}

// The field's text and caret, and where the mirror draws its cursor: the
// length of the text before its block.
const field = (page: Page) =>
  page.locator(TERMINAL.commandLine).evaluate((input: HTMLInputElement) => {
    const mirror = input.parentElement?.querySelector('.cursor-mirror');
    let cursor = 0;
    for (const node of mirror?.childNodes ?? []) {
      if (node instanceof Element && node.classList.contains('cursor-block')) break;
      cursor += node.textContent?.length ?? 0;
    }
    const caret = input.selectionDirection === 'backward' ? input.selectionStart : input.selectionEnd;
    return { value: input.value, caret: caret ?? input.value.length, cursor };
  });

// The line the key steps edit, and where FR-074's Linux keys put the caret
// in it: Ctrl+Right at the first word's end, Ctrl+Left at the last word's
// start.
const LINE = 'cat cv.json | jq';

async function caretProblems(page: Page, key: string, at: number, value = LINE): Promise<Found[]> {
  const now = await field(page);
  const found: Found[] = [];
  if (now.value !== value) found.push({ type: 'line-key', detail: `${key} left ${JSON.stringify(now.value)} in the command line, expected ${JSON.stringify(value)}` });
  else if (now.caret !== at) found.push({ type: 'line-key', detail: `${key} put the caret at ${now.caret}, expected ${at}` });
  if (now.cursor !== now.caret) found.push({ type: 'line-key', detail: `the cursor is drawn at ${now.cursor}, the caret is at ${now.caret}` });
  return found;
}

// The page's selection after select all: its text, and the first element
// outside the Terminal's screen it takes in.
const selected = (page: Page) =>
  page.evaluate((screenSelector) => {
    const selection = document.getSelection();
    const screen = document.querySelector(screenSelector);
    if (selection === null || selection.isCollapsed || screen === null) return { text: '', outside: null };
    const describe = (element: Element) => `${element.tagName.toLowerCase()}${element.classList.length === 0 ? '' : `.${element.classList[0]}`}`;
    for (const element of document.querySelectorAll('body *')) {
      if (screen.contains(element) || element.contains(screen) || (element.textContent ?? '').trim() === '') continue;
      if (selection.containsNode(element, true)) return { text: selection.toString(), outside: describe(element) };
    }
    return { text: selection.toString(), outside: null };
  }, TERMINAL.screen);

// The steps after `exit`: the Terminal opened again from its dock item,
// where focus is; then its cursor with focus and without, the line's Linux
// keys, select all and Ctrl+C. Each step with focus in the command line
// checks its cursor is filled with no box around the line (SC-015).
async function commandLineSteps(page: Page, step: Flow['step']): Promise<void> {
  const T = TERMINAL;
  const lineName = "the Terminal's command line";
  const inLine = (label: string, options: Omit<StepOptions, 'target' | 'targetName'> & { also?: () => Promise<Found[]> }) =>
    step(label, {
      ...options,
      target: T.commandLine,
      targetName: lineName,
      indicator: false,
      check: async () => [...(await filledCursor(page)), ...((await options.also?.()) ?? [])],
    });
  const key = (name: string) => () => pressLinux(page, name);
  if (!(await inLine('open the Terminal again', { keys: ['Enter'], done: () => visible(page, T.commandLine), failed: { subject: 'Enter', detail: "the Terminal's dock item did not open the Terminal" } }))) return;
  if (
    !(await step('leave the command line with Tab', {
      keys: ['Tab'],
      done: async () => !(await focusOn(page, T.commandLine)),
      failed: { subject: 'Tab', detail: "Tab didn't move focus out of the command line" },
      target: '#os',
      targetName: 'the next control after the command line',
      inside: true,
      check: () => hollowCursor(page),
    }))
  )
    return;
  if (!(await inLine('come back with Shift+Tab', { keys: ['Shift+Tab'] }))) return;
  if (!(await inLine('type a line', { act: () => page.keyboard.type(LINE), also: () => caretProblems(page, 'typing', LINE.length) }))) return;
  if (!(await inLine('Home', { act: key('Home'), also: () => caretProblems(page, 'Home', 0) }))) return;
  if (!(await inLine('Ctrl+Right', { act: key('Control+ArrowRight'), also: () => caretProblems(page, 'Ctrl+Right', LINE.indexOf(' ')) }))) return;
  if (!(await inLine('End', { act: key('End'), also: () => caretProblems(page, 'End', LINE.length) }))) return;
  if (!(await inLine('Ctrl+Left', { act: key('Control+ArrowLeft'), also: () => caretProblems(page, 'Ctrl+Left', LINE.lastIndexOf(' ') + 1) }))) return;
  const shorter = LINE.slice(0, LINE.lastIndexOf(' ') + 1);
  if (!(await inLine('Ctrl+Backspace at the end', { act: async () => (await key('End')(), await key('Control+Backspace')()), also: () => caretProblems(page, 'Ctrl+Backspace', shorter.length, shorter) }))) return;
  if (
    !(await inLine('select all with Ctrl+A', {
      act: key('Control+A'),
      also: async () => {
        const { text, outside } = await selected(page);
        if (text.trim() === '') return [{ type: 'select-all', detail: 'Ctrl+A selected nothing' }];
        return outside === null ? [] : [{ type: 'select-all', detail: `Ctrl+A selected text outside the Terminal, in ${outside}` }];
      },
    }))
  )
    return;
  // A letter first clears select all's selection, so Ctrl+C has nothing
  // selected to copy.
  const typedLine = `${shorter}x`;
  const before = await count(page, T.run);
  await inLine('Ctrl+C on a typed line', {
    act: async () => {
      await page.keyboard.type('x');
      await pressLinux(page, 'Control+C');
    },
    also: async () => {
      const added = await until(async () => (await count(page, T.run)) > before);
      const last = page.locator(T.run).last();
      if (!added || (await last.locator('.run-line').textContent()) !== typedLine || (await last.locator('.run-cancel').count()) === 0) return [{ type: 'cancel', detail: `Ctrl+C added no run of ${JSON.stringify(typedLine)} ending in ^C` }];
      const left = await page.locator(T.commandLine).inputValue();
      return left === '' ? [] : [{ type: 'cancel', detail: `the command line still holds ${JSON.stringify(left)} after Ctrl+C` }];
    },
  });
}

// ---- The inspector (007 FR-032) ----------------------------------------------

// The inspector's flow at 1440 × 900, by keys alone: the CV's "Show specs"
// by its control, Back, "Show specs" from the app's menu, "What's this?"
// opened and closed, Back, then the same for the Terminal and About this
// site. Each step checks where focus lands (FR-017) and its indicator.
export async function inspectorKeyboardProblems(page: Page, pageLabel: string, variant: string): Promise<Problem[]> {
  const { problems, step } = flow(page, pageLabel, variant);
  const I = INSPECTOR;
  const name = (view: InspectorView) => (view === 'cv' ? 'CV' : view === 'terminal' ? 'Terminal' : 'About this site');
  const heading = (view: InspectorView) => `${I.specView(view)} h1.spec-heading`;
  const showing = (view: InspectorView) => async () => (await count(page, I.groups(view))) > 0;
  const gone = (view: InspectorView) => async () => (await count(page, I.specView(view))) === 0;
  // Presses `key` until focus is on `target`, at most `limit` times.
  const pressTo = (key: string, target: string, limit = 60) => async () => {
    for (let presses = 0; presses < limit && !(await focusOn(page, target)); presses += 1) await page.keyboard.press(key);
  };
  const show = (view: InspectorView) => step(`Show specs for ${name(view)}`, { keys: ['Enter'], done: showing(view), failed: { subject: 'Enter', detail: `Show specs did not show the ${name(view)}'s specs` }, target: heading(view), targetName: `the ${name(view)} spec view's heading` });
  const leave = (view: InspectorView) =>
    step(`Back to ${name(view)}`, {
      act: async () => {
        await pressTo('Shift+Tab', I.back(view), 3)();
        await page.keyboard.press('Enter');
      },
      done: gone(view),
      failed: { subject: 'Enter', detail: `Back to ${name(view)} did not show the app` },
      target: I.showSpecs(view, 'desktop'),
      targetName: `the ${name(view)} window's Show specs`,
    });
  const run = async (): Promise<void> => {
    if (!(await step("reach the CV's Show specs", { act: async () => { await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.()); await pressTo('Tab', I.showSpecs('cv', 'desktop'))(); }, target: I.showSpecs('cv', 'desktop'), targetName: "the CV window's Show specs" }))) return;
    if (!(await show('cv'))) return;
    if (!(await leave('cv'))) return;
    // From the app's menu: the menu bar, the app's menu, its Show specs.
    const fromMenu = async () => {
      await page.keyboard.press('Alt+Shift+M');
      await until(() => focusIn(page, '#os .menu-bar'));
      await pressTo('ArrowRight', SHELL.appMenuTitle, 5)();
      await page.keyboard.press('Enter');
      await until(() => visible(page, SHELL.appMenu));
      for (let presses = 0; presses < 20; presses += 1) {
        const label = await page.evaluate(() => (document.activeElement?.querySelector('.label')?.textContent ?? document.activeElement?.textContent ?? '').trim());
        if (label === 'Show specs') break;
        await page.keyboard.press('ArrowDown');
      }
      await page.keyboard.press('Enter');
    };
    if (!(await step('Show specs from the menu', { act: fromMenu, done: showing('cv'), failed: { subject: 'Alt+Shift+M', detail: "the CV menu's Show specs did not show the specs" }, target: heading('cv'), targetName: "the CV spec view's heading" }))) return;
    const toggle = (open: boolean) =>
      step(open ? "open What's this?" : "close What's this?", {
        act: async () => {
          await pressTo('Shift+Tab', I.whatsThis('cv'), 3)();
          await page.keyboard.press('Enter');
        },
        done: async () => (await page.getAttribute(I.whatsThis('cv'), 'aria-expanded')) === String(open),
        failed: { subject: 'Enter', detail: `What's this? did not ${open ? 'open' : 'close'}` },
        target: I.whatsThis('cv'),
        targetName: "What's this?",
      });
    if (!(await toggle(true))) return;
    if (!(await toggle(false))) return;
    if (!(await leave('cv'))) return;
    // The Terminal, opened from the dock.
    const openTerminal = async () => {
      await page.keyboard.press('Alt+Shift+D');
      await until(() => focusIn(page, '#os .dock'));
      await pressTo('ArrowRight', SHELL.terminalDockItem, 5)();
      await page.keyboard.press('Enter');
    };
    if (!(await step('open the Terminal', { act: openTerminal, done: () => visible(page, TERMINAL.commandLine), failed: { subject: 'Alt+Shift+D', detail: 'the dock did not open the Terminal' }, target: TERMINAL.commandLine, targetName: "the Terminal's command line", reveal: true }))) return;
    if (!(await step("reach the Terminal's Show specs", { act: pressTo('Shift+Tab', I.showSpecs('terminal', 'desktop')), target: I.showSpecs('terminal', 'desktop'), targetName: "the Terminal window's Show specs" }))) return;
    if (!(await show('terminal'))) return;
    if (!(await leave('terminal'))) return;
    // About this site, from the site menu.
    const openAbout = async () => {
      await page.keyboard.press('Alt+Shift+M');
      await until(() => visible(page, SHELL.siteMenuTitle));
      await page.keyboard.press('Enter');
      await until(() => visible(page, SHELL.aboutItem));
      await page.keyboard.press('Enter');
      await until(() => visible(page, SHELL.aboutWindow));
      await pressTo('Tab', I.showSpecs('about', 'desktop'))();
    };
    if (!(await step("reach About this site's Show specs", { act: openAbout, target: I.showSpecs('about', 'desktop'), targetName: "About this site's Show specs" }))) return;
    if (!(await show('about'))) return;
    await leave('about');
  };
  await run();
  return problems;
}
