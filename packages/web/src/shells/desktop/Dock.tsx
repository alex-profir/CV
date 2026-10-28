// The dock (005 contracts/shell.md Desktop shell, FR-011, FR-012, FR-064):
// one item per app that declares the desktop, in APPS order, each with its
// name below its icon at all times and its open mark, a filled dot when
// open and a hollow one when minimized. The state is in the item's name.
// It is one Tab stop with a roving tabindex: Left and Right move, Home and
// End go to the ends, Enter or Space activate. After it, the lens of its
// glass, with the SVG filter that bends what is behind it (FR-068,
// research R20).
import { useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { appsFor } from '@cv/os-core';
import { DOCK_LENS } from '../../os/metrics.ts';
import type { ShellProps } from '../../os/shell-props.ts';
import { fill, siteText } from '../../site-text.ts';

// The lens's displacement map: red pushes sideways and green up and down,
// toward the edges, and a blurred neutral middle leaves the inside unbent.
// It is data for the filter, not a color of the design.
const LENS_MAP =
  'data:image/svg+xml,' +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100' preserveAspectRatio='none'>" +
      "<defs><linearGradient id='r' x1='0' x2='1'><stop offset='0' stop-color='#f00'/><stop offset='1' stop-color='#000'/></linearGradient>" +
      "<linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#0f0'/><stop offset='1' stop-color='#000'/></linearGradient>" +
      "<filter id='b'><feGaussianBlur stdDeviation='5'/></filter></defs>" +
      "<rect width='100' height='100' fill='url(#r)'/><rect width='100' height='100' fill='url(#g)' style='mix-blend-mode:screen'/>" +
      "<rect x='16' y='16' width='68' height='68' rx='14' fill='#808080' filter='url(#b)'/></svg>",
  );

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
    <>
      <div className="dock" role="toolbar" aria-label={siteText.desktop.dock} aria-orientation="horizontal" onKeyDown={onKeyDown} data-req="005-os-shell-FR-003 005-os-shell-FR-039 005-os-shell-FR-068">
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
      <div className="dock-lens" aria-hidden="true" data-req="005-os-shell-FR-068">
        <svg className="dock-lens-filter" focusable="false">
          <filter id="dock-lens" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feImage href={LENS_MAP} preserveAspectRatio="none" result="map" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale={DOCK_LENS} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      </div>
    </>
  );
}
