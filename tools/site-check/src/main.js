// The entry point of `npm run site-check`, after the build. It's plain
// JavaScript, and it loads the check only after the Node version is known to
// be recent enough, so an older Node gets a clear message and exit code 2
// (contracts/cli.md) instead of a crash. 001's message mentions blocking
// network access, which this check does in the browser instead (research
// R17), so it has its own.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REQUIRED_NODE_MAJOR } from '../../traceability/src/node-version.js';

/**
 * The message for a Node version too old to run the check, given as in
 * process.versions.node, or null when it's recent enough.
 * @param {string} version
 * @returns {string | null}
 */
export function nodeVersionProblem(version) {
  if (Number(version.split('.')[0]) >= REQUIRED_NODE_MAJOR) return null;
  return `site check needs Node ${REQUIRED_NODE_MAJOR} or later (see .nvmrc), but this is Node ${version}`;
}

// Run as a script, not when a test imports the function above. Compared by
// path because `import.meta.main` is missing on the old versions this gate
// is for.
const isScript = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isScript) {
  const versionProblem = nodeVersionProblem(process.versions.node);
  if (versionProblem !== null) {
    process.stderr.write(`${versionProblem}\n`);
    process.exitCode = 2;
  } else {
    try {
      await import('./cli.ts');
    } catch (error) {
      process.stderr.write(`site check could not start: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 2;
    }
  }
}
