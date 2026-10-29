// The spec view's links into the repository (FR-010, contracts/inspector.md
// The spec view, research R8): each names the commit the site was built
// from, the right file and the right line; a build with uncommitted changes
// says its links lead to the last commit; a site with no repository shows
// the link texts with no links.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { siteData } from '@cv/content';
import { fill, siteText } from '../../src/site-text.ts';
import { copyBuild, requirementData, showSpecs, specViewSelector } from '../helpers/inspector.ts';
import type { InspectorView } from '../helpers/inspector.ts';
import { openShell } from '../helpers/shell.ts';
import { SHELL_PAGE } from '../helpers/terminal.ts';
import type { Inline, RequirementData } from '../../scripts/requirements/index.ts';

vi.setConfig({ testTimeout: 300_000 });

const VIEWS: readonly InspectorView[] = ['cv', 'terminal', 'about'];
const text = siteText.inspector;
const REPOSITORY = siteData.repository!.replace(/\/+$/, '');
const LINKS = 'a.spec-line, a.open-spec, a.test-name, a.build-commit, .requirement-text a';

type ReadLink = { kind: string; owner: string | null; feature: string | null; text: string; href: string | null; target: string | null };

// Every link in a view, with the requirement and group it's in.
const readLinks = (page: Page, view: InspectorView) =>
  page.evaluate(
    ([selector, links]) =>
      [...document.querySelectorAll(`${selector} :is(${links})`)].map(
        (link): ReadLink => ({
          kind: ['spec-line', 'open-spec', 'test-name', 'build-commit'].find((name) => link.classList.contains(name)) ?? 'text',
          owner: link.closest('li.requirement')?.getAttribute('data-id') ?? null,
          feature: link.closest('section.spec-group')?.getAttribute('data-feature') ?? null,
          text: (link.textContent ?? '').replace(/\s+/g, ' ').trim(),
          href: link.getAttribute('href'),
          target: link.getAttribute('target'),
        }),
      ),
    [specViewSelector(view), LINKS] as const,
  );

const blob = (commit: string, file: string) => `${REPOSITORY}/blob/${commit}/${file}`;
const atLine = (commit: string, file: string, line: number) => `${blob(commit, file)}${file.endsWith('.md') ? '?plain=1' : ''}#L${line}`;

// The address each in-text link should have, in order.
function textHrefs(data: RequirementData, nodes: readonly Inline[]): string[] {
  const { commit } = data.version;
  return nodes.flatMap((node): string[] => {
    switch (node.kind) {
      case 'link':
        return [node.href, ...textHrefs(data, node.children)];
      case 'file':
        return [blob(commit, node.path), ...textHrefs(data, node.children)];
      case 'ref':
        return [atLine(commit, `specs/${node.feature}/spec.md`, node.line)];
      case 'strong':
      case 'em':
      case 's':
        return textHrefs(data, node.children);
      default:
        return [];
    }
  });
}

function expectLinksAsData(data: RequirementData, view: InspectorView, links: ReadLink[]) {
  const { commit } = data.version;
  expect(links.length, view).toBeGreaterThan(0);
  for (const link of links) expect(link.target, `${view} ${link.kind} ${link.text}: no target`).toBeNull();

  const build = links.filter((link) => link.kind === 'build-commit');
  expect(build, `${view}: one build commit link`).toHaveLength(1);
  expect(build[0]!.text, view).toBe(commit.slice(0, 7));
  expect(build[0]!.href, view).toBe(`${REPOSITORY}/commit/${commit}`);

  const specs = new Map(data.specs.map((spec) => [spec.feature, spec]));
  for (const link of links.filter((candidate) => candidate.kind === 'open-spec')) {
    expect(link.href, `${view} ${link.feature}`).toBe(blob(commit, specs.get(link.feature!)!.file));
  }

  const owners = [...new Set(links.map((link) => link.owner).filter((owner) => owner !== null))];
  for (const id of owners) {
    const record = data.requirements[id]!;
    const own = links.filter((link) => link.owner === id);
    const file = specs.get(record.feature)!.file;
    expect(own.filter((link) => link.kind === 'spec-line').map((link) => link.href), id).toEqual([atLine(commit, file, record.line)]);
    expect(own.filter((link) => link.kind === 'test-name').map((link) => link.href), id).toEqual(record.tests.map((test) => atLine(commit, test.file, test.line)));
    expect(own.filter((link) => link.kind === 'text').map((link) => link.href), id).toEqual(textHrefs(data, record.text));
  }
}

describe('007-requirement-inspector-FR-010: every link leads to the built commit, the right file and the right line', () => {
  test('desktop: the CV, Terminal and About views\' links are the built data\'s, with no target', async () => {
    const data = requirementData();
    const page = await openShell(SHELL_PAGE.desktop);
    for (const view of VIEWS) {
      await showSpecs(page, view, 'desktop');
      const links = await readLinks(page, view);
      expectLinksAsData(data, view, links);
      // Every listed requirement has its spec line link.
      expect(links.filter((link) => link.kind === 'spec-line')).toHaveLength(data.views[view === 'about' ? 'shell' : view]!.length);
    }
  });

  test('mobile: the CV view\'s links are the built data\'s', async () => {
    const data = requirementData();
    const page = await openShell(SHELL_PAGE.mobile);
    await showSpecs(page, 'cv', 'mobile');
    expectLinksAsData(data, 'cv', await readLinks(page, 'cv'));
  });

  test('a clean build shows no note about uncommitted changes', async () => {
    // A committed copy: the working copy itself may have changes.
    const { server, site } = await copyBuild(() => undefined);
    expect(requirementData(site).version.dirty).toBe(false);
    const page = await openShell({ ...SHELL_PAGE.desktop, url: server.url });
    await showSpecs(page, 'cv', 'desktop');
    expect(await page.locator(`${specViewSelector('cv')} p.note-uncommitted`).count()).toBe(0);
  });

  test('a build with uncommitted changes says its links lead to the last commit, before any offline note', async () => {
    const { server, site } = await copyBuild(() => undefined, { dirty: true });
    const data = requirementData(site);
    expect(data.version.dirty).toBe(true);
    const page = await openShell({ ...SHELL_PAGE.desktop, url: server.url });
    await showSpecs(page, 'cv', 'desktop');
    const view = specViewSelector('cv');
    const note = page.locator(`${view} p.note-uncommitted`);
    expect(await note.count()).toBe(1);
    expect((await note.innerText()).replace(/\s+/g, ' ').trim()).toBe(fill(text.uncommitted, { commit: data.version.commit.slice(0, 7) }));
    expect(await note.getAttribute('aria-live')).toBeNull();
    expect(await note.getAttribute('role')).toBeNull();
    expectLinksAsData(data, 'cv', await readLinks(page, 'cv'));

    await page.context().setOffline(true);
    await page.waitForSelector(`${view} p.note-offline`);
    const order = await page.evaluate((selector) => [...document.querySelectorAll(`${selector} p.spec-note`)].map((element) => element.classList.contains('note-uncommitted') ? 'uncommitted' : 'offline'), view);
    expect(order).toEqual(['uncommitted', 'offline']);
    await page.context().setOffline(false);
  });

  test('a site with no repository shows the link texts with no links', async () => {
    const { server, site } = await copyBuild((root) => {
      const file = path.join(root, 'packages/content/site.json');
      const json = JSON.parse(fs.readFileSync(file, 'utf8'));
      delete json.repository;
      fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
    });
    const data = requirementData(site);
    const page = await openShell({ ...SHELL_PAGE.desktop, url: server.url });
    await showSpecs(page, 'cv', 'desktop');
    const view = specViewSelector('cv');
    expect(await page.locator(`${view} :is(${LINKS})`).count()).toBe(0);
    expect(await page.locator(`${view} section.spec-group a`).count()).toBe(0);
    expect((await page.locator(`${view} .build-commit`).innerText()).trim()).toBe(data.version.commit.slice(0, 7));
    expect(await page.locator(`${view} .open-spec`).first().innerText()).toContain(text.openSpec);
    const first = data.requirements[data.views.cv![0]!]!;
    expect((await page.locator(`${view} .spec-line`).first().innerText()).trim()).toContain(fill(text.inTheSpec, { line: first.line }));
  });
});
