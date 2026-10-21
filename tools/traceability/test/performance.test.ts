import { describe, expect, test } from 'vitest';
import { makeProject, runCli } from './helpers/project.ts';

const SPECS = 50;
const REQUIREMENTS = 40;
const TEST_FILES = 200;
const TESTS_PER_FILE = 10;

describe('performance (SC-004)', () => {
  test('checks 50 specs and 2,000 tests in under 10 seconds', { timeout: 60_000 }, () => {
    const files: Record<string, string> = {};
    const ids: string[] = [];
    for (let s = 1; s <= SPECS; s++) {
      const feature = `${String(s + 100).padStart(3, '0')}-generated`;
      const entries = [];
      for (let r = 1; r <= REQUIREMENTS; r++) {
        const id = `FR-${String(r).padStart(3, '0')}`;
        entries.push(`- **${id}**: Requirement ${r}.`);
        ids.push(`${feature}-${id}`);
      }
      files[`specs/${feature}/spec.md`] = ['# Spec', '', '**Status**: Approved', '', '### Functional Requirements', '', ...entries, ''].join('\n');
    }
    for (let f = 0; f < TEST_FILES; f++) {
      const tests = [];
      for (let t = 0; t < TESTS_PER_FILE; t++) {
        tests.push(`test('covers ${ids[f * TESTS_PER_FILE + t]}', () => {\n  expect(1).toBe(1);\n});`);
      }
      files[`src/generated-${f}.test.ts`] = tests.join('\n');
    }
    const root = makeProject(files);

    const start = performance.now();
    const result = runCli(root);
    const elapsed = performance.now() - start;

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('PASS: all 2000 active requirements in 50 approved specs are covered.');
    expect(elapsed).toBeLessThan(10_000);
  });
});
