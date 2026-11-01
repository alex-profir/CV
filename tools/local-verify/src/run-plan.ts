// What a run set out to test and what has passed so far, so the next run can
// take only the rest (FR-039). It's kept by branch under the clone's git
// directory, beside the results (FR-037).
import fs from 'node:fs';
import path from 'node:path';

export type RunMode = 'quick' | 'feature';

// `passed` maps each test file that passed to its number of tests.
export type RunPlan = { sha: string; planned: string[]; passed: Record<string, number> };

export function planPath(dir: string, mode: RunMode, branch: string | null): string {
  return path.join(dir, `plan-${mode}-${(branch ?? 'detached').replace(/[^\w.-]+/g, '-')}.json`);
}

export function readPlan(file: string): RunPlan | null {
  try {
    const plan = JSON.parse(fs.readFileSync(file, 'utf8'));
    return typeof plan?.sha === 'string' && Array.isArray(plan.planned) && typeof plan.passed === 'object' && plan.passed !== null ? plan : null;
  } catch {
    return null;
  }
}

export function writePlan(file: string, plan: RunPlan): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(plan, null, 2)}\n`);
}

type ReportFile = { name?: unknown; status?: unknown; assertionResults?: { status?: unknown }[] };

// The files of a Vitest JSON report, relative to `root`, and those that passed
// in full. A file with a test the run stopped before counts as not passed, so
// a stopped run's next run takes it again.
export function readReport(root: string, file: string): { success: boolean; ran: string[]; passed: Record<string, number>; failed: number; skipped: number } {
  let report: { success?: unknown; numFailedTests?: unknown; numPendingTests?: unknown; numTodoTests?: unknown; testResults?: ReportFile[] } | undefined;
  try {
    report = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    report = undefined;
  }
  const count = (value: unknown) => (typeof value === 'number' ? value : 0);
  const results = Array.isArray(report?.testResults) ? report.testResults : [];
  const passed: Record<string, number> = {};
  const ran = new Set<string>();
  for (const entry of results) {
    if (typeof entry?.name !== 'string') continue;
    const name = path.relative(root, entry.name).split(path.sep).join('/');
    ran.add(name);
    const assertions = Array.isArray(entry.assertionResults) ? entry.assertionResults : [];
    if (entry.status === 'passed' && assertions.every((assertion) => assertion.status === 'passed')) passed[name] = assertions.length;
  }
  return { success: report?.success === true, ran: [...ran], passed, failed: count(report?.numFailedTests), skipped: count(report?.numPendingTests) + count(report?.numTodoTests) };
}

// What's left of a plan: what failed or never ran, and any test file that has
// changed since, among the test files that still exist. A rerun doesn't take
// back a pass unless its own test file changed.
export function remaining(plan: RunPlan, changed: string[], testFiles: string[]): string[] {
  return testFiles.filter((file) => changed.includes(file) || (plan.planned.includes(file) && !(file in plan.passed)));
}
