// The build with the Terminal's shell (006 research R34, R40,
// contracts/site.md, contracts/shell-worker.md Build): the `os` script and
// one worker script, each one file, the worker's license file, and the `os`
// script's gzip budget.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { parseSync } from 'oxc-parser';
import { OS_BUDGET } from '../scripts/build-site.ts';
import { buildCopy, repoCopy } from './helpers/copy.ts';
import { builtSite } from './helpers/site.ts';

vi.setConfig({ testTimeout: 120_000 });

const OS_SOURCE = 'packages/web/src/client/os.tsx';
const WORKER_SOURCE = 'packages/web/src/apps/terminal/shell/worker.ts';

function failure(build: { status: number | null; stderr: string }): string {
  expect(build.status).toBe(2);
  expect(build.stderr.endsWith('\n')).toBe(true);
  const lines = build.stderr.slice(0, -1).split('\n');
  expect(lines).toHaveLength(1);
  return lines[0]!;
}

// The build's last line: an os entry holding the shell also gets Vite's own
// warnings about just-bash's size and its `node:zlib` before it.
function lastLine(build: { status: number | null; stderr: string }): string {
  expect(build.status).toBe(2);
  return build.stderr.trimEnd().split('\n').at(-1)!;
}

const append = (root: string, file: string, code: string) => fs.appendFileSync(path.join(root, file), `\n${code}\n`);

describe('006-terminal-FR-070 and SC-013: the shell is a second script, loaded only by the Terminal', () => {
  test('assets holds one os script and one shell worker, each one file with no import', () => {
    const { dir } = builtSite();
    const scripts = fs.readdirSync(path.join(dir, 'assets')).filter((name) => name.endsWith('.js'));
    expect(scripts.filter((name) => /^os-[\w-]+\.js$/.test(name))).toHaveLength(1);
    const workers = scripts.filter((name) => /^shell-[\w-]+\.js$/.test(name));
    expect(workers).toHaveLength(1);
    for (const name of [...workers, ...scripts.filter((each) => each.startsWith('os-'))]) {
      const code = fs.readFileSync(path.join(dir, 'assets', name), 'utf8');
      const { module: record } = parseSync(name, code, { sourceType: 'module' });
      expect(record.staticImports, name).toEqual([]);
      expect(record.dynamicImports, name).toEqual([]);
      expect(code, name).not.toMatch(/\bimportScripts\s*\(/);
    }
  });

  test('the worker starts with a comment naming its license file, which names every bundled package with its version and license', () => {
    const { dir } = builtSite();
    const assets = path.join(dir, 'assets');
    const worker = fs.readFileSync(path.join(assets, fs.readdirSync(assets).find((name) => /^shell-[\w-]+\.js$/.test(name))!), 'utf8');
    const named = /^\/\*![^\n]*\/assets\/(shell-licenses-[\w-]+\.txt) \*\/\n/.exec(worker)?.[1];
    expect(named).toBeDefined();
    const licenses = fs.readFileSync(path.join(assets, named!), 'utf8');
    for (const name of ['just-bash', 'diff', 'sprintf-js', 'turndown', 're2js', 'ieee754']) {
      const { version, license } = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '../../../node_modules', name, 'package.json'), 'utf8')) as { version: string; license: string };
      expect(licenses, name).toContain(`${name} ${version}\nLicense: ${license}\n`);
    }
    expect(licenses).toContain('Apache License');
    expect(licenses).toContain('Permission is hereby granted');
  });

  test('index.html and cv.html name no shell file; the service worker precaches both', () => {
    const { dir, manifest } = builtSite();
    for (const page of manifest.routes.pages) expect(fs.readFileSync(path.join(dir, page.file), 'utf8'), page.file).not.toMatch(/shell-[\w-]+\.(?:js|txt)/);
    const sw = fs.readFileSync(path.join(dir, 'sw.js'), 'utf8');
    expect(sw).toMatch(/"\/assets\/shell-[\w-]+\.js"/);
    expect(sw).toMatch(/"\/assets\/shell-licenses-[\w-]+\.txt"/);
  });

  test('a worker that imports another file fails the build', () => {
    const root = repoCopy();
    append(root, WORKER_SOURCE, "void import(/* @vite-ignore */ String('/assets/more.js'));");
    expect(failure(buildCopy(root))).toBe('site build failed: the shell worker is not one file');
  });

  test('an os entry that imports the worker other than through new Worker fails the build', () => {
    const root = repoCopy();
    const file = path.join(root, OS_SOURCE);
    fs.writeFileSync(file, `import '../apps/terminal/shell/worker.ts';\n${fs.readFileSync(file, 'utf8')}`);
    expect(lastLine(buildCopy(root))).toBe('site build failed: the os script loads the shell');
  });

  test('an os script past its gzip budget fails the build, naming the budget', () => {
    const root = repoCopy();
    append(root, OS_SOURCE, `(globalThis as Record<string, unknown>).padding = '${crypto.randomBytes(12_000).toString('base64')}';`);
    expect(failure(buildCopy(root))).toMatch(new RegExp(`^site build failed: the os script is \\d+ bytes gzipped, over its budget of ${OS_BUDGET} bytes`));
  });
});
