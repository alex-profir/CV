// What the commands return (contracts/commands.md).
import { describe, expect, test } from 'vitest';
import { resume } from '@cv/content';
import { siteText } from '../../../src/site-text.ts';
import { contextFor, contextOf, controls, output, run, textOf } from './context.ts';

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
