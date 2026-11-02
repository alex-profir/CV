// The part `program` (009 FR-043, tasks.md): on the real build it passes in both
// shells; a copy with one fault fails, naming what failed. Broken cases are copies
// of the repository with one change, built, as 008's are.
import { describe, expect, test, vi } from 'vitest';
import { runCheck } from '../src/check.ts';
import { PROGRAM_CHECKS, programVariant } from '../src/parts/program.ts';
import { renderProblem } from '../src/report.ts';
import { SHELL_SIZES } from '../src/shell-states.ts';
import { realSiteProject, replaceIn, seededCopy } from './helpers/root.ts';

vi.setConfig({ testTimeout: 600_000 });

const TERMINAL = 'packages/web/src/apps/terminal';

// Each thing FR-043 lists: one fault in a copy, the check that must catch it, and the
// line it must give.
const FAULTS: readonly { what: string; check: string; file: string; from: string; to: string; line: RegExp }[] = [
  {
    what: 'output held until the program ends',
    check: 'streaming',
    file: `${TERMINAL}/program/host.ts`,
    from: 'flushTimer ??= setTimeout(flush, FLUSH_MS);',
    to: '',
    line: /^program \/ desktop\/program-streaming\/1440px streaming node tick\.js: tick 1 /,
  },
  {
    what: 'a shell that stops responding while a program runs',
    check: 'endless-loop',
    file: `${TERMINAL}/CommandLine.tsx`,
    from: 'onChange={(event) => {',
    to: 'onChange={(event) => { if (document.querySelector(\'section.run[aria-busy="true"]\') !== null) return;',
    line: /^program \/ desktop\/program-endless-loop\/1440px live while \(true\) \{\}: the command line took no typing/,
  },
  {
    what: 'Ctrl+C that does nothing to an endless loop',
    check: 'endless-loop',
    file: `${TERMINAL}/program/host.ts`,
    from: "} else end(130, 'interrupted');",
    to: '}',
    line: /^program \/ desktop\/program-endless-loop\/1440px stop Ctrl\+C: the program was still running/,
  },
  {
    what: 'a handler that a second Ctrl+C can\'t get past',
    check: 'past-a-handler',
    file: `${TERMINAL}/program/host.ts`,
    from: 'if (handler && !interrupted) {',
    to: 'if (handler) {',
    line: /^program \/ desktop\/program-past-a-handler\/1440px stop second Ctrl\+C: the program was still running/,
  },
  {
    what: 'an error with no marker under its column',
    check: 'errors',
    file: `${TERMINAL}/program/runtime/errors.ts`,
    from: "${' '.repeat(marker)}^\\n\\n",
    to: '\\n',
    line: /^program \/ desktop\/program-errors\/1440px error form node bad\.js: expected /,
  },
  {
    what: 'a program that reaches the network',
    check: 'sandbox',
    file: `${TERMINAL}/program/runtime/sandbox.ts`,
    from: "Promise.reject(new TypeError('fetch failed: a program has no network in this Terminal'))",
    to: 'Promise.resolve() as Promise<never>',
    line: /^program \/ desktop\/program-sandbox\/1440px network fetch: expected "fetch failed"/,
  },
  {
    what: 'a program that reaches for the page',
    check: 'sandbox',
    file: `${TERMINAL}/program/runtime/sandbox.ts`,
    from: 'const REMOVED = [',
    to: "Object.assign(self, { document: { title: '' } });\nconst REMOVED = [",
    line: /^program \/ desktop\/program-sandbox\/1440px reach names: expected "undefined undefined undefined"/,
  },
  {
    what: "a program's bundle missing from the offline copy",
    check: 'offline',
    file: 'packages/web/scripts/build-site.ts',
    from: 'file.path !== workerPath && ',
    to: "file.path !== workerPath && !file.path.startsWith('/assets/program-') && ",
    line: /^program \/ desktop\/program-offline\/1440px output node hello\.js offline: expected "from the stored copy"/,
  },
];

describe('009-terminal-node-FR-001, 009-terminal-node-FR-009, 009-terminal-node-FR-036, 009-terminal-node-FR-037, 009-terminal-node-FR-039 and 009-terminal-node-FR-043: the part checks what a visitor sees of a program', () => {
  test('on the real build the part passes, with every check in order on each of its shells', async () => {
    const report = await runCheck(realSiteProject(), { parts: ['program'] });
    expect(report.problems.map(renderProblem)).toEqual([]);
    expect(report.results.map(({ variant, status }) => `${variant} ${status}`)).toEqual(PROGRAM_CHECKS.flatMap(({ name, shells }) => shells.map((shell) => `${programVariant(shell, name, SHELL_SIZES[shell].width)} pass`)));
  });

  test.each(FAULTS)('a copy with $what fails the check $check, saying what failed', async ({ check, file, from, to, line }) => {
    const root = seededCopy((copy) => replaceIn(copy, file, from, to));
    const lines = (await runCheck(root, { parts: ['program'], programChecks: [check] })).problems.map(renderProblem);
    expect(lines).toContainEqual(expect.stringMatching(line));
  });
});
