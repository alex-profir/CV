// The spec view's structure as assistive technology gets it (FR-018,
// contracts/inspector.md The spec view): a region named for the view, one
// heading for it and one per spec, a list of requirements per spec, each
// starting with its full ID, and a list of tests per requirement, with no
// heading level skipped.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { siteText } from '../../src/site-text.ts';
import { axNodes, axText } from '../helpers/ax.ts';
import { readView, requirementData, showSpecs, specViewSelector, viewSelector } from '../helpers/inspector.ts';
import type { InspectorShell } from '../helpers/inspector.ts';
import { openShell, settle } from '../helpers/shell.ts';
import { SHELL_PAGE } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 180_000 });

const SHELLS: readonly InspectorShell[] = ['desktop', 'mobile'];
const text = siteText.inspector;
const SPEC = specViewSelector('cv');

const headingsIn = async (page: Page, selector: string) =>
  (await axNodes(page, ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', '[role="heading"]'].map((tag) => `${selector} ${tag}`).join(', ')))
    .filter((node) => !node.ignored && node.role === 'heading')
    .map((node) => ({ level: node.level ?? 0, name: node.name.replace(/\s+/g, ' ').trim() }));

// No level is more than one below the one before it, from the first.
function expectNoSkippedLevel(outline: { level: number }[], where: string) {
  outline.forEach((heading, index) => {
    if (index === 0) return;
    expect(heading.level, `${where}: heading ${index + 1} after level ${outline[index - 1]!.level}`).toBeLessThanOrEqual(outline[index - 1]!.level + 1);
  });
}

describe('007-requirement-inspector-FR-018: the spec view is a region with headings and lists', () => {
  for (const shell of SHELLS) {
    test(`${shell}: the CV view's region, headings, requirement lists and test lists`, async () => {
      const data = requirementData();
      const page = await openShell(SHELL_PAGE[shell]);
      await showSpecs(page, 'cv', shell);

      const [region] = await axNodes(page, SPEC);
      expect(region).toMatchObject({ role: 'region', name: 'CV specs', ignored: false });

      const outline = await headingsIn(page, SPEC);
      expect(outline.filter((heading) => heading.level === 1)).toEqual([{ level: 1, name: 'Specs for CV' }]);
      expect(outline[0]).toEqual({ level: 1, name: 'Specs for CV' });
      const groups = await readView(page, 'cv');
      const specs = groups.map((group) => data.specs.find((spec) => spec.feature === group.feature)!);
      expect(outline.slice(1)).toEqual(specs.map((spec) => ({ level: 2, name: `${spec.number} ${spec.title}, ${spec.status === 'Approved' ? text.approved : text.draft}` })));
      expect(outline.some((heading) => heading.name.startsWith('004 The /cv Page, '))).toBe(true);
      expectNoSkippedLevel(await headingsIn(page, viewSelector('cv', shell)), `${shell} window`);

      // A list of requirements per spec, each item starting with its full ID.
      const lists = await axNodes(page, `${SPEC} ul.requirements`);
      expect(lists.map((node) => node.role)).toEqual(groups.map(() => 'list'));
      const items = await axNodes(page, `${SPEC} li.requirement`);
      const ids = groups.flatMap((group) => group.requirements.map((requirement) => requirement.fullId));
      expect(items.map((node) => node.role)).toEqual(ids.map(() => 'listitem'));
      const spoken = await axText(page, `${SPEC} li.requirement`);
      // The full ID is read first (its own element, then the text's), and the
      // short ID isn't read again.
      spoken.forEach((said, index) => {
        const id = ids[index]!;
        expect(said.startsWith(id), `${id}: read first`).toBe(true);
        expect(said.slice(id.length).trim().startsWith(id.replace(/^.*-(FR-\d{3})$/, '$1')), `${id}: the short ID isn't read`).toBe(false);
      });

      // A list of tests per requirement that has tests.
      const withTests = groups.flatMap((group) => group.requirements).filter((requirement) => requirement.tests.length > 0);
      const testLists = await axNodes(page, `${SPEC} ul.tests`);
      expect(testLists.map((node) => node.role)).toEqual(withTests.map(() => 'list'));
      const testItems = await axNodes(page, `${SPEC} ul.tests > li`);
      expect(testItems.length).toBe(withTests.reduce((sum, requirement) => sum + requirement.tests.length, 0));
      expect(new Set(testItems.map((node) => node.role))).toEqual(new Set(['listitem']));
    });

    test(`${shell}: with What's this? open, its heading is a level 2 heading after the bar, and no level is skipped`, async () => {
      const page = await openShell(SHELL_PAGE[shell]);
      await showSpecs(page, 'cv', shell);
      const button = page.locator(`${SPEC} button.whats-this`);
      if (shell === 'desktop') await button.click();
      else await button.tap();
      await settle(page);
      const outline = await headingsIn(page, SPEC);
      expect(outline[0]).toEqual({ level: 2, name: text.whatsThis.heading });
      expect(outline[1]).toEqual({ level: 1, name: 'Specs for CV' });
      const [panel] = await axNodes(page, `${SPEC} .whats-this-panel`);
      expect(panel).toMatchObject({ role: 'region', name: text.whatsThis.heading });
      expect(outline.filter((heading) => heading.level === 1)).toHaveLength(1);
      expect(outline.every((heading) => heading.level <= 2)).toBe(true);
      expectNoSkippedLevel(outline.slice(1), `${shell} view`);
    });
  }
});
