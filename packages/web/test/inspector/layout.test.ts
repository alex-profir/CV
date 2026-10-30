// The spec view at every width (FR-020, contracts/inspector.md Layout and
// scrolling): no horizontal scroll and every long ID, name, path and link
// wrapped in its column; two columns from 480 px of content, stacked below;
// the padding the design sets for the scroller's width; and the view
// scrolling inside its window under its sticky bar.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { horizontalScroll, narrowWindow } from '../../../../tools/site-check/src/parts/layout.ts';
import { copyBuild, openView, scrollerSelector, showSpecs, specViewSelector, viewSelector } from '../helpers/inspector.ts';
import type { InspectorShell, InspectorView } from '../helpers/inspector.ts';
import { openShell, settle } from '../helpers/shell.ts';
import type { ShellOptions } from '../helpers/shell.ts';
import { SHELL_PAGE } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 300_000 });

const FEATURE = '007-requirement-inspector';
const ADDED_FULL = `${FEATURE}-FR-035`;
const LONG_WORD = 'Longword'.repeat(15);
const LONG_TEST = `packages/web/test/${'a-very-long-folder-name-for-the-layout-fixture/'.repeat(2)}with-a-long-file-name-that-keeps-going.test.ts`;

type Variant = { name: string; shell: InspectorShell; options: ShellOptions; narrow?: boolean };

const VARIANTS: readonly Variant[] = [
  { name: '1440 × 900', shell: 'desktop', options: SHELL_PAGE.desktop },
  { name: 'a 400 px window at 1440 × 900', shell: 'desktop', options: SHELL_PAGE.desktop, narrow: true },
  { name: '320 × 568', shell: 'mobile', options: { ...SHELL_PAGE.mobile, width: 320, height: 568 } },
  { name: '812 × 375', shell: 'mobile', options: { ...SHELL_PAGE.mobile, width: 812, height: 375 } },
];

// A build whose 007 spec has a requirement with a 120-character word, carried
// by "Show specs", so About this site lists it, and covered by a test at a
// long path.
async function longBuild() {
  return copyBuild((root) => {
    const file = path.join(root, `specs/${FEATURE}/spec.md`);
    const spec = fs.readFileSync(file, 'utf8');
    const at = spec.indexOf('\n### Key Entities');
    fs.writeFileSync(file, `${spec.slice(0, at)}- **FR-035**: The view MUST wrap ${LONG_WORD} in its column.\n${spec.slice(at)}`);
    const control = path.join(root, 'packages/web/src/inspector/ShowSpecs.tsx');
    const source = fs.readFileSync(control, 'utf8');
    fs.writeFileSync(control, source.replace(`data-req="${FEATURE}-FR-001 `, `data-req="${ADDED_FULL} ${FEATURE}-FR-001 `));
    const test = path.join(root, LONG_TEST);
    fs.mkdirSync(path.dirname(test), { recursive: true });
    fs.writeFileSync(test, `import { test } from 'vitest';\n\ntest('${ADDED_FULL}: a test whose name is long enough to wrap ${LONG_WORD}', () => undefined);\n`);
  });
}

// What doesn't fit: each element of the view reaching past the scroller's
// content edge, and the scroller's own sideways scroll.
const overflow = (page: Page, view: InspectorView, shell: InspectorShell) =>
  page.evaluate(
    ([scrollerSelector, viewSelector]) => {
      const scroller = document.querySelector(scrollerSelector)!;
      const edge = scroller.getBoundingClientRect();
      const right = edge.left + scroller.clientWidth;
      const found: string[] = [];
      if (scroller.scrollWidth > scroller.clientWidth + 1) found.push(`the scroller is ${scroller.scrollWidth}px wide in ${scroller.clientWidth}px`);
      for (const element of document.querySelectorAll(`${viewSelector}, ${viewSelector} *`)) {
        if (element.closest('.visually-hidden') !== null) continue;
        for (const rect of element.getClientRects()) {
          if (rect.width > 0 && (rect.right > right + 0.5 || rect.left < edge.left - 0.5)) {
            found.push(`${element.tagName.toLowerCase()}.${[...element.classList].join('.')} "${(element.textContent ?? '').trim().slice(0, 30)}" reaches ${Math.round(rect.left)} to ${Math.round(rect.right)} in ${Math.round(edge.left)} to ${Math.round(right)}`);
            break;
          }
        }
      }
      return found;
    },
    [scrollerSelector(view, shell), specViewSelector(view)] as const,
  );

// The scroller's width, the page's padding, and the first requirement's ID
// and text boxes.
const measures = (page: Page, view: InspectorView, shell: InspectorShell) =>
  page.evaluate(
    ([scrollerSelector, viewSelector]) => {
      const scroller = document.querySelector(scrollerSelector)!;
      const rect = (selector: string) => {
        const { x, y, width, height } = document.querySelector(`${viewSelector} ${selector}`)!.getBoundingClientRect();
        return { x, y, width, height };
      };
      const page = getComputedStyle(document.querySelector(`${viewSelector} .spec-page`)!);
      return {
        width: scroller.getBoundingClientRect().width,
        padding: [page.paddingTop, page.paddingRight, page.paddingBottom, page.paddingLeft].map((value) => Number.parseFloat(value)),
        id: rect('li.requirement .short-id'),
        body: rect('li.requirement .requirement-body'),
      };
    },
    [scrollerSelector(view, shell), specViewSelector(view)] as const,
  );

async function expectLayout(page: Page, view: InspectorView, variant: Variant): Promise<void> {
  const where = `${variant.name} ${view}`;
  await settle(page);
  expect(await horizontalScroll(page, '/', where), where).toEqual([]);
  expect(await overflow(page, view, variant.shell), where).toEqual([]);
  const measured = await measures(page, view, variant.shell);
  // Two columns from 480 px of content, the ID above the text below.
  if (measured.width >= 480) {
    expect(measured.body.x, `${where}: the text beside the ID`).toBeGreaterThanOrEqual(measured.id.x + measured.id.width - 0.5);
    expect(Math.abs(measured.body.y - measured.id.y), `${where}: the text beside the ID`).toBeLessThan(measured.id.height);
  } else {
    expect(measured.body.y, `${where}: the text below the ID`).toBeGreaterThanOrEqual(measured.id.y + measured.id.height - 0.5);
  }
  const padding = variant.shell === 'mobile' ? 20 : measured.width >= 700 ? 40 : 24;
  expect(measured.padding, `${where}: padding in a ${Math.round(measured.width)}px scroller`).toEqual([padding, padding, padding, padding]);
}

describe('007-requirement-inspector-FR-020: the spec view fits every width, and wraps what is long', () => {
  for (const variant of VARIANTS) {
    test(`${variant.name}: no horizontal scroll, long words, paths and links wrapped, columns and padding by width`, async () => {
      const { server } = await longBuild();
      const page = await openShell({ ...variant.options, url: server.url });
      if (variant.narrow === true) {
        await openView(page, 'cv', 'desktop');
        expect(await narrowWindow(page, viewSelector('cv', 'desktop'))).toBe(400);
      }
      await showSpecs(page, 'cv', variant.shell);
      await expectLayout(page, 'cv', variant);
      if (variant.narrow !== true) {
        await showSpecs(page, 'about', variant.shell);
        expect(await page.locator(`${specViewSelector('about')} li.requirement[data-id="${ADDED_FULL}"] .requirement-text`).innerText()).toContain(LONG_WORD.slice(0, 20));
        expect(await page.locator(`${specViewSelector('about')} li.requirement[data-id="${ADDED_FULL}"] .test-place`).innerText()).toContain('a-very-long-folder-name');
        await expectLayout(page, 'about', variant);
      }
    });
  }

  for (const shell of ['desktop', 'mobile'] as const) {
    test(`${shell}: the view scrolls inside its window, the bar staying at the top, and the page doesn't scroll`, async () => {
      const page = await openShell(SHELL_PAGE[shell]);
      await showSpecs(page, 'cv', shell);
      const scroller = page.locator(scrollerSelector('cv', shell));
      await scroller.evaluate((element) => element.scrollTo(0, 600));
      await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      await settle(page);
      const tops = await page.evaluate(
        ([scrollerSelector, barSelector]) => ({ scroller: document.querySelector(scrollerSelector)!.getBoundingClientRect().top, bar: document.querySelector(barSelector)!.getBoundingClientRect().top, page: document.scrollingElement!.scrollTop }),
        [scrollerSelector('cv', shell), `${specViewSelector('cv')} .spec-bar`] as const,
      );
      expect(tops.bar).toBeCloseTo(tops.scroller, 0);
      expect(tops.page).toBe(0);
    });
  }
});
