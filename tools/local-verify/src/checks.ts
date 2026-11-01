// The checks of a local run, in the order they run (contracts/local-verify.md).
// They are the pull request's `run:` commands (FR-031), with `npm run
// test:fast` replaced by the listed test files (FR-032) and without the site
// check, which every pull request already runs in CI. verify.test.ts compares
// them with ci.yml. The cheapest come first, and a run stops at the first
// failure (FR-040). `verify:feature` adds one of its own after the tests:
// `engines`, the Playground's sandbox, memory and key tests in Firefox and
// WebKit (008 research R25), which pull requests leave to Chromium.
import type { CheckName } from './result.ts';

export type CheckCommand = { name: CheckName; command: string; args: string[] };

// `npm test` on `files`, stopping at the first failure, with Vitest's JSON
// report written beside the result. The test counts come from it, and SC-010's
// guard reads the files that ran. The files go on the command line because
// `--exclude` has no effect on projects that set their own exclude.
export function testArgs(vitestJsonPath: string, files: string[]): string[] {
  return ['test', '--', '--bail=1', '--reporter=default', '--reporter=json', `--outputFile.json=${vitestJsonPath}`, ...files];
}

export function checks(vitestJsonPath: string, files: string[], engines = false): CheckCommand[] {
  return [
    { name: 'typecheck', command: 'npm', args: ['run', 'typecheck'] },
    { name: 'traceability', command: 'npm', args: ['run', 'traceability'] },
    { name: 'content', command: 'npm', args: ['run', 'content-check'] },
    { name: 'tokens', command: 'npm', args: ['run', 'token-check'] },
    { name: 'test', command: 'npm', args: testArgs(vitestJsonPath, files) },
    ...(engines ? [{ name: 'engines' as const, command: 'npm', args: ['run', 'test:engines'] }] : []),
  ];
}

// How a check is shown: `npm run typecheck`.
export function commandLine(check: CheckCommand): string {
  return [check.command, ...check.args].join(' ');
}
