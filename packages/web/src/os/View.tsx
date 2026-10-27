// A view's content, in a window or full screen: an app's own content, or
// About this site (005 data-model.md App declaration).
import type { Resume, SiteData } from '@cv/content';
import type { ShellName, ViewId } from '@cv/os-core';
import type { App } from '../apps/index.ts';
import { About } from './About.tsx';

export function View({ view, apps, resume, siteData, shell, mac }: { view: ViewId; apps: readonly App[]; resume: Resume; siteData: SiteData; shell: ShellName; mac: boolean }) {
  if (view === 'about') return <About resume={resume} siteData={siteData} withShortcuts={shell === 'desktop'} mac={mac} />;
  const app = apps.find((candidate) => candidate.id === view);
  if (app === undefined) return null;
  const Content = app.Content;
  return <Content resume={resume} siteData={siteData} />;
}
