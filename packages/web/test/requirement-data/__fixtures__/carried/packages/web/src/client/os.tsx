import '../styles/os.css';
import { APPS } from '../apps/index.ts';
import { Shell } from '../os/Shell.tsx';

export const root = <Shell apps={APPS} />;
