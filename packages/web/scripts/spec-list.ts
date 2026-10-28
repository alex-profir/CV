// The spec list (006 research R10, contracts/site.md The spec list): every
// `specs/<NNN-name>/spec.md` read when the site is built, with 001's own spec
// reader, so a spec's status and its count of active requirements are what
// `npm run traceability` reads. It reaches the bundle as the virtual module
// `virtual:cv-spec-list`, which only `src/apps/terminal/data.ts` imports.
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { specFeature } from '../../../tools/traceability/src/files.ts';
import { compare } from '../../../tools/traceability/src/report.ts';
import { parseSpec, requirementsOf } from '../../../tools/traceability/src/specs.ts';

export type SpecEntry = {
  // '006', from the folder name.
  number: string;
  // '006-terminal'.
  folder: string;
  // The spec's name, after `Feature Specification: ` in its first heading.
  name: string;
  status: 'Approved' | 'Draft' | 'Invalid';
  // Active requirements, as 001 counts them.
  requirements: number;
};

export type SpecList = readonly SpecEntry[];

// The repository this script is part of.
export const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '../../..');

const MODULE = 'virtual:cv-spec-list';
const RESOLVED = `\0${MODULE}`;
const NUMBERED = /^(\d+)-/;
const TITLE = /^#\s+Feature Specification:\s*(.+?)\s*$/m;

export const EMPTY_MESSAGE = 'the spec list is empty';

// The spec files the list reads, with their folders, in numbered order.
function specFiles(root: string): { folder: string; file: string }[] {
  let names: string[];
  try {
    names = fs.readdirSync(path.join(root, 'specs'));
  } catch {
    return [];
  }
  return names
    .filter((name) => NUMBERED.test(name) && specFeature(`specs/${name}`) === name)
    .sort(compare)
    .map((folder) => ({ folder, file: path.join(root, 'specs', folder, 'spec.md') }));
}

export function readSpecList(root: string = REPOSITORY_ROOT): SpecList {
  const list: SpecEntry[] = [];
  for (const { folder, file } of specFiles(root)) {
    let text: string;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      // 001's check reports an unreadable spec; the list leaves it out.
      continue;
    }
    const spec = parseSpec(folder, `specs/${folder}/spec.md`, text);
    const requirements = requirementsOf(spec).filter((requirement) => requirement.state === 'active').length;
    list.push({ number: NUMBERED.exec(folder)![1]!, folder, name: TITLE.exec(text)?.[1] ?? folder, status: spec.status, requirements });
  }
  return list;
}

// Throws `the spec list is empty` when the root holds no spec: the build ran
// from the wrong root.
export function checkSpecList(root: string = REPOSITORY_ROOT): SpecList {
  const list = readSpecList(root);
  if (list.length === 0) throw new Error(EMPTY_MESSAGE);
  return list;
}

export function specListPlugin(root: string = REPOSITORY_ROOT): Plugin {
  return {
    name: 'cv-spec-list',
    resolveId: (id) => (id === MODULE ? RESOLVED : null),
    load(id) {
      if (id !== RESOLVED) return null;
      const list = checkSpecList(root);
      for (const { folder } of list) this.addWatchFile(path.join(root, 'specs', folder, 'spec.md'));
      return `export default ${JSON.stringify(list)};`;
    },
  };
}
