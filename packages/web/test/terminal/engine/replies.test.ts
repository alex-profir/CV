// The Terminal's replies (contracts/commands.md Replies).
import { describe, expect, test } from 'vitest';
import { plainText } from '../../../src/apps/terminal/engine/block.ts';
import { contextFor, nodes, output, run, textOf } from './context.ts';

const context = () => contextFor('every-field');

describe('006-terminal-FR-016: a command the Terminal does not know', () => {
  test('the reply names the word as typed, says it is not a command and holds help as a control, then the suggestions as chips', async () => {
    const block = output(await run('wrok', context()));
    expect(plainText(block)).toBe('wrok is not a command. Run help to see them all, or try:\nwork');
    const commands = nodes(block).filter((node) => node.kind === 'command');
    expect(commands.map((node) => node.kind === 'command' && [node.line, node.style, node.req])).toEqual([
      ['help', 'inline', undefined],
      ['work', 'chip', 'suggestion'],
    ]);
    const typed = nodes(block).find((node) => node.kind === 'text' && node.text === 'wrok');
    expect(typed).toMatchObject({ tone: 'primary' });
    expect(nodes(block).some((node) => node.kind === 'text' && node.tone === 'error' && node.text.includes('is not a command'))).toBe(true);
  });

  test('with no suggestion the reply ends at help', async () => {
    const block = output(await run('sudo rm -rf /', context()));
    expect(plainText(block)).toBe('sudo is not a command. Run help to see them all.');
    expect(nodes(block).filter((node) => node.kind === 'command').map((node) => node.kind === 'command' && node.line)).toEqual(['help']);
  });

  test('the word is shown exactly as typed, capitals and all', async () => {
    expect(await textOf('WrOk', context())).toMatch(/^WrOk is not a command\. .+\nwork$/);
    expect(await textOf('<b>hi</b>', context())).toMatch(/^<b>hi<\/b> is not a command\./);
  });
});

describe('006-terminal-FR-017: a wrong argument gets the usage reply', () => {
  test('work 2020, cat, open alone, vim alone and help work extra', async () => {
    expect(await textOf('work 2020', context())).toBe('work takes no arguments. Usage: work');
    expect(await textOf('cat', context())).toBe('cat takes one path. Usage: cat <path>');
    expect(await textOf('open', context())).toBe('open takes one name, cv or about. Usage: open <name>');
    expect(await textOf('vim', context())).toBe('vim takes one path, or - with piped input. Usage: vim [path | -]');
    expect(await textOf('help work extra', context())).toBe('help takes at most one command. Usage: help [command]');
    expect(await textOf('pwd here', context())).toBe('pwd takes no arguments. Usage: pwd');
  });

  test('the command is named as typed', async () => {
    expect(await textOf('WORK 2020', context())).toBe('WORK takes no arguments. Usage: work');
  });
});

describe('006-terminal-FR-048: a path that is missing, or the wrong kind', () => {
  test('the replies name the path as typed, with cat or ls as controls', async () => {
    const cases: [string, string, string[]][] = [
      ['cat nothing-here', 'nothing-here: no such file or folder.', []],
      ['cat work/Nowhere', 'work/Nowhere: no such file or folder.', []],
      ['cd About', 'About is a file. Try cat About.', ['cat About']],
      ['cat work', 'work is a folder. Try ls work.', ['ls work']],
      ['vim work', 'work is a folder. Try ls work.', ['ls work']],
      ['ls nowhere', 'nowhere: no such file or folder.', []],
      ['cd nowhere', 'nowhere: no such file or folder.', []],
    ];
    for (const [line, reply, lines] of cases) {
      const block = output(await run(line, context()));
      expect(plainText(block), line).toBe(reply);
      const commands = nodes(block).filter((node) => node.kind === 'command');
      expect(commands.map((node) => node.kind === 'command' && node.line), line).toEqual(lines);
      for (const node of commands) expect(node).toMatchObject({ req: 'path' });
    }
  });

  test('ls on a file lists that file alone', async () => {
    expect(await textOf('ls about', context())).toBe('about');
    expect(nodes(output(await run('ls about', context()))).filter((node) => node.kind === 'command').map((node) => node.kind === 'command' && node.line)).toEqual(['cat ~/about']);
  });
});
