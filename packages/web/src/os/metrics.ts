// Every design value the shell's scripts need, read once from the tokens
// (005 research R7, data-model.md Metrics). @cv/os-core reads no token
// itself: it gets these numbers. A token that isn't a plain px length or a
// plain number, or a duration that isn't in ms, throws here, so a bad token
// fails the build rather than a visit.
import { durationMs, tokenValue } from '@cv/tokens';
import type { CssVarTokenName, DurationTokenName } from '@cv/tokens';
import type { Metrics } from '@cv/os-core';

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
});

// The easing of the open and close animations (research R13), outside
// `Metrics`: os-core never animates.
export const MOTION_EASING: string = tokenValue('motion.easing.standard');

// The scale a window, full-screen app or menu grows from as it opens, the
// wireframes' 96%: also outside `Metrics`, for the same reason.
export const MOTION_START_SCALE: number = plain('scale.open-start');
