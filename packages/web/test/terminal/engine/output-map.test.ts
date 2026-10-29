// From the shell's output to the screen (006 research R30, data-model.md
// Shown run): recorded blocks where their text reached stdout whole, the
// rest as text, stderr after stdout, and the site's replies after some of
// the shell's lines.
import { describe, expect, test } from 'vitest';
import { formatPrompt, mapOutput } from '../../../src/apps/terminal/engine/output-map.ts';
import type { ShownResult } from '../../../src/apps/terminal/engine/output-map.ts';
import { fill, siteText } from '../../../src/site-text.ts';
import { runLine, shellFor } from '../shell/context.ts';
import { COLUMNS, controls, nodes } from './context.ts';
import { plainText } from '../../../src/apps/terminal/engine/block.ts';
import type { Block } from '../../../src/apps/terminal/engine/block.ts';

const CONTEXT = { text: siteText, columns: COLUMNS };

const result = (fields: Partial<ShownResult>): ShownResult => ({ stdout: '', stderr: '', recorded: [], end: 'done', state: { cwd: '/home/guest' }, ...fields });

const shown = (fields: Partial<ShownResult>, line = 'x') => mapOutput(result(fields), line, CONTEXT).block;

const texts = (block: Block) => nodes(block).filter((node) => node.kind === 'text');

describe('006-terminal-FR-016: command not found becomes the site’s reply', () => {
  test('wrok gets the reply with a work chip, and no bash: prefix', () => {
    const block = shown({ stderr: 'bash: wrok: command not found\n' });
    expect(plainText(block)).toBe(`wrok: command not found. ${fill(siteText.terminal.replies.unknownRun, { help: 'help' })}\nwork`);
    expect(controls(block)).toEqual(['help', 'work']);
    expect(plainText(block)).not.toContain('bash: ');
  });

  test('sudo is offered only help; suggestions are the site’s names and aliases only', () => {
    expect(controls(shown({ stderr: 'bash: sudo: command not found\n' }))).toEqual(['help']);
    expect(controls(shown({ stderr: 'bash: sl: command not found\n' }))).toContain('ls');
    expect(controls(shown({ stderr: 'bash: grpe: command not found\n' }))).toEqual(['help']);
  });
});

describe('006-terminal-FR-018: printed text stays text', () => {
  test('stdout that equals a site command’s text, printed by echo, stays text', async () => {
    const shell = shellFor('every-field');
    const about = (await runLine(shell, 'about')).stdout;
    const echoed = await runLine(shell, `printf '%s' '${about.replace(/'/g, `'\\''`)}'`);
    expect(echoed.stdout).toBe(about);
    const block = mapOutput(echoed, 'printf', CONTEXT).block;
    expect(nodes(block).every((node) => node.kind === 'line' || node.kind === 'text')).toBe(true);
    // Nor does a site command's text taken through $(…).
    const taken = await runLine(shell, 'x=$(about); printf "%s\\n" "$x"');
    expect(taken.stdout).toBe(about);
    expect(taken.recorded).toEqual([]);
  });

  test('<b>x</b>, a URL and an OSC 8 sequence printed by printf stay text nodes', async () => {
    const shell = shellFor('every-field');
    for (const line of ['printf "<b>x</b>\\n"', 'echo https://example.org/x', "printf '\\e]8;;https://example.org\\e\\\\link\\e]8;;\\e\\\\\\n'", 'echo "<img src=x onerror=alert(1)>"']) {
      const block = mapOutput(await runLine(shell, line), line, CONTEXT).block;
      expect(nodes(block).filter((node) => node.kind !== 'line' && node.kind !== 'text'), line).toEqual([]);
      expect(texts(block).length, line).toBeGreaterThan(0);
    }
  });
});

describe('006-terminal-FR-046: the prompt’s path', () => {
  test('~ for the home folder, ~/work below it, /home and /tmp outside it', () => {
    expect(formatPrompt('/home/guest')).toBe('~');
    expect(formatPrompt('/home/guest/work')).toBe('~/work');
    expect(formatPrompt('/home')).toBe('/home');
    expect(formatPrompt('/tmp')).toBe('/tmp');
    expect(formatPrompt('/home/guestbook')).toBe('/home/guestbook');
  });
});

describe('006-terminal-FR-048: a path of the wrong kind gets a control for the right command', () => {
  test('cd on a file, then cat about; cat on a folder, then ls work; the path as typed', async () => {
    const shell = shellFor('every-field');
    const cd = mapOutput(await runLine(shell, 'cd about'), 'cd about', CONTEXT).block;
    expect(plainText(cd).split('\n')).toEqual(['bash: cd: about: Not a directory', fill(siteText.terminal.replies.isFile, { path: 'about', command: 'cat about' })]);
    expect(controls(cd)).toEqual(['cat about']);
    const cat = mapOutput(await runLine(shell, 'cat WORK'), 'cat WORK', CONTEXT).block;
    expect(plainText(cat).split('\n')).toEqual(['cat: WORK: Is a directory', fill(siteText.terminal.replies.isFolder, { path: 'WORK', command: 'ls WORK' })]);
    expect(controls(cat)).toEqual(['ls WORK']);
    expect(controls(mapOutput(await runLine(shell, 'vim work'), 'vim work', CONTEXT).block)).toEqual(['ls work']);
  });
});

describe('006-terminal-FR-069: a stopped line', () => {
  test('each limit shows its stopped line after the stdout printed before it, and not the limit’s own message', () => {
    const messages = {
      time: 'bash: execution exceeded execution deadline (5000ms)\n',
      commands: 'bash: too many commands executed (>10000), increase executionLimits.maxCommandCount\n',
      output: 'bash: seq: output size limit exceeded (1048576 bytes)\n',
    } as const;
    for (const limit of ['time', 'commands', 'output'] as const) {
      const block = shown({ stdout: 'before\n', stderr: messages[limit], end: 'limit', limit });
      expect(plainText(block).split('\n'), limit).toEqual(['before', siteText.terminal.replies.stopped[limit]]);
      expect(block.at(-1), limit).toMatchObject({ kind: 'line', req: 'stopped' });
    }
  });
});

describe('006-terminal-FR-057 and 006-terminal-FR-067: syntax errors, streams and recordings', () => {
  test('a syntax error is shown without bash: and its line number', async () => {
    const shell = shellFor('every-field');
    expect(plainText(mapOutput(await runLine(shell, 'echo "a'), 'echo "a', CONTEXT).block)).toBe("unexpected EOF while looking for matching `\"'");
    expect(plainText(mapOutput(await runLine(shell, 'ls |'), 'ls |', CONTEXT).block)).toBe("syntax error near unexpected token `|'");
  });

  test('stdout first, then stderr in the error tone (research G3)', async () => {
    const shell = shellFor('every-field');
    const block = mapOutput(await runLine(shell, 'echo out; echo err >&2; echo out2'), 'echo', CONTEXT).block;
    expect(plainText(block).split('\n')).toEqual(['out', 'out2', 'err']);
    const err = texts(block).find((node) => node.kind === 'text' && node.text === 'err');
    expect(err).toMatchObject({ stream: 'stderr', tone: 'error' });
    expect(texts(block).find((node) => node.kind === 'text' && node.text === 'out')).toMatchObject({ stream: 'stdout' });
  });

  test('recorded texts found whole in stdout, in order, become their blocks; the rest stays text', async () => {
    const shell = shellFor('every-field');
    const run = await runLine(shell, 'echo first; about; work | grep -i highlight; skills');
    const block = mapOutput(run, 'echo', CONTEXT).block;
    const about = (await runLine(shell, 'about')).recorded[0]!.block;
    const skills = (await runLine(shell, 'skills')).recorded[0]!.block;
    expect(block[0]).toMatchObject({ kind: 'line', children: [{ kind: 'text', text: 'first', stream: 'stdout' }] });
    expect(block.slice(1, 1 + about.length)).toEqual(about);
    expect(block.slice(-skills.length)).toEqual(skills);
    expect(plainText(block)).toContain('- Fixture work highlight one.');
  });
});

describe('006-terminal-FR-028: what the status region says', () => {
  test('recorded blocks are counted as before; text in rows as {command}: {n} lines', async () => {
    const shell = shellFor();
    const work = await runLine(shell, 'work');
    expect(mapOutput(work, 'work', CONTEXT).announce).toMatchObject({ command: 'work', unit: 'entries' });
    const seq = await runLine(shell, 'seq 12');
    expect(mapOutput(seq, 'seq 12', CONTEXT).announce).toEqual({ command: 'seq', count: 12, unit: 'lines' });
    expect(mapOutput(await runLine(shell, 'echo hi'), 'echo hi', CONTEXT).announce).toEqual({ full: 'hi' });
  });

  test('a cd with no output says where it went', async () => {
    const shell = shellFor('every-field');
    const run = await runLine(shell, 'cd work');
    expect(mapOutput(run, 'cd work', { ...CONTEXT, cwd: '/home/guest' }).announce).toEqual({ full: fill(siteText.terminal.announce.cd, { path: '~/work' }) });
  });
});
