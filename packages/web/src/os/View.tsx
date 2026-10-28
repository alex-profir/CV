// A view's content, in a window or full screen: an app's own content, or
// About this site (005 data-model.md App declaration). An app's content gets
// the `os` handle (006 contracts/shell.md): opening a view as the dock or the
// home screen does, and leaving as the close control or Home does.
import { useMemo } from 'react';
import type { Dispatch } from 'react';
import type { Resume, SiteData } from '@cv/content';
import type { OsAction, ShellName, ViewId } from '@cv/os-core';
import type { App, AppOs } from '../apps/index.ts';
import { About } from './About.tsx';

type ViewProps = { view: ViewId; apps: readonly App[]; resume: Resume; siteData: SiteData; shell: ShellName; mac: boolean; dispatch: Dispatch<OsAction>; onHome?: (() => void) | undefined };

export function View({ view, apps, resume, siteData, shell, mac, dispatch, onHome }: ViewProps) {
  const os: AppOs = useMemo(
    () => ({
      shell,
      open: (target) => dispatch(shell === 'desktop' ? { type: 'open', view: target } : { type: 'mobileOpen', view: target }),
      exit: () => (shell === 'desktop' ? dispatch({ type: 'close', view }) : onHome?.()),
    }),
    [shell, dispatch, onHome, view],
  );
  if (view === 'about') return <About resume={resume} siteData={siteData} withShortcuts={shell === 'desktop'} mac={mac} />;
  const app = apps.find((candidate) => candidate.id === view);
  if (app === undefined) return null;
  const Content = app.Content;
  return <Content resume={resume} siteData={siteData} os={os} />;
}
