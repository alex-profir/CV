// The apps, in dock and home screen order (005 FR-003, data-model.md App
// declaration). Each declares its shells beside its code (Constitution V);
// both shells read this one list through `appsFor`.
import type { ReactNode } from 'react';
import type { AppDeclaration } from '@cv/os-core';
import type { Resume, SiteData } from '@cv/content';
import { cvApp } from './cv/app.tsx';

// What every app's content is given.
export type AppProps = { resume: Resume; siteData: SiteData };

// os-core's declaration, with React components for the icon and content.
export type App = Omit<AppDeclaration<AppProps>, 'Icon' | 'Content'> & { Icon: () => ReactNode; Content: (props: AppProps) => ReactNode };

export const APPS: readonly App[] = Object.freeze([cvApp]);
