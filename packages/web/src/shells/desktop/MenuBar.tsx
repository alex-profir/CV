// The menu bar (005 contracts/shell.md Desktop shell, research R9, FR-013
// to FR-015): the site menu, the focused window's menu or the site name, and
// the Window menu. It is one Tab stop with a roving tabindex: Left and
// Right move between titles, Home and End go to the ends, and Enter, Space
// or Down open a menu. One menu is open at a time; it closes when an item is
// chosen, on Escape, on a pointer down outside and when focus leaves.
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { SHORTCUTS } from '@cv/os-core';
import type { Shortcut, ViewId } from '@cv/os-core';
import { showSpecs } from '../../inspector/ShowSpecs.tsx';
import { moveFocus } from '../../os/focus.ts';
import { SiteMark } from '../../os/icons/SiteMark.tsx';
import { animateIn } from '../../os/motion.ts';
import type { ShellProps } from '../../os/shell-props.ts';
import { siteName } from '../../format/meta.ts';
import { fill, siteText } from '../../site-text.ts';
import { focusFirstItem, menuKeyDown, MenuItems } from './Menu.tsx';
import type { MenuEntry } from './Menu.tsx';

type MenuId = 'site' | 'app' | 'window';

const TITLES: readonly MenuId[] = ['site', 'app', 'window'];

const shortcut = (id: string): Shortcut => SHORTCUTS.find((candidate) => candidate.id === id)!;

// Focus on the first menu title, or the first dock item, as the Window
// menu's commands and their shortcuts do (FR-025).
export function focusMenuBar(): void {
  moveFocus(document.querySelector<HTMLElement>('#os .menu-bar [data-title-index="0"]'));
}

export function focusDock(): void {
  moveFocus(document.querySelector<HTMLElement>('#os .dock .dock-item'));
}

export function MenuBar({ state, dispatch, apps, resume, siteData, mac, viewName }: ShellProps) {
  const [open, setOpen] = useState<MenuId | null>(null);
  const [active, setActive] = useState(0);
  const bar = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const focused = state.focused;
  const focusedWindow = focused === null ? undefined : state.windows.find((window) => window.view === focused);

  // A menu that opens animates in and takes focus on its first item; one
  // that closes while focus was in it gives focus back to its title.
  const opened = useRef<MenuId | null>(null);
  useEffect(() => {
    if (open !== null && opened.current !== open) {
      animateIn(menu.current);
      focusFirstItem(menu.current);
    }
    const was = opened.current;
    const lost = document.activeElement === null || document.activeElement === document.body;
    if (open === null && was !== null && lost) bar.current?.querySelector<HTMLElement>(`[data-title-index="${TITLES.indexOf(was)}"]`)?.focus();
    opened.current = open;
  }, [open]);

  // A pointer down anywhere outside the menu bar closes the open menu.
  useEffect(() => {
    if (open === null) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (bar.current !== null && !bar.current.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  // The app menu goes with its window: closed when the window loses focus.
  useEffect(() => {
    if (open === 'app' && focused === null) setOpen(null);
  }, [open, focused]);

  const titleAt = (index: number) => bar.current?.querySelector<HTMLElement>(`[data-title-index="${index}"]`) ?? null;
  const moveTo = (index: number) => {
    const next = (index + TITLES.length) % TITLES.length;
    setActive(next);
    titleAt(next)?.focus();
    return next;
  };
  const close = (toTitle: boolean) => {
    const index = open === null ? active : TITLES.indexOf(open);
    setOpen(null);
    if (toTitle) titleAt(index)?.focus();
  };
  const openable = (id: MenuId) => id !== 'app' || focused !== null;
  const toggle = (id: MenuId) => setOpen((current) => (current === id ? null : id));

  const onTitleKeyDown = (index: number, id: MenuId) => (event: ReactKeyboardEvent<HTMLElement>) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowLeft': {
        event.preventDefault();
        const next = moveTo(index + (event.key === 'ArrowRight' ? 1 : -1));
        if (open !== null) setOpen(openable(TITLES[next]!) ? TITLES[next]! : null);
        return;
      }
      case 'Home':
      case 'End':
        event.preventDefault();
        moveTo(event.key === 'Home' ? 0 : TITLES.length - 1);
        return;
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        if (!openable(id)) return;
        event.preventDefault();
        opened.current = null;
        setOpen(id);
        return;
      default:
        return;
    }
  };

  const sideways = (by: -1 | 1) => {
    const from = open === null ? active : TITLES.indexOf(open);
    let next = from;
    for (let step = 0; step < TITLES.length; step += 1) {
      next = (next + by + TITLES.length) % TITLES.length;
      if (openable(TITLES[next]!)) break;
    }
    setActive(next);
    setOpen(TITLES[next]!);
  };

  const keysInMenu = (event: ReactKeyboardEvent<HTMLElement>) => menuKeyDown(event, { close, sideways });
  const chosen = () => setOpen(null);

  const repository = siteData.repository;
  const siteEntries: MenuEntry[] = [
    { kind: 'action', key: 'about', label: siteText.desktop.siteMenuItems.about, onChoose: () => dispatch({ type: 'open', view: 'about' }) },
    { kind: 'link', key: 'cv', label: siteText.desktop.siteMenuItems.cvPage, href: '/cv' },
    ...(repository === undefined || repository === '' ? [] : [{ kind: 'link' as const, key: 'source', label: siteText.desktop.siteMenuItems.source, href: repository, external: true }]),
  ];

  const own = siteText.desktop.ownMenu;
  const maximized = focusedWindow?.maximized != null;
  // The focused app's own items come first, then a separator (006 contracts/shell.md).
  const appItems = focused === null ? [] : (apps.find((app) => app.id === focused)?.menuItems ?? []);
  const itemEntries: MenuEntry[] = appItems.flatMap((item): MenuEntry[] => [
    ...(item.separatorBefore === true ? [{ kind: 'separator' as const, key: `before-${item.key}` }] : []),
    { kind: 'action', key: `app-${item.key}`, label: item.label, onChoose: item.run, keys: typeof item.shortcut === 'function' ? item.shortcut() : item.shortcut, disabled: item.disabled?.() === true, 'data-req': item['data-req'] },
    ...(item.separatorAfter === true ? [{ kind: 'separator' as const, key: `after-${item.key}` }] : []),
  ]);
  // "Show specs", or "Back to [view]" while it shows them, after the app's
  // own commands and in their group (007 research R4).
  const specsEntry = (view: ViewId): MenuEntry =>
    state.specs[view] === undefined
      ? {
          kind: 'action',
          key: 'specs',
          label: siteText.inspector.show,
          onChoose: () => showSpecs(dispatch, view, document.querySelector(`#os .desktop .window[data-view="${view}"] .window-content`)),
          'data-req': '007-requirement-inspector-FR-001 007-requirement-inspector-FR-003',
        }
      : {
          kind: 'action',
          key: 'specs',
          label: fill(siteText.inspector.back, { view: viewName(view) }),
          onChoose: () => dispatch({ type: 'showApp', view }),
          'data-req': '007-requirement-inspector-FR-001 007-requirement-inspector-FR-003',
        };
  const appEntries: MenuEntry[] =
    focused === null
      ? []
      : [
          ...itemEntries,
          ...(focused === 'cv' ? [{ kind: 'link' as const, key: 'cv', label: own.cvPage, href: '/cv' }] : []),
          specsEntry(focused),
          { kind: 'separator', key: 'after-app' },
          { kind: 'action', key: 'move', label: own.move, shortcut: shortcut('move'), disabled: maximized, onChoose: () => dispatch({ type: 'sessionStart', kind: 'move' }) },
          { kind: 'action', key: 'resize', label: own.resize, shortcut: shortcut('resize'), disabled: maximized, onChoose: () => dispatch({ type: 'sessionStart', kind: 'resize' }) },
          { kind: 'separator', key: 'after-resize' },
          { kind: 'action', key: 'minimize', label: own.minimize, shortcut: shortcut('minimize'), onChoose: () => dispatch({ type: 'minimize', view: focused }) },
          { kind: 'action', key: 'maximize', label: maximized ? own.restore : own.maximize, shortcut: shortcut('maximize'), onChoose: () => dispatch({ type: 'toggleMaximize', view: focused }) },
          { kind: 'separator', key: 'after-maximize' },
          { kind: 'action', key: 'close', label: own.close, shortcut: shortcut('close'), onChoose: () => dispatch({ type: 'close', view: focused }) },
        ];

  const windowEntries: MenuEntry[] = [
    { kind: 'action', key: 'menu-bar', label: siteText.desktop.goToMenuBar, shortcut: shortcut('menu-bar'), onChoose: () => requestAnimationFrame(focusMenuBar) },
    { kind: 'action', key: 'dock', label: siteText.desktop.goToDock, shortcut: shortcut('dock'), onChoose: () => requestAnimationFrame(focusDock) },
    { kind: 'action', key: 'next', label: siteText.desktop.nextWindow, shortcut: shortcut('next-window'), onChoose: () => dispatch({ type: 'next' }) },
    ...(state.windows.length === 0 ? [] : [{ kind: 'separator' as const, key: 'windows' }]),
    ...state.windows.map(
      (window): MenuEntry => ({
        kind: 'action',
        key: `window-${window.view}`,
        label: viewName(window.view),
        checked: state.focused === window.view,
        ...(window.minimized ? { note: siteText.desktop.minimizedNote } : {}),
        onChoose: () => dispatch({ type: 'open', view: window.view }),
      }),
    ),
  ];

  const titleProps = (index: number, id: MenuId) => ({
    'data-title-index': index,
    'data-menu': id,
    tabIndex: active === index ? 0 : -1,
    onFocus: () => setActive(index),
    onKeyDown: onTitleKeyDown(index, id),
  });
  const buttonProps = (index: number, id: MenuId) => ({
    ...titleProps(index, id),
    type: 'button' as const,
    role: 'menuitem',
    'aria-haspopup': 'menu' as const,
    'aria-expanded': open === id,
    'aria-controls': open === id ? `menu-${id}` : undefined,
    id: `menu-title-${id}`,
    onClick: () => toggle(id),
  });

  return (
    <div
      ref={bar}
      className="menu-bar"
      role="menubar"
      aria-label={siteText.desktop.menuBar}
      onBlur={(event) => {
        // Focus going nowhere, as a tap on an item does in Safari, leaves the
        // menu open; a pointer down outside closes it instead.
        const to = event.relatedTarget as Node | null;
        if (open !== null && to !== null && bar.current !== null && !bar.current.contains(to)) setOpen(null);
      }}
      data-req="005-os-shell-FR-013 005-os-shell-FR-039 005-os-shell-FR-066"
    >
      <div className="menu-slot" role="none">
        <button className={open === 'site' ? 'menu-title is-open' : 'menu-title'} aria-label={siteText.desktop.siteMenu} {...buttonProps(0, 'site')}>
          <SiteMark />
        </button>
        {open === 'site' && (
          <div ref={menu} className="menu" role="menu" id="menu-site" aria-labelledby="menu-title-site" onKeyDown={keysInMenu} data-req="005-os-shell-FR-013 005-os-shell-FR-015">
            <MenuItems entries={siteEntries} mac={mac} onChosen={chosen} />
          </div>
        )}
      </div>
      <div className="menu-slot" role="none">
        {focused === null ? (
          <span className="menu-title is-app" role="menuitem" aria-disabled="true" {...titleProps(1, 'app')} data-req="005-os-shell-FR-013 005-os-shell-FR-066">
            {siteName(resume)}
          </span>
        ) : (
          <button className={open === 'app' ? 'menu-title is-app is-open' : 'menu-title is-app'} {...buttonProps(1, 'app')}>
            {viewName(focused)}
          </button>
        )}
        {open === 'app' && focused !== null && (
          <div
            ref={menu}
            className="menu"
            role="menu"
            id="menu-app"
            aria-labelledby="menu-title-app"
            onKeyDown={keysInMenu}
            data-req="005-os-shell-FR-014 005-os-shell-FR-015 005-os-shell-FR-027 005-os-shell-FR-062 005-os-shell-FR-063 005-os-shell-FR-065"
          >
            <MenuItems entries={appEntries} mac={mac} onChosen={chosen} />
          </div>
        )}
      </div>
      <div className="menu-slot" role="none">
        <button className={open === 'window' ? 'menu-title is-open' : 'menu-title'} {...buttonProps(2, 'window')}>
          {siteText.desktop.windowMenu}
        </button>
        {open === 'window' && (
          <div
            ref={menu}
            className="menu"
            role="menu"
            id="menu-window"
            aria-labelledby="menu-title-window"
            onKeyDown={keysInMenu}
            data-req="005-os-shell-FR-014 005-os-shell-FR-025 005-os-shell-FR-026 005-os-shell-FR-029 005-os-shell-FR-064"
          >
            <MenuItems entries={windowEntries} mac={mac} onChosen={chosen} />
          </div>
        )}
      </div>
    </div>
  );
}
