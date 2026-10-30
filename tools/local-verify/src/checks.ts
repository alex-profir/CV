// The checks of the local full run, in the order they run (contracts/
// local-verify.md). They are the pull request's `run:` commands (FR-031),
// with `npm run test:fast` replaced by the full set, `npm test` (FR-032);
// verify.test.ts compares them with ci.yml. One is the local run's own:
// `engines`, the Playground's sandbox, memory and key tests in Firefox and
// WebKit (008 research R25), which pull requests leave to Chromium. They are data: the process call
// receives them through variables, so the fast set's import rule (research
// R14, rule 3) doesn't read `site-check` here as a build started by a fast
// test.
import type { CheckName } from './result.ts';

export type CheckCommand = { name: CheckName; command: string; args: string[] };

// `npm test` with Vitest's JSON report written beside the result, from
// which the test counts come and SC-010's guard reads the files that ran.
export function testArgs(vitestJsonPath: string): string[] {
  return ['test', '--', '--reporter=default', '--reporter=json', `--outputFile.json=${vitestJsonPath}`];
}

export function checks(vitestJsonPath: string): CheckCommand[] {
  return [
    { name: 'typecheck', command: 'npm', args: ['run', 'typecheck'] },
    { name: 'traceability', command: 'npm', args: ['run', 'traceability'] },
    { name: 'content', command: 'npm', args: ['run', 'content-check'] },
    { name: 'tokens', command: 'npm', args: ['run', 'token-check'] },
    { name: 'test', command: 'npm', args: testArgs(vitestJsonPath) },
    { name: 'engines', command: 'npm', args: ['run', 'test:engines'] },
    { name: 'site', command: 'npm', args: ['run', '--silent', 'site-check'] },
  ];
}

// How a check is shown: `npm run typecheck`.
export function commandLine(check: CheckCommand): string {
  return [check.command, ...check.args].join(' ');
}
