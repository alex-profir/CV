// The file system (006 research R9, data-model.md File system).
import { describe, expect, test } from 'vitest';
import { resume } from '@cv/content';
import { formatPath, resolve } from '../../../src/apps/terminal/engine/files.ts';
import type { Folder } from '../../../src/apps/terminal/engine/files.ts';
import { contextOf, output, run } from './context.ts';

const file = (name: string) => ({ kind: 'file' as const, name, show: () => [] });

// A small tree, with a folder, for the path rules alone.
const TREE: Folder = {
  kind: 'folder',
  name: '~',
  children: [file('cv.json'), file('about'), { kind: 'folder', name: 'work', children: [file('acme'), file('beta')] }, { kind: 'folder', name: 'specs', children: [file('001-x')] }],
};

describe('006-terminal-FR-045: paths are relative to the working folder, or from home', () => {
  test('relative names, ., .., ~, ~/x, /x and capitals, from the home folder', () => {
    expect(resolve(TREE, 'cv.json', [])).toEqual(['cv.json']);
    expect(resolve(TREE, 'CV.JSON', [])).toEqual(['cv.json']);
    expect(resolve(TREE, 'Work', [])).toEqual(['work']);
    expect(resolve(TREE, 'work/ACME', [])).toEqual(['work', 'acme']);
    expect(resolve(TREE, './work/./acme', [])).toEqual(['work', 'acme']);
    expect(resolve(TREE, 'work/', [])).toEqual(['work']);
    expect(resolve(TREE, '~', [])).toEqual([]);
    expect(resolve(TREE, '~/', [])).toEqual([]);
    expect(resolve(TREE, '/', [])).toEqual([]);
    expect(resolve(TREE, '.', [])).toEqual([]);
    expect(resolve(TREE, '~/work/beta', [])).toEqual(['work', 'beta']);
    expect(resolve(TREE, '/specs/001-x', [])).toEqual(['specs', '001-x']);
    expect(resolve(TREE, 'nowhere', [])).toBeNull();
    expect(resolve(TREE, 'cv.json/x', [])).toBeNull();
  });

  test('.. and ../.. at home stay home; from a folder, paths start there', () => {
    expect(resolve(TREE, '..', [])).toEqual([]);
    expect(resolve(TREE, '../..', [])).toEqual([]);
    expect(resolve(TREE, '../work', [])).toEqual(['work']);
    expect(resolve(TREE, 'acme', ['work'])).toEqual(['work', 'acme']);
    expect(resolve(TREE, '..', ['work'])).toEqual([]);
    expect(resolve(TREE, '../about', ['work'])).toEqual(['about']);
    expect(resolve(TREE, '../../../cv.json', ['work'])).toEqual(['cv.json']);
    expect(resolve(TREE, '~/about', ['work'])).toEqual(['about']);
    expect(resolve(TREE, 'about', ['work'])).toBeNull();
  });

  test('formatPath writes ~ for home', () => {
    expect(formatPath([])).toBe('~');
    expect(formatPath(['work'])).toBe('~/work');
    expect(formatPath(['work', 'acme'])).toBe('~/work/acme');
  });
});

describe('006-terminal-FR-055: cat cv.json shows the JSON as it is', () => {
  test('cat cv.json is one text block holding cv.json, passed on to a pipe', () => {
    const context = contextOf(resume);
    const result = run('cat cv.json', context);
    const cvJson = JSON.stringify(resume, null, 2);
    expect(output(result)).toEqual([{ kind: 'text', text: cvJson }]);
    expect(result.kind === 'output' && result.text).toBe(cvJson);
    expect(run('cat ~/CV.json', context)).toEqual(result);
  });
});
