// What the commands return (contracts/commands.md).
import { describe, expect, test } from 'vitest';
import { resume, siteData } from '@cv/content';
import { fullText } from '../../../src/shell-text.ts';
import { fixture } from '../../helpers/fixtures.ts';
import { contextFor, contextOf, controls, nodes, output, run, textOf } from './context.ts';

describe('006-terminal-FR-058: vim opens a file, or what is piped in, in the vim view', () => {
  test('vim cv.json and cat cv.json | vim - open the view with the JSON rows and folds', async () => {
    const context = contextOf(resume);
    for (const line of ['vim cv.json', 'cat cv.json | vim -', 'VIM CV.JSON']) {
      const result = await run(line, context);
      expect(result.kind, line).toBe('open-vim');
      if (result.kind !== 'open-vim') continue;
      expect(result.file.type).toBe('json');
      expect(result.file.file.name).toBe(line === 'cat cv.json | vim -' ? '[No Name]' : line.split(' ')[1]);
      expect(result.file.text).toBe(JSON.stringify(resume, null, 2));
    }
    expect((await run('vim cv.json', context) as { file: { pipe: unknown } }).file.pipe).toBeNull();
  });

  test('vim - with nothing piped and vim alone reply without opening the view', async () => {
    const context = contextFor('every-field');
    expect(await textOf('vim -', context)).toBe('vim takes one path, or - with piped input. Usage: vim [path | -]');
    expect(await textOf('vim', context)).toBe('vim takes one path, or - with piped input. Usage: vim [path | -]');
    expect(await textOf('vim a b', context)).toBe('vim takes one path, or - with piped input. Usage: vim [path | -]');
  });
});

describe('006-terminal-FR-059: cv runs cat cv.json | jq | vim -', () => {
  test("cv's result equals the pipe's, with the pipe on the source", async () => {
    const context = contextOf(resume);
    const cv = await run('cv', context);
    expect(cv).toEqual(await run('cat cv.json | jq | vim -', context));
    expect(cv.kind === 'open-vim' && cv.file.pipe).toBe('cat cv.json | jq | vim -');
    expect(await textOf('cv now', context)).toBe('cv takes no arguments. Usage: cv');
  });

  test('cv opens the CV document from any folder, as cv.json is in the home folder', async () => {
    const context = contextOf(resume);
    expect(await run('cv', { ...context, cwd: '/home/guest/work' })).toEqual(await run('cv', context));
  });

  test('help describes cv with that pipe', async () => {
    expect(fullText.terminal.commands.cv.description).toContain('cat cv.json | jq | vim -');
    expect(await textOf('help', contextFor('every-field'))).toContain(fullText.terminal.commands.cv.description);
  });
});

describe('006-terminal-FR-014: open cv and open about ask the shell', () => {
  test('open cv and open about return the os action', async () => {
    const context = contextFor('every-field');
    expect(await run('open cv', context)).toMatchObject({ kind: 'os', action: { open: 'cv' } });
    expect(await run('OPEN About', context)).toMatchObject({ kind: 'os', action: { open: 'about' } });
    expect(await run('exit', context)).toMatchObject({ kind: 'os', action: { exit: true } });
  });

  test('open with another name lists the names it takes, as controls', async () => {
    const block = output(await run('open settings', contextFor('every-field')));
    expect(await textOf('open settings', contextFor('every-field'))).toBe('open takes cv or about.');
    expect(controls(block)).toEqual(['open cv', 'open about']);
  });
});

describe('006-terminal-FR-020: history lists the commands run, oldest first, from 1', () => {
  test('history numbers each command', async () => {
    const context = contextFor('every-field', { history: ['work', 'skills', 'history'] });
    expect(await textOf('history', context)).toBe('1  work\n2  skills\n3  history');
  });
});

describe('006-terminal-FR-013: specs lists every spec from the build, and site ends with the repository', () => {
  test('specs shows the lead, a row per spec with its link, status and count, then the tail', async () => {
    const context = contextFor('every-field');
    const block = output(await run('specs', context));
    const text = await textOf('specs', context);
    const lines = text.split('\n');
    expect(lines[0]).toBe('Every feature is specified before it is built. 2 specs:');
    expect(lines[1]).toBe('001  First Thing  Approved  12 requirements');
    expect(lines[2]).toBe('002  Second Thing  Draft  3 requirements');
    expect(lines[3]).toBe(`All specs, plans and history: ${siteData.repository!.replace(/^https?:\/\//, '')}`);
    const links = nodes(block).flatMap((node) => (node.kind === 'link' ? [node.href] : []));
    expect(links).toEqual([`${siteData.repository}/blob/main/specs/001-first-thing/spec.md`, `${siteData.repository}/blob/main/specs/002-second-thing/spec.md`, siteData.repository]);
    expect(block.some((node) => node.kind === 'rows' && node.req === 'specs')).toBe(true);
  });

  test('a list of 1 spec, and a spec of 1 requirement, read in the singular', async () => {
    const context = contextFor('every-field', { specs: [{ number: '001', folder: '001-first-thing', name: 'First Thing', status: 'Approved', requirements: 1 }] });
    const lines = (await textOf('specs', context)).split('\n');
    expect(lines[0]).toBe('Every feature is specified before it is built. 1 spec:');
    expect(lines[1]).toBe('001  First Thing  Approved  1 requirement');
  });

  test("site ends with Source code, specs and history: and the repository's link", async () => {
    const context = contextFor('every-field');
    const block = output(await run('site', context));
    const lines = (await textOf('site', context)).split('\n');
    expect(lines.slice(0, -1)).toEqual([...fullText.terminal.site.paragraphs]);
    expect(lines.at(-1)).toMatch(/^Source code, specs and history: /);
    expect(nodes(block).filter((node) => node.kind === 'link').map((node) => node.kind === 'link' && node.href)).toEqual([siteData.repository]);
  });

  test('neither holds a CV fact', async () => {
    const context = contextFor('every-field');
    const cv = fixture('every-field');
    for (const line of ['site', 'specs']) {
      const text = await textOf(line, context);
      for (const fact of [cv.basics?.name, cv.basics?.email, cv.work?.[0]?.name]) if (fact !== undefined) expect(text, line).not.toContain(fact);
    }
  });
});

describe('006-terminal-FR-046: pwd shows the working folder, and cd moves it', () => {
  test('pwd shows /home/guest, and /home/guest/work in the work folder; cd, cd ~, cd / and cd .. go home', async () => {
    const context = contextFor('every-field');
    expect(await textOf('pwd', context)).toBe('/home/guest');
    const into = await run('cd work', context);
    expect(into).toMatchObject({ kind: 'cd', folder: ['work'], announce: { full: 'Now in ~/work' } });
    const inWork = { ...context, cwd: '/home/guest/work' };
    expect(await textOf('pwd', inWork)).toBe('/home/guest/work');
    for (const line of ['cd', 'cd ~', 'cd ..', 'CD ~/']) expect(await run(line, inWork), line).toMatchObject({ kind: 'cd', folder: [] });
    expect(await run('cd /', inWork)).toMatchObject({ kind: 'cd' });
  });
});
