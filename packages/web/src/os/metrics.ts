// Every design value the shell's scripts need, read once from the tokens
// (005 research R7, data-model.md Metrics). @cv/os-core reads no token
// itself: it gets these numbers. A token that isn't a plain px length or a
// plain number, or a duration that isn't in ms, throws here, so a bad token
// fails the build rather than a visit.
import { durationMs, tokenValue } from '@cv/tokens';
import type { CssVarTokenName, DurationTokenName } from '@cv/tokens';
import type { Metrics } from '@cv/os-core';
import fonts from '../fonts/fonts.json' with { type: 'json' };

function px(name: CssVarTokenName): number {
  const value = tokenValue(name);
  const match = /^(-?\d+(?:\.\d+)?)px$/.exec(value ?? '');
  if (match === null) throw new Error(`the token ${name} is ${JSON.stringify(value)}, not a plain px length`);
  return Number(match[1]);
}

function plain(name: CssVarTokenName): number {
  const value = tokenValue(name);
  if (!/^-?\d+(?:\.\d+)?$/.test(value ?? '')) throw new Error(`the token ${name} is ${JSON.stringify(value)}, not a plain number`);
  return Number(value);
}

function ms(name: DurationTokenName): number {
  const value = tokenValue(name);
  if (!/^\d+(?:\.\d+)?ms$/.test(value ?? '')) throw new Error(`the token ${name} is ${JSON.stringify(value)}, not a duration in ms`);
  return durationMs(name);
}

export const METRICS: Metrics = Object.freeze({
  desktopMinWidth: px('breakpoint.desktop-width'),
  desktopMinHeight: px('size.desktop-min-height'),
  menuBar: px('size.menu-bar'),
  dockReserve: px('size.dock-reserve'),
  titleBar: px('size.title-bar'),
  grab: px('size.title-bar-grab'),
  cvWidth: px('size.window-cv-width'),
  aboutWidth: px('size.window-about-width'),
  aboutHeight: px('size.window-about-height'),
  minWidth: px('size.window-min-width'),
  minHeight: px('size.window-min-height'),
  firstTop: px('space.6'),
  sideMargin: px('space.8'),
  bottomMargin: px('space.12'),
  cascade: px('space.12'),
  step: px('space.4'),
  bigStep: px('space.16'),
  motionMs: ms('motion.duration.fast'),
  terminalWidth: px('size.terminal-window-width'),
  terminalHeight: px('size.terminal-window-height'),
  terminalMargin: px('size.terminal-window-margin'),
  terminalOffset: px('size.terminal-window-offset'),
});

// How far a focus indicator reaches past its element: its width and its
// offset (FR-024), so a window brought into view shows it whole (FR-067).
export const FOCUS_REACH: number = px('border.thick') + px('space.0_5');

// How far the dock's lens bends what is behind it, at its edges (FR-068).
// An SVG filter's attribute can't read a CSS variable, so the dock writes
// it there from here.
export const DOCK_LENS: number = px('size.dock-lens');

// The length of the minimize, restore and maximize animations (FR-069,
// FR-070), outside `Metrics`: os-core never animates.
export const MOTION_BASE_MS: number = ms('motion.duration.base');

// The easing of the open and close animations (research R13), outside
// `Metrics`: os-core never animates.
export const MOTION_EASING: string = tokenValue('motion.easing.standard');

// The scale a window, full-screen app or menu grows from as it opens, the
// wireframes' 96%: also outside `Metrics`, for the same reason.
export const MOTION_START_SCALE: number = plain('scale.open-start');

// The advance width of the family `font.family.mono` names, in em: a fact of
// the font file, recorded beside it in fonts.json (006 research R13).
function monoAdvance(): number {
  const family = fonts.families.find((entry) => entry.token === 'font.family.mono') as { advance?: number } | undefined;
  if (typeof family?.advance !== 'number') throw new Error('fonts.json gives no advance for the font.family.mono family');
  return family.advance;
}

const windowWidth = px('size.terminal-window-width');
const padding = px('size.terminal-padding');
const fontSize = px('font.size.terminal');
const advance = monoAdvance();

// The design values the Terminal's scripts need (006 research R13, R22): the
// command line's limit, and the desktop window's column count, which the
// announcements count rows by on both shells.
export const TERMINAL = Object.freeze({
  maxLength: plain('command-line.max-length'),
  windowWidth,
  padding,
  fontSize,
  advance,
  columns: Math.floor((windowWidth - 2 * padding) / (fontSize * advance)),
});
