// @cv/os-core: the OS behavior both shells share (Constitution V, 005
// research R4). Pure TypeScript: the window state and its reducer, window
// geometry, the keyboard shortcuts and the shell query. It imports nothing
// from React, the DOM, Node, @cv/content or @cv/tokens: design values
// arrive as `Metrics`, text through the reducer's context, and apps as
// declarations (contracts/os-core.md).
export type * from './types.ts';
export { appsFor, shellQuery } from './shell.ts';
export { initialState } from './state.ts';
export { osReducer } from './reducer.ts';
export { clampMove, clampResize, fitToArea, placeWindow } from './geometry.ts';
export { SHORTCUTS, matchShortcut, shortcutLabel } from './shortcuts.ts';
export type { KeyEventLike } from './shortcuts.ts';
