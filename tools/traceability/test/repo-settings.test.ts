// Checks the committed workflow and ruleset against contracts/ci.md.
//
// ci.yml is read as plain text, with no YAML parser (Constitution X). The
// checks rely on its layout: two-space indentation, jobs as two-space keys
// under `jobs:`, and one command per `run:` line. Block scalars (`run: |` or
// `run: >`) would hide commands from these checks, so they're rejected.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { REPO_ROOT } from './helpers/project.ts';

const WORKFLOW = fs.readFileSync(path.join(REPO_ROOT, '.github/workflows/ci.yml'), 'utf8');
const LINES = WORKFLOW.split('\n');
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

const REQUIRED: { context: string; integration_id?: number }[] = RULESET.rules.find((rule: { type: string }) => rule.type === 'required_status_checks').parameters.required_status_checks;

// Every `run:` command of the workflow, across all jobs.
const RUNS = LINES.flatMap((line) => /^\s*(?:-\s+)?run:\s*(.+?)\s*$/.exec(line)?.[1] ?? []);

describe('001-requirement-traceability-FR-025: every pull request runs the required checks and nobody can bypass them', () => {
  test('the workflow keeps the layout these checks read', () => {
    expect(LINES.filter((line) => /^\s*(?:-\s+)?run:\s*[|>]/.test(line))).toEqual([]);
    expect(LINES.filter((line) => /^\t/.test(line))).toEqual([]);
  });

  test('runs on every pull request to main, with no filters', () => {
    const trigger = block(LINES, /^on:\s*$/);
    expect(trigger).toContain('  pull_request:');
    expect(block(trigger, /^ {2}pull_request:\s*$/)).toContain('    branches: [main]');
    expect(LINES.filter((line) => /^\s*(paths|paths-ignore|branches-ignore):/.test(line))).toEqual([]);
  });

  test('pins every action to a full commit SHA with its version in a comment', () => {
    const uses = LINES.filter((line) => /^\s*(?:-\s+)?uses:/.test(line));
    expect(uses.length).toBeGreaterThan(0);
    for (const line of uses) {
      expect(line).toMatch(/uses: actions\/(checkout|setup-node|cache)@[0-9a-f]{40} # v\d+(\.\d+)*$/);
    }
  });

  test('has the traceability and test jobs, named after their ids', () => {
    expect(JOB_IDS).toEqual(expect.arrayContaining(['traceability', 'test']));
    expect(job('traceability').name).toBe('traceability');
    expect(job('test').name).toBe('test');
  });

  test('each job runs its commands in order', () => {
    expect(job('traceability').steps).toEqual(['actions/checkout', 'actions/setup-node', 'npm ci', 'npm run traceability']);
    expect(job('test').steps).toEqual(['actions/checkout', 'actions/setup-node', 'npm ci', 'npm run typecheck', 'npm run test:fast']);
  });

  test('no job is conditional, a matrix or allowed to fail', () => {
    expect(LINES.filter((line) => /^\s*(?:-\s+)?(if|strategy|matrix|continue-on-error):/.test(line))).toEqual([]);
  });

  test('the ruleset protects main with no bypass', () => {
    expect(RULESET.enforcement).toBe('active');
    expect(RULESET.conditions.ref_name).toEqual({ include: ['refs/heads/main'], exclude: [] });
    expect(RULESET.bypass_actors).toEqual([]);
    expect(RULESET.rules).toEqual([
      { type: 'deletion' },
      { type: 'non_fast_forward' },
      {
        type: 'pull_request',
        parameters: {
          required_approving_review_count: 0,
          dismiss_stale_reviews_on_push: false,
          require_code_owner_review: false,
          require_last_push_approval: false,
          require_extra_approval_for_unattributed_changes: false,
          required_review_thread_resolution: false,
          required_reviewers: [],
          allowed_merge_methods: ['squash'],
        },
      },
      {
        type: 'required_status_checks',
        parameters: {
          strict_required_status_checks_policy: true,
          do_not_enforce_on_create: false,
          required_status_checks: [
            { context: 'traceability', integration_id: 15368 },
            { context: 'test', integration_id: 15368 },
            { context: 'content', integration_id: 15368 },
            { context: 'tokens', integration_id: 15368 },
            { context: 'site', integration_id: 15368 },
            { context: 'local-verify' },
          ],
        },
      },
    ]);
    expect(RULESET.rules.map((rule: { type: string }) => rule.type)).not.toContain('update');
  });

  test('every required check bound to GitHub Actions is a workflow job', () => {
    const names = JOB_IDS.map((id) => job(id).name);
    const actions = REQUIRED.filter((check) => check.integration_id === 15368);
    expect(actions.map((check) => check.context)).toEqual(['traceability', 'test', 'content', 'tokens', 'site']);
    for (const check of actions) expect(names).toContain(check.context);
  });
});

describe('001-requirement-traceability-FR-026: the pull-request check runs the owner local command', () => {
  test('the traceability job runs npm run traceability', () => {
    expect(PACKAGE.scripts.traceability).toEqual(expect.any(String));
    expect(job('traceability').steps).toContain('npm run traceability');
  });
});

describe('001-requirement-traceability-FR-031: pull requests run the fast checks and nothing else', () => {
  test("across all jobs, the run commands are exactly the contract's eight", () => {
    const site = RUNS.filter((command) => command.includes('npm run --silent site-check'));
    expect(site).toHaveLength(1);
    expect([...new Set(RUNS.map((command) => (site.includes(command) ? 'the site-check step' : command)))].sort()).toEqual(
      ['npm ci', 'npm run traceability', 'npm run typecheck', 'npm run test:fast', 'npm run content-check', 'npm run token-check', 'npx playwright install --with-deps chromium', 'the site-check step'].sort(),
    );
  });

  test('the test job runs the fast set and installs no browser', () => {
    expect(job('test').steps).not.toContain('actions/cache');
    expect(job('test').lines.filter((line) => /playwright/i.test(line))).toEqual([]);
    expect(PACKAGE.scripts['test:fast']).toBe('vitest run --project fast');
  });

  test('no line runs the full set or Vitest directly', () => {
    expect(LINES.filter((line) => /\bnpm test\b|\bnpm run test\s|\bvitest\b/.test(line))).toEqual([]);
  });
});

describe("001-requirement-traceability-FR-034: the workflow can't record a sign-off", () => {
  test('the only permission is reading the contents, for the whole workflow', () => {
    expect(block(LINES, /^permissions:\s*$/).filter((line) => line.trim() !== '')).toEqual(['  contents: read']);
    expect(JOBS.filter((line) => /^\s+permissions:/.test(line))).toEqual([]);
  });

  test('no step signs off, verifies or calls the GitHub CLI', () => {
    expect(LINES.filter((line) => /local-verify|signoff|npm run verify|(?:^|[\s;|&(])gh\s/.test(line))).toEqual([]);
  });
});

describe("001-requirement-traceability-FR-035: merging needs the owner's sign-off", () => {
  const rule = RULESET.rules.find((entry: { type: string }) => entry.type === 'required_status_checks');

  test('local-verify is required last, bound to no app, and is no job', () => {
    expect(REQUIRED.at(-1)).toEqual({ context: 'local-verify' });
    expect(Object.keys(REQUIRED.at(-1)!)).toEqual(['context']);
    expect(REQUIRED.filter((check) => !('integration_id' in check)).map((check) => check.context)).toEqual(['local-verify']);
    expect(JOB_IDS.map((id) => job(id).name)).not.toContain('local-verify');
    expect(JOB_IDS).not.toContain('local-verify');
  });

  test('the branch must be up to date, nobody can bypass and there is no update rule', () => {
    expect(rule.parameters.strict_required_status_checks_policy).toBe(true);
    expect(RULESET.bypass_actors).toEqual([]);
    expect(RULESET.rules.map((entry: { type: string }) => entry.type)).not.toContain('update');
  });
});

describe('SC-008: every pull-request job has a 6-minute limit', () => {
  test('each job sets timeout-minutes: 6, and site 20', () => {
    expect(JOB_IDS).toEqual(['traceability', 'test', 'content', 'tokens', 'site']);
    for (const id of JOB_IDS) expect(job(id).lines.filter((line) => /^ {4}timeout-minutes:/.test(line)), id).toEqual([`    timeout-minutes: ${id === 'site' ? 20 : 6}`]);
  });

  test('the test job installs no browser', () => {
    expect(job('test').steps.filter((step) => /playwright|actions\/cache/.test(step))).toEqual([]);
  });
});
