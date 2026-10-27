// The dock (005 contracts/shell.md Desktop shell, FR-011, FR-012, FR-064):
// one item per app that declares the desktop, in APPS order, each with its
// name below its icon at all times and its open mark, a filled dot when
// open and a hollow one when minimized. The state is in the item's name.
// It is one Tab stop with a roving tabindex: Left and Right move, Home and
// End go to the ends, Enter or Space activate.
import { useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { appsFor } from '@cv/os-core';
import type { ShellProps } from '../../os/shell-props.ts';
import { fill, siteText } from '../../site-text.ts';

export function Dock({ state, dispatch, apps }: ShellProps) {
  const items = appsFor(apps, 'desktop');
  const [active, setActive] = useState(0);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const list = [...event.currentTarget.querySelectorAll<HTMLElement>('.dock-item')];
    const at = list.indexOf(document.activeElement as HTMLElement);
    const go = (index: number) => {
      event.preventDefault();
      const next = (index + list.length) % list.length;
      setActive(next);
      list[next]?.focus();
    };
    if (event.key === 'ArrowRight') go(at + 1);
    else if (event.key === 'ArrowLeft') go(at - 1);
    else if (event.key === 'Home') go(0);
    else if (event.key === 'End') go(list.length - 1);
  };

  return (
    <div className="dock" role="toolbar" aria-label={siteText.desktop.dock} aria-orientation="horizontal" onKeyDown={onKeyDown} data-req="005-os-shell-FR-003 005-os-shell-FR-039">
      {items.map((app, index) => {
        const window = state.windows.find((candidate) => candidate.view === app.id);
        const status = window === undefined ? 'closed' : window.minimized ? 'minimized' : 'open';
        const label = status === 'closed' ? app.name : fill(siteText.desktop.dockItem, { app: app.name, state: siteText.desktop.dockStates[status] });
        const Icon = app.Icon;
        return (
          <button
            key={app.id}
            type="button"
            className={`dock-item is-${status}`}
            data-app={app.id}
            aria-label={label}
            tabIndex={index === Math.min(active, items.length - 1) ? 0 : -1}
            onFocus={() => setActive(index)}
            onClick={() => dispatch({ type: 'open', view: app.id as 'cv' })}
            data-req="005-os-shell-FR-011 005-os-shell-FR-012 005-os-shell-FR-064"
          >
            <span className="dock-icon">
              <Icon />
            </span>
            <span className="dock-name">{app.name}</span>
            <span className="open-mark" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
