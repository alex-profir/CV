// The visit's requirement data (007 data-model.md The loader, research R9):
// one low-priority fetch of the file `#os` names, started once the shell is
// ready, kept in memory for the visit and never written to storage. A
// failed fetch is tried again on the next "Show specs", or by the spec
// view's "Try again". Components read it with useSyncExternalStore.
import { useSyncExternalStore } from 'react';
import type { RequirementData } from '../../scripts/requirements/index.ts';

export type RequirementsState =
  | { status: 'idle' }
  | { status: 'loading'; promise: Promise<void> }
  | { status: 'ready'; data: RequirementData }
  | { status: 'failed' };

let state: RequirementsState = { status: 'idle' };
const listeners = new Set<() => void>();

function set(next: RequirementsState): void {
  state = next;
  for (const listener of listeners) listener();
}

function load(): void {
  const url = document.getElementById('os')?.getAttribute('data-requirements');
  if (url == null || url === '') {
    set({ status: 'failed' });
    return;
  }
  const promise = fetch(url, { priority: 'low' } as RequestInit)
    .then((response) => {
      if (!response.ok) throw new Error(`${response.status}`);
      return response.json() as Promise<RequirementData>;
    })
    .then(
      (data) => set({ status: 'ready', data }),
      () => set({ status: 'failed' }),
    );
  set({ status: 'loading', promise });
}

// Starts the fetch, once: the shell calls it as it marks itself ready.
export function startLoading(): void {
  if (state.status === 'idle') load();
}

// Tries again after a failure, as "Show specs" does.
export function retry(): void {
  if (state.status === 'failed') load();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const get = () => state;
// The server render has no data yet.
const SERVER: RequirementsState = { status: 'idle' };

export function useRequirements(): RequirementsState {
  return useSyncExternalStore(subscribe, get, () => SERVER);
}
