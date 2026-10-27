// The desktop's keyboard shortcuts (data-model.md Shortcuts, research R9):
// the table, how a key event is matched, and how a shortcut is written.
import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import { matchShortcut, SHORTCUTS, shortcutLabel } from '../src/index.ts';
import type { KeyEventLike } from '../src/index.ts';

type Reserved = { keys: string; by: string; command: string; source: string };

const fixture = JSON.parse(fs.readFileSync(new URL('./__fixtures__/reserved-shortcuts.json', import.meta.url), 'utf8')) as { reserved: Reserved[] };

// Modifiers in one order and spelling, so `Option+Shift+W` and
// `Shift+Alt+W` compare equal to `Alt+Shift+W`.
const ORDER = ['Ctrl', 'Control', 'Cmd', 'Win', 'Insert', 'CapsLock', 'Alt', 'Shift'];
const normal = (keys: string) =>
  keys
    .replace(/\bOption\b/g, 'Alt')
    .split('+')
    .sort((a, b) => (ORDER.includes(a) ? ORDER.indexOf(a) : 99) - (ORDER.includes(b) ? ORDER.indexOf(b) : 99))
    .join('+');

const key = (overrides: Partial<KeyEventLike>): KeyEventLike => ({ key: 'w', code: 'KeyW', altKey: true, shiftKey: true, ctrlKey: false, metaKey: false, ...overrides });

describe('005-os-shell-FR-029: the eight shortcuts use Alt and Shift, clash with no browser or screen reader, and show as the platform writes them', () => {
  test('the reserved list names its source for every entry', () => {
    expect(fixture.reserved.length).toBeGreaterThan(0);
    const products = new Set(fixture.reserved.map((entry) => entry.by));
    for (const product of ['Chrome', 'Edge', 'Firefox', 'Safari', 'NVDA', 'JAWS', 'Narrator', 'VoiceOver']) expect(products, product).toContain(product);
    for (const entry of fixture.reserved) expect(entry.source, entry.keys).toMatch(/^https:\/\//);
  });

  test('the eight are in data-model.md order, each with Alt and Shift and no Ctrl or Meta, and none is reserved', () => {
    expect(SHORTCUTS.map((shortcut) => [shortcut.id, shortcut.letter, shortcut.needs])).toEqual([
      ['menu-bar', 'M', 'none'],
      ['dock', 'D', 'none'],
      ['next-window', 'N', 'none'],
      ['close', 'W', 'window'],
      ['minimize', 'H', 'window'],
      ['maximize', 'F', 'window'],
      ['move', 'P', 'restored-window'],
      ['resize', 'S', 'restored-window'],
    ]);
    const reserved = new Set(fixture.reserved.map((entry) => normal(entry.keys)));
    for (const shortcut of SHORTCUTS) {
      for (const mac of [false, true]) {
        const label = shortcutLabel(shortcut, mac);
        expect(label).toMatch(/^(Alt|Option)\+Shift\+[A-Z]$/);
        expect(label).not.toMatch(/Ctrl|Control|Cmd|Meta/);
        expect(reserved.has(normal(label)), label).toBe(false);
      }
    }
  });

  test('matchShortcut reads the letter from key off a Mac, from code on a Mac, and never with Ctrl or Meta', () => {
    expect(matchShortcut(key({ key: 'W' }), false)?.id).toBe('close');
    expect(matchShortcut(key({ key: 'w' }), false)?.id).toBe('close');
    // Option+Shift+M on a Mac gives `Â`, not a letter.
    expect(matchShortcut(key({ key: 'Â', code: 'KeyM' }), true)?.id).toBe('menu-bar');
    expect(matchShortcut(key({ key: 'Â', code: 'KeyM' }), false)).toBeNull();
    // A layout that puts another letter on the key: the label follows `key`.
    expect(matchShortcut(key({ key: 'z', code: 'KeyW' }), false)).toBeNull();
    expect(matchShortcut(key({ ctrlKey: true }), false)).toBeNull();
    expect(matchShortcut(key({ metaKey: true }), true)).toBeNull();
    expect(matchShortcut(key({ altKey: false }), false)).toBeNull();
    expect(matchShortcut(key({ shiftKey: false }), false)).toBeNull();
    expect(matchShortcut(key({ key: 'Q', code: 'KeyQ' }), false)).toBeNull();
    for (const shortcut of SHORTCUTS) {
      expect(matchShortcut(key({ key: shortcut.letter, code: `Key${shortcut.letter}` }), false)).toBe(shortcut);
      expect(matchShortcut(key({ key: '?', code: `Key${shortcut.letter}` }), true)).toBe(shortcut);
    }
  });

  test('shortcutLabel writes Alt+Shift off a Mac and Option+Shift on one', () => {
    const close = SHORTCUTS.find((shortcut) => shortcut.id === 'close')!;
    expect(shortcutLabel(close, false)).toBe('Alt+Shift+W');
    expect(shortcutLabel(close, true)).toBe('Option+Shift+W');
  });
});
