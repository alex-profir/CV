// One requirement in a spec view (FR-007, FR-008, contracts/inspector.md
// The spec view): its short ID, its full ID first for assistive technology,
// its text with code and links as the spec writes them, its line in the
// spec, and its tests, or a note that none covers it yet.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { fill, siteText } from '../../src/site-text.ts';
import { axNodes } from '../helpers/ax.ts';
import { copyBuild, inlineText, readView, requirementData, showSpecs, specViewSelector } from '../helpers/inspector.ts';
import type { InspectorView } from '../helpers/inspector.ts';
import { openShell } from '../helpers/shell.ts';
import { SHELL_PAGE } from '../helpers/terminal.ts';
import type { Inline, RequirementData } from '../../scripts/requirements/index.ts';

vi.setConfig({ testTimeout: 300_000 });

const VIEWS: readonly InspectorView[] = ['cv', 'terminal', 'about'];
const text = siteText.inspector;
const FEATURE = '007-requirement-inspector';
const SPEC = `specs/${FEATURE}/spec.md`;
// The requirement the fixture adds to 007's spec, after its last.
const ADDED = 'FR-035';
const ADDED_FULL = `${FEATURE}-${ADDED}`;
const URL_TARGET = 'https://www.w3.org/WAI/';

const dataKey = (view: InspectorView) => (view === 'about' ? 'shell' : view);

// Every node of a kind in an Inline tree, in order.
function nodesOf<K extends Inline['kind']>(nodes: readonly Inline[], kind: K): Extract<Inline, { kind: K }>[] {
  return nodes.flatMap((node) => [...(node.kind === kind ? [node as Extract<Inline, { kind: K }>] : []), ...('children' in node ? nodesOf(node.children, kind) : [])]);
}

// What one requirement shows, beyond `readView`: its first child, its code
// spans, its in-text links and the tests label.
const readItems = (page: Page, view: InspectorView) =>
  page.evaluate(
    (selector) =>
      [...document.querySelectorAll(`${selector} li.requirement`)].map((item) => {
        const first = item.firstElementChild;
        const body = item.querySelector('.requirement-text');
        return {
          fullId: item.getAttribute('data-id') ?? '',
          first: { hidden: first?.classList.contains('visually-hidden') === true, text: (first?.textContent ?? '').trim() },
          shortHidden: item.querySelector('.short-id')?.getAttribute('aria-hidden') === 'true',
          code: [...(body?.querySelectorAll('code') ?? [])].map((code) => code.textContent ?? ''),
          links: [...(body?.querySelectorAll('a') ?? [])].map((link) => ({ text: (link.textContent ?? '').trim(), href: link.getAttribute('href'), label: link.getAttribute('aria-label') })),
          specLine: (item.querySelector('.spec-line')?.textContent ?? '').trim(),
          testsLabel: (item.querySelector('.tests-label')?.textContent ?? '').trim(),
          noTests: item.querySelector('.no-tests') === null ? null : { text: (item.querySelector('.no-tests')?.textContent ?? '').trim(), mark: item.querySelector('.no-tests svg[aria-hidden="true"]') !== null },
          testList: item.querySelector('ul.tests') !== null,
        };
      }),
    specViewSelector(view),
  );

function expectRequirementsAsData(data: RequirementData, view: InspectorView, groups: Awaited<ReturnType<typeof readView>>, items: Awaited<ReturnType<typeof readItems>>) {
  const ids = data.views[dataKey(view)]!;
  const requirements = groups.flatMap((group) => group.requirements);
  expect(requirements.map((requirement) => requirement.fullId), view).toEqual(ids);
  requirements.forEach((shown, index) => {
    const record = data.requirements[shown.fullId]!;
    const item = items[index]!;
    const where = `${view} ${record.fullId}`;
    expect(shown.shortId, where).toBe(record.id);
    expect(item.shortHidden, `${where}: the short ID is hidden from assistive technology`).toBe(true);
    expect(item.first, `${where}: the full ID comes first`).toEqual({ hidden: true, text: record.fullId });
    expect(shown.text, where).toBe(inlineText(record.text));
    expect(item.code, `${where}: code`).toEqual(nodesOf(record.text, 'code').map((node) => node.text));
    expect(item.specLine, where).toBe(fill(text.inTheSpec, { line: record.line }));
    if (record.tests.length === 0) {
      expect(item.testsLabel, where).toBe(text.tests);
      expect(item.noTests, where).toEqual({ text: text.noTests, mark: true });
      expect(item.testList, where).toBe(false);
    } else {
      expect(item.testsLabel, where).toBe(fill(text.testsCount, { n: record.tests.length }));
      expect(item.noTests, where).toBeNull();
      expect(
        shown.tests.map((test) => ({ name: test.name, place: test.place })),
        `${where}: tests`,
      ).toEqual(record.tests.map((test) => ({ name: test.name.replace(/\s+/g, ' ').trim() || text.unnamedTest, place: `${test.file}:${test.line}` })));
    }
    // A reference's link reads as written, and its name adds the full ID.
    const refs = nodesOf(record.text, 'ref');
    const refLinks = item.links.filter((link) => refs.some((ref) => ref.text === link.text));
    expect(refLinks.length, `${where}: a link per reference`).toBe(refs.length);
    refs.forEach((ref, at) => {
      const fullId = `${ref.feature}-${ref.id}`;
      expect(refLinks[at]!.text, where).toBe(ref.text);
      expect(refLinks[at]!.label, where).toBe(ref.text.includes(fullId) ? null : fill(text.refName, { text: ref.text, id: fullId }));
    });
  });
}

describe('007-requirement-inspector-FR-007: each requirement shows its ID, its text and its line in the spec', () => {
  test('desktop: every requirement of the CV, Terminal and About views is the built data\'s, its full ID first, its code spans and references as written', async () => {
    const data = requirementData();
    const page = await openShell(SHELL_PAGE.desktop);
    for (const view of VIEWS) {
      await showSpecs(page, view, 'desktop');
      expectRequirementsAsData(data, view, await readView(page, view), await readItems(page, view));
    }
    // The real views hold code spans and references to check.
    const all = Object.values(data.views).flatMap((ids) => ids.map((id) => data.requirements[id]!));
    expect(all.some((record) => nodesOf(record.text, 'code').length > 0)).toBe(true);
    expect(all.some((record) => nodesOf(record.text, 'ref').length > 0)).toBe(true);
  });

  test('mobile: the CV view\'s requirements are the built data\'s', async () => {
    const data = requirementData();
    const page = await openShell(SHELL_PAGE.mobile);
    await showSpecs(page, 'cv', 'mobile');
    expectRequirementsAsData(data, 'cv', await readView(page, 'cv'), await readItems(page, 'cv'));
  });

  test('a reference\'s accessible name is its text, then the full ID', async () => {
    const data = requirementData();
    const page = await openShell(SHELL_PAGE.desktop);
    await showSpecs(page, 'cv', 'desktop');
    const record = data.views.cv!.map((id) => data.requirements[id]!).find((candidate) => nodesOf(candidate.text, 'ref').length > 0)!;
    const ref = nodesOf(record.text, 'ref')[0]!;
    const nodes = await axNodes(page, `${specViewSelector('cv')} li.requirement[data-id="${record.fullId}"] .requirement-text a`);
    expect(nodes.map((node) => node.name)).toContain(fill(text.refName, { text: ref.text, id: `${ref.feature}-${ref.id}` }));
  });
});

describe('007-requirement-inspector-FR-008: each requirement lists the tests that cover it, or says none does', () => {
  test('a test whose title is built when it runs has no name in the data, and shows a stand-in, still linked to its line', async () => {
    const data = requirementData();
    const record = data.views.terminal!.map((id) => data.requirements[id]!).find((candidate) => candidate.tests.some((test) => test.name.trim() === ''))!;
    expect(record, 'the Terminal view lists a requirement with such a test').toBeDefined();
    const at = record.tests.findIndex((test) => test.name.trim() === '');
    const page = await openShell(SHELL_PAGE.desktop);
    await showSpecs(page, 'terminal', 'desktop');
    const link = page.locator(`${specViewSelector('terminal')} li.requirement[data-id="${record.fullId}"] ul.tests > li`).nth(at).locator('a.test-name');
    expect((await link.innerText()).trim()).toBe(text.unnamedTest);
    expect(await link.getAttribute('href')).toMatch(new RegExp(`/${record.tests[at]!.file.replace(/[.]/g, '\\.')}#L${record.tests[at]!.line}$`));
  });

  test('a draft spec\'s requirement with code, a web link, a file link and a reference, carried by Show specs and covered by no test', async () => {
    const { server, site } = await copyBuild((root) => {
      const file = path.join(root, SPEC);
      let spec = fs.readFileSync(file, 'utf8').replace('**Status**: Approved', '**Status**: Draft');
      const at = spec.indexOf('\n### Key Entities');
      const line = `- **${ADDED}**: The \`Show specs\` control MUST follow [the plan](plan.md) and [the WAI guide](${URL_TARGET}), as 005 FR-013 does.\n`;
      spec = `${spec.slice(0, at)}${line}${spec.slice(at)}`;
      fs.writeFileSync(file, spec);
      const control = path.join(root, 'packages/web/src/inspector/ShowSpecs.tsx');
      const source = fs.readFileSync(control, 'utf8');
      const carried = `data-req="${FEATURE}-FR-001 `;
      if (!source.includes(carried)) throw new Error('ShowSpecs.tsx carries no 007 requirement to add to');
      fs.writeFileSync(control, source.replace(carried, `data-req="${ADDED_FULL} ${FEATURE}-FR-001 `));
    });
    const data = requirementData(site);
    const record = data.requirements[ADDED_FULL]!;
    expect(record.tests).toEqual([]);
    expect(data.views.shell).toContain(ADDED_FULL);
    expect(data.specs.find((spec) => spec.feature === FEATURE)!.status).toBe('Draft');

    const page = await openShell({ ...SHELL_PAGE.desktop, url: server.url });
    await showSpecs(page, 'about', 'desktop');
    expectRequirementsAsData(data, 'about', await readView(page, 'about'), await readItems(page, 'about'));

    const group = (await readView(page, 'about')).find((candidate) => candidate.feature === FEATURE)!;
    expect(group.status).toBe('draft');
    const chip = page.locator(`${specViewSelector('about')} section.spec-group[data-feature="${FEATURE}"] .status`);
    expect((await chip.innerText()).replace(/^[\s,]+/, '').trim().toLowerCase()).toBe(text.draft.toLowerCase());

    const item = (await readItems(page, 'about')).find((candidate) => candidate.fullId === ADDED_FULL)!;
    expect(item.testsLabel).toBe(text.tests);
    expect(item.noTests).toEqual({ text: text.noTests, mark: true });
    expect(item.testList).toBe(false);
    expect(item.code).toEqual(['Show specs']);
    const links = Object.fromEntries(item.links.map((link) => [link.text, link]));
    expect(links['the WAI guide']?.href).toBe(URL_TARGET);
    expect(links['the plan']?.href).toMatch(new RegExp(`/blob/[0-9a-f]{40}/specs/${FEATURE}/plan\\.md$`));
    expect(links['005 FR-013']?.label).toBe(fill(text.refName, { text: '005 FR-013', id: '005-os-shell-FR-013' }));
  });
});
