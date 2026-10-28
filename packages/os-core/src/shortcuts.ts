// The desktop's keyboard shortcuts (FR-025 to FR-029, data-model.md
// Shortcuts, research R9). One table: the menus, About this site and the
// key listener all read it.
import type { Shortcut } from './types.ts';

// In About this site's order.
export const SHORTCUTS: readonly Shortcut[] = Object.freeze([
  { id: 'menu-bar', letter: 'M', needs: 'none' },
  { id: 'dock', letter: 'D', needs: 'none' },
  { id: 'next-window', letter: 'N', needs: 'none' },
  { id: 'close', letter: 'W', needs: 'window' },
  { id: 'minimize', letter: 'H', needs: 'window' },
  { id: 'maximize', letter: 'F', needs: 'window' },
  { id: 'move', letter: 'P', needs: 'restored-window' },
  { id: 'resize', letter: 'S', needs: 'restored-window' },
] as const satisfies Shortcut[]);

export type KeyEventLike = { key: string; code: string; altKey: boolean; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean };

// The shortcut a key event means, or null. Alt and Shift with no Ctrl or
// Meta. The letter comes from `key` so it matches the label on any layout,
// except on a Mac, where Option changes `key` (Option+Shift+M gives `Â`)
// and the letter comes from `code`.
export function matchShortcut(event: KeyEventLike, mac: boolean): Shortcut | null {
  if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) return null;
  const letter = mac ? (/^Key([A-Z])$/.exec(event.code)?.[1] ?? null) : /^[a-z]$/i.test(event.key) ? event.key.toUpperCase() : null;
  return letter === null ? null : (SHORTCUTS.find((shortcut) => shortcut.letter === letter) ?? null);
}

// How a shortcut is written beside its command: `Alt+Shift+W`, or
// `Option+Shift+W` on a Mac.
export function shortcutLabel(shortcut: Shortcut, mac: boolean): string {
  return `${mac ? 'Option' : 'Alt'}+Shift+${shortcut.letter}`;
}
