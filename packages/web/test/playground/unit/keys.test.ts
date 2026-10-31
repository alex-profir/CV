// The table of keys (data-model.md Editor command and key, research R12).
import { describe, expect, test } from 'vitest';
import { SHORTCUTS, shortcutLabel } from '@cv/os-core';
import { KEY_COMMANDS, KEY_GROUPS, RESERVED_KEYS, keysFor, vsCodeKeysFor } from '../../../src/apps/playground/keys.ts';

// One spelling for a key, whatever order its modifiers were written in.
const normal = (key: string) =>
  key
    .split(' ')
    .map((chord) =>
      chord
        .split('+')
        .sort()
        .join('+'),
    )
    .join(' ');

describe('008-typescript-playground-FR-084: no key of the editor is a shell shortcut or a key others keep', () => {
  for (const mac of [false, true]) {
    const system = mac ? 'mac' : 'other';
    test(`none of the keys on ${system} is a shell shortcut or reserved`, () => {
      const taken = new Set([...SHORTCUTS.map((shortcut) => normal(shortcutLabel(shortcut, mac))), ...RESERVED_KEYS.filter((entry) => entry.system === system || entry.system === 'both').map((entry) => normal(entry.key))]);
      for (const command of KEY_COMMANDS) for (const key of [...keysFor(command, mac), ...keysFor(command, mac, true)]) expect(taken.has(normal(key)), `${command.id} ${key}`).toBe(false);
    });
  }

  test('the reserved table cites its source per entry', () => {
    for (const entry of RESERVED_KEYS) expect(entry.source, entry.key).not.toBe('');
  });
});

describe('008-typescript-playground-FR-085: a key that differs from VS Code says why', () => {
  test('every command belongs to one of the eight groups, kept together, and has a key on a Mac or elsewhere', () => {
    expect(KEY_GROUPS).toHaveLength(8);
    expect(KEY_COMMANDS.map((command) => command.group)).toEqual(KEY_GROUPS.flatMap((group) => KEY_COMMANDS.filter((command) => command.group === group).map(() => group)));
    expect(new Set(KEY_COMMANDS.map((command) => command.id)).size).toBe(KEY_COMMANDS.length);
    for (const command of KEY_COMMANDS) expect(keysFor(command, true).length + keysFor(command, false).length, command.id).toBeGreaterThan(0);
  });

  test('every command whose keys differ has a reason, and one with a reason names what is kept when a browser keeps it', () => {
    for (const command of KEY_COMMANDS) {
      const differs = [false, true].some((mac) => keysFor(command, mac).join() !== vsCodeKeysFor(command, mac).join());
      if (differs) expect(command.differs, command.id).toBeDefined();
      if (command.differs === 'browser' || command.differs === 'screen-reader') expect(command.kept, command.id).toBeDefined();
    }
  });
});
