// The cv-app part (005 contracts/cli.md Parts): the CV app in each shell
// holds every shown field of the CV document, in order. Broken cases are
// copies of the repository with one change to the CV app, built (see 005
// tasks.md Notes).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { RESUME_FILE, runCheck } from '../src/check.ts';
import { expectedFields } from '../src/expected.ts';
import { renderProblem } from '../src/report.ts';
import { realSiteProject, replaceIn, seededCopy } from './helpers/root.ts';
import { REPO_ROOT } from './helpers/sites.ts';

vi.setConfig({ testTimeout: 180_000 });

const DOCUMENT = 'packages/web/src/cv/CvDocument.tsx';

// The CV app renders the document as a `div`; /cv renders it as `main`. A
// change made only for the `div` breaks the CV app alone.
const SECTIONS = 'const sections = SUPPORTED_SECTIONS.map(';

const resume = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, RESUME_FILE), 'utf8'));

describe('005-os-shell-FR-058: the CV app check opens the CV app in each shell and finds every field, in order', () => {
  test('on the real build the part passes in both shells', async () => {
    const report = await runCheck(realSiteProject(), { parts: ['cv-app'] });
    expect(report.results.map(({ page, variant, status }) => `${page} ${variant} ${status}`)).toEqual(['/ desktop/cv-app/1440px pass', '/ mobile/cv-app/375px pass']);
  });

  test("a copy whose CV app leaves out work[0].position fails with missing-field in both shells", async () => {
    const position: string = resume.work[0].position;
    const root = seededCopy((copy) =>
      replaceIn(copy, DOCUMENT, SECTIONS, `if (Root === 'div') resume = { ...resume, work: resume.work?.map((entry, index) => (index === 0 ? { ...entry, position: undefined } : entry)) };\n  ${SECTIONS}`),
    );
    const report = await runCheck(root, { parts: ['cv-app'] });
    expect(report.problems.map(renderProblem)).toEqual([
      `cv-app / desktop/cv-app/1440px missing-field work[0].position: ${JSON.stringify(position)} is not in the CV app`,
      `cv-app / mobile/cv-app/375px missing-field work[0].position: ${JSON.stringify(position)} is not in the CV app`,
    ]);
  });

  test('a copy whose CV app swaps two sections fails with out-of-order', async () => {
    const root = seededCopy((copy) =>
      replaceIn(copy, DOCUMENT, SECTIONS, `const sections = (Root === 'div' ? (['projects', 'work', 'skills', 'education', 'languages', 'interests'] as const) : SUPPORTED_SECTIONS).map(`),
    );
    const report = await runCheck(root, { parts: ['cv-app'] });
    expect(report.problems.length).toBeGreaterThan(0);
    expect(report.problems.every((problem) => problem.type === 'out-of-order')).toBe(true);
    expect(new Set(report.problems.map((problem) => problem.variant))).toEqual(new Set(['desktop/cv-app/1440px', 'mobile/cv-app/375px']));
    expect(report.problems[0]!.detail).toMatch(/^appears before /);
  });
});

describe('005-os-shell-FR-006: the CV app shows the same CV as /cv', () => {
  test("the part's expected fields are /cv's, read from the CV document", async () => {
    const fields = expectedFields(resume);
    expect(fields.length).toBeGreaterThan(0);
    expect(fields).toContainEqual({ path: 'work[0].position', text: resume.work[0].position });
    const report = await runCheck(realSiteProject(), { parts: ['cv-app', 'no-script'] });
    expect(report.problems).toEqual([]);
  });
});
