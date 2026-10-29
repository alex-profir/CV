// The shell's root (005 research R1, R2, R4, R10 to R12): it holds the OS
// state, picks the shell once hydrated and whenever the space crosses the
// desktop minimum, runs the reducer's focus moves and announcements, keeps
// the page title in step, and keeps the phone's history entry. Its first
// render is exactly what the build pre-rendered: both shells, with the CV
// window open on the desktop.
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Resume, SiteData } from '@cv/content';
import { initialState, osReducer, shellQuery, viewName as nameOf } from '@cv/os-core';
import type { Area, OsAction, OsState, OsText, ReducerContext, ShellName, ViewId } from '@cv/os-core';
import type { App } from '../apps/index.ts';
import { shellTitle } from '../format/meta.ts';
import { startLoading } from '../inspector/data.ts';
import { crossFade, viewScroller } from '../inspector/transition.ts';
import { fill, siteText } from '../site-text.ts';
import { Desktop } from '../shells/desktop/Desktop.tsx';
import { Mobile } from '../shells/mobile/Mobile.tsx';
import { Announcer } from './Announcer.tsx';
import type { Announcement } from './Announcer.tsx';
import { focusTarget, watchInput } from './focus.ts';
import { METRICS } from './metrics.ts';
import { animateOut } from './motion.ts';
import type { ShellProps } from './shell-props.ts';

declare global {
  interface Window {
    // The view of a home screen icon tapped before hydration (contracts/shell.md Document).
    osEarlyView?: string;
  }
}

export type OsProps = { resume: Resume; siteData: SiteData; apps: readonly App[] };

const TEXT: OsText = { aboutName: siteText.os.views.about, ...siteText.os.announce };

const isView = (value: unknown): value is ViewId => value === 'cv' || value === 'terminal' || value === 'about';

// The desktop area: the viewport between the menu bar and the dock's space,
// measured when the desktop is in the page.
export function measureArea(): Area {
  const area = document.querySelector('#os .desktop-area');
  if (area !== null) {
    const box = area.getBoundingClientRect();
    if (box.width > 0) return { width: Math.round(box.width), height: Math.round(box.height) };
  }
  return { width: document.documentElement.clientWidth, height: window.innerHeight - METRICS.menuBar - METRICS.dockReserve };
}

export const currentShell = (): ShellName => (matchMedia(shellQuery(METRICS)).matches ? 'desktop' : 'mobile');

// Whether shortcut labels read Option rather than Alt (research R9).
function onMac(): boolean {
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform;
  return /mac/i.test(platform);
}

// The open full-screen view's scroll position, saved on going home (FR-034).
const openScroll = () => document.querySelector('#os .full-screen .view-content')?.scrollTop ?? 0;

export function Os({ resume, siteData, apps }: OsProps) {
  const context: ReducerContext = useMemo(() => ({ apps, metrics: METRICS, text: TEXT }), [apps]);
  const [state, dispatch] = useReducer((current: OsState, action: OsAction) => osReducer(current, action, context), null, () => initialState(apps, METRICS));
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [mac, setMac] = useState(false);
  const ready = useRef(false);
  // Whether the history entry this visit pushed is the current one, and how
  // many `popstate` events the shell caused itself (FR-050).
  const pushed = useRef(false);
  const ownPops = useRef(0);
  // Whether Home's `history.back()` is on its way, so a second Home before
  // its `popstate` doesn't go back again and leave the site (FR-033, FR-050).
  const homing = useRef(false);
  // Windows closing, until their animation ends (research R13). Minimizing
  // doesn't wait: the window animates on its own (FR-071).
  const leaving = useRef(new Map<ViewId, { stop: () => void; action: OsAction }>());

  const viewName = useCallback((view: ViewId) => nameOf(view, context), [context]);
  // The view's title: its name, or `[view] · Specs` while it shows its specs
  // (007 research R4).
  const viewTitle = useCallback(
    (view: ViewId) => (state.specs[view] === undefined ? viewName(view) : fill(siteText.inspector.windowTitle, { view: viewName(view) })),
    [state.specs, viewName],
  );

  // The state as last rendered, for `finish`.
  const current = useRef(state);
  current.current = state;

  // Applies an action. Once a close has been applied to an open window, its
  // app's `onClose` runs, whatever started it (006 contracts/shell.md).
  const finish = useCallback(
    (action: OsAction) => {
      const closing = action.type === 'close' && current.current.windows.some((window) => window.view === action.view);
      dispatch(action);
      if (closing) apps.find((app) => app.id === action.view)?.onClose?.();
    },
    [apps],
  );

  // Hydrated: pick the shell, before the browser paints again.
  useLayoutEffect(() => {
    const shell = currentShell();
    document.documentElement.setAttribute('data-shell', shell);
    dispatch({ type: 'hydrated', shell, area: shell === 'desktop' ? measureArea() : null });
    setMac(onMac());
  }, []);

  // Once only the active shell is rendered: mark the shell ready, and open
  // a view tapped before hydration, as the tap would have.
  useEffect(() => {
    if (state.shell === 'both' || ready.current) return;
    ready.current = true;
    document.getElementById('os')?.setAttribute('data-ready', '');
    // The requirement data, once the shell is ready (007 research R9).
    startLoading();
    const early = window.osEarlyView;
    delete window.osEarlyView;
    if (state.shell === 'mobile' && state.mobile.open === null && isView(early)) dispatch({ type: 'mobileOpen', view: early });
  }, [state.shell, state.mobile.open]);

  // Focus moved after a key shows its indicator (FR-024).
  useEffect(() => watchInput(), []);

  // The shell follows the space available (FR-002, research R12).
  const hydrated = state.shell !== 'both';
  useEffect(() => {
    if (!hydrated) return undefined;
    const query = matchMedia(shellQuery(METRICS));
    const onChange = () => {
      // A window still closing does so at once, before the switch.
      for (const { stop, action } of leaving.current.values()) {
        stop();
        finish(action);
      }
      leaving.current.clear();
      const shell: ShellName = query.matches ? 'desktop' : 'mobile';
      document.documentElement.setAttribute('data-shell', shell);
      dispatch({ type: 'shellChanged', shell, area: shell === 'desktop' ? measureArea() : null });
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [hydrated, finish]);

  // Opening an app full screen pushes one entry with the same address, so
  // Back goes home; the desktop never keeps one (FR-050, research R11).
  useEffect(() => {
    if (state.shell === 'mobile' && state.mobile.historyEntry && !pushed.current) {
      history.pushState({ os: 'full-screen' }, '', location.href);
      pushed.current = true;
    } else if (state.shell === 'desktop' && pushed.current) {
      pushed.current = false;
      ownPops.current += 1;
      // Home's Back, if on its way, uses up the entry already.
      if (!homing.current) history.back();
      homing.current = false;
    }
  }, [state.shell, state.mobile.historyEntry]);

  useEffect(() => {
    // A full-screen entry left by an earlier load of the page, as after a
    // reload with an app open, is gone back over, so the next Back leaves.
    if ((history.state as { os?: unknown } | null)?.os === 'full-screen') {
      ownPops.current += 1;
      history.back();
    }
    const onPopState = () => {
      if (ownPops.current > 0) {
        ownPops.current -= 1;
        return;
      }
      if (!pushed.current) return;
      pushed.current = false;
      homing.current = false;
      dispatch({ type: 'mobileHome', scrollTop: openScroll() });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Home uses the entry up, so the next Back leaves the site.
  const onHome = useCallback(() => {
    if (!pushed.current) dispatch({ type: 'mobileHome', scrollTop: openScroll() });
    else if (!homing.current) {
      homing.current = true;
      history.back();
    }
  }, []);

  // The reducer's focus moves and announcements, once their elements exist.
  useEffect(() => {
    if (state.effects.length === 0) return;
    for (const effect of state.effects) {
      if (effect.kind === 'focus') focusTarget(effect.target, apps);
      else setAnnouncement((previous) => ({ message: effect.message, id: (previous?.id ?? 0) + 1 }));
    }
    dispatch({ type: 'effectsDone', count: state.effects.length });
  }, [state.effects]);

  // The title: the focused window's or open app's title, then the site name.
  useEffect(() => {
    if (state.shell === 'both') return;
    const view = state.shell === 'desktop' ? state.focused : state.mobile.open;
    document.title = shellTitle(resume, view === null ? undefined : viewTitle(view));
  }, [state.shell, state.focused, state.mobile.open, resume, viewTitle]);

  // What the shells dispatch: closing a window waits for its closing
  // animation (research R13), and a spec view's swap cross-fades. A second request meanwhile is dropped;
  // opening the window again stops the animation and keeps it.
  const act = useCallback((action: OsAction) => {
    if (action.type === 'close') {
      const { view } = action;
      if (leaving.current.has(view)) return;
      let done = false;
      const stop = animateOut(document.querySelector(`#os .desktop .window[data-view="${view}"]`), () => {
        done = true;
        leaving.current.delete(view);
        finish(action);
      });
      if (!done) leaving.current.set(view, { stop, action });
      return;
    }
    if (action.type === 'open') {
      leaving.current.get(action.view)?.stop();
      leaving.current.delete(action.view);
    }
    // Showing and leaving a spec view cross-fade the view's content (007
    // research R11), when the action changes anything.
    if ((action.type === 'showSpecs' || action.type === 'showApp') && osReducer(current.current, action, context) !== current.current) {
      crossFade(viewScroller(action.view), () => dispatch(action));
      return;
    }
    dispatch(action);
  }, [finish, context]);

  const shellProps: ShellProps = { state, dispatch: act, apps, resume, siteData, mac, viewName, viewTitle };
  return (
    <>
      {state.shell !== 'mobile' && <Desktop {...shellProps} active={state.shell === 'desktop'} />}
      {state.shell !== 'desktop' && <Mobile {...shellProps} onHome={onHome} />}
      <Announcer announcement={announcement} />
    </>
  );
}
