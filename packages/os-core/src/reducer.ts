// The OS reducer (data-model.md Actions and transitions). Pure: it returns
// the next state, with the focus moves and announcements it causes appended
// to `effects` for the Os root to run, and never mutates its arguments.
import type { OsAction, OsState, ReducerContext } from './types.ts';

export function osReducer(state: OsState, action: OsAction, _context: ReducerContext): OsState {
  switch (action.type) {
    case 'effectsDone':
      return state.effects.length === 0 ? state : { ...state, effects: [] };
    default:
      return state;
  }
}
