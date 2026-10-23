// The keyboard part's page measurement (research R15). Every link must be
// reached by Tab in reading order, which is DOM order on this site (R8),
// show a focus indicator of 3:1 or more against the same pixels unfocused,
// and not be covered by other content when focused.
import zlib from 'node:zlib';
import type { Page } from 'playwright';
import { tokenValue } from '@cv/tokens';
import type { Problem } from '../report.ts';

type Box = { x: number; y: number; width: number; height: number };

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
function indicatorPixels(before: Image, after: Image): number {
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
function clipOf(page: Page, box: Box, pad: number): Box | null {
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
