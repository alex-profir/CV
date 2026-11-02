// What a program has changed, kept the same way by the runtime and the page (009
// research R10, FR-029, FR-030): the latest of each path's file and of its folder, in
// the order they happened. A removal weighs nothing, and of a path that wasn't there
// at the start nothing is kept, so what is held is bounded by what the program holds.
// The runtime refuses a change past the limit with `ENOSPC`, so a program using this
// as it should never reaches the page's own limit.
import type { FileChange, FileChanges } from './messages.ts';
import { QUOTA } from '../shell/protocol.ts';

// The most the paths of what a program made may weigh, past the 1 MB of what they hold.
export const PATHS_LIMIT = QUOTA / 4;

const isRemoval = (change: FileChange) => 'removed' in change || ('made' in change && !change.made);

export function createChanges(start: ReadonlySet<string>) {
  const held = new Map<string, { change: FileChange; paths: number; text: number }>();
  let paths = 0;
  let text = 0;
  const keyOf = (change: FileChange) => `${'made' in change ? 'folder' : 'file'}:${change.path}`;

  return {
    add(change: FileChange): void {
      const key = keyOf(change);
      const before = held.get(key);
      if (before !== undefined) {
        paths -= before.paths;
        text -= before.text;
        held.delete(key);
      }
      if (isRemoval(change) && !start.has(change.path)) return;
      const weight = { paths: isRemoval(change) ? 0 : change.path.length, text: 'text' in change ? change.text.length : 0 };
      held.set(key, { change, ...weight });
      paths += weight.paths;
      text += weight.text;
    },
    // Whether what makes `path` as a file or a folder would still be within the limit.
    fits(path: string, kind: 'file' | 'folder'): boolean {
      return held.has(`${kind}:${path}`) || paths + path.length <= PATHS_LIMIT;
    },
    // Past what the runtime lets through: a change no program could have made.
    over: () => paths > PATHS_LIMIT || text > QUOTA,
    result: (): FileChanges => [...held.values()].map(({ change }) => change),
  };
}
