// The spec view (FR-002, FR-006, contracts/inspector.md The titles and The
// spec view): "Show specs" swaps only the content, the titles say so, and
// the view lists exactly what its app carries, grouped by spec.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { resume } from '@cv/content';
import { parseSpec, requirementsOf } from '../../../../tools/traceability/src/specs.ts';
import { counted, fill, siteText } from '../../src/site-text.ts';
import { axNodes } from '../helpers/ax.ts';
import { copyBuild, openView, readView, requirementData, scrollerSelector, showSpecs, specViewSelector, viewSelector } from '../helpers/inspector.ts';
import type { InspectorShell, InspectorView } from '../helpers/inspector.ts';
import { box, openShell, settle } from '../helpers/shell.ts';
import type { Box } from '../helpers/shell.ts';
import type { RequirementData } from '../../scripts/requirements/index.ts';
import { SHELL_PAGE } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 300_000 });

const VIEWS: readonly InspectorView[] = ['cv', 'terminal', 'about'];
const SHELLS: readonly InspectorShell[] = ['desktop', 'mobile'];
const text = siteText.inspector;
const NAME = resume.basics!.name!;
const DATA_FILE = /\/assets\/requirements-[0-9a-f]{8}\.json$/;

// The data's key for a view: About this site lists the shell's.
const dataKey = (view: InspectorView) => (view === 'about' ? 'shell' : view);

// What "Show specs" mustn't change on the desktop: every window's box and
// stacking, and the view's title bar controls.
async function desktopFrame(page: Page, view: InspectorView) {
  await settle(page);
  return page.evaluate((selector) => {
    const rect = (element: Element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    };
    return {
      windows: [...document.querySelectorAll<HTMLElement>('#os .desktop-area > .window:not([hidden])')].map((window) => ({
        view: window.getAttribute('data-view'),
        box: rect(window),
        z: getComputedStyle(window).zIndex,
      })),
      controls: [...document.querySelectorAll(`${selector} .title-bar .controls button`)].map((control) => ({ name: control.getAttribute('aria-label'), box: rect(control) })),
    };
  }, viewSelector(view, 'desktop'));
}

// Full screen: the view's box, its header and Home.
async function mobileFrame(page: Page, view: InspectorView) {
  const selector = viewSelector(view, 'mobile');
  return {
    view: await box(page, selector),
    header: await box(page, `${selector} .app-header`),
    home: await box(page, `${selector} .home-button`),
    homeName: await page.locator(`${selector} .home-button`).innerText(),
  };
}

describe('007-requirement-inspector-FR-002: "Show specs" swaps the content and nothing else', () => {
  test('desktop: every window\'s box and stacking, and the CV\'s title bar controls, are equal before and after', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    // Another window behind the CV, so stacking has something to keep.
    await openView(page, 'about', 'desktop');
    await page.locator('#os .dock-item[data-app="cv"]').click();
    await settle(page);
    const before = await desktopFrame(page, 'cv');
    expect(before.windows).toHaveLength(2);
    await showSpecs(page, 'cv', 'desktop');
    expect(await desktopFrame(page, 'cv')).toEqual(before);
  });

  test('mobile: the full-screen view, its header and Home are equal before and after', async () => {
    const page = await openShell(SHELL_PAGE.mobile);
    await openView(page, 'cv', 'mobile');
    const before = await mobileFrame(page, 'cv');
    await showSpecs(page, 'cv', 'mobile');
    expect(await mobileFrame(page, 'cv')).toEqual(before);
  });

  test('desktop: a screenshot with the CV window masked is the same before and after', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    const shot = async () => {
      await settle(page);
      return page.screenshot({ mask: [page.locator(viewSelector('cv', 'desktop'))], animations: 'disabled', caret: 'hide' });
    };
    const before = await shot();
    await showSpecs(page, 'cv', 'desktop');
    const after = await shot();
    expect(after.equals(before)).toBe(true);
  });
});

describe('007-requirement-inspector-FR-002: the titles say the specs are shown', () => {
  test('desktop: the window title reads CV · Specs, and the page title CV · Specs – the site name', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await showSpecs(page, 'cv', 'desktop');
    const title = fill(text.windowTitle, { view: 'CV' });
    expect((await page.locator(`${viewSelector('cv', 'desktop')} .window-title`).innerText()).replace(/\s+/g, ' ').trim()).toBe(title);
    await expect.poll(() => page.title()).toBe(`${title}${siteText.os.titleSeparator}${NAME}`);
  });

  test('mobile: the header reads CV with Specs below, named CV · Specs, and the page title CV · Specs – the site name', async () => {
    const page = await openShell(SHELL_PAGE.mobile);
    await showSpecs(page, 'cv', 'mobile');
    const heading = `${viewSelector('cv', 'mobile')} .app-title`;
    const suffix = page.locator(`${heading} span.title-suffix`);
    expect(await suffix.count()).toBe(1);
    expect((await suffix.textContent())?.trim()).toBe(text.headerSuffix);
    // The name as shown (text with a visible box, outside the suffix), then
    // the suffix on a line below it.
    const lines = await page.locator(heading).evaluate((title) => {
      const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
      const shown: { text: string; bottom: number }[] = [];
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        if (node.parentElement?.closest('.title-suffix') != null || (node.textContent ?? '').trim() === '') continue;
        // Inside a visually hidden element: a box of a pixel or less.
        let hidden = false;
        for (let element = node.parentElement; element !== null && element !== title; element = element.parentElement) {
          const own = element.getBoundingClientRect();
          if (own.width <= 1 || own.height <= 1) hidden = true;
        }
        if (hidden) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const rect = range.getBoundingClientRect();
        if (rect.width > 1 && rect.height > 1) shown.push({ text: (node.textContent ?? '').trim(), bottom: rect.bottom });
      }
      const suffixBox = title.querySelector('.title-suffix')!.getBoundingClientRect();
      return { name: shown.map((part) => part.text).join(' '), nameBottom: Math.max(...shown.map((part) => part.bottom)), suffixTop: suffixBox.top };
    });
    expect(lines.name).toBe('CV');
    expect(lines.suffixTop).toBeGreaterThanOrEqual(lines.nameBottom - 1);
    // The title names the full-screen view (aria-labelledby): its name is the view's.
    const [node] = await axNodes(page, viewSelector('cv', 'mobile'));
    expect(node?.name).toBe(fill(text.windowTitle, { view: 'CV' }));
    await expect.poll(() => page.title()).toBe(`${fill(text.windowTitle, { view: 'CV' })}${siteText.os.titleSeparator}${NAME}`);
  });
});

// The spec groups a view should show, from the built data: the spec of each
// requirement it lists, in number order, each with its own IDs.
function expectedGroups(data: RequirementData, view: InspectorView) {
  const listed = data.views[dataKey(view)] ?? [];
  return data.specs
    .map((spec) => ({ spec, ids: listed.filter((id) => data.requirements[id]?.feature === spec.feature) }))
    .filter((group) => group.ids.length > 0);
}

const notShownText = (n: number) => (n === 0 ? null : fill(counted(text.notShown, n), { n }));

// Each group's visible status and link text, which `readView` leaves out.
const groupLabels = (page: Page, view: InspectorView) =>
  page.evaluate(
    (selector) =>
      [...document.querySelectorAll(`${selector} section.spec-group`)].map((group) => ({
        status: (group.querySelector('.status')?.textContent ?? '').replace(/^[\s,]+/, '').trim(),
        openSpec: (group.querySelector('a.open-spec')?.textContent ?? '').trim(),
        heading: group.querySelector('h2')?.contains(group.querySelector('.spec-number')) === true,
      })),
    specViewSelector(view),
  );

describe('007-requirement-inspector-FR-006: a view lists exactly what its app carries, grouped by spec (SC-003)', () => {
  for (const shell of SHELLS) {
    test(`${shell}: the CV, Terminal and About views list the built data's views, in number then ID order, each once`, async () => {
      const data = requirementData();
      const page = await openShell(SHELL_PAGE[shell]);
      for (const view of VIEWS) {
        await showSpecs(page, view, shell);
        const groups = await readView(page, view);
        const ids = groups.flatMap((group) => group.requirements.map((requirement) => requirement.fullId));
        expect(ids, `${shell} ${view}`).toEqual(data.views[dataKey(view)]);
        expect(new Set(ids).size, `${shell} ${view}: each once`).toBe(ids.length);
        const numbers = groups.map((group) => group.number);
        expect(numbers, `${shell} ${view}: number order`).toEqual([...numbers].sort());
        expect(new Set(numbers).size, `${shell} ${view}: one group per spec`).toBe(numbers.length);
        for (const group of groups) {
          const own = group.requirements.map((requirement) => requirement.fullId);
          expect(own, `${shell} ${view} ${group.feature}: ID order`).toEqual([...own].sort());
          expect(own.every((id) => id.startsWith(`${group.feature}-`)), `${shell} ${view} ${group.feature}: its own spec's`).toBe(true);
        }
      }
    });
  }

  test('each group shows its number, title, status, the count of requirements it leaves out, and Open the spec', async () => {
    const data = requirementData();
    const page = await openShell(SHELL_PAGE.desktop);
    for (const view of VIEWS) {
      await showSpecs(page, view, 'desktop');
      const groups = await readView(page, view);
      const labels = await groupLabels(page, view);
      const expected = expectedGroups(data, view);
      expect(groups.map((group) => group.feature), view).toEqual(expected.map((group) => group.spec.feature));
      groups.forEach((group, index) => {
        const { spec, ids } = expected[index]!;
        const where = `${view} ${spec.feature}`;
        expect(group.number, where).toBe(spec.number);
        expect(group.title, where).toBe(spec.title);
        expect(group.status, where).toBe(spec.status.toLowerCase());
        expect(labels[index]!.status, where).toBe(spec.status === 'Approved' ? text.approved : text.draft);
        expect(labels[index]!.heading, `${where}: the number is in the heading`).toBe(true);
        expect(group.notShown, where).toBe(notShownText(spec.active - ids.length));
        expect(labels[index]!.openSpec, where).toBe(text.openSpec);
        expect(group.openSpec, where).not.toBeNull();
      });
    }
  });

  test('a group whose spec is all listed shows no count (a build where the CV carries every requirement of 004)', async () => {
    const feature = '004-cv-page';
    const specFile = `specs/${feature}/spec.md`;
    // Every active requirement of the spec, added to an element of the CV app.
    const { server, site } = await copyBuild((root) => {
      const spec = parseSpec(feature, specFile, fs.readFileSync(path.join(root, specFile), 'utf8'));
      const all = requirementsOf(spec)
        .filter((requirement) => requirement.state === 'active')
        .map((requirement) => requirement.fullId);
      const file = path.join(root, 'packages/web/src/cv/CvDocument.tsx');
      const source = fs.readFileSync(file, 'utf8');
      const at = source.indexOf(`data-req="${feature}-`);
      if (at < 0) throw new Error('CvDocument.tsx carries no 004 requirement to add to');
      const start = at + 'data-req="'.length;
      fs.writeFileSync(file, `${source.slice(0, start)}${all.join(' ')} ${source.slice(start)}`);
    });
    const data = requirementData(site);
    const spec = data.specs.find((record) => record.feature === feature)!;
    expect(data.views.cv!.filter((id) => id.startsWith(`${feature}-`))).toHaveLength(spec.active);

    const page = await openShell({ ...SHELL_PAGE.desktop, url: server.url });
    await showSpecs(page, 'cv', 'desktop');
    const groups = await readView(page, 'cv');
    const group = groups.find((candidate) => candidate.feature === feature)!;
    expect(group.requirements).toHaveLength(spec.active);
    expect(group.notShown).toBeNull();
    expect(group.openSpec).not.toBeNull();
    // Other groups still count what they leave out.
    for (const other of groups.filter((candidate) => candidate.feature !== feature)) {
      const record = data.specs.find((candidate) => candidate.feature === other.feature)!;
      expect(other.notShown, other.feature).toBe(notShownText(record.active - other.requirements.length));
    }
  });

  test('the real build lists only part of 004 in the CV view, so its group shows a count', () => {
    const data = requirementData();
    const spec = data.specs.find((record) => record.feature === '004-cv-page')!;
    const listed = data.views.cv!.filter((id) => id.startsWith('004-cv-page-')).length;
    expect(listed).toBeGreaterThan(0);
    expect(spec.active - listed).toBeGreaterThan(0);
  });
});

describe('007-requirement-inspector-FR-006: the spec view starts at the top', () => {
  for (const shell of SHELLS) {
    test(`${shell}: shown after the CV is scrolled, and shown again after its own view was scrolled, it is at the top`, async () => {
      const page = await openShell(SHELL_PAGE[shell]);
      await openView(page, 'cv', shell);
      const scroller = page.locator(scrollerSelector('cv', shell));
      await scroller.evaluate((element) => element.scrollTo(0, 1200));
      await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBe(1200);
      await showSpecs(page, 'cv', shell);
      expect(await scroller.evaluate((element) => element.scrollTop)).toBe(0);
      const heading = (await box(page, `${specViewSelector('cv')} h1.spec-heading`)) as Box;
      const view = (await box(page, scrollerSelector('cv', shell))) as Box;
      expect(heading.y).toBeGreaterThanOrEqual(view.y);
      expect(heading.y + heading.height).toBeLessThanOrEqual(view.y + view.height);

      await scroller.evaluate((element) => element.scrollTo(0, 600));
      await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      const back = page.locator(`${specViewSelector('cv')} button.spec-back`);
      if (shell === 'desktop') await back.click();
      else await back.tap();
      await page.waitForSelector(specViewSelector('cv'), { state: 'detached' });
      await showSpecs(page, 'cv', shell);
      expect(await scroller.evaluate((element) => element.scrollTop)).toBe(0);
    });
  }
});

describe('007-requirement-inspector-FR-006: while the data loads, the bar, heading and lede show', () => {
  test('with the data file held, Show specs shows Back, What\'s this?, the heading and the lede, then the groups once it arrives', async () => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    const page = await openShell({
      ...SHELL_PAGE.desktop,
      beforeGoto: async (target) => {
        await target.route(DATA_FILE, async (route) => {
          await held;
          await route.continue().catch(() => undefined);
        });
      },
    });
    try {
      await page.locator(`${viewSelector('cv', 'desktop')} button.show-specs`).click();
      await page.waitForSelector(specViewSelector('cv'), { state: 'visible' });
      await settle(page);
      const view = specViewSelector('cv');
      expect(await page.locator(`${view} .spec-bar`).isVisible()).toBe(true);
      expect((await page.locator(`${view} button.spec-back`).innerText()).trim()).toBe(fill(text.back, { view: 'CV' }));
      expect((await page.locator(`${view} button.whats-this`).innerText()).trim()).toBe(text.whatsThis.button);
      expect((await page.locator(`${view} h1.spec-heading`).innerText()).trim()).toBe(fill(text.heading, { view: 'CV' }));
      expect((await page.locator(`${view} p.spec-lede`).innerText()).replace(/\s+/g, ' ').trim()).toBe(fill(text.ledeApp, { view: 'CV' }));
      expect(await page.locator(`${view} section.spec-group`).count()).toBe(0);
    } finally {
      release();
    }
    await page.waitForSelector(`${specViewSelector('cv')} section.spec-group`, { state: 'attached' });
    expect(await page.locator(`${specViewSelector('cv')} section.spec-group`).count()).toBeGreaterThan(0);
  });
});
