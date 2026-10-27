// The state the build renders (data-model.md Initial state): the CV window
// open and focused, at a zero geometry until the client measures the
// desktop area (research R3), and nothing open on mobile.
import type { AppDeclaration, Metrics, OsState } from './types.ts';

export function initialState(apps: readonly AppDeclaration[], _metrics: Metrics): OsState {
  const cv = apps.find((app) => app.id === 'cv' && app.shells.includes('desktop'));
  return {
    shell: 'both',
    area: null,
    windows: cv === undefined ? [] : [{ view: 'cv', geometry: { x: 0, y: 0, width: 0, height: 0 }, minimized: false, maximized: null, placement: 'initial' }],
    focused: cv === undefined ? null : 'cv',
    session: null,
    mobile: { open: null, scroll: {}, historyEntry: false },
    effects: [],
  };
}
