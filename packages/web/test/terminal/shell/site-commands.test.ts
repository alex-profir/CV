// The site's commands in the shell (006 research R29): each prints the text
// of its block and records the block with that text; the wrappers of `cat`,
// `ls` and `jq` record what the site adds; `vim`, `cv`, `open` and `clear`
// return their effects.
import { pathLine } from '../../../src/apps/terminal/engine/block.ts';
import { describe, expect, test } from 'vitest';
import { blockText } from '../../../src/apps/terminal/engine/block.ts';
import { COMMANDS } from '../../../src/apps/terminal/engine/commands.ts';
import { siteText } from '../../../src/site-text.ts';
import { fixture } from '../../helpers/fixtures.ts';
import { nodes } from '../engine/context.ts';
import { runLine, runLines, shellFor, treeFor } from './context.ts';

const PRINTING = COMMANDS.filter((row) => row.run !== undefined && !['open', 'clear', 'history'].includes(row.name));

// The lines a block's controls run.
const commandLines = (block: unknown): string[] => {
  const found: string[] = [];
  const seek = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(seek);
    if (node === null || typeof node !== 'object') return;
    const typed = node as { kind?: string; line?: string };
    if (typed.kind === 'command' && typed.line !== undefined) found.push(typed.line);
    Object.values(typed).forEach(seek);
  };
  seek(block);
  return found;
};

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

  test('a control quotes its path, so a name is only ever a name (T316)', async () => {
    const shell = shellFor('every-field');
    await runLine(shell, `mkdir "my dir"; touch 'q;touch pwned' '$(touch sub)' -- -x`);
    const lines = commandLines((await runLine(shell, 'ls')).recorded[0]!.block);
    for (const line of ['ls ~/my\\ dir', 'cat ~/q\\;touch\\ pwned', 'cat ~/\\$\\(touch\\ sub\\)', 'cat ~/-x', 'cat ~/about']) expect(lines).toContain(line);
    await runLine(shell, 'cat ~/q\\;touch\\ pwned; cat ~/\\$\\(touch\\ sub\\)');
    expect((await runLine(shell, 'ls ~/pwned ~/sub')).stdout).toBe('');
    expect(pathLine('ls', '-x')).toBe('ls -- -x');
    expect(pathLine('ls', 'a\nb')).toBe("ls $'a\\nb'");
    expect(pathLine('cat', '~')).toBe('cat ~');
  });

  test('ls draws its names as controls with its other options, each line GNU’s text (T327)', async () => {
    const shell = shellFor('every-field');
    await runLine(shell, 'mkdir a; touch a/f .h');
    for (const [line, expected] of [
      ['ls -a', ['ls ~/a', 'cat ~/about', 'cat ~/.h']],
      ['ls -F', ['ls ~/a', 'cat ~/about']],
      ['ls -1', ['ls ~/a', 'cat ~/about']],
      ['ls -R a', ['cat ~/a/f']],
      ['ls -d ~/about', ['cat ~/about']],
      ['ls a about', ['cat ~/about', 'cat ~/a/f']],
      ['ls -lR a', ['cat ~/a/f']],
      ['ls -l a about', ['cat ~/about', 'cat ~/a/f']],
    ] as const) {
      const run = await runLine(shell, line);
      expect(run.recorded, line).toHaveLength(1);
      expect(run.recorded[0]!.text, line).toBe(run.stdout);
      expect(commandLines(run.recorded[0]!.block), line).toEqual(expect.arrayContaining([...expected]));
    }
    expect(commandLines((await runLine(shell, 'ls -a')).recorded[0]!.block)).not.toContain('ls ~/.');
  });

  test('ls takes --color, -p, -C and -m, and lists them in its help; -l’s columns are as wide as the widest (T329)', async () => {
    const shell = shellFor('every-field');
    expect((await runLine(shell, 'ls --color=auto')).stdout).toBe((await runLine(shell, 'ls')).stdout);
    expect((await runLine(shell, 'ls -p work | wc -l')).status).toBe(0);
    expect((await runLine(shell, 'ls -p')).stdout).toContain('work/\n');
    expect((await runLine(shell, 'ls -m')).stdout).toMatch(/^about, contact, /);
    expect((await runLine(shell, 'ls -C')).stdout).toMatch(/^about\t cv\.json/);
    for (const option of ['--color', '-p', '-C', '-m']) expect((await runLine(shell, 'ls --help')).stdout).toContain(option);
    expect((await runLine(shell, "ls -l about | cut -d' ' -f5")).stdout).toMatch(/^\d+\n$/);
    expect((await runLine(shell, 'ls -ld work')).stdout).toMatch(/^dr-xr-xr-x \d+ root root 4096 /);
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
    expect((await runLine(shell, 'vim cv.json')).effects).toEqual([{ kind: 'vim', file: { name: 'cv.json', path: '/home/guest/cv.json', readonly: true, new: false }, pipe: null, text: cvJson, type: 'json' }]);
    expect((await runLine(shell, 'cat cv.json | vim -')).effects).toEqual([{ kind: 'vim', file: { name: '[No Name]', path: null, readonly: false, new: false }, pipe: 'cat cv.json | vim -', text: cvJson, type: 'json' }]);
  });

  test('006-terminal-FR-081: a protected file opens read only, under the name typed', async () => {
    const shell = shellFor('every-field');
    for (const [line, name, path] of [['vim about', 'about', '/home/guest/about'], ['vim ~/about', '~/about', '/home/guest/about']] as const) {
      const [effect] = (await runLine(shell, line)).effects;
      expect(effect, line).toMatchObject({ kind: 'vim', file: { name, path, readonly: true, new: false } });
    }
    const listed = (await runLine(shell, 'ls ~/work')).stdout.split('\n')[0]!;
    const [work] = (await runLine(shell, `vim ~/work/${listed}`)).effects;
    expect(work).toMatchObject({ file: { name: `~/work/${listed}`, readonly: true, new: false } });
  });

  test('a visitor’s file is not read only; a missing path opens empty and new, also in a protected or missing folder', async () => {
    const shell = shellFor('every-field');
    await runLine(shell, 'echo hi > mine');
    expect((await runLine(shell, 'vim mine')).effects).toEqual([{ kind: 'vim', file: { name: 'mine', path: '/home/guest/mine', readonly: false, new: false }, pipe: null, text: 'hi', type: 'text' }]);
    for (const [line, name, path] of [['vim notes.txt', 'notes.txt', '/home/guest/notes.txt'], ['vim work/new', 'work/new', '/home/guest/work/new'], ['vim nowhere/x', 'nowhere/x', '/home/guest/nowhere/x']] as const) {
      const result = await runLine(shell, line);
      expect(result.stderr, line).toBe('');
      expect(result.effects, line).toEqual([{ kind: 'vim', file: { name, path, readonly: false, new: true }, pipe: null, text: '', type: 'text' }]);
    }
  });

  test('vim work, vim - with nothing piped and vim alone reply on stderr, with no effect', async () => {
    const shell = shellFor('every-field');
    const { replies } = siteText.terminal;
    const expected: Record<string, string> = {
      'vim work': replies.isFolder.replace('{path}', 'work').replace('{command}', 'ls work'),
    };
    for (const line of ['vim work', 'vim -', 'vim']) {
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
    expect(cv!.effects[0]).toMatchObject({ file: { name: '[No Name]', path: null, readonly: false, new: false }, pipe: 'cat cv.json | jq | vim -' });
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
    expect((await runLine(shell, 'EXPERIENCE 1')).stderr.startsWith('EXPERIENCE takes')).toBe(true);
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

describe('006-terminal-FR-057: cv and clear where their output doesn’t reach the screen (T303)', () => {
  test.each(['cv | head -1', 'cv | wc -l', 'x=$(cv); echo "$x" | head -1', 'cv > out; head -1 out', 'cv >> out2; head -1 out2', '{ cv; } | head -1'])('%s prints the JSON and opens no view', async (line) => {
    const result = await runLine(shellFor('every-field'), line);
    expect(result.status).toBe(0);
    expect(result.stdout).not.toBe('');
    expect(result.effects).toEqual([]);
  });

  test('the JSON is cv.json, pretty-printed; cv alone is the view', async () => {
    const shell = shellFor('every-field');
    expect((await runLine(shell, 'cv | wc -l')).stdout).toBe((await runLine(shell, 'jq . cv.json | wc -l')).stdout);
    expect((await runLine(shell, 'cv')).effects).toMatchObject([{ kind: 'vim' }]);
  });

  test.each(['clear | wc -l', 'clear > f', 'x=$(clear)'])('%s leaves the screen as it was', async (line) => {
    expect((await runLine(shellFor('every-field'), line)).effects).toEqual([]);
  });

  test('clear in a line keeps only what comes after it', async () => {
    const shell = shellFor('every-field');
    expect(await runLine(shell, 'echo one; clear; echo two')).toMatchObject({ stdout: 'two\n', effects: [{ kind: 'clear' }] });
    expect(await runLine(shell, 'echo one; clear')).toMatchObject({ stdout: '', effects: [{ kind: 'clear' }] });
    const listed = await runLine(shell, 'work; clear; ls');
    expect(listed.recorded).toHaveLength(1);
    expect(listed.stdout).toBe(listed.recorded[0]!.text);
  });

  // T330.
  test.each(['rm -f about', 'rm -fv about', 'rm --force about', 'rm -f ~/about'])('%s refuses a protected file, and the file stays', async (line) => {
    const shell = shellFor('every-field');
    const result = await runLine(shell, line);
    expect(result.stderr).toMatch(/^rm: cannot remove '.*about': Permission denied\n$/);
    expect(result.status).toBe(1);
    expect((await runLine(shell, 'cat about')).status).toBe(0);
  });

  test.each(['rm -f nope', 'rm -f work/nope', 'rm -f about/x', 'rm -f'])('%s is silent with status 0', async (line) => {
    const result = await runLine(shellFor('every-field'), line);
    expect(result).toMatchObject({ stdout: '', stderr: '', status: 0 });
  });

  test('rm -f removes what it can and says why it left the rest', async () => {
    const shell = shellFor('every-field');
    await runLine(shell, 'touch mine');
    const result = await runLine(shell, 'rm -f mine about nope');
    expect(result.stderr).toBe("rm: cannot remove 'about': Permission denied\n");
    expect(result.status).toBe(1);
    expect((await runLine(shell, 'cat mine')).status).not.toBe(0);
  });

  // T340, from tree 2.3.2.
  test('tree -f names a path as given, and -L takes a positive number', async () => {
    const shell = shellFor('every-field');
    expect((await runLine(shell, 'tree -f')).stdout).toContain('-- ./about\n');
    expect((await runLine(shell, 'tree -f work')).stdout).toMatch(/-- work\/[^/\n]+\n/);
    expect((await runLine(shell, 'tree -f')).stdout).not.toContain('/home/guest');
    for (const line of ['tree -L x', 'tree -L 0']) expect(await runLine(shell, line)).toMatchObject({ stdout: '', stderr: 'tree: Invalid level, must be greater than 0.\n', status: 1 });
    expect(await runLine(shell, 'tree -L')).toMatchObject({ stderr: 'tree: Missing argument to -L option.\n', status: 1 });
  });
});
