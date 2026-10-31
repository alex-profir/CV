// `npm run test:engines`: the Playground's tests that depend on the browser's
// engine, its sandbox, memory and keys, run again in Firefox and in WebKit
// (008 research R25). `npm test` and pull requests run them in Chromium; this
// is the local full run's `engines` check. `PLAYGROUND_ENGINE` tells
// `packages/web/test/helpers/playground.ts` which engine to launch.
//
// It also runs the Playground's timing test with nothing else at work: within
// `npm test` other browsers would decide its result, so it only logs there.
import { spawnSync } from 'node:child_process';

const ENGINES = ['firefox', 'webkit'];

const ENGINE_TESTS = ['sandbox', 'memory', 'keys', 'probe', 'network', 'stuck', 'errors'].map((name) => `packages/web/test/playground/${name}.test.ts`);

let failed = false;
for (const engine of ENGINES) {
  process.stdout.write(`-- ${engine}\n`);
  const result = spawnSync('npx', ['vitest', 'run', '--project', 'slow', ...ENGINE_TESTS], { stdio: 'inherit', env: { ...process.env, PLAYGROUND_ENGINE: engine } });
  if (result.status !== 0) failed = true;
}
process.stdout.write('-- timing, alone\n');
const timed = spawnSync('npx', ['vitest', 'run', '--project', 'slow', 'packages/web/test/playground/performance.test.ts'], { stdio: 'inherit', env: { ...process.env, PLAYGROUND_TIMED: 'alone' } });
if (timed.status !== 0) failed = true;
process.exitCode = failed ? 1 : 0;
