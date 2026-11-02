// What a program changed, applied when it ends (009 contracts/program.md, research
// R10), through `TerminalFs`, which checks the rules again.
import { describe, expect, test } from 'vitest';
import { shellFor } from './context.ts';
import { createShellClient } from '../../../src/apps/terminal/shell-client.ts';
import type { WorkerLike } from '../../../src/apps/terminal/shell-client.ts';
import { INITIAL_STATE, QUOTA } from '../../../src/apps/terminal/shell/protocol.ts';
import type { ToWorker, VisitorFiles } from '../../../src/apps/terminal/shell/protocol.ts';

const HOME = '/home/guest';

const lines = async (shell: ReturnType<typeof shellFor>, line: string) => (await shell.run({ id: 1, line, state: INITIAL_STATE, history: [] })).stdout;

describe('009-terminal-node-FR-029: changes go through the same rules', () => {
  test('a forged change to a protected file changes nothing, and the rest are kept', async () => {
    const shell = shellFor('every-field');
    const before = await lines(shell, 'cat cv.json');
    const files = await shell.apply({ files: { [`${HOME}/cv.json`]: { text: 'forged' }, [`${HOME}/ok.txt`]: { text: 'kept' } }, folders: [] });
    expect(await lines(shell, 'cat cv.json')).toBe(before);
    expect(await lines(shell, 'cat ok.txt')).toBe('kept');
    expect(files.files['ok.txt']).toBe('kept');
    expect(files.files['cv.json']).toBeUndefined();
  });

  test('a forged removal of a protected file changes nothing', async () => {
    const shell = shellFor('every-field');
    const before = await lines(shell, 'cat cv.json');
    await shell.apply({ files: { [`${HOME}/cv.json`]: { removed: true } }, folders: [] });
    expect(await lines(shell, 'cat cv.json')).toBe(before);
  });

  test('a path outside the visitor\'s space is refused', async () => {
    const shell = shellFor('every-field');
    const files = await shell.apply({ files: { '/etc/passwd': { text: 'forged' } }, folders: [{ path: '/etc/x', made: true }] });
    expect(JSON.stringify(files)).not.toContain('forged');
  });

  test('past the limit a change is refused, and those that fit are kept', async () => {
    const shell = shellFor('every-field');
    const files = await shell.apply({ files: { [`${HOME}/fits.txt`]: { text: 'x' }, [`${HOME}/big.txt`]: { text: 'y'.repeat(QUOTA + 1) } }, folders: [] });
    expect(files.files['fits.txt']).toBe('x');
    expect(files.files['big.txt']).toBeUndefined();
    expect(files.bytes).toBeLessThanOrEqual(QUOTA);
  });
});

describe('009-terminal-node-FR-030: what a program wrote is there once it ends', () => {
  test('files, folders, removals and binary files, for the shell and its answer', async () => {
    const shell = shellFor('every-field');
    await lines(shell, 'echo gone > old.txt; mkdir olddir');
    const files = await shell.apply({
      files: { [`${HOME}/d/new.txt`]: { text: 'new' }, [`${HOME}/old.txt`]: { removed: true }, [`${HOME}/b.bin`]: { text: 'ÿ\u0001', binary: true } },
      folders: [{ path: `${HOME}/d`, made: true }, { path: `${HOME}/olddir`, made: false }],
    });
    expect(await lines(shell, 'cat d/new.txt')).toBe('new');
    expect(await lines(shell, 'ls old.txt olddir 2>/dev/null')).toBe('');
    expect(files.files['d/new.txt']).toBe('new');
    expect(files.folders).toContain('d');
    expect(files.folders).not.toContain('olddir');
    expect(files.files['old.txt']).toBeUndefined();
    expect(files.binary).toContain('b.bin');
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
    expect(await client.apply(7, { files: {}, folders: [] })).toEqual(FILES);
    expect(posted.at(-1)).toEqual({ type: 'apply', id: 7, changes: { files: {}, folders: [] } });
  });

  test('with no shell ready, `apply` answers null and sends nothing', async () => {
    const client = createShellClient(() => ({ onmessage: null, onerror: null, terminate: () => undefined, postMessage: () => undefined }));
    expect(await client.apply(1, { files: {}, folders: [] })).toBeNull();
  });
});
