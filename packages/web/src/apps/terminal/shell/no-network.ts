// The worker reaches no network (006 research R39): before just-bash's
// module body runs, every way a worker makes a request is replaced with a
// function that throws, whatever just-bash's own settings are. ES imports
// are hoisted, so this is its own module, imported first by worker.ts.
const scope = globalThis as unknown as Record<string, unknown>;

for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts']) {
  const refused = function refused(): never {
    throw new Error(`${name} is not available in the Terminal's shell`);
  };
  Object.defineProperty(scope, name, { value: refused, writable: false, configurable: false });
}

export {};
