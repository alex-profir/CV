// A second Tab's list as readline lays it out (006 research R44).
import { describe, expect, test } from 'vitest';
import { columns } from '../../../src/apps/terminal/engine/columns.ts';

const HOME = ['about', 'contact', 'cv.json', 'education/', 'interests', 'languages', 'notes/', 'projects/', 'readme', 'skills', 'specs/', 'todo', 'work/'].map((name) => ({ name, folder: name.endsWith('/') }));

describe('006-terminal-FR-076: the list’s columns', () => {
  test('the home folder’s 13 names at 80, 40 and 20 characters give 7, 3 and 1 columns', () => {
    expect(columns(HOME, 80)[0]).toHaveLength(7);
    expect(columns(HOME, 40)[0]).toHaveLength(3);
    expect(columns(HOME, 20)[0]).toHaveLength(1);
  });

  test('filled down, each cell the longest name plus 2, the last column unpadded, folders keeping their /', () => {
    const rows = columns(HOME, 40);
    expect(rows).toHaveLength(5);
    expect(rows.map((row) => row[0]!.trim())).toEqual(['about', 'contact', 'cv.json', 'education/', 'interests']);
    expect(rows.map((row) => row[1]!.trim())).toEqual(['languages', 'notes/', 'projects/', 'readme', 'skills']);
    expect(rows[0]![0]).toBe('about      ');
    expect(rows[3]![0]).toBe('education/ ');
    expect(rows[0]![2]).toBe('specs/');
  });

  test('an exact fit gives up a column, as readline does; one name is one row; none is none', () => {
    const names = ['aaaa', 'bbbb', 'cccc', 'dddd'].map((name) => ({ name, folder: false }));
    expect(columns(names, 12)[0]).toHaveLength(1);
    expect(columns(names, 13)[0]).toHaveLength(2);
    expect(columns([{ name: 'one', folder: false }], 80)).toEqual([['one  ']]);
    expect(columns([], 80)).toEqual([]);
  });
});
