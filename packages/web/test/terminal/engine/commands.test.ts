// What the commands return (contracts/commands.md).
import { describe, expect, test } from 'vitest';
import { resume, siteData } from '@cv/content';
import { siteText } from '../../../src/site-text.ts';
import { fixture } from '../../helpers/fixtures.ts';
import { contextFor, contextOf, controls, nodes, output, run, textOf } from './context.ts';

describe('006-terminal-FR-058: vim opens a file, or what is piped in, in the vim view', () => {
  test('vim cv.json and cat cv.json | vim - open the view with the JSON rows and folds', () => {
    const context = contextOf(resume);
    for (const line of ['vim cv.json', 'cat cv.json | vim -', 'VIM CV.JSON']) {
      const result = run(line, context);
      expect(result.kind, line).toBe('open-vim');
      if (result.kind !== 'open-vim') continue;
      expect(result.file.type).toBe('json');
      expect(result.file.name).toBe('cv.json');
      expect(result.file.rows.length).toBe(JSON.stringify(resume, null, 2).split('\n').length);
      expect(result.file.folds.map((fold) => fold.key)).toEqual(Object.keys(resume).filter((key) => typeof (resume as Record<string, unknown>)[key] === 'object'));
    }
    expect((run('vim cv.json', context) as { file: { pipe: unknown } }).file.pipe).toBeNull();
  });

  test('vim nowhere, vim - with nothing piped and vim alone reply without opening the view', () => {
    const context = contextFor('every-field');
    expect(textOf('vim nowhere', context)).toBe('nowhere: no such file or folder.');
    expect(textOf('vim -', context)).toBe('vim takes one path, or - with piped input. Usage: vim [path | -]');
    expect(textOf('vim', context)).toBe('vim takes one path, or - with piped input. Usage: vim [path | -]');
    expect(textOf('vim a b', context)).toBe('vim takes one path, or - with piped input. Usage: vim [path | -]');
  });
});

describe('006-terminal-FR-059: cv runs cat cv.json | jq | vim -', () => {
  test("cv's result equals the pipe's, with the pipe on the source", () => {
    const context = contextOf(resume);
    const cv = run('cv', context);
    expect(cv).toEqual(run('cat cv.json | jq | vim -', context));
    expect(cv.kind === 'open-vim' && cv.file.pipe).toBe('cat cv.json | jq | vim -');
    expect(textOf('cv now', context)).toBe('cv takes no arguments. Usage: cv');
  });

  test('cv opens the CV document from any folder, as cv.json is in the home folder', () => {
    const context = contextOf(resume);
    expect(run('cv', { ...context, folder: ['work'] })).toEqual(run('cv', context));
  });

  test('help describes cv with that pipe', () => {
    expect(siteText.terminal.commands.cv.description).toContain('cat cv.json | jq | vim -');
    expect(textOf('help', contextFor('every-field'))).toContain(siteText.terminal.commands.cv.description);
  });
});

describe('006-terminal-FR-014: open cv and open about ask the shell', () => {
  test('open cv and open about return the os action', () => {
    const context = contextFor('every-field');
    expect(run('open cv', context)).toMatchObject({ kind: 'os', action: { open: 'cv' } });
    expect(run('OPEN About', context)).toMatchObject({ kind: 'os', action: { open: 'about' } });
    expect(run('exit', context)).toMatchObject({ kind: 'os', action: { exit: true } });
  });

  test('open with another name lists the names it takes, as controls', () => {
    const block = output(run('open settings', contextFor('every-field')));
    expect(textOf('open settings', contextFor('every-field'))).toBe('open takes cv or about.');
    expect(controls(block)).toEqual(['open cv', 'open about']);
  });
});

describe('006-terminal-FR-020: history lists the commands run, oldest first, from 1', () => {
  test('history numbers each command', () => {
    const context = contextFor('every-field', { history: ['work', 'skills', 'history'] });
    expect(textOf('history', context)).toBe('1  work\n2  skills\n3  history');
  });
});

describe('006-terminal-FR-013: specs lists every spec from the build, and site ends with the repository', () => {
  test('specs shows the lead, a row per spec with its link, status and count, then the tail', () => {
    const context = contextFor('every-field');
    const block = output(run('specs', context));
    const text = textOf('specs', context);
    const lines = text.split('\n');
    expect(lines[0]).toBe('Every feature is specified before it is built. 2 specs:');
    expect(lines[1]).toBe('001  First Thing  Approved  12 requirements');
    expect(lines[2]).toBe('002  Second Thing  Draft  3 requirements');
    expect(lines[3]).toBe(`All specs, plans and history: ${siteData.repository!.replace(/^https?:\/\//, '')}`);
    const links = nodes(block).flatMap((node) => (node.kind === 'link' ? [node.href] : []));
    expect(links).toEqual([`${siteData.repository}/blob/main/specs/001-first-thing/spec.md`, `${siteData.repository}/blob/main/specs/002-second-thing/spec.md`, siteData.repository]);
    expect(block.some((node) => node.kind === 'rows' && node.req === 'specs')).toBe(true);
  });

  test("site ends with Source code, specs and history: and the repository's link", () => {
    const context = contextFor('every-field');
    const block = output(run('site', context));
    const lines = textOf('site', context).split('\n');
    expect(lines.slice(0, -1)).toEqual([...siteText.terminal.site.paragraphs]);
    expect(lines.at(-1)).toMatch(/^Source code, specs and history: /);
    expect(nodes(block).filter((node) => node.kind === 'link').map((node) => node.kind === 'link' && node.href)).toEqual([siteData.repository]);
  });

  test('neither holds a CV fact', () => {
    const context = contextFor('every-field');
    const cv = fixture('every-field');
    for (const line of ['site', 'specs']) {
      const text = textOf(line, context);
      for (const fact of [cv.basics?.name, cv.basics?.email, cv.work?.[0]?.name]) if (fact !== undefined) expect(text, line).not.toContain(fact);
    }
  });
});

describe('006-terminal-FR-046: pwd shows the working folder, and cd moves it', () => {
  test('pwd shows ~, and ~/work in the work folder; cd, cd ~, cd / and cd .. go home', () => {
    const context = contextFor('every-field');
    expect(textOf('pwd', context)).toBe('~');
    const into = run('cd work', context);
    expect(into).toMatchObject({ kind: 'cd', folder: ['work'], announce: { full: 'Now in ~/work' } });
    const inWork = { ...context, folder: ['work'] as const };
    expect(textOf('pwd', inWork)).toBe('~/work');
    for (const line of ['cd', 'cd ~', 'cd /', 'cd ..', 'CD ~/']) expect(run(line, inWork), line).toMatchObject({ kind: 'cd', folder: [] });
    expect(textOf('cd a b', context)).toBe('cd takes at most one path. Usage: cd [path]');
  });
});
