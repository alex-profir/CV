// The OS state as last rendered, for an app that must know where its own
// window is, such as the Playground's stuck popup, which waits while its
// window is minimized or shows its specs (008 FR-050). Read only: apps
// change the OS through `AppOs`.
import { useSyncExternalStore } from 'react';
import type { OsState, ViewId } from '@cv/os-core';

let current: OsState | null = null;
const listeners = new Set<() => void>();

export function publishOsState(state: OsState): void {
  if (state === current) return;
  current = state;
  for (const listener of [...listeners]) listener();
}

export const osState = (): OsState | null => current;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

// Whether a view's window is on screen: open, not minimized, and showing its
// app rather than its specs.
export function onScreen(state: OsState | null, view: ViewId): boolean {
  if (state === null) return false;
  if (state.shell === 'mobile') return state.mobile.open === view && state.specs[view] === undefined;
  const window = state.windows.find((candidate) => candidate.view === view);
  return window !== undefined && !window.minimized && state.specs[view] === undefined;
}

export function useOnScreen(view: ViewId): boolean {
  return useSyncExternalStore(subscribe, () => onScreen(current, view), () => false);
}

export { subscribe as subscribeOsState };
