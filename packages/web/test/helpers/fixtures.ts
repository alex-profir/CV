// The fixture CVs of `test/__fixtures__/` (README.md there lists what each
// one seeds).
import fs from 'node:fs';
import path from 'node:path';
import type { Resume } from '@cv/content';

const DIR = path.resolve(import.meta.dirname, '../__fixtures__');

export const FIXTURE_NAMES = [
  'every-field',
  'three-projects',
  'no-name',
  'no-summary',
  'nothing-optional',
  'empty-sections',
  'partial-dates',
  'no-url-no-dates',
  'entry-without-heading',
  'long-words',
  'non-ascii',
  'print-spacer',
] as const;

export type FixtureName = (typeof FIXTURE_NAMES)[number];

// A fresh copy each call, so a test can change it.
export function fixture(name: FixtureName): Resume {
  return JSON.parse(fs.readFileSync(path.join(DIR, `${name}.json`), 'utf8')) as Resume;
}
