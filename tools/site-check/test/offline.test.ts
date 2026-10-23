// The offline part (research R4, R16): one visit online, then the network
// off and the server stopped.
import { describe, expect, test, vi } from 'vitest';
import { runCheck } from '../src/check.ts';
import { renderProblem } from '../src/report.ts';
import { fixture } from './helpers/sites.ts';

vi.setConfig({ testTimeout: 120_000 });

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
