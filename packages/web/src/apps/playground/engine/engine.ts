// The engine's entry (contracts/engine.md, research R2, R3): built apart from
// the `os` script into /playground/<engine-hash>/ and imported by the loader
// at run time. Nothing in the `os` script imports this module.
import './editor.css';
import type { Engine, EngineInit, RunEvents, RunHandle, RunInput } from './contract.ts';
import { CODE_URI, createEditing } from './editor.ts';
import { startFrame } from './runner/host.ts';

export const api = 1;

export async function createEngine(init: EngineInit): Promise<Engine> {
  const editing = createEditing(init);
  const worker = await editing.worker();
  const typescript = await worker.getVersion();
  editing.check();
  let current: RunHandle | null = null;

  // One run at a time (contracts/runner.md The call): a new run stops the
  // one going. With imports, or no JavaScript, nothing runs and no frame is
  // made (FR-033, FR-042).
  function run(input: RunInput, events: RunEvents): RunHandle {
    current?.stop();
    const startedAt = performance.now();
    let frame: RunHandle | null = null;
    let over = false;
    const end: RunEvents = {
      ...events,
      onEnded: (outcome) => {
        if (over) return;
        over = true;
        if (current === handle) current = null;
        events.onEnded(outcome);
      },
    };
    const handle: RunHandle = {
      stop: () => {
        if (over) return;
        if (frame !== null) frame.stop();
        else end.onEnded({ kind: 'stopped', ms: performance.now() - startedAt });
      },
    };
    current = handle;
    // The worker is asked afresh, so it has the code as it is now.
    void editing
      .worker()
      .then((latest) => latest.getRunnable(CODE_URI.toString()))
      .then((runnable) => {
        if (over) return;
        if (runnable === null) return end.onEnded({ kind: 'nothing-ran', ms: performance.now() - startedAt, reason: 'no-code' });
        if (runnable.imports > 0) return end.onEnded({ kind: 'nothing-ran', ms: performance.now() - startedAt, reason: 'packages' });
        if (runnable.skipped) return end.onEnded({ kind: 'nothing-ran', ms: performance.now() - startedAt, reason: 'noEmitOnError' });
        frame = startFrame(runnable, input.cv, end, startedAt, runnable.errors);
      })
      .catch((error: unknown) => end.onEnded({ kind: 'crashed', ms: performance.now() - startedAt, reason: String(error) }));
    return handle;
  }

  return {
    typescript,
    mountEditor: editing.mountEditor,
    mountOutput: editing.mountOutput,
    getCode: editing.getCode,
    version: editing.version,
    replaceCode: editing.replaceCode,
    undo: editing.undo,
    setOptions: editing.setOptions,
    check: editing.check,
    reveal: editing.reveal,
    commands: editing.commands,
    runCommand: editing.runCommand,
    run,
    dispose: () => {
      current?.stop();
      editing.dispose();
    },
  };
}
