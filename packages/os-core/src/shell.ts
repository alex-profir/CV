// Which shell a visitor gets, and which apps it shows (FR-001, FR-003).
import type { AppDeclaration, Metrics, ShellName } from './types.ts';

// The media query that picks the desktop shell: at least the desktop's
// width and height (research R2). The inline picker and `matchMedia` both
// use this text, so they can't disagree.
export function shellQuery(metrics: Metrics): string {
  return `(width >= ${metrics.desktopMinWidth}px) and (height >= ${metrics.desktopMinHeight}px)`;
}

// The apps that declare `shell`, in list order, and nothing else.
export function appsFor<App extends AppDeclaration>(apps: readonly App[], shell: ShellName): App[] {
  return apps.filter((app) => app.shells.includes(shell));
}
