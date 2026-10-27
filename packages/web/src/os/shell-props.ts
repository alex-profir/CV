// What both shells are given by the Os root (005 research R4): the OS state
// and its dispatch, the app list, the CV and site data, and whether the
// visitor is on a Mac, for shortcut labels.
import type { Dispatch } from 'react';
import type { Resume, SiteData } from '@cv/content';
import type { OsAction, OsState, ViewId } from '@cv/os-core';
import type { App } from '../apps/index.ts';

export type ShellProps = {
  state: OsState;
  dispatch: Dispatch<OsAction>;
  apps: readonly App[];
  resume: Resume;
  siteData: SiteData;
  mac: boolean;
  // A view's name: its app's, or About this site's.
  viewName: (view: ViewId) => string;
};
