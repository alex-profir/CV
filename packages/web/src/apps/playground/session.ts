// The Playground's session (data-model.md Session, research R2): one store
// per visit, outside React, so unmounting for Show specs, minimizing and a
// shell switch lose nothing (FR-005, FR-061). Closing the window ends the
// run and empties what the window showed; the code and options stay kept
// (FR-019, FR-046). Components read it with useSyncExternalStore.
import { useSyncExternalStore } from 'react';
import { emptyLogBook } from './logbook.ts';
import type { ChangedOptions } from './compiler-options.ts';
import type { CheckResult, DownloadState, LogBook, Message, Pane, Panel, Popup, ReadLink, Run } from './types.ts';

export type PlaygroundSession = {
  download: DownloadState;
  viewState: unknown | null;
  options: ChangedOptions;
  pane: Pane;
  panel: Panel;
  popup: Popup;
  message: Message | null;
  check: CheckResult | null;
  checking: boolean;
  run: Run | null;
  logs: LogBook;
  keeping: 'yes' | 'no-storage';
  pendingLink: ReadLink;
  example: string | null;
  tabMovesFocus: boolean;
  // The editor's cursor, for the status bar.
  cursor: { line: number; column: number };
};

export const initialSession = (): PlaygroundSession => ({
  download: { kind: 'idle' },
  viewState: null,
  options: {},
  pane: 'javascript',
  panel: 'none',
  popup: 'none',
  message: null,
  check: null,
  checking: false,
  run: null,
  logs: emptyLogBook(),
  keeping: 'yes',
  pendingLink: { kind: 'none' },
  example: null,
  tabMovesFocus: false,
  cursor: { line: 1, column: 1 },
});

export type Store = {
  get(): PlaygroundSession;
  subscribe(listener: () => void): () => void;
  update(patch: Partial<PlaygroundSession> | ((state: PlaygroundSession) => Partial<PlaygroundSession>)): void;
  // The window closed: what it showed goes; the code, options, download and
  // the editor's view state stay.
  close(): void;
};

export function createStore(start: PlaygroundSession = initialSession()): Store {
  let state = start;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    update(patch) {
      const change = typeof patch === 'function' ? patch(state) : patch;
      if (Object.keys(change).every((key) => Object.is(change[key as keyof PlaygroundSession], state[key as keyof PlaygroundSession]))) return;
      state = { ...state, ...change };
      for (const listener of [...listeners]) listener();
    },
    close() {
      this.update({ run: null, logs: emptyLogBook(), popup: 'none', panel: 'none', message: null });
    },
  };
}

// The site's one session.
export const session: Store = createStore();

export function useSession<T>(select: (state: PlaygroundSession) => T, store: Store = session): T {
  return useSyncExternalStore(
    store.subscribe,
    () => select(store.get()),
    () => select(store.get()),
  );
}
