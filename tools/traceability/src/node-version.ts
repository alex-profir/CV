// The Node major version in .nvmrc and package.json engines. The permission
// model blocks the network only from Node 25, so on older versions the
// `traceability` script would run with no network guard (research R1, R9).
export const REQUIRED_NODE_MAJOR = 26;

// The message for a Node version too old to run the check, given as in
// process.versions.node, or null when it's recent enough.
export function nodeVersionProblem(version: string): string | null {
  if (Number(version.split('.')[0]) >= REQUIRED_NODE_MAJOR) return null;
  return `traceability check needs Node ${REQUIRED_NODE_MAJOR} or later (see .nvmrc) to block network access, but this is Node ${version}`;
}
