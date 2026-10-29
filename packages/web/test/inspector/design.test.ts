// The inspector's measurable design (FR-021, design/wireframes.md Design
// values): its colors, fonts and sizes are the tokens', "Show specs" sits
// where the design puts it, the bar and the reading width are the design's,
// and its glyphs are drawn, with no image and no system font. The visual
// comparison with design/exports/ is by hand (T088).
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { tokenValue } from '@cv/tokens';
import type { CssVarTokenName } from '@cv/tokens';
import { openView, showSpecs, specViewSelector, viewSelector } from '../helpers/inspector.ts';
import { box, openShell, settle } from '../helpers/shell.ts';
import type { Box } from '../helpers/shell.ts';
import { SHELL_PAGE } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 180_000 });

const SPEC = specViewSelector('cv');
// Fonts that belong to an operating system's UI rather than the site.
const SYSTEM_FONTS = /-apple-system|BlinkMacSystemFont|system-ui|ui-monospace|ui-sans-serif|SF Pro|SF Mono|San Francisco|Menlo|Monaco|Segoe UI|Helvetica Neue|Roboto/i;

// A color as the browser computes it.
const computedColor = (page: Page, value: string) =>
  page.evaluate((color) => {
    const probe = document.createElement('div');
    probe.style.color = color;
    document.body.append(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();
    return computed;
  }, value);

const token = (name: CssVarTokenName) => String(tokenValue(name));

const styleOf = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((element) => {
    const style = getComputedStyle(element);
    return { color: style.color, background: style.backgroundColor, family: style.fontFamily, size: style.fontSize, weight: style.fontWeight, border: style.borderTopColor };
  });

describe('007-requirement-inspector-FR-021: the inspector matches the approved design', () => {
  test('the view\'s colors and fonts are the tokens\'', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await showSpecs(page, 'cv', 'desktop');
    const color = (name: CssVarTokenName) => computedColor(page, token(name));
    const mono = token('font.family.mono');
    const body = token('font.family.body');

    const view = await styleOf(page, SPEC);
    expect(view.background).toBe(await color('color.shell-surface'));
    expect(view.color).toBe(await color('color.shell-text'));
    expect(view.family).toBe(body);
    expect(view.size).toBe(token('font.size.mono'));

    const bar = await styleOf(page, `${SPEC} .spec-bar`);
    expect(bar.background).toBe(await color('color.chrome-solid'));
    for (const control of ['button.spec-back', 'button.whats-this']) {
      const style = await styleOf(page, `${SPEC} ${control}`);
      expect(style.color, control).toBe(await color('color.shell-accent'));
      expect(style.family, control).toBe(body);
      expect(style.size, control).toBe(token('font.size.small'));
    }
    // The heading is the narrow h3 the design sets, from its token group.
    const heading = await styleOf(page, `${SPEC} h1.spec-heading`);
    const typography = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      return { family: root.getPropertyValue('--token-typography-h3-narrow-font-family').trim(), size: root.getPropertyValue('--token-typography-h3-narrow-font-size').trim() };
    });
    expect(typography.family).not.toBe('');
    expect(heading.family).toBe(typography.family);
    expect(heading.size).toBe(typography.size);

    const shortId = await styleOf(page, `${SPEC} .short-id`);
    expect(shortId.color).toBe(await color('color.shell-accent'));
    expect(shortId.family).toBe(mono);
    expect(shortId.size).toBe(token('font.size.small'));
    const chip = await styleOf(page, `${SPEC} .status[data-status="approved"]`);
    expect(chip.color).toBe(await color('color.status-approved'));
    expect(chip.border).toBe(await color('color.status-approved'));
    expect(chip.family).toBe(mono);
    expect(chip.size).toBe(token('font.size.label'));
    const number = await styleOf(page, `${SPEC} .spec-number`);
    expect(number.color).toBe(await color('color.shell-accent'));
    expect(number.family).toBe(mono);
    const groupHeading = await styleOf(page, `${SPEC} .spec-group h2`);
    expect(groupHeading.size).toBe(token('font.size.h4'));
    const text = await styleOf(page, `${SPEC} .requirement-text`);
    expect(text.color).toBe(await color('color.shell-text'));
    expect(text.size).toBe(token('font.size.mono'));
    const label = await styleOf(page, `${SPEC} .tests-label`);
    expect(label.color).toBe(await color('color.shell-text-secondary'));
    expect(label.family).toBe(mono);
    expect(label.size).toBe(token('font.size.label'));
    const place = await styleOf(page, `${SPEC} .test-place`);
    expect(place.color).toBe(await color('color.shell-text-secondary'));
    expect(place.family).toBe(mono);
    const link = await styleOf(page, `${SPEC} a.test-name`);
    expect(link.color).toBe(await color('color.shell-accent'));
    const build = await styleOf(page, `${SPEC} p.spec-build`);
    expect(build.color).toBe(await color('color.shell-text-secondary'));
    expect(build.family).toBe(mono);
    const lede = await styleOf(page, `${SPEC} p.spec-lede`);
    expect(lede.color).toBe(await color('color.shell-text-soft'));
  });

  test('a note is a dashed box in the chrome border\'s color', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await showSpecs(page, 'cv', 'desktop');
    await page.context().setOffline(true);
    await page.waitForSelector(`${SPEC} p.note-offline`);
    const note = await page.locator(`${SPEC} p.note-offline`).evaluate((element) => ({ style: getComputedStyle(element).borderTopStyle, color: getComputedStyle(element).borderTopColor, text: getComputedStyle(element).color }));
    expect(note.style).toBe('dashed');
    expect(note.color).toBe(await computedColor(page, token('color.chrome-border')));
    expect(note.text).toBe(await computedColor(page, token('color.shell-text-soft')));
    await page.context().setOffline(false);
  });

  test('Show specs is 24 px tall, 10 px from the window\'s right edge; the bar is 40 px on the desktop and 48 px on a phone; the reading width is 760 px', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await openView(page, 'cv', 'desktop');
    // Measured inside the window's border, as 005 places its controls 8 px
    // from the left edge: the title bar's edge.
    const bar = (await box(page, `${viewSelector('cv', 'desktop')} .title-bar`)) as Box;
    const control = (await box(page, `${viewSelector('cv', 'desktop')} button.show-specs`)) as Box;
    expect(`${control.height}px`).toBe(token('size.control'));
    expect(bar.x + bar.width - (control.x + control.width)).toBeCloseTo(10, 0);
    expect(Math.abs(control.y + control.height / 2 - (bar.y + bar.height / 2))).toBeLessThanOrEqual(1);
    await showSpecs(page, 'cv', 'desktop');
    expect(`${((await box(page, `${SPEC} .spec-bar`)) as Box).height}px`).toBe(token('size.title-bar'));
    // Each part of the page is at most the reading width, and the lede, a
    // long paragraph, reaches it where the window is wide enough.
    const widths = await page.locator(`${SPEC} .spec-page > *`).evaluateAll((list) => list.filter((element) => element.getClientRects().length > 0).map((element) => ({ max: getComputedStyle(element).maxInlineSize, width: element.getBoundingClientRect().width })));
    for (const each of widths) {
      expect(each.max).toBe(token('size.spec-measure'));
      expect(each.width).toBeLessThanOrEqual(Number.parseFloat(token('size.spec-measure')) + 0.5);
    }
    await page.locator(`${viewSelector('cv', 'desktop')} .title-bar`).dblclick();
    await settle(page);
    const lede = (await box(page, `${SPEC} p.spec-lede`)) as Box;
    expect(`${lede.width}px`).toBe(token('size.spec-measure'));

    const phone = await openShell(SHELL_PAGE.mobile);
    await showSpecs(phone, 'cv', 'mobile');
    expect(`${((await box(phone, `${SPEC} .spec-bar`)) as Box).height}px`).toBe(token('size.spec-bar-touch'));
    const header = (await box(phone, `${viewSelector('cv', 'mobile')} .app-header`)) as Box;
    expect(`${header.height}px`).toBe(token('size.mobile-header'));
  });

  test('the glyphs are inline SVG drawn by the site: no image is requested, and no text uses a system font', async () => {
    const images: string[] = [];
    const page = await openShell({
      ...SHELL_PAGE.desktop,
      beforeGoto: async (target) => {
        target.on('request', (request) => {
          if (request.resourceType() === 'image') images.push(request.url());
        });
      },
    });
    await openView(page, 'cv', 'desktop');
    expect(await page.locator(`${viewSelector('cv', 'desktop')} button.show-specs svg[aria-hidden="true"]`).count()).toBe(1);
    await showSpecs(page, 'cv', 'desktop');
    await page.locator(`${SPEC} button.whats-this`).click();
    await page.context().setOffline(true);
    await page.waitForSelector(`${SPEC} p.note-offline`);
    await settle(page);
    for (const glyph of ['button.whats-this', 'p.note-offline', 'a.build-commit']) {
      expect(await page.locator(`${SPEC} ${glyph} svg`).count(), glyph).toBeGreaterThan(0);
    }
    expect(images).toEqual([]);
    expect(await page.locator(`${SPEC} img, ${SPEC} picture`).count()).toBe(0);
    const families = await page.locator(`${SPEC}, ${SPEC} *`).evaluateAll((list) => [...new Set(list.map((element) => getComputedStyle(element).fontFamily))]);
    for (const family of families) expect(family, family).not.toMatch(SYSTEM_FONTS);
    await page.context().setOffline(false);
  });
});
