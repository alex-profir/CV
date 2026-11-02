// What a program must not reach (009 research R2). `connect-src 'none'` is what
// enforces FR-023; removing the names gives the program a readable error, and
// takes threads away from it (FR-025). Each goes from the worker's global and
// from every prototype above it, so no saved reference finds it.
const REMOVED = ['fetch', 'XMLHttpRequest', 'WebSocket', 'WebSocketStream', 'WebTransport', 'EventSource', 'Worker', 'SharedWorker', 'BroadcastChannel', 'indexedDB', 'caches', 'importScripts'];

export function removeReaches(scope: object): void {
  for (const name of REMOVED) {
    for (let holder: object | null = scope; holder !== null; holder = Object.getPrototypeOf(holder)) {
      try {
        delete (holder as Record<string, unknown>)[name];
      } catch {
        // Not configurable: shadowed below.
      }
    }
    if ((scope as Record<string, unknown>)[name] !== undefined) Object.defineProperty(scope, name, { value: undefined, writable: false, configurable: false, enumerable: false });
  }
}
