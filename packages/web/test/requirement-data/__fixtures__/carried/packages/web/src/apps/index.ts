import type { ReactNode } from 'react';
import { alphaApp } from './alpha/app.tsx';
import { betaApp } from './beta/app.tsx';

export type App = { id: string; Content: (props: object) => ReactNode };

export const APPS = Object.freeze([alphaApp, betaApp]);
