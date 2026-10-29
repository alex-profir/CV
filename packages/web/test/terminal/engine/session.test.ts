// The Terminal's session store (006 research R5, data-model.md Terminal
// session and Session additions): one per visit, kept outside the shells,
// emptied only on close. Driven with a fake shell client that runs each
// line through the real adapter in Node, and turns ready when told.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createSession } from '../../../src/apps/terminal/session.ts';
import type { ClientStatus, ShellClient } from '../../../src/apps/terminal/shell-client.ts';
import { INITIAL_STATE, NO_FILES } from '../../../src/apps/terminal/shell/protocol.ts';
import { shellFor } from '../shell/context.ts';

type FakeClient = ShellClient & { ready(): void; resets: number; sent: string[] };

function fakeClient(status: ClientStatus = 'ready'): FakeClient {
  const shell = shellFor('every-field');
  const listeners = new Set<() => void>();
  let now = status;
  const set = (next: ClientStatus) => {
    now = next;
    for (const listener of listeners) listener();
  };
  const client: FakeClient = {
    resets: 0,
    sent: [],
    status: () => now,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start: () => {
      if (now === 'idle') set('loading');
    },
    retry: () => undefined,
    run: (request) => {
      client.sent.push(request.line);
      return shell.run(request);
    },
    cancel: () => undefined,
    reset: () => {
      client.resets += 1;
      void shell.reset();
    },
    ready: () => set('ready'),
  };
  return client;
}

// Until every line sent has run.
async function settled(session: ReturnType<typeof createSession>) {
  await vi.waitFor(() => {
    const state = session.get();
    if (state.running !== null || (state.waiting.length > 0 && state.shell === 'ready')) throw new Error('still running');
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 28, 18, 25));
});
afterEach(() => vi.useRealTimers());

describe('006-terminal-FR-020: Up and Down step through the history', () => {
  test('newest first, and Down past the newest gives back the draft', async () => {
    const session = createSession(fakeClient());
    session.run('work', 'desktop');
    session.run('skills', 'desktop');
    await settled(session);
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

  test('Up with no history changes nothing, and empty lines never enter it', async () => {
    const session = createSession(fakeClient());
    session.setDraft('half');
    const before = session.get();
    session.step('up');
    expect(session.get()).toBe(before);
    session.run('', 'desktop');
    session.run('   ', 'desktop');
    await settled(session);
    expect(session.get().history).toEqual([]);
    expect(session.get().entries).toHaveLength(2);
    expect(session.get().entries.map((entry) => entry.block)).toEqual([null, null]);
  });

  test('each entry keeps its line as typed, where it ran and the time', async () => {
    const session = createSession(fakeClient());
    session.run('Help ', 'desktop');
    expect(session.get().history).toEqual(['Help ']);
    expect(session.get().draft).toBe('');
    await settled(session);
    expect(session.get().entries[0]).toMatchObject({ line: 'Help ', cwd: '/home/guest', time: '18:25' });
    expect(session.get().entries[0]!.block!.length).toBeGreaterThan(0);
  });
});

describe('006-terminal-FR-070: lines entered while the shell loads wait, and run in order once it is ready', () => {
  test('they show after their prompts with no output, then run in order', async () => {
    const client = fakeClient('idle');
    const session = createSession(client);
    session.start();
    expect(session.get().shell).toBe('loading');
    session.run('cd work', 'desktop');
    session.run('pwd', 'desktop');
    expect(session.get().waiting.map((entry) => entry.line)).toEqual(['cd work', 'pwd']);
    expect(session.get().entries).toEqual([]);
    expect(client.sent).toEqual([]);
    client.ready();
    await settled(session);
    expect(client.sent).toEqual(['cd work', 'pwd']);
    expect(session.get().waiting).toEqual([]);
    expect(session.get().entries.map((entry) => [entry.line, entry.cwd])).toEqual([
      ['cd work', '/home/guest'],
      ['pwd', '/home/guest/work'],
    ]);
    expect(session.get().cwd).toBe('/home/guest/work');
    expect(session.get().shell).toBe('ready');
  });
});

describe('006-terminal-FR-021: closing empties the session; nothing else does', () => {
  test('reset empties entries, history, the working folder, draft, scroll, the vim view, the shell state and the files', async () => {
    const client = fakeClient();
    const session = createSession(client);
    session.run('x=1', 'desktop');
    session.run('echo hi > notes', 'desktop');
    session.run('cd work', 'desktop');
    session.run('cv', 'desktop');
    await settled(session);
    session.setDraft('typed');
    session.saveScroll(120);
    expect(session.get().vim).not.toBeNull();
    expect(session.get().state.variables).toEqual({ x: '1' });
    expect(session.get().files.files).toHaveProperty(['/home/guest/notes']);
    session.reset();
    const state = session.get();
    expect(state.entries).toEqual([]);
    expect(state.history).toEqual([]);
    expect(state.cwd).toBe('/home/guest');
    expect(state.draft).toBe('');
    expect(state.scrollTop).toBe(0);
    expect(state.vim).toBeNull();
    expect(state.state).toEqual(INITIAL_STATE);
    expect(state.files).toEqual(NO_FILES);
    expect(client.resets).toBe(1);
  });

  test('cv opens the vim view, and its entry is appended only when the view quits', async () => {
    const session = createSession(fakeClient());
    session.run('cv', 'desktop');
    await settled(session);
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

  test('subscribers hear every change, and clear empties the output but keeps the history', async () => {
    const session = createSession(fakeClient());
    session.run('work', 'desktop');
    session.run('clear', 'desktop');
    await settled(session);
    expect(session.get().entries).toEqual([]);
    expect(session.get().history).toEqual(['work', 'clear']);
    const heard = vi.fn();
    const stop = session.subscribe(heard);
    session.clear();
    expect(heard).toHaveBeenCalledTimes(1);
    stop();
    session.run('pwd', 'desktop');
    await settled(session);
    expect(heard).toHaveBeenCalledTimes(1);
  });

  test('open and exit reach the shell around the Terminal after their line runs', async () => {
    const session = createSession(fakeClient());
    const actions = { open: vi.fn(), exit: vi.fn() };
    session.run('open cv', 'desktop', actions);
    session.run('exit', 'desktop', actions);
    await settled(session);
    expect(actions.open).toHaveBeenCalledWith('cv');
    expect(actions.exit).toHaveBeenCalledTimes(1);
  });
});
