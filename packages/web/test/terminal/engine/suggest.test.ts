// Suggestions for a mistyped command (006 research R8, contracts/commands.md
// Suggestions).
import { describe, expect, test } from 'vitest';
import { COMMANDS } from '../../../src/apps/terminal/engine/commands.ts';
import { distance, suggest } from '../../../src/apps/terminal/engine/suggest.ts';

const of = (word: string) => suggest(word, COMMANDS);

describe('006-terminal-FR-016: suggestions for a mistyped command', () => {
  test('the optimal string alignment distance counts a swap of neighbours as one edit', () => {
    expect(distance('wrok', 'work')).toBe(1);
    expect(distance('hlep', 'help')).toBe(1);
    expect(distance('experiance', 'experience')).toBe(1);
    expect(distance('cta', 'cat')).toBe(1);
    expect(distance('', 'ls')).toBe(2);
    expect(distance('ca', 'abc')).toBe(3);
  });

  test('wrok, hlep, proj and experiance find the command meant, capitals free', () => {
    expect(of('wrok')).toEqual(['work']);
    expect(of('hlep')).toEqual(['help']);
    expect(of('proj')).toEqual(['projects']);
    expect(of('experiance')).toEqual(['experience']);
    expect(of('WROK')).toEqual(['work']);
    expect(of('Hlep')).toEqual(['help']);
  });

  test('sudo and xyzzy find nothing', () => {
    for (const word of ['sudo', 'xyzzy']) expect(of(word), word).toEqual([]);
  });

  test('words of 3 letters or fewer reach names 1 edit away only, by distance then help order', () => {
    expect(of('l')).toEqual(['?', 'ls']);
    expect(of('sl')).toEqual(['ls']);
    expect(of('cta')).toEqual(['cat']);
    expect(of('pdw')).toEqual(['pwd']);
  });

  test('a prefix of 2 letters or more reaches a command at its own distance, after nearer names', () => {
    expect(of('cl')).toEqual(['cv', 'cd', 'clear']);
    expect(of('spe')).toEqual(['specs']);
    expect(of('hist')).toEqual(['history']);
  });

  test('at most 3, and never a command with its own alias', () => {
    const letters = 'abcdehijklmnoprstuvwxyz?';
    const aliasOf = new Map(COMMANDS.flatMap((command) => command.aliases.map((alias) => [alias, command.name] as const)));
    for (const a of letters) {
      for (const b of letters) {
        for (const word of [`${a}${b}`, `${a}${b}${a}`, `${a}${b}${b}${a}`]) {
          const found = of(word);
          expect(found.length, word).toBeLessThanOrEqual(3);
          const names = found.map((name) => aliasOf.get(name) ?? name);
          expect(new Set(names).size, `${word}: ${found.join(', ')}`).toBe(names.length);
        }
      }
    }
  });

  test("an alias that matched is the one offered: the chip runs the name the visitor nearly typed", () => {
    expect(of('whoam')).toEqual(['whoami']);
    expect(of('experienc')).toEqual(['experience']);
    expect(of('abuot')).toEqual(['about']);
  });
});
