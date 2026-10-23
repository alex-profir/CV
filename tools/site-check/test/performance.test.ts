// The site check's time on the real repository (SC-009), and its stdout
// there (FR-058). Both read one run of `npm run --silent site-check`: two
// runs at once would build into the same `packages/web/dist/` and could
// remove each other's files. Off CI only, as 001 to 003's performance tests
// are, since the CI `site` job already runs the check on every pull request.
import { spawnSync } from 'node:child_process';
import { describe, expect, test } from 'vitest';
import { REPO_ROOT } from './helpers/sites.ts';

type Run = { status: number | null; stdout: string; elapsed: number };

let run: Run | undefined;

function realRun(): Run {
  if (run === undefined) {
    const start = performance.now();
    const result = spawnSync('npm', ['run', '--silent', 'site-check'], { cwd: REPO_ROOT, encoding: 'utf8' });
    run = { status: result.status, stdout: result.stdout, elapsed: performance.now() - start };
  }
  return run;
}

const SIX_MINUTES = 360_000;

describe('performance (SC-009)', () => {
  test.skipIf(process.env.CI)('npm run site-check on the real repository exits 0 in under 300,000 ms', { timeout: SIX_MINUTES }, () => {
    const { status, stdout, elapsed } = realRun();
    expect(status, stdout).toBe(0);
    expect(elapsed).toBeLessThan(300_000);
  });
});

describe('004-cv-page-FR-058: stdout holds only the report', () => {
  test.skipIf(process.env.CI)('npm run --silent site-check on the real repository prints nothing before the report', { timeout: SIX_MINUTES }, () => {
    const { status, stdout } = realRun();
    expect(status === 0 || status === 1).toBe(true);
    expect(stdout).toMatch(/^(?:Site check: |[a-z-]+ (?:\/\S*|-) \S+ \S+ )/);
    expect(stdout).toMatch(/\n {2}(?:No problems|\d+ problems? in \d+ parts?)\. \d+ of 11 parts passed\.\n$/);
  });
});
