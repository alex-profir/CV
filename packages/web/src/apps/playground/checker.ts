// When the code is checked (research R7): 250 ms after the last change; a
// change while a check is out queues one more; a result for an older model
// version is dropped; and if no result for the current version has come 300
// ms after the change stopped, the Playground shows it is still checking
// (FR-016).
export const CHECK_PAUSE_MS = 250;
export const CHECKING_AFTER_MS = 300;

type Timers = { set: (run: () => void, ms: number) => unknown; clear: (timer: unknown) => void };

export function createChecker({ check, setChecking, timers = { set: (run, ms) => setTimeout(run, ms), clear: (timer) => clearTimeout(timer as number) } }: { check: () => void; setChecking: (on: boolean) => void; timers?: Timers }) {
  let latest = 0;
  let pause: unknown = null;
  let slow: unknown = null;
  let out = false;
  let queued = false;
  let current = true;

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
    // A check now, as for a change of the options.
    now() {
      ask();
    },
    // A result arrived: whether it is for the current version.
    result(version: number): boolean {
      out = false;
      if (queued) {
        queued = false;
        ask();
      }
      if (version < latest) return false;
      current = true;
      setChecking(false);
      return true;
    },
    dispose() {
      if (pause !== null) timers.clear(pause);
      if (slow !== null) timers.clear(slow);
    },
  };
}
