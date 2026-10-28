// The no-script part (research R14): the expected fields come from the CV
// document, and /cv shows them all, in order, with scripting off.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { runCheck } from '../src/check.ts';
import { expectedFields } from '../src/expected.ts';
import { renderProblem } from '../src/report.ts';
import { realSiteProject, replaceIn, seededCopy } from './helpers/root.ts';
import { fixture, siteProject } from './helpers/sites.ts';

vi.setConfig({ testTimeout: 120_000 });

const MINIMAL = fixture('minimal');

const read = (file: string) => fs.readFileSync(path.join(MINIMAL, file), 'utf8');

const CV = 'packages/web/dist/site/cv.html';

describe('004-cv-page-FR-052: with scripting off, /cv holds every shown field of the CV document, in order', () => {
  test('the expected fields are read from the CV document: a highlight added to it is expected, and fails when the page lacks it', async () => {
    const resume = JSON.parse(read('packages/content/resume.json'));
    const before = expectedFields(resume).length;
    resume.work[0].highlights.push('Wrote the second highlight.');
    expect(expectedFields(resume)).toHaveLength(before + 1);
    expect(expectedFields(resume)).toContainEqual({ path: 'work[0].highlights[1]', text: 'Wrote the second highlight.' });
    const root = siteProject({ 'packages/content/resume.json': JSON.stringify(resume) });
    const report = await runCheck(root, { parts: ['no-script'] });
    expect(report.problems.map(renderProblem)).toEqual([
      'no-script /cv 320px missing-field work[0].highlights[1]: "Wrote the second highlight." is not in the page with scripting off',
      'no-script /cv 1440px missing-field work[0].highlights[1]: "Wrote the second highlight." is not in the page with scripting off',
    ]);
  });

  test('a section moved out of order fails as out-of-order', async () => {
    const html = read(CV);
    const skills = /<section aria-labelledby="section-skills">.*?<\/section>/.exec(html)![0];
    const work = /<section aria-labelledby="section-work">.*?<\/section>/.exec(html)![0];
    const swapped = html.replace(work, '\u0000').replace(skills, work).replace('\u0000', skills);
    const report = await runCheck(siteProject({ [CV]: swapped }), { parts: ['no-script'] });
    const order = report.problems.filter((problem) => problem.type === 'out-of-order');
    expect(order.map((problem) => problem.variant)).toEqual(['320px', '1440px']);
    expect(order[0]!.subject).toMatch(/^skills\[0\]\./);
    expect(order[0]!.detail).toMatch(/^appears before work\[0\]\./);
  });

  test('a page whose style sheet did not apply fails as unstyled', async () => {
    const report = await runCheck(siteProject({ [CV]: read(CV).replace('<link rel="stylesheet" href="/assets/site.css">', '') }), { parts: ['no-script'] });
    expect(report.problems.map(renderProblem)).toEqual([
      'no-script /cv 320px unstyled body: the style sheet did not apply (background is rgba(0, 0, 0, 0), expected the background token)',
      'no-script /cv 1440px unstyled body: the style sheet did not apply (background is rgba(0, 0, 0, 0), expected the background token)',
    ]);
  });

  test('minimal/ passes at 320 and 1440 px', async () => {
    const report = await runCheck(MINIMAL, { parts: ['no-script'] });
    expect(report.results.map((result) => `${result.page} ${result.variant} ${result.status}`)).toEqual(['/cv 320px pass', '/cv 1440px pass']);
  });
});

describe('004-cv-page-FR-014: the full content of /cv is in the page the server sends', () => {
  test('script-only-projects/ fails with the project fields a script inserts', async () => {
    const report = await runCheck(fixture('script-only-projects'), { parts: ['no-script'] });
    for (const variant of ['320px', '1440px']) {
      expect(report.problems.filter((problem) => problem.variant === variant).map((problem) => `${problem.type} ${problem.subject}`)).toEqual([
        'missing-field projects[0].startDate',
        'missing-field projects[0].name',
        'missing-field projects[0].description',
      ]);
    }
  });
});

describe('004-cv-page-FR-015: no page shows a control that needs a script', () => {
  test('has-button/ fails, naming the button', async () => {
    const report = await runCheck(fixture('has-button'), { parts: ['no-script'] });
    expect(report.problems.map((problem) => `${problem.variant} ${problem.type} ${problem.subject}`)).toEqual(['320px script-only-control button', '1440px script-only-control button']);
  });
});

describe('005-os-shell-FR-049: with scripting off, the root leads to the CV and shows no control', () => {
  test("on the real build the root passes at 320 and 1440 px: the site's name, the link to /cv, styled, no control", async () => {
    const report = await runCheck(realSiteProject(), { parts: ['no-script'] });
    expect(report.problems).toEqual([]);
    expect(report.results.filter((result) => result.page === '/').map((result) => result.variant)).toEqual(['320px', '1440px']);
  });

  test('a copy whose root shows the dock with scripting off fails with visible-control', async () => {
    const root = seededCopy((copy) => replaceIn(copy, 'packages/web/src/styles/os.css', 'html:not([data-shell]) #os,\nhtml[data-shell] .no-script {', 'html[data-shell] .no-script {'));
    const report = await runCheck(root, { parts: ['no-script'] });
    const lines = report.problems.map(renderProblem);
    for (const variant of ['320px', '1440px']) {
      expect(lines).toContainEqual(expect.stringMatching(new RegExp(`^no-script / ${variant} visible-control button\\.dock-item\\S*: a control is shown with scripting off$`)));
    }
    expect(report.problems.filter((problem) => problem.page === '/cv')).toEqual([]);
  });
});
