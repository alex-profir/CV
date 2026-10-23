// Loaded by main.js once the Node version is checked (contracts/cli.md). The
// report goes to stdout; stderr carries only the four messages of the
// contract. Sets process.exitCode instead of calling process.exit(): piped
// stdout is asynchronous on macOS, and exiting early could cut the report
// off.
import { hasChromium } from './browser.ts';
import { MANIFEST_FILE, readManifest, runCheck } from './check.ts';
import { renderReport } from './report.ts';

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function main(): Promise<number> {
  if (process.argv.length > 2) {
    process.stderr.write('usage: npm run site-check (takes no arguments)\n');
    return 2;
  }
  if (!hasChromium()) {
    process.stderr.write('site check needs Chromium: run npx playwright install chromium\n');
    return 2;
  }
  const root = process.cwd();
  try {
    readManifest(root);
  } catch (error) {
    const reason = (error as NodeJS.ErrnoException).code === 'ENOENT' ? `${MANIFEST_FILE} not found (run npm run build first)` : `${MANIFEST_FILE} could not be read: ${message(error)}`;
    process.stderr.write(`site check could not start: ${reason}\n`);
    return 2;
  }
  let report;
  try {
    report = await runCheck(root);
  } catch (error) {
    process.stderr.write(`site check could not start: ${message(error)}\n`);
    return 2;
  }
  process.stdout.write(renderReport(report));
  return report.result === 'pass' ? 0 : 1;
}

process.exitCode = await main();
