// The inspector in forced colors (FR-023, contracts/inspector.md Motion and
// modes): its controls, chips and notes keep a visible border, solid or
// dashed, in a system color; dots stay filled or hollow; links stay
// underlined; and nothing shows by a background alone.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { forcedColorsProblems } from '../../../../tools/site-check/src/parts/modes.ts';
import { copyBuild, openView, showSpecs, specViewSelector, viewSelector } from '../helpers/inspector.ts';
import { openShell, settle } from '../helpers/shell.ts';
import { SHELL_PAGE } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 300_000 });

const SPEC = specViewSelector('about');
const FEATURE = '007-requirement-inspector';
const TRANSPARENT = /^(transparent|rgba\(.*,\s*0\))$/;

// A system color as the browser computes it.
const systemColor = (page: Page, color: string) =>
  page.evaluate((value) => {
    const probe = document.createElement('div');
    probe.style.color = value;
    document.body.append(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();
    return computed;
  }, color);

type Drawn = { what: string; style: string; width: number; borderColor: string; color: string; background: string; underline: boolean };

const drawn = (page: Page, selector: string, pseudo: '' | '::before' = '') =>
  page.locator(selector).evaluateAll(
    (list, part) =>
      list
        .filter((element) => element.getClientRects().length > 0)
        .map((element): Drawn => {
          const style = getComputedStyle(element, part || null);
          return {
            what: `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}${part}`,
            style: style.borderTopStyle,
            width: Number.parseFloat(style.borderTopWidth),
            borderColor: style.borderTopColor,
            color: style.color,
            background: style.backgroundColor,
            underline: style.textDecorationLine.includes('underline'),
          };
        }),
    pseudo,
  );

async function expectBordered(page: Page, selector: string, styles: string[], colors: string[], pseudo: '' | '::before' = ''): Promise<void> {
  const list = await drawn(page, selector, pseudo);
  expect(list.length, selector).toBeGreaterThan(0);
  for (const each of list) {
    expect(styles, `${each.what}: border style`).toContain(each.style);
    expect(each.width, `${each.what}: border width`).toBeGreaterThan(0);
    expect(colors, `${each.what}: border color`).toContain(each.borderColor);
  }
}

// A dirty build whose 007 spec is a draft: both chips' shapes and the note
// about uncommitted changes show in About this site's view.
async function forcedPage(shell: 'desktop' | 'mobile'): Promise<Page> {
  const { server } = await copyBuild(
    (root) => {
      const file = path.join(root, `specs/${FEATURE}/spec.md`);
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('**Status**: Approved', '**Status**: Draft'));
    },
    { dirty: true },
  );
  return openShell({ ...SHELL_PAGE[shell], url: server.url, forcedColors: 'active' });
}

describe('007-requirement-inspector-FR-023: in forced colors every part of the inspector shows', () => {
  test('desktop: Show specs, Back, What\'s this?, both chips, both notes and every link, in system colors, and nothing by a background alone', async () => {
    const page = await forcedPage('desktop');
    const [canvasText, buttonText, linkText, canvas] = await Promise.all(['CanvasText', 'ButtonText', 'LinkText', 'Canvas'].map((color) => systemColor(page, color)));
    await openView(page, 'about', 'desktop');
    await expectBordered(page, `${viewSelector('about', 'desktop')} button.show-specs`, ['solid'], [buttonText!]);
    await showSpecs(page, 'about', 'desktop');
    await page.locator(`${SPEC} button.whats-this`).click();
    await page.context().setOffline(true);
    await page.waitForSelector(`${SPEC} p.note-offline`);
    await settle(page);

    await expectBordered(page, `${SPEC} :is(button.spec-back, button.whats-this)`, ['solid'], [buttonText!]);
    await expectBordered(page, `${SPEC} .status[data-status="approved"]`, ['solid'], [canvasText!]);
    await expectBordered(page, `${SPEC} .status[data-status="draft"]`, ['dashed'], [canvasText!]);
    // Dots: filled when approved, hollow when a draft, each outlined.
    await expectBordered(page, `${SPEC} .status`, ['solid'], [canvasText!], '::before');
    for (const dot of await drawn(page, `${SPEC} .status[data-status="approved"]`, '::before')) expect(dot.background, dot.what).toBe(canvasText);
    for (const dot of await drawn(page, `${SPEC} .status[data-status="draft"]`, '::before')) expect(dot.background, dot.what).toMatch(TRANSPARENT);
    await expectBordered(page, `${SPEC} p.spec-note`, ['dashed', 'solid'], [canvasText!]);
    expect(await page.locator(`${SPEC} p.spec-note`).count()).toBe(2);
    await expectBordered(page, `${SPEC} .whats-this-panel`, ['solid'], [canvasText!]);

    // Text in system colors: headings and notes in CanvasText, links in
    // LinkText and underlined.
    for (const heading of await drawn(page, `${SPEC} :is(h1, h2)`)) expect([canvasText, linkText], heading.what).toContain(heading.color);
    for (const link of await drawn(page, `${SPEC} a`)) {
      expect(link.underline, link.what).toBe(true);
      expect(link.color, link.what).toBe(linkText);
    }
    // No part of the view keeps a background other than the page's.
    const backgrounds = await drawn(page, `${SPEC}, ${SPEC} *`);
    for (const each of backgrounds) expect(TRANSPARENT.test(each.background) || each.background === canvas, `${each.what}: background ${each.background}`).toBe(true);

    expect(await forcedColorsProblems(page, '/')).toEqual([]);
    await page.context().setOffline(false);
  });

  test('mobile: Specs keeps its outline, and the view has no forced colors problem', async () => {
    const page = await forcedPage('mobile');
    const buttonText = await systemColor(page, 'ButtonText');
    await openView(page, 'cv', 'mobile');
    await expectBordered(page, `${viewSelector('cv', 'mobile')} button.show-specs`, ['solid'], [buttonText], '::before');
    await showSpecs(page, 'cv', 'mobile');
    await expectBordered(page, `${specViewSelector('cv')} :is(button.spec-back, button.whats-this)`, ['solid'], [buttonText]);
    expect(await forcedColorsProblems(page, '/')).toEqual([]);
  });
});
