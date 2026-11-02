// The program host with a fake frame and port (contracts/program.md).
import { describe, expect, test } from 'vitest';
import { createHost } from '../../../../src/apps/terminal/program/host.ts';
import type { FrameLike, HostEnv, PortLike } from '../../../../src/apps/terminal/program/host.ts';
import type { ProgramEnd, ProgramRequest } from '../../../../src/apps/terminal/program/messages.ts';

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
    listen: (listener) => {
      heard = listener;
      return () => {
        heard = null;
      };
    },
    ...overrides,
  };
  const ended: ProgramEnd[] = [];
  const handle = createHost(env).start(REQUEST, { onOutput: () => {}, onProgress: () => {}, onEnded: (end) => void ended.push(end) });
  return {
    handle,
    ended,
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
