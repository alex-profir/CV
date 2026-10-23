// Checks the committed workflow and ruleset against contracts/ci.md, reading
// ci.yml as plain text with the same layout rules as 001's
// tools/traceability/test/repo-settings.test.ts (no YAML parser).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { REPO_ROOT } from './helpers/cli.ts';

const LINES = fs.readFileSync(path.join(REPO_ROOT, '.github/workflows/ci.yml'), 'utf8').split('\n');
const RULESET = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.github/rulesets/main.json'), 'utf8'));
const PACKAGE = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));

// The lines of a block: those after `header` that are indented more than it,
// or empty.
function block(lines: string[], header: RegExp): string[] {
  const start = lines.findIndex((line) => header.test(line));
  if (start === -1) return [];
  const indent = lines[start]!.search(/\S/);
  const end = lines.findIndex((line, index) => index > start && line.trim() !== '' && line.search(/\S/) <= indent);
  return lines.slice(start + 1, end === -1 ? lines.length : end);
}

const JOBS = block(LINES, /^jobs:\s*$/);
const JOB_IDS = JOBS.flatMap((line) => /^ {2}([\w-]+):\s*$/.exec(line)?.[1] ?? []);

function job(id: string) {
  const lines = block(JOBS, new RegExp(`^ {2}${id}:\\s*$`));
  const name = lines.flatMap((line) => /^ {4}name:\s*(.+?)\s*$/.exec(line)?.[1] ?? [])[0];
  const steps = lines.flatMap((line) => {
    const match = /^\s*(?:-\s+)?(uses|run):\s*(.+?)\s*$/.exec(line);
    if (match === null) return [];
    return [match[1] === 'uses' ? match[2]!.split('@')[0]! : match[2]!];
  });
  return { lines, name, steps };
}

const REQUIRED = RULESET.rules.find((rule: { type: string }) => rule.type === 'required_status_checks').parameters.required_status_checks;

describe('002-cv-content-FR-033: every pull request runs the content check, and merging needs it to pass', () => {
  test('the content job is named content and runs the check after installing', () => {
    expect(JOB_IDS).toContain('content');
    expect(job('content').name).toBe('content');
    expect(job('content').steps).toEqual(['actions/checkout', 'actions/setup-node', 'npm ci', 'npm run content-check']);
  });

  test('the content job is not conditional, a matrix or allowed to fail', () => {
    expect(job('content').lines.filter((line) => /^\s*(?:-\s+)?(if|strategy|matrix|continue-on-error):/.test(line))).toEqual([]);
  });

  test('the ruleset requires traceability, test, content, tokens and site', () => {
    expect(REQUIRED).toEqual([
      { context: 'traceability', integration_id: 15368 },
      { context: 'test', integration_id: 15368 },
      { context: 'content', integration_id: 15368 },
      { context: 'tokens', integration_id: 15368 },
      { context: 'site', integration_id: 15368 },
    ]);
  });

  test('every required check is a workflow job, and content runs the local command', () => {
    for (const check of REQUIRED) expect(JOB_IDS).toContain(check.context);
    expect(PACKAGE.scripts['content-check']).toEqual(expect.any(String));
    expect(job('content').steps).toContain('npm run content-check');
  });
});
