// `npm run content-shape`: writes the shape description of both documents from
// the derived official schema and the site data rules (research R10). The only
// command in this feature that writes a file.
import fs from 'node:fs';
import path from 'node:path';
import { readDocument } from './json.ts';
import { RULES_FILE, SHAPE_FILE } from './paths.ts';
import { deriveSchema, loadOfficialSchema } from './schema.ts';
import { generateShape } from './shape.ts';
import { loadRules } from './site-data.ts';

const root = process.cwd();
try {
  const rules = readDocument(root, RULES_FILE);
  const loaded = rules.state === 'ok' ? loadRules(rules) : undefined;
  const problem = rules.problem ?? loaded?.problem;
  if (problem) {
    const { file, line, column } = problem.location;
    process.stderr.write(`content shape could not run: ${file}:${line}:${column} ${problem.detail}\n`);
    process.exitCode = 2;
  } else {
    const resume = deriveSchema(loadOfficialSchema().schema).schema;
    fs.writeFileSync(path.join(root, SHAPE_FILE), generateShape({ resume, site: loaded!.rules!.schema }));
    process.stdout.write(`wrote ${SHAPE_FILE}\n`);
  }
} catch (error) {
  process.stderr.write(`content shape could not run: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 2;
}
