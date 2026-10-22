import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { RESUME_FILE } from '../src/paths.ts';
import { deriveSchema, loadOfficialSchema } from '../src/schema.ts';
import { REPO_ROOT, SAMPLE_RESUME, contentFiles, makeProject } from './helpers/cli.ts';

type Json = Record<string, any>;

function sample(change: (resume: Json) => void) {
  const resume = structuredClone(SAMPLE_RESUME) as Json;
  change(resume);
  const text = `${JSON.stringify(resume, null, 2)}\n`;
  return { text, report: runCheck(makeProject(contentFiles({ resume: text }))) };
}

// The 1-based line and column of the `n`th occurrence of `needle`.
function position(text: string, needle: string, n = 1): { line: number; column: number } {
  let index = -1;
  for (let i = 0; i < n; i += 1) index = text.indexOf(needle, index + 1);
  const before = text.slice(0, index);
  return { line: before.split('\n').length, column: index - before.lastIndexOf('\n') };
}

describe('002-cv-content-FR-001: the check uses the official JSON Resume 1.3.1 schema', () => {
  test('reads schema.json from the installed @jsonresume/schema 1.3.1', () => {
    const { schema, version } = loadOfficialSchema();
    const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'node_modules/@jsonresume/schema/package.json'), 'utf8'));
    expect(pkg.version).toBe('1.3.1');
    expect(version).toBe('1.3.1');
    expect(schema).toEqual(JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'node_modules/@jsonresume/schema/schema.json'), 'utf8')));
    expect(Object.keys((schema as Json).properties)).toEqual([
      '$schema',
      'basics',
      'work',
      'volunteer',
      'education',
      'awards',
      'certificates',
      'publications',
      'skills',
      'languages',
      'interests',
      'references',
      'projects',
      'meta',
    ]);
  });
});

describe('002-cv-content-FR-007: the CV is validated against the official schema, made strict', () => {
  test('the derived schema differs only by additionalProperties false and removed formats', () => {
    const { schema: official } = loadOfficialSchema();
    const before = structuredClone(official);
    const { schema: derived, formats } = deriveSchema(official);
    expect(official).toEqual(before);

    const removed: { format: string; at: string }[] = [];
    const walk = (a: unknown, b: unknown, at: string) => {
      if (a === null || typeof a !== 'object') {
        expect(b, at).toEqual(a);
        return;
      }
      const original = a as Json;
      const copy = b as Json;
      for (const key of new Set([...Object.keys(original), ...Object.keys(copy)])) {
        const here = `${at}/${key}`;
        if (key === 'additionalProperties' && !Array.isArray(a) && 'properties' in original) {
          expect(copy[key], here).toBe(false);
        } else if (key === 'format' && typeof original[key] === 'string') {
          expect(copy[key], here).toBeUndefined();
          removed.push({ format: original[key], at: here });
        } else {
          expect(key in copy, here).toBe(key in original);
          walk(original[key], copy[key], here);
        }
      }
      if (!Array.isArray(a) && 'properties' in original) expect(copy.additionalProperties, at).toBe(false);
    };
    walk(official, derived, '#');

    expect(removed.length).toBeGreaterThan(0);
    expect(formats.map((entry) => entry.format).sort()).toEqual(removed.map((entry) => entry.format).sort());
    expect(formats).toContainEqual({ pattern: ['basics', 'email'], format: 'email' });
    expect(formats).toContainEqual({ pattern: ['basics', 'profiles', '*', 'url'], format: 'uri' });
    expect(formats).toContainEqual({ pattern: ['work', '*', 'url'], format: 'uri' });
  });
});

describe('002-cv-content-FR-008: fields outside the standard are rejected at every depth', () => {
  const cases: { name: string; change: (resume: Json) => void; subject: string; key: string }[] = [
    { name: 'basics.picture', change: (r) => (r.basics.picture = 'https://cdn.test/me.jpg'), subject: 'basics.picture', key: '"picture"' },
    { name: 'work[0].featured', change: (r) => (r.work[0].featured = true), subject: 'work[0].featured', key: '"featured"' },
    { name: 'in basics.location', change: (r) => (r.basics.location.district = 'Centru'), subject: 'basics.location.district', key: '"district"' },
    { name: 'in meta', change: (r) => (r.meta = { theme: 'even' }), subject: 'meta.theme', key: '"theme"' },
    { name: 'in projects[0]', change: (r) => (r.projects[0].stars = 5), subject: 'projects[0].stars', key: '"stars"' },
    { name: 'at the top level', change: (r) => (r.theme = 'even'), subject: 'theme', key: '"theme"' },
  ];

  for (const { name, change, subject, key } of cases) {
    test(`an unknown field ${name} is one undefined-field at its key`, () => {
      const { text, report } = sample(change);
      expect(report.problems).toEqual([
        {
          type: 'undefined-field',
          subject,
          location: { file: RESUME_FILE, ...position(text, key) },
          detail: 'not a field defined by JSON Resume 1.3.1',
        },
      ]);
    });
  }
});
