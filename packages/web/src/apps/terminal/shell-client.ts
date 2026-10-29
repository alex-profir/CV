// The page's side of the shell worker (006 research R26, R34,
// contracts/shell-worker.md Timing): one client per visit, outside React.
// The worker starts when the Terminal first opens, never before (FR-070),
// runs one line at a time, and is replaced by a new one, restored from the
// last state and files, when a line outruns the watchdog or the visitor
// presses Ctrl+C (FR-069, FR-075).
import { NO_FILES } from './shell/protocol.ts';
import type { FromWorker, Limit, RunRequest, RunResult, ShellState, ToWorker, VisitorFiles } from './shell/protocol.ts';

// The contract's numbers, not design values.
export const TIMING = {
  // No `ready` after `start`: the failure line.
  ready: 10_000,
  // No answer to `run`: 1 s past the shell's own 5 s limit.
  run: 6_000,
};

export type ClientStatus = 'idle' | 'loading' | 'ready' | 'failed';

// What the client needs of a worker, so a test can give it a fake.
export type WorkerLike = {
  postMessage(message: ToWorker): void;
  terminate(): void;
  onmessage: ((event: { data: FromWorker }) => void) | null;
  onerror: ((event: unknown) => void) | null;
};

export type ShellClient = {
  status(): ClientStatus;
  subscribe(listener: () => void): () => void;
  // Starts the worker, once; again only through `retry`.
  start(): void;
  retry(): void;
  run(request: RunRequest): Promise<RunResult>;
  // Stops the running line at once (FR-075): the result is the line
  // stopped, its state as before it.
  cancel(): void;
  reset(): void;
};

type Pending = { request: RunRequest; resolve: (result: RunResult) => void; timer: ReturnType<typeof setTimeout> };

const newWorker = (): WorkerLike => new Worker(new URL('./shell/worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike;

// A stopped line: nothing it printed, the state as it was (FR-069).
const stopped = (request: RunRequest, limit: Limit | null): RunResult => ({
  id: request.id,
  stdout: '',
  stderr: '',
  status: 130,
  recorded: [],
  effects: [],
  end: 'limit',
  ...(limit === null ? {} : { limit }),
  state: request.state,
});

export function createShellClient(makeWorker: () => WorkerLike = newWorker): ShellClient {
  let worker: WorkerLike | null = null;
  let status: ClientStatus = 'idle';
  let readyTimer: ReturnType<typeof setTimeout> | null = null;
  let pending: Pending | null = null;
  // What a restarted worker is given back (research R26).
  let state: ShellState | null = null;
  let files: VisitorFiles = NO_FILES;
  const listeners = new Set<() => void>();

  const setStatus = (next: ClientStatus) => {
    if (next === status) return;
    status = next;
    for (const listener of listeners) listener();
  };

  const clearReady = () => {
    if (readyTimer !== null) clearTimeout(readyTimer);
    readyTimer = null;
  };

  const fail = () => {
    clearReady();
    worker?.terminate();
    worker = null;
    setStatus('failed');
  };

  const onMessage = (message: FromWorker) => {
    if (message.type === 'ready') {
      clearReady();
      setStatus('ready');
      return;
    }
    if (message.type === 'failed') {
      fail();
      return;
    }
    if (pending === null || message.result.id !== pending.request.id) return;
    const { resolve, timer } = pending;
    clearTimeout(timer);
    pending = null;
    state = message.result.state;
    if (message.result.files !== undefined) files = message.result.files;
    resolve(message.result);
  };

  // A new worker; `restore` gives it the last state and files first.
  const boot = (restore: boolean) => {
    clearReady();
    worker?.terminate();
    const next = makeWorker();
    worker = next;
    next.onmessage = (event) => {
      if (worker === next) onMessage(event.data);
    };
    next.onerror = () => {
      if (worker === next) fail();
    };
    readyTimer = setTimeout(fail, TIMING.ready);
    next.postMessage({ type: 'start', data: {} });
    if (restore && state !== null) next.postMessage({ type: 'restore', state, files });
  };

  // Ends the running line as stopped and starts over from the last result.
  const restart = (limit: Limit | null) => {
    if (pending === null) return;
    const { request, resolve, timer } = pending;
    clearTimeout(timer);
    pending = null;
    setStatus('loading');
    boot(true);
    resolve(stopped(request, limit));
  };

  return {
    status: () => status,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start() {
      if (status !== 'idle') return;
      setStatus('loading');
      boot(false);
    },
    retry() {
      if (status !== 'failed') return;
      setStatus('loading');
      boot(true);
    },
    run(request) {
      return new Promise((resolve) => {
        if (worker === null || status !== 'ready' || pending !== null) {
          resolve(stopped(request, null));
          return;
        }
        pending = { request, resolve, timer: setTimeout(() => restart('time'), TIMING.run) };
        worker.postMessage({ type: 'run', request });
      });
    },
    cancel() {
      restart('cancelled');
    },
    reset() {
      state = null;
      files = NO_FILES;
      if (pending !== null) restart(null);
      worker?.postMessage({ type: 'reset' });
    },
  };
}
