import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, makeProject } from '../../../traceability/test/helpers/project.ts';
import { outputFor } from '../../src/check.ts';
import { EXPORT_FILE, MOTION_FILE, OUTPUT_CSS_FILE, OUTPUT_TS_FILE } from '../../src/paths.ts';

export { REPO_ROOT, makeProject };

export const CLI_PATH = path.join(REPO_ROOT, 'tools/token-check/src/main.js');

export const GENERATE_PATH = path.join(REPO_ROOT, 'tools/token-check/src/generate-output.ts');

type Run = { status: number | null; stdout: string; stderr: string };

// Runs the CLI with the same grants as the `token-check` script: read and
// addons only. The read grant on REPO_ROOT lets Node load the check and its
// packages when `cwd` is a temporary directory.
export function runCli(cwd: string, args: string[] = [], env?: NodeJS.ProcessEnv): Run {
  const result = spawnSync(
    process.execPath,
    ['--permission', `--allow-fs-read=${REPO_ROOT}`, `--allow-fs-read=${cwd}`, '--allow-addons', CLI_PATH, ...args],
    { cwd, encoding: 'utf8', env: env ?? process.env },
  );
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

// Runs `npm run token-output`'s script in `cwd`.
export function runGenerate(cwd: string): Run {
  const result = spawnSync(process.execPath, [GENERATE_PATH], { cwd, encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

const token = (value: unknown, type: string) => ({ $value: value, $type: type, $description: '' });

// A small valid export: sets `base` then `light`, and theme `mode/light`
// enabling both.
export const SAMPLE_EXPORT = {
  base: {
    color: { base: { ink: token('#1f1d1a', 'color'), paper: token('#faf8f5', 'color') } },
    space: { 4: token('16', 'spacing') },
    breakpoint: { wide: token('768', 'dimension') },
    font: {
      family: { body: token(['Source Serif 4', 'serif'], 'fontFamilies') },
      size: { body: token('16', 'fontSizes') },
    },
    typography: {
      body: token({ fontFamilies: '{font.family.body}', fontSizes: '{font.size.body}', lineHeights: '1.5' }, 'typography'),
    },
  },
  light: {
    color: { text: { primary: token('{color.base.ink}', 'color') } },
  },
  $themes: [
    {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'light',
      group: 'mode',
      description: '',
      isSource: false,
      selectedTokenSets: { base: 'enabled', light: 'enabled' },
    },
  ],
  $metadata: { tokenSetOrder: ['base', 'light'], activeThemes: ['mode/light'], activeSets: ['base', 'light'] },
};

// A small valid motion source, laid out like the starter one.
export const SAMPLE_MOTION = {
  motion: {
    motion: {
      duration: { fast: token('150ms', 'duration') },
      easing: { standard: token([0.2, 0, 0, 1], 'cubicBezier') },
    },
  },
  $themes: [
    {
      id: '00000000-0000-4000-8000-000000000002',
      name: 'standard',
      group: 'motion',
      description: '',
      isSource: false,
      selectedTokenSets: { motion: 'enabled' },
    },
  ],
  $metadata: { tokenSetOrder: ['motion'], activeThemes: ['motion/standard'], activeSets: ['motion'] },
};

type SourceContent = object | string | null;

export type TokenOptions = { penpot?: SourceContent; motion?: SourceContent; files?: Record<string, string>; output?: boolean };

// The files for makeProject: both sources at their fixed paths plus `files`.
// An object is written in Penpot's form, a string as is (for syntax errors and
// repeated keys), and null leaves the source out (for missing sources).
// Tests change a copy of a sample made with structuredClone.
export function tokenFiles(options: TokenOptions = {}): Record<string, string> {
  const result: Record<string, string> = {};
  const add = (file: string, content: SourceContent) => {
    if (content === null) return;
    result[file] = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  };
  add(EXPORT_FILE, options.penpot === undefined ? SAMPLE_EXPORT : options.penpot);
  add(MOTION_FILE, options.motion === undefined ? SAMPLE_MOTION : options.motion);
  return { ...result, ...options.files };
}

// A sample project holding the sources and, unless `output: false` is
// passed, current derived output when the sources give any. Call it inside
// tests only.
export function tokenProject(options: TokenOptions = {}): string {
  const root = makeProject(tokenFiles(options));
  const output = options.output === false ? null : outputFor(root);
  if (output !== null) {
    fs.mkdirSync(path.join(root, path.dirname(OUTPUT_CSS_FILE)), { recursive: true });
    fs.writeFileSync(path.join(root, OUTPUT_CSS_FILE), output.css);
    fs.writeFileSync(path.join(root, OUTPUT_TS_FILE), output.ts);
  }
  return root;
}
