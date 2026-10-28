// The apps, in dock and home screen order (005 FR-003, data-model.md App
// declaration). Each declares its shells beside its code (Constitution V);
// both shells read this one list through `appsFor`.
import type { ReactNode } from 'react';
import type { AppDeclaration, ShellName } from '@cv/os-core';
import type { Resume, SiteData } from '@cv/content';
import { cvApp } from './cv/app.tsx';

// What an app's content may ask of the shell (006 contracts/shell.md): the
// shell it is rendered in, to open the CV or About this site as the dock or
// home screen does, and to leave as its window's close control or Home does.
export type AppOs = { shell: ShellName; open: (view: 'cv' | 'about') => void; exit: () => void };

// What every app's content is given.
export type AppProps = { resume: Resume; siteData: SiteData; os: AppOs };

// An item an app adds to its window's own menu, before the window commands.
// `data-req` is written literally where the item is declared.
export type AppMenuItem = { key: string; label: string; run: () => void; 'data-req'?: string };

// os-core's declaration, with React components for the icon and content,
// and the optional fields any app may give (006 contracts/shell.md):
// `focusOnOpen`, a selector inside its content that takes focus in place of
// its title; `WindowTitle`, its title bar's text in place of its name;
// `menuItems`; and `onClose`, called once its window has closed.
export type App = Omit<AppDeclaration<AppProps>, 'Icon' | 'Content'> & {
  Icon: () => ReactNode;
  Content: (props: AppProps) => ReactNode;
  focusOnOpen?: string;
  WindowTitle?: () => ReactNode;
  menuItems?: readonly AppMenuItem[];
  onClose?: () => void;
};

export const APPS: readonly App[] = Object.freeze([cvApp]);
