// When the code is checked (research R7): 250 ms after the last change; a
// change while a check is out queues one more; a result for an older model
// version is dropped; and if no result for the current version has come 300
// ms after the change stopped, the Playground shows it is still checking
// (FR-016). A check that brings no result, as when a change of the options
// restarts the worker under it, is asked again, a few times in a row at most.
export const CHECK_PAUSE_MS = 250;
export const CHECKING_AFTER_MS = 300;
export const LOST_CHECK_RETRIES = 3;

type Timers = { set: (run: () => void, ms: number) => unknown; clear: (timer: unknown) => void };

export function createChecker({ check, setChecking, timers = { set: (run, ms) => setTimeout(run, ms), clear: (timer) => clearTimeout(timer as number) } }: { check: () => void; setChecking: (on: boolean) => void; timers?: Timers }) {
  let latest = 0;
  let pause: unknown = null;
  let slow: unknown = null;
  let out = false;
  let queued = false;
  let current = true;
  let lostInARow = 0;

  const ask = () => {
    if (out) {
      queued = true;
      return;
    }
    out = true;
    check();
  };

  return {
    changed(version: number) {
      latest = version;
      current = false;
      if (pause !== null) timers.clear(pause);
      if (slow !== null) timers.clear(slow);
      pause = timers.set(() => {
        pause = null;
        ask();
      }, CHECK_PAUSE_MS);
      slow = timers.set(() => {
        slow = null;
        if (!current) setChecking(true);
      }, CHECKING_AFTER_MS);
    },
    // The options changed: the same code, so the same version, but what shows
    // is out of date until the next result, and says so after the same wait.
    optionsChanged() {
      current = false;
      if (slow !== null) timers.clear(slow);
      slow = timers.set(() => {
        slow = null;
        if (!current) setChecking(true);
      }, CHECKING_AFTER_MS);
    },
    // A result arrived: whether it is for the current version.
    result(version: number): boolean {
      out = false;
      lostInARow = 0;
      if (queued) {
        queued = false;
        ask();
      }
      if (version < latest) return false;
      current = true;
      setChecking(false);
      return true;
    },
    // The check out brought no result.
    // The retries count only for the same code: a change that came while the
    // check was out is always asked about.
    lost() {
      const changedSince = queued;
      out = false;
      queued = false;
      lostInARow += 1;
      if (changedSince || lostInARow <= LOST_CHECK_RETRIES) ask();
    },
    dispose() {
      if (pause !== null) timers.clear(pause);
      if (slow !== null) timers.clear(slow);
    },
  };
}
