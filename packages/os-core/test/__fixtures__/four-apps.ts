// Four views (008): the CV, the Terminal and the Playground as apps, and
// About this site.
import type { AppDeclaration, ReducerContext } from '../../src/index.ts';
import { METRICS, TEXT, THREE_APPS } from '../helpers.ts';

const Stub = () => null;

export const FOUR_APPS: AppDeclaration[] = [...THREE_APPS, { id: 'playground', name: 'Playground', shells: ['desktop', 'mobile'], needsNetwork: false, Icon: Stub, Content: Stub }];

export const FOUR_CONTEXT: ReducerContext = { apps: FOUR_APPS, metrics: METRICS, text: TEXT };
