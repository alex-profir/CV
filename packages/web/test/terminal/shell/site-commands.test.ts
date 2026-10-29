// The site's commands in the shell (006 research R29): each prints the text
// of its block and records the block with that text; the wrappers of `cat`,
// `ls` and `jq` record what the site adds; `vim`, `cv`, `open` and `clear`
// return their effects.
import { describe, expect, test } from 'vitest';
import { blockText } from '../../../src/apps/terminal/engine/block.ts';
import { COMMANDS } from '../../../src/apps/terminal/engine/commands.ts';
import { siteText } from '../../../src/site-text.ts';
import { fixture } from '../../helpers/fixtures.ts';
import { nodes } from '../engine/context.ts';
import { runLine, runLines, shellFor, treeFor } from './context.ts';

const PRINTING = COMMANDS.filter((row) => row.run !== undefined && !['open', 'clear', 'history'].includes(row.name));

describe('006-terminal-FR-008 and 006-terminal-FR-047: a site command prints its block’s text, and records it once', () => {
  test('every printing command and alias', async () => {
    const shell = shellFor('every-field');
    for (const row of PRINTING) {
      for (const word of [row.name, ...row.aliases]) {
        const result = await runLine(shell, word);
        expect(result.status, word).toBe(0);
        expect(result.stdout.endsWith('\n'), word).toBe(true);
        expect(result.recorded, word).toHaveLength(1);
        expect(result.recorded[0]!.text, word).toBe(result.stdout);
        expect(blockText(result.recorded[0]!.block), word).toBe(result.stdout.slice(0, -1));
      }
    }
  });

  test('every protected file holds its block’s text, and cat records that block', async () => {
    const shell = shellFor('every-field');
    const { fs } = treeFor('every-field');
    const walk = async (folder: typeof fs, at: string) => {
      for (const child of folder.children) {
        const path = `${at}/${child.name}`;
        if (child.kind === 'folder') {
          await walk(child, path);
          continue;
        }
        const result = await runLine(shell, `cat ${path}`);
        const expected = child.text ?? blockText(child.show());
        expect(result.stdout, path).toBe(`${expected}\n`);
        expect(result.recorded, path).toEqual([{ text: `${expected}\n`, block: child.show() }]);
      }
    };
    await walk(fs, '~');
    // `cat about` prints what `about` prints.
    expect((await runLine(shell, 'cat about')).stdout).toBe((await runLine(shell, 'about')).stdout);
  });

  test('cat on two files records two blocks in order; cat -n about records nothing', async () => {
    const shell = shellFor('every-field');
    const two = await runLine(shell, 'cat about skills');
    expect(two.recorded.map((entry) => entry.text)).toEqual([(await runLine(shell, 'about')).stdout, (await runLine(shell, 'skills')).stdout]);
    expect((await runLine(shell, 'cat -n about')).recorded).toEqual([]);
  });
});

describe('006-terminal-FR-050: ls records a listing whose names are controls', () => {
  test('ls and ls ~/work: folders run ls on them, files cat; the home folder in the design’s order', async () => {
    const shell = shellFor('every-field');
    const home = await runLine(shell, 'ls');
    expect(home.recorded).toHaveLength(1);
    expect(home.recorded[0]!.text).toBe(home.stdout);
    const cells = nodes(home.recorded[0]!.block).filter((node) => node.kind === 'command');
    expect(cells.map((cell) => cell.kind === 'command' && cell.label)).toEqual(['cv.json', 'about', 'contact', 'work/', 'projects/', 'skills', 'education/', 'languages', 'interests', 'readme', 'specs/']);
    expect(cells.map((cell) => cell.kind === 'command' && cell.line).slice(0, 4)).toEqual(['cat ~/cv.json', 'cat ~/about', 'cat ~/contact', 'ls ~/work']);
    const work = await runLine(shell, 'ls ~/work');
    const lines = nodes(work.recorded[0]!.block).flatMap((node) => (node.kind === 'command' ? [node.line] : []));
    expect(lines.length).toBeGreaterThan(0);
    for (const entry of lines) expect(entry).toMatch(/^cat ~\/work\//);
  });

  test('ls | cat records nothing', async () => {
    const shell = shellFor('every-field');
    expect((await runLine(shell, 'ls | cat')).recorded).toEqual([]);
    expect((await runLine(shell, 'work | cat')).recorded).toEqual([]);
  });
});

describe('006-terminal-FR-058 and 006-terminal-FR-059: vim and cv open the vim view', () => {
  test('vim cv.json and cat cv.json | vim - give the file’s name and text', async () => {
    const shell = shellFor('every-field');
    const cvJson = JSON.stringify(fixture('every-field'), null, 2);
    expect((await runLine(shell, 'vim cv.json')).effects).toEqual([{ kind: 'vim', name: 'cv.json', pipe: null, text: cvJson }]);
    expect((await runLine(shell, 'cat cv.json | vim -')).effects).toEqual([{ kind: 'vim', name: 'cv.json', pipe: 'cat cv.json | vim -', text: cvJson }]);
  });

  test('vim work, vim nowhere, vim - with nothing piped and vim alone reply on stderr, with no effect', async () => {
    const shell = shellFor('every-field');
    const { replies } = siteText.terminal;
    const expected: Record<string, string> = {
      'vim work': replies.isFolder.replace('{path}', 'work').replace('{command}', 'ls work'),
      'vim nowhere': replies.noSuchPath.replace('{path}', 'nowhere'),
    };
    for (const line of ['vim work', 'vim nowhere', 'vim -', 'vim']) {
      const result = await runLine(shell, line);
      expect(result.effects, line).toEqual([]);
      expect(result.stdout, line).toBe('');
      if (line in expected) expect(result.stderr, line).toBe(`${expected[line]}\n`);
      else {
        expect(result.stderr, line).toMatch(/^vim takes .+\. Usage: vim /);
        expect(result.status, line).toBe(2);
      }
    }
  });

  test('cv gives the effect cat cv.json | jq | vim - gives, with that pipe, from any folder', async () => {
    const shell = shellFor('every-field');
    const piped = (await runLine(shell, 'cat cv.json | jq | vim -')).effects;
    const [cv] = await runLines(shell, ['cv']);
    expect(cv!.effects).toEqual(piped);
    const [, fromWork] = await runLines(shell, ['cd work', 'cv']);
    expect(fromWork!.effects).toEqual(piped);
  });
});

describe('006-terminal-FR-014 and 006-terminal-FR-019: open and clear return their effects, in order', () => {
  test('open cv, open about, clear, and clear; open cv', async () => {
    const shell = shellFor('every-field');
    expect((await runLine(shell, 'open cv')).effects).toEqual([{ kind: 'open', view: 'cv' }]);
    expect((await runLine(shell, 'open about')).effects).toEqual([{ kind: 'open', view: 'about' }]);
    expect((await runLine(shell, 'clear')).effects).toEqual([{ kind: 'clear' }]);
    expect((await runLine(shell, 'clear; open cv')).effects).toEqual([{ kind: 'clear' }, { kind: 'open', view: 'cv' }]);
  });

  test('open settings replies listing cv and about as controls', async () => {
    const result = await runLine(shellFor('every-field'), 'open settings');
    expect(result.effects).toEqual([]);
    expect(nodes(result.recorded[0]!.block).flatMap((node) => (node.kind === 'command' ? [node.line] : []))).toEqual(['open cv', 'open about']);
  });
});

describe('006-terminal-FR-017 and 006-terminal-FR-020: usage replies and the history', () => {
  test('work 2020 and open alone give the usage reply on stderr with status 2', async () => {
    const shell = shellFor('every-field');
    for (const line of ['work 2020', 'open', 'EXPERIENCE 1']) {
      const result = await runLine(shell, line);
      expect(result.stdout, line).toBe('');
      expect(result.stderr, line).toMatch(/ takes .+\. Usage: /);
      expect(result.status, line).toBe(2);
    }
    expect((await runLine(shell, 'EXPERIENCE 1')).stderr.startsWith('experience takes')).toBe(true);
  });

  test('history prints the history numbered from 1, history 2 the last two, history -c empties it', async () => {
    const shell = shellFor('every-field');
    const results = await runLines(shell, ['about', 'work', 'history', 'history 2', 'history -c', 'history']);
    expect(results[2]!.stdout).toBe('1  about\n2  work\n3  history\n');
    expect(results[3]!.stdout).toBe('3  history\n4  history 2\n');
    expect(results[4]!.effects).toEqual([{ kind: 'clear-history' }]);
    expect(results[5]!.stdout).toBe('1  history\n');
  });
});
