// The runner's two scripts (008 research R17, R18, contracts/runner.md The
// frame): the bootstrap, the frame's one script, and the runtime, the first
// part of the worker's script, each bundled to classic script text before
// the engine build, which imports them from `virtual:playground-runner` with
// the frame's policy. The policy allows the bootstrap by its hash and
// nothing else, so the build fails if the two differ.
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'vite';
import type { Plugin, Rolldown } from 'vite';
import { checkProgramScripts, checkRunnerScripts, programPolicy, runnerPolicy } from './runner-policy.ts';
import type { RunnerScripts } from './runner-policy.ts';

export type { RunnerScripts };

const RUNNER_DIR = path.resolve(import.meta.dirname, '../src/apps/playground/engine/runner');

export const RUNNER_MODULE = 'virtual:playground-runner';
const RESOLVED = `\0${RUNNER_MODULE}`;

const PROGRAM_RUNTIME = path.resolve(import.meta.dirname, '../src/apps/terminal/program/runtime/main.ts');

// The types `ts-node` checks against (research R12), as text.
const NODE_TYPES_FILE = path.resolve(import.meta.dirname, '../src/apps/terminal/program/runtime/node.d.ts');
export const PROGRAM_MODULE = 'virtual:terminal-program';
const PROGRAM_RESOLVED = `\0${PROGRAM_MODULE}`;

type Script = { code: string; modules: readonly string[] };

// One script, bundled with its imports into one classic script.
async function scriptBuild(entry: string): Promise<Script> {
  const result = await build({
    root: path.dirname(RUNNER_DIR),
    configFile: false,
    publicDir: false,
    logLevel: 'warn',
    build: {
      write: false,
      minify: true,
      emptyOutDir: false,
      reportCompressedSize: false,
      lib: { entry, formats: ['iife'], name: 'playgroundRunner' },
      rolldownOptions: { checks: { pluginTimings: false } },
    },
  });
  const outputs = (Array.isArray(result) ? result : [result]) as Rolldown.RolldownOutput[];
  const chunks = outputs.flatMap((output) => output.output).filter((item): item is Rolldown.OutputChunk => item.type === 'chunk');
  if (chunks.length !== 1) throw new Error(`the script ${path.basename(entry)} built into ${chunks.length} scripts, not one`);
  return { code: chunks[0]!.code.trim(), modules: chunks[0]!.moduleIds };
}

const scriptText = async (file: string): Promise<string> => (await scriptBuild(path.join(RUNNER_DIR, file))).code;

export async function bundleRunner(): Promise<RunnerScripts> {
  const bootstrap = await scriptText('bootstrap.ts');
  const runtime = await scriptText('runtime.ts');
  const scripts = { bootstrap, runtime, policy: runnerPolicy(bootstrap) };
  checkRunnerScripts(scripts);
  return scripts;
}

// A program's scripts (009 research R2, R13): 008's bootstrap, unchanged, with
// the program's policy, and the runtime, with what it bundles for its licenses.
export async function bundleProgram(): Promise<{ scripts: RunnerScripts & { nodeTypes: string }; modules: readonly string[] }> {
  const bootstrap = await scriptText('bootstrap.ts');
  const runtime = await scriptBuild(PROGRAM_RUNTIME);
  const scripts = { bootstrap, runtime: runtime.code, policy: programPolicy(bootstrap) };
  checkProgramScripts(scripts);
  return { scripts: { ...scripts, nodeTypes: fs.readFileSync(NODE_TYPES_FILE, 'utf8') }, modules: runtime.modules };
}

// `virtual:terminal-program` for the program bundle's build.
export function programPlugin(scripts: RunnerScripts & { nodeTypes: string }): Plugin {
  return {
    name: 'cv:terminal-program',
    resolveId: (id) => (id === PROGRAM_MODULE ? PROGRAM_RESOLVED : null),
    load: (id) => (id === PROGRAM_RESOLVED ? Object.entries(scripts).map(([name, text]) => `export const ${name} = ${JSON.stringify(text)};`).join('\n') : null),
  };
}

// `virtual:playground-runner` for the engine's build.
export function runnerPlugin(scripts: RunnerScripts): Plugin {
  return {
    name: 'cv:playground-runner',
    resolveId: (id) => (id === RUNNER_MODULE ? RESOLVED : null),
    load: (id) => (id === RESOLVED ? Object.entries(scripts).map(([name, text]) => `export const ${name} = ${JSON.stringify(text)};`).join('\n') : null),
  };
}
