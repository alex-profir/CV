// `help` and the one command table (006 research R7, contracts/commands.md).
import { describe, expect, test } from 'vitest';
import { commandNamed, COMMANDS } from '../../../src/apps/terminal/engine/commands.ts';
import { fullText } from '../../../src/shell-text.ts';
import { contextFor, controls, nodes, output, run, textOf } from './context.ts';

const FR_008 = ['help', 'about', 'work', 'projects', 'education', 'skills', 'languages', 'interests', 'contact', 'cv', 'site', 'specs', 'ls', 'cd', 'cat', 'jq', 'vim', 'pwd', 'open', 'history', 'clear', 'exit'];

// Mulberry32, so every run checks the same words.
function generator(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

describe("006-terminal-FR-008: help lists every command and alias, and there is no command it doesn't list", () => {
  test('COMMANDS names exactly the 22 commands the requirement lists, in that order, with the three aliases', () => {
    expect(COMMANDS.map((command) => command.name)).toEqual(FR_008);
    const aliases = Object.fromEntries(COMMANDS.filter((command) => command.aliases.length > 0).map((command) => [command.name, command.aliases]));
    expect(aliases).toEqual({ help: ['?'], about: ['whoami'], work: ['experience'] });
  });

  test('every name and alias is lower case and unique', () => {
    const words = COMMANDS.flatMap((command) => [command.name, ...command.aliases]);
    for (const word of words) expect(word).toBe(word.toLowerCase());
    expect(new Set(words).size).toBe(words.length);
  });

  test("help's rows list every name and alias as a control, and nothing else", async () => {
    const block = output(await run('help', contextFor('every-field')));
    const rows = block.find((node) => node.kind === 'rows');
    expect(rows).toBeDefined();
    const listed = controls([rows!]);
    expect(listed).toEqual(COMMANDS.flatMap((command) => [command.name, ...command.aliases]));
    for (const node of nodes(block)) if (node.kind === 'command') expect(node.style).toBe('inline');
  });

  test("help's rows give each command its arguments and description from site text", async () => {
    const text = await textOf('help', contextFor('every-field'));
    expect(text.split('\n')[0]).toBe(fullText.terminal.helpLead.desktop);
    for (const name of FR_008) {
      const own = fullText.terminal.commands[name as keyof typeof fullText.terminal.commands];
      expect(text, name).toContain(own.description);
    }
    expect(text).toContain('cat cv.json | jq | vim -');
    expect((await textOf('help', contextFor('every-field', { shell: 'mobile' }))).split('\n')[0]).toBe(fullText.terminal.helpLead.phone);
  });

  test("006-terminal-FR-008: help's block leads with the Tab sentence for its shell, before the table", async () => {
    const lead = (await textOf('help', contextFor('every-field'))).split('\n');
    expect(lead[1]).toBe(fullText.terminal.helpTab.desktop);
    expect(lead[2]).toContain('help');
    const phone = (await textOf('help', contextFor('every-field', { shell: 'mobile' }))).split('\n');
    expect(phone[1]).toBe(fullText.terminal.helpTab.phone);
  });

  test('200 generated words not in the table name no site command', () => {
    const random = generator(20261028);
    const known = new Set(COMMANDS.flatMap((command) => [command.name, ...command.aliases]));
    const letters = 'abcdefghijklmnopqrstuvwxyz?-.';
    let checked = 0;
    while (checked < 200) {
      const length = 1 + Math.floor(random() * 9);
      const word = Array.from({ length }, () => letters[Math.floor(random() * letters.length)]).join('');
      if (known.has(word)) continue;
      expect(commandNamed(word), word).toBeNull();
      checked += 1;
    }
  });

  test("help work gives work's own help, and help with an alias the command's", async () => {
    const context = contextFor('every-field');
    const own = await textOf('help work', context);
    expect(own).toContain(fullText.terminal.commands.work.help);
    expect(own).toContain('work');
    expect(await textOf('help experience', context)).toBe(own);
    expect(await textOf('HELP Work', context)).toBe(own);
    expect(await textOf('? cv', context)).toContain(fullText.terminal.commands.cv.help);
    expect(await textOf('help nothing', context)).toBe('help: no command is named nothing. Run help to see them all.');
  });

  test("after the table, help lists the standard group: its heading and note, then each name as a control running help <name>", async () => {
    const block = output(await run('help', contextFor('every-field')));
    const at = block.findIndex((node) => node.kind === 'rows' && node.req === 'help');
    const [heading, group] = block.slice(at + 1);
    const { standard } = fullText.terminal;
    expect(heading).toMatchObject({ kind: 'line', req: 'standard' });
    expect(heading?.kind === 'line' && heading.children).toEqual([
      { kind: 'text', text: standard.heading, tone: 'primary' },
      { kind: 'text', text: '  ' },
      { kind: 'text', text: standard.note, tone: 'dim' },
    ]);
    expect(group).toMatchObject({ kind: 'columns', req: 'standard' });
    const names = group?.kind === 'columns' ? group.cells.map((cell) => (cell.kind === 'command' ? cell.label : undefined)) : [];
    expect(names.length).toBeGreaterThan(0);
    expect(names).toEqual([...names].sort());
    expect(controls([group!])).toEqual(names.map((name) => `help ${name}`));
    const words = new Set(COMMANDS.flatMap((command) => [command.name, ...command.aliases]));
    for (const name of names) expect(words.has(name!), name).toBe(false);
  });
});
