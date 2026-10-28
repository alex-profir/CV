// Where each of os-core's focus targets is in the page (005 contracts/shell.md
// Focus). The shells mark the elements with data attributes, so focus moves
// never depend on markup order.
import type { FocusTarget } from '@cv/os-core';

function selector(target: FocusTarget): string {
  switch (target.kind) {
    case 'window-title':
      return `#os .desktop .window[data-view="${target.view}"] .window-title`;
    case 'dock-item':
      return `#os .dock-item[data-app="${target.app}"]`;
    case 'site-menu':
      return '#os .menu-title[data-menu="site"]';
    case 'menu-title':
      return `#os .menu-title[data-menu="${target.menu}"]`;
    case 'pad':
      return `#os .desktop .window[data-view="${target.view}"] .pad button`;
    case 'mobile-title':
      return `#os .full-screen[data-view="${target.view}"] .app-title`;
    case 'home-icon':
      return `#os .home [data-view="${target.view}"]`;
  }
}

// Whether the visitor's last input was a key. A browser shows the focus
// indicator after a focus move made by a script only if a key came last,
// and Chrome doesn't count a key pressed with Alt, as every shortcut is, so
// the shell asks for the indicator itself after a key (FR-024).
let byKey = false;

export function watchInput(): () => void {
  const onKey = () => (byKey = true);
  const onPointer = () => (byKey = false);
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('pointerdown', onPointer, true);
  return () => {
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('pointerdown', onPointer, true);
  };
}

// Moves focus as the shell does, with the indicator after a key.
export function moveFocus(element: HTMLElement | null | undefined): void {
  element?.focus(byKey ? { focusVisible: true } : undefined);
}

export function focusTarget(target: FocusTarget): void {
  moveFocus(document.querySelector<HTMLElement>(selector(target)));
}
