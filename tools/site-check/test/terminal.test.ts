// The terminal part (006 contracts/cli.md Parts and Tests): on the real
// build it passes in both shells; each copy with one fault fails with the
// line that names it. Broken cases are copies of the repository with one
// change, built (005 tasks.md Notes).
import fs from 'node:fs';
import path from 'node:path';
import type { Browser } from 'playwright';
import { afterAll, beforeAll, describe, expect, onTestFinished, test, vi } from 'vitest';
import { launchChromium } from '../src/browser.ts';
import { RESUME_FILE, SITE_DIR, readManifest, runCheck } from '../src/check.ts';
import { CV_COMMANDS, terminalFields } from '../src/expected.ts';
import type { CvCommand } from '../src/expected.ts';
import { elementSequence, fieldProblems } from '../src/parts/no-script.ts';
import { summaryWord, terminalVariant } from '../src/parts/terminal.ts';
import { renderProblem } from '../src/report.ts';
import { startServer } from '../src/server.ts';
import { ENDLESS_LINE, openTerminal, runCommand, shellContext, SHELL_SIZES, waitForShell } from '../src/shell-states.ts';
import type { Shell } from '../src/shell-states.ts';
import { repoCopy } from '../../../packages/web/test/helpers/copy.ts';
import { runCli as runContentCheck } from '../../content-check/test/helpers/cli.ts';
import { realSiteProject, replaceIn, seededCopy } from './helpers/root.ts';
import { REPO_ROOT } from './helpers/sites.ts';

vi.setConfig({ testTimeout: 300_000 });

const resume = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, RESUME_FILE), 'utf8'));

const SHELLS: readonly Shell[] = ['desktop', 'mobile'];

const variants = (name: string) => SHELLS.map((shell) => terminalVariant(shell, name, SHELL_SIZES[shell].width));

const writeResume = (root: string, edit: (cv: typeof resume) => void) => {
  const cv = structuredClone(resume);
  edit(cv);
  fs.writeFileSync(path.join(root, RESUME_FILE), `${JSON.stringify(cv, null, 2)}\n`);
};

let browser: Browser;

beforeAll(async () => {
  browser = await launchChromium();
});

afterAll(async () => {
  await browser?.close();
});

describe('006-terminal-FR-040: the terminal part runs every CV command, the JSON and the file system in both shells', () => {
  test('on the real build the part passes, with one result per command, the JSON and the files, in each shell', async () => {
    const report = await runCheck(realSiteProject(), { parts: ['terminal'] });
    expect(report.problems.map(renderProblem)).toEqual([]);
    expect(report.results.map(({ variant, status }) => `${variant} ${status}`)).toEqual(
      SHELLS.flatMap((shell) => [...CV_COMMANDS, 'json', 'files', 'shell'].map((name) => `${terminalVariant(shell, name, SHELL_SIZES[shell].width)} pass`)),
    );
  });

  test('a CV with one more work entry still passes: the expected fields are read from the CV document', async () => {
    const root = seededCopy((copy) =>
      writeResume(copy, (cv) => {
        cv.work.push({ name: 'Second Company', position: 'Engineer', startDate: '2016-01', endDate: '2018-06', summary: 'Built things.' });
      }),
    );
    const report = await runCheck(root, { parts: ['terminal'] });
    expect(report.problems.map(renderProblem)).toEqual([]);
  });

  test("a copy whose work entry drops its end date fails with missing-field, naming the command, the field and the shell", async () => {
    const end = resume.work[0].endDate as string;
    const root = seededCopy((copy) =>
      replaceIn(copy, 'packages/web/src/apps/terminal/engine/cv.ts', '    range: input.format.dateRange(work.startDate, work.endDate),', '    range: input.format.dateRange(work.startDate, undefined),'),
    );
    const report = await runCheck(root, { parts: ['terminal'] });
    const lines = report.problems.map(renderProblem);
    const [year, month] = end.split('-');
    const visible = `${new Date(Date.UTC(Number(year), Number(month) - 1)).toLocaleString('en', { month: 'short', timeZone: 'UTC' })} ${year}`;
    for (const variant of variants('work')) expect(lines).toContain(`terminal / ${variant} missing-field work[0].endDate: "${visible}" is not in the output of work`);
    // `cat` builds a file with the same builder, so the file fails too.
    for (const variant of variants('files')) expect(lines).toContain(`terminal / ${variant} file-mismatch ~/work/sc-moredevs-srl: cat differs from work's entry at "${visible}"`);
  });

  test('a copy with no file for a project fails with missing-file, naming the folder and the entry', async () => {
    const root = seededCopy((copy) =>
      replaceIn(
        copy,
        'packages/web/src/apps/terminal/engine/files.ts',
        'children: entries.map((entry, index) => (',
        "children: entries.map((entry, index) => ({ entry, index })).filter(({ index }) => !(section === 'projects' && index === 2)).map(({ entry, index }) => (",
      ),
    );
    const report = await runCheck(root, { parts: ['terminal'] });
    const lines = report.problems.map(renderProblem);
    for (const variant of variants('files')) expect(lines).toContain(`terminal / ${variant} missing-file projects[2].name: ~/projects has no file for ${JSON.stringify(resume.projects[2].name)}`);
    expect(new Set(report.problems.map((problem) => problem.type))).toEqual(new Set(['missing-file']));
  });

  test('a copy whose vim view drops a line fails with json-mismatch, naming the line', async () => {
    const root = seededCopy((copy) => replaceIn(copy, 'packages/web/src/apps/terminal/VimView.tsx', '        {lines.map((line) => {', '        {lines.filter((line) => line !== 3).map((line) => {'));
    const report = await runCheck(root, { parts: ['terminal'] });
    const expected = JSON.stringify(resume, null, 2).split('\n');
    const token = (line: string) => line.match(/"(?:[^"\\]|\\.)*"|[^\s"]+/g)![0];
    const lines = report.problems.map(renderProblem);
    expect(lines).toEqual(variants('json').map((variant) => `terminal / ${variant} json-mismatch cv.json line 4: the vim view shows ${token(expected[4]!)} where the CV document has ${token(expected[3]!)}`));
  });
});

// The shell's lines (contracts/cli.md, added 2026-10-29), under
// `<shell>/terminal/shell/<width>px`.
const ADAPTER = 'packages/web/src/apps/terminal/shell/adapter.ts';

const SHARED_OUTPUT = 'const shared = { id, stdout: result.stdout, stderr,';

// A copy whose shell prints nothing for lines that start with `start`.
const silent = (start: string) => (copy: string) => replaceIn(copy, ADAPTER, SHARED_OUTPUT, `const shared = { id, stdout: request.line.startsWith(${JSON.stringify(start)}) ? '' : result.stdout, stderr,`);

describe("006-terminal-FR-040: the terminal part types the shell's lines in both shells, and names the line that differs", () => {
  test('a copy where rm about succeeds fails, naming the line and about', async () => {
    const root = seededCopy((copy) =>
      replaceIn(copy, 'packages/web/src/apps/terminal/shell/fs.ts', '  override async rm(path: string, options?: RmOptions) {\n    const at = this.canonical(path);\n    this.guard(at);\n', '  override async rm(path: string, options?: RmOptions) {\n    const at = this.canonical(path);\n'),
    );
    const report = await runCheck(root, { parts: ['terminal'] });
    const lines = report.problems.map(renderProblem);
    for (const variant of variants('shell')) {
      expect(lines).toContain(`terminal / ${variant} line-mismatch rm about: prints nothing where it should print "Permission denied"`);
      expect(lines).toContainEqual(expect.stringMatching(new RegExp(`^terminal / ${variant} line-mismatch cat about: prints .+ after echo and rm, where it printed .+ before$`)));
    }
  });

  test('006-terminal-FR-040: a copy where :w writes a protected file fails, naming the line', async () => {
    const root = seededCopy((copy) => {
      replaceIn(copy, 'packages/web/src/apps/terminal/shell/site-commands.ts', 'readonly: shell.fs.isProtected(path), new: false', 'readonly: false, new: false');
      replaceIn(copy, 'packages/web/src/apps/terminal/shell/adapter.ts', "if (stat?.isDirectory === true || fs.refusesWrite(path)) return refuse('cant-open');", "if (stat?.isDirectory === true) return refuse('cant-open');");
    });
    const lines = (await runCheck(root, { parts: ['terminal'] })).problems.map(renderProblem);
    for (const variant of variants('shell')) expect(lines).toContainEqual(expect.stringMatching(new RegExp(`^terminal / ${variant} line-mismatch vim about :w: .+, where it should show E45$`)));
  });

  test('006-terminal-FR-040: a copy where :wq loses the typed line fails, naming the shell and cat notes', async () => {
    const root = seededCopy((copy) => replaceIn(copy, 'packages/web/src/apps/terminal/session.ts', 'void write(next.write.path, next.write.text, next.write.force)', "void write(next.write.path, '', next.write.force)"));
    const lines = (await runCheck(root, { parts: ['terminal'] })).problems.map(renderProblem);
    for (const variant of variants('shell')) expect(lines).toContainEqual(expect.stringMatching(new RegExp(`^terminal / ${variant} line-mismatch cat notes: prints .+ after :wq, where it should print "a line of notes"$`)));
  });

  test("a copy where jq '.work[0].name' cv.json prints nothing fails, naming the line and the CV's name", async () => {
    const report = await runCheck(seededCopy(silent('jq ')), { parts: ['terminal'] });
    const lines = report.problems.map(renderProblem);
    for (const variant of variants('shell')) expect(lines).toContain(`terminal / ${variant} line-mismatch jq '.work[0].name' cv.json: prints nothing where the CV document has ${JSON.stringify(resume.work[0].name)}`);
    // `cat cv.json | jq` starts otherwise, so the JSON still passes.
    expect(report.problems.filter((problem) => problem.variant.includes('/json/'))).toEqual([]);
  });

  test('a copy where grep -ril misses a work file fails, naming the line and the file', async () => {
    const word = summaryWord(resume)!;
    const report = await runCheck(seededCopy(silent('grep -ril ')), { parts: ['terminal'] });
    const lines = report.problems.map(renderProblem);
    for (const variant of variants('shell')) {
      expect(lines).toContainEqual(expect.stringMatching(new RegExp(`^terminal / ${variant.replace(/[.]/g, '\\.')} line-mismatch grep -ril ${word} ~/work: misses ~/work/\\S+, which holds "${word}"$`)));
    }
  });

  test('a copy where a line that never ends is not stopped fails, naming the line', async () => {
    const root = seededCopy((copy) => {
      replaceIn(copy, ADAPTER, 'export const LIMITS = { time: 5000, commands: 10_000,', 'export const LIMITS = { time: 600_000, commands: 1_000_000_000,');
      replaceIn(copy, 'packages/web/src/apps/terminal/shell-client.ts', '  run: 6_000,', '  run: 600_000,');
    });
    const report = await runCheck(root, { parts: ['terminal'] });
    const lines = report.problems.map(renderProblem);
    for (const variant of variants('shell')) expect(lines).toContain(`terminal / ${variant} not-stopped ${ENDLESS_LINE}: still running 10 s after Enter`);
  });
});

describe('006-terminal-FR-009: every CV command shows /cv\'s fields, in order, in both shells', () => {
  test.each(SHELLS)('on the real build in the %s shell, each command\'s output holds terminalFields(resume, command)', async (shell) => {
    const root = realSiteProject();
    const server = await startServer({ siteDir: path.join(root, SITE_DIR), manifest: readManifest(root) });
    onTestFinished(() => server.close());
    const context = await browser.newContext({ serviceWorkers: 'block', ...shellContext({ shell, ...SHELL_SIZES[shell] }) });
    onTestFinished(() => context.close());
    const page = await context.newPage();
    await page.goto(`${server.url}/`, { waitUntil: 'load' });
    await waitForShell(page);
    await openTerminal(page, shell);
    const found: Record<string, unknown> = {};
    for (const command of CV_COMMANDS as readonly CvCommand[]) {
      const run = await runCommand(page, command);
      const fields = terminalFields(resume, command);
      expect(fields.length).toBeGreaterThan(0);
      found[command] = fieldProblems(await elementSequence(run.locator('.run-output')), fields, '', `the output of ${command}`);
    }
    expect(found).toEqual(Object.fromEntries(CV_COMMANDS.map((command) => [command, []])));
  });

  test("terminalFields heads an entry with its title before its dates, and splits the basics into about and contact", () => {
    const work = terminalFields(resume, 'work').filter((field) => field.path.startsWith('work[0].')).map((field) => field.path);
    expect(work.slice(0, 4)).toEqual(['work[0].position', 'work[0].name', 'work[0].startDate', 'work[0].endDate']);
    expect(terminalFields(resume, 'about').map((field) => field.path)).toEqual(expect.arrayContaining(['basics.name', 'basics.label', 'basics.summary']));
    expect(terminalFields(resume, 'about').some((field) => field.path === 'basics.email')).toBe(false);
    expect(terminalFields(resume, 'contact').map((field) => field.path)).toEqual(['basics.email', 'basics.profiles[0].url', 'basics.profiles[0].network', 'basics.profiles[0].username']);
  });
});

describe('006-terminal-FR-010: every word of the Terminal comes from the CV document or site text', () => {
  test("a copy with the owner's email typed into siteText.terminal fails the content check, naming the file and line", () => {
    const root = repoCopy();
    replaceIn(root, 'packages/web/src/site-text.ts', '  terminal: {\n', `  terminal: {\n    owner: '${resume.basics.email}',\n`);
    const run = runContentCheck(root);
    expect(run.status).toBe(1);
    const text = fs.readFileSync(path.join(root, 'packages/web/src/site-text.ts'), 'utf8');
    const line = text.split('\n').findIndex((each) => each.includes(resume.basics.email)) + 1;
    expect(`${run.stdout}${run.stderr}`).toContain(`packages/web/src/site-text.ts:${line}`);
  });
});

describe('006-terminal-FR-013: specs lists every spec folder of the repository, read at build time', () => {
  test('a spec folder added in a copy shows in specs, and has its file in ~/specs', async () => {
    const root = seededCopy((copy) => {
      const folder = path.join(copy, 'specs/999-extra');
      fs.mkdirSync(folder, { recursive: true });
      fs.writeFileSync(path.join(folder, 'spec.md'), '# Feature Specification: Extra\n\n**Status**: Draft\n\n- **999-extra-FR-001**: The extra spec MUST exist.\n');
    });
    const server = await startServer({ siteDir: path.join(root, SITE_DIR), manifest: readManifest(root) });
    onTestFinished(() => server.close());
    const context = await browser.newContext({ serviceWorkers: 'block', ...shellContext({ shell: 'desktop', ...SHELL_SIZES.desktop }) });
    onTestFinished(() => context.close());
    const page = await context.newPage();
    await page.goto(`${server.url}/`, { waitUntil: 'load' });
    await waitForShell(page);
    await openTerminal(page, 'desktop');
    const specs = await runCommand(page, 'specs');
    expect(await specs.locator('.out-specs a[href$="/specs/999-extra/spec.md"]').count()).toBe(1);
    const report = await runCheck(root, { parts: ['terminal'] });
    expect(report.problems.filter((problem) => problem.variant.includes('/files/')).map(renderProblem)).toEqual([]);
  });
});
