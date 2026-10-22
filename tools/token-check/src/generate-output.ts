// `npm run token-output`: writes the derived output from the two token
// sources (research R10). The only command in this feature that writes a
// file, and it writes only the two generated files.
import fs from 'node:fs';
import path from 'node:path';
import { outputFor, runCheck } from './check.ts';
import { OUTPUT_CSS_FILE, OUTPUT_TS_FILE } from './paths.ts';
import { renderReport } from './report.ts';

const root = process.cwd();
try {
  const output = outputFor(root);
  if (output === null) {
    process.stdout.write(renderReport(runCheck(root)));
    process.exitCode = 1;
  } else {
    for (const [file, text] of [
      [OUTPUT_CSS_FILE, output.css],
      [OUTPUT_TS_FILE, output.ts],
    ] as const) {
      const target = path.join(root, file);
      let current: string | null = null;
      try {
        current = fs.readFileSync(target, 'utf8');
      } catch {
        current = null;
      }
      if (current === text) {
        process.stdout.write(`unchanged ${file}\n`);
      } else {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, text);
        process.stdout.write(`wrote ${file}\n`);
      }
    }
  }
} catch (error) {
  process.stderr.write(`token output could not run: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 2;
}
