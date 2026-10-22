// The entry point of `npm run traceability`. It's plain JavaScript, and it
// loads the check only after the Node version is known to be recent enough.
// An older Node, or one that can't load TypeScript, then gets a clear message
// and exit code 2 (contracts/cli.md) instead of a crash that exits with 1, the
// code for problems found.
import { nodeVersionProblem } from './node-version.js';

const versionProblem = nodeVersionProblem(process.versions.node, 'traceability check');

if (versionProblem !== null) {
  process.stderr.write(`${versionProblem}\n`);
  process.exitCode = 2;
} else {
  try {
    await import('./cli.ts');
  } catch (error) {
    process.stderr.write(`traceability check could not start: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  }
}
