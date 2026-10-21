import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { REQUIRED_NODE_MAJOR, nodeVersionProblem } from '../src/node-version.ts';
import { REPO_ROOT, makeProject, runCli } from './helpers/project.ts';

const PACKAGE = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
const SCRIPT: string = PACKAGE.scripts.traceability;

describe('001-requirement-traceability-FR-026: one local command gives the same report as a direct run', () => {
  test('npm run traceability and the CLI print the same report with the same exit code', { timeout: 30_000 }, () => {
    const viaNpm = spawnSync('npm', ['run', '--silent', 'traceability'], { cwd: REPO_ROOT, encoding: 'utf8' });
    const direct = runCli(REPO_ROOT);
    expect(direct.stdout).toMatch(/(^|\n)Summary\n/);
    expect(viaNpm.stdout).toBe(direct.stdout);
    expect(viaNpm.status).toBe(direct.status);
  });
});

describe('001-requirement-traceability-FR-027: the check makes no network requests', () => {
  test('the script runs under the permission model with no network grant', () => {
    expect(SCRIPT).toContain('--permission');
    expect(SCRIPT).toContain('--allow-fs-read=');
    expect(SCRIPT).toContain('--allow-addons');
    for (const grant of ['--allow-net', '--allow-fs-write', '--allow-child-process', '--allow-worker', '--allow-wasi']) {
      expect(SCRIPT).not.toContain(grant);
    }
  });

  test('the check completes under those grants', () => {
    const root = makeProject({
      'specs/002-example/spec.md': '**Status**: Approved\n\n### Functional Requirements\n\n- **FR-001**: One.\n',
      'src/example.test.ts': "test('002-example-FR-001', () => {});\n",
    });
    const result = runCli(root);
    expect(result.status).toBe(0);
    expect(result.stdout.endsWith('\nPASS: the 1 active requirement in 1 approved spec is covered.\n')).toBe(true);
  });

  // Port 2 because fetch refuses ports on its bad-ports list, such as 9, before
  // the permission model is consulted. Loopback means a broken guard never
  // reaches the internet: it fails with ECONNREFUSED instead.
  test('a network call under the same grants is refused', () => {
    const control = spawnSync(
      process.execPath,
      [
        '--permission',
        `--allow-fs-read=${REPO_ROOT}`,
        '--allow-addons',
        '-e',
        "fetch('http://127.0.0.1:2/').then(() => console.log('connected'), (e) => console.log(e.code ?? e.cause?.code))",
      ],
      { encoding: 'utf8' },
    );
    expect(control.stdout.trim()).toBe('ERR_ACCESS_DENIED');
  });

  // Before Node 25 the permission model doesn't cover the network, so the
  // guard above would silently be off.
  test('Node versions whose permission model cannot block the network are refused', () => {
    expect(nodeVersionProblem('24.21.0')).toBe(
      'traceability check needs Node 26 or later (see .nvmrc) to block network access, but this is Node 24.21.0',
    );
    expect(nodeVersionProblem('25.9.0')).not.toBeNull();
    expect(nodeVersionProblem('26.0.0')).toBeNull();
    expect(nodeVersionProblem('27.1.0')).toBeNull();
    expect(fs.readFileSync(path.join(REPO_ROOT, '.nvmrc'), 'utf8').trim()).toBe(String(REQUIRED_NODE_MAJOR));
    expect(PACKAGE.engines.node).toBe(`>=${REQUIRED_NODE_MAJOR}`);
  });
});

describe('command usage', () => {
  test('any argument is a usage error', () => {
    const result = runCli(makeProject({}), ['--verbose']);
    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('usage: npm run traceability');
  });
});

describe('seeded sample project (SC-001)', () => {
  test('reports every seeded problem and nothing else', () => {
    const seeded = path.join(REPO_ROOT, 'tools/traceability/test/__fixtures__/seeded');
    const result = runCli(seeded);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe(fs.readFileSync(path.join(seeded, 'expected-report.txt'), 'utf8'));
  });
});
