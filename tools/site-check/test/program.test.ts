// The part `program` (009 FR-043, tasks.md): on the real build it passes in both
// shells; a copy with one fault fails, naming what failed. Broken cases are copies
// of the repository with one change, built, as 008's are.
import { describe, expect, test, vi } from 'vitest';
import { runCheck } from '../src/check.ts';
import { PROGRAM_CHECKS, programVariant } from '../src/parts/program.ts';
import { renderProblem } from '../src/report.ts';
import { SHELL_SIZES } from '../src/shell-states.ts';
import { realSiteProject } from './helpers/root.ts';

vi.setConfig({ testTimeout: 600_000 });

describe('009-terminal-node-FR-001, 009-terminal-node-FR-009 and 009-terminal-node-FR-043: the part checks what a visitor sees of a program', () => {
  test('on the real build the part passes, with every check in order on each of its shells', async () => {
    const report = await runCheck(realSiteProject(), { parts: ['program'] });
    expect(report.problems.map(renderProblem)).toEqual([]);
    expect(report.results.map(({ variant, status }) => `${variant} ${status}`)).toEqual(PROGRAM_CHECKS.flatMap(({ name, shells }) => shells.map((shell) => `${programVariant(shell, name, SHELL_SIZES[shell].width)} pass`)));
  });
});
