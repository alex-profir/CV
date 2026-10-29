// The offline part (research R4, R16): one visit online, then the network
// off and the server stopped.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { runCheck } from '../src/check.ts';
import { TERMINAL_COMMANDS, rootOfflineVariants, terminalOfflineVariants } from '../src/parts/offline.ts';
import { renderProblem } from '../src/report.ts';
import { realSiteProject, replaceIn, seededCopy } from './helpers/root.ts';
import { fixture } from './helpers/sites.ts';

vi.setConfig({ testTimeout: 300_000 });

const OS_NOT_STORED = (copy: string) =>
  replaceIn(copy, 'packages/web/src/sw/service-worker.ts', 'const entries = PRECACHE.map(precacheEntry);', "const entries = PRECACHE.filter((path) => !/^\\/assets\\/os-[^/]*\\.js$/.test(path)).map(precacheEntry);");

const TERMINAL_VARIANTS = [...terminalOfflineVariants('terminal'), ...terminalOfflineVariants('terminal-after-cv')];

describe('004-cv-page-FR-053: offline, /cv, the root and an unknown path show their full content, styled, in the site fonts', () => {
  test('fonts-not-stored/ fails with missing-font, naming each family', async () => {
    const report = await runCheck(fixture('fonts-not-stored'), { parts: ['offline'] });
    const cv = report.problems.filter((problem) => problem.page === '/cv').map(renderProblem);
    expect(cv).toContainEqual(expect.stringMatching(/^offline \/cv 375px missing-font "Space Grotesk": text in h1 was drawn in ".+" with the network off$/));
    expect(cv).toContainEqual(expect.stringMatching(/^offline \/cv 375px missing-font "Schibsted Grotesk": text in \S+ was drawn in ".+" with the network off$/));
    expect(cv).toContainEqual(expect.stringMatching(/^offline \/cv 375px missing-font "JetBrains Mono": /));
    expect(report.problems.every((problem) => problem.type === 'missing-font')).toBe(true);
  });

  test('root-not-offline/ fails with no-redirect /', async () => {
    const report = await runCheck(fixture('root-not-offline'), { parts: ['offline'] });
    expect(report.problems.map(renderProblem)).toEqual(['offline / 375px no-redirect /: did not lead to /cv with the network off (got a browser error page)']);
  });

  test('minimal/ passes for /cv, / and an unknown path', async () => {
    const report = await runCheck(fixture('minimal'), { parts: ['offline'] });
    expect(report.results.map((result) => `${result.page} ${result.variant} ${result.status}`)).toEqual(['/cv 375px pass', '/ 375px pass', '/missing-page 375px pass']);
  });
});

describe('005-os-shell-FR-059: offline, the root opens in both shells after one visit, with the CV app complete', () => {
  test('on the real build the root passes at both widths, after a visit to / and after a visit to /cv only', async () => {
    const report = await runCheck(realSiteProject(), { parts: ['offline'] });
    expect(report.results.map((result) => `${result.page} ${result.variant} ${result.status}`)).toEqual([
      '/cv 375px pass',
      '/ mobile/cv-app/375px pass',
      '/ desktop/cv-app/1440px pass',
      '/ mobile/cv-app-after-cv/375px pass',
      '/ desktop/cv-app-after-cv/1440px pass',
      ...TERMINAL_VARIANTS.map((variant) => `/ ${variant} pass`),
      '/missing-page 375px pass',
    ]);
  });

  test("a copy whose worker doesn't store the os script fails on / at both widths, naming the shell and the width", async () => {
    const root = seededCopy(OS_NOT_STORED);
    const report = await runCheck(root, { parts: ['offline'] });
    const lines = report.problems.map(renderProblem);
    for (const variant of ['mobile/cv-app/375px', 'desktop/cv-app/1440px', 'mobile/cv-app-after-cv/375px', 'desktop/cv-app-after-cv/1440px']) {
      expect(lines).toContain(`offline / ${variant} not-ready #os: the shell did not start with the network off`);
    }
    expect(report.problems.every((problem) => problem.page === '/')).toBe(true);
  });

  test("when the part crashes, every line for / still names the shell, the state and the width", async () => {
    const root = realSiteProject();
    fs.writeFileSync(path.join(root, 'packages/content/resume.json'), '{ not json');
    const report = await runCheck(root, { parts: ['offline'] });
    expect(report.results.map((result) => `${result.page} ${result.variant} ${result.status}`)).toEqual([
      '/cv 375px error',
      '/ mobile/cv-app/375px error',
      '/ desktop/cv-app/1440px error',
      '/ mobile/cv-app-after-cv/375px error',
      '/ desktop/cv-app-after-cv/1440px error',
      ...TERMINAL_VARIANTS.map((variant) => `/ ${variant} error`),
      '/missing-page 375px error',
    ]);
    const lines = report.problems.filter((problem) => problem.page === '/').map(renderProblem);
    expect(lines).toHaveLength(rootOfflineVariants().length);
    for (const line of lines) expect(line).toMatch(/^offline \/ (?:desktop|mobile)\/[a-z-]+(?:\/[a-z]+)?\/\d+px error offline: the part crashed: /);
  });
});

describe("006-terminal-FR-041: offline, the Terminal runs every command help lists in both shells, as it does online", () => {
  test('help lists the commands the part runs, exit last', () => {
    expect(TERMINAL_COMMANDS.length).toBeGreaterThan(10);
    expect(TERMINAL_COMMANDS.at(-1)).toBe('exit');
    expect(TERMINAL_COMMANDS).toEqual(expect.arrayContaining(['help', 'work', 'cv', 'specs', 'ls', 'clear']));
  });

  test("a copy whose os script isn't stored fails the Terminal's offline run at both widths, naming the shell, the width and the command", async () => {
    const report = await runCheck(seededCopy(OS_NOT_STORED), { parts: ['offline'] });
    const lines = report.problems.map(renderProblem);
    for (const variant of TERMINAL_VARIANTS) {
      const name = variant.split('/')[2]!;
      expect(lines).toContain(`offline / ${variant} not-available ${name}: the Terminal did not open with the network off`);
    }
  });
});
