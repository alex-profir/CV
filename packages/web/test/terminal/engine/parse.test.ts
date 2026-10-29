// The command line's parser (006 research R7, contracts/commands.md The
// command line).
import { describe, expect, test } from 'vitest';
import { parseLine } from '../../../src/apps/terminal/engine/parse.ts';
import { COMMANDS } from '../../../src/apps/terminal/engine/commands.ts';
import { contextFor, nodes, output, run, textOf } from './context.ts';

const parse = (line: string) => parseLine(line, COMMANDS);

const stages = (line: string) => {
  const parsed = parse(line);
  if (parsed.kind !== 'stages') throw new Error(`${line} parsed as ${parsed.kind}`);
  return parsed.stages.map((stage) => ({ name: stage.command?.name ?? null, word: stage.word, args: stage.args }));
};

describe('006-terminal-FR-007: commands match without regard to capitals, spaces or tabs', () => {
  test(' HELP , help\\t, HeLp and help   work parse to help', () => {
    for (const line of [' HELP ', 'help\t', 'HeLp', '\thelp  ']) expect(stages(line), line).toEqual([{ name: 'help', word: line.trim(), args: [] }]);
    expect(stages('help   work')).toEqual([{ name: 'help', word: 'help', args: ['work'] }]);
    expect(stages('work\t')).toEqual([{ name: 'work', word: 'work', args: [] }]);
    expect(stages('help \t work')[0]!.args).toEqual(['work']);
  });

  test('an empty or blank line is empty', () => {
    for (const line of ['', ' ', '\t', '   \t  ']) expect(parse(line), JSON.stringify(line)).toEqual({ kind: 'empty' });
  });

  test('aliases name their command, and arguments keep their case', () => {
    expect(stages('WHOAMI')[0]!.name).toBe('about');
    expect(stages('Experience')[0]!.name).toBe('work');
    expect(stages('?')[0]!.name).toBe('help');
    expect(stages('cat Work/Acme')[0]!.args).toEqual(['Work/Acme']);
  });
});

describe('006-terminal-FR-018: typed text stays text', () => {
  test('<b>hi</b> stays one word, and the reply holds it only as a text node', () => {
    expect(stages('<b>hi</b>')).toEqual([{ name: null, word: '<b>hi</b>', args: [] }]);
    const context = contextFor('every-field');
    for (const line of ['<b>hi</b>', '<img src=x onerror=alert(1)>', 'https://example.org', 'cat <i>x</i>', 'help <b>']) {
      for (const node of nodes(output(run(line, context)))) {
        const holds = JSON.stringify(node).includes('<');
        if (holds) expect(node.kind, `${line}: ${JSON.stringify(node)}`).toBe('text');
      }
    }
  });

  test('a typed URL never becomes a link', () => {
    const block = output(run('https://example.org/x', contextFor('every-field')));
    expect(nodes(block).filter((node) => node.kind === 'link')).toEqual([]);
  });

  test('line breaks in a line become spaces', () => {
    expect(stages('help\nwork')).toEqual([{ name: 'help', word: 'help', args: ['work'] }]);
    expect(stages('help\r\nwork')[0]!.args).toEqual(['work']);
  });
});

describe('006-terminal-FR-057: pipes', () => {
  test('cat cv.json | jq is two stages', () => {
    expect(stages('cat cv.json | jq')).toEqual([
      { name: 'cat', word: 'cat', args: ['cv.json'] },
      { name: 'jq', word: 'jq', args: [] },
    ]);
    expect(stages('cat cv.json|jq|vim -').map((stage) => stage.name)).toEqual(['cat', 'jq', 'vim']);
  });

  test('the input is passed on: cat cv.json | jq pretty-prints the file', () => {
    const context = contextFor('every-field');
    const result = run('cat cv.json | jq', context);
    expect(output(result).some((node) => node.kind === 'json')).toBe(true);
  });

  test("ls | work gets the reply that work doesn't read piped input", () => {
    expect(textOf('ls | work', contextFor('every-field'))).toBe("work doesn't read piped input. Pipe into jq or vim -.");
    expect(textOf('ls | HELP', contextFor('every-field'))).toBe("HELP doesn't read piped input. Pipe into jq or vim -.");
  });

  test("ls | vim cv.json gets the reply naming vim; vim - and cv still open the view with their pipe", () => {
    const context = contextFor('every-field');
    for (const line of ['ls | vim cv.json', 'ls | VIM cv.json', 'cat cv.json | vim nowhere']) {
      const result = run(line, context);
      expect(result.kind, line).toBe('output');
      expect(textOf(line, context), line).toBe(`${line.split('| ')[1]!.split(' ')[0]} doesn't read piped input. Pipe into jq or vim -.`);
    }
    for (const line of ['cat cv.json | vim -', 'cv']) {
      const result = run(line, context);
      expect(result.kind, line).toBe('open-vim');
      expect(result.kind === 'open-vim' && result.file.pipe, line).toBe(line === 'cv' ? 'cat cv.json | jq | vim -' : line);
    }
  });

  test('a | with nothing on a side is the pipe usage reply', () => {
    for (const line of ['ls |', '| jq', 'ls || jq', '|', ' | ']) {
      expect(parse(line), line).toEqual({ kind: 'pipe-usage' });
      expect(textOf(line, contextFor('every-field')), line).toMatch(/^Usage: .+ \| jq, or .+ \| vim -$/);
    }
  });

  test('$(ls), `ls` and ; are plain words, never run', () => {
    expect(stages('$(ls)')).toEqual([{ name: null, word: '$(ls)', args: [] }]);
    expect(stages('`ls`')).toEqual([{ name: null, word: '`ls`', args: [] }]);
    expect(stages('ls ; pwd')).toEqual([{ name: 'ls', word: 'ls', args: [';', 'pwd'] }]);
    expect(textOf('$(ls)', contextFor('every-field'))).toMatch(/^\$\(ls\) is not a command\./);
  });
});
