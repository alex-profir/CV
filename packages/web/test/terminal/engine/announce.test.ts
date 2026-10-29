// What screen readers hear after a command (006 research R13, FR-028): the
// output in full when it is short, else a counted summary.
import { describe, expect, test } from 'vitest';
import { announce, rows } from '../../../src/apps/terminal/engine/announce.ts';
import { line, list, text } from '../../../src/apps/terminal/engine/block.ts';
import { announcementText } from '../../../src/apps/terminal/session.ts';
import { TERMINAL } from '../../../src/os/metrics.ts';
import { fixture } from '../../helpers/fixtures.ts';
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
    expect(announced(await run('pwd', contextFor('every-field')))).toEqual({ full: '~' });
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

  test('help: 22 commands, aliases not counted; ls: 11 entries, files and folders together', async () => {
    expect(announced(await run('help', contextFor('every-field')))).toEqual({ command: 'help', count: 22, unit: 'commands' });
    expect(announced(await run('ls', contextFor('every-field')))).toEqual({ command: 'ls', count: 11, unit: 'entries' });
  });

  test('an output of 5 rows is announced in full, one of 6 summarized', () => {
    const five = Array.from({ length: 5 }, (_, index) => line(text(`row ${index}`)));
    const six = [...five, line(text('row 5'))];
    expect(announce('history', five, COLUMNS)).toEqual({ full: 'row 0\nrow 1\nrow 2\nrow 3\nrow 4' });
    expect(announce('history', six, COLUMNS)).toEqual({ command: 'history', count: 6, unit: 'lines' });
  });
});
