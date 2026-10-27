// The apps, in dock and home screen order (005 FR-003, data-model.md App
// declaration). Each declares its shells beside its code (Constitution V);
// both shells read this one list through `appsFor`.
import type { AppDeclaration } from '@cv/os-core';
import type { Resume, SiteData } from '@cv/content';
import { cvApp } from './cv/app.tsx';

// What every app's content is given.
export type AppProps = { resume: Resume; siteData: SiteData };

export type App = AppDeclaration<AppProps>;

export const APPS: readonly App[] = Object.freeze([cvApp]);
