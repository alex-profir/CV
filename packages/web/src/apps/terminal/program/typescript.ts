// TypeScript for a program (009 research R12), in the program bundle. It gets the
// Playground's copy through 008's loader, reporting progress, without opening the
// engine: its style and entry do nothing here, so Monaco never loads on the page. The
// loader waits and retries while offline, as the Playground's window wants; a program
// can't wait, so its `offline` state ends the run.
import type { CompileRequest, CompileResult } from '../../playground/engine/compile.ts';
import { NODE_TYPES } from '../../playground/engine/compile.ts';
import { loadEngine } from '../../playground/engine/loader.ts';
import type { LoaderEnv } from '../../playground/engine/loader.ts';
import type { EngineModule } from '../../playground/engine/contract.ts';
import { resolveModuleFile } from './messages.ts';
import type { ProgramRequest } from './messages.ts';

export type CompilerWorker = {
  postMessage(message: CompileRequest): void;
  terminate(): void;
  onmessage: ((event: { data: CompileResult }) => void) | null;
  onerror: ((event: unknown) => void) | null;
};

export type CompilerEnv = {
  manifest: string;
  bytes: number;
  loader: LoaderEnv;
  nodeTypes: string;
  makeWorker(address: string): CompilerWorker;
};

export type CompileOutcome = { kind: 'done'; result: CompileResult } | { kind: 'offline' } | { kind: 'failed' };

const OPENS_NOTHING = { linkStyle: async () => undefined, importModule: async () => ({}) as EngineModule };

const TS_FILE = /\.[mc]?ts$/;

// The file the script names, whichever way it's named, as the runtime will find it.
function scriptFile(request: ProgramRequest): string {
  const kinds = new Map(request.files.entries.map((entry) => [entry.path, entry.kind]));
  return resolveModuleFile(request.script!, request.command === 'ts-node', (path) => kinds.get(path)) ?? request.script!;
}

// Which programs need it: `ts-node` always, and `node` for a TypeScript file.
export const needsCompiler = (request: ProgramRequest): boolean => request.script !== null && (request.command === 'ts-node' || TS_FILE.test(scriptFile(request)));

export function compileRequest(request: ProgramRequest, nodeTypes: string): CompileRequest {
  const files: Record<string, string> = { [NODE_TYPES]: nodeTypes };
  for (const entry of request.files.entries) if (entry.kind === 'file' && entry.binary !== true && entry.text !== undefined) files[entry.path] = entry.text;
  return { root: scriptFile(request), mode: request.command === 'ts-node' ? 'check' : 'strip', files };
}

const relativeTo = (cwd: string, path: string) => (path.startsWith(`${cwd}/`) ? path.slice(cwd.length + 1) : path);

// contracts/commands.md's form of a type error.
export function typeErrorText(result: CompileResult, cwd: string): string {
  const lines = result.diagnostics.map(({ file, line, column, code, message }) => `${relativeTo(cwd, file)}(${line},${column}): error TS${code}: ${message}`);
  return `TSError: Unable to compile TypeScript:\n${lines.join('\n')}\n`;
}

// The copy of TypeScript, then its answer. `signal` ends the wait, with `failed`.
export async function compileProgram(env: CompilerEnv, request: ProgramRequest, onProgress: (step: 0 | 1 | 2 | 3 | 4) => void, signal: AbortSignal): Promise<CompileOutcome> {
  const stop = new AbortController();
  const abort = () => stop.abort(signal.reason);
  if (signal.aborted) abort();
  else signal.addEventListener('abort', abort, { once: true });
  let offline = false;
  let told = -1;
  let address: string | undefined;
  try {
    const { manifest } = await loadEngine(
      env.manifest,
      env.bytes,
      {
        onState(state) {
          if (state.kind === 'downloading' && state.announcedStep !== told) {
            told = state.announcedStep;
            onProgress(state.announcedStep);
          } else if (state.kind === 'offline') offline = true;
        },
      },
      stop.signal,
      // A program doesn't wait for the network: the wait ends the load.
      { ...env.loader, ...OPENS_NOTHING, waitForRetry: () => Promise.reject(new Error('offline')) },
    );
    address = manifest.compiler;
  } catch {
    return offline ? { kind: 'offline' } : { kind: 'failed' };
  } finally {
    signal.removeEventListener('abort', abort);
  }
  if (typeof address !== 'string' || signal.aborted) return { kind: 'failed' };
  return new Promise((resolve) => {
    const worker = env.makeWorker(address);
    const finish = (outcome: CompileOutcome) => {
      signal.removeEventListener('abort', cancelled);
      worker.terminate();
      resolve(outcome);
    };
    const cancelled = () => finish({ kind: 'failed' });
    signal.addEventListener('abort', cancelled, { once: true });
    worker.onmessage = (event) => finish({ kind: 'done', result: event.data });
    worker.onerror = () => finish({ kind: 'failed' });
    worker.postMessage(compileRequest(request, env.nodeTypes));
  });
}
