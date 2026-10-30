// The inspector part (007 contracts/cli.md Parts, research R15, FR-012,
// FR-013, FR-030, SC-003, SC-004, SC-011): in each shell, each view's specs
// are shown as a visitor shows them and compared with the requirement data
// the check reads from the repository itself: the requirements listed and
// their order, each group's number, title, status and count, each
// requirement's text, its tests and every link. Then every `data-req` the
// page holds, in every state the driver reaches, must be in the view of the
// app whose content holds it, or in the shell's. Going back must give the
// app back as it was: the CV's scroll position, the Terminal's output,
// history, draft and vim view.
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';
import { buildRequirementData } from '../../../../packages/web/scripts/requirements/index.ts';
import type { Inline, RequirementData } from '../../../../packages/web/scripts/requirements/index.ts';
import { commitUrl, fileUrl } from '../../../../packages/web/src/format/repository.ts';
import { deriveView } from '../../../../packages/web/src/inspector/derive.ts';
import { counted, fill, siteText } from '../../../../packages/web/src/site-text.ts';
import type { Problem } from '../report.ts';
import { INSPECTOR, TERMINAL, leaveSpecs, newRun, openView, runCommand, settle, showSpecs, stateVariant, tapPocketKey, typeLine } from '../shell-states.ts';
import type { InspectorView, Shell, ShellState } from '../shell-states.ts';

export const INSPECTOR_VIEWS: readonly InspectorView[] = ['cv', 'terminal', 'about'];

const text = siteText.inspector;

const SITE_FILE = 'packages/content/site.json';

const WAIT_MS = 5_000;

type Found = Omit<Problem, 'part' | 'page' | 'variant'>;

// What the part expects: the requirement data read from the repository by
// the check's own modules, the data file the build wrote, which the page
// shows, and the repository the site links to.
export type InspectorExpected = { data: RequirementData; built: RequirementData; repository: string | undefined };

const DATA_FILE = /^requirements-[0-9a-f]{8}\.json$/;

export function readInspectorExpected(repositoryRoot: string, siteDir: string): InspectorExpected {
  const site = JSON.parse(fs.readFileSync(path.join(repositoryRoot, SITE_FILE), 'utf8')) as { repository?: string };
  const repository = typeof site.repository === 'string' && site.repository !== '' ? site.repository : undefined;
  const assets = path.join(siteDir, 'assets');
  const file = fs.readdirSync(assets).find((name) => DATA_FILE.test(name));
  if (file === undefined) throw new Error('the build wrote no requirement data file');
  const built = JSON.parse(fs.readFileSync(path.join(assets, file), 'utf8')) as RequirementData;
  return { data: buildRequirementData(repositoryRoot), built, repository };
}

// The part's variants in a shell, in the order it runs them.
export const inspectorVariants = (shell: Shell, width: number) => [...INSPECTOR_VIEWS.map((view) => stateVariant(shell, `${view}-specs`, width)), stateVariant(shell, 'elements', width)];

const viewName = (view: InspectorView) => siteText.os.views[view];

// Who carries a view's requirements, as problem lines say it.
const carrier = (view: InspectorView) => (view === 'about' ? 'the shell' : `the ${viewName(view)} app`);
const listName = (view: InspectorView) => (view === 'about' ? "the shell's view" : `the ${viewName(view)} view`);

const normal = (value: string) => value.replace(/\s+/g, ' ').trim();

// An Inline tree's text, as the page shows it.
export function inlineText(nodes: readonly Inline[]): string {
  return normal(nodes.map((node) => ('children' in node ? inlineText(node.children) : node.text)).join(''));
}

// ---- Reading the page -------------------------------------------------------

type ShownTest = { name: string; place: string; href: string | null };
type ShownRequirement = { fullId: string; text: string; specLine: string | null; textLinks: (string | null)[]; tests: ShownTest[] };
type ShownGroup = { feature: string; number: string; title: string; status: string; notShown: string | null; openSpec: string | null; requirements: ShownRequirement[] };
type ShownView = { build: { text: string; href: string | null } | null; groups: ShownGroup[] };

const readView = (page: Page, view: InspectorView): Promise<ShownView> =>
  page.evaluate((selector) => {
    const words = (element: Element | null) => (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const href = (element: Element | null) => element?.getAttribute('href') ?? null;
    const root = document.querySelector(selector)!;
    const build = root.querySelector('.build-commit');
    return {
      build: build === null ? null : { text: words(build), href: href(build) },
      groups: [...root.querySelectorAll('section.spec-group')].map((group) => ({
        feature: group.getAttribute('data-feature') ?? '',
        number: words(group.querySelector('.spec-number')),
        title: words(group.querySelector('.spec-title')),
        status: words(group.querySelector('.status')),
        notShown: group.querySelector('.not-shown') === null ? null : words(group.querySelector('.not-shown')),
        openSpec: href(group.querySelector('.open-spec')),
        requirements: [...group.querySelectorAll('li.requirement')].map((item) => ({
          fullId: item.getAttribute('data-id') ?? '',
          text: words(item.querySelector('.requirement-text')),
          specLine: href(item.querySelector('.spec-line')),
          textLinks: [...item.querySelectorAll('.requirement-text a')].map(href),
          tests: [...item.querySelectorAll('ul.tests > li')].map((test) => ({ name: words(test.querySelector('.test-name')), place: words(test.querySelector('.test-place')), href: href(test.querySelector('.test-name')) })),
        })),
      })),
    };
  }, INSPECTOR.specView(view));

// ---- Comparing ---------------------------------------------------------------

// The first words where two texts part, from the shown one.
function partAt(shown: string, expected: string): string {
  const has = shown.split(' ');
  const want = expected.split(' ');
  const at = has.findIndex((word, index) => word !== want[index]);
  const from = at < 0 ? want.length : at;
  return has.slice(from, from + 3).join(' ') || '(the end)';
}

const LINK = /\/blob\/([^/]+)\/(.+?)(?:\?plain=1)?(?:#L(\d+))?$/;

// How a shown link differs from the one expected: its commit, file or line.
function linkDifference(what: string, shown: string | null, expected: string | null): string | null {
  if (shown === expected) return null;
  if (shown === null) return `${what} has no link, expected ${expected}`;
  if (expected === null) return `${what} links to ${shown}, expected no link`;
  const has = LINK.exec(shown);
  const want = LINK.exec(expected);
  if (has !== null && want !== null) {
    if (has[1] !== want[1]) return `${what} names commit ${has[1]!.slice(0, 7)}, the site was built from ${want[1]!.slice(0, 7)}`;
    if (has[2] !== want[2]) return `${what} names ${has[2]}, expected ${want[2]}`;
    if (has[3] !== want[3]) return `${what} names line ${has[3] ?? 'none'}, the ${what === 'the spec link' ? 'requirement' : 'target'} is on line ${want[3] ?? 'none'}`;
  }
  return `${what} links to ${shown}, expected ${expected}`;
}

// The address each in-text link should have, in order.
function textHrefs(nodes: readonly Inline[], repository: string | undefined, commit: string): string[] {
  return nodes.flatMap((node): string[] => {
    switch (node.kind) {
      case 'link':
        return [node.href, ...textHrefs(node.children, repository, commit)];
      case 'file':
        return [...(repository === undefined ? [] : [fileUrl(repository, commit, node.path)]), ...textHrefs(node.children, repository, commit)];
      case 'ref':
        return repository === undefined ? [] : [fileUrl(repository, commit, `specs/${node.feature}/spec.md`, node.line)];
      case 'strong':
      case 'em':
      case 's':
        return textHrefs(node.children, repository, commit);
      default:
        return [];
    }
  });
}

const testName = (name: string) => (name.trim() === '' ? text.unnamedTest : normal(name));

export function compareView(view: InspectorView, shown: ShownView, { data, repository }: InspectorExpected): Found[] {
  const found: Found[] = [];
  const add = (type: string, subject: string, detail: string) => found.push({ type, subject, detail });
  const model = deriveView(data, view, view === 'about' ? text.shellName : viewName(view));
  const { commit } = data.version;
  const expectedIds = model.groups.flatMap((group) => group.requirements.map((requirement) => requirement.fullId));
  const shownIds = shown.groups.flatMap((group) => group.requirements.map((requirement) => requirement.fullId));

  // The requirements listed, and their order (FR-006, FR-030).
  for (const id of expectedIds) if (!shownIds.includes(id)) add('missing-requirement', id, `${carrier(view)} carries it, but ${view === 'about' ? "About this site's view" : 'its spec view'} doesn't list it`);
  for (const id of shownIds) if (!expectedIds.includes(id)) add('extra-requirement', id, `listed in ${listName(view)}, but ${carrier(view)} doesn't carry it`);
  const common = shownIds.filter((id) => expectedIds.includes(id));
  const wanted = expectedIds.filter((id) => shownIds.includes(id));
  const at = common.findIndex((id, index) => id !== wanted[index]);
  if (at >= 0) add('out-of-order', common[at]!, `listed where ${listName(view)} should list ${wanted[at]}, by spec number then ID`);

  // The build line: the short commit, linked to it.
  const build = shown.build;
  if (build === null || build.text !== model.version.short) add('link-mismatch', 'build', `the build line names ${build?.text ?? 'no commit'}, the site was built from ${model.version.short}`);
  else if (build.href !== (repository === undefined ? null : commitUrl(repository, commit))) add('link-mismatch', 'build', `the build commit links to ${build.href ?? 'nothing'}, expected ${repository === undefined ? 'no link' : commitUrl(repository, commit)}`);

  for (const group of model.groups) {
    const { spec } = group;
    const shownGroup = shown.groups.find((candidate) => candidate.feature === spec.feature);
    if (shownGroup === undefined) continue;
    const status = spec.status === 'Approved' ? text.approved : text.draft;
    if (shownGroup.number !== spec.number || shownGroup.title !== normal(spec.title) || shownGroup.status.toLowerCase() !== status.toLowerCase()) {
      add('text-mismatch', spec.feature, `the group reads "${shownGroup.number} ${shownGroup.title}, ${shownGroup.status}", the spec is "${spec.number} ${normal(spec.title)}, ${status}"`);
    }
    // The count of the spec's requirements the view leaves out (FR-006).
    const count = group.notShown === 0 ? null : fill(counted(text.notShown, group.notShown), { n: group.notShown });
    if (shownGroup.notShown !== count) {
      const said = shownGroup.notShown === null ? 'shows no count' : `says ${/\d+/.exec(shownGroup.notShown)?.[0] ?? shownGroup.notShown} more requirements aren't shown`;
      add('wrong-count', spec.feature, `${said}, expected ${group.notShown === 0 ? 'none' : group.notShown}`);
    }
    const open = linkDifference('Open the spec', shownGroup.openSpec, repository === undefined ? null : fileUrl(repository, commit, spec.file));
    if (open !== null) add('link-mismatch', spec.feature, open);

    for (const record of group.requirements) {
      const item = shownGroup.requirements.find((candidate) => candidate.fullId === record.fullId);
      if (item === undefined) continue;
      const where = `${spec.file} line ${record.line}`;
      // Its text, as the spec writes it (FR-007, FR-013, SC-004).
      const expectedText = inlineText(record.text);
      if (item.text !== expectedText) add('text-mismatch', record.fullId, `differs from ${where} at "${partAt(item.text, expectedText)}"`);
      // Its tests, as 001 counts them (FR-008).
      const places = item.tests.map((test) => test.place);
      const counting = record.tests.map((test) => `${test.file}:${test.line}`);
      if (places.join('\n') !== counting.join('\n')) {
        const missing = counting.filter((place) => !places.includes(place));
        const extra = places.filter((place) => !counting.includes(place));
        const parts = [...(missing.length === 0 ? [] : [`missing ${missing.join(', ')}`]), ...(extra.length === 0 ? [] : [`not counted ${extra.join(', ')}`])];
        add('tests-mismatch', record.fullId, `lists ${places.length} ${places.length === 1 ? 'test' : 'tests'}, 001 counts ${counting.length}${parts.length === 0 ? ', in another order' : ` (${parts.join('; ')})`}`);
      } else {
        record.tests.forEach((test, index) => {
          if (item.tests[index]!.name !== testName(test.name)) add('tests-mismatch', record.fullId, `names the test at ${counting[index]} "${item.tests[index]!.name}", 001 reads "${testName(test.name)}"`);
        });
      }
      // Its links: the spec line, each test and each link in its text (FR-010).
      const differences = [
        linkDifference('the spec link', item.specLine, repository === undefined ? null : fileUrl(repository, commit, spec.file, record.line)),
        ...record.tests.map((test, index) => (item.tests[index] === undefined ? null : linkDifference(`the link to ${test.file}:${test.line}`, item.tests[index]!.href, repository === undefined ? null : fileUrl(repository, commit, test.file, test.line)))),
      ];
      const hrefs = textHrefs(record.text, repository, commit);
      if (item.textLinks.join('\n') !== hrefs.join('\n')) differences.push(`the text links to ${item.textLinks.length === 0 ? 'nothing' : item.textLinks.join(', ')}, expected ${hrefs.length === 0 ? 'nothing' : hrefs.join(', ')}`);
      for (const difference of differences) if (difference !== null) add('link-mismatch', record.fullId, difference);
    }
  }
  return found;
}

// ---- Going back ---------------------------------------------------------------

type TerminalState = { runs: number; output: string; draft: string; vim: boolean };

const terminalState = async (page: Page): Promise<TerminalState> => ({
  runs: await page.locator(TERMINAL.run).count(),
  output: normal((await page.locator(TERMINAL.run).last().textContent().catch(() => '')) ?? ''),
  draft: (await page.locator(TERMINAL.commandLine).inputValue().catch(() => '')) ?? '',
  vim: await page.locator(TERMINAL.vimText).isVisible(),
});

const DRAFT = 'hel';

// Shows the view's specs and goes back, checking what the app kept.
async function backProblems(page: Page, shell: Shell, view: InspectorView, compare: () => Promise<Found[]>): Promise<Found[]> {
  const found: Found[] = [];
  const name = viewName(view);
  if (view === 'cv') {
    const scroller = page.locator(INSPECTOR.scroller('cv', shell));
    const before = await scroller.evaluate((element) => {
      element.scrollTop = Math.round(Math.min(600, (element.scrollHeight - element.clientHeight) / 2));
      return element.scrollTop;
    });
    await showSpecs(page, view, shell);
    found.push(...(await compare()));
    await leaveSpecs(page, view, shell);
    const after = await scroller.evaluate((element) => element.scrollTop);
    if (Math.abs(after - before) > 1) found.push({ type: 'state-lost', subject: 'cv', detail: `the scroll position was ${before}px, then ${after}px after Back to ${name}` });
    return found;
  }
  if (view === 'about') {
    await showSpecs(page, view, shell);
    found.push(...(await compare()));
    await leaveSpecs(page, view, shell);
    return found;
  }
  // The Terminal: a command's output, then a half-typed one.
  if (shell === 'desktop') await runCommand(page, 'help');
  else await newRun(page, () => tapPocketKey(page, 'help'));
  const line = page.locator(TERMINAL.commandLine);
  if (shell === 'desktop') await line.focus();
  else await line.tap();
  await page.keyboard.type(DRAFT);
  const before = await terminalState(page);
  await showSpecs(page, view, shell);
  found.push(...(await compare()));
  await leaveSpecs(page, view, shell);
  const after = await terminalState(page);
  if (after.draft !== before.draft) found.push({ type: 'state-lost', subject: 'terminal', detail: `the half-typed command "${before.draft}" was "${after.draft}" after Back to ${name}` });
  if (after.runs !== before.runs || after.output !== before.output) found.push({ type: 'state-lost', subject: 'terminal', detail: `the output held ${before.runs} ${before.runs === 1 ? 'run' : 'runs'}, then ${after.runs} after Back to ${name}${after.runs === before.runs ? ', with other text' : ''}` });
  // The history: Up recalls the last command.
  if (shell === 'desktop') await line.focus();
  else await line.tap();
  await line.fill('');
  await page.keyboard.press('ArrowUp');
  const recalled = await line.inputValue();
  if (recalled !== 'help') found.push({ type: 'state-lost', subject: 'terminal', detail: `Up recalled "${recalled}" after Back to ${name}, expected "help"` });
  await line.fill('');
  // The vim view, open as the specs show.
  if (shell === 'desktop') await typeLine(page, 'cv');
  else await tapPocketKey(page, 'cv');
  await page.locator(TERMINAL.vimText).waitFor({ state: 'visible', timeout: WAIT_MS });
  await settle(page);
  await showSpecs(page, view, shell);
  await leaveSpecs(page, view, shell);
  if (!(await page.locator(TERMINAL.vimText).isVisible())) found.push({ type: 'state-lost', subject: 'terminal', detail: `the vim view was gone after Back to ${name}` });
  return found;
}

// On a fresh, hydrated page of the root in `shell`: opens the view, shows
// its specs, compares them with what's expected, and goes back.
export async function inspectorViewProblems(page: Page, shell: Shell, view: InspectorView, expected: InspectorExpected, pageLabel: string, variant: string): Promise<Problem[]> {
  await openView(page, view, shell);
  const found = await backProblems(page, shell, view, async () => compareView(view, await readView(page, view), expected));
  return found.map((problem) => ({ part: 'inspector', page: pageLabel, variant, ...problem }));
}

// ---- Every element's requirements (FR-012) --------------------------------

// Every `data-req` in the page, with the element that carries it and the
// app whose content holds it, if any.
const carriedInPage = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('body [data-req]')].map((element) => {
      const content = element.closest('.window-content, .view-content');
      const app = content?.closest('[data-view]')?.getAttribute('data-view') ?? null;
      const classes = typeof element.className === 'string' && element.className.trim() !== '' ? `.${element.className.trim().split(/\s+/).join('.')}` : '';
      return { ids: (element.getAttribute('data-req') ?? '').split(/\s+/).filter(Boolean), app, element: `${element.tagName.toLowerCase()}${classes}` };
    }),
  );

// Each requirement an element carries that isn't in the view of the app
// whose content holds it, or in the shell's, as the built data file lists
// them: what the page's views show.
export async function elementProblems(page: Page, { built: data }: InspectorExpected): Promise<Found[]> {
  const shell = new Set(data.views.shell ?? []);
  const found: Found[] = [];
  for (const { ids, app, element } of await carriedInPage(page)) {
    const own = app === null || data.views[app] === undefined ? null : new Set(data.views[app]);
    for (const id of ids) {
      if (shell.has(id) || own?.has(id) === true) continue;
      const name = own === null ? null : siteText.os.views[app as InspectorView] ?? app;
      found.push({ type: 'uncarried-element', subject: id, detail: own === null ? `carried by ${element}, but the shell's view doesn't list it` : `carried by ${element} in the ${name}, but the ${name}'s view doesn't list it` });
    }
  }
  return found;
}

// The sweep over every state a shell's driver reaches: each problem once.
export async function sweepProblems(states: readonly ShellState[], visit: (state: ShellState) => Promise<Found[]>, pageLabel: string, variant: string): Promise<Problem[]> {
  const seen = new Map<string, Problem>();
  for (const state of states) {
    for (const problem of await visit(state)) {
      const key = `${problem.subject}\n${problem.detail}`;
      if (!seen.has(key)) seen.set(key, { part: 'inspector', page: pageLabel, variant, ...problem, detail: `${problem.detail} (${state.state})` });
    }
  }
  return [...seen.values()];
}
