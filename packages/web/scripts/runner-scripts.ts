// The runner's two scripts (008 research R17, R18, contracts/runner.md The
// frame): the bootstrap, the frame's one script, and the runtime, the first
// part of the worker's script, each bundled to classic script text before
// the engine build, which imports them from `virtual:playground-runner` with
// the frame's policy. The policy allows the bootstrap by its hash and
// nothing else, so the build fails if the two differ.
import path from 'node:path';
import { build } from 'vite';
import type { Plugin, Rolldown } from 'vite';
import { checkRunnerScripts, runnerPolicy } from './runner-policy.ts';
import type { RunnerScripts } from './runner-policy.ts';

export type { RunnerScripts };

const RUNNER_DIR = path.resolve(import.meta.dirname, '../src/apps/playground/engine/runner');

export const RUNNER_MODULE = 'virtual:playground-runner';
const RESOLVED = `\0${RUNNER_MODULE}`;

// One script, bundled with its imports into one classic script.
async function scriptText(file: string): Promise<string> {
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
      lib: { entry: path.join(RUNNER_DIR, file), formats: ['iife'], name: 'playgroundRunner' },
      rolldownOptions: { checks: { pluginTimings: false } },
    },
  });
  const outputs = (Array.isArray(result) ? result : [result]) as Rolldown.RolldownOutput[];
  const chunks = outputs.flatMap((output) => output.output).filter((item): item is Rolldown.OutputChunk => item.type === 'chunk');
  if (chunks.length !== 1) throw new Error(`the runner's ${file} built into ${chunks.length} scripts, not one`);
  return chunks[0]!.code.trim();
}

export async function bundleRunner(): Promise<RunnerScripts> {
  const bootstrap = await scriptText('bootstrap.ts');
  const runtime = await scriptText('runtime.ts');
  const scripts = { bootstrap, runtime, policy: runnerPolicy(bootstrap) };
  checkRunnerScripts(scripts);
  return scripts;
}

// `virtual:playground-runner` for the engine's build.
export function runnerPlugin(scripts: RunnerScripts): Plugin {
  return {
    name: 'cv:playground-runner',
    resolveId: (id) => (id === RUNNER_MODULE ? RESOLVED : null),
    load: (id) => (id === RESOLVED ? Object.entries(scripts).map(([name, text]) => `export const ${name} = ${JSON.stringify(text)};`).join('\n') : null),
  };
}
