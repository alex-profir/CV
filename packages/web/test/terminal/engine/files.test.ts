// The file system (006 research R9, data-model.md File system).
import { describe, expect, test } from 'vitest';
import { resume } from '@cv/content';
import { fileName, folderNames, formatPath, resolve } from '../../../src/apps/terminal/engine/files.ts';
import type { Folder } from '../../../src/apps/terminal/engine/files.ts';
import { shownEntries } from '../../../src/apps/terminal/engine/cv.ts';
import { fixture } from '../../helpers/fixtures.ts';
import type { FixtureName } from '../../helpers/fixtures.ts';
import { contextFor, contextOf, controls, output, run, SPECS, textOf } from './context.ts';

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

const ALL_FIXTURES: FixtureName[] = ['every-field', 'nothing-optional', 'partial-dates', 'non-ascii', 'three-projects', 'empty-sections', 'long-words'];

// Every file's path in a tree, depth first.
function filePaths(folder: Folder, at: string[] = []): string[][] {
  return folder.children.flatMap((child) => (child.kind === 'folder' ? filePaths(child, [...at, child.name]) : [[...at, child.name]]));
}

describe('006-terminal-FR-012: the file system holds the whole CV, and the named commands show it too', () => {
  test.each(ALL_FIXTURES)('%s: every section with entries is in the tree, and ls, cd, cat and pwd reach all of it', (name) => {
    const context = contextFor(name);
    const home = context.fs.children.map((child) => child.name);
    for (const section of ['work', 'projects', 'education', 'skills', 'languages', 'interests']) {
      const entries = shownEntries(fixture(name), section as 'work');
      expect(home.includes(section), `${name} ${section}`).toBe(entries.length > 0);
      if (entries.length > 0) expect(textOf(section, context)).not.toMatch(/^The CV lists no/);
    }
    for (const path of filePaths(context.fs)) {
      const typed = `~/${path.join('/')}`;
      expect(run(`cat ${typed}`, context).kind, typed).toBe('output');
      expect(textOf(`cat ${typed}`, context)).not.toMatch(/no such file or folder|is a folder/);
      if (path.length === 2) {
        const moved = run(`cd ${path[0]}`, context);
        expect(moved).toMatchObject({ kind: 'cd', folder: [path[0]] });
        const inside = { ...context, folder: [path[0]!] };
        expect(textOf('pwd', inside)).toBe(`~/${path[0]}`);
        expect(textOf(`cat ${path[1]}`, inside)).toBe(textOf(`cat ${typed}`, context));
        expect(textOf('ls', inside).split('  ')).toContain(path[1]);
      }
    }
  });
});

describe('006-terminal-FR-043: the home folder in the design order, folders ending in /', () => {
  test("every-field's home folder lists every name in order", () => {
    expect(textOf('ls', contextFor('every-field')).split('  ')).toEqual(['cv.json', 'about', 'contact', 'work/', 'projects/', 'skills', 'education/', 'languages', 'interests', 'readme', 'specs/']);
  });

  test('empty sections are left out; cv.json, readme and specs/ stay', () => {
    const names = textOf('ls', contextFor('empty-sections')).split('  ');
    const cv = fixture('empty-sections');
    for (const section of ['work', 'projects', 'education'] as const) expect(names.includes(`${section}/`), section).toBe(shownEntries(cv, section).length > 0);
    for (const section of ['skills', 'languages', 'interests'] as const) expect(names.includes(section), section).toBe(shownEntries(cv, section).length > 0);
    expect(names).toEqual(expect.arrayContaining(['cv.json', 'readme', 'specs/']));
  });

  test("entries keep the CV's order, and specs their numbered order", () => {
    const context = contextFor('three-projects');
    const cv = fixture('three-projects');
    const names = textOf('ls projects', context).split('  ');
    expect(names).toEqual(cv.projects!.map((project) => fileName(project.name ?? '', 'project')));
    expect(textOf('ls specs', context).split('  ')).toEqual(SPECS.map((spec) => spec.folder));
  });

  test('a folder is a control running ls ~/{folder}, a file one running cat ~/{path}', () => {
    const block = output(run('ls', contextFor('every-field')));
    expect(controls(block)).toContain('ls ~/work');
    expect(controls(block)).toContain('cat ~/cv.json');
    const work = output(run('ls work', contextFor('every-field')));
    for (const line of controls(work)) expect(line).toMatch(/^cat ~\/work\/[a-z0-9-]+$/);
  });
});

describe("006-terminal-FR-044: file names are made from the CV's own names", () => {
  test('lower case, no accents, hyphens for every other run, trimmed; empty gives the singular', () => {
    expect(fileName('Acme Corp.', 'role')).toBe('acme-corp');
    expect(fileName('Universitatea din Timișoara', 'school')).toBe('universitatea-din-timisoara');
    expect(fileName('  --Ünïcödé & Co!! ', 'role')).toBe('unicode-co');
    expect(fileName('C++/C#', 'project')).toBe('c-c');
    expect(fileName('', 'project')).toBe('project');
    expect(fileName('!!!', 'role')).toBe('role');
  });

  test('non-ascii: every name is plain lower-case letters, digits and hyphens', () => {
    for (const path of filePaths(contextFor('non-ascii').fs)) for (const part of path) expect(part).toMatch(/^[a-z0-9.]+(?:-[a-z0-9.]+)*$/);
  });

  test('clashes get the start year, then -2, -3 in order', () => {
    expect(folderNames([{ name: 'acme', start: '2020-01' }, { name: 'beta' }, { name: 'acme', start: '2018-05' }])).toEqual(['acme-2020', 'beta', 'acme-2018']);
    expect(folderNames([{ name: 'acme', start: '2020' }, { name: 'acme', start: '2020-06' }, { name: 'acme' }])).toEqual(['acme-2020', 'acme-2020-2', 'acme']);
    expect(folderNames([{ name: 'acme' }, { name: 'acme' }, { name: 'acme' }])).toEqual(['acme', 'acme-2', 'acme-3']);
  });

  test('the same CV gives the same names twice', () => {
    for (const name of ALL_FIXTURES) expect(filePaths(contextFor(name).fs)).toEqual(filePaths(contextFor(name).fs));
  });
});

describe('006-terminal-FR-047: a file shows what its named command shows', () => {
  test.each(ALL_FIXTURES)('%s: each entry file is its entry, and the section files are their commands', (name) => {
    const context = contextFor(name);
    for (const section of ['work', 'projects', 'education'] as const) {
      const folder = context.fs.children.find((child) => child.name === section);
      if (folder === undefined || folder.kind !== 'folder') continue;
      const files = folder.children.flatMap((file) => output(run(`cat ${section}/${file.name}`, context)));
      expect(files, section).toEqual(output(run(section, context)));
    }
    for (const [file, command] of [['about', 'about'], ['contact', 'contact'], ['skills', 'skills'], ['languages', 'languages'], ['interests', 'interests'], ['readme', 'site']]) {
      if (context.fs.children.some((child) => child.name === file)) expect(output(run(`cat ${file}`, context)), file).toEqual(output(run(command!, context)));
    }
    const specs = output(run('specs', context)).find((node) => node.kind === 'rows')!;
    SPECS.forEach((spec, index) => {
      const row = output(run(`cat specs/${spec.folder}`, context));
      expect(row).toEqual([{ ...specs, rows: [specs.kind === 'rows' ? specs.rows[index] : []] }]);
    });
  });
});

describe('006-terminal-FR-049: nothing changes the file system', () => {
  test('rm, mkdir, touch, mv and sudo are unknown commands', () => {
    const context = contextFor('every-field');
    for (const line of ['rm cv.json', 'mkdir x', 'touch y', 'mv about a', 'sudo rm -rf /']) expect(textOf(line, context), line).toMatch(/^\S+ is not a command\./);
  });

  test('the tree is the same before and after running every command', () => {
    const context = contextFor('every-field');
    const before = structuredClone(filePaths(context.fs));
    const shown = filePaths(context.fs).map((path) => textOf(`cat ~/${path.join('/')}`, context));
    for (const line of ['help', 'about', 'work', 'projects', 'education', 'skills', 'languages', 'interests', 'contact', 'cv', 'site', 'specs', 'ls', 'cd work', 'cat cv.json', 'cat cv.json | jq', 'vim cv.json', 'pwd', 'open cv', 'history', 'clear', 'exit', 'rm cv.json']) run(line, context);
    expect(filePaths(context.fs)).toEqual(before);
    expect(filePaths(context.fs).map((path) => textOf(`cat ~/${path.join('/')}`, context))).toEqual(shown);
  });
});
