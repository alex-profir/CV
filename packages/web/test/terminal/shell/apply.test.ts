// What a program changed, applied when it ends (009 contracts/program.md, research
// R10), through `TerminalFs`, which checks the rules again.
import { describe, expect, test } from 'vitest';
import { shellFor } from './context.ts';
import { createShellClient } from '../../../src/apps/terminal/shell-client.ts';
import type { WorkerLike } from '../../../src/apps/terminal/shell-client.ts';
import { INITIAL_STATE, QUOTA } from '../../../src/apps/terminal/shell/protocol.ts';
import type { ToWorker, VisitorFiles } from '../../../src/apps/terminal/shell/protocol.ts';
import { createChanges } from '../../../src/apps/terminal/program/changes.ts';
import type { FileChange } from '../../../src/apps/terminal/program/messages.ts';

const HOME = '/home/guest';

const lines = async (shell: ReturnType<typeof shellFor>, line: string) => (await shell.run({ id: 1, line, state: INITIAL_STATE, history: [] })).stdout;

describe('009-terminal-node-FR-029: changes go through the same rules', () => {
  test('a forged change to a protected file changes nothing, and the rest are kept', async () => {
    const shell = shellFor('every-field');
    const before = await lines(shell, 'cat cv.json');
    const files = await shell.apply([{ path: `${HOME}/cv.json`, text: 'forged' }, { path: `${HOME}/ok.txt`, text: 'kept' }]);
    expect(await lines(shell, 'cat cv.json')).toBe(before);
    expect(await lines(shell, 'cat ok.txt')).toBe('kept');
    expect(files.files[`${HOME}/ok.txt`]).toBe('kept');
    expect(files.files[`${HOME}/cv.json`]).toBeUndefined();
  });

  test('a forged removal of a protected file changes nothing', async () => {
    const shell = shellFor('every-field');
    const before = await lines(shell, 'cat cv.json');
    await shell.apply([{ path: `${HOME}/cv.json`, removed: true }]);
    expect(await lines(shell, 'cat cv.json')).toBe(before);
  });

  test('a path outside the visitor\'s space is refused', async () => {
    const shell = shellFor('every-field');
    const files = await shell.apply([{ path: '/etc/passwd', text: 'forged' }, { path: '/etc/x', made: true }]);
    expect(JSON.stringify(files)).not.toContain('forged');
  });

  test('past the limit a change is refused, and those that fit are kept', async () => {
    const shell = shellFor('every-field');
    const files = await shell.apply([{ path: `${HOME}/fits.txt`, text: 'x' }, { path: `${HOME}/big.txt`, text: 'y'.repeat(QUOTA + 1) }]);
    expect(files.files[`${HOME}/fits.txt`]).toBe('x');
    expect(files.files[`${HOME}/big.txt`]).toBeUndefined();
    expect(files.bytes).toBeLessThanOrEqual(QUOTA);
  });
});

describe('009-terminal-node-FR-030: what a program wrote is there once it ends', () => {
  test('files, folders, removals and binary files, for the shell and its answer', async () => {
    const shell = shellFor('every-field');
    await lines(shell, 'echo gone > old.txt; mkdir olddir');
    const files = await shell.apply([{ path: `${HOME}/d`, made: true }, { path: `${HOME}/d/new.txt`, text: 'new' }, { path: `${HOME}/old.txt`, removed: true }, { path: `${HOME}/b.bin`, text: 'ÿ\u0001', binary: true }, { path: `${HOME}/olddir`, made: false }]);
    expect(await lines(shell, 'cat d/new.txt')).toBe('new');
    expect(await lines(shell, 'ls old.txt olddir 2>/dev/null')).toBe('');
    expect(files.files[`${HOME}/d/new.txt`]).toBe('new');
    expect(files.folders).toContain(`${HOME}/d`);
    expect(files.folders).not.toContain(`${HOME}/olddir`);
    expect(files.files[`${HOME}/old.txt`]).toBeUndefined();
    expect(files.binary).toContain(`${HOME}/b.bin`);
  });

  test('the client sends `apply` and gives back the files, and keeps them and the status for a restart', async () => {
    const posted: ToWorker[] = [];
    const FILES: VisitorFiles = { folders: [], files: { 'a.txt': 'a' }, bytes: 1 };
    const worker: WorkerLike = {
      onmessage: null,
      onerror: null,
      terminate: () => undefined,
      postMessage(message) {
        posted.push(message);
        if (message.type === 'start' || message.type === 'restore') queueMicrotask(() => worker.onmessage?.({ data: { type: 'ready' } }));
        if (message.type === 'apply') queueMicrotask(() => worker.onmessage?.({ data: { type: 'applied', id: message.id, files: FILES } }));
      },
    };
    const client = createShellClient(() => worker);
    client.start();
    await Promise.resolve();
    client.setStatus({ ...INITIAL_STATE, status: 130, pipes: [130] });
    expect(await client.apply(7, [])).toEqual(FILES);
    expect(posted.at(-1)).toEqual({ type: 'apply', id: 7, changes: [] });
  });

  test('with no shell ready, `apply` answers null and sends nothing', async () => {
    const client = createShellClient(() => ({ onmessage: null, onerror: null, terminate: () => undefined, postMessage: () => undefined }));
    expect(await client.apply(1, [])).toBeNull();
  });
});

describe('009-terminal-node-FR-030 and 009-terminal-node-FR-029: the end state is what the program saw', () => {
  // The latest of each, as the page keeps them, from what the shell held at the start.
  const applied = async (shell: ReturnType<typeof shellFor>, start: readonly string[], steps: readonly FileChange[]) => {
    const changes = createChanges(new Set(start.map((name) => `${HOME}/${name}`)));
    for (const step of steps) changes.add({ ...step, path: `${HOME}/${step.path}` });
    return shell.apply(changes.result());
  };

  test('a file replaced by a folder that holds a file', async () => {
    const shell = shellFor('every-field');
    await lines(shell, 'echo x > ff');
    const files = await applied(shell, ['ff'], [{ path: 'ff', removed: true }, { path: 'ff', made: true }, { path: 'ff/in', text: 'y' }]);
    expect(files.folders).toContain(`${HOME}/ff`);
    expect(await lines(shell, 'cat ff/in')).toBe('y');
  });

  test('a folder replaced by a file', async () => {
    const shell = shellFor('every-field');
    await lines(shell, 'mkdir dd; echo x > dd/in');
    const files = await applied(shell, ['dd', 'dd/in'], [{ path: 'dd/in', removed: true }, { path: 'dd', made: false }, { path: 'dd', text: 'text' }]);
    expect(files.folders).not.toContain(`${HOME}/dd`);
    expect(await lines(shell, 'cat dd')).toBe('text');
  });

  test('a file written, a large one removed, then the first written large', async () => {
    const shell = shellFor('every-field');
    await shell.apply([{ path: `${HOME}/big`, text: 'b'.repeat(900_000) }]);
    const files = await applied(shell, ['big'], [{ path: 'nw', text: 'x' }, { path: 'big', removed: true }, { path: 'nw', text: 'n'.repeat(900_000) }]);
    expect(files.files[`${HOME}/big`]).toBeUndefined();
    expect(files.files[`${HOME}/nw`]).toHaveLength(900_000);
  });

  test('a file that only fits once a later change has made room', async () => {
    const shell = shellFor('every-field');
    await shell.apply([{ path: `${HOME}/a`, text: 'a'.repeat(900_000) }]);
    const files = await applied(shell, ['a'], [{ path: 'a', removed: true }, { path: 'b', text: 'b'.repeat(900_000) }, { path: 'a', text: 'x' }]);
    expect(files.files[`${HOME}/a`]).toBe('x');
    expect(files.files[`${HOME}/b`]).toHaveLength(900_000);
  });
});
