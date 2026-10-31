// Checks the committed workflow and ruleset against contracts/ci.md, reading
// ci.yml as plain text with the same layout rules as 001's and 002's
// repo-settings tests (no YAML parser).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { REPO_ROOT } from './helpers/tokens.ts';

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

describe('003-design-tokens-FR-039: every pull request runs the token check, and merging needs it to pass', () => {
  test('the tokens job is named tokens and runs the check after installing', () => {
    expect(JOB_IDS).toContain('tokens');
    expect(job('tokens').name).toBe('tokens');
    expect(job('tokens').steps).toEqual(['actions/checkout', 'actions/setup-node', 'npm ci', 'npm run token-check']);
  });

  test('the tokens job is not conditional, a matrix or allowed to fail', () => {
    expect(job('tokens').lines.filter((line) => /^\s*(?:-\s+)?(if|strategy|matrix|continue-on-error):/.test(line))).toEqual([]);
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

  test('every required check bound to GitHub Actions is a workflow job, and tokens runs the local command', () => {
    for (const check of REQUIRED.filter((entry: { integration_id?: number }) => entry.integration_id === 15368)) expect(JOB_IDS).toContain(check.context);
    expect(PACKAGE.scripts['token-check']).toBe('node --permission --allow-fs-read=. --allow-addons tools/token-check/src/main.js');
    expect(job('tokens').steps).toContain('npm run token-check');
  });
});
