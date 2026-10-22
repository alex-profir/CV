import { lexer, parse, walk } from 'css-tree';
import type { CssNode, FunctionNode } from 'css-tree';
import type { Capabilities } from './grammar.ts';
import type { LiteralKind } from './report.ts';

// Keyword and unit lists for the literal values search (research R15;
// contracts/literal-values.md), and the rules that classify values with
// them. Lists are lower case unless noted, and are matched ignoring case.

const words = (text: string): readonly string[] => Object.freeze(text.trim().split(/\s+/));

// The 148 named colors of CSS Color 4, plus `transparent`, which is neutral
// (FR-029) but is still a color keyword.
export const NAMED_COLORS = words(`
  aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet
  brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan
  darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta
  darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue
  darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey
  dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray
  green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush
  lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen
  lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey
  lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue
  mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise
  mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive
  olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred
  papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue
  saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray
  slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white
  whitesmoke yellow yellowgreen transparent
`);

// The 19 current and 23 deprecated system colors of CSS Color 4, in their
// spec case.
export const SYSTEM_COLORS = words(`
  AccentColor AccentColorText ActiveText ButtonBorder ButtonFace ButtonText Canvas CanvasText
  Field FieldText GrayText Highlight HighlightText LinkText Mark MarkText SelectedItem
  SelectedItemText VisitedText
  ActiveBorder ActiveCaption AppWorkspace Background ButtonHighlight ButtonShadow CaptionText
  InactiveBorder InactiveCaption InactiveCaptionText InfoBackground InfoText Menu MenuText
  Scrollbar ThreeDDarkShadow ThreeDFace ThreeDHighlight ThreeDLightShadow ThreeDShadow Window
  WindowFrame WindowText
`);

export const GENERIC_FAMILIES = words(`
  serif sans-serif monospace cursive fantasy math system-ui ui-serif ui-sans-serif ui-monospace
  ui-rounded
`);

// Absolute and font-relative lengths (CSS Values 4).
export const LENGTH_UNITS = words('px cm mm q in pt pc em rem ex rex cap rcap ch rch ic ric lh rlh');

export const DURATION_UNITS = words('s ms');

export const EASING_KEYWORDS = words('linear ease ease-in ease-out ease-in-out step-start step-end');

export const LINE_WIDTH_KEYWORDS = words('thin medium thick hairline');

export const FONT_SIZE_KEYWORDS = words('xx-small x-small small medium large x-large xx-large xxx-large larger smaller');

export const SYSTEM_FONT_KEYWORDS = words('caption icon menu message-box small-caption status-bar');

// Never reported (FR-029).
export const NEUTRAL_KEYWORDS = words('inherit initial unset revert currentcolor transparent none auto');

// React DOM 19.3.1's unitless style properties, copied from `facebook/react`
// tag v19.3.1 `packages/react-dom-bindings/src/shared/isUnitlessNumber.js`.
// React appends `px` to a non-zero number on any other property, matching
// these by exact camelCase name (FR-053, research R16).
export const REACT_UNITLESS = words(`
  animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex
  boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink
  flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn
  gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order
  orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray
  strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex
  MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative
  msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan
  WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup
  WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink
  WebkitLineClamp
`);

export const COLOR_FUNCTIONS = words('rgb rgba hsl hsla hwb lab lch oklab oklch color');

export const EASING_FUNCTIONS = words('cubic-bezier steps linear');

const has = (list: readonly string[], word: string) => list.includes(word.toLowerCase());

// `length` or `duration` for a non-zero number in a length or duration unit,
// otherwise null. Units match ignoring case.
export function dimensionKind(value: string, unit: string): LiteralKind | null {
  if (Number(value) === 0) return null;
  if (has(LENGTH_UNITS, unit)) return 'length';
  if (has(DURATION_UNITS, unit)) return 'duration';
  return null;
}

// Whether a color function writes a color out. One that derives from a token
// with `from var(--token-…)` doesn't.
export function colorFunctionIsLiteral(node: FunctionNode): boolean {
  if (!has(COLOR_FUNCTIONS, node.name)) return false;
  const args = node.children.toArray().filter((child) => child.type !== 'WhiteSpace');
  const [first, second] = args;
  const fromToken =
    first?.type === 'Identifier' &&
    first.name.toLowerCase() === 'from' &&
    second?.type === 'Function' &&
    second.name.toLowerCase() === 'var' &&
    second.children.first?.type === 'Identifier' &&
    second.children.first.name.toLowerCase().startsWith('--token-');
  return !fromToken;
}

// The kind of a bare keyword where a property with these capabilities takes
// it, or null. System colors are allowed inside a forced-colors condition
// (FR-056), and neutral keywords never count (FR-029).
export function keywordKind(word: string, capabilities: Capabilities, inForcedColors: boolean): LiteralKind | null {
  if (has(NEUTRAL_KEYWORDS, word)) return null;
  if (capabilities.color && (has(NAMED_COLORS, word) || (!inForcedColors && SYSTEM_COLORS.some((color) => color.toLowerCase() === word.toLowerCase())))) {
    return 'color';
  }
  if (capabilities.easing && has(EASING_KEYWORDS, word)) return 'easing';
  if (capabilities.lineWidth && has(LINE_WIDTH_KEYWORDS, word)) return 'length';
  if (capabilities.fontSize && has(FONT_SIZE_KEYWORDS, word)) return 'length';
  return null;
}

// Whether a parsed value holds a written-out length or color, as a shadow
// that is a literal does.
function holdsLiteral(node: CssNode): boolean {
  let found = false;
  walk(node, (child) => {
    if (child.type === 'Hash') found = true;
    if (child.type === 'Dimension' && dimensionKind(child.value, child.unit) === 'length') found = true;
    if (child.type === 'Function' && colorFunctionIsLiteral(child)) found = true;
    if (child.type === 'Identifier' && keywordKind(child.name, { ...NO_CAPABILITIES, color: true }, false) !== null) found = true;
  });
  return found;
}

const NO_CAPABILITIES: Capabilities = { color: false, easing: false, lineWidth: false, fontSize: false, length: false, time: false };

// The kind of a string whose whole text, trimmed, is one design value: a
// hex color, a color function, a length or duration with a unit, an easing
// function, or a full shadow. Otherwise null (research R16).
export function wholeStringKind(text: string): LiteralKind | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  let ast: CssNode;
  try {
    ast = parse(trimmed, { context: 'value' });
  } catch {
    return null;
  }
  if (ast.type !== 'Value') return null;
  const parts = ast.children.toArray().filter((child) => child.type !== 'WhiteSpace');
  if (parts.length === 1) {
    const [part] = parts;
    if (part!.type === 'Hash') return 'color';
    if (part!.type === 'Dimension') return dimensionKind(part!.value, part!.unit);
    if (part!.type === 'Function' && colorFunctionIsLiteral(part!)) return 'color';
    if (part!.type === 'Function' && has(EASING_FUNCTIONS, part!.name)) return 'easing';
    return null;
  }
  const match = lexer.matchProperty('box-shadow', ast);
  return match.error === null && holdsLiteral(ast) ? 'shadow' : null;
}
