// The fonts part's page measurement (research R16): which fonts drew each
// piece of text, from the DevTools protocol's CSS.getPlatformFontsForNode.
// Every font must be one the site serves (a custom font) of one of
// `families`. When an element's text uses any other, its characters are
// queried one by one to name each one and where it appears (FR-007).
import type { CDPSession, Page } from 'playwright';
import type { Problem } from '../report.ts';

type PlatformFont = { familyName: string; isCustomFont: boolean; glyphCount: number };

const PROBE = 'data-cv-font-probe';

const CHAR = 'data-cv-font-char';

// Whether a font is a served face of one of the families. A variable face
// reports its default instance's name, such as "Space Grotesk Light".
export function servedBy(font: PlatformFont, families: readonly string[]): boolean {
  return font.isCustomFont && families.some((family) => font.familyName === family || font.familyName.startsWith(`${family} `));
}

async function fontsFor(cdp: Pick<CDPSession, 'send'>, nodeId: number): Promise<PlatformFont[]> {
  const { fonts } = (await cdp.send('CSS.getPlatformFontsForNode', { nodeId })) as { fonts: PlatformFont[] };
  return fonts;
}

// The fonts of an element the page may have taken away since it was found, as
// the Playground's editor redraws its lines at any time: text that's gone has
// no fonts to check.
export async function fontsIfThere(cdp: Pick<CDPSession, 'send'>, nodeId: number): Promise<PlatformFont[]> {
  try {
    return await fontsFor(cdp, nodeId);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Could not find node with given id')) return [];
    throw error;
  }
}

async function nodeIds(cdp: CDPSession, selector: string): Promise<number[]> {
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeIds: ids } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector });
  return ids;
}

const codePoint = (char: string) => `U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`;

export async function fontProblems(page: Page, families: readonly string[], pageLabel: string, variant: string): Promise<Problem[]> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const elements = await page.evaluate((probe) => {
    const describe = (element: Element) => {
      const classes = typeof element.className === 'string' && element.className.trim() !== '' ? `.${element.className.trim().split(/\s+/).join('.')}` : '';
      return `${element.tagName.toLowerCase()}${classes}`;
    };
    const marked: { selector: string; where: string }[] = [];
    for (const element of document.body.querySelectorAll('*')) {
      const ownText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '');
      if (!ownText || element.getClientRects().length === 0) continue;
      const section = element.closest('section');
      const heading = section?.querySelector('h2')?.textContent?.trim();
      const where = heading ? `section "${heading}"` : element.closest('footer') ? 'the footer' : element.closest('main') ? 'main' : 'the page';
      element.setAttribute(probe, String(marked.length));
      marked.push({ selector: describe(element), where });
    }
    return marked;
  }, PROBE);

  const cdp = await page.context().newCDPSession(page);
  const problems: Problem[] = [];
  const seen = new Set<string>();
  try {
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const failing: number[] = [];
    const ids = await nodeIds(cdp, `[${PROBE}]`);
    for (const [index, nodeId] of ids.entries()) {
      const fonts = await fontsIfThere(cdp, nodeId);
      if (fonts.some((font) => !servedBy(font, families))) failing.push(index);
    }
    for (const index of failing) {
      const { selector, where } = elements[index]!;
      // Each character of the element's own text in a span of its own.
      const count = await page.evaluate(
        ({ probe, char, index: at }) => {
          const element = document.querySelector(`[${probe}="${at}"]`)!;
          let made = 0;
          for (const node of [...element.childNodes]) {
            if (node.nodeType !== Node.TEXT_NODE) continue;
            const fragment = document.createDocumentFragment();
            for (const character of node.textContent ?? '') {
              const span = document.createElement('span');
              span.setAttribute(char, String(made));
              span.textContent = character;
              fragment.append(span);
              made += 1;
            }
            node.replaceWith(fragment);
          }
          // Lay the new spans out now: until a layout gives them boxes,
          // CSS.getPlatformFontsForNode reports no font at all for them, and
          // every character would pass unchecked.
          void element.getBoundingClientRect();
          return made;
        },
        { probe: PROBE, char: CHAR, index },
      );
      const spans = await nodeIds(cdp, `[${PROBE}="${index}"] > [${CHAR}]`);
      const characters = await page.evaluate(
        ({ probe, char, index: at }) => [...document.querySelectorAll(`[${probe}="${at}"] > [${char}]`)].map((span) => span.textContent ?? ''),
        { probe: PROBE, char: CHAR, index },
      );
      for (let position = 0; position < Math.min(count, spans.length); position += 1) {
        const character = characters[position]!;
        if (character.trim() === '') continue;
        const fonts = await fontsFor(cdp, spans[position]!);
        if (fonts.length === 0) throw new Error(`no font is reported for ${codePoint(character)} in ${selector}: the page wasn't laid out`);
        if (!fonts.some((font) => !servedBy(font, families))) continue;
        const subject = `${codePoint(character)} ${character}`;
        const detail = `in ${where} (${selector}), drawn in a fallback font`;
        if (seen.has(`${subject} ${detail}`)) continue;
        seen.add(`${subject} ${detail}`);
        problems.push({ part: 'fonts', page: pageLabel, variant, type: 'missing-glyph', subject, detail });
      }
      // Put the text back as it was.
      await page.evaluate(
        ({ probe, char, index: at }) => {
          const element = document.querySelector(`[${probe}="${at}"]`)!;
          for (const span of [...element.querySelectorAll(`:scope > [${char}]`)]) span.replaceWith(document.createTextNode(span.textContent ?? ''));
          element.normalize();
          void element.getBoundingClientRect();
        },
        { probe: PROBE, char: CHAR, index },
      );
    }
  } finally {
    await cdp.detach();
    await page.evaluate((probe) => {
      for (const element of document.querySelectorAll(`[${probe}]`)) element.removeAttribute(probe);
    }, PROBE);
  }
  return problems;
}

export type UnservedText = { selector: string; family: string; drawnIn: string };

// The elements whose text was drawn, at least in part, by a font that isn't
// a served face of one of `families`: the family the element asks for first,
// and the font that drew it instead. For the offline part, which names the
// family that didn't load (FR-053).
export async function unservedFonts(page: Page, families: readonly string[]): Promise<UnservedText[]> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const elements = await page.evaluate((probe) => {
    const marked: { selector: string; family: string }[] = [];
    for (const element of document.body.querySelectorAll('*')) {
      const ownText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '');
      if (!ownText || element.getClientRects().length === 0) continue;
      const classes = typeof element.className === 'string' && element.className.trim() !== '' ? `.${element.className.trim().split(/\s+/).join('.')}` : '';
      const family = (getComputedStyle(element).fontFamily.split(',')[0] ?? '').trim().replace(/^["']|["']$/g, '');
      element.setAttribute(probe, String(marked.length));
      marked.push({ selector: `${element.tagName.toLowerCase()}${classes}`, family });
    }
    return marked;
  }, PROBE);
  const cdp = await page.context().newCDPSession(page);
  const found: UnservedText[] = [];
  try {
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const ids = await nodeIds(cdp, `[${PROBE}]`);
    for (const [index, nodeId] of ids.entries()) {
      const other = (await fontsIfThere(cdp, nodeId)).find((font) => !servedBy(font, families));
      if (other !== undefined) found.push({ ...elements[index]!, drawnIn: other.familyName });
    }
  } finally {
    await cdp.detach();
    await page.evaluate((probe) => {
      for (const element of document.querySelectorAll(`[${probe}]`)) element.removeAttribute(probe);
    }, PROBE);
  }
  return found;
}
