// The Playground's session store (data-model.md Session).
import { describe, expect, test } from 'vitest';
import { createStore, initialSession } from '../../../src/apps/playground/session.ts';
import { addLogs } from '../../../src/apps/playground/logbook.ts';

describe('008-typescript-playground-FR-005 008-typescript-playground-FR-061: the session outlives every view of it', () => {
  test("the initial state: download idle, the JavaScript pane, no panel, no popup, keeping, no pending link", () => {
    const state = createStore().get();
    expect(state).toMatchObject({ download: { kind: 'idle' }, pane: 'javascript', panel: 'none', popup: 'none', keeping: 'yes', pendingLink: { kind: 'none' }, run: null, message: null, viewState: null });
  });

  test('subscribers see each change, and an unchanged update tells no one', () => {
    const store = createStore();
    const seen: string[] = [];
    store.subscribe(() => seen.push(store.get().pane));
    store.update({ pane: 'errors' });
    store.update((state) => ({ pane: state.pane === 'errors' ? 'logs' : 'javascript' }));
    store.update({ pane: 'logs' });
    expect(seen).toEqual(['errors', 'logs']);
  });

  test('the state survives every subscriber leaving and a new one arriving, as an unmount and a mount', () => {
    const store = createStore();
    const leave = store.subscribe(() => undefined);
    store.update({ options: { noUnusedLocals: true }, pane: 'declarations', viewState: { cursor: 3 } });
    leave();
    let calls = 0;
    store.subscribe(() => (calls += 1));
    expect(store.get()).toMatchObject({ options: { noUnusedLocals: true }, pane: 'declarations', viewState: { cursor: 3 } });
    store.update({ pane: 'logs' });
    expect(calls).toBe(1);
  });

  test('close ends the run, empties the logs, closes popups and panels and clears the message, keeping the options and the view state', () => {
    const store = createStore();
    store.update({
      options: { target: 'ES2020' },
      viewState: { cursor: 9 },
      panel: 'options',
      popup: 'stuck',
      message: { kind: 'info', text: 'sharedOpened', actions: [], id: 1 },
      logs: addLogs(initialSession().logs, [{ id: 1, level: 'log', values: [{ t: 'str', v: 'hi' }] }]),
      run: { id: 1, startedAt: 0, state: 'running', pending: { timers: 1, requests: 0 }, blockedSince: null, stuck: 'no', askAgainAt: null, uncaught: 0, outcome: null },
    });
    store.close();
    expect(store.get()).toMatchObject({ run: null, popup: 'none', panel: 'none', message: null, options: { target: 'ES2020' }, viewState: { cursor: 9 } });
    expect(store.get().logs.entries).toEqual([]);
  });
});
