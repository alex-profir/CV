// The Node major version in .nvmrc and package.json engines. The permission
// model blocks the network only from Node 25, so on older versions the
// `traceability` and `content-check` scripts would run with no network guard
// (research R1, R9).
// This file is plain JavaScript so that main.js can load it on any Node.
export const REQUIRED_NODE_MAJOR = 26;

/**
 * The message for a Node version too old to run the check, given as in
 * process.versions.node, or null when it's recent enough.
 * @param {string} version
 * @param {string} check the check's name, which starts the message
 * @returns {string | null}
 */
export function nodeVersionProblem(version, check) {
  if (Number(version.split('.')[0]) >= REQUIRED_NODE_MAJOR) return null;
  return `${check} needs Node ${REQUIRED_NODE_MAJOR} or later (see .nvmrc) to block network access, but this is Node ${version}`;
}
