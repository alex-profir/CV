// The real CV, read through the package exactly as later features read it.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { resume } from '@cv/content';
import { runCheck } from '../../../tools/content-check/src/check.ts';
import { RESUME_FILE } from '../../../tools/content-check/src/paths.ts';
import { REPO_ROOT } from '../../../tools/traceability/test/helpers/project.ts';

const RESUME_TEXT = fs.readFileSync(path.join(REPO_ROOT, RESUME_FILE), 'utf8');
const RAW = JSON.parse(RESUME_TEXT);

// Every string value in a JSON value, at any depth.
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

describe('002-cv-content-FR-001: the CV is one JSON Resume 1.3.1 document', () => {
  test('lives at packages/content/resume.json, declares 1.3.1 and passes the check', () => {
    expect(RAW.$schema).toBe('https://cdn.jsdelivr.net/npm/@jsonresume/schema@1.3.1/schema.json');
    const report = runCheck(REPO_ROOT);
    expect(report.problems.filter((problem) => problem.location.file === RESUME_FILE)).toEqual([]);
    expect(report.documents.find((document) => document.file === RESUME_FILE)?.state).toBe('checked');
  });
});

describe('002-cv-content-FR-002: the CV holds the owner\'s published sections', () => {
  test('basics and every required section are present and non-empty', () => {
    for (const key of ['name', 'label', 'summary'] as const) {
      expect(typeof RAW.basics[key]).toBe('string');
      expect(RAW.basics[key].length).toBeGreaterThan(0);
    }
    expect(Object.keys(RAW.basics.location).length).toBeGreaterThan(0);
    expect(RAW.basics.profiles.length).toBeGreaterThan(0);
    for (const section of ['work', 'education', 'skills', 'projects', 'languages', 'interests']) {
      expect(Array.isArray(RAW[section])).toBe(true);
      expect(RAW[section].length).toBeGreaterThan(0);
    }
  });
});

describe('002-cv-content-FR-003: the CV holds only what the owner publishes', () => {
  test('has an email and no phone, photo or street address', () => {
    expect(typeof RAW.basics.email).toBe('string');
    expect(RAW.basics.email.length).toBeGreaterThan(0);
    expect(RAW.basics.phone).toBeUndefined();
    expect(RAW.basics.image).toBeUndefined();
    expect(RAW.basics.location.address).toBeUndefined();
  });

  test('keeps no empty string for an unpublished detail', () => {
    expect(strings(RAW)).not.toContain('');
  });
});

describe('002-cv-content-FR-020: text reads back exactly as written', () => {
  test('non-ASCII values through @cv/content equal the file bytes', () => {
    const city = resume.basics?.location?.city;
    expect(city).toBe('Timișoara');
    expect(Buffer.from(city ?? '').equals(Buffer.from(RAW.basics.location.city))).toBe(true);
    expect(RESUME_TEXT).toContain(`"city": "${city}"`);

    const institution = resume.education?.[0]?.institution;
    expect(institution).toBe('Politehnica University of Timișoara');
    expect(RESUME_TEXT).toContain(`"institution": "${institution}"`);
    const fileBytes = fs.readFileSync(path.join(REPO_ROOT, RESUME_FILE));
    expect(fileBytes.includes(Buffer.from(`"${institution}"`))).toBe(true);
  });
});
