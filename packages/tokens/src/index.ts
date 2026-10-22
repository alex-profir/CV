// How code reads design tokens (contracts/token-output.md). The names, types
// and values come from the generated file; this file holds none of them.
import { activeThemes, themeGroups, themeValues, tokenTypes } from './tokens.generated.ts';

export { activeThemes, themeGroups, themeValues, tokenTypes };

// Every token name, from both token sources.
export type TokenName = keyof typeof tokenTypes;

// The 17 types Penpot supports, and the motion token source's two.
export type TokenType =
  | 'color'
  | 'dimension'
  | 'spacing'
  | 'sizing'
  | 'borderRadius'
  | 'borderWidth'
  | 'opacity'
  | 'rotation'
  | 'number'
  | 'fontFamilies'
  | 'fontSizes'
  | 'fontWeights'
  | 'letterSpacing'
  | 'textCase'
  | 'textDecoration'
  | 'typography'
  | 'shadow'
  | 'duration'
  | 'cubicBezier';

type NamesOfType<T extends TokenType> = { [Name in TokenName]: (typeof tokenTypes)[Name] extends T ? Name : never }[TokenName];

export type TypographyTokenName = NamesOfType<'typography'>;

// What cssVar() accepts: every token except typography tokens, which have no
// single custom property.
export type CssVarTokenName = Exclude<TokenName, TypographyTokenName>;

export type DurationTokenName = NamesOfType<'duration'>;

export type BreakpointTokenName = Extract<CssVarTokenName, `breakpoint.${string}`>;

// The CSS name of a token: the namespace prefix and the name in lower case,
// with `.` and `_` replaced by `-`. tools/token-check/src/names.ts maps names
// the same way, and a test keeps the two in step.
function cssName(name: string): string {
  return `--token-${name.toLowerCase().replace(/[._]/g, '-')}`;
}

// `var(--token-…)` for any token except a typography token.
export function cssVar(name: CssVarTokenName): string {
  return `var(${cssName(name)})`;
}

const TYPOGRAPHY_PARTS = {
  fontFamily: 'font-family',
  fontSize: 'font-size',
  fontWeight: 'font-weight',
  fontStyle: 'font-style',
  lineHeight: 'line-height',
  letterSpacing: 'letter-spacing',
  textTransform: 'text-transform',
  textDecoration: 'text-decoration',
} as const;

export type TypographyStyle = Record<keyof typeof TYPOGRAPHY_PARTS, string>;

// A typography token as a style object of eight `var()` strings, to spread
// into a `style` prop. A part the token doesn't set reads an undefined
// variable, so the property inherits.
export function typography(name: TypographyTokenName): TypographyStyle {
  const style = {} as TypographyStyle;
  for (const [property, part] of Object.entries(TYPOGRAPHY_PARTS) as [keyof TypographyStyle, string][]) {
    style[property] = `var(${cssName(`${name}.${part}`)})`;
  }
  return style;
}

// The active combination's name, groups in code-unit order, as the
// generator writes it.
const ACTIVE = Object.entries(activeThemes as Record<string, string>)
  .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  .map(([group, theme]) => `${group}/${theme}`)
  .join(' + ');

const ACTIVE_VALUES = themeValues[ACTIVE as keyof typeof themeValues] as Record<string, unknown>;

// The active combination's value as CSS text, for APIs that can't read a
// variable.
export function tokenValue(name: CssVarTokenName): string {
  return ACTIVE_VALUES[name] as string;
}

// The media condition of a breakpoint token, for matchMedia().
export function mediaQuery(name: BreakpointTokenName): string {
  return `(width >= ${tokenValue(name)})`;
}

// A duration token's active value in milliseconds.
export function durationMs(name: DurationTokenName): number {
  const value = tokenValue(name).trim();
  const amount = Number.parseFloat(value);
  return value.endsWith('ms') || !value.endsWith('s') ? amount : amount * 1000;
}
