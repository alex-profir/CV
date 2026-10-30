import { APPS } from '../apps/index.ts';
import { Shell } from '../os/Shell.tsx';

export const root = <Shell count={APPS.length} />;
