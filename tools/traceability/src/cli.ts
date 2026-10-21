import { runCheck } from './check.ts';
import { nodeVersionProblem } from './node-version.ts';
import { renderReport } from './report.ts';

const versionProblem = nodeVersionProblem(process.versions.node);

// Sets process.exitCode instead of calling process.exit(): piped stdout is
// asynchronous on macOS, and exiting early could cut the report off.
if (process.argv.length > 2) {
  process.stderr.write('usage: npm run traceability (takes no arguments)\n');
  process.exitCode = 2;
} else if (versionProblem !== null) {
  process.stderr.write(`${versionProblem}\n`);
  process.exitCode = 2;
} else {
  try {
    const report = runCheck(process.cwd());
    process.stdout.write(renderReport(report));
    process.exitCode = report.result === 'pass' ? 0 : 1;
  } catch (error) {
    process.stderr.write(`traceability check failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  }
}
