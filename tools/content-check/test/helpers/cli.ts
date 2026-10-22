import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { REPO_ROOT, makeProject } from '../../../traceability/test/helpers/project.ts';
import { RESUME_FILE, RULES_FILE, SITE_FILE } from '../../src/paths.ts';

export { REPO_ROOT, makeProject };

export const CLI_PATH = path.join(REPO_ROOT, 'tools/content-check/src/main.js');

// Runs the CLI with the same grants as the `content-check` script: read only.
// The read grant on REPO_ROOT lets Node load the check and its packages when
// `cwd` is a temporary directory.
export function runCli(cwd: string, args: string[] = []): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(
    process.execPath,
    ['--permission', `--allow-fs-read=${REPO_ROOT}`, `--allow-fs-read=${cwd}`, CLI_PATH, ...args],
    { cwd, encoding: 'utf8' },
  );
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

// A small CV with made-up facts that passes every rule. It has no phone
// (FR-003): tests that need one add the made-up `+44 20 7946 0958`.
export const SAMPLE_RESUME = {
  $schema: 'https://cdn.jsdelivr.net/npm/@jsonresume/schema@1.3.1/schema.json',
  basics: {
    name: 'Ioana Testescu',
    label: 'Software Engineer',
    email: 'ioana@cv.test',
    summary: 'Builds web apps.',
    location: { city: 'Cluj-Napoca', countryCode: 'RO' },
    profiles: [{ network: 'GitHub', username: 'ioana-testescu', url: 'https://github.com/ioana-testescu' }],
  },
  work: [{ name: 'Testing Works', position: 'Engineer', startDate: '2021-03' }],
  projects: [
    { name: 'Route Planner', startDate: '2022-05', endDate: '2023-01' },
    { name: 'Recipe Box', startDate: '2020-02', endDate: '2020-11' },
  ],
};

// The starting site data rules and document (contracts/site-data-rules.md).
export const STARTING_RULES = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Site data',
  description: 'Data only the site needs. CV facts belong in resume.json.',
  type: 'object',
  properties: { $schema: { type: 'string' } },
};

export const STARTING_SITE = { $schema: './schemas/site.schema.json' };

type DocumentContent = object | string | null;

// The files for makeProject: the three documents at their fixed paths plus
// `files`. An object is written as formatted JSON, a string as is (for syntax
// errors), and null leaves the document out (for missing documents).
export function contentFiles(
  options: { resume?: DocumentContent; site?: DocumentContent; rules?: DocumentContent; files?: Record<string, string> } = {},
): Record<string, string> {
  const result: Record<string, string> = {};
  const add = (file: string, content: DocumentContent) => {
    if (content === null) return;
    result[file] = typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`;
  };
  add(RESUME_FILE, options.resume === undefined ? SAMPLE_RESUME : options.resume);
  add(SITE_FILE, options.site === undefined ? STARTING_SITE : options.site);
  add(RULES_FILE, options.rules === undefined ? STARTING_RULES : options.rules);
  return { ...result, ...options.files };
}
