// The engine's entry (contracts/engine.md, research R2, R3): built apart from
// the `os` script into /playground/<engine-hash>/ and imported by the loader
// at run time. Nothing in the `os` script imports this module.
import './editor.css';
import type { Engine, EngineInit, RunHandle } from './contract.ts';
import { createEditing } from './editor.ts';

export const api = 1;

export async function createEngine(init: EngineInit): Promise<Engine> {
  const editing = createEditing(init);
  const worker = await editing.worker();
  const typescript = await worker.getVersion();
  editing.check();
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
    run: (): RunHandle => ({ stop: () => undefined }),
    dispose: editing.dispose,
  };
}
