import { NAMED_COLORS } from './classify.ts';

// The 17 token types Penpot 2.18.3 supports in the export, from `penpot/penpot`
// `common/src/app/common/types/token.cljc` lines 87-107 (research R3), and the
// two the motion token source holds (research R4).
export const PENPOT_TYPES = [
  'color',
  'dimension',
  'spacing',
  'sizing',
  'borderRadius',
  'borderWidth',
  'opacity',
  'rotation',
  'number',
  'fontFamilies',
  'fontSizes',
  'fontWeights',
  'letterSpacing',
  'textCase',
  'textDecoration',
  'typography',
  'shadow',
] as const;

export const MOTION_TYPES = ['duration', 'cubicBezier'] as const;

// The keys a typography value may hold, and the type each follows.
export const TYPOGRAPHY_FIELDS: Record<string, string> = {
  fontFamilies: 'fontFamilies',
  fontSizes: 'fontSizes',
  fontWeights: 'fontWeights',
  lineHeights: 'lineHeights',
  letterSpacing: 'letterSpacing',
  textCase: 'textCase',
  textDecoration: 'textDecoration',
};

// The keys a shadow may hold, and the type each follows.
export const SHADOW_FIELDS: Record<string, string> = {
  offsetX: 'dimension',
  offsetY: 'dimension',
  blur: 'borderWidth',
  spread: 'dimension',
  color: 'color',
  inset: 'boolean',
};

// Penpot's named font weights, from `penpot/penpot` 2.18.3
// `common/src/app/common/types/token.cljc` lines 624-635.
export const FONT_WEIGHT_ALIASES: Record<string, readonly string[]> = {
  100: ['thin', 'hairline'],
  200: ['ultra light', 'extralight', 'extraleicht', 'extra-light', 'ultra-light', 'ultralight', 'extra light'],
  300: ['light', 'leicht'],
  400: ['book', 'normal', 'buch', 'regular'],
  500: ['kräftig', 'medium', 'kraeftig'],
  600: ['demi-bold', 'halbfett', 'demibold', 'demi bold', 'semibold', 'semi bold', 'semi-bold'],
  700: ['dreiviertelfett', 'bold'],
  800: ['extrabold', 'fett', 'extra-bold', 'ultrabold', 'ultra-bold', 'extra bold', 'ultra bold'],
  900: ['heavy', 'black', 'extrafett'],
  950: ['extra-black', 'extra black', 'ultra-black', 'ultra black'],
};

// Penpot's dimension pattern, from `common/src/app/common/files/tokens.cljc`
// lines 347-361 (research R8).
const DIMENSION = /^\s*(-?[0-9]+\.?[0-9]*)(px|%)?\s*$/;

const NUMBER = /^\s*-?(?:\d+\.?\d*|\.\d+)\s*$/;

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

const NUM = String.raw`(?:\d+\.?\d*|\.\d+)`;
const PERCENT = String.raw`${NUM}%`;
const ALPHA = String.raw`(?:${NUM}%?)`;
const HUE = String.raw`-?${NUM}(?:deg)?`;

const RGB_COMMAS = new RegExp(
  String.raw`^rgba?\(\s*(${NUM}%?)\s*,\s*(${NUM}%?)\s*,\s*(${NUM}%?)\s*(?:,\s*(${ALPHA})\s*)?\)$`,
  'i',
);
const RGB_SPACES = new RegExp(String.raw`^rgba?\(\s*(${NUM}%?)\s+(${NUM}%?)\s+(${NUM}%?)\s*(?:/\s*(${ALPHA})\s*)?\)$`, 'i');
const HSL_COMMAS = new RegExp(
  String.raw`^hsla?\(\s*${HUE}\s*,\s*(${PERCENT})\s*,\s*(${PERCENT})\s*(?:,\s*(${ALPHA})\s*)?\)$`,
  'i',
);
const HSL_SPACES = new RegExp(String.raw`^hsla?\(\s*${HUE}\s+(${PERCENT})\s+(${PERCENT})\s*(?:/\s*(${ALPHA})\s*)?\)$`, 'i');
const RGBA_HEX = new RegExp(String.raw`^rgba\(\s*(#[0-9a-f]+)\s*,\s*(${ALPHA})\s*\)$`, 'i');

const DIMENSION_TYPES = ['dimension', 'spacing', 'sizing', 'borderRadius', 'borderWidth', 'fontSizes', 'rotation'];

function text(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return typeof value === 'string' ? value : null;
}

function show(value: unknown): string {
  return JSON.stringify(value) ?? String(value);
}

function percentInRange(part: string, max: number): boolean {
  const number = Number.parseFloat(part);
  return part.endsWith('%') ? number <= 100 : number <= max;
}

function alphaInRange(part: string | undefined): boolean {
  return part === undefined || percentInRange(part, 1);
}

export function isColor(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const color = value.trim();
  if (HEX.test(color) || NAMED_COLORS.includes(color.toLowerCase())) return true;
  const rgb = RGB_COMMAS.exec(color) ?? RGB_SPACES.exec(color);
  if (rgb !== null) return [rgb[1]!, rgb[2]!, rgb[3]!].every((part) => percentInRange(part, 255)) && alphaInRange(rgb[4]);
  const hsl = HSL_COMMAS.exec(color) ?? HSL_SPACES.exec(color);
  if (hsl !== null) return percentInRange(hsl[1]!, 100) && percentInRange(hsl[2]!, 100) && alphaInRange(hsl[3]);
  const rgba = RGBA_HEX.exec(color);
  return rgba !== null && HEX.test(rgba[1]!) && alphaInRange(rgba[2]);
}

// The number a font weight stands for, and whether it's italic, or null when
// Penpot doesn't accept it. As Penpot's `parse-font-weight`, the text is
// lower-cased and an `italic` at the end is taken off.
export function parseFontWeight(value: unknown): { weight: string; italic: boolean } | null {
  const raw = text(value);
  if (raw === null) return null;
  const match = /^(.+?)\s*(italic)?$/.exec(raw.trim().toLowerCase());
  if (match === null) return null;
  const variant = match[1]!;
  const weight = Object.hasOwn(FONT_WEIGHT_ALIASES, variant)
    ? variant
    : Object.keys(FONT_WEIGHT_ALIASES).find((key) => FONT_WEIGHT_ALIASES[key]!.includes(variant));
  return weight === undefined ? null : { weight, italic: match[2] !== undefined };
}

// The font families of a fontFamilies value, or null when it isn't a list
// of non-empty names.
export function fontFamilyList(value: unknown): string[] | null {
  const names = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : null;
  if (names === null || names.length === 0) return null;
  const trimmed = names.map((name) => (typeof name === 'string' ? name.trim() : ''));
  return trimmed.every((name) => name !== '') ? trimmed : null;
}

function isDimension(value: unknown): boolean {
  const raw = text(value);
  return raw !== null && DIMENSION.test(raw);
}

function isNegative(value: unknown): boolean {
  const raw = text(value);
  return raw !== null && Number.parseFloat(raw) < 0;
}

function typographyProblem(value: unknown): string | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return `${show(value)} is not a typography (an object of font settings, or a reference to a typography token)`;
  }
  const fields = value as Record<string, unknown>;
  for (const [field, type] of Object.entries(TYPOGRAPHY_FIELDS)) {
    if (!(field in fields)) continue;
    const problem = valueProblem(type, fields[field], '');
    if (problem !== null) return problem;
  }
  if ('lineHeights' in fields && !('fontSizes' in fields)) return '"lineHeights" needs "fontSizes" in the same typography';
  return null;
}

function shadowProblem(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) {
    return `${show(value)} is not a shadow (a list of shadows, or a reference to a shadow token)`;
  }
  for (const shadow of value) {
    if (shadow === null || typeof shadow !== 'object' || Array.isArray(shadow)) {
      return `${show(shadow)} is not a shadow (an object with offsetX, offsetY, blur, spread and color)`;
    }
    const fields = shadow as Record<string, unknown>;
    for (const [field, type] of Object.entries(SHADOW_FIELDS)) {
      if (!(field in fields)) {
        if (field === 'inset') continue;
        return `a shadow needs ${show(field)}`;
      }
      if (type === 'boolean') {
        if (typeof fields[field] !== 'boolean') return `${show(fields[field])} is not true or false, as "inset" needs`;
        continue;
      }
      const problem = valueProblem(type, fields[field], '');
      if (problem !== null) return problem;
    }
  }
  return null;
}

function durationProblem(value: unknown): string | null {
  const raw = text(value);
  const match = raw === null ? null : /^\s*(-?(?:\d+\.?\d*|\.\d+))(ms|s)?\s*$/.exec(raw);
  if (match === null || (match[2] === undefined && Number(match[1]) !== 0)) {
    return `${show(value)} is not a duration (a number with ms or s, zero or more)`;
  }
  return Number(match[1]) < 0 ? `${show(value)} is negative` : null;
}

function cubicBezierProblem(value: unknown): string | null {
  if (!Array.isArray(value) || value.length !== 4 || !value.every((part) => typeof part === 'number' && Number.isFinite(part))) {
    return `${show(value)} is not a cubic Bézier: it needs four numbers`;
  }
  const [x1, , x2] = value as number[];
  if (x1! < 0 || x1! > 1 || x2! < 0 || x2! > 1) return `${show(value)} is not a cubic Bézier: the first and third numbers must be from 0 to 1`;
  return null;
}

// The `invalid-value` detail for a resolved value, or null when Penpot (or,
// for motion types, the motion token source) accepts it (data-model.md, Value
// rules). `name` is the token's name, for the breakpoint rule. A type with no
// rule here gives null: it's reported elsewhere.
export function valueProblem(type: string, value: unknown, name: string): string | null {
  const problem = typeProblem(type, value);
  if (problem !== null) return problem;
  if (name.split('.')[0] === 'breakpoint' && !/^\s*-?(?:\d+\.?\d*|\.\d+)(?:px)?\s*$/.test(text(value) ?? '')) {
    return 'a breakpoint needs a length in px';
  }
  return null;
}

function typeProblem(type: string, value: unknown): string | null {
  if (type === 'color') {
    return isColor(value) ? null : `${show(value)} is not a color (#hex, rgb(), rgba(), hsl(), hsla() or a named color)`;
  }
  if (type === 'rotation') {
    return isDimension(value) ? null : `${show(value)} is not a rotation Penpot accepts (a number of degrees)`;
  }
  if (DIMENSION_TYPES.includes(type)) {
    if (!isDimension(value)) return `${show(value)} is not a length Penpot accepts (a number, optionally with px or %)`;
    return type === 'borderWidth' && isNegative(value) ? `${show(value)} is negative` : null;
  }
  switch (type) {
    case 'opacity': {
      const raw = text(value);
      const match = raw === null ? null : /^\s*((?:\d+\.?\d*|\.\d+))(%)?\s*$/.exec(raw);
      const ok = match !== null && Number(match[1]) <= (match[2] === undefined ? 1 : 100);
      return ok ? null : `${show(value)} is not an opacity (a number from 0 to 1, or a percentage from 0% to 100%)`;
    }
    case 'number':
      return NUMBER.test(text(value) ?? '') ? null : `${show(value)} is not a number (a number with no unit)`;
    case 'fontWeights':
      return parseFontWeight(value) !== null
        ? null
        : `${show(value)} is not a font weight Penpot accepts (100 to 900 in hundreds, 950, or a named weight such as Regular or Bold, optionally followed by italic)`;
    case 'fontFamilies':
      return fontFamilyList(value) !== null ? null : `${show(value)} is not a font family list (an array of names, or one comma-separated string)`;
    case 'letterSpacing':
      return /^\s*-?(?:\d+\.?\d*|\.\d+)(?:px)?\s*$/.test(text(value) ?? '')
        ? null
        : `${show(value)} is not a letter spacing (a number, optionally with px)`;
    case 'lineHeights':
      return /^\s*(?:\d+\.?\d*|\.\d+)(?:px|%)?\s*$/.test(text(value) ?? '')
        ? null
        : `${show(value)} is not a line height (a number, a percentage, or a length in px)`;
    case 'textCase':
      return typeof value === 'string' && ['none', 'uppercase', 'lowercase', 'capitalize'].includes(value.trim().toLowerCase())
        ? null
        : `${show(value)} is not a text case (none, uppercase, lowercase or capitalize)`;
    case 'textDecoration':
      return typeof value === 'string' && ['none', 'underline', 'strike-through'].includes(value.trim().toLowerCase())
        ? null
        : `${show(value)} is not a text decoration (none, underline or strike-through)`;
    case 'typography':
      return typographyProblem(value);
    case 'shadow':
      return shadowProblem(value);
    case 'duration':
      return durationProblem(value);
    case 'cubicBezier':
      return cubicBezierProblem(value);
    default:
      return null;
  }
}
