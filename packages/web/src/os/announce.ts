// The shell's status region, for apps (008 research R23): an app announces a
// change that doesn't move focus through the same polite region the shell's
// own announcements use (005 FR-041). The Os root listens. Announcements made
// in the same task are joined, in order, so a later one doesn't replace them.
const listeners = new Set<(message: string) => void>();

let queued: string[] = [];

function flush(): void {
  const message = queued.join(' ');
  queued = [];
  for (const listener of [...listeners]) listener(message);
}

export function announce(message: string): void {
  if (message === '') return;
  if (queued.length === 0) queueMicrotask(flush);
  queued.push(message);
}

export function onAnnounce(listener: (message: string) => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
