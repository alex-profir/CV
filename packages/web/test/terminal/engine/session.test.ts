// The Terminal's session store (006 research R5, data-model.md Terminal
// session): one per visit, kept outside the shells, emptied only on close.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createSession } from '../../../src/apps/terminal/session.ts';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 28, 18, 25));
});
afterEach(() => vi.useRealTimers());

describe('006-terminal-FR-020: Up and Down step through the history', () => {
  test('newest first, and Down past the newest gives back the draft', () => {
    const session = createSession();
    session.run('work', 'desktop');
    session.run('skills', 'desktop');
    session.setDraft('pro');
    session.step('up');
    expect(session.get().draft).toBe('skills');
    session.step('up');
    expect(session.get().draft).toBe('work');
    session.step('up');
    expect(session.get().draft).toBe('work');
    session.step('down');
    expect(session.get().draft).toBe('skills');
    session.step('down');
    expect(session.get().draft).toBe('pro');
    expect(session.get().stepping).toBeNull();
  });

  test('Up with no history changes nothing, and empty lines never enter it', () => {
    const session = createSession();
    session.setDraft('half');
    const before = session.get();
    session.step('up');
    expect(session.get()).toBe(before);
    session.run('', 'desktop');
    session.run('   ', 'desktop');
    expect(session.get().history).toEqual([]);
    expect(session.get().entries).toHaveLength(2);
    expect(session.get().entries.map((entry) => entry.block)).toEqual([null, null]);
  });

  test('each entry keeps its line as typed, where it ran and the time', () => {
    const session = createSession();
    session.run('Help ', 'desktop');
    expect(session.get().entries[0]).toMatchObject({ line: 'Help ', folder: [], time: '18:25' });
    expect(session.get().history).toEqual(['Help ']);
    expect(session.get().draft).toBe('');
  });
});

describe('006-terminal-FR-021: closing empties the session; nothing else does', () => {
  test('reset empties entries, history, folder, draft, scroll and the vim view', () => {
    const session = createSession();
    session.run('help', 'desktop');
    session.run('cv', 'desktop');
    session.setDraft('typed');
    session.saveScroll(120);
    expect(session.get().vim).not.toBeNull();
    session.reset();
    const state = session.get();
    expect(state.entries).toEqual([]);
    expect(state.history).toEqual([]);
    expect(state.folder).toEqual([]);
    expect(state.draft).toBe('');
    expect(state.scrollTop).toBe(0);
    expect(state.vim).toBeNull();
  });

  test("cv opens the vim view, and its entry is appended only when the view quits", () => {
    const session = createSession();
    session.run('cv', 'desktop');
    expect(session.get().vim).not.toBeNull();
    expect(session.get().entries).toEqual([]);
    expect(session.get().history).toEqual(['cv']);
    session.vim({ key: 'j' });
    expect(session.get().entries).toEqual([]);
    session.vim({ key: ':' });
    session.vim({ submit: 'q' });
    expect(session.get().vim).toBeNull();
    expect(session.get().entries.map((entry) => entry.line)).toEqual(['cv']);
  });

  test('subscribers hear every change, and clear empties the output but keeps the history', () => {
    const session = createSession();
    const heard = vi.fn();
    const stop = session.subscribe(heard);
    session.run('work', 'desktop');
    session.run('clear', 'desktop');
    expect(heard).toHaveBeenCalledTimes(2);
    expect(session.get().entries).toEqual([]);
    expect(session.get().history).toEqual(['work', 'clear']);
    session.clear();
    stop();
    session.run('pwd', 'desktop');
    expect(heard).toHaveBeenCalledTimes(3);
  });
});
