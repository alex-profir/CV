// The terminal part (006 contracts/cli.md Parts, FR-040, SC-003, SC-011): in
// each shell, the Terminal opened as a visitor opens it shows the CV document
// and nothing else. Every CV command is typed and its output compared, in
// order, with `terminalFields`; `cat cv.json`, `jq` and the vim view with
// every fold open are compared with the CV document's JSON line by line; and
// every folder is listed and every file read, one file per entry and per
// spec, each showing what its named command shows.
import type { Locator, Page } from 'playwright';
import type { Resume } from '@cv/content';
import { fileName, folderNames } from '../../../../packages/web/src/apps/terminal/engine/files.ts';
import { siteText } from '../../../../packages/web/src/site-text.ts';
import { SHOWN_FIELDS } from '../../../../packages/web/src/supported.ts';
import { CV_COMMANDS, terminalFields } from '../expected.ts';
import type { CvCommand, ExpectedField } from '../expected.ts';
import type { Problem } from '../report.ts';
import { TERMINAL, openTerminal, runCommand, settle, stateVariant, typeLine, vimEntry, vimKeys } from '../shell-states.ts';
import type { Shell } from '../shell-states.ts';
import { elementSequence, fieldProblems } from './no-script.ts';

export type TerminalRun = { variant: string; problems: Problem[] };

type Found = Omit<Problem, 'part' | 'page' | 'variant'>;

const ENTRY_SECTIONS = ['work', 'projects', 'education'] as const;

type EntrySection = (typeof ENTRY_SECTIONS)[number];

// The field a file in an entry folder is named from (FR-044).
const NAME_FIELD: Record<EntrySection, string> = { work: 'name', projects: 'name', education: 'institution' };

// The home folder's files that show a CV command.
const LIST_FILES = ['about', 'contact', 'skills', 'languages', 'interests'] as const;

const WAIT_MS = 5_000;

export const terminalVariant = (shell: Shell, name: string, width: number) => stateVariant(shell, `terminal/${name}`, width);

const output = (run: Locator) => run.locator('.run-output');

// A run's output as the field checks read it: empty when it has none.
async function outputSequence(run: Locator): Promise<string> {
  const found = output(run);
  return (await found.count()) === 0 ? '' : elementSequence(found.first());
}

const shown = (field: ExpectedField) => ('datetime' in field ? (field.visible ?? field.datetime) : 'href' in field ? field.href : field.text);

// ---- The CV commands --------------------------------------------------------

async function commandProblems(page: Page, resume: Resume, command: CvCommand): Promise<Found[]> {
  const sequence = await outputSequence(await runCommand(page, command));
  return fieldProblems(sequence, terminalFields(resume, command), '', `the output of ${command}`);
}

// ---- The JSON ---------------------------------------------------------------

const TOKEN = /"(?:[^"\\]|\\.)*"|[^\s"]+/g;

// The first line a source shows that differs from the CV document's JSON,
// named by its first differing token, or by its indent.
export function jsonMismatch(source: string, lines: readonly string[], expected: readonly string[]): Found | null {
  for (let index = 0; index < Math.max(lines.length, expected.length); index += 1) {
    const actual = lines[index];
    const wanted = expected[index];
    if (actual === wanted) continue;
    const subject = `cv.json line ${index + 1}`;
    const has = actual?.match(TOKEN) ?? [];
    const want = wanted?.match(TOKEN) ?? [];
    const at = [...Array(Math.max(has.length, want.length)).keys()].find((token) => has[token] !== want[token]);
    if (at === undefined) {
      const indent = (line: string | undefined) => (line ?? '').length - (line ?? '').trimStart().length;
      return { type: 'json-mismatch', subject, detail: `${source} indents it by ${indent(actual)} where the CV document indents it by ${indent(wanted)}` };
    }
    return { type: 'json-mismatch', subject, detail: `${source} shows ${has[at] ?? 'nothing'} where the CV document has ${want[at] ?? 'nothing'}` };
  }
  return null;
}

async function jsonProblems(page: Page, resume: Resume): Promise<Found[]> {
  const expected = JSON.stringify(resume, null, 2).split('\n');
  const found: (Found | null)[] = [];
  const cat = output(await runCommand(page, 'cat cv.json'));
  found.push(jsonMismatch('cat cv.json', ((await cat.count()) === 0 ? '' : ((await cat.first().textContent()) ?? '')).split('\n'), expected));
  const jq = await runCommand(page, 'cat cv.json | jq');
  const rows = await jq.locator('.json-row').evaluateAll((elements) => elements.map((row) => ' '.repeat(Number.parseInt((row as HTMLElement).style.getPropertyValue('--indent'), 10) || 0) + (row.textContent ?? '')));
  found.push(jsonMismatch('jq', rows, expected));
  await typeLine(page, 'cv');
  await page.locator(TERMINAL.vimText).waitFor({ state: 'visible', timeout: WAIT_MS });
  await vimKeys(page, ['z', 'R']);
  await settle(page);
  // A row's indent is in its style, not its text (FR-063).
  const lines = await page
    .locator(TERMINAL.vimLine)
    .evaluateAll((elements) => elements.map((line) => ' '.repeat(Number.parseInt((line as HTMLElement).style.getPropertyValue('--indent'), 10) || 0) + (line.querySelector('.vim-code')?.textContent ?? '').trimEnd()));
  found.push(jsonMismatch('the vim view', lines, expected));
  await vimEntry(page, ':', 'q');
  await page.locator(TERMINAL.commandLine).waitFor({ state: 'visible', timeout: WAIT_MS });
  return found.filter((problem): problem is Found => problem !== null);
}

// ---- The file system --------------------------------------------------------

// The names an `ls` lists, as it shows them: a folder ends in `/`.
const listed = async (page: Page, path: string) => (await runCommand(page, `ls ${path}`)).locator('ul.out-columns > li').allTextContents();

const present = (value: unknown) => (typeof value === 'string' ? value !== '' : Array.isArray(value) && value.some(present));

// Each entry /cv shows, with its place in the CV document.
function shownEntries(resume: Resume, section: EntrySection): { index: number; entry: Record<string, unknown> }[] {
  const entries = ((resume as Record<string, unknown>)[section] as unknown[] | undefined) ?? [];
  return entries.flatMap((entry, index) =>
    typeof entry === 'object' && entry !== null && SHOWN_FIELDS[section].some((field) => present((entry as Record<string, unknown>)[field])) ? [{ index, entry: entry as Record<string, unknown> }] : [],
  );
}

// `cat` of a file, compared with the fields it must show: the first one it
// doesn't, named.
async function fileProblem(page: Page, path: string, fields: readonly ExpectedField[], what: string): Promise<Found | null> {
  const sequence = await outputSequence(await runCommand(page, `cat ${path}`));
  const [first] = fieldProblems(sequence, fields, '');
  if (first === undefined) return null;
  const field = fields.find((each) => each.path === first.subject)!;
  return { type: 'file-mismatch', subject: path, detail: `cat differs from ${what} at ${JSON.stringify(shown(field))}` };
}

async function entryFolderProblems(page: Page, resume: Resume, section: EntrySection, home: readonly string[]): Promise<Found[]> {
  const entries = shownEntries(resume, section);
  const fields = terminalFields(resume, section);
  const singular = siteText.terminal.singular[section];
  const names = folderNames(entries.map(({ entry }) => ({ name: fileName(typeof entry[NAME_FIELD[section]] === 'string' ? (entry[NAME_FIELD[section]] as string) : '', singular), start: typeof entry.startDate === 'string' ? entry.startDate : undefined })));
  const files = home.includes(`${section}/`) ? await listed(page, `~/${section}`) : [];
  const found: Found[] = [];
  for (const [at, { index, entry }] of entries.entries()) {
    const name = names[at]!;
    const label = typeof entry[NAME_FIELD[section]] === 'string' && entry[NAME_FIELD[section]] !== '' ? (entry[NAME_FIELD[section]] as string) : name;
    if (!files.includes(name)) {
      found.push({ type: 'missing-file', subject: `${section}[${index}].${NAME_FIELD[section]}`, detail: `~/${section} has no file for ${JSON.stringify(label)}` });
      continue;
    }
    const own = fields.filter((field) => field.path.startsWith(`${section}[${index}].`));
    const problem = await fileProblem(page, `~/${section}/${name}`, own, `${section}'s entry`);
    if (problem !== null) found.push(problem);
  }
  for (const file of files) if (!names.includes(file)) found.push({ type: 'extra-file', subject: `~/${section}/${file}`, detail: `no ${section} entry of the CV document has this file` });
  return found;
}

// `specs` lists every spec; `~/specs` holds one file for each, showing its
// row.
async function specFileProblems(page: Page, home: readonly string[]): Promise<Found[]> {
  const rows = (await runCommand(page, 'specs')).locator('.out-specs .out-row');
  const specs: { folder: string; row: string }[] = [];
  for (const row of await rows.all()) {
    const href = (await row.locator('a[href]').first().getAttribute('href')) ?? '';
    specs.push({ folder: /\/specs\/([^/]+)\/spec\.md$/.exec(href)?.[1] ?? href, row: await elementSequence(row) });
  }
  const files = home.includes('specs/') ? await listed(page, '~/specs') : [];
  const found: Found[] = [];
  for (const [index, { folder, row }] of specs.entries()) {
    if (!files.includes(folder)) {
      found.push({ type: 'missing-file', subject: `specs[${index}]`, detail: `~/specs has no file for ${JSON.stringify(folder)}` });
      continue;
    }
    const cat = (await runCommand(page, `cat ~/specs/${folder}`)).locator('.out-row');
    const shownRow = (await cat.count()) === 0 ? '' : await elementSequence(cat.first());
    if (shownRow !== row) found.push({ type: 'file-mismatch', subject: `~/specs/${folder}`, detail: "cat differs from the spec's row in specs" });
  }
  for (const file of files) if (!specs.some((spec) => spec.folder === file)) found.push({ type: 'extra-file', subject: `~/specs/${file}`, detail: 'specs lists no such spec' });
  return found;
}

async function fileProblems(page: Page, resume: Resume): Promise<Found[]> {
  const home = await listed(page, '~');
  const found: Found[] = [];
  const expected = new Set(['cv.json', 'readme', 'specs/']);
  for (const command of LIST_FILES) {
    const fields = terminalFields(resume, command);
    if (fields.length === 0) continue;
    expected.add(command);
    if (!home.includes(command)) {
      found.push({ type: 'missing-file', subject: command, detail: `~ has no file for ${command}` });
      continue;
    }
    const problem = await fileProblem(page, `~/${command}`, fields, command);
    if (problem !== null) found.push(problem);
  }
  for (const section of ENTRY_SECTIONS) {
    if (shownEntries(resume, section).length > 0) expected.add(`${section}/`);
    found.push(...(await entryFolderProblems(page, resume, section, home)));
  }
  if (!home.includes('readme')) found.push({ type: 'missing-file', subject: 'readme', detail: '~ has no file for site' });
  else {
    const site = await outputSequence(await runCommand(page, 'site'));
    const readme = await outputSequence(await runCommand(page, 'cat ~/readme'));
    if (readme !== site) found.push({ type: 'file-mismatch', subject: '~/readme', detail: 'cat differs from the output of site' });
  }
  found.push(...(await specFileProblems(page, home)));
  for (const name of home) if (!expected.has(name)) found.push({ type: 'extra-file', subject: `~/${name}`, detail: 'the home folder holds nothing by this name' });
  return found;
}

// ---- The part ---------------------------------------------------------------

// The part's variants in a shell, in the order it runs them.
export const terminalVariants = (shell: Shell, width: number) => [...CV_COMMANDS, 'json', 'files'].map((name) => terminalVariant(shell, name, width));

// On a fresh, hydrated page of the root in `shell`: opens the Terminal and
// runs every check, each under its own variant.
export async function terminalProblems(page: Page, shell: Shell, resume: Resume, pageLabel: string, width: number): Promise<TerminalRun[]> {
  await openTerminal(page, shell);
  const runs: TerminalRun[] = [];
  const add = (name: string, found: readonly Found[]) => {
    const variant = terminalVariant(shell, name, width);
    runs.push({ variant, problems: found.map((problem) => ({ part: 'terminal', page: pageLabel, variant, ...problem })) });
  };
  for (const command of CV_COMMANDS) add(command, await commandProblems(page, resume, command));
  add('json', await jsonProblems(page, resume));
  add('files', await fileProblems(page, resume));
  return runs;
}
