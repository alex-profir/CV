// The event loop (009 FR-008, FR-035): Node's phases on the worker's own tasks.
// Each callback runs in a task of its own, so the engine's microtasks run after
// it, and `nextTick`'s queue runs at the end of the callback, before them, as
// Node's does. The loop ends when nothing it counts is left to do.

export type Timer = {
  id: number;
  time: number;
  delay: number;
  repeat: boolean;
  callback: () => void;
  refed: boolean;
  active: boolean;
};

export type LoopDeps = {
  now: () => number;
  // Calls the function in a new task.
  task: (run: () => void) => void;
  // The worker's own timer, for a sleep: not the program's.
  sleep: (run: () => void, ms: number) => unknown;
  wake: (handle: unknown) => void;
  // An error nothing caught.
  uncaught: (error: unknown) => void;
  // Nothing is left to do: `beforeExit` may add more, else the program ends.
  drained: () => void;
};

// Timers below 1 ms are 1 ms, and a delay too large or not a number is 1 ms.
const MOST_DELAY = 2 ** 31 - 1;
const delayOf = (ms: unknown): number => {
  const delay = Number(ms);
  return delay >= 1 && delay <= MOST_DELAY ? Math.trunc(delay) : 1;
};

export function createLoop(deps: LoopDeps) {
  const ticks: (() => void)[] = [];
  const pending: (() => void)[] = [];
  let immediates: Immediate[] = [];
  let checking: Immediate[] = [];
  let timers: Timer[] = [];
  let ids = 0;
  let phase: 'timers' | 'poll' | 'check' = 'timers';
  let loopTime = 0;
  let queued = false;
  let sleeping: unknown = null;
  let stopped = false;
  let graces = 0;

  type Immediate = { callback: () => void; refed: boolean; active: boolean };

  const guard = (run: () => void) => {
    try {
      run();
    } catch (error) {
      deps.uncaught(error);
    }
  };

  function runTicks(): void {
    while (ticks.length > 0 && !stopped) guard(ticks.shift()!);
  }

  // A callback from the loop or the page: its ticks run before its microtasks.
  function call(run: () => void): void {
    if (stopped) return;
    guard(run);
    runTicks();
    schedule();
  }

  function schedule(): void {
    if (queued || stopped) return;
    queued = true;
    graces = 0;
    if (sleeping !== null) {
      deps.wake(sleeping);
      sleeping = null;
    }
    deps.task(step);
  }

  const alive = () => ticks.length > 0 || pending.length > 0 || checking.some((each) => each.active && each.refed) || immediates.some((each) => each.active && each.refed) || timers.some((each) => each.active && each.refed);

  function nextTimer(): Timer | null {
    let found: Timer | null = null;
    for (const timer of timers) if (timer.active && timer.time <= loopTime && (found === null || timer.time < found.time || (timer.time === found.time && timer.id < found.id))) found = timer;
    return found;
  }

  function step(): void {
    queued = false;
    if (stopped) return;
    if (ticks.length > 0) {
      runTicks();
      schedule();
      return;
    }
    if (phase === 'timers') {
      const timer = nextTimer();
      if (timer !== null) {
        if (timer.repeat) timer.time = deps.now() + timer.delay;
        else {
          timer.active = false;
          timers = timers.filter((each) => each !== timer);
        }
        call(timer.callback);
        return;
      }
      phase = 'poll';
    }
    if (phase === 'poll') {
      const next = pending.shift();
      if (next !== undefined) {
        call(next);
        return;
      }
      phase = 'check';
      checking = immediates;
      immediates = [];
    }
    while (checking.length > 0) {
      const next = checking.shift()!;
      if (!next.active) continue;
      next.active = false;
      call(next.callback);
      return;
    }
    phase = 'timers';
    loopTime = deps.now();
    if (pending.length > 0 || immediates.some((each) => each.active) || nextTimer() !== null) {
      schedule();
      return;
    }
    settle();
  }

  // Nothing is ready: wait for the next timer, or end.
  function settle(): void {
    if (!alive()) {
      // A rejection the browser hasn't told yet comes in a task of its own, so
      // it must have its chance before the program ends.
      if (graces < 2) {
        graces += 1;
        sleeping = deps.sleep(() => {
          sleeping = null;
          if (!queued && !stopped) (alive() ? schedule : settle)();
        }, 0);
        return;
      }
      graces = 0;
      deps.drained();
      return;
    }
    let soonest = Number.POSITIVE_INFINITY;
    for (const timer of timers) if (timer.active) soonest = Math.min(soonest, timer.time);
    sleeping = deps.sleep(() => {
      sleeping = null;
      phase = 'timers';
      loopTime = deps.now();
      schedule();
    }, Math.max(0, soonest - deps.now()));
  }

  function addTimer(callback: () => void, ms: unknown, repeat: boolean): Timer {
    const delay = delayOf(ms);
    ids += 1;
    const timer: Timer = { id: ids, time: deps.now() + delay, delay, repeat, callback, refed: true, active: true };
    timers.push(timer);
    schedule();
    return timer;
  }

  return {
    call,
    start(): void {
      // The first turn counts a timer of 0 as due, ahead of `setImmediate`, as
      // Node's bootstrap takes longer than the timer's 1 ms.
      loopTime = deps.now() + 1;
      phase = 'timers';
      schedule();
    },
    nextTick(callback: () => void): void {
      ticks.push(callback);
      schedule();
    },
    // For what finishes "later" with no timer: fs's callback forms.
    defer(callback: () => void): void {
      pending.push(callback);
      schedule();
    },
    addTimer,
    removeTimer(timer: Timer): void {
      timer.active = false;
      timers = timers.filter((each) => each !== timer);
      schedule();
    },
    refresh(timer: Timer): void {
      timer.time = deps.now() + timer.delay;
      if (!timer.active) {
        timer.active = true;
        timers.push(timer);
      }
      schedule();
    },
    changed: schedule,
    addImmediate(callback: () => void): Immediate {
      const immediate: Immediate = { callback, refed: true, active: true };
      immediates.push(immediate);
      schedule();
      return immediate;
    },
    stop(): void {
      stopped = true;
      if (sleeping !== null) deps.wake(sleeping);
      sleeping = null;
    },
    alive,
    stopped: () => stopped,
  };
}

export type Loop = ReturnType<typeof createLoop>;
export type Immediate = ReturnType<Loop['addImmediate']>;
