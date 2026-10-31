// The Playground part (008 contracts/cli.md Parts, FR-075): each check, from a
// fresh profile, drives the Playground as a visitor does and compares what it
// shows with the built site's `files.json`, the CV document and the bundled
// TypeScript. A check names itself in its variants, so a failure names the
// part, the check, the width and the example.
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import type { Page } from 'playwright';
import type { Resume } from '@cv/content';
import type { SiteManifest } from '../../../../packages/web/src/routes.ts';
import { examples, welcome } from '../../../../packages/web/src/apps/playground/examples/index.ts';
import { LOG_LIMITS } from '../../../../packages/web/src/apps/playground/limits.ts';
import { megabytes } from '../../../../packages/web/src/apps/playground/text.ts';
import { counted, fill, siteText } from '../../../../packages/web/src/site-text.ts';
import type { Problem } from '../report.ts';
import { PLAYGROUND, PLAYGROUND_WAIT_MS, SHELL, cursorAt, escaped, followLink, openPlayground, playgroundChecked, playgroundReady, primaryKey, putCode, runPlayground, settle, shareLink, stateVariant, tooLongCode } from '../shell-states.ts';
import type { Shell } from '../shell-states.ts';

const words = siteText.playground;

export type Found = Omit<Problem, 'part' | 'page' | 'variant'>;

export type EngineManifest = { typescript: string; total: number; files: { path: string; bytes: number }[] };

export type PlaygroundExpected = { engine: EngineManifest; resume: Resume };

export type PlaygroundContext = {
  expected: PlaygroundExpected;
  // Reports a check's findings under its name.
  add: (name: string, found: readonly Found[]) => void;
  // Another profile on the site, closed after `body`, as a second visitor.
  profile: <T>(body: (page: Page) => Promise<T>) => Promise<T>;
};

export type PlaygroundCheck = {
  check: string;
  shell: Shell;
  // The names it reports under, one but for the examples.
  names: readonly string[];
  run: (page: Page, context: PlaygroundContext) => Promise<void>;
};

export const playgroundVariant = (shell: Shell, name: string, width: number) => stateVariant(shell, `playground-${name}`, width);

// The built engine's `files.json`, the one place the engine's files and sizes
// are read from.
export function readEngineManifest(siteDir: string, manifest: SiteManifest): EngineManifest {
  const file = manifest.files.find((entry) => /^\/playground\/[\da-f]+\/files\.json$/.test(entry.path));
  if (file === undefined) throw new Error('the built site has no engine manifest');
  return JSON.parse(fs.readFileSync(path.join(siteDir, file.path), 'utf8'));
}

const problem = (type: string, subject: string, detail: string): Found => ({ type, subject, detail });

const STATE = `${PLAYGROUND.toolbar} p.run-state`;

const stopButton = `${PLAYGROUND.toolbar} button.stop`;

const WINDOW = PLAYGROUND.window;

const SECONDS = '\u0000';

// A run state's words as a pattern, its seconds a number.
const statePattern = (form: string, values: Record<string, string | number> = {}) => new RegExp(`^${fill(form, { ...values, s: SECONDS }).split(SECONDS).map(escaped).join('([\\d.]+)')}$`);

const stateText = async (page: Page) => ((await page.locator(STATE).textContent()) ?? '').trim();

const statusText = async (page: Page) => (await page.locator(`${PLAYGROUND.status} span`).first().textContent()) ?? '';

// The text a Monaco view shows, its rendered lines in order, with the
// non-breaking spaces it draws read as spaces. The error message the editor
// shows after the cursor's line isn't code.
const viewText = (page: Page, selector: string) =>
  page
    .locator(`${selector} .view-lines`)
    .first()
    .evaluate((lines) =>
      [...lines.querySelectorAll<HTMLElement>('.view-line')]
        .sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top))
        .map((line) => {
          const copy = line.cloneNode(true) as HTMLElement;
          for (const message of copy.querySelectorAll('.playground-inline-message')) message.remove();
          return (copy.textContent ?? '').replace(/ /g, ' ');
        })
        .join('\n'),
    );

const editorText = (page: Page) => viewText(page, PLAYGROUND.editor);

type PaneName = 'javascript' | 'declarations' | 'errors' | 'logs';

async function showPane(page: Page, pane: PaneName): Promise<void> {
  const tab = page.locator(PLAYGROUND.paneTabs).filter({ hasText: new RegExp(`^\\s*${words.panes[pane]}`) });
  if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
  await page.locator(`${PLAYGROUND.root} .pane-${pane}[role="tabpanel"]`).waitFor({ state: 'visible', timeout: 5_000 });
}

type LogRow = { level: string; text: string; line: number | null };

async function readLogs(page: Page): Promise<LogRow[]> {
  await showPane(page, 'logs');
  return page.locator(`${PLAYGROUND.root} .pane-logs ol.logs > li.log`).evaluateAll((items) =>
    items.map((item) => {
      const copy = item.cloneNode(true) as HTMLElement;
      copy.querySelector('span.level')?.remove();
      const lineButton = copy.querySelector('button.log-line');
      const line = lineButton === null ? null : Number(/\d+/.exec(lineButton.textContent ?? '')?.[0]);
      lineButton?.remove();
      return { level: item.getAttribute('data-level') ?? '', text: (copy.textContent ?? '').trim(), line };
    }),
  );
}

const logged = async (page: Page) => (await readLogs(page)).filter((row) => row.level === 'log').map((row) => row.text);

async function readErrors(page: Page): Promise<string[]> {
  await showPane(page, 'errors');
  return (await page.locator(`${PLAYGROUND.root} .pane-errors li > button.error`).allInnerTexts()).map((text) => text.replace(/\s+/g, ' ').trim());
}

const stopped = (page: Page, timeout: number) => page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('aria-disabled') === 'true', stopButton, { timeout });

async function pressStop(page: Page): Promise<number> {
  const pressed = Date.now();
  await page.click(stopButton);
  await stopped(page, 5_000);
  return Date.now() - pressed;
}

const seconds = (ms: number) => (ms / 1000).toFixed(1);

const toggleOption = async (page: Page, name: string, on: boolean) => {
  await page.click(`${PLAYGROUND.toolbar} button.options`);
  await page.locator(`${PLAYGROUND.root} #playground-option-${name}`).setChecked(on);
  await page.keyboard.press('Escape');
  await playgroundChecked(page);
};

async function readyPage(page: Page): Promise<void> {
  await openPlayground(page);
  await playgroundReady(page);
}

async function chooseExample(page: Page, title: string): Promise<void> {
  await page.click(`${PLAYGROUND.toolbar} button.examples`);
  await page.locator(`${PLAYGROUND.root} section.examples-panel button.example`).filter({ hasText: title }).first().click();
  await page.locator(`${PLAYGROUND.root} section.examples-panel`).waitFor({ state: 'detached', timeout: 5_000 });
  await playgroundChecked(page);
}

const messageText = async (page: Page) => ((await page.locator(`${PLAYGROUND.message} p`).textContent()) ?? '').trim();

// The code the visitor sees, against the start of `code`: only lines on
// screen are rendered.
const showsStartOf = async (page: Page, code: string) => {
  const shown = await editorText(page);
  return code.split('\n').slice(0, shown.split('\n').length).join('\n') === shown;
};

// Whether the page holds a runner frame or any log, a second after opening,
// so a run started on opening has had time to show.
async function ranProblems(page: Page, subject: string): Promise<Found[]> {
  await page.waitForTimeout(1_000);
  const found: Found[] = [];
  if ((await page.locator(PLAYGROUND.runner).count()) > 0) found.push(problem('ran-on-open', subject, 'a runner frame exists after opening the link; a shared link must not run'));
  const rows = await readLogs(page);
  if (rows.length > 0) found.push(problem('ran-on-open', subject, `the logs hold ${rows.length} entries after opening the link; a shared link must not run`));
  return found;
}

// ---- Downloading -----------------------------------------------------------

async function downloadProblems(page: Page, { expected, add }: PlaygroundContext): Promise<void> {
  const found: Found[] = [];
  const total = megabytes(expected.engine.total);
  // Each engine file arrives 250 ms late, so the progress can be read.
  await page.route(/\/playground\/[^/]+\/(?!files\.json)/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.continue();
  });
  await openPlayground(page);
  const seen: { value: number; text: string; editors: number }[] = [];
  while ((await page.locator(PLAYGROUND.loading).count()) > 0) {
    const sample = await page.evaluate(
      ({ loading, editor }) => {
        const bar = document.querySelector<HTMLProgressElement>(`${loading} progress.playground-progress`);
        return bar === null ? null : { value: bar.value, text: bar.getAttribute('aria-valuetext') ?? '', editors: document.querySelectorAll(`${editor} .monaco-editor`).length };
      },
      { loading: PLAYGROUND.loading, editor: PLAYGROUND.editor },
    );
    if (sample !== null) seen.push(sample);
    await page.waitForTimeout(100);
  }
  const shown = seen.filter((sample) => sample.text !== '');
  const form = new RegExp(`^${fill(words.loading.progress, { received: SECONDS, total: SECONDS }).split(SECONDS).map(escaped).join('([\\d.]+)')}$`);
  if (shown.length < 2) found.push(problem('download', 'progress', `the progress showed ${shown.length} values; expected it to rise`));
  for (const sample of shown) {
    const parts = form.exec(sample.text);
    if (parts === null || parts[2] !== total) found.push(problem('download', 'progress', `it reads ${JSON.stringify(sample.text)}; files.json gives ${total} MB in all`));
  }
  if (shown.length > 1 && shown.at(-1)!.value <= shown[0]!.value) found.push(problem('download', 'progress', 'its value never rose'));
  if (seen.some((sample) => sample.editors > 0)) found.push(problem('download', 'editor', 'an editor exists before the download ended'));
  add('download', found);

  await playgroundReady(page);
  const version = ((await page.locator(PLAYGROUND.version).textContent()) ?? '').trim();
  const wanted = fill(words.status.version, { version: expected.engine.typescript });
  add('version', version === wanted ? [] : [problem('version', 'status bar', `it reads ${JSON.stringify(version)}; the engine's files.json gives ${JSON.stringify(wanted)}`)]);
}

// ---- Editing: what TypeScript gives, by its VS Code key ---------------------

const NAVIGATION = ['function area(width: number, height: number): number {', '  return width * height;', '}', 'const small = area(2, 3);', 'const large = area(10, 20);'].join('\n');

const AT_USE = { line: 4, column: 15 };

const hoverText = (page: Page) =>
  page
    .locator(`${PLAYGROUND.editor} .monaco-hover:not(.hidden)`)
    .first()
    .evaluate((hover) => (hover.textContent ?? '').replace(/ /g, ' '));

// Waits for `seen` to hold, up to ten seconds, and gives back whether it did.
async function until(seen: () => Promise<boolean>, timeout = 10_000): Promise<boolean> {
  const end = Date.now() + timeout;
  for (;;) {
    if (await seen().catch(() => false)) return true;
    if (Date.now() > end) return false;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function atUse(page: Page): Promise<void> {
  await putCode(page, NAVIGATION);
  await cursorAt(page, AT_USE.line, AT_USE.column);
}

async function editingProblems(page: Page, { add }: PlaygroundContext): Promise<void> {
  // The TypeScript the Playground bundles, loaded only for this check.
  const { bundled, CODE_FILE, ts } = await import('../../../../packages/web/test/helpers/bundled-typescript.ts');
  await readyPage(page);
  const key = await primaryKey(page);
  const found: Found[] = [];

  const wrong = 'const n: number = "one";';
  await putCode(page, wrong);
  const wanted = bundled(wrong).diagnostics();
  const rows = await readErrors(page);
  if (rows.length !== wanted.length || !wanted.every((entry: { line: number; column: number; code: number }, index: number) => rows[index]?.includes(`${entry.line}:${entry.column}`) && rows[index]?.includes(`TS${entry.code}`))) {
    found.push(problem('errors', 'Errors pane', `it lists ${JSON.stringify(rows)}; TypeScript gives ${JSON.stringify(wanted.map((entry: { line: number; column: number; code: number }) => `${entry.line}:${entry.column} TS${entry.code}`))}`));
  }

  const service = bundled(NAVIGATION);
  const useAt = service.offset(AT_USE.line, AT_USE.column);

  await atUse(page);
  await page.keyboard.press(`${key}+KeyK`);
  await page.keyboard.press(`${key}+KeyI`);
  const signature = ts.displayPartsToString(service.service.getQuickInfoAtPosition(CODE_FILE, useAt).displayParts);
  if (!(await until(async () => (await hoverText(page)).includes(signature)))) found.push(problem('types', 'hover', `the name's hover doesn't show ${JSON.stringify(signature)}`));

  const base = 'const job = { title: "Engineer", years: 3 };\n';
  await putCode(page, base);
  await page.keyboard.press(`${key}+End`);
  await page.keyboard.type('job.');
  const suggest = `${PLAYGROUND.editor} .suggest-widget.visible`;
  const names: string[] = bundled(`${base}job.`).service.getCompletionsAtPosition(CODE_FILE, `${base}job.`.length, {}).entries.map((entry: { name: string }) => entry.name);
  const suggested = () => page.locator(`${suggest} .monaco-list-row`).allTextContents();
  const holdsAll = async () => {
    const list = await suggested();
    return names.every((name) => list.some((row) => row.includes(name)));
  };
  if (!(await until(holdsAll))) {
    found.push(problem('suggestions', 'job.', `the list doesn't hold ${names.join(', ')}`));
  } else {
    await page.keyboard.type('ti');
    await page.keyboard.press('Enter');
    if (!(await until(async () => (await editorText(page)).split('\n').at(-1) === 'job.title'))) found.push(problem('suggestions', 'job.', 'Enter did not insert the suggestion'));
  }

  await atUse(page);
  const [definition] = service.service.getDefinitionAtPosition(CODE_FILE, useAt);
  const before = NAVIGATION.slice(0, definition.textSpan.start).split('\n');
  const place = `Ln ${before.length}, Col ${before.at(-1)!.length + 1}`;
  await page.keyboard.press('F12');
  if (!(await until(async () => (await statusText(page)) === place))) found.push(problem('definition', 'F12', `the cursor is at ${await statusText(page)}; TypeScript gives ${place}`));

  await atUse(page);
  const uses = service.service.getReferencesAtPosition(CODE_FILE, useAt).length;
  await page.keyboard.press('Shift+F12');
  const useRows = () => page.locator(`${PLAYGROUND.editor} .peekview-widget .ref-tree .monaco-list-row`).allTextContents();
  if (!(await until(async () => (await useRows()).filter((row) => row.includes('area(')).length === uses))) found.push(problem('every-use', 'Shift+F12', `the list shows ${(await useRows()).filter((row) => row.includes('area(')).length} uses; TypeScript gives ${uses}`));
  await page.keyboard.press('Escape');

  await atUse(page);
  const renamed = [...service.service.findRenameLocations(CODE_FILE, useAt, false, false, {})]
    .sort((a: { textSpan: { start: number } }, b: { textSpan: { start: number } }) => b.textSpan.start - a.textSpan.start)
    .reduce((text: string, location: { textSpan: { start: number; length: number } }) => text.slice(0, location.textSpan.start) + 'surface' + text.slice(location.textSpan.start + location.textSpan.length), NAVIGATION);
  await page.keyboard.press('F2');
  const input = page.locator(`${PLAYGROUND.editor} .rename-box input`);
  await input.waitFor({ timeout: 10_000 });
  // Monaco focuses the box 100 ms after showing it. An Enter sent before that
  // is lost about once in 150 times, and a visitor can't be that quick.
  await page.waitForFunction((selector) => document.activeElement === document.querySelector(selector), `${PLAYGROUND.editor} .rename-box input`, { timeout: 10_000 });
  await input.fill('surface');
  await page.keyboard.press('Enter');
  if (!(await until(async () => (await editorText(page)) === renamed))) found.push(problem('rename', 'F2', 'the code differs from what TypeScript renames'));

  const fixable = 'interface Job { title: string; years: number }\nconst job: Job = {};';
  await putCode(page, fixable);
  await cursorAt(page, 2, 7);
  await page.keyboard.press(`${key}+Period`);
  await page.waitForSelector('.action-widget', { timeout: 10_000 });
  const fix = page.locator('.action-widget').getByText('Add missing properties', { exact: true });
  if (!(await until(async () => (await fix.count()) > 0))) found.push(problem('quick-fix', 'Ctrl+.', 'the list holds no Add missing properties'));
  else {
    await fix.click();
    if (!(await until(async () => (await editorText(page)) !== fixable))) found.push(problem('quick-fix', 'Ctrl+.', 'choosing the fix left the code as it was'));
  }

  const untidy = 'const  a=1;\nfunction  f( ){return a}';
  await putCode(page, untidy);
  await page.keyboard.press('Shift+Alt+KeyF');
  const edits = bundled(untidy).service.getFormattingEditsForDocument(CODE_FILE, { ...ts.getDefaultFormatCodeSettings('\n'), indentSize: 2, tabSize: 2, convertTabsToSpaces: true });
  const formatted = [...edits].sort((a: { span: { start: number } }, b: { span: { start: number } }) => b.span.start - a.span.start).reduce((text: string, edit: { span: { start: number; length: number }; newText: string }) => text.slice(0, edit.span.start) + edit.newText + text.slice(edit.span.start + edit.span.length), untidy);
  if (!(await until(async () => (await editorText(page)) === formatted))) found.push(problem('format', 'Shift+Alt+F', 'the code differs from what TypeScript formats'));

  await page.keyboard.press('F1');
  if (!(await until(() => page.locator(`${PLAYGROUND.editor} .quick-input-widget`).isVisible()))) found.push(problem('palette', 'F1', 'the command palette did not open'));
  await page.keyboard.press('Escape');

  await page.click(`${PLAYGROUND.editor} .view-lines`);
  await page.keyboard.press('Alt+Shift+KeyM');
  if (!(await until(() => page.evaluate(() => document.activeElement?.closest('[role="menubar"]') !== null)))) found.push(problem('shell-keys', 'Alt+Shift+M', "the shell's shortcut did not reach the menu bar from inside the editor"));
  add('editing', found);
}

// ---- The panes and an option ------------------------------------------------

async function paneProblems(page: Page, { add }: PlaygroundContext): Promise<void> {
  const { bundled } = await import('../../../../packages/web/test/helpers/bundled-typescript.ts');
  await readyPage(page);
  const found: Found[] = [];
  const code = '// A note.\nexport const answer: number = 42;';
  await putCode(page, code);
  const compare = async (pane: 'javascript' | 'declarations', wanted: string, option: string) => {
    await showPane(page, pane);
    const selector = `${PLAYGROUND.root} .pane-${pane} .playground-output`;
    const same = await until(async () => (await viewText(page, selector)).trim() === wanted.trim());
    if (!same) found.push(problem('pane', pane, `it differs from what TypeScript emits with ${option}`));
  };
  const plain = bundled(code).emit();
  await compare('javascript', plain.javascript, 'the default options');
  await compare('declarations', plain.declarations ?? '', 'the default options');
  await toggleOption(page, 'removeComments', true);
  const changed = bundled(code, { removeComments: true }).emit();
  await compare('javascript', changed.javascript, 'removeComments');
  await putCode(page, 'const n: number = "one";');
  if ((await readErrors(page)).length !== 1) found.push(problem('pane', 'errors', 'the Errors pane should list the one error'));
  const counts = (await page.locator(PLAYGROUND.paneTabs).allTextContents()).map((tab) => tab.trim());
  if (!counts.includes(`${words.panes.errors}1`) || !counts.includes(`${words.panes.logs}0`)) found.push(problem('pane', 'tabs', `they read ${JSON.stringify(counts)}; expected the counts of one error and no logs`));
  add('panes', found);
}

// ---- The examples ----------------------------------------------------------

// What each CV example logs, from the CV document (FR-030).
export function cvLogs(id: string, resume: Resume): string[] | null {
  const groups = resume.skills ?? [];
  if (id === 'projects-newest-first') {
    const projects = (resume.projects ?? []).flatMap((project) => (project.startDate === undefined ? [] : [{ name: project.name ?? '', start: project.startDate }]));
    projects.sort((a, b) => b.start.localeCompare(a.start));
    return projects.map(({ name, start }) => `${start.slice(0, 4)} ${name}`.trim());
  }
  if (id === 'skills-at-a-glance') {
    const widest = Math.max(0, ...groups.map((group) => (group.name ?? '').length));
    return groups.map((group) => `${(group.name ?? '').padEnd(widest)}  ${group.keywords?.length ?? 0}`.trim());
  }
  if (id === 'find-a-skill') {
    const word = (groups[0]?.keywords?.[0] ?? '').toLowerCase();
    const found = groups.find((group) => group.keywords?.some((keyword) => keyword.toLowerCase() === word));
    return [found === undefined ? 'Not found' : `In ${found.name ?? 'a group'}`, 'Not found'];
  }
  return null;
}

const EXAMPLES = examples(false);

async function exampleProblems(page: Page, { expected, add }: PlaygroundContext): Promise<void> {
  await readyPage(page);
  const finished = statePattern(words.runState.finished);
  for (const example of EXAMPLES) {
    const found: Found[] = [];
    await chooseExample(page, example.title);
    const errors = await readErrors(page);
    if (errors.length > 0) found.push(problem('diagnostics', example.title, `${errors.length} ${errors.length === 1 ? 'diagnostic' : 'diagnostics'} with the default options: ${errors.join('; ')}`));
    if (example.runs === 'to-end') {
      await runPlayground(page, 'end');
      const state = await stateText(page);
      if (!finished.test(state)) found.push(problem('run', example.title, `it ended with ${JSON.stringify(state)}; expected it to finish`));
      const uncaught = (await readLogs(page)).filter((row) => row.line !== null);
      if (uncaught.length > 0) found.push(problem('run', example.title, `${uncaught.length} entries came with a line: ${uncaught.map((row) => row.text).join('; ')}`));
      const wanted = cvLogs(example.id, expected.resume);
      if (wanted !== null) {
        const logs = await logged(page);
        if (JSON.stringify(logs) !== JSON.stringify(wanted)) found.push(problem('cv-logs', example.title, `it logged ${JSON.stringify(logs)}; the CV document gives ${JSON.stringify(wanted)}`));
      }
    } else {
      await runPlayground(page, 'start');
      await page.waitForTimeout(1_500);
      await pressStop(page);
    }
    add(`examples/${example.id}`, found);
  }
}

// ---- Runs ------------------------------------------------------------------

async function runProblems(page: Page, { add }: PlaygroundContext): Promise<void> {
  await readyPage(page);
  const found: Found[] = [];
  await putCode(page, 'console.log("before");\nsetTimeout(() => console.log("after"), 2_000);');
  await runPlayground(page, 'start');
  const counting = statePattern(counted(words.runState.running, 1), { n: 1 });
  if (!(await until(async () => counting.test(await stateText(page)), 1_500))) found.push(problem('timer-count', 'run state', `it reads ${JSON.stringify(await stateText(page))}; expected one timer left`));
  await stopped(page, 15_000);
  const state = await stateText(page);
  const ended = statePattern(words.runState.finished).exec(state);
  if (ended === null) found.push(problem('run-end', 'run state', `it reads ${JSON.stringify(state)}; expected it to finish`));
  else if (Number(ended[1]) < 2) found.push(problem('run-end', 'run state', `it took ${ended[1]} s; the timer waits 2 s`));
  const logs = await logged(page);
  if (JSON.stringify(logs) !== JSON.stringify(['before', 'after'])) found.push(problem('logs', 'Logs pane', `it logged ${JSON.stringify(logs)}; expected before, then after`));
  add('run', found);
}

async function intervalProblems(page: Page, { add }: PlaygroundContext): Promise<void> {
  await readyPage(page);
  const found: Found[] = [];
  await putCode(page, 'setInterval(() => console.log("tick"), 100);');
  await runPlayground(page, 'start');
  await page.waitForTimeout(1_000);
  if ((await logged(page)).length < 3) found.push(problem('interval', 'Logs pane', 'an interval running for a second logged fewer than three ticks'));
  await pressStop(page);
  const count = (await readLogs(page)).length;
  await page.waitForTimeout(800);
  if ((await readLogs(page)).length !== count) found.push(problem('interval', 'Stop', 'the interval went on logging after Stop'));
  add('interval', found);
}

async function stopProblems(page: Page, { add }: PlaygroundContext): Promise<void> {
  await readyPage(page);
  const found: Found[] = [];
  const code = 'console.log("before");\nwhile (true) {}';
  await putCode(page, code);
  await runPlayground(page, 'start');
  await page.waitForTimeout(1_500);
  const took = await pressStop(page);
  if (took >= 1_000) found.push(problem('stop', 'Stop', `the loop ended ${seconds(took)} s after Stop; expected within 1 s`));
  if ((await page.locator(PLAYGROUND.runner).count()) > 0) found.push(problem('stop', 'runner', 'a runner frame is left after Stop'));
  if ((await editorText(page)) !== code) found.push(problem('stop', 'code', 'the code changed after Stop'));
  const state = await stateText(page);
  if (!statePattern(words.runState.stopped).test(state)) found.push(problem('stop', 'run state', `it reads ${JSON.stringify(state)}; expected the stopped note`));
  if (!(await logged(page)).includes('before')) found.push(problem('stop', 'Logs pane', 'the logs from before Stop are gone'));
  add('stop', found);
}

async function stuckProblems(page: Page, { add }: PlaygroundContext): Promise<void> {
  await readyPage(page);
  const found: Found[] = [];
  await putCode(page, 'let n = 0;\nwhile (true) n++;');
  await runPlayground(page, 'start');
  const started = Date.now();
  await page.waitForSelector(PLAYGROUND.popup, { timeout: 20_000 });
  const after = Date.now() - started;
  if (after < 5_000 || after >= 6_000) found.push(problem('stuck', 'popup', `the popup appeared after ${seconds(after)} s; expected between 5 and 6 s`));
  const frame = (await page.locator(WINDOW).boundingBox())!;
  for (const selector of [PLAYGROUND.popup, `${PLAYGROUND.root} .playground-scrim`]) {
    const box = await page.locator(selector).boundingBox();
    if (box === null || box.x < frame.x || box.y < frame.y || box.x + box.width > frame.x + frame.width || box.y + box.height > frame.y + frame.height) found.push(problem('stuck', selector, "it isn't inside the Playground's window"));
  }
  await page.locator(PLAYGROUND.popup).getByRole('button', { name: words.popups.stuck.keepWaiting }).click();
  const kept = Date.now();
  await page.locator(PLAYGROUND.popup).waitFor({ state: 'detached', timeout: 5_000 });
  await page.waitForSelector(PLAYGROUND.popup, { timeout: 20_000 });
  const again = Date.now() - kept;
  if (again < 4_500 || again >= 6_500) found.push(problem('stuck', 'Keep waiting', `the popup asked again after ${seconds(again)} s; expected 5 s later`));
  const pressed = Date.now();
  await page.locator(PLAYGROUND.popup).getByRole('button', { name: words.popups.stuck.stop }).click();
  await stopped(page, 5_000);
  const took = Date.now() - pressed;
  if (took >= 1_000) found.push(problem('stuck', 'Stop', `the loop ended ${seconds(took)} s after Stop; expected within 1 s`));
  add('stuck', found);
}

async function timerProblems(page: Page, { add }: PlaygroundContext): Promise<void> {
  await readyPage(page);
  const found: Found[] = [];
  await putCode(page, 'setTimeout(() => console.log("fired"), 60_000);');
  await runPlayground(page, 'start');
  // Playwright's clock doesn't reach the sandboxed frame's worker, so the
  // check waits the real 60 s.
  await page.waitForTimeout(7_000);
  if ((await page.locator(PLAYGROUND.popup).count()) > 0) found.push(problem('timer', 'popup', 'a popup appeared for a 60 s timer; waiting is not being stuck'));
  await stopped(page, 70_000);
  if ((await page.locator(PLAYGROUND.popup).count()) > 0) found.push(problem('timer', 'popup', 'a popup is up after a 60 s timer; waiting is not being stuck'));
  const logs = await logged(page);
  if (!logs.includes('fired')) found.push(problem('timer', 'Logs pane', `it logged ${JSON.stringify(logs)}; expected the timer to fire`));
  add('timer-60s', found);
}

async function dialogProblems(page: Page, { add }: PlaygroundContext): Promise<void> {
  await readyPage(page);
  const found: Found[] = [];
  let dialogs = 0;
  page.on('dialog', (dialog) => {
    dialogs += 1;
    void dialog.dismiss();
  });
  await putCode(page, ['alert("hi");', 'const answer = prompt("name?");', 'const sure = confirm("sure?");', 'console.log(answer, sure);'].join('\n'));
  await runPlayground(page, 'end');
  const rows = (await readLogs(page)).slice(1, -1).map(({ level, text }) => `${level} ${text}`);
  const wanted = [`alert hi`, `note ${fill(words.logs.prompt, { name: 'prompt' })}`, `note ${fill(words.logs.confirm, { name: 'confirm' })}`, 'log null false'];
  if (JSON.stringify(rows) !== JSON.stringify(wanted)) found.push(problem('dialogs', 'Logs pane', `it holds ${JSON.stringify(rows)}; expected ${JSON.stringify(wanted)}`));
  if (dialogs > 0) found.push(problem('dialogs', 'dialog', `${dialogs} dialogs were shown; the code must only log them`));
  add('dialogs', found);
}

// ---- The sandbox -----------------------------------------------------------

// What the code finds, logged as one JSON line.
const PROBE = `const seen: Record<string, unknown> = {};
const scope = globalThis as any;
for (const name of ["localStorage", "sessionStorage", "document", "window", "parent", "top", "opener", "open"]) seen[name] = typeof scope[name];
seen.location = String(location.href);
try {
  seen.caches = await caches.keys();
} catch (error) {
  seen.caches = [];
}
try {
  seen.databases = (await indexedDB.databases()).map((database) => database.name);
} catch (error) {
  seen.databases = [];
}
console.log(JSON.stringify(seen));`;

// A second server on the same host, as a site the code may ask, recording
// what each request carries.
async function otherServer(): Promise<{ url: string; requests: http.IncomingHttpHeaders[]; close: () => Promise<void> }> {
  const requests: http.IncomingHttpHeaders[] = [];
  const server = http.createServer((request, response) => {
    if (request.method !== 'OPTIONS') requests.push(request.headers);
    response.setHeader('access-control-allow-origin', '*');
    response.end('{}');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    requests,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

async function sandboxProblems(page: Page, { add }: PlaygroundContext): Promise<void> {
  await readyPage(page);
  const found: Found[] = [];
  const url = page.url();
  await page.evaluate(() => {
    document.cookie = 'site=kept; path=/';
    localStorage.setItem('site-key', 'site-value');
  });
  await putCode(page, PROBE);
  await runPlayground(page, 'end');
  const line = (await readLogs(page)).find((row) => row.level === 'log');
  if (line === undefined) found.push(problem('sandbox', 'probe', 'the code logged nothing'));
  else {
    const seen = JSON.parse(line.text) as Record<string, unknown>;
    for (const name of ['localStorage', 'sessionStorage', 'document', 'window', 'parent', 'top', 'opener', 'open']) if (seen[name] !== 'undefined') found.push(problem('sandbox', name, `the code finds ${name} of type ${String(seen[name])}`));
    if (String(seen['location']).includes(new URL(url).host)) found.push(problem('sandbox', 'location', `the code reads the page's address: ${String(seen['location'])}`));
    for (const name of ['caches', 'databases']) if (JSON.stringify(seen[name]) !== '[]') found.push(problem('sandbox', name, `the code reads the site's ${name}: ${JSON.stringify(seen[name])}`));
  }
  const other = await otherServer();
  try {
    await putCode(page, `try {\n  await fetch(${JSON.stringify(`${other.url}/hello`)}, { credentials: "include" });\n} catch (error) {\n  console.log("failed");\n}\nconsole.log("asked");`);
    await runPlayground(page, 'end');
    const [request] = other.requests;
    if (request === undefined) found.push(problem('sandbox', 'request', 'the request to another site never arrived'));
    else {
      if (request.origin !== 'null') found.push(problem('sandbox', 'request', `the request to another site says Origin ${String(request.origin)}; expected null`));
      if (request.cookie !== undefined) found.push(problem('sandbox', 'request', 'the request to another site carries the site\'s cookies'));
    }
  } finally {
    await other.close();
  }
  add('sandbox', found);
}

// ---- The output limits -----------------------------------------------------

async function limitProblems(page: Page, { add }: PlaygroundContext): Promise<void> {
  await readyPage(page);
  const found: Found[] = [];
  const logs = words.logs;
  await putCode(page, 'for (let i = 0; i < 5000; i++) console.log(i);');
  await runPlayground(page, 'end');
  const rows = await readLogs(page);
  if (rows.length !== LOG_LIMITS.entries) found.push(problem('limits', 'entries', `the logs keep ${rows.length} entries; expected ${LOG_LIMITS.entries}`));
  if (rows.at(-2)?.text !== '4999') found.push(problem('limits', 'entries', `the last logged entry is ${JSON.stringify(rows.at(-2)?.text)}; expected 4999`));
  // The code's 5,000 entries and the page's two notes, less those kept.
  const dropped = 5000 + 2 - LOG_LIMITS.entries;
  const note = ((await page.locator(`${PLAYGROUND.root} .pane-logs p.logs-dropped`).textContent()) ?? '').trim();
  const said = fill(counted(logs.dropped, dropped), { n: dropped.toLocaleString('en'), limit: LOG_LIMITS.entries.toLocaleString('en') });
  if (note !== said) found.push(problem('limits', 'dropped', `the note reads ${JSON.stringify(note)}; expected ${JSON.stringify(said)}`));
  await putCode(page, 'console.log("x".repeat(3_000_000));');
  await runPlayground(page, 'end');
  const long = (await readLogs(page)).find((row) => row.level === 'log');
  const cut = `${'x'.repeat(LOG_LIMITS.chars)} ${fill(logs.cut, { limit: LOG_LIMITS.chars.toLocaleString('en') })}`;
  if (long?.text !== cut) found.push(problem('limits', 'characters', `a 3 MB entry shows ${long?.text.length ?? 0} characters; expected it cut at ${LOG_LIMITS.chars} with the note`));
  add('limits', found);
}

// ---- Keeping, resetting and sharing ----------------------------------------

const OPTION = 'noUncheckedIndexedAccess';

const optionChecked = async (page: Page) => {
  await page.click(`${PLAYGROUND.toolbar} button.options`);
  const checked = await page.locator(`${PLAYGROUND.root} section.options-panel #playground-option-${OPTION}`).isChecked();
  await page.keyboard.press('Escape');
  return checked;
};

const keptHolds = (page: Page, code: string) => until(() => page.evaluate((wanted) => (JSON.parse(localStorage.getItem('cv-playground') ?? '{}') as { code?: string }).code === wanted, code));

async function keptProblems(page: Page, { add }: PlaygroundContext): Promise<void> {
  await readyPage(page);
  const found: Found[] = [];
  const code = 'const mine = "kept";';
  await putCode(page, code);
  await toggleOption(page, OPTION, true);
  await keptHolds(page, code);
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector(SHELL.ready, { state: 'attached', timeout: 15_000 });
  await readyPage(page);
  if (!(await until(async () => (await editorText(page)) === code))) found.push(problem('kept', 'code', `after a reload the editor holds ${JSON.stringify(await editorText(page))}`));
  if (!(await optionChecked(page))) found.push(problem('kept', OPTION, 'after a reload the option is back at its default'));
  add('kept', found);
}

async function resetProblems(page: Page, { add }: PlaygroundContext): Promise<void> {
  await readyPage(page);
  const found: Found[] = [];
  const code = 'const mine = "kept";';
  await putCode(page, code);
  await toggleOption(page, OPTION, true);
  await keptHolds(page, code);
  await page.click(SHELL.appMenuTitle);
  await page.getByRole('menuitem', { name: words.menu.reset, exact: true }).click();
  await page.locator(PLAYGROUND.popup).getByRole('button', { name: words.popups.reset.confirm }).click();
  const start = welcome((await primaryKey(page)) === 'Meta').code;
  if (!(await until(() => showsStartOf(page, start)))) found.push(problem('reset', 'code', 'Reset did not bring the starting example back'));
  if (await page.evaluate(() => localStorage.getItem('cv-playground') !== null)) found.push(problem('reset', 'kept code', 'the code is still kept after Reset'));
  await page.click(`${PLAYGROUND.toolbar} button.options`);
  const foot = await page.locator(`${PLAYGROUND.root} .options-foot`).textContent();
  if (foot !== words.options.changedNone) found.push(problem('reset', 'options', `after Reset the options say ${JSON.stringify(foot)}`));
  add('reset', found);
}

async function shareProblems(page: Page, { add, profile }: PlaygroundContext): Promise<void> {
  await readyPage(page);
  const found: Found[] = [];
  const code = 'const shared: number = 42;\nconsole.log(shared);';
  await putCode(page, code);
  await toggleOption(page, OPTION, true);
  await page.click(`${PLAYGROUND.toolbar} button.share`);
  await page.waitForSelector(PLAYGROUND.message, { timeout: 5_000 });
  const link = await page.evaluate(() => navigator.clipboard.readText());
  if (!link.includes('/#playground=1.')) found.push(problem('share', 'link', `the clipboard holds ${JSON.stringify(link)}; expected a link`));
  else {
    await profile(async (other) => {
      await followLink(other, link);
      await playgroundReady(other);
      if (!(await until(async () => (await editorText(other)) === code))) found.push(problem('share', 'code', `the link opens ${JSON.stringify(await editorText(other))}; expected the shared code`));
      if (!(await optionChecked(other))) found.push(problem('share', OPTION, 'the link opens with the option at its default'));
      const note = await messageText(other);
      if (note !== words.messages.sharedOpened) found.push(problem('share', 'note', `the message reads ${JSON.stringify(note)}; expected ${JSON.stringify(words.messages.sharedOpened)}`));
      found.push(...(await ranProblems(other, 'link')));
    });
  }
  add('share', found);
}

async function brokenLinkProblems(page: Page, { add }: PlaygroundContext): Promise<void> {
  const found: Found[] = [];
  const origin = new URL(page.url()).origin;
  await followLink(page, `${origin}/#playground=1.ZZZZ.ZZZZ`);
  await playgroundReady(page);
  const note = await messageText(page);
  if (note !== words.messages.brokenLink) found.push(problem('broken-link', 'message', `it reads ${JSON.stringify(note)}; expected ${JSON.stringify(words.messages.brokenLink)}`));
  const start = welcome((await primaryKey(page)) === 'Meta').code;
  if (!(await until(() => showsStartOf(page, start)))) found.push(problem('broken-link', 'code', 'a broken link did not open the starting example'));
  found.push(...(await ranProblems(page, 'link')));
  add('broken-link', found);
}

async function tooLongProblems(page: Page, { add }: PlaygroundContext): Promise<void> {
  await readyPage(page);
  const found: Found[] = [];
  await putCode(page, tooLongCode());
  await page.evaluate(() => navigator.clipboard.writeText('before'));
  await page.click(`${PLAYGROUND.toolbar} button.share`);
  await page.waitForSelector(PLAYGROUND.message, { timeout: 5_000 });
  const text = await messageText(page);
  const form = new RegExp(`^${fill(words.messages.tooLong, { length: SECONDS, limit: '8,000' }).split(SECONDS).map(escaped).join('[\\d,]+')}$`);
  if (!form.test(text)) found.push(problem('too-long', 'message', `it reads ${JSON.stringify(text)}; expected the link's length and the limit`));
  if ((await page.evaluate(() => navigator.clipboard.readText())) !== 'before') found.push(problem('too-long', 'clipboard', 'code over the limit still made a link'));
  const actions = (await page.locator(`${PLAYGROUND.message} .message-actions button.text-button`).allTextContents()).map((label) => label.trim());
  if (JSON.stringify(actions) !== JSON.stringify([words.messages.actions['copy-code']])) found.push(problem('too-long', 'actions', `it offers ${JSON.stringify(actions)}; expected to copy the code`));
  add('too-long', found);
}

async function specsProblems(page: Page, { add }: PlaygroundContext): Promise<void> {
  await readyPage(page);
  const found: Found[] = [];
  const code = 'const one = 1;\nconst two = 2;\nconsole.log(one, two);';
  await putCode(page, code);
  await cursorAt(page, 2, 7);
  await showPane(page, 'declarations');
  const status = await statusText(page);
  await page.click(`${WINDOW} button.show-specs`);
  const specView = '#os section.spec-view[data-view="playground"]';
  await page.locator(specView).waitFor({ state: 'visible', timeout: 5_000 });
  await page.click(`${specView} button.spec-back`);
  await page.waitForSelector(`${PLAYGROUND.editor} .monaco-editor`, { timeout: 15_000 });
  await settle(page);
  if (!(await until(async () => (await editorText(page)) === code))) found.push(problem('state-lost', 'code', 'Show specs and back lost the code'));
  if ((await statusText(page)) !== status) found.push(problem('state-lost', 'cursor', `the cursor came back at ${await statusText(page)}; it was at ${status}`));
  const pane = page.locator(PLAYGROUND.paneTabs).filter({ hasText: new RegExp(`^\\s*${words.panes.declarations}`) });
  if ((await pane.getAttribute('aria-selected')) !== 'true') found.push(problem('state-lost', 'pane', 'Show specs and back lost the open pane'));
  add('specs', found);
}

// ---- The phone -------------------------------------------------------------

// Every file the page asked for under `/playground/`, by its path.
const engineRequests = (page: Page) => page.evaluate(() => performance.getEntriesByType('resource').map((entry) => new URL(entry.name).pathname).filter((pathname) => pathname.startsWith('/playground/')));

async function phoneProblems(page: Page, form: 'app' | 'link', subject: string): Promise<Found[]> {
  const found: Found[] = [];
  await page.locator(PLAYGROUND.phoneScreen).waitFor({ state: 'visible', timeout: 5_000 });
  const heading = ((await page.locator(`${PLAYGROUND.phoneScreen} h2`).textContent()) ?? '').trim();
  if (heading !== words.mobile[form].heading) found.push(problem('best-on-desktop', subject, `the heading reads ${JSON.stringify(heading)}; expected ${JSON.stringify(words.mobile[form].heading)}`));
  await page.waitForTimeout(1_500);
  if ((await page.locator(PLAYGROUND.editor).count()) > 0) found.push(problem('best-on-desktop', subject, 'the phone shows an editor'));
  if ((await page.locator(PLAYGROUND.runner).count()) > 0) found.push(problem('best-on-desktop', subject, 'the phone has a runner frame; nothing runs on a phone'));
  for (const requested of await engineRequests(page)) found.push(problem('requested-engine', subject, `requested ${requested}; the phone must not download TypeScript`));
  return found;
}

// ---- The other parts' measures of the Playground ----------------------------

const located = (variant: string, part: Problem['part'], found: readonly Found[]): Problem[] => found.map((each) => ({ part, page: '/', variant, ...each }));

// `other-sites` (FR-076): what each step of the desktop's download, a run with
// no request of its own and sharing, and the phone's screen does.
export const PLAYGROUND_OTHER_SITE_RUNS: readonly { state: string; shell: Shell; act: (page: Page) => Promise<void> }[] = [
  { state: 'playground-downloading', shell: 'desktop', act: readyPage },
  {
    state: 'playground-running',
    shell: 'desktop',
    act: async (page) => {
      await readyPage(page);
      await putCode(page, 'console.log("no request");');
      await runPlayground(page, 'end');
    },
  },
  {
    state: 'playground-shared',
    shell: 'desktop',
    act: async (page) => {
      await readyPage(page);
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.click(`${PLAYGROUND.toolbar} button.share`);
      await page.waitForSelector(PLAYGROUND.message, { timeout: 5_000 });
    },
  },
  { state: 'playground-best-on-desktop', shell: 'mobile', act: async (page) => void (await page.tap(PLAYGROUND.icon)) },
];

// `layout` (FR-071, FR-072): nothing scrolls sideways but lines of code, and
// no text reaches past the Playground's window.
export async function playgroundSideways(page: Page, variant: string): Promise<Problem[]> {
  const found = await page.evaluate((selector) => {
    const list: { type: string; subject: string; detail: string }[] = [];
    const frame = document.querySelector(selector);
    if (frame === null) return [{ type: 'missing', subject: selector, detail: 'not on the page' }];
    const edge = frame.getBoundingClientRect();
    const describe = (element: Element) => `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}`;
    for (const element of frame.querySelectorAll('.playground, .playground *')) {
      if (element.getClientRects().length === 0 || element.closest('.visually-hidden, [hidden], .monaco-editor') !== null) continue;
      const clipped = getComputedStyle(element).clipPath === 'inset(50%)';
      if (!clipped && element.scrollWidth > element.clientWidth + 1 && getComputedStyle(element).overflowX !== 'visible') list.push({ type: 'horizontal-scroll', subject: describe(element), detail: `content ${element.scrollWidth}px wide in a ${element.clientWidth}px box` });
      const ownText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '');
      const rect = element.getBoundingClientRect();
      if (ownText && (rect.left < edge.left - 0.5 || rect.right > edge.right + 0.5)) list.push({ type: 'horizontal-scroll', subject: describe(element), detail: `reaches past the ${Math.round(edge.width)}px window` });
    }
    return list;
  }, WINDOW);
  return located(variant, 'layout', found);
}

// `modes`, reduced motion (FR-069, SC-013): what moves, scales or fades while
// the download, a run and the popup go on. Inside the editor, a transform that
// changes at once is the code scrolling, so there only animations count.
function watchMotion(moving: string[]): void {
  const moved: { target: string; property: string }[] = [];
  (window as unknown as { moved: typeof moved }).moved = moved;
  const last = new Map<Element, Record<string, string>>();
  const name = (element: Element) => `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}`;
  const sample = () => {
    for (const animation of document.getAnimations()) {
      const effect = animation.effect as KeyframeEffect | null;
      const target = effect?.target;
      if (!(target instanceof Element) || target.closest('#os .window[data-view="playground"]') === null) continue;
      const keys = (effect?.getKeyframes() ?? []).flatMap((frame) => Object.keys(frame));
      const transition = (animation as Animation & { transitionProperty?: string }).transitionProperty;
      const properties = [...new Set([...keys, ...(transition === undefined ? [] : [transition])])].filter((key) => moving.includes(key));
      if (properties.length > 0) moved.push({ target: name(target), property: properties.join(', ') });
    }
    for (const element of document.querySelectorAll('#os .window[data-view="playground"] *')) {
      if (element.closest('.monaco-editor') !== null) continue;
      const style = getComputedStyle(element);
      const now = { transform: style.transform, translate: style.translate, scale: style.scale };
      const before = last.get(element);
      if (before !== undefined) for (const property of Object.keys(now) as (keyof typeof now)[]) if (before[property] !== now[property]) moved.push({ target: name(element), property });
      last.set(element, now);
    }
    requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
}

export async function playgroundMotionProblems(page: Page, variant: string): Promise<Problem[]> {
  await page.evaluate(watchMotion, ['transform', 'translate', 'scale', 'opacity', 'left', 'top', 'right', 'bottom', 'inset']);
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(/\/playground\//, async (route) => {
    await held;
    await route.continue();
  });
  await openPlayground(page);
  await page.waitForSelector(PLAYGROUND.loading, { timeout: 5_000 });
  // The window has opened, by the shell's own rules (005 research R13).
  await settle(page);
  await page.evaluate(() => void (window as unknown as { moved: unknown[] }).moved.splice(0));
  await page.waitForTimeout(500);
  release();
  await playgroundReady(page);
  await putCode(page, 'let n = 0;\nconst id = setInterval(() => { console.log(++n); if (n === 8) clearInterval(id); }, 100);');
  await runPlayground(page, 'end');
  await putCode(page, 'while (true) {}');
  await runPlayground(page, 'start');
  await page.waitForSelector(PLAYGROUND.popup, { timeout: 20_000 });
  await page.waitForTimeout(500);
  await page.locator(PLAYGROUND.popup).getByRole('button', { name: words.popups.stuck.stop }).click();
  await stopped(page, 5_000);
  await page.waitForTimeout(500);
  const moved = await page.evaluate(() => (window as unknown as { moved: { target: string; property: string }[] }).moved);
  const seen = new Set<string>();
  const found: Found[] = [];
  for (const { target, property } of moved) {
    if (seen.has(`${target} ${property}`)) continue;
    seen.add(`${target} ${property}`);
    found.push(problem('motion', target, `${property} moves with reduced motion`));
  }
  return located(variant, 'modes', found);
}

// `modes`, forced colors (FR-070): what each state must still show with no
// background to show it by: a border, a wavy line, its word or its outline.
const edged = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((list) =>
    list
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => {
        const style = getComputedStyle(element);
        const sides = ['top', 'right', 'bottom', 'left'].map((side) => ({ width: Number.parseFloat(style.getPropertyValue(`border-${side}-width`)), style: style.getPropertyValue(`border-${side}-style`), color: style.getPropertyValue(`border-${side}-color`) }));
        return { name: `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}`, shows: sides.some((side) => side.width > 0 && side.style !== 'none' && side.color !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(side.color)) };
      }),
  );

async function focusRing(page: Page, selector: string): Promise<boolean> {
  await page.locator(selector).first().evaluate((element) => {
    (element as HTMLElement).blur();
    (element as HTMLElement).focus({ focusVisible: true } as FocusOptions);
  });
  return page.evaluate(() => {
    const style = getComputedStyle(document.activeElement!);
    return style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0;
  });
}

export const PLAYGROUND_FORCED_STATES = ['playground-ready', 'playground-errors', 'playground-running', 'playground-stuck'] as const;

export async function playgroundForcedProblems(page: Page, state: (typeof PLAYGROUND_FORCED_STATES)[number], variant: string): Promise<Problem[]> {
  const found: Found[] = [];
  const needsEdge = async (selector: string, what: string) => {
    const list = await edged(page, selector);
    if (list.length === 0) found.push(problem('invisible-edge', selector, `${what} isn't shown`));
    for (const { name, shows } of list) if (!shows) found.push(problem('invisible-edge', name, `${what} has no border in forced colors`));
  };
  if (state === 'playground-ready') {
    if (!(await focusRing(page, `${PLAYGROUND.toolbar} button.run`))) found.push(problem('no-outline', 'Run', 'no focus outline in forced colors'));
    await needsEdge(`${PLAYGROUND.root} .pane-tab[aria-selected="true"]`, 'the selected tab');
  }
  if (state === 'playground-errors') {
    await page.click(`${PLAYGROUND.editor} .view-lines`);
    await needsEdge(`${PLAYGROUND.editor} .squiggly-error`, 'the error mark');
  }
  if (state === 'playground-running') {
    await showPane(page, 'logs');
    const levels = (await page.locator(`${PLAYGROUND.root} li.log[data-level="log"] .level`).allTextContents()).map((level) => level.trim());
    if (levels.length === 0 || levels.some((level) => level !== words.logs.levels.log)) found.push(problem('color-alone', 'log levels', `the entries read ${JSON.stringify(levels.slice(0, 3))}; each must name its level`));
  }
  if (state === 'playground-stuck') {
    await needsEdge(PLAYGROUND.popup, 'the popup');
    if (!(await focusRing(page, `${PLAYGROUND.popup} button`))) found.push(problem('no-outline', 'Stop', 'no focus outline in forced colors'));
  }
  return located(variant, 'modes', found);
}

// `lighthouse` (SC-009): the site root's first load asks for nothing under
// `/playground/`.
export async function firstLoadProblems(page: Page, variant: string): Promise<Problem[]> {
  await page.waitForLoadState('networkidle');
  return (await engineRequests(page)).map((requested) => ({ part: 'lighthouse', page: '/', variant, type: 'engine-on-first-load', subject: requested, detail: 'the first load requested TypeScript; it must wait for the Playground to open' }));
}

// `offline` (FR-078): with the site's worker in place and the network off, the
// offline state; with the network back, the download and the editor; off
// again and reloaded, everything FR-073 lists.
export async function playgroundOfflineProblems(page: Page, variant: string, waitForWorker: (page: Page) => Promise<boolean>): Promise<Problem[]> {
  const found: Found[] = [];
  const context = page.context();
  const done = () => located(variant, 'offline', found);
  if (!(await waitForWorker(page))) {
    found.push(problem('no-service-worker', 'offline', 'no service worker took control after the first visit'));
    return done();
  }
  await context.setOffline(true);
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector(SHELL.ready, { state: 'attached', timeout: 15_000 });
  await openPlayground(page);
  await page.waitForSelector(PLAYGROUND.retry, { timeout: PLAYGROUND_WAIT_MS });
  const heading = ((await page.locator(`${PLAYGROUND.loading} h2`).textContent()) ?? '').trim();
  if (heading !== words.loading.offline) found.push(problem('offline-mismatch', 'offline state', `it reads ${JSON.stringify(heading)}; expected ${JSON.stringify(words.loading.offline)}`));
  await context.setOffline(false);
  try {
    await playgroundReady(page);
  } catch {
    found.push(problem('not-available', 'download', 'the editor did not show once the network was back'));
    return done();
  }
  await waitForWorker(page);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector(SHELL.ready, { state: 'attached', timeout: 15_000 });
  await openPlayground(page);
  try {
    await page.waitForSelector(`${PLAYGROUND.editor} .monaco-editor`, { state: 'visible', timeout: 15_000 });
  } catch {
    found.push(problem('not-available', 'stored editor', 'the editor did not show with the network off after one open'));
    return done();
  }
  await putCode(page, 'const n: number = "one";\nconst twice = (x: number) => x * 2;\nconsole.log(twice(2));');
  if ((await readErrors(page)).length !== 1) found.push(problem('offline-mismatch', 'errors', 'the code with one error did not show one error'));
  await page.click(`${PLAYGROUND.editor} .view-lines`);
  await cursorAt(page, 2, 8);
  const key = await primaryKey(page);
  await page.keyboard.press(`${key}+KeyK`);
  await page.keyboard.press(`${key}+KeyI`);
  if (!(await until(async () => (await hoverText(page)).includes('(x: number) => number')))) found.push(problem('offline-mismatch', 'type', 'a name showed no type'));
  await page.keyboard.press('Escape');
  for (const pane of ['javascript', 'declarations', 'errors', 'logs'] as const) await showPane(page, pane);
  await toggleOption(page, OPTION, true);
  for (const example of EXAMPLES) {
    await chooseExample(page, example.title);
    const errors = await readErrors(page);
    if (errors.length > 0) found.push(problem('offline-mismatch', example.title, `${errors.length} diagnostics offline: ${errors.join('; ')}`));
    if (example.group === 'cv') {
      await runPlayground(page, 'end');
      if ((await logged(page)).length === 0) found.push(problem('offline-mismatch', example.title, `the CV example ${JSON.stringify(example.title)} logged nothing offline`));
    }
  }
  await putCode(page, 'while (true) {}');
  await runPlayground(page, 'start');
  await page.waitForSelector(PLAYGROUND.popup, { timeout: 20_000 });
  await page.locator(PLAYGROUND.popup).getByRole('button', { name: words.popups.stuck.stop }).click();
  await stopped(page, 5_000);
  await page.click(`${PLAYGROUND.toolbar} button.share`);
  await page.waitForSelector(PLAYGROUND.message, { timeout: 5_000 });
  if ((await page.locator(PLAYGROUND.message).getAttribute('data-kind')) === 'error') found.push(problem('offline-mismatch', 'share', 'Share failed with the network off'));
  return done();
}

// ---- The part --------------------------------------------------------------

// The part's checks, in the order they run.
export const PLAYGROUND_CHECKS: readonly PlaygroundCheck[] = [
  { check: 'download', shell: 'desktop', names: ['download', 'version'], run: downloadProblems },
  { check: 'editing', shell: 'desktop', names: ['editing'], run: editingProblems },
  { check: 'panes', shell: 'desktop', names: ['panes'], run: paneProblems },
  { check: 'examples', shell: 'desktop', names: EXAMPLES.map((example) => `examples/${example.id}`), run: exampleProblems },
  { check: 'run', shell: 'desktop', names: ['run'], run: runProblems },
  { check: 'interval', shell: 'desktop', names: ['interval'], run: intervalProblems },
  { check: 'stop', shell: 'desktop', names: ['stop'], run: stopProblems },
  { check: 'stuck', shell: 'desktop', names: ['stuck'], run: stuckProblems },
  { check: 'timer-60s', shell: 'desktop', names: ['timer-60s'], run: timerProblems },
  { check: 'dialogs', shell: 'desktop', names: ['dialogs'], run: dialogProblems },
  { check: 'sandbox', shell: 'desktop', names: ['sandbox'], run: sandboxProblems },
  { check: 'limits', shell: 'desktop', names: ['limits'], run: limitProblems },
  { check: 'kept', shell: 'desktop', names: ['kept'], run: keptProblems },
  { check: 'reset', shell: 'desktop', names: ['reset'], run: resetProblems },
  { check: 'share', shell: 'desktop', names: ['share'], run: shareProblems },
  { check: 'broken-link', shell: 'desktop', names: ['broken-link'], run: brokenLinkProblems },
  { check: 'too-long', shell: 'desktop', names: ['too-long'], run: tooLongProblems },
  { check: 'specs', shell: 'desktop', names: ['specs'], run: specsProblems },
  {
    check: 'icon',
    shell: 'mobile',
    names: ['icon'],
    run: async (page, { add }) => {
      await page.tap(PLAYGROUND.icon);
      add('icon', await phoneProblems(page, 'app', 'icon'));
    },
  },
  {
    check: 'shared-link',
    shell: 'mobile',
    names: ['shared-link'],
    run: async (page, { add }) => {
      await followLink(page, shareLink(new URL(page.url()).origin, { c: 'console.log("shared");' }));
      add('shared-link', await phoneProblems(page, 'link', 'link'));
    },
  },
];
