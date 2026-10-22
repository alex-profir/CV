import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { renderReport } from '../src/report.ts';
import type { Problem } from '../src/report.ts';
import { SITE_FILE } from '../src/paths.ts';
import { SAMPLE_RESUME, STARTING_RULES, contentFiles, makeProject } from './helpers/cli.ts';

type Json = Record<string, any>;

const NAME = 'Ioana Testescu';
const EMAIL = 'ioana@cv.test';
// A made-up number from a range reserved for fiction (FR-003).
const PHONE = '+44 20 7946 0958';

const SOURCE = 'packages/web/src/footer.tsx';

// Rules that let site data hold one free-text field, `note`.
const NOTE_RULES = { ...STARTING_RULES, properties: { ...STARTING_RULES.properties, note: { type: 'string' } } };

function resumeWith(change: (resume: Json) => void): Json {
  const resume = structuredClone(SAMPLE_RESUME) as Json;
  change(resume);
  return resume;
}

function facts(problems: Problem[]): Problem[] {
  return problems.filter((problem) => problem.type === 'hardcoded-fact');
}

function brief(problems: Problem[]) {
  return facts(problems).map(({ subject, location }) => `${location.file}:${location.line}:${location.column} ${subject}`);
}

const IN_SOURCE = (kind: string) => `the owner's ${kind} is written out; read it from @cv/content instead`;

describe('002-cv-content-FR-022: key CV facts are not written out in the site', () => {
  test('the name, email and phone in site source are each reported where they are', () => {
    const resume = resumeWith((r) => (r.basics.phone = PHONE));
    const footer = `export const Footer = () => (\n  <p>${NAME}, ${EMAIL}</p>\n);\n// call ${PHONE}\n`;
    const report = runCheck(makeProject(contentFiles({ resume, files: { [SOURCE]: footer } })));
    expect(facts(report.problems)).toEqual([
      { type: 'hardcoded-fact', subject: 'name', location: { file: SOURCE, line: 2, column: 6 }, detail: IN_SOURCE('name') },
      { type: 'hardcoded-fact', subject: 'email', location: { file: SOURCE, line: 2, column: 22 }, detail: IN_SOURCE('email') },
      { type: 'hardcoded-fact', subject: 'phone', location: { file: SOURCE, line: 4, column: 10 }, detail: IN_SOURCE('phone') },
    ]);
  });

  test('the email in site data has its own detail', () => {
    const site = { $schema: './schemas/site.schema.json', note: `Write to ${EMAIL}` };
    const report = runCheck(makeProject(contentFiles({ site, rules: NOTE_RULES })));
    expect(facts(report.problems)).toEqual([
      {
        type: 'hardcoded-fact',
        subject: 'email',
        location: { file: SITE_FILE, line: 3, column: 21 },
        detail: "the owner's email is written out in site data; refer to the CV document instead",
      },
    ]);
  });
});

describe('002-cv-content-FR-023: key facts are read from the CV on every run', () => {
  test('a changed email is searched for, and the old one is not', () => {
    const resume = resumeWith((r) => (r.basics.email = 'ioana.t@cv.test'));
    const files = { [SOURCE]: `old ${EMAIL}\nnew ioana.t@cv.test\n` };
    expect(brief(runCheck(makeProject(contentFiles({ resume, files }))).problems)).toEqual([`${SOURCE}:2:5 email`]);
  });

  test('only the facts the CV publishes are searched for', () => {
    expect(runCheck(makeProject(contentFiles())).factKinds).toEqual(['name', 'email']);
    expect(runCheck(makeProject(contentFiles({ resume: resumeWith((r) => (r.basics.phone = PHONE)) }))).factKinds).toEqual([
      'name',
      'email',
      'phone',
    ]);

    const none = runCheck(makeProject(contentFiles({ resume: resumeWith((r) => (r.basics = { label: 'Engineer' })) })));
    expect(none.factKinds).toEqual([]);
    expect(renderReport(none)).toContain('  Key facts searched for:       none\n');
  });
});

describe('002-cv-content-FR-024: only files that make up the site are searched', () => {
  test('specs, docs, tests, fixtures, tooling, third-party and generated files are skipped', () => {
    const skipped = [
      'specs/x.md',
      'docs/x.md',
      'packages/web/README.md',
      'LICENSE',
      'packages/web/src/a.test.ts',
      'packages/web/test/helper.ts',
      'packages/web/__fixtures__/a.ts',
      'tools/x.ts',
      'node_modules/x/index.js',
      '.github/x.yml',
      'packages/web/src/a.generated.ts',
    ];
    const files = Object.fromEntries(skipped.map((file) => [file, `${NAME}\n`]));
    const root = makeProject(contentFiles({ files: { ...files, 'package.json': `{ "author": "${NAME}" }\n` } }));
    const report = runCheck(root);
    expect(facts(report.problems)).toEqual([]);
    // The three documents are the only files searched, and the CV document is not one of them.
    expect(report.filesSearched).toBe(2);
  });

  test('new root files and site data are searched', () => {
    const site = { $schema: './schemas/site.schema.json', note: NAME };
    const report = runCheck(makeProject(contentFiles({ site, rules: NOTE_RULES, files: { 'notes.txt': `${NAME}\n` } })));
    expect(brief(report.problems)).toEqual(['notes.txt:1:1 name', `${SITE_FILE}:3:12 name`]);
  });

  test('symbolic links are not followed', () => {
    const root = makeProject(contentFiles({ files: { 'outside/name.txt': `${NAME}\n` } }));
    fs.mkdirSync(path.join(root, 'packages/web'), { recursive: true });
    fs.symlinkSync(path.join(root, 'outside'), path.join(root, 'packages/web/linked'));
    fs.symlinkSync(path.join(root, 'outside/name.txt'), path.join(root, 'packages/web/name.txt'));
    expect(brief(runCheck(root).problems)).toEqual(['outside/name.txt:1:1 name']);
  });

  test('files that are not text are skipped and counted', () => {
    const root = makeProject(contentFiles());
    fs.mkdirSync(path.join(root, 'packages/web/public'), { recursive: true });
    fs.writeFileSync(path.join(root, 'packages/web/public/pixel.bin'), Buffer.concat([Buffer.from(NAME), Buffer.from([0])]));
    fs.writeFileSync(path.join(root, 'packages/web/public/latin1.txt'), Buffer.concat([Buffer.from(NAME), Buffer.from([0xe9])]));
    const report = runCheck(root);
    expect(facts(report.problems)).toEqual([]);
    expect(report.filesSkipped).toBe(2);
    expect(report.filesSearched).toBe(2);
  });

  test.skipIf(process.getuid?.() === 0)('a directory that cannot be read is unreadable-document', () => {
    const root = makeProject(contentFiles({ files: { 'packages/web/src/a.ts': 'export {};\n' } }));
    const dir = path.join(root, 'packages/web/src');
    fs.chmodSync(dir, 0o000);
    try {
      expect(runCheck(root).problems).toEqual([
        {
          type: 'unreadable-document',
          subject: 'packages/web/src',
          location: { file: 'packages/web/src', line: 1, column: 1 },
          detail: 'cannot be read: EACCES',
        },
      ]);
    } finally {
      fs.chmodSync(dir, 0o755);
    }
  });
});

describe('002-cv-content-FR-025: key facts are found however they are written', () => {
  test('the name and email in any letter case and spacing', () => {
    const files = { [SOURCE]: `IOANA TESTESCU\nIoana  Testescu\nIOANA@CV.TEST\n` };
    expect(brief(runCheck(makeProject(contentFiles({ files }))).problems)).toEqual([
      `${SOURCE}:1:1 name`,
      `${SOURCE}:2:1 name`,
      `${SOURCE}:3:1 email`,
    ]);
  });

  test('the phone with or without its prefix and with any separators', () => {
    const resume = resumeWith((r) => (r.basics.phone = PHONE));
    const lines = ['+442079460958', '0044 20-7946-0958', 'call (020) 7946.0958', '20 7946 0958', '20 7946 09581'];
    const files = { [SOURCE]: `${lines.join('\n')}\n` };
    expect(brief(runCheck(makeProject(contentFiles({ resume, files }))).problems)).toEqual([
      `${SOURCE}:1:2 phone`,
      `${SOURCE}:2:1 phone`,
      `${SOURCE}:3:7 phone`,
      `${SOURCE}:4:1 phone`,
    ]);
  });
});
