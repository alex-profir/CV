// The Terminal's replies (contracts/commands.md Replies).
import { describe, expect, test } from 'vitest';
import { plainText } from '../../../src/apps/terminal/engine/block.ts';
import { contextFor, nodes, output, run, textOf } from './context.ts';

const context = () => contextFor('every-field');

describe('006-terminal-FR-016: a command the Terminal does not know', () => {
  test('the reply names the word as typed, says it is not a command and holds help as a control, then the suggestions as chips', () => {
    const block = output(run('wrok', context()));
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

  test('with no suggestion the reply ends at help', () => {
    const block = output(run('sudo rm -rf /', context()));
    expect(plainText(block)).toBe('sudo is not a command. Run help to see them all.');
    expect(nodes(block).filter((node) => node.kind === 'command').map((node) => node.kind === 'command' && node.line)).toEqual(['help']);
  });

  test('the word is shown exactly as typed, capitals and all', () => {
    expect(textOf('WrOk', context())).toMatch(/^WrOk is not a command\. .+\nwork$/);
    expect(textOf('<b>hi</b>', context())).toMatch(/^<b>hi<\/b> is not a command\./);
  });
});

describe('006-terminal-FR-017: a wrong argument gets the usage reply', () => {
  test('work 2020, cat, open alone, vim alone and help work extra', () => {
    expect(textOf('work 2020', context())).toBe('work takes no arguments. Usage: work');
    expect(textOf('cat', context())).toBe('cat takes one path. Usage: cat <path>');
    expect(textOf('open', context())).toBe('open takes one name, cv or about. Usage: open <name>');
    expect(textOf('vim', context())).toBe('vim takes one path, or - with piped input. Usage: vim [path | -]');
    expect(textOf('help work extra', context())).toBe('help takes at most one command. Usage: help [command]');
    expect(textOf('pwd here', context())).toBe('pwd takes no arguments. Usage: pwd');
  });

  test('the command is named as typed', () => {
    expect(textOf('WORK 2020', context())).toBe('WORK takes no arguments. Usage: work');
  });
});
