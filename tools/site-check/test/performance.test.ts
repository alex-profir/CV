// The site check's time on the real repository, with the site root's runs
// (004 SC-009, 005 SC-010), and its stdout there (004 FR-058). Both read one
// run of `npm run --silent site-check`: two runs at once would build into the
// same `packages/web/dist/` and could remove each other's files. Off CI only, as 001 to 003's performance tests
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

const NINE_MINUTES = 540_000;

// 006 adds the Terminal's checks within 005's budget plus 4 minutes, with
// the shell's lines and states its amendment adds (FR-042).
const TERMINAL_BUDGET_MS = 480_000 + 240_000;

const THIRTEEN_MINUTES = 780_000;

// 007 adds the inspector's checks within 006's budget plus 3 minutes.
const INSPECTOR_BUDGET_MS = TERMINAL_BUDGET_MS + 180_000;

const FIFTEEN_MINUTES = 900_000;

describe('performance (SC-009, SC-010)', () => {
  test.skipIf(process.env.CI)('npm run site-check on the real repository exits 0 in under 480,000 ms', { timeout: NINE_MINUTES }, () => {
    const { status, stdout, elapsed } = realRun();
    expect(status, stdout).toBe(0);
    expect(elapsed).toBeLessThan(480_000);
  });
});

describe("006-terminal-FR-042: the Terminal's checks keep the site check within its time", () => {
  test.skipIf(process.env.CI)('npm run site-check, with the terminal part and the Terminal in every other part, exits 0 within 720,000 ms', { timeout: THIRTEEN_MINUTES }, () => {
    const { status, stdout, elapsed } = realRun();
    expect(status, stdout).toBe(0);
    expect(stdout).toMatch(/^ {2}terminal +pass /m);
    expect(elapsed).toBeLessThan(TERMINAL_BUDGET_MS);
  });
});

describe("007-requirement-inspector-FR-034: the inspector's checks keep the site check within its time", () => {
  test.skipIf(process.env.CI)('npm run site-check, with the inspector part and the inspector in every other part, exits 0 within 840,000 ms', { timeout: FIFTEEN_MINUTES }, () => {
    const { status, stdout, elapsed } = realRun();
    expect(status, stdout).toBe(0);
    expect(stdout).toMatch(/^ {2}inspector +pass /m);
    expect(elapsed).toBeLessThan(INSPECTOR_BUDGET_MS);
  });
});

describe('004-cv-page-FR-058: stdout holds only the report', () => {
  test.skipIf(process.env.CI)('npm run --silent site-check on the real repository prints nothing before the report', { timeout: NINE_MINUTES }, () => {
    const { status, stdout } = realRun();
    expect(status === 0 || status === 1).toBe(true);
    expect(stdout).toMatch(/^(?:Site check: |[a-z-]+ (?:\/\S*|-) \S+ \S+ )/);
    expect(stdout).toMatch(/\n {2}(?:No problems|\d+ problems? in \d+ parts?)\. \d+ of 14 parts passed\.\n$/);
  });
});
