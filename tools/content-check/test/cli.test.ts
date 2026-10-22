import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { nodeVersionProblem } from '../../traceability/src/node-version.js';
import { REPO_ROOT, SAMPLE_RESUME, contentFiles, makeProject, runCli } from './helpers/cli.ts';

const PACKAGE = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));

// npm's own CLI script. Vitest started without npm has no npm_execpath, so
// fall back to the npm bundled beside this Node.
const NPM_CLI = process.env.npm_execpath ?? path.join(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js');

describe('002-cv-content-FR-034: one local command gives the same report as a direct run', () => {
  test('npm run content-check and the CLI print the same report with the same exit code', { timeout: 30_000 }, () => {
    const viaNpm = spawnSync(process.execPath, [NPM_CLI, 'run', '--silent', 'content-check'], { cwd: REPO_ROOT, encoding: 'utf8' });
    const direct = runCli(REPO_ROOT);
    expect(direct.stdout).toMatch(/(^|\n)Summary\n/);
    expect(viaNpm.stdout).toBe(direct.stdout);
    expect(viaNpm.status).toBe(direct.status);
  });

  test('the script is exactly the documented command', () => {
    expect(PACKAGE.scripts['content-check']).toBe('node --permission --allow-fs-read=. tools/content-check/src/main.js');
  });

  test('any argument is a usage error', () => {
    const result = runCli(makeProject(contentFiles()), ['--fix']);
    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('usage: npm run content-check (takes no arguments)\n');
  });

  test('stdout holds only the report', () => {
    const result = runCli(makeProject(contentFiles()));
    expect(result.status).toBe(0);
    expect(result.stdout.startsWith('Summary\n')).toBe(true);
    expect(result.stdout.endsWith('\nPASS: both documents are valid and no key facts are hardcoded.\n')).toBe(true);
  });
});

describe('002-cv-content-FR-035: the check makes no network requests', () => {
  test('a CV whose $schema is a remote address passes with no network grant', () => {
    const root = makeProject(contentFiles({ resume: { ...SAMPLE_RESUME, $schema: 'https://json-resume.invalid/schema.json' } }));
    const result = runCli(root);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  // Port 2 because fetch refuses ports on its bad-ports list, such as 9, before
  // the permission model is consulted. Loopback means a broken guard never
  // reaches the internet: it fails with ECONNREFUSED instead.
  test('a network call under the same grants is refused', () => {
    const dir = makeProject({
      'control.js': "fetch('http://127.0.0.1:2/').then(() => console.log('connected'), (e) => console.log(e.code ?? e.cause?.code));\n",
    });
    const control = spawnSync(process.execPath, ['--permission', `--allow-fs-read=${dir}`, path.join(dir, 'control.js')], {
      cwd: dir,
      encoding: 'utf8',
    });
    expect(control.stdout.trim()).toBe('ERR_ACCESS_DENIED');
  });

  test('Node versions whose permission model cannot block the network are refused', () => {
    expect(nodeVersionProblem('24.21.0', 'content check')).toBe(
      'content check needs Node 26 or later (see .nvmrc) to block network access, but this is Node 24.21.0',
    );
    expect(nodeVersionProblem('26.0.0', 'content check')).toBeNull();
  });
});
