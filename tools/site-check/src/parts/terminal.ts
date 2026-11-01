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
import { fullText } from '../../../../packages/web/src/shell-text.ts';
import { SHOWN_FIELDS } from '../../../../packages/web/src/supported.ts';
import { CV_COMMANDS, terminalFields } from '../expected.ts';
import type { CvCommand, ExpectedField } from '../expected.ts';
import type { Problem } from '../report.ts';
import { ENDLESS_LINE, PLAYGROUND, TERMINAL, openTerminal, runCommand, settle, shown as waitShown, stateVariant, typeLine, vimEntry, vimKeys } from '../shell-states.ts';
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
  const singular = fullText.terminal.singular[section];
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

// ---- The shell's lines (contracts/cli.md, added 2026-10-29) -----------------
//
// Typed as a visitor types them, each compared with what the CV document,
// the built tree or FR-069 says it shows. A problem names the line and what
// differed; the variant names the shell and width.

// The rows a run's output shows, as text, without empty ones.
async function outputRows(run: Locator): Promise<string[]> {
  const found = output(run);
  if ((await found.count()) === 0) return [];
  return (await found.first().innerText()).split('\n').map((row) => row.trim()).filter((row) => row !== '');
}

const rowsOf = async (page: Page, line: string) => outputRows(await runCommand(page, line));

const printed = (rows: readonly string[]) => (rows.length === 0 ? 'nothing' : JSON.stringify(rows.join('\n')));

const lineProblem = (line: string, detail: string): Found => ({ type: 'line-mismatch', subject: line, detail });

const sameRows = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((row, index) => row === b[index]);

// The first word of four letters or more in the CV's first work summary,
// as the state driver's search uses (contracts/cli.md States).
export function summaryWord(resume: Resume): string | null {
  const summary = resume.work?.[0]?.summary;
  return typeof summary === 'string' ? (/\p{L}{4,}/u.exec(summary)?.[0] ?? null) : null;
}

// How long a line that never ends may run before FR-069 stops it: its 5 s
// limit and the page's 6 s watchdog, with room to spare.
const STOP_MS = 10_000;

// FR-069's texts for a line the shell stops by itself.
const STOPPED_TEXTS = [siteText.terminal.replies.stopped.time, siteText.terminal.replies.stopped.commands, siteText.terminal.replies.stopped.output];

// The endless line, typed: the page answers a click and a key while it runs
// (the shell is in a worker), and the shell stops it with FR-069's text.
async function endlessProblems(page: Page, shell: Shell): Promise<Found[]> {
  const found: Found[] = [];
  const input = page.locator(TERMINAL.commandLine);
  const before = await page.locator(TERMINAL.run).count();
  await input.focus();
  await input.fill('');
  await page.keyboard.type(ENDLESS_LINE);
  await page.keyboard.press('Enter');
  try {
    if (shell === 'desktop') await input.click({ timeout: WAIT_MS });
    else await input.tap({ timeout: WAIT_MS });
    await page.keyboard.type('x');
    await page.waitForFunction((selector) => (document.querySelector(selector) as HTMLInputElement | null)?.value === 'x', TERMINAL.commandLine, { timeout: WAIT_MS });
  } catch {
    found.push({ type: 'unresponsive', subject: ENDLESS_LINE, detail: 'the window did not answer a click and a key while the line ran' });
  }
  try {
    await page.waitForFunction(([busy, runs, count]) => document.querySelector(busy as string) === null && document.querySelectorAll(runs as string).length > (count as number), [TERMINAL.busyRun, TERMINAL.run, before] as const, { timeout: STOP_MS });
  } catch {
    found.push({ type: 'not-stopped', subject: ENDLESS_LINE, detail: `still running ${STOP_MS / 1000} s after Enter` });
    return found;
  }
  const run = page.locator(TERMINAL.run).nth(before);
  const stopped = (await run.locator(TERMINAL.stopped).count()) === 0 ? null : ((await run.locator(TERMINAL.stopped).first().textContent()) ?? '');
  if (stopped === null || !STOPPED_TEXTS.includes(stopped)) found.push(lineProblem(ENDLESS_LINE, `ends with ${printed(await outputRows(run))} where FR-069's stopped line is expected`));
  await input.fill('');
  return found;
}

// The added lines, in the home folder, in the order contracts/cli.md gives.
export async function shellLineProblems(page: Page, shell: Shell, resume: Resume): Promise<Found[]> {
  const found: Found[] = [];
  const word = summaryWord(resume);
  if (word !== null) {
    const filter = `work | grep -i ${word}`;
    const text = await rowsOf(page, 'work | cat');
    const wanted = text.filter((row) => row.toLowerCase().includes(word.toLowerCase()));
    const rows = await rowsOf(page, filter);
    if (!sameRows(rows, wanted)) found.push(lineProblem(filter, `prints ${printed(rows)} where work's matching lines are ${printed(wanted)}`));
    const search = `grep -ril ${word} ~/work`;
    const holding: string[] = [];
    for (const name of await (await runCommand(page, 'ls ~/work')).locator('ul.out-columns > li').allTextContents()) {
      if ((await rowsOf(page, `cat ~/work/${name}`)).some((row) => row.toLowerCase().includes(word.toLowerCase()))) holding.push(name);
    }
    const listedFiles = (await rowsOf(page, search)).map((row) => row.slice(row.lastIndexOf('/') + 1));
    const missed = holding.filter((name) => !listedFiles.includes(name));
    const extra = listedFiles.filter((name) => !holding.includes(name));
    if (missed.length > 0) found.push(lineProblem(search, `misses ~/work/${missed[0]}, which holds "${word}"`));
    else if (extra.length > 0) found.push(lineProblem(search, `lists ~/work/${extra[0]}, which doesn't hold "${word}"`));
  }
  if (resume.work?.[0]?.name !== undefined) {
    const jq = "jq '.work[0].name' cv.json";
    const wanted = [JSON.stringify(resume.work[0].name)];
    const rows = await rowsOf(page, jq);
    // Both are JSON already: shown as they are.
    if (!sameRows(rows, wanted)) found.push(lineProblem(jq, `prints ${rows.length === 0 ? 'nothing' : rows.join(' ')} where the CV document has ${wanted[0]}`));
  }
  const names = async () => (await runCommand(page, 'ls')).locator('ul.out-columns > li').allTextContents();
  const built = await names();
  const notes = 'mkdir notes && echo hi > notes/a && mv notes/a notes/b && cat notes/b';
  const noted = await rowsOf(page, notes);
  if (!sameRows(noted, ['hi'])) found.push(lineProblem(notes, `prints ${printed(noted)} where it should print "hi"`));
  const withNotes = await names();
  if (!sameRows(withNotes, [...built, 'notes/'])) found.push(lineProblem('ls', `lists ${JSON.stringify(withNotes.join(' '))} where notes/ should follow the built names`));
  await runCommand(page, 'rm -r notes');
  if ((await names()).includes('notes/')) found.push(lineProblem('rm -r notes', 'left notes/ in the home folder'));
  const about = await rowsOf(page, 'cat about');
  for (const line of ['echo hi > about', 'rm about']) {
    const rows = await rowsOf(page, line);
    if (!rows.some((row) => row.includes('Permission denied'))) found.push(lineProblem(line, `prints ${printed(rows)} where it should print "Permission denied"`));
  }
  const after = await rowsOf(page, 'cat about');
  if (!sameRows(after, about)) found.push(lineProblem('cat about', `prints ${printed(after)} after echo and rm, where it printed ${printed(about)} before`));
  found.push(...(await vimWriteProblems(page)));
  found.push(...(await endlessProblems(page, shell)));
  return found;
}

// What the vim view writes (contracts/cli.md, added 2026-10-30): a typed line
// reaches the file, and a protected file stays as it was.
async function vimWriteProblems(page: Page): Promise<Found[]> {
  const found: Found[] = [];
  const open = async (line: string) => {
    await typeLine(page, line);
    await waitShown(page, TERMINAL.vimText);
    await settle(page);
  };
  const back = () => page.locator(TERMINAL.commandLine).waitFor({ timeout: WAIT_MS });
  const message = async () => (await page.locator(TERMINAL.vimMessage).textContent()) ?? '';
  const text = 'a line of notes';
  await open('vim notes');
  await vimKeys(page, ['i']);
  await waitShown(page, TERMINAL.vimInsert);
  await page.keyboard.type(text);
  await page.keyboard.press('Escape');
  await vimEntry(page, ':', 'wq');
  await back();
  const written = await rowsOf(page, 'cat notes');
  if (!sameRows(written, [text])) found.push(lineProblem('cat notes', `prints ${printed(written)} after :wq, where it should print "${text}"`));
  await runCommand(page, 'rm notes');
  const about = await rowsOf(page, 'cat about');
  await open('vim about');
  await vimKeys(page, ['x']);
  await vimEntry(page, ':', 'w');
  await settle(page);
  const said = await message();
  if (!said.startsWith('E45')) found.push(lineProblem('vim about :w', `${said.includes('written') ? 'wrote about' : `shows ${JSON.stringify(said)}`}, where it should show E45`));
  await vimEntry(page, ':', 'q!');
  await back();
  const after = await rowsOf(page, 'cat about');
  if (!sameRows(after, about)) found.push(lineProblem('cat about', `prints ${printed(after)} after vim's :q!, where it printed ${printed(about)} before`));
  return found;
}

// ---- The part ---------------------------------------------------------------

// The part's variants in a shell, in the order it runs them: each CV
// command, the JSON, the file system, the shell's lines, and `open playground`.
export const terminalVariants = (shell: Shell, width: number) => [...CV_COMMANDS, 'json', 'files', 'shell', 'open-playground'].map((name) => terminalVariant(shell, name, width));

// `open playground` shows the Playground, or the phone's screen for it (008 FR-087).
async function openPlaygroundProblems(page: Page, shell: Shell): Promise<Found[]> {
  // A line the shell never stopped is reported under `shell`; waiting on it
  // here must not crash the part and lose that report.
  const typed = await typeLine(page, 'open playground').then(
    () => true,
    () => false,
  );
  if (!typed) return [{ type: 'open-failed', subject: 'open playground', detail: 'the shell was still running a line' }];
  const shown = shell === 'desktop' ? PLAYGROUND.window : PLAYGROUND.phoneScreen;
  const opened = await page.waitForSelector(shown, { state: 'visible', timeout: 5_000 }).then(
    () => true,
    () => false,
  );
  return opened ? [] : [{ type: 'open-failed', subject: 'open playground', detail: "the Playground didn't open" }];
}

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
  add('shell', await shellLineProblems(page, shell, resume));
  // Last, as it leaves the Terminal.
  add('open-playground', await openPlaygroundProblems(page, shell));
  return runs;
}
