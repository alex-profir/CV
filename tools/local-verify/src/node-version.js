// The Node-version gate of `npm run verify`, `verify:feature` and `signoff`, apart
// from main.js so a fast-set test can import it: main.js loads the site
// check's Chromium probe, which the fast set must not reach (research R14,
// rule 3).
import { REQUIRED_NODE_MAJOR } from '../../traceability/src/node-version.js';

/**
 * The message for a Node version too old to run the command, given as in
 * process.versions.node, or null when it's recent enough. It names the
 * command that was run, and says how to fix it like the other prerequisite
 * messages do (FR-032).
 * @param {string} version
 * @param {string | undefined} command
 * @returns {string | null}
 */
export function nodeVersionProblem(version, command) {
  if (Number(version.split('.')[0]) >= REQUIRED_NODE_MAJOR) return null;
  const names = { quick: 'npm run verify', verify: 'npm run verify:feature', signoff: 'npm run signoff' };
  const name = (command !== undefined && Object.hasOwn(names, command) && names[/** @type {keyof typeof names} */ (command)]) || 'local full run';
  return `${name} needs Node ${REQUIRED_NODE_MAJOR} or later (see .nvmrc), but this is Node ${version}: run nvm use`;
}
