import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { tokenProject } from './helpers/tokens.ts';

const CARD = 'packages/web/src/card.css';

// The problems found in one style sheet of a sample, as
// `line:column type subject: detail`.
function check(css: string): string[] {
  return runCheck(tokenProject({ files: { [CARD]: css } }))
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

// A rule holding the given declarations, one per line.
const rule = (...declarations: string[]) => `.card {\n${declarations.map((declaration) => `  ${declaration}\n`).join('')}}\n`;

const literal = (css: string, kind: string, value: string, nth = 1) => `${pos(css, value, nth)} literal-value ${kind}: ${JSON.stringify(value)} is written out; use a token`;

const fallback = (css: string, kind: string, value: string) =>
  `${pos(css, value)} literal-value ${kind}: ${JSON.stringify(value)} is written out as the fallback of a token; remove it or use a token`;

const unknown = (css: string, name: string, media = false) =>
  `${pos(css, name)} unknown-token ${name}: ${media ? 'no breakpoint token has this name' : 'no token has this name'}`;

const local = (css: string, name: string) =>
  `${pos(css, name)} local-in-token-namespace ${name}: --token- names are reserved for tokens; use another name for a local variable`;

describe('003-design-tokens-FR-026: every token name a style sheet reads exists', () => {
  test('a token that exists gives nothing', () => {
    expect(check(rule('color: var(--token-color-text-primary);'))).toEqual([]);
  });

  test('a misspelled token name is reported at the name', () => {
    const css = rule('color: var(--token-color-text-primary);', 'background: var(--token-color-text-primray);');
    expect(check(css)).toEqual([unknown(css, '--token-color-text-primray')]);
  });

  test('a typography token is read through its parts', () => {
    expect(check(rule('font-size: var(--token-typography-body-font-size);'))).toEqual([]);
    const css = rule('font: var(--token-typography-body);');
    expect(check(css)).toEqual([unknown(css, '--token-typography-body')]);
  });
});

describe('003-design-tokens-FR-051: local variables stay out of the token namespace', () => {
  test('a local variable set from a token gives nothing', () => {
    expect(check(rule('--card-gap: var(--token-space-4);', 'gap: var(--card-gap);'))).toEqual([]);
  });

  test('a local variable named in the token namespace is reported, in any case', () => {
    const css = rule('--token-card-gap: var(--token-space-4);', '--TOKEN-x: 0;');
    expect(check(css)).toEqual([local(css, '--token-card-gap'), local(css, '--TOKEN-x')]);
  });

  test('a custom media query named in the token namespace is reported', () => {
    const css = '@custom-media --token-x (orientation: landscape);\n';
    expect(check(css)).toEqual([local(css, '--token-x')]);
  });
});

describe('003-design-tokens-FR-052: breakpoint tokens are read as custom media', () => {
  test('a breakpoint token in a media query gives nothing', () => {
    expect(check(`@media (--token-breakpoint-wide) {\n${rule('padding: var(--token-space-4);')}}\n`)).toEqual([]);
    expect(check(`@media not (--token-breakpoint-wide) {\n${rule('padding: var(--token-space-4);')}}\n`)).toEqual([]);
  });

  test('a misspelled breakpoint, or a token that is not a breakpoint, is reported', () => {
    const misspelled = `@media (--token-breakpoint-wiide) {\n${rule('padding: var(--token-space-4);')}}\n`;
    expect(check(misspelled)).toEqual([unknown(misspelled, '--token-breakpoint-wiide', true)]);
    const notBreakpoint = `@media (--token-space-4) {\n${rule('padding: var(--token-space-4);')}}\n`;
    expect(check(notBreakpoint)).toEqual([unknown(notBreakpoint, '--token-space-4', true)]);
  });
});

describe('003-design-tokens-FR-058: only names are checked, not which property reads them', () => {
  test('a color token used as a padding gives nothing', () => {
    expect(check(rule('padding: var(--token-color-text-primary);'))).toEqual([]);
  });
});

describe('003-design-tokens-FR-027: literal design values in style sheets are reported', () => {
  test('a length', () => {
    const css = rule('padding: 12px;');
    expect(check(css)).toEqual([literal(css, 'length', '12px')]);
  });

  test('a font family list, once per declaration', () => {
    const css = rule('font-family: Georgia, serif;');
    expect(check(css)).toEqual([literal(css, 'font-family', 'Georgia, serif')]);
  });

  test('a duration and an easing keyword', () => {
    const css = rule('transition: opacity 200ms ease-out;');
    expect(check(css)).toEqual([literal(css, 'duration', '200ms'), literal(css, 'easing', 'ease-out')]);
  });

  test('a breakpoint written out in a media query', () => {
    const css = `@media (min-width: 768px) {\n${rule('padding: var(--token-space-4);')}}\n`;
    expect(check(css)).toEqual([literal(css, 'length', '768px')]);
  });

  test('lengths in range queries, container queries and custom media definitions', () => {
    const css = `@media screen and (width >= 768px) {\n${rule('padding: var(--token-space-4);')}}\n@container (min-width: 400px) {\n${rule('padding: var(--token-space-4);')}}\n@custom-media --narrow (width < 600px);\n`;
    expect(check(css)).toEqual([literal(css, 'length', '768px'), literal(css, 'length', '400px'), literal(css, 'length', '600px')]);
  });

  test('a shadow, once, with the whole value', () => {
    const css = rule('box-shadow: 0 1px 3px #1f1d1a29;');
    expect(check(css)).toEqual([literal(css, 'shadow', '0 1px 3px #1f1d1a29')]);
  });

  test('a length in a custom property and inside calc()', () => {
    const css = rule('--card-gap: 12px;', 'width: calc(100% - 12px);');
    expect(check(css)).toEqual([literal(css, 'length', '12px'), literal(css, 'length', '12px', 2)]);
  });

  test('an easing function', () => {
    const css = rule('transition-timing-function: cubic-bezier(0.2, 0, 0, 1);');
    expect(check(css)).toEqual([literal(css, 'easing', 'cubic-bezier(0.2, 0, 0, 1)')]);
  });

  test('declarations in @keyframes and @font-face', () => {
    const css = '@keyframes rise {\n  from { translate: 0 8px; }\n}\n@font-face {\n  font-family: Inter;\n}\n';
    expect(check(css)).toEqual([literal(css, 'length', '8px'), literal(css, 'font-family', 'Inter')]);
  });

  test('a local variable in the token namespace is also checked for literals', () => {
    const css = rule('--token-card-gap: 4px;');
    expect(check(css)).toEqual([local(css, '--token-card-gap'), literal(css, 'length', '4px')]);
  });
});

describe('003-design-tokens-FR-029: neutral values are not reported', () => {
  test.each([
    ['zero in any unit', ['margin: 0;', 'padding: 0px;', 'transition-duration: 0s;']],
    [
      'global and neutral keywords',
      ['color: inherit;', 'color: initial;', 'color: unset;', 'color: revert;', 'border-color: currentColor;', 'background: transparent;', 'border: none;', 'margin: auto;'],
    ],
    ['relative units', ['width: 100%;', 'width: 50vw;', 'grid-template-columns: 1fr 2fr;']],
    ['angles and plain numbers', ['rotate: 45deg;', 'line-height: 1.5;', 'z-index: 10;', 'font-weight: 700;']],
    ['color-mix() of a token', ['background: color-mix(in srgb, var(--token-color-text-primary) 80%, transparent);']],
    ['a relative color from a token', ['color: rgb(from var(--token-color-base-ink) r g b / 50%);']],
  ])('%s', (_name, declarations) => {
    expect(check(rule(...declarations))).toEqual([]);
  });

  test('selectors, @supports, strings and url() are never read', () => {
    const css = `#main {\n  content: "#fff";\n  background: url(#a);\n}\n@supports (color: oklch(0 0 0)) {\n${rule('color: var(--token-color-text-primary);')}}\n`;
    expect(check(css)).toEqual([]);
  });
});

describe('003-design-tokens-FR-030: keywords from the built-in palettes are reported where the property takes them', () => {
  test('a named color, a line width and a font size keyword', () => {
    const css = rule('color: rebeccapurple;', 'border-width: thin;', 'font-size: x-large;');
    expect(check(css)).toEqual([literal(css, 'color', 'rebeccapurple'), literal(css, 'length', 'thin'), literal(css, 'length', 'x-large')]);
  });

  test('a color name where the property takes no color gives nothing', () => {
    expect(check(rule('animation-name: tomato;', 'grid-area: red;'))).toEqual([]);
  });
});

describe('003-design-tokens-FR-031: fallbacks are checked', () => {
  test('the fallback of a token', () => {
    const css = rule('color: var(--token-color-text-primary, #000000);');
    expect(check(css)).toEqual([fallback(css, 'color', '#000000')]);
  });

  test('the fallback of env()', () => {
    const css = rule('padding-top: env(safe-area-inset-top, 12px);');
    expect(check(css)).toEqual([literal(css, 'length', '12px')]);
  });
});

describe('003-design-tokens-FR-032: comments are not read', () => {
  test('values in a comment give nothing', () => {
    expect(check(`/* #1a1a1a and 12px */\n${rule('color: var(--token-color-text-primary);')}`)).toEqual([]);
    expect(check(rule('border: var(--token-space-4) /* 2px */ solid var(--token-color-text-primary);'))).toEqual([]);
  });

  test('a value after a comment is reported at its own column', () => {
    const css = rule('margin: /* #fff */ 12px;');
    expect(check(css)).toEqual([literal(css, 'length', '12px')]);
  });
});

describe('003-design-tokens-FR-053: a plain number in stroke-width is a length', () => {
  test('stroke-width: 2', () => {
    const css = rule('stroke-width: 2;');
    expect(check(css)).toEqual([`${pos(css, '2;')} literal-value length: 2 is a length written out; use a token`]);
  });
});

describe('003-design-tokens-FR-056: system colors are allowed only where forced colors are active', () => {
  const forced = (prelude: string, inner: string) => `@media ${prelude} {\n  .button:focus-visible {\n    ${inner}\n  }\n}\n`;

  test('a system color in a forced-colors condition, directly or nested, gives nothing', () => {
    expect(check(forced('(forced-colors: active)', 'outline-color: Highlight;'))).toEqual([]);
    expect(check('@media (forced-colors: active) {\n  .button {\n    &:focus-visible { outline-color: Highlight; }\n  }\n}\n')).toEqual([]);
    expect(check(forced('(forced-colors)', 'outline-color: Highlight;'))).toEqual([]);
  });

  test('a system color outside one is reported', () => {
    const css = rule('border-color: CanvasText;');
    expect(check(css)).toEqual([literal(css, 'color', 'CanvasText')]);
  });

  test.each([['not (forced-colors: active)'], ['(forced-colors: active), print'], ['(forced-colors: active) or (hover)']])(
    'a condition that does not require forced colors: %s',
    (prelude) => {
      const css = forced(prelude, 'border-color: CanvasText;');
      expect(check(css)).toEqual([literal(css, 'color', 'CanvasText')]);
    },
  );

  test('other literals inside a forced-colors condition are still reported', () => {
    const css = forced('(forced-colors: active)', 'padding: 12px;');
    expect(check(css)).toEqual([literal(css, 'length', '12px')]);
  });
});

describe('003-design-tokens-FR-057: no comment switches the search off', () => {
  test.each([
    ['an ignore comment', rule('padding: 12px; /* token-check: ignore */')],
    ['a disable block', `/* token-check-disable */\n${rule('padding: 12px;')}/* token-check-enable */\n`],
    ['a linter comment', `/* stylelint-disable */\n${rule('padding: 12px;')}`],
  ])('%s', (_name, css) => {
    expect(check(css)).toEqual([literal(css, 'length', '12px')]);
  });
});
