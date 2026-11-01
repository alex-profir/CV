// Checks the committed workflow and ruleset against contracts/ci.md, reading
// ci.yml as plain text with the same layout rules as 001's to 003's
// repo-settings tests (no YAML parser).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { REPO_ROOT } from './helpers/sites.ts';

const LINES = fs.readFileSync(path.join(REPO_ROOT, '.github/workflows/ci.yml'), 'utf8').split('\n');
const RULESET = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.github/rulesets/main.json'), 'utf8'));
const LOCK = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package-lock.json'), 'utf8'));

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

// A step's `with:` values, by the line its `uses:` is on.
function withValues(lines: string[], uses: RegExp): Record<string, string> {
  const start = lines.findIndex((line) => uses.test(line));
  if (start === -1) return {};
  return Object.fromEntries(block(lines.slice(start), /^\s*with:\s*$/).flatMap((line) => {
    const match = /^\s*([\w-]+):\s*(.+?)\s*$/.exec(line);
    return match === null ? [] : [[match[1]!, match[2]!]];
  }));
}

const REQUIRED = RULESET.rules.find((rule: { type: string }) => rule.type === 'required_status_checks').parameters.required_status_checks;

const PLAYWRIGHT_VERSION: string = LOCK.packages['node_modules/playwright'].version;

const CHECK_STEP = /^set -o pipefail; .*\bnpm run --silent site-check \| tee -a "\$GITHUB_STEP_SUMMARY".*$/;

describe('004-cv-page-FR-048: every pull request checks the built site, and merging needs it to pass', () => {
  test('the site job is named site, and its steps are checkout, setup-node, npm ci, the browser cache, the browser install and the check', () => {
    expect(JOB_IDS).toContain('site');
    const site = job('site');
    expect(site.name).toBe('site');
    expect(site.steps.slice(0, -1)).toEqual(['actions/checkout', 'actions/setup-node', 'npm ci', 'actions/cache', 'npx playwright install --with-deps chromium']);
    expect(site.steps).toHaveLength(6);
    expect(site.steps.at(-1)).toMatch(CHECK_STEP);
  });

  test("the site job's browser cache is keyed by the Playwright version in package-lock.json", () => {
    const values = withValues(job('site').lines, /uses: actions\/cache@/);
    expect(values.path).toBe('~/.cache/ms-playwright');
    expect(values.key).toBe(`playwright-\${{ runner.os }}-${PLAYWRIGHT_VERSION}`);
  });

  test('the check step sets pipefail, pipes the report through tee and writes it to the job summary in a fenced block', () => {
    const step = job('site').steps.at(-1)!;
    expect(step).toMatch(/^set -o pipefail;/);
    expect(step).toContain('| tee -a "$GITHUB_STEP_SUMMARY"');
    expect(step).toContain("echo '```text' >> \"$GITHUB_STEP_SUMMARY\"");
    expect(step).toContain("echo '```' >> \"$GITHUB_STEP_SUMMARY\"");
    expect(step).toMatch(/exit "\$status"$/);
  });

  test('the site job is not conditional, a matrix or allowed to fail', () => {
    expect(job('site').lines.filter((line) => /^\s*(?:-\s+)?(if|strategy|matrix|continue-on-error):/.test(line))).toEqual([]);
  });

  test('the test job installs no browser and runs the typecheck and the fast set', () => {
    expect(job('test').steps).toEqual(['actions/checkout', 'actions/setup-node', 'npm ci', 'npm run typecheck', 'npm run test:fast']);
    expect(job('test').lines.filter((line) => /actions\/cache|playwright install/.test(line))).toEqual([]);
  });

  test('every action is pinned to a full commit SHA with its version in a comment', () => {
    const uses = LINES.filter((line) => /^\s*(?:-\s+)?uses:/.test(line));
    expect(uses.some((line) => line.includes('actions/cache@'))).toBe(true);
    for (const line of uses) expect(line).toMatch(/uses: [\w-]+\/[\w-]+@[0-9a-f]{40} # v\d+(\.\d+)*$/);
  });

  test('the ruleset requires traceability, test, content, tokens and site', () => {
    expect(REQUIRED).toEqual([
      { context: 'traceability', integration_id: 15368 },
      { context: 'test', integration_id: 15368 },
      { context: 'content', integration_id: 15368 },
      { context: 'tokens', integration_id: 15368 },
      { context: 'site', integration_id: 15368 },
    ]);
    for (const check of REQUIRED.filter((entry: { integration_id?: number }) => entry.integration_id === 15368)) expect(JOB_IDS).toContain(check.context);
  });
});
