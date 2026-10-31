// The file system (006 research R9, data-model.md File system).
import { describe, expect, test } from 'vitest';
import { resume } from '@cv/content';
import { fileName, folderNames, formatPath, resolve } from '../../../src/apps/terminal/engine/files.ts';
import type { Folder } from '../../../src/apps/terminal/engine/files.ts';
import type { Node } from '../../../src/apps/terminal/engine/block.ts';
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
  test('cat cv.json is one text block holding cv.json, passed on to a pipe', async () => {
    const context = contextOf(resume);
    const result = await run('cat cv.json', context);
    const cvJson = JSON.stringify(resume, null, 2);
    expect(output(result)).toEqual([{ kind: 'text', text: cvJson }]);
    expect(result.kind === 'output' && result.result.stdout).toBe(`${cvJson}\n`);
    expect(output(await run('cat ~/CV.json', context))).toEqual(output(result));
  });
});

const ALL_FIXTURES: FixtureName[] = ['every-field', 'nothing-optional', 'partial-dates', 'non-ascii', 'three-projects', 'empty-sections', 'long-words'];

// Every file's path in a tree, depth first.
function filePaths(folder: Folder, at: string[] = []): string[][] {
  return folder.children.flatMap((child) => (child.kind === 'folder' ? filePaths(child, [...at, child.name]) : [[...at, child.name]]));
}

describe('006-terminal-FR-012: the file system holds the whole CV, and the named commands show it too', () => {
  test.each(ALL_FIXTURES)('%s: every section with entries is in the tree, and ls, cd, cat and pwd reach all of it', async (name) => {
    const context = contextFor(name);
    const home = context.fs.children.map((child) => child.name);
    for (const section of ['work', 'projects', 'education', 'skills', 'languages', 'interests']) {
      const entries = shownEntries(fixture(name), section as 'work');
      expect(home.includes(section), `${name} ${section}`).toBe(entries.length > 0);
      if (entries.length > 0) expect(await textOf(section, context)).not.toMatch(/^The CV lists no/);
    }
    for (const path of filePaths(context.fs)) {
      const typed = `~/${path.join('/')}`;
      expect((await run(`cat ${typed}`, context)).kind, typed).toBe('output');
      expect(await textOf(`cat ${typed}`, context)).not.toMatch(/no such file or folder|is a folder/);
      if (path.length === 2) {
        const moved = await run(`cd ${path[0]}`, context);
        expect(moved).toMatchObject({ kind: 'cd', folder: [path[0]] });
        const inside = { ...context, cwd: `/home/guest/${path[0]}` };
        expect(await textOf('pwd', inside)).toBe(`/home/guest/${path[0]}`);
        expect(await textOf(`cat ${path[1]}`, inside)).toBe(await textOf(`cat ${typed}`, context));
        expect((await textOf('ls', inside)).split('  ')).toContain(path[1]);
      }
    }
  });
});

describe('006-terminal-FR-043: the home folder in the design order, folders ending in /', () => {
  test("every-field's home folder lists every name in order", async () => {
    expect((await textOf('ls', contextFor('every-field'))).split('  ')).toEqual(['cv.json', 'about', 'contact', 'work/', 'projects/', 'skills', 'education/', 'languages', 'interests', 'readme', 'specs/']);
  });

  test('empty sections are left out; cv.json, readme and specs/ stay', async () => {
    const names = (await textOf('ls', contextFor('empty-sections'))).split('  ');
    const cv = fixture('empty-sections');
    for (const section of ['work', 'projects', 'education'] as const) expect(names.includes(`${section}/`), section).toBe(shownEntries(cv, section).length > 0);
    for (const section of ['skills', 'languages', 'interests'] as const) expect(names.includes(section), section).toBe(shownEntries(cv, section).length > 0);
    expect(names).toEqual(expect.arrayContaining(['cv.json', 'readme', 'specs/']));
  });

  test('about and contact are left out when their commands would say the CV lists nothing', async () => {
    const empty = contextOf({ ...fixture('every-field'), basics: { location: {}, profiles: [{}] } });
    const names = (await textOf('ls', empty)).split('  ');
    expect(names).not.toContain('about');
    expect(names).not.toContain('contact');
    expect(await textOf('about', empty)).toBe('The CV lists no basics.');
    expect(await textOf('contact', empty)).toBe('The CV lists no contact details.');
    const city = contextOf({ ...fixture('every-field'), basics: { location: { city: 'Brașov' } } });
    expect((await textOf('ls', city)).split('  ')).toContain('about');
    expect((await textOf('ls', city)).split('  ')).not.toContain('contact');
    expect(await textOf('cat about', city)).toBe(await textOf('about', city));
  });

  test("entries keep the CV's order, and specs their numbered order", async () => {
    const context = contextFor('three-projects');
    const cv = fixture('three-projects');
    const names = (await textOf('ls projects', context)).split('  ');
    expect(names).toEqual(cv.projects!.map((project) => fileName(project.name ?? '', 'project')));
    expect((await textOf('ls specs', context)).split('  ')).toEqual(SPECS.map((spec) => spec.folder));
  });

  test('a folder is a control running ls ~/{folder}, a file one running cat ~/{path}', async () => {
    const block = output(await run('ls', contextFor('every-field')));
    expect(controls(block)).toContain('ls ~/work');
    expect(controls(block)).toContain('cat ~/cv.json');
    const work = output(await run('ls work', contextFor('every-field')));
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

  test('letters and digits of any script are kept, accents still removed', () => {
    expect(fileName('Łódź Tech', 'role')).toBe('łodz-tech');
    expect(fileName('Straße GmbH', 'role')).toBe('straße-gmbh');
    expect(fileName('Øresund AB', 'role')).toBe('øresund-ab');
    expect(fileName('Яндекс Технологии', 'role')).toBe('яндекс-технологии');
    expect(fileName('東京 Labs ２', 'project')).toBe('東京-labs-２');
    expect(fileName('Café Ünïcode', 'role')).toBe('cafe-unicode');
    expect(fileName('İstanbul', 'school')).toBe('istanbul');
  });

  test('a file named from such a CV is found as typed, without regard to capitals or accents', async () => {
    const cv = { ...fixture('every-field'), work: [{ name: 'Łódź Tech', position: 'Engineer' }, { name: 'Яндекс', position: 'Engineer' }] };
    const context = contextOf(cv);
    expect((await textOf('ls work', context)).split('  ')).toEqual(['łodz-tech', 'яндекс']);
    const shown = await textOf('cat ~/work/łodz-tech', context);
    expect(shown).toContain('Łódź Tech');
    for (const typed of ['łódź-tech', 'ŁÓDŹ-TECH', 'Łodz-Tech']) expect(await textOf(`cat ~/work/${typed}`, context), typed).toBe(shown);
    expect(await textOf('cat ~/work/ЯНДЕКС', context)).toContain('Яндекс');
    expect(await textOf('cat ~/work/lodz-tech', context)).toBe('cat: /home/guest/work/lodz-tech: No such file or directory');
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
  test.each(ALL_FIXTURES)('%s: each entry file is its entry, and the section files are their commands', async (name) => {
    const context = contextFor(name);
    for (const section of ['work', 'projects', 'education'] as const) {
      const folder = context.fs.children.find((child) => child.name === section);
      if (folder === undefined || folder.kind !== 'folder') continue;
      const files: Node[] = [];
      for (const file of folder.children) files.push(...output(await run(`cat ${section}/${file.name}`, context)));
      expect(files, section).toEqual(output(await run(section, context)));
    }
    for (const [file, command] of [['about', 'about'], ['contact', 'contact'], ['skills', 'skills'], ['languages', 'languages'], ['interests', 'interests'], ['readme', 'site']]) {
      if (context.fs.children.some((child) => child.name === file)) expect(output(await run(`cat ${file}`, context)), file).toEqual(output(await run(command!, context)));
    }
    const specs = output(await run('specs', context)).find((node) => node.kind === 'rows')!;
    for (const [index, spec] of SPECS.entries()) {
      const row = output(await run(`cat specs/${spec.folder}`, context));
      expect(row).toEqual([{ ...specs, rows: [specs.kind === 'rows' ? specs.rows[index] : []] }]);
    }
  });
});

describe('006-terminal-FR-049: the protected tree stays as it was built', () => {
  test('the tree is the same before and after running every command', async () => {
    const context = contextFor('every-field');
    const before = structuredClone(filePaths(context.fs));
    const texts = () => Promise.all(filePaths(context.fs).map((path) => textOf(`cat ~/${path.join('/')}`, context)));
    const shown = await texts();
    for (const line of ['help', 'about', 'work', 'projects', 'education', 'skills', 'languages', 'interests', 'contact', 'cv', 'site', 'specs', 'ls', 'cd work', 'cat cv.json', 'cat cv.json | jq', 'vim cv.json', 'pwd', 'open cv', 'history', 'clear', 'exit', 'rm cv.json', 'rm -rf ~', 'mv work jobs', 'echo hi > about']) await run(line, context);
    expect(filePaths(context.fs)).toEqual(before);
    expect(await texts()).toEqual(shown);
  });
});
