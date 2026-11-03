// A program in the Terminal's session, with a fake client and a fake host
// (009 contracts/program.md, data-model.md Session additions).
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createSession } from '../../../../src/apps/terminal/session.ts';
import type { ProgramHost } from '../../../../src/apps/terminal/session.ts';
import type { ShellClient } from '../../../../src/apps/terminal/shell-client.ts';
import type { Effect, RunRequest, RunResult, VisitorFiles } from '../../../../src/apps/terminal/shell/protocol.ts';
import { INITIAL_STATE, NO_FILES } from '../../../../src/apps/terminal/shell/protocol.ts';
import type { FileChanges, ProgramEnd, ProgramEvents, ProgramRequest } from '../../../../src/apps/terminal/program/messages.ts';
import { fill, siteText } from '../../../../src/site-text.ts';
import { flatten } from './helpers/nodes.ts';

const REQUEST: ProgramRequest = { command: 'node', script: '/home/guest/a.js', code: null, print: false, args: [], cwd: '/home/guest', env: {}, files: { entries: [], bytes: 0 } };
const NONE: FileChanges = [];
const words = siteText.terminal;

function fakeClient() {
  const lines: string[] = [];
  const statuses: number[] = [];
  const applied: FileChanges[] = [];
  let answer: VisitorFiles | null = NO_FILES;
  const client: ShellClient = {
    status: () => 'ready',
    subscribe: () => () => undefined,
    start: () => undefined,
    retry: () => undefined,
    cancel: vi.fn(),
    reset: vi.fn(),
    write: async (request) => ({ id: request.id, ok: false, error: 'cant-open', path: request.path }),
    complete: async () => null,
    setStatus: (state) => void statuses.push(state.status),
    apply: async (_, changes) => {
      applied.push(changes);
      return answer;
    },
    run: async (request: RunRequest): Promise<RunResult> => {
      lines.push(request.line);
      const effects: Effect[] = request.line.startsWith('node') ? [{ kind: 'program', request: REQUEST }] : [];
      const state = { ...request.state, ...(request.line.startsWith('node') ? {} : { status: 0 }) };
      return { id: request.id, stdout: request.line.startsWith('node') ? '' : `${request.line}\n`, stderr: '', status: 0, recorded: [], effects, end: 'done', state };
    },
  };
  return { client, lines, statuses, applied, setAnswer: (files: VisitorFiles | null) => void (answer = files) };
}

function fakeHost() {
  const started: ProgramRequest[] = [];
  let events: ProgramEvents | null = null;
  const handle = { interrupt: vi.fn(), close: vi.fn() };
  const host: ProgramHost = {
    start(request, given) {
      started.push(request);
      events = given;
      return handle;
    },
  };
  return { host, started, handle, events: () => events!, end: (end: Partial<ProgramEnd> = {}) => events!.onEnded({ status: 0, reason: 'exit', changes: NONE, ...end }) };
}

async function setUp(options: { open?: () => Promise<ProgramHost>; bytes?: number } = {}) {
  const shell = fakeClient();
  const program = fakeHost();
  const session = createSession(shell.client, options.open ?? (async () => program.host), () => options.bytes ?? 0);
  const flush = async () => {
    for (let at = 0; at < 10; at += 1) await Promise.resolve();
  };
  return { session, shell, program, flush };
}

// A running entry's block as its text nodes.
const shown = (block: readonly unknown[] | null | undefined) => flatten(block ?? []);

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('addEventListener', () => undefined);
  vi.stubGlobal('removeEventListener', () => undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('009-terminal-node-FR-009: output is added to the running entry as it arrives', () => {
  test('in order, each flush a new text node carrying its stream, existing nodes kept', async () => {
    const { session, program, flush } = await setUp();
    session.run('node a.js', 'desktop');
    await flush();
    expect(program.started).toEqual([REQUEST]);
    expect(session.get().program).toEqual({ interrupts: 0, stillShown: false });
    program.events().onOutput([{ stream: 'stdout', text: 'one\n' }]);
    const first = session.get().running!.block![0];
    program.events().onOutput([{ stream: 'stderr', text: 'two\n' }, { stream: 'stdout', text: 'three\n' }]);
    const { block } = session.get().running!;
    expect(block![0]).toBe(first);
    expect(block).toEqual([
      { kind: 'text', text: 'one\n', stream: 'stdout' },
      { kind: 'text', text: 'two\n', stream: 'stderr', tone: 'error' },
      { kind: 'text', text: 'three\n', stream: 'stdout' },
    ]);
  });

  test('lines typed meanwhile wait and run in order, after it ends', async () => {
    const { session, shell, program, flush } = await setUp();
    session.run('node a.js', 'desktop');
    await flush();
    session.run('echo 1', 'desktop');
    session.run('echo 2', 'desktop');
    await flush();
    expect(shell.lines).toEqual(['node a.js']);
    expect(session.get().waiting.map((each) => each.line)).toEqual(['echo 1', 'echo 2']);
    program.end();
    await flush();
    expect(shell.lines).toEqual(['node a.js', 'echo 1', 'echo 2']);
    expect(session.get().entries.map((each) => each.line)).toEqual(['node a.js', 'echo 1', 'echo 2']);
  });

  test('the program ends as an entry, then a new prompt, with no running line', async () => {
    const { session, program, flush } = await setUp();
    session.run('node a.js', 'desktop');
    await flush();
    program.events().onOutput([{ stream: 'stdout', text: 'x\n' }]);
    program.end();
    await flush();
    const state = session.get();
    expect(state.running).toBeNull();
    expect(state.program).toBeNull();
    expect(state.shell).toBe('ready');
    expect(shown(state.entries[0]!.block)).toContain('x\n');
  });
});

describe('009-terminal-node-FR-010: $? holds how the program ended', () => {
  test.each([[0], [3], [130]])('status %d is in the shell state and the client', async (status) => {
    const { session, shell, program, flush } = await setUp();
    session.run('node a.js', 'desktop');
    await flush();
    program.end({ status, reason: status === 130 ? 'interrupted' : 'exit' });
    await flush();
    expect(session.get().state.status).toBe(status);
    expect(session.get().state.pipes).toEqual([status]);
    expect(shell.statuses).toEqual([status]);
  });
});

describe('009-terminal-node-FR-015: a program changes nothing of the shell', () => {
  test('folder and variables stay as they were', async () => {
    const { session, program, flush } = await setUp();
    session.run('node a.js', 'desktop');
    await flush();
    program.end({ status: 2 });
    await flush();
    const state = session.get();
    expect(state.cwd).toBe(INITIAL_STATE.cwd);
    expect(state.state).toEqual({ ...INITIAL_STATE, status: 2, pipes: [2] });
  });
});

describe('009-terminal-node-FR-036: a bundle that cannot load', () => {
  test('ends the line with the words and status 1, never a blank view', async () => {
    const { session, flush } = await setUp({ open: () => Promise.reject(new Error('offline')) });
    session.run('node a.js', 'desktop');
    await flush();
    const state = session.get();
    expect(state.running).toBeNull();
    expect(state.state.status).toBe(1);
    expect(shown(state.entries[0]!.block)).toContain(words.program.died);
  });
});

describe('009-terminal-node-FR-031 and 006-terminal-FR-075: Ctrl+C on a running program', () => {
  test('goes to the host, and not the shell worker', async () => {
    const { session, shell, program, flush } = await setUp();
    session.run('node a.js', 'desktop');
    await flush();
    session.cancel();
    expect(program.handle.interrupt).toHaveBeenCalledTimes(1);
    expect(shell.client.cancel).not.toHaveBeenCalled();
    expect(session.get().program?.interrupts).toBe(1);
  });

  test('^C shows, what it printed stays, 130, and waiting lines are dropped', async () => {
    const { session, shell, program, flush } = await setUp();
    session.run('node a.js', 'desktop');
    await flush();
    session.run('echo dropped', 'desktop');
    program.events().onOutput([{ stream: 'stdout', text: 'kept\n' }]);
    session.cancel();
    program.end({ status: 130, reason: 'interrupted' });
    await flush();
    const state = session.get();
    expect(shown(state.entries[0]!.block)).toEqual(expect.arrayContaining(['kept\n', words.replies.cancelMark]));
    expect(state.state.status).toBe(130);
    expect(shell.lines).toEqual(['node a.js']);
    expect(state.entries[1]).toMatchObject({ line: 'echo dropped', cancelled: true, block: [] });
  });

  test('a press while the bundle loads ends the line with 130, and nothing starts', async () => {
    let open = (_: ProgramHost) => {};
    const { session, program, flush } = await setUp({ open: () => new Promise((resolve) => void (open = resolve)) });
    session.run('node a.js', 'desktop');
    await flush();
    session.cancel();
    open(program.host);
    await flush();
    expect(program.started).toEqual([]);
    expect(session.get().state.status).toBe(130);
    expect(session.get().running).toBeNull();
  });
});

describe('009-terminal-node-FR-026: a program past 1 MB', () => {
  test('ends with the stopped line', async () => {
    const { session, program, flush } = await setUp();
    session.run('node a.js', 'desktop');
    await flush();
    program.end({ status: 130, reason: 'output' });
    await flush();
    expect(shown(session.get().entries[0]!.block).join('')).toContain(words.replies.stopped.output);
    expect(session.get().state.status).toBe(130);
  });
});

describe('009-terminal-node-FR-028: a program the browser ended', () => {
  test.each([['memory', words.program.memory], ['died', words.program.died]] as const)('%s says so, status 1', async (reason, text) => {
    const { session, program, flush } = await setUp();
    session.run('node a.js', 'desktop');
    await flush();
    program.end({ status: 1, reason });
    await flush();
    expect(shown(session.get().entries[0]!.block)).toContain(text);
    expect(session.get().state.status).toBe(1);
  });
});

describe('009-terminal-node-FR-027 and 006-terminal-FR-069: no time limit, and one still-running line', () => {
  const still = (session: ReturnType<typeof createSession>) => shown(session.get().running?.block).filter((text) => text.startsWith('Still running'));

  test('after 5 s with nothing printed one line shows, once, and the program goes on', async () => {
    const { session, program, flush } = await setUp();
    session.run('node a.js', 'desktop');
    await flush();
    vi.advanceTimersByTime(4999);
    expect(still(session)).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(still(session)).toEqual([words.program.stillRunning.desktop]);
    vi.advanceTimersByTime(600_000);
    expect(still(session)).toHaveLength(1);
    expect(session.get().running).not.toBeNull();
    expect(program.handle.close).not.toHaveBeenCalled();
    expect(program.handle.interrupt).not.toHaveBeenCalled();
  });

  test("in the phone's words on the pocket terminal", async () => {
    const { session, flush } = await setUp();
    session.run('node a.js', 'mobile');
    await flush();
    vi.advanceTimersByTime(5000);
    expect(still(session)).toEqual([words.program.stillRunning.phone]);
  });

  test('printing before 5 s starts the wait again', async () => {
    const { session, program, flush } = await setUp();
    session.run('node a.js', 'desktop');
    await flush();
    vi.advanceTimersByTime(4000);
    program.events().onOutput([{ stream: 'stdout', text: 'x' }]);
    vi.advanceTimersByTime(4000);
    expect(still(session)).toEqual([]);
    vi.advanceTimersByTime(1000);
    expect(still(session)).toHaveLength(1);
  });

  test('the line carries its own req, and no timer outlives the program', async () => {
    const { session, program, flush } = await setUp();
    session.run('node a.js', 'desktop');
    await flush();
    program.end();
    await flush();
    vi.advanceTimersByTime(6000);
    expect(shown(session.get().entries[0]!.block ?? [])).toEqual([]);
  });
});

describe('009-terminal-node-FR-034: closing, resetting and leaving end the program', () => {
  test('reset closes the host, and a late end or output changes nothing', async () => {
    const { session, shell, program, flush } = await setUp();
    session.run('node a.js', 'desktop');
    await flush();
    session.reset();
    expect(program.handle.close).toHaveBeenCalledTimes(1);
    program.events().onOutput([{ stream: 'stdout', text: 'late' }]);
    program.end({ reason: 'closed', status: 130, changes: [{ path: '/home/guest/x', text: 'x' }] });
    await flush();
    expect(session.get().entries).toEqual([]);
    expect(session.get().running).toBeNull();
    expect(session.get().program).toBeNull();
    expect(shell.applied).toEqual([]);
  });

  test('pagehide closes it too, and the listener goes when it ends', async () => {
    const added: string[] = [];
    const removed: string[] = [];
    vi.stubGlobal('addEventListener', (type: string, listener: () => void) => {
      added.push(type);
      leave = listener;
    });
    vi.stubGlobal('removeEventListener', (type: string) => void removed.push(type));
    let leave = () => {};
    const { session, program, flush } = await setUp();
    session.run('node a.js', 'desktop');
    await flush();
    expect(added).toEqual(['pagehide']);
    leave();
    expect(program.handle.close).toHaveBeenCalledTimes(1);
    expect(removed).toEqual(['pagehide']);
    // Back from the browser's cache, the line is over and the Terminal takes lines.
    expect(session.get().running).toBeNull();
    expect(session.get().program).toBeNull();
    expect(session.get().state.status).toBe(130);
  });
});

describe('009-terminal-node-FR-030: what a program changed', () => {
  const CHANGES: FileChanges = [{ path: '/home/guest/out.txt', text: 'x' }];
  const FILES: VisitorFiles = { folders: [], files: { 'out.txt': 'x' }, bytes: 1 };

  test('is sent with apply when it ends, and the session takes the files from the answer', async () => {
    const { session, shell, program, flush } = await setUp();
    shell.setAnswer(FILES);
    session.run('node a.js', 'desktop');
    await flush();
    program.end({ changes: CHANGES });
    await flush();
    expect(shell.applied).toEqual([CHANGES]);
    expect(session.get().files).toEqual(FILES);
  });

  test('a file written before Ctrl+C is applied before the next line runs', async () => {
    const { session, shell, program, flush } = await setUp();
    shell.setAnswer(FILES);
    session.run('node a.js', 'desktop');
    await flush();
    session.run('echo next', 'desktop');
    program.end({ status: 130, reason: 'interrupted', changes: CHANGES });
    await flush();
    expect(shell.applied).toEqual([CHANGES]);
    expect(session.get().files).toEqual(FILES);
    expect(shell.lines).toEqual(['node a.js']);
  });

  test('no change sends no apply', async () => {
    const { session, shell, program, flush } = await setUp();
    session.run('node a.js', 'desktop');
    await flush();
    program.end();
    await flush();
    expect(shell.applied).toEqual([]);
  });

  test('a shell that gives no answer leaves the files as they were, and the next line still runs', async () => {
    const { session, shell, program, flush } = await setUp();
    shell.setAnswer(null);
    session.run('node a.js', 'desktop');
    await flush();
    session.run('echo next', 'desktop');
    program.end({ changes: CHANGES });
    await flush();
    expect(session.get().files).toEqual(NO_FILES);
    expect(shell.lines).toEqual(['node a.js', 'echo next']);
  });
});

describe('009-terminal-node-FR-040: what is announced', () => {
  test('output in batches at most once a second, and the end once', async () => {
    const { session, program, flush } = await setUp();
    const heard: string[] = [];
    let last: number | undefined;
    session.subscribe(() => {
      const said = session.get().announcement;
      if (said !== null && said.id !== last) {
        last = said.id;
        heard.push(said.text);
      }
    });
    session.run('node a.js', 'desktop');
    await flush();
    heard.length = 0;
    program.events().onOutput([{ stream: 'stdout', text: 'a\n' }]);
    program.events().onOutput([{ stream: 'stdout', text: 'b\n' }]);
    expect(heard).toEqual([]);
    vi.advanceTimersByTime(1000);
    expect(heard).toEqual(['a\nb\n']);
    program.events().onOutput([{ stream: 'stdout', text: 'c\n' }]);
    program.end({ status: 4 });
    await flush();
    expect(heard).toEqual(['a\nb\n', 'c\nProgram ended, status 4.']);
  });
});

describe('009-terminal-node-FR-040: what the live region says of a program', () => {
  const start = async () => {
    const parts = await setUp();
    parts.session.run('node a.js', 'desktop');
    await parts.flush();
    return parts;
  };

  test("a program's last batch is said with its end, in one announcement", async () => {
    const { session, program } = await start();
    program.events().onOutput([{ stream: 'stdout', text: 'hello\n' }]);
    program.end({ status: 0 });
    expect(session.get().announcement!.text).toBe(`hello\n${fill(siteText.terminal.program.ended, { n: 0 })}`);
  });

  test('an error is heard, with the status', async () => {
    const { session, program } = await start();
    program.events().onOutput([{ stream: 'stderr', text: "Error: Cannot find module 'nope'\n" }]);
    program.end({ status: 1, reason: 'uncaught' });
    expect(session.get().announcement!.text).toContain("Cannot find module 'nope'");
    expect(session.get().announcement!.text).toContain(fill(siteText.terminal.program.ended, { n: 1 }));
  });

  test('with no output left only the end is said, once', async () => {
    const { session, program } = await start();
    program.end({ status: 3 });
    const { id, text } = session.get().announcement!;
    expect(text).toBe(fill(siteText.terminal.program.ended, { n: 3 }));
    await vi.advanceTimersByTimeAsync(1100);
    expect(session.get().announcement!.id).toBe(id);
  });
});
