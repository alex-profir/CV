// A menu's items and keys (005 contracts/shell.md, research R9, FR-015):
// the WAI-ARIA menu pattern. Up and Down move, Home and End go to the ends,
// Enter or Space choose, Escape closes it back to its title, Tab closes it
// and moves on, and Left and Right go to the next menu. Commands with a
// shortcut show it and carry `aria-keyshortcuts` (FR-029). The menu's own
// element, with its `data-req`, is written by the menu bar.
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { shortcutLabel } from '@cv/os-core';
import type { Shortcut } from '@cv/os-core';
import { Arrow } from '../../cv/Arrow.tsx';
import { CheckGlyph } from '../../os/icons/CheckGlyph.tsx';

export type MenuEntry =
  | { kind: 'action'; key: string; label: string; onChoose: () => void; shortcut?: Shortcut; disabled?: boolean; checked?: boolean; note?: string }
  | { kind: 'link'; key: string; label: string; href: string; external?: boolean }
  | { kind: 'separator'; key: string };

const items = (menu: HTMLElement) => [...menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')];

// The pointer moves focus onto the item it's over, so one item is marked at
// a time and the keys go on from there, as in a desktop menu.
function focusUnderPointer(event: ReactPointerEvent<HTMLElement>): void {
  if (document.activeElement !== event.currentTarget) event.currentTarget.focus({ preventScroll: true });
}

export function focusFirstItem(menu: HTMLElement | null): void {
  menu?.querySelector<HTMLElement>('[role^="menuitem"]')?.focus();
}

// The keys inside an open menu.
export function menuKeyDown(event: ReactKeyboardEvent<HTMLElement>, { close, sideways }: { close: (toTitle: boolean) => void; sideways: (by: -1 | 1) => void }): void {
  const menu = event.currentTarget;
  const list = items(menu);
  const at = list.indexOf(document.activeElement as HTMLElement);
  const go = (index: number) => {
    event.preventDefault();
    list[(index + list.length) % list.length]?.focus();
  };
  switch (event.key) {
    case 'ArrowDown':
      return go(at + 1);
    case 'ArrowUp':
      return go(at < 0 ? list.length - 1 : at - 1);
    case 'Home':
      return go(0);
    case 'End':
      return go(list.length - 1);
    case 'Escape':
      event.preventDefault();
      return close(true);
    case 'Tab':
      return close(false);
    case 'ArrowLeft':
    case 'ArrowRight':
      event.preventDefault();
      return sideways(event.key === 'ArrowLeft' ? -1 : 1);
    case ' ':
      // Space chooses a link as Enter does; buttons handle it themselves.
      if (document.activeElement instanceof HTMLAnchorElement) {
        event.preventDefault();
        document.activeElement.click();
      }
      return;
    default:
      return;
  }
}

function Keys({ shortcut, mac }: { shortcut: Shortcut | undefined; mac: boolean }): ReactNode {
  return shortcut === undefined ? <span className="keys" /> : <span className="keys">{shortcutLabel(shortcut, mac)}</span>;
}

export function MenuItems({ entries, mac, onChosen }: { entries: readonly MenuEntry[]; mac: boolean; onChosen: () => void }) {
  return entries.map((entry) => {
    if (entry.kind === 'separator') return <div key={entry.key} className="menu-separator" role="separator" />;
    if (entry.kind === 'link') {
      return (
        <a key={entry.key} className="menu-item" role="menuitem" tabIndex={-1} href={entry.href} onClick={onChosen} onPointerMove={focusUnderPointer}>
          <span className="mark" />
          <span className="label">{entry.label}</span>
          {entry.external === true ? <Arrow kind="up-right" /> : <span className="keys" />}
        </a>
      );
    }
    const radio = entry.checked !== undefined;
    return (
      <button
        key={entry.key}
        type="button"
        className="menu-item"
        role={radio ? 'menuitemradio' : 'menuitem'}
        aria-checked={radio ? entry.checked : undefined}
        aria-disabled={entry.disabled === true ? 'true' : undefined}
        aria-keyshortcuts={entry.shortcut === undefined ? undefined : shortcutLabel(entry.shortcut, false)}
        tabIndex={-1}
        onPointerMove={focusUnderPointer}
        onClick={() => {
          if (entry.disabled === true) return;
          onChosen();
          entry.onChoose();
        }}
      >
        <span className="mark">{entry.checked === true && <CheckGlyph />}</span>
        <span className="label">
          {entry.label}
          {entry.note !== undefined && <span className="note"> {entry.note}</span>}
        </span>
        <Keys shortcut={entry.shortcut} mac={mac} />
      </button>
    );
  });
}
