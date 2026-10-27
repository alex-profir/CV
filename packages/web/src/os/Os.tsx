// The shell's root (005 research R1, R2, R4, R10): it holds the OS state,
// picks the shell once hydrated, runs the reducer's focus moves and
// announcements, and keeps the page title in step. Its first render is
// exactly what the build pre-rendered: both shells, with the CV window open
// on the desktop.
import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Resume, SiteData } from '@cv/content';
import { initialState, osReducer, shellQuery } from '@cv/os-core';
import type { Area, OsAction, OsState, OsText, ReducerContext, ShellName, ViewId } from '@cv/os-core';
import type { App } from '../apps/index.ts';
import { shellTitle } from '../format/meta.ts';
import { siteText } from '../site-text.ts';
import { Announcer } from './Announcer.tsx';
import type { Announcement } from './Announcer.tsx';
import { focusTarget } from './focus.ts';
import { METRICS } from './metrics.ts';

declare global {
  interface Window {
    // The view of a home screen icon tapped before hydration (contracts/shell.md Document).
    osEarlyView?: string;
  }
}

export type OsProps = { resume: Resume; siteData: SiteData; apps: readonly App[] };

const TEXT: OsText = { aboutName: siteText.os.views.about, ...siteText.os.announce };

const isView = (value: unknown): value is ViewId => value === 'cv' || value === 'about';

// The desktop area: the viewport between the menu bar and the dock's space.
export function measureArea(): Area {
  const area = document.querySelector('#os .desktop-area');
  if (area !== null) {
    const box = area.getBoundingClientRect();
    if (box.width > 0) return { width: Math.round(box.width), height: Math.round(box.height) };
  }
  return { width: document.documentElement.clientWidth, height: window.innerHeight - METRICS.menuBar - METRICS.dockReserve };
}

export const currentShell = (): ShellName => (matchMedia(shellQuery(METRICS)).matches ? 'desktop' : 'mobile');

export function Os({ resume, apps }: OsProps) {
  const context: ReducerContext = useMemo(() => ({ apps, metrics: METRICS, text: TEXT }), [apps]);
  const [state, dispatch] = useReducer((current: OsState, action: OsAction) => osReducer(current, action, context), null, () => initialState(apps, METRICS));
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const ready = useRef(false);

  const viewName = (view: ViewId) => (view === 'about' ? TEXT.aboutName : (apps.find((app) => app.id === view)?.name ?? view));

  // Hydrated: pick the shell, before the browser paints again.
  useLayoutEffect(() => {
    const shell = currentShell();
    document.documentElement.setAttribute('data-shell', shell);
    dispatch({ type: 'hydrated', shell, area: shell === 'desktop' ? measureArea() : null });
  }, []);

  // Once only the active shell is rendered: mark the shell ready, and open
  // a view tapped before hydration, as the tap would have.
  useEffect(() => {
    if (state.shell === 'both' || ready.current) return;
    ready.current = true;
    document.getElementById('os')?.setAttribute('data-ready', '');
    const early = window.osEarlyView;
    delete window.osEarlyView;
    if (state.shell === 'mobile' && state.mobile.open === null && isView(early)) dispatch({ type: 'mobileOpen', view: early });
  }, [state.shell, state.mobile.open]);

  // The reducer's focus moves and announcements, once their elements exist.
  useEffect(() => {
    if (state.effects.length === 0) return;
    for (const effect of state.effects) {
      if (effect.kind === 'focus') focusTarget(effect.target);
      else setAnnouncement((previous) => ({ message: effect.message, id: (previous?.id ?? 0) + 1 }));
    }
    dispatch({ type: 'effectsDone' });
  }, [state.effects]);

  // The title: the focused window's or open app's name, then the site name.
  useEffect(() => {
    if (state.shell === 'both') return;
    const view = state.shell === 'desktop' ? state.focused : state.mobile.open;
    document.title = shellTitle(resume, view === null ? undefined : viewName(view));
  }, [state.shell, state.focused, state.mobile.open]);

  return (
    <>
      {state.shell !== 'mobile' && <div className="desktop" />}
      {state.shell !== 'desktop' && <div className="mobile" />}
      <Announcer announcement={announcement} />
    </>
  );
}
