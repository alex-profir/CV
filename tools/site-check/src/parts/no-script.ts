// The no-script part (research R14, FR-052, FR-014, FR-015): with scripting
// off, `<main>` holds every shown field of the CV document in order, the
// style sheet applied, and there's no control a script would have to make
// work. The offline part reuses the field and style checks.
import type { Locator, Page } from 'playwright';
import { tokenValue } from '@cv/tokens';
import type { ExpectedField } from '../expected.ts';
import type { Problem } from '../report.ts';

// Markers for a `time` element's datetime and a link's address, placed where
// the element starts in the text of `<main>`. They hold no white space.
const OPEN = '\u0001';

const CLOSE = '\u0002';

const collapse = (value: string) => value.replace(/\s+/g, ' ');

// An element's text in DOM order, with a marker where each `time[datetime]`
// and `a[href]` starts, and white space collapsed. Run in the page.
function sequenceIn(root: Element, { open, close }: { open: string; close: string }): string {
  let text = '';
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? '';
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as Element;
    if (element.matches('time[datetime]')) text += `${open}time:${element.getAttribute('datetime')}${close}`;
    if (element.matches('a[href]')) text += `${open}href:${element.getAttribute('href')}${close}`;
    for (const child of element.childNodes) walk(child);
  };
  walk(root);
  return text.replace(/\s+/g, ' ');
}

// The text of `<main>`, or of the element `root` names, as `sequenceIn`
// gives it. Empty when there's no such element.
export async function mainSequence(page: Page, root = 'main'): Promise<string> {
  const element = await page.$(root);
  if (element === null) return '';
  try {
    return await element.evaluate(sequenceIn, { open: OPEN, close: CLOSE });
  } finally {
    await element.dispose();
  }
}

// The same, for the element a locator finds.
export const elementSequence = (element: Locator): Promise<string> => element.evaluate(sequenceIn, { open: OPEN, close: CLOSE });

function needle(field: ExpectedField): string {
  if ('datetime' in field) return `${OPEN}time:${field.datetime}${CLOSE}`;
  if ('href' in field) return `${OPEN}href:${field.href}${CLOSE}`;
  return collapse(field.text);
}

const shown = (field: ExpectedField) => ('datetime' in field ? (field.visible ?? field.datetime) : 'href' in field ? field.href : field.text);

export type FieldProblem = { type: 'missing-field' | 'out-of-order'; subject: string; detail: string };

// Each expected field must occur after the previous one. A field that occurs
// only earlier is out of order, named against the field it appears before;
// of a run of such fields, only the first is named. A field that doesn't
// occur at all is missing. `when` ends the detail: the condition the page
// was loaded in; `place` is where the field was looked for.
export function fieldProblems(sequence: string, fields: readonly ExpectedField[], when = 'with scripting off', place = 'the page'): FieldProblem[] {
  const problems: FieldProblem[] = [];
  let from = 0;
  let previous: string | null = null;
  let inRun = false;
  for (const field of fields) {
    const target = needle(field);
    const at = sequence.indexOf(target, from);
    if (at >= 0) {
      from = at + target.length;
      previous = field.path;
      inRun = false;
      continue;
    }
    if (sequence.includes(target)) {
      if (!inRun) problems.push({ type: 'out-of-order', subject: field.path, detail: `appears before ${previous ?? 'the start of the page'}` });
      inRun = true;
      continue;
    }
    inRun = false;
    problems.push({ type: 'missing-field', subject: field.path, detail: `"${shown(field)}" is not in ${place}${when === '' ? '' : ` ${when}`}` });
  }
  return problems;
}

const rgb = (hex: string) => {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? [...value].map((digit) => digit + digit).join('') : value.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((offset) => Number.parseInt(full.slice(offset, offset + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
};

const firstFamily = (list: string) => (list.split(',')[0] ?? '').trim().replace(/^["']|["']$/g, '');

// Whether the style sheet applied: the body's background, and the font
// family of the element `textIn` names (the body by default), are the
// tokens' values. Null when it did.
export async function unstyledDetail(page: Page, textIn = 'body'): Promise<string | null> {
  const body = await page.evaluate((selector) => {
    const text = document.querySelector(selector) ?? document.body;
    return { background: getComputedStyle(document.body).backgroundColor, family: getComputedStyle(text).fontFamily };
  }, textIn);
  const background = rgb(tokenValue('color.surface'));
  if (body.background !== background) return `the style sheet did not apply (background is ${body.background}, expected the background token)`;
  const family = firstFamily(tokenValue('font.family.body'));
  if (firstFamily(body.family) !== family) return `the style sheet did not apply (font family is ${JSON.stringify(firstFamily(body.family))}, expected the body font token)`;
  return null;
}

// Controls and elements that only make sense with a script (FR-015).
const SCRIPT_ONLY = 'button, input, select, textarea, form, noscript, [contenteditable], [onclick]';

export async function noScriptProblems(page: Page, fields: readonly ExpectedField[], pageLabel: string, variant: string): Promise<Problem[]> {
  const problem = (type: string, subject: string, detail: string): Problem => ({ part: 'no-script', page: pageLabel, variant, type, subject, detail });
  const problems = fieldProblems(await mainSequence(page), fields).map(({ type, subject, detail }) => problem(type, subject, detail));
  const unstyled = await unstyledDetail(page);
  if (unstyled !== null) problems.push(problem('unstyled', 'body', unstyled));
  const controls = await page.evaluate((selector) => {
    const describe = (element: Element) => {
      const classes = typeof element.className === 'string' && element.className.trim() !== '' ? `.${element.className.trim().split(/\s+/).join('.')}` : '';
      return `${element.tagName.toLowerCase()}${classes}`;
    };
    return [...document.querySelectorAll(selector)].map(describe);
  }, SCRIPT_ONLY);
  for (const subject of new Set(controls)) problems.push(problem('script-only-control', subject, 'a control or element that needs a script, which the page must not hold'));
  return problems;
}

// What a visitor could take for a control: 004's list, and the roles of the
// shell's menus and buttons.
const CONTROLS = `${SCRIPT_ONLY}, [role="button"], [role="menubar"], [role="menu"], [role^="menuitem"]`;

// The site root with scripting off (005 FR-049, contracts/cli.md Parts): the
// site's name as its heading, a link to /cv, the style sheet applied, and no
// control shown. The shell's markup is in the page for the script to
// hydrate, so only what's rendered counts.
export async function rootNoScriptProblems(page: Page, name: string, cvPath: string, pageLabel: string, variant: string): Promise<Problem[]> {
  const problem = (type: string, subject: string, detail: string): Problem => ({ part: 'no-script', page: pageLabel, variant, type, subject, detail });
  const problems: Problem[] = [];
  const shown = await page.evaluate(
    ({ selector, href }) => {
      const rendered = (element: Element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
      const describe = (element: Element) => {
        const classes = typeof element.className === 'string' && element.className.trim() !== '' ? `.${element.className.trim().split(/\s+/).join('.')}` : '';
        return `${element.tagName.toLowerCase()}${classes}`;
      };
      return {
        headings: [...document.querySelectorAll('h1')].filter(rendered).map((heading) => (heading.textContent ?? '').replace(/\s+/g, ' ').trim()),
        link: [...document.querySelectorAll(`a[href="${href}"]`)].some(rendered),
        controls: [...document.querySelectorAll(selector)].filter(rendered).map(describe),
      };
    },
    { selector: CONTROLS, href: cvPath },
  );
  if (!shown.headings.includes(collapse(name).trim())) problems.push(problem('missing-heading', 'h1', `the site's name, ${JSON.stringify(name)}, is not shown as the heading with scripting off`));
  if (!shown.link) problems.push(problem('missing-link', `a[href="${cvPath}"]`, 'no link to the CV is shown with scripting off'));
  // The page's text is in `main`, which the style sheet gives /cv's body
  // font; the body keeps the background.
  const unstyled = await unstyledDetail(page, 'main');
  if (unstyled !== null) problems.push(problem('unstyled', 'body', unstyled));
  for (const subject of new Set(shown.controls)) problems.push(problem('visible-control', subject, 'a control is shown with scripting off'));
  return problems;
}
