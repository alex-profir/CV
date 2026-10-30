// The entry point of `npm run verify` and `npm run signoff`
// (contracts/local-verify.md). It's plain JavaScript, like the other tools'
// entry points, and loads the TypeScript only after the Node version is
// known to be recent enough. 001's message mentions blocking network access,
// which isn't this tool's reason, so it has its own, like the site check's.
import { REQUIRED_NODE_MAJOR } from '../../traceability/src/node-version.js';

const USAGE = 'usage: npm run verify | npm run signoff (takes no arguments)';

const version = process.versions.node;
const [command, ...rest] = process.argv.slice(2);

if (Number(version.split('.')[0]) < REQUIRED_NODE_MAJOR) {
  process.stderr.write(`local full run needs Node ${REQUIRED_NODE_MAJOR} or later (see .nvmrc), but this is Node ${version}\n`);
  process.exitCode = 2;
} else if ((command !== 'verify' && command !== 'signoff') || rest.length > 0) {
  process.stderr.write(`${USAGE}\n`);
  process.exitCode = 2;
} else {
  try {
    const options = { root: process.cwd(), env: process.env };
    if (command === 'verify') {
      const { verify } = await import('./verify.ts');
      // The only place the real Chromium probe is loaded: it imports
      // playwright, which the fast set's tests must not reach (research R14,
      // rule 3). It's loaded when the probe runs, after the clean-tree check.
      const hasChromium = async () => (await import('../../site-check/src/browser.ts')).hasChromium();
      const hasOtherEngines = async () => (await import('../../site-check/src/browser.ts')).hasOtherEngines();
      process.exitCode = await verify({ ...options, prerequisites: { hasChromium, hasOtherEngines } });
    } else {
      const { signoff } = await import('./signoff.ts');
      process.exitCode = await signoff(options);
    }
  } catch (error) {
    process.stderr.write(`npm run ${command} could not start: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  }
}
