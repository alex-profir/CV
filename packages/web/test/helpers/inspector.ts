// The inspector test helper (007 plan, Dependencies: inspector test helper),
// on 005's shell helper and 006's Terminal helper: it shows and leaves a
// view's specs as a visitor does, and reads a spec view. Every inspector
// browser test uses it.
import fs from 'node:fs';
import path from 'node:path';
import { onTestFinished } from 'vitest';
import type { Page } from 'playwright';
import { startServer } from '../../../../tools/site-check/src/server.ts';
import type { RunningServer } from '../../../../tools/site-check/src/server.ts';
import type { RequirementData } from '../../scripts/requirements/index.ts';
import { buildCopy, commitAll, dirty, repoCopy } from './copy.ts';
import { builtSite } from './site.ts';
import type { BuiltSite } from './site.ts';
import { settle } from './shell.ts';

export type InspectorShell = 'desktop' | 'mobile';
export type InspectorView = 'cv' | 'terminal' | 'about';

// The view's window or full-screen view.
export const viewSelector = (view: InspectorView, shell: InspectorShell) =>
  shell === 'desktop' ? `#os .desktop .window[data-view="${view}"]` : `#os .full-screen[data-view="${view}"]`;

// The view's spec view, once its groups are in.
export const specViewSelector = (view: InspectorView) => `#os section.spec-view[data-view="${view}"]`;

// Opens the view as a visitor does, if it isn't shown: from the dock or the
// site menu on the desktop, or the home screen on a phone.
export async function openView(page: Page, view: InspectorView, shell: InspectorShell): Promise<void> {
  if ((await page.locator(viewSelector(view, shell)).count()) > 0 && (await page.locator(viewSelector(view, shell)).isVisible())) return;
  if (shell === 'desktop') {
    if (view === 'about') {
      await page.click('#menu-title-site');
      await page.getByRole('menuitem', { name: 'About this site' }).click();
    } else {
      await page.locator(`#os .dock-item[data-app="${view}"]`).click();
    }
  } else {
    if ((await page.locator('#os .full-screen').count()) > 0) await page.locator('#os .full-screen .home-button').tap();
    await page.locator(view === 'about' ? '#os .home .about' : `#os .home .app-icon[data-view="${view}"]`).tap();
  }
  await page.waitForSelector(viewSelector(view, shell), { state: 'visible' });
  await settle(page);
}

// Shows a view's specs by its "Show specs" control, opening the view first
// if needed, and waits for the spec view with its groups.
export async function showSpecs(page: Page, view: InspectorView, shell: InspectorShell): Promise<void> {
  await openView(page, view, shell);
  const control = page.locator(`${viewSelector(view, shell)} button.show-specs`);
  if (shell === 'desktop') await control.click();
  else await control.tap();
  await waitForSpecView(page, view);
}

export async function waitForSpecView(page: Page, view: InspectorView): Promise<void> {
  await page.waitForSelector(`${specViewSelector(view)} section.spec-group`, { state: 'attached' });
  await settle(page);
}

// Goes back to the app by the view's `Back to [view]`.
export async function leaveSpecs(page: Page, view: InspectorView, shell: InspectorShell = 'desktop'): Promise<void> {
  const back = page.locator(`${specViewSelector(view)} button.spec-back`);
  if (shell === 'desktop') await back.click();
  else await back.tap();
  await page.waitForSelector(specViewSelector(view), { state: 'detached' });
  await settle(page);
}

export type ReadTest = { name: string; place: string; href: string | null };

export type ReadRequirement = {
  fullId: string;
  shortId: string;
  text: string;
  specLine: string | null;
  tests: ReadTest[];
};

export type ReadGroup = {
  feature: string;
  number: string;
  title: string;
  status: string;
  notShown: string | null;
  openSpec: string | null;
  requirements: ReadRequirement[];
};

// A spec view as the page shows it: each group, and each requirement with
// its text, spec link and tests.
export function readView(page: Page, view: InspectorView): Promise<ReadGroup[]> {
  return page.evaluate((selector) => {
    const text = (element: Element | null) => (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const href = (element: Element | null) => element?.getAttribute('href') ?? null;
    return [...document.querySelectorAll(`${selector} section.spec-group`)].map((group) => ({
      feature: group.getAttribute('data-feature') ?? '',
      number: text(group.querySelector('.spec-number')),
      title: text(group.querySelector('.spec-title')),
      status: group.querySelector('.status')?.getAttribute('data-status') ?? '',
      notShown: group.querySelector('.not-shown') === null ? null : text(group.querySelector('.not-shown')),
      openSpec: href(group.querySelector('a.open-spec')),
      requirements: [...group.querySelectorAll('li.requirement')].map((item) => ({
        fullId: item.getAttribute('data-id') ?? '',
        shortId: text(item.querySelector('.short-id')),
        text: text(item.querySelector('.requirement-text')),
        specLine: href(item.querySelector('a.spec-line')),
        tests: [...item.querySelectorAll('ul.tests > li')].map((test) => ({
          name: text(test.querySelector('.test-name')),
          place: text(test.querySelector('.test-place')),
          href: href(test.querySelector('a.test-name')),
        })),
      })),
    }));
  }, specViewSelector(view));
}

// The data file a build wrote, parsed.
export function requirementData(site: BuiltSite = builtSite()): RequirementData {
  const assets = path.join(site.dir, 'assets');
  const file = fs.readdirSync(assets).find((name) => /^requirements-[0-9a-f]{8}\.json$/.test(name));
  if (file === undefined) throw new Error('the build wrote no requirement data');
  return JSON.parse(fs.readFileSync(path.join(assets, file), 'utf8'));
}

// The text a view's requirement shows: its inline nodes' text, in order.
export function inlineText(nodes: RequirementData['requirements'][string]['text']): string {
  return nodes
    .map((node) => ('children' in node ? inlineText(node.children) : node.text))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

export type CopyBuildServer = { server: RunningServer; site: BuiltSite; root: string };

// A copy of the repository with `edit` applied, committed unless `dirty` is
// asked (then left with an untracked file too), built and served for the
// current test.
export async function copyBuild(edit: (root: string) => void, { dirty: leaveDirty = false }: { dirty?: boolean } = {}): Promise<CopyBuildServer> {
  const root = repoCopy();
  edit(root);
  if (leaveDirty) dirty(root);
  else commitAll(root, 'A fixture change');
  const build = buildCopy(root);
  if (build.site === null) throw new Error(`the fixture build failed:\n${build.stderr}`);
  const server = await startServer({ siteDir: build.site.dir, manifest: build.site.manifest });
  onTestFinished(() => server.close());
  return { server, site: build.site, root };
}
