// The requirement data for a repository (007 contracts/requirement-data.md):
// what the build writes and the site check compares the page with.
import { readCarried } from './carried.ts';
import { readRequirementData } from './read.ts';
import type { RequirementData } from './read.ts';
import { readVersion } from './version.ts';

export type { RequirementData, RequirementRecord, SpecRecord, TestReference } from './read.ts';
export type { Inline } from './inline.ts';

export function buildRequirementData(root: string): RequirementData {
  const version = readVersion(root);
  return readRequirementData(root, version, readCarried(root));
}
