// The Terminal's file system (006 research R9, data-model.md File system): a
// read-only tree built once from the CV and the spec list, two levels deep.
// Each file shows what its named command shows, through the same builders,
// so `cat` can't differ from the command (FR-047). Nothing can change it
// (FR-049).
import type { SpecEntry, SpecList } from '../../../../scripts/spec-list.ts';
import type { Block, Path } from './block.ts';
import { aboutBlock, aboutLines, contactBlock, contactLines, entryBlock, listBlock, shownEntries } from './cv.ts';
import type { CvInput, EntrySection, ListSection } from './cv.ts';

export type { Path };

export type File = { kind: 'file'; name: string; show: () => Block; text?: string };
export type Folder = { kind: 'folder'; name: string; children: readonly FsNode[] };
export type FsNode = Folder | File;

// What the file system shows that isn't the CV's: `cv.json`'s text, and
// `site`'s and `specs`' builders for `readme` and each spec's file.
export type FileBuilders = { cvJson: string; readme: () => Block; spec: (entry: SpecEntry) => Block };

const HOME = '~';

// A value with no accents, in lower case: how names are made and matched.
const folded = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// A file's name from a CV value (FR-044): no accents, lower case, every
// letter and digit of any script kept, every run of other characters one
// hyphen, trimmed; `fallback` when nothing is left.
export function fileName(value: string, fallback: string): string {
  const name = folded(value)
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return name === '' ? fallback : name;
}

// Names for a folder's entries, in order: a clash gets `-<start year>`, and
// one still left gets `-2`, `-3` after the first (FR-044).
export function folderNames(entries: readonly { name: string; start?: string | undefined }[]): string[] {
  const count = (names: readonly string[]) => names.reduce((counts, name) => counts.set(name, (counts.get(name) ?? 0) + 1), new Map<string, number>());
  const first = entries.map((entry) => entry.name);
  const clashes = count(first);
  const dated = entries.map((entry, index) => {
    const year = /^\d{4}/.exec(entry.start ?? '')?.[0];
    return clashes.get(first[index]!)! > 1 && year !== undefined ? `${first[index]}-${year}` : first[index]!;
  });
  const seen = new Map<string, number>();
  return dated.map((name) => {
    const times = (seen.get(name) ?? 0) + 1;
    seen.set(name, times);
    return times === 1 ? name : `${name}-${times}`;
  });
}

const NAME_FIELD: Record<EntrySection, string> = { work: 'name', projects: 'name', education: 'institution' };

function entryFolder(input: CvInput, section: EntrySection): Folder | null {
  const entries = shownEntries(input.resume, section) as Record<string, unknown>[];
  if (entries.length === 0) return null;
  const singular = input.text.terminal.singular[section];
  const names = folderNames(
    entries.map((entry) => {
      const value = entry[NAME_FIELD[section]];
      return { name: fileName(typeof value === 'string' ? value : '', singular), start: typeof entry.startDate === 'string' ? entry.startDate : undefined };
    }),
  );
  return { kind: 'folder', name: section, children: entries.map((entry, index) => ({ kind: 'file', name: names[index]!, show: () => entryBlock(input, section, entry, 1) })) };
}

function listFile(input: CvInput, section: ListSection): File | null {
  return shownEntries(input.resume, section).length === 0 ? null : { kind: 'file', name: section, show: () => listBlock(input, section) };
}

// The home folder, in the design's order (FR-043), empty sections left out.
export function buildFileSystem(input: CvInput, specs: SpecList, builders: FileBuilders): Folder {
  const children: (FsNode | null)[] = [
    { kind: 'file', name: 'cv.json', text: builders.cvJson, show: () => [{ kind: 'text', text: builders.cvJson }] },
    aboutLines(input).length === 0 ? null : { kind: 'file', name: 'about', show: () => aboutBlock(input) },
    contactLines(input).length === 0 ? null : { kind: 'file', name: 'contact', show: () => contactBlock(input) },
    entryFolder(input, 'work'),
    entryFolder(input, 'projects'),
    listFile(input, 'skills'),
    entryFolder(input, 'education'),
    listFile(input, 'languages'),
    listFile(input, 'interests'),
    { kind: 'file', name: 'readme', show: builders.readme },
    { kind: 'folder', name: 'specs', children: specs.map((entry) => ({ kind: 'file', name: entry.folder, show: () => builders.spec(entry) })) },
  ];
  return { kind: 'folder', name: HOME, children: children.filter((child): child is FsNode => child !== null) };
}

// Matched without regard to capitals or accents (FR-045), so a name typed as
// the CV writes it finds its file.
const childNamed = (folder: Folder, name: string) => folder.children.find((child) => folded(child.name) === folded(name)) ?? null;

// The node at a path, or null.
export function nodeAt(root: Folder, path: Path): FsNode | null {
  let node: FsNode = root;
  for (const part of path) {
    if (node.kind !== 'folder') return null;
    const next: FsNode | null = childNamed(node, part);
    if (next === null) return null;
    node = next;
  }
  return node;
}

// A typed path from the working folder, as the tree's own names, or null
// when nothing is there (FR-045). `~`, `/` and `~/…` start at home; `..` at
// home stays home.
export function resolve(root: Folder, typed: string, from: Path): Path | null {
  const fromHome = typed === HOME || typed.startsWith(`${HOME}/`);
  const absolute = fromHome || typed.startsWith('/');
  const parts = (fromHome ? typed.slice(HOME.length) : typed).split('/').filter((part) => part !== '' && part !== '.');
  const path: string[] = absolute ? [] : [...from];
  for (const part of parts) {
    if (part === '..') {
      path.pop();
      continue;
    }
    const folder = nodeAt(root, path);
    if (folder === null || folder.kind !== 'folder') return null;
    const child = childNamed(folder, part);
    if (child === null) return null;
    path.push(child.name);
  }
  return nodeAt(root, path) === null ? null : path;
}

// `~`, `~/work`, `~/work/acme` (FR-046).
export const formatPath = (path: Path): string => [HOME, ...path].join('/');
