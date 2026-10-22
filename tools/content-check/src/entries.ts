import type { FieldPath } from './json.ts';

// How a kind's entries are dated (FR-036): a start and end date, one date
// field, or not at all.
export type Dating = { range: true } | { range: false; field: string } | null;

export type EntryKind = {
  list: string[];
  fields: string[];
  dating: Dating;
  noun: string;
  plural: string;
};

const RANGE: Dating = { range: true };

// The entry kinds and their identifying fields (data-model.md, Entry and entry
// kinds). The keys are the `x-cv-reference` names.
export const ENTRY_KINDS: Record<string, EntryKind> = {
  profile: { list: ['basics', 'profiles'], fields: ['network'], dating: null, noun: 'profile', plural: 'profiles' },
  work: { list: ['work'], fields: ['name', 'position', 'startDate'], dating: RANGE, noun: 'work entry', plural: 'work entries' },
  volunteer: {
    list: ['volunteer'],
    fields: ['organization', 'position', 'startDate'],
    dating: RANGE,
    noun: 'volunteer entry',
    plural: 'volunteer entries',
  },
  education: {
    list: ['education'],
    fields: ['institution', 'area', 'studyType', 'startDate'],
    dating: RANGE,
    noun: 'education entry',
    plural: 'education entries',
  },
  project: { list: ['projects'], fields: ['name'], dating: RANGE, noun: 'project', plural: 'projects' },
  skill: { list: ['skills'], fields: ['name'], dating: null, noun: 'skill', plural: 'skills' },
  interest: { list: ['interests'], fields: ['name'], dating: null, noun: 'interest', plural: 'interests' },
  language: { list: ['languages'], fields: ['language'], dating: null, noun: 'language', plural: 'languages' },
  award: { list: ['awards'], fields: ['title', 'date'], dating: { range: false, field: 'date' }, noun: 'award', plural: 'awards' },
  certificate: {
    list: ['certificates'],
    fields: ['name', 'date'],
    dating: { range: false, field: 'date' },
    noun: 'certificate',
    plural: 'certificates',
  },
  publication: {
    list: ['publications'],
    fields: ['name', 'releaseDate'],
    dating: { range: false, field: 'releaseDate' },
    noun: 'publication',
    plural: 'publications',
  },
  reference: { list: ['references'], fields: ['name'], dating: null, noun: 'reference', plural: 'references' },
};

// Two entries are the same when this key is equal: their identifying fields,
// NFC-normalized, with a missing field as null. Case-sensitive (FR-014, FR-021).
export function identityKey(entry: unknown, kind: EntryKind): string {
  const record = entry !== null && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
  return JSON.stringify(
    kind.fields.map((field) => {
      const value = Object.hasOwn(record, field) ? record[field] : null;
      return typeof value === 'string' ? value.normalize('NFC') : value;
    }),
  );
}

// The entries of a kind's list, or none when it's absent or not an array.
export function entriesOf(resume: unknown, kind: EntryKind): { path: FieldPath; entry: unknown }[] {
  let list = resume;
  for (const part of kind.list) {
    if (list === null || typeof list !== 'object' || Array.isArray(list)) return [];
    list = (list as Record<string, unknown>)[part];
  }
  if (!Array.isArray(list)) return [];
  return list.map((entry, index) => ({ path: [...kind.list, index], entry }));
}
