// The program host with a fake frame and port (contracts/program.md).
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createHost } from '../../../../src/apps/terminal/program/host.ts';
import type { FrameLike, HostEnv, PortLike } from '../../../../src/apps/terminal/program/host.ts';
import { OUTPUT_LIMIT } from '../../../../src/apps/terminal/program/messages.ts';
import type { OutputChunk, ProgramEnd, ProgramRequest } from '../../../../src/apps/terminal/program/messages.ts';

export const REQUEST: ProgramRequest = { command: 'node', script: '/home/guest/a.js', code: null, print: false, args: [], cwd: '/home/guest', env: {}, files: { entries: [], bytes: 0 } };

// A host whose frame and port are plain objects the test drives.
export function fakeHost(overrides: Partial<HostEnv> = {}) {
  const sent: unknown[] = [];
  const toFrame: unknown[] = [];
  let removed = 0;
  let load = () => {};
  let heard: ((event: { source: unknown; data: unknown }) => void) | null = null;
  const contentWindow = { postMessage: (message: unknown) => void toFrame.push(message) };
  const frame: FrameLike = {
    contentWindow,
    addEventListener: (_, listener) => {
      load = listener;
    },
    remove: () => {
      removed += 1;
    },
  };
  const port: PortLike = { postMessage: (message) => void sent.push(message), onmessage: null, close: () => {} };
  const env: HostEnv = {
    runtime: 'runtime text',
    makeFrame: () => frame,
    makeChannel: () => ({ port1: port, port2: 'port2' }),
    nonce: () => 'n',
    compile: async () => ({ kind: 'failed' }),
    listen: (listener) => {
      heard = listener;
      return () => {
        heard = null;
      };
    },
    ...overrides,
  };
  const ended: ProgramEnd[] = [];
  const flushes: (readonly OutputChunk[])[] = [];
  const handle = createHost(env).start(REQUEST, { onOutput: (chunks) => void flushes.push(chunks), onProgress: () => {}, onEnded: (end) => void ended.push(end) });
  return {
    handle,
    ended,
    flushes,
    sent,
    toFrame,
    removed: () => removed,
    load: () => load(),
    fromWorker: (message: unknown) => port.onmessage?.({ data: message }),
    fromFrame: (data: unknown, source: unknown = contentWindow) => heard?.({ source, data }),
    listening: () => heard !== null,
  };
}

describe('009-terminal-node-FR-034: the host starts a program and ends it once', () => {
  test('the frame gets the runtime and the port, and the worker the request once it started', () => {
    const host = fakeHost();
    host.load();
    expect(host.toFrame).toEqual([{ start: true, nonce: 'n', source: 'runtime text', port: 'port2' }]);
    host.fromFrame({ worker: 'started', nonce: 'n' });
    expect(host.sent).toEqual([{ run: true, nonce: 'n', request: REQUEST }]);
  });

  test('onEnded fires exactly once, however the end comes', () => {
    const host = fakeHost();
    host.fromWorker({ exit: 3, nonce: 'n' });
    host.fromWorker({ exit: 4, nonce: 'n' });
    host.handle.close();
    host.handle.interrupt();
    host.fromFrame({ worker: 'died', nonce: 'n' });
    expect(host.ended).toEqual([{ status: 3, reason: 'exit', changes: { files: {}, folders: [] } }]);
    expect(host.listening()).toBe(false);
  });

  test('close ends it with `closed` and removes the frame', () => {
    const host = fakeHost();
    host.handle.close();
    expect(host.ended[0]!.reason).toBe('closed');
    expect(host.removed()).toBe(1);
  });

  test('a message with the wrong nonce, or a bad field, is dropped', () => {
    const host = fakeHost();
    host.fromWorker({ exit: 1, nonce: 'other' });
    host.fromWorker({ exit: 1 });
    host.fromWorker({ exit: 'one', nonce: 'n' });
    host.fromWorker(null);
    host.fromWorker('exit');
    host.fromFrame({ worker: 'died', nonce: 'other' });
    host.fromFrame({ worker: 'died', nonce: 'n' }, {});
    expect(host.ended).toEqual([]);
  });

  test.each([[256, 0], [257, 1], [-1, 255], [3.7, 3]])('a code of %d is masked to %d, as a process does', (code, status) => {
    const host = fakeHost();
    host.fromWorker({ exit: code, nonce: 'n' });
    expect(host.ended[0]!.status).toBe(status);
  });
});

describe('009-terminal-node-FR-009: output reaches the session at most every 100 ms, in order', () => {
  beforeEach(() => void vi.useFakeTimers());
  afterEach(() => void vi.useRealTimers());

  test('chunks are collected, joined per stream in the order printed, and flushed once a window', () => {
    const host = fakeHost();
    for (const [out, text] of [['stdout', 'a'], ['stdout', 'b'], ['stderr', 'c'], ['stdout', 'd']] as const) host.fromWorker({ out, text, nonce: 'n' });
    expect(host.flushes).toEqual([]);
    vi.advanceTimersByTime(99);
    expect(host.flushes).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(host.flushes).toEqual([[{ stream: 'stdout', text: 'ab' }, { stream: 'stderr', text: 'c' }, { stream: 'stdout', text: 'd' }]]);
    host.fromWorker({ out: 'stdout', text: 'e', nonce: 'n' });
    vi.advanceTimersByTime(100);
    expect(host.flushes[1]).toEqual([{ stream: 'stdout', text: 'e' }]);
  });

  test('a non-string is dropped', () => {
    const host = fakeHost();
    host.fromWorker({ out: 'stdout', text: 5, nonce: 'n' });
    host.fromWorker({ out: 'other', text: 'x', nonce: 'n' });
    vi.advanceTimersByTime(200);
    expect(host.flushes).toEqual([]);
  });

  test('what is held is flushed before the end, so nothing printed is lost', () => {
    const host = fakeHost();
    const order: string[] = [];
    host.fromWorker({ out: 'stdout', text: 'last', nonce: 'n' });
    host.fromWorker({ exit: 0, nonce: 'n' });
    order.push(`${host.flushes.length}:${host.ended.length}`);
    expect(order).toEqual(['1:1']);
    expect(host.flushes[0]).toEqual([{ stream: 'stdout', text: 'last' }]);
    vi.advanceTimersByTime(500);
    expect(host.flushes).toHaveLength(1);
  });
});

describe('009-terminal-node-FR-031: Ctrl+C with no handler ends the program', () => {
  test('it ends at once with 130, and the frame is told to stop and removed', () => {
    const host = fakeHost();
    host.handle.interrupt();
    expect(host.ended.map(({ status, reason }) => [status, reason])).toEqual([[130, 'interrupted']]);
    expect(host.toFrame).toContainEqual({ stop: true, nonce: 'n' });
    expect(host.removed()).toBe(1);
    expect(host.sent).toEqual([]);
  });
});

describe('009-terminal-node-FR-032: with a SIGINT handler, the first Ctrl+C goes to it', () => {
  test('the first press posts the signal, and the program lives', () => {
    const host = fakeHost();
    host.fromWorker({ sigint: true, nonce: 'n' });
    host.handle.interrupt();
    expect(host.sent).toEqual([{ signal: 'SIGINT', nonce: 'n' }]);
    expect(host.ended).toEqual([]);
  });

  test('a handler taken away means the next press ends it', () => {
    const host = fakeHost();
    host.fromWorker({ sigint: true, nonce: 'n' });
    host.fromWorker({ sigint: false, nonce: 'n' });
    host.handle.interrupt();
    expect(host.sent).toEqual([]);
    expect(host.ended[0]!.status).toBe(130);
  });
});

describe('009-terminal-node-FR-033: the second Ctrl+C always ends it', () => {
  test.each([[true], [false]])('after a handler, and the program then says sigint is %s', (claim) => {
    const host = fakeHost();
    host.fromWorker({ sigint: true, nonce: 'n' });
    host.handle.interrupt();
    host.fromWorker({ sigint: claim, nonce: 'n' });
    host.handle.interrupt();
    expect(host.sent).toHaveLength(1);
    expect(host.ended.map(({ status, reason }) => [status, reason])).toEqual([[130, 'interrupted']]);
    expect(host.removed()).toBe(1);
  });
});

describe('009-terminal-node-FR-026: 1 MB by the page\'s own count stops a program', () => {
  test('one that never sends { limit }, keeping exactly what fits', () => {
    const host = fakeHost();
    host.fromWorker({ out: 'stdout', text: 'x'.repeat(OUTPUT_LIMIT - 1), nonce: 'n' });
    expect(host.ended).toEqual([]);
    host.fromWorker({ out: 'stderr', text: 'yyy', nonce: 'n' });
    expect(host.ended.map(({ status, reason }) => [status, reason])).toEqual([[130, 'output']]);
    const shown = host.flushes.flat();
    expect(shown.map(({ stream, text }) => [stream, text.length])).toEqual([['stdout', OUTPUT_LIMIT - 1], ['stderr', 1]]);
  });

  test('one that sends a single huge message', () => {
    const host = fakeHost();
    host.fromWorker({ out: 'stdout', text: 'x'.repeat(OUTPUT_LIMIT * 3), nonce: 'n' });
    expect(host.ended[0]!.reason).toBe('output');
    expect(host.flushes.flat()[0]!.text).toHaveLength(OUTPUT_LIMIT);
  });

  test("the runtime's own { limit } ends it the same way", () => {
    const host = fakeHost();
    host.fromWorker({ limit: 'output', nonce: 'n' });
    expect(host.ended.map(({ status, reason }) => [status, reason])).toEqual([[130, 'output']]);
  });
});

describe('009-terminal-node-FR-028: a worker that dies', () => {
  test.each([
    ['Out of memory', 'memory'],
    ['RangeError: Array buffer allocation failed: memory', 'memory'],
    ['script error', 'died'],
    ['', 'died'],
  ])('%j gives %s, status 1', (message, reason) => {
    const host = fakeHost();
    host.fromFrame({ worker: 'died', message, nonce: 'n' });
    expect(host.ended.map((end) => [end.status, end.reason])).toEqual([[1, reason]]);
  });

  test('a frame that loads twice has lost its document', () => {
    const host = fakeHost();
    host.load();
    host.load();
    expect(host.ended[0]!.reason).toBe('died');
  });
});
