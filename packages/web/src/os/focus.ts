// Where each of os-core's focus targets is in the page (005 contracts/shell.md
// Focus). The shells mark the elements with data attributes, so focus moves
// never depend on markup order.
import type { FocusTarget } from '@cv/os-core';
import type { App } from '../apps/index.ts';

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

// Moves focus as the shell does, with the indicator after a key. An app's
// own target inside its content is focused where it is, as the app keeps
// its own scroll position (006 FR-021).
export function moveFocus(element: HTMLElement | null | undefined, preventScroll = false): void {
  const options = { ...(byKey ? { focusVisible: true } : {}), ...(preventScroll ? { preventScroll: true } : {}) };
  element?.focus(Object.keys(options).length === 0 ? undefined : options);
}

// Where a target's focus goes, first match first: an app that declares
// `focusOnOpen` gets the element it names inside its window's or view's
// content, before its title (006 contracts/shell.md, FR-004).
export function focusSelectors(target: FocusTarget, apps: readonly App[]): string[] {
  const title = selector(target);
  if (target.kind !== 'window-title' && target.kind !== 'mobile-title') return [title];
  const inside = apps.find((app) => app.id === target.view)?.focusOnOpen;
  if (inside === undefined) return [title];
  const content = target.kind === 'window-title' ? `#os .desktop .window[data-view="${target.view}"] .window-content` : `#os .full-screen[data-view="${target.view}"] .view-content`;
  return [`${content} ${inside}`, title];
}

export function focusTarget(target: FocusTarget, apps: readonly App[] = []): void {
  const candidates = focusSelectors(target, apps);
  for (const [index, candidate] of candidates.entries()) {
    const element = document.querySelector<HTMLElement>(candidate);
    if (element !== null) return moveFocus(element, index < candidates.length - 1);
  }
}
