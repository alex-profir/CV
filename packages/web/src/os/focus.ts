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

export function focusTarget(target: FocusTarget): void {
  const element = document.querySelector<HTMLElement>(selector(target));
  element?.focus();
}
