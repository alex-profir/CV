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

// The seeded samples (SC-001). Each seeded case and the line it produces in
// expected-report.txt:
//
// seeded/ (every part runs):
//   basics.label "Software Engineer "        → untrimmed-text basics.label
//   basics.picture                            → undefined-field basics.picture
//   basics.url "ioana.cv.test"                → invalid-format basics.url
//   countryCode "Romania"                     → invalid-format basics.location.countryCode
//   work[0].featured                          → undefined-field work[0].featured
//   ongoing work[2] after finished work[0]    → out-of-order work[2]
//   work[3].highlights as a string            → schema-violation work[3].highlights
//   education[1] and [2], both no studyType   → duplicate-entry education[1]
//   education[1] ends 2015-06, starts 2016    → end-before-start education[1].endDate
//   project "Ghid Timișoara" in NFC and NFD   → duplicate-entry projects[0]
//   projects[0].url on example.com            → placeholder projects[0].url
//   2021-02-30                                → invalid-date projects[2].startDate (not real)
//   2020/05                                   → invalid-date projects[3].startDate (form)
//   meta canonical, version, lastModified     → placeholder meta.* (three lines)
//   top-level theme                           → undefined-field theme
//   site: reference to the duplicated project → ambiguous-reference featuredProjects[0]
//   site: "Missing Project"                   → dangling-reference featuredProjects[1]
//   site: profile "GitLab"                    → dangling-reference contact.profile
//   site: the email written out               → hardcoded-fact email (site data detail)
//   site: work reference, wrong position      → dangling-reference highlight
//   site: work reference to an entry with no position → dangling-reference pastHighlight
//   site: extra                               → undefined-field extra
//   footer.tsx: name with two spaces, email in capitals, (020) phone → hardcoded-fact name, email, phone
// Silent: volunteer [], year and year-month dates, start 2020-05 with end
// 2020, an ongoing role, NFD and non-ASCII text, two roles at one company,
// education entries missing different fields, equal dates at shared precision,
// an undated project, the remote $schema link, pixel.bin (skipped, not text),
// and the facts in specs/, docs/, README.md, a test, a fixture, tools/ and a
// generated file.
//
// seeded-broken/ (the two types that stop a part):
//   no rules file                             → missing-document
//   site.json with a trailing comma           → unreadable-document
//   contact.ts with the email                 → hardcoded-fact email
describe('seeded samples (SC-001)', () => {
  const FIXTURES = path.join(REPO_ROOT, 'tools/content-check/test/__fixtures__');
  const SAMPLES = ['seeded', 'seeded-broken'];
  const expected = (sample: string) => fs.readFileSync(path.join(FIXTURES, sample, 'expected-report.txt'), 'utf8');

  for (const sample of SAMPLES) {
    test(`${sample} gives exactly its expected report`, () => {
      const result = runCli(path.join(FIXTURES, sample));
      expect(result.stderr).toBe('');
      expect(result.status).toBe(1);
      expect(result.stdout).toBe(expected(sample));
    });
  }

  test('together the samples hold every problem type', () => {
    const counts = new Map<string, number>();
    for (const sample of SAMPLES) {
      for (const [, type, count] of expected(sample).matchAll(/^ {4}([a-z-]+) +(\d+)$/gm)) {
        counts.set(type!, (counts.get(type!) ?? 0) + Number(count));
      }
    }
    expect(counts.size).toBe(14);
    for (const [type, count] of counts) expect(count, type).toBeGreaterThan(0);
  });

  test('third-party code and version-control data are not searched', () => {
    const root = makeProject({});
    fs.cpSync(path.join(FIXTURES, 'seeded'), root, { recursive: true });
    const email = 'ioana@cv.test';
    fs.mkdirSync(path.join(root, 'node_modules/x'), { recursive: true });
    fs.writeFileSync(path.join(root, 'node_modules/x/index.js'), `module.exports = '${email}';\n`);
    fs.mkdirSync(path.join(root, '.git'));
    fs.writeFileSync(path.join(root, '.git/x'), `${email}\n`);
    expect(runCli(root).stdout).toBe(expected('seeded'));
  });
});
