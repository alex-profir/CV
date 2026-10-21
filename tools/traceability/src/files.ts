import fs from 'node:fs';
import path from 'node:path';

// Directories skipped at any depth below the root, by both the check and the
// test runner (research R6). Every dot-directory is skipped too.
export const EXCLUDED_DIR_NAMES = ['node_modules', 'dist', 'build', 'out', 'coverage', '__fixtures__'];

export function isExcludedDir(name: string): boolean {
  return name.startsWith('.') || EXCLUDED_DIR_NAMES.includes(name);
}

// Vitest's default include, as a file-name pattern.
export const TEST_FILE_PATTERN = /\.(test|spec)\.[cm]?[jt]sx?$/;

// vitest.config.ts builds its include and exclude from these, so the runner
// and the check agree on what a test file is.
export const TEST_INCLUDE_GLOBS = ['**/*.{test,spec}.?(c|m)[jt]s?(x)'];

export const TEST_EXCLUDE_GLOBS = [...EXCLUDED_DIR_NAMES.map((name) => `**/${name}/**`), '**/.*/**'];

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// Directory entries sorted by name, without symbolic links. A missing
// directory has no entries.
function entries(root: string, dir: string): fs.Dirent[] {
  let found: fs.Dirent[];
  try {
    found = fs.readdirSync(path.join(root, dir), { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' || (error as NodeJS.ErrnoException).code === 'ENOTDIR') return [];
    throw error;
  }
  return found.filter((entry) => !entry.isSymbolicLink()).sort((a, b) => compare(a.name, b.name));
}

// The specs and test files under `root`, as relative paths with `/`
// separators, sorted by code unit. Symbolic links are never followed.
export function listFiles(root: string): { specs: { feature: string; file: string }[]; testFiles: string[] } {
  const specs = [];
  const hasSpecsDir = entries(root, '').some((entry) => entry.name === 'specs' && entry.isDirectory());
  for (const dir of hasSpecsDir ? entries(root, 'specs') : []) {
    if (!dir.isDirectory() || isExcludedDir(dir.name)) continue;
    // A spec.md of any kind counts, so one that can't be read is reported.
    if (entries(root, `specs/${dir.name}`).some((entry) => entry.name === 'spec.md')) {
      specs.push({ feature: dir.name, file: `specs/${dir.name}/spec.md` });
    }
  }

  const testFiles: string[] = [];
  const walk = (dir: string) => {
    for (const entry of entries(root, dir)) {
      const file = dir === '' ? entry.name : `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!isExcludedDir(entry.name)) walk(file);
      } else if (entry.isFile() && TEST_FILE_PATTERN.test(entry.name)) {
        testFiles.push(file);
      }
    }
  };
  walk('');

  return { specs, testFiles: testFiles.sort(compare) };
}
