// What screen readers hear after a command (006 research R13, FR-028): the
// output in full when it is short, else a counted summary.
import { describe, expect, test, vi } from 'vitest';
import { announce, rows } from '../../../src/apps/terminal/engine/announce.ts';
import { line, list, plainText, text } from '../../../src/apps/terminal/engine/block.ts';
import { announcementText } from '../../../src/apps/terminal/session.ts';
import { TERMINAL } from '../../../src/os/metrics.ts';
import { createSession } from '../../../src/apps/terminal/session.ts';
import { createShellClient } from '../../../src/apps/terminal/shell-client.ts';
import type { WorkerLike } from '../../../src/apps/terminal/shell-client.ts';
import { STANDARD_GROUP } from '../../../src/apps/terminal/shell/site-commands.ts';
import type { FromWorker } from '../../../src/apps/terminal/shell/protocol.ts';
import { siteText } from '../../../src/site-text.ts';
import { fixture } from '../../helpers/fixtures.ts';
import { shellFor } from '../shell/context.ts';
import { COLUMNS, contextFor, contextOf, run } from './context.ts';
import type { Shown } from './context.ts';

const announced = (result: Shown) => (result.kind === 'output' || result.kind === 'cd' ? result.announce : null);

describe('006-terminal-FR-028: each output is announced once, in full or summarized', () => {
  test("rows are counted at the desktop window's column count", () => {
    expect(COLUMNS).toBe(TERMINAL.columns);
    expect(rows([text('x'.repeat(COLUMNS))], COLUMNS)).toBe(1);
    expect(rows([text('x'.repeat(COLUMNS + 1))], COLUMNS)).toBe(2);
    expect(rows([line(text('a')), line(text('b'))], COLUMNS)).toBe(2);
    expect(rows([list([[text('a')], [text('b')], [text('c')]])], COLUMNS)).toBe(3);
    expect(rows([line(text(''))], COLUMNS)).toBe(1);
  });

  test('pwd is announced in full', async () => {
    expect(announced(await run('pwd', contextFor('every-field')))).toEqual({ full: '/home/guest' });
    expect(announced(await run('cd work', contextFor('every-field')))).toEqual({ full: 'Now in ~/work' });
  });

  test('work on a 4-entry CV: work: 4 entries', async () => {
    const cv = fixture('every-field');
    cv.work = [cv.work![0]!, cv.work![0]!, cv.work![0]!, cv.work![0]!];
    expect(announced(await run('work', contextOf(cv)))).toEqual({ command: 'work', count: 4, unit: 'entries' });
    expect(announced(await run('experience', contextOf(cv)))).toEqual({ command: 'work', count: 4, unit: 'entries' });
  });

  test('a count of 1 is in the singular: work: 1 entry', async () => {
    const cv = fixture('every-field');
    cv.work = [cv.work![0]!];
    const result = announced(await run('work', contextOf(cv)));
    expect(result).toEqual({ command: 'work', count: 1, unit: 'entries' });
    expect(announcementText(result!)).toBe('work: 1 entry');
    expect(announcementText({ command: 'work', count: 4, unit: 'entries' })).toBe('work: 4 entries');
    expect(announcementText({ command: 'history', count: 1, unit: 'lines' })).toBe('history: 1 line');
  });

  test('help: 22 commands and its standard group, aliases not counted; ls: 11 entries, files and folders together', async () => {
    expect(announced(await run('help', contextFor('every-field')))).toEqual({ command: 'help', count: 22 + STANDARD_GROUP.length, unit: 'commands' });
    expect(announced(await run('ls', contextFor('every-field')))).toEqual({ command: 'ls', count: 11, unit: 'entries' });
  });

  test('an output of 5 rows is announced in full, one of 6 summarized', () => {
    const five = Array.from({ length: 5 }, (_, index) => line(text(`row ${index}`)));
    const six = [...five, line(text('row 5'))];
    expect(announce('history', five, COLUMNS)).toEqual({ full: 'row 0\nrow 1\nrow 2\nrow 3\nrow 4' });
    expect(announce('history', six, COLUMNS)).toEqual({ command: 'history', count: 6, unit: 'lines' });
  });
});

describe('006-terminal-FR-028: text runs, Ctrl+C, stopped lines and loading', () => {
  test('a long text run counts its lines, not its rows: grep: 12 lines, and one long line is grep: 1 line', async () => {
    const context = contextFor('every-field');
    const all = (await run('grep -r a ~', context)) as Extract<Shown, { kind: 'output' }>;
    const printed = all.result.stdout.split('\n').filter((entry) => entry !== '').length;
    expect(printed).toBeGreaterThanOrEqual(12);
    expect(announced(all)).toEqual({ command: 'grep', count: printed, unit: 'lines' });
    expect(announcementText(announced(await run('grep -r a ~ | head -12', context))!)).toBe('grep: 12 lines');
    expect(announcementText(announced(await run("grep -rh a ~ | tr '\\n' ' '", context))!)).toBe('grep: 1 line');
  });

  // A worker in Node, through the real shell client: `hang` is never
  // answered, and `start` is answered when `ready()` is called.
  function nodeWorker() {
    const shell = shellFor('every-field');
    let started: (() => void) | null = null;
    const worker: WorkerLike & { ready(): void } = {
      onmessage: null,
      onerror: null,
      terminate: () => undefined,
      postMessage(message) {
        const answer = (data: FromWorker) => queueMicrotask(() => worker.onmessage?.({ data }));
        if (message.type === 'start') started = () => answer({ type: 'ready' });
        else if (message.type === 'run' && message.request.line !== 'hang') void shell.run(message.request).then((result) => answer({ type: 'result', result }));
        else if (message.type === 'restore') answer({ type: 'ready' });
      },
      ready: () => started?.(),
    };
    return worker;
  }

  async function sessionWithWorker() {
    const workers: ReturnType<typeof nodeWorker>[] = [];
    const session = createSession(
      createShellClient(() => {
        const worker = nodeWorker();
        workers.push(worker);
        return worker;
      }),
    );
    session.start();
    // The loading line is announced once, before the shell is ready.
    expect(session.get().announcement?.text).toBe(siteText.terminal.announce.loading);
    workers[0]!.ready();
    await vi.waitFor(() => expect(session.get().shell).toBe('ready'));
    return { session, workers };
  }

  test('loading the shell is announced once: Loading the shell', async () => {
    const { session } = await sessionWithWorker();
    const first = session.get().announcement;
    expect(first?.text).toBe('Loading the shell');
    session.start();
    expect(session.get().announcement).toBe(first);
  });

  test('Ctrl+C on a typed line: Cancelled, an entry with ^C, not in the history, and an empty draft', async () => {
    const { session } = await sessionWithWorker();
    session.setDraft('abc');
    session.cancel();
    const state = session.get();
    expect(state.announcement?.text).toBe('Cancelled');
    expect(state.entries.at(-1)).toMatchObject({ line: 'abc', cancelled: true, block: [] });
    expect(state.history).toEqual([]);
    expect(state.draft).toBe('');
  });

  test('Ctrl+C on a running line stops it, marked ^C, announced by its stopped text', async () => {
    const { session, workers } = await sessionWithWorker();
    session.run('hang', 'desktop');
    expect(session.get().running?.line).toBe('hang');
    session.cancel();
    await vi.waitFor(() => expect(session.get().running).toBeNull());
    const done = session.get().entries.at(-1)!;
    expect(done.cancelled).toBe(true);
    expect(plainText(done.block!)).toBe(siteText.terminal.replies.stopped.cancelled);
    expect(session.get().announcement?.text).toBe('stopped: you pressed Ctrl+C.');
    // A new worker, restored, runs the next line.
    workers.at(-1)!.ready();
    session.run('echo after', 'desktop');
    await vi.waitFor(() => expect(session.get().entries.at(-1)?.line).toBe('echo after'));
  });
});
