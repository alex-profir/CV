// The Terminal's replies (contracts/commands.md Replies).
import { describe, expect, test } from 'vitest';
import { plainText } from '../../../src/apps/terminal/engine/block.ts';
import { mapOutput } from '../../../src/apps/terminal/engine/output-map.ts';
import { fullText } from '../../../src/shell-text.ts';
import { contextFor, nodes, output, run, textOf } from './context.ts';

const context = () => contextFor('every-field');

describe('006-terminal-FR-016: a command the Terminal does not know', () => {
  test('the reply starts as bash does, the word as typed, and holds help as a control, then the suggestions as chips', async () => {
    const shown = await run('wrok', context());
    const block = output(shown);
    expect(plainText(block)).toBe('wrok: command not found. Run help to see them all, or try:\nwork');
    expect(shown.kind === 'output' && shown.result.status).toBe(127);
    const commands = nodes(block).filter((node) => node.kind === 'command');
    expect(commands.map((node) => node.kind === 'command' && [node.line, node.style, node.req])).toEqual([
      ['help', 'inline', undefined],
      ['work', 'chip', 'suggestion'],
    ]);
    const typed = nodes(block).find((node) => node.kind === 'text' && node.text === 'wrok');
    expect(typed).toMatchObject({ tone: 'primary' });
    expect(nodes(block).some((node) => node.kind === 'text' && node.tone === 'error' && node.text.includes('command not found'))).toBe(true);
  });

  test('with no suggestion the reply ends at help', async () => {
    const block = output(await run('sudo rm -rf /', context()));
    expect(plainText(block)).toBe('sudo: command not found. Run help to see them all.');
    expect(nodes(block).filter((node) => node.kind === 'command').map((node) => node.kind === 'command' && node.line)).toEqual(['help']);
  });

  test('the word is shown exactly as typed, capitals and all', async () => {
    expect(await textOf('WrOk', context())).toMatch(/^WrOk: command not found\. .+\nwork$/);
    expect(await textOf("'<b>hi'", context())).toMatch(/^<b>hi: command not found\./);
  });
});

describe('006-terminal-FR-017: a wrong argument gets the usage reply', () => {
  test('work 2020, open alone, vim alone, help work extra give it on stderr with status 2', async () => {
    const cases: [string, string][] = [
      ['work 2020', 'work takes no arguments. Usage: work'],
      ['open', 'open takes one name, cv or about. Usage: open <name>'],
      ['vim', 'vim takes one path, or - with piped input. Usage: vim [path | -]'],
      ['help work extra', 'help takes at most one command. Usage: help [command]'],
    ];
    for (const [line, reply] of cases) {
      const shown = await run(line, context());
      expect(plainText(output(shown)), line).toBe(reply);
      expect(shown.kind === 'output' && [shown.result.stderr, shown.result.status], line).toEqual([`${reply}\n`, 2]);
    }
    const nosuch = await run('help nosuch', context());
    expect(nosuch.kind === 'output' && [nosuch.result.stderr, nosuch.result.status]).toEqual(['help: no command is named nosuch. Run help to see them all.\n', 1]);
  });

  test('cat alone reads its input, as in bash, and help work shows work’s own help', async () => {
    expect(await textOf('cat', context())).toBe('');
    expect(await textOf('help work', context())).toContain(fullText.terminal.commands.work.help);
  });

  test('the command is named as typed', async () => {
    expect(await textOf('WORK 2020', context())).toBe('WORK takes no arguments. Usage: work');
  });
});

describe('006-terminal-FR-048: a path that is missing, or the wrong kind', () => {
  test('the command’s own message names the path as typed, then the site’s hint with cat or ls as controls', async () => {
    const cases: [string, string, string[]][] = [
      ['cat nothing-here', 'cat: nothing-here: No such file or directory', []],
      ['cat work/Nowhere', 'cat: work/Nowhere: No such file or directory', []],
      ['cd About', 'bash: cd: About: Not a directory\nAbout is a file. Try cat About.', ['cat About']],
      ['cat work', 'cat: work: Is a directory\nwork is a folder. Try ls work.', ['ls work']],
      ['vim work', 'work is a folder. Try ls work.', ['ls work']],
      ['ls nowhere', 'ls: nowhere: No such file or directory', []],
      ['cd nowhere', 'bash: cd: nowhere: No such file or directory', []],
    ];
    for (const [line, reply, lines] of cases) {
      const block = output(await run(line, context()));
      expect(plainText(block), line).toBe(reply);
      const commands = nodes(block).filter((node) => node.kind === 'command');
      expect(commands.map((node) => node.kind === 'command' && node.line), line).toEqual(lines);
      for (const node of commands) expect(node).toMatchObject({ req: 'path' });
    }
  });

  test('a reply’s control quotes the path it names (T316)', () => {
    const nodesOf = (stderr: string) => nodes(mapOutput({ stdout: '', stderr, recorded: [], end: 'done', state: { cwd: '/home/guest' } }, 'x', { text: fullText, columns: 80 }).block).flatMap((node) => (node.kind === 'command' ? [node.line] : []));
    expect(nodesOf('cat: my dir: Is a directory\n')).toEqual(['ls my\\ dir']);
    expect(nodesOf('bash: cd: a;b: Not a directory\n')).toEqual(['cat a\\;b']);
    expect(nodesOf('-x is a folder. Try ls -- -x.\n')).toEqual(['ls -- -x']);
  });

  test('ls on a file lists that file alone', async () => {
    expect(await textOf('ls about', context())).toBe('about');
    expect(nodes(output(await run('ls about', context()))).filter((node) => node.kind === 'command').map((node) => node.kind === 'command' && node.line)).toEqual(['cat ~/about']);
  });
});
