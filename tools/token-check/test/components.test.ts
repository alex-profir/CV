import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { tokenProject } from './helpers/tokens.ts';

const CARD = 'packages/web/src/card.tsx';

// The problems found in one component of a sample, as
// `line:column type subject: detail`.
function check(tsx: string): string[] {
  return runCheck(tokenProject({ files: { [CARD]: tsx } }))
    .problems.filter((problem) => problem.location.file === CARD)
    .map(({ type, subject, location, detail }) => `${location.line}:${location.column} ${type} ${subject}: ${detail}`);
}

// `line:column` of the `nth` occurrence of `needle` in `text`.
function pos(text: string, needle: string, nth = 1): string {
  let offset = -1;
  for (let found = 0; found < nth; found += 1) {
    offset = text.indexOf(needle, offset + 1);
    if (offset === -1) throw new Error(`${needle} not found`);
  }
  const before = text.slice(0, offset).split('\n');
  return `${before.length}:${before.at(-1)!.length + 1}`;
}

const literal = (tsx: string, kind: string, value: string, nth = 1) => `${pos(tsx, value, nth)} literal-value ${kind}: ${JSON.stringify(value)} is written out; use a token`;

// A plain number, found at `needle`.
const number = (tsx: string, kind: string, needle: string, value: string) => `${pos(tsx, needle)} literal-value ${kind}: ${value} is a ${kind} written out; use a token`;

const unknown = (tsx: string, name: string) => `${pos(tsx, name)} unknown-token ${name}: no token has this name`;

const local = (tsx: string, name: string) =>
  `${pos(tsx, name)} local-in-token-namespace ${name}: --token- names are reserved for tokens; use another name for a local variable`;

// A component returning one element.
const component = (element: string) => `export function Card() {\n  return ${element};\n}\n`;

describe('003-design-tokens-FR-026: every token name a component reads exists', () => {
  test('a misspelled token name in a string is reported at the name', () => {
    const tsx = "export const raw = 'var(--token-color-text-primray)';\n";
    expect(check(tsx)).toEqual([unknown(tsx, '--token-color-text-primray')]);
  });

  test('the same in a template literal part', () => {
    const tsx = 'export const raw = (x: string) => `${x} var(--token-color-text-primray)`;\n';
    expect(check(tsx)).toEqual([unknown(tsx, '--token-color-text-primray')]);
  });

  test('a token that exists gives nothing', () => {
    expect(check("export const raw = 'var(--token-color-text-primary)';\n")).toEqual([]);
  });
});

describe('003-design-tokens-FR-051: local variables in components stay out of the token namespace', () => {
  test('a style key in the token namespace is reported', () => {
    const tsx = component("<div style={{ '--token-x': 'var(--token-space-4)' }} />");
    expect(check(tsx)).toEqual([local(tsx, '--token-x')]);
  });

  test('setProperty with a name in the token namespace is reported', () => {
    const tsx = "export function paint(el: HTMLElement) {\n  el.style.setProperty('--token-x', 'var(--token-space-4)');\n}\n";
    expect(check(tsx)).toEqual([local(tsx, '--token-x')]);
  });

  test('a local variable set from a token gives nothing', () => {
    expect(check(component("<div style={{ '--card-gap': 'var(--token-space-4)' }} />"))).toEqual([]);
  });
});

describe('003-design-tokens-FR-028: literal design values in components are reported', () => {
  test('an inline style', () => {
    const tsx = component("<div style={{ background: '#00000080' }} />");
    expect(check(tsx)).toEqual([literal(tsx, 'color', '#00000080')]);
  });

  test.each([
    ['a style property', "x.style.padding = '12px';"],
    ['a computed style property', "x.style['padding'] = '12px';"],
    ['cssText', "x.style.cssText = 'padding: 12px';"],
    ['setProperty', "x.style.setProperty('padding', '12px');"],
  ])('%s', (_name, statement) => {
    const tsx = `export function paint(x: HTMLElement) {\n  ${statement}\n}\n`;
    expect(check(tsx)).toEqual([literal(tsx, 'length', '12px')]);
  });

  test('setAttribute with an SVG color', () => {
    const tsx = "export function paint(x: Element) {\n  x.setAttribute('fill', '#1a1a1a');\n}\n";
    expect(check(tsx)).toEqual([literal(tsx, 'color', '#1a1a1a')]);
  });

  test('animate() keyframes and options', () => {
    const tsx = "export function play(x: Element) {\n  x.animate([{ color: '#fff' }], { duration: 300, easing: 'ease-out' });\n}\n";
    expect(check(tsx)).toEqual([literal(tsx, 'color', '#fff'), number(tsx, 'duration', '300', '300'), literal(tsx, 'easing', 'ease-out')]);
  });

  test('animate() with a duration as its second argument', () => {
    const tsx = 'export function play(x: Element, frames: Keyframe[]) {\n  x.animate(frames, 300);\n}\n';
    expect(check(tsx)).toEqual([number(tsx, 'duration', '300', '300')]);
  });

  test('a constant whose whole text is a color', () => {
    const tsx = "export const ink = '#1a1a1a';\n";
    expect(check(tsx)).toEqual([literal(tsx, 'color', '#1a1a1a')]);
  });

  test('a template literal part', () => {
    const tsx = 'export const gap = (x: string) => `${x} 12px`;\n';
    expect(check(tsx)).toEqual([literal(tsx, 'length', '12px')]);
  });

  test('both branches of a ternary in a style prop', () => {
    const tsx = component("<div style={{ color: on ? '#fff' : '#000' }} />").replace('Card()', 'Card({ on }: { on: boolean })');
    expect(check(tsx)).toEqual([literal(tsx, 'color', '#fff'), literal(tsx, 'color', '#000')]);
  });

  test("a size set through an image's styles", () => {
    const tsx = component("<img style={{ width: '24px' }} />");
    expect(check(tsx)).toEqual([literal(tsx, 'length', '24px')]);
  });

  test.each([
    ['a unit after a substitution', 'export const gap = (x: number) => `${x}px`;\n'],
    ['a bare keyword and a plain number in constants', "export const accent = 'red';\nexport const gap = 12;\n"],
    ['props of a custom component', component('<Icon size={24} />')],
    ["the media's own size", component('<div><img width={24} height={24} /><video width={640} /></div>')],
    ['a class name', component('<div className="red" />')],
  ])('%s gives nothing', (_name, tsx) => {
    expect(check(tsx)).toEqual([]);
  });
});

describe('003-design-tokens-FR-030: named colors in components are reported', () => {
  test('a CSS named color in a style prop', () => {
    const tsx = component("<p style={{ color: 'tomato' }} />");
    expect(check(tsx)).toEqual([literal(tsx, 'color', 'tomato')]);
  });
});

describe('003-design-tokens-FR-053: plain numbers in style props follow React DOM', () => {
  test('a length and a duration are reported', () => {
    const tsx = component('<div style={{ padding: 12, animationDuration: 300 }} />');
    expect(check(tsx)).toEqual([number(tsx, 'length', '12', '12'), number(tsx, 'duration', '300', '300')]);
  });

  test("unitless properties and custom properties give nothing", () => {
    expect(check(component("<div style={{ lineHeight: 1.5, opacity: 0.8, zIndex: 2, '--x': 12 }} />"))).toEqual([]);
  });

  test('a kebab-case key is not on the unitless list', () => {
    const tsx = component("<div style={{ 'line-height': 2 }} />");
    expect(check(tsx)).toEqual([number(tsx, 'length', '2 }', '2')]);
  });
});

describe('003-design-tokens-FR-055: SVG color, stroke width, font and size attributes are read, geometry is not', () => {
  test('an icon with geometry reports only its stroke width and its size', () => {
    const tsx = component('<svg viewBox="0 0 24 24" width={24}><circle r={4} strokeWidth={2} /><path d="M0 0h24" /></svg>');
    expect(check(tsx)).toEqual([number(tsx, 'length', '24}', '24'), number(tsx, 'length', '2}', '2')]);
  });

  test('a fill is a color', () => {
    const tsx = component('<path fill="#1a1a1a" />');
    expect(check(tsx)).toEqual([literal(tsx, 'color', '#1a1a1a')]);
  });

  test('stroke-width, stop color and font family attributes are checked', () => {
    const tsx = component('<svg><stop stopColor="#fff" /><line stroke-width="2" /><text font-family="Georgia" /></svg>');
    expect(check(tsx)).toEqual([literal(tsx, 'color', '#fff'), number(tsx, 'length', '2"', '2'), literal(tsx, 'font-family', 'Georgia')]);
  });

  test('geometry attributes give nothing', () => {
    expect(
      check(component('<svg><rect x={2} width={20} /><circle cx={12} /><polygon points="0,0 24,0" transform="scale(2)" strokeDasharray="4 2" /></svg>')),
    ).toEqual([]);
  });
});

describe('003-design-tokens-FR-056: system colors in components are reported', () => {
  test('a system color inline', () => {
    const tsx = component("<p style={{ color: 'Canvas' }} />");
    expect(check(tsx)).toEqual([literal(tsx, 'color', 'Canvas')]);
  });
});

describe('003-design-tokens-FR-057: no comment switches the search off in a component', () => {
  test.each([['a line comment', '// token-check: ignore'], ['a linter comment', '/* eslint-disable */']])('%s', (_name, comment) => {
    const tsx = `${comment}\n${component("<div style={{ padding: '12px' }} />")}`;
    expect(check(tsx)).toEqual([literal(tsx, 'length', '12px')]);
  });
});
