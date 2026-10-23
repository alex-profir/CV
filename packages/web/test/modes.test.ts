// Forced colors and reduced motion, using the site check's modes part.
import { describe, expect, test, vi } from 'vitest';
import { forcedColorsProblems, motionProblems } from '../../../tools/site-check/src/parts/modes.ts';
import { openPage } from './helpers/browser.ts';
import { fixture } from './helpers/fixtures.ts';
import { serveBuilt, serveFixture } from './helpers/site.ts';

vi.setConfig({ testTimeout: 120_000 });

describe('004-cv-page-FR-030: with forced colors, text, links, separators and focus stay visible', () => {
  test('rules, the timeline, chips, link underlines and the focus outline stay visible on both pages', async () => {
    const { url } = await serveBuilt();
    for (const target of ['/cv', '/missing-page']) {
      for (const width of [375, 1440]) {
        const page = await openPage(`${url}${target}`, { width, forcedColors: 'active' });
        expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);
        expect(await forcedColorsProblems(page, target), `${target} ${width}px`).toEqual([]);
        await page.context().close();
      }
    }
  });

  test('the decoration the design draws keeps a visible border in forced colors', async () => {
    const { url } = await serveFixture(fixture('every-field'));
    const page = await openPage(`${url}/cv`, { width: 1440, forcedColors: 'active' });
    const borders = await page.evaluate(() => {
      const width = (style: CSSStyleDeclaration, side: string) => Number.parseFloat(style.getPropertyValue(`border-${side}-width`));
      const visible = (style: CSSStyleDeclaration, side: string) => width(style, side) > 0 && style.getPropertyValue(`border-${side}-style`) !== 'none';
      const timeline = document.querySelector('ol.timeline')!;
      const dot = getComputedStyle(document.querySelector('ol.timeline > li')!, '::before');
      return {
        section: visible(getComputedStyle(document.querySelector('main > section')!), 'top'),
        contact: visible(getComputedStyle(document.querySelector('.contact-block')!), 'top'),
        timeline: visible(getComputedStyle(timeline), 'left'),
        dot: ['top', 'right', 'bottom', 'left'].every((side) => visible(dot, side)),
        chip: ['top', 'right', 'bottom', 'left'].every((side) => visible(getComputedStyle(document.querySelector('ul.chips > li')!), side)),
        underline: [...document.querySelectorAll('a[href]')].every((link) => {
          const style = getComputedStyle(link);
          return style.textDecorationLine.includes('underline') || visible(style, 'bottom');
        }),
        backgroundImages: [...document.querySelectorAll('*')].filter((element) => getComputedStyle(element).backgroundImage !== 'none').length,
      };
    });
    expect(borders).toEqual({ section: true, contact: true, timeline: true, dot: true, chip: true, underline: true, backgroundImages: 0 });
  });

  test('the modes part reports a separator drawn only with a background', async () => {
    const { url } = await serveBuilt();
    const page = await openPage(`${url}/cv`, { width: 375, forcedColors: 'active' });
    await page.evaluate(() => {
      const rule = document.createElement('hr');
      rule.className = 'rule';
      rule.style.cssText = 'border: 0; height: 2px; background: currentColor;';
      document.querySelector('main')!.append(rule);
    });
    const problems = await forcedColorsProblems(page, '/cv');
    expect(problems).toContainEqual(expect.objectContaining({ part: 'modes', page: '/cv', variant: 'forced-colors', type: 'invisible-separator', subject: 'hr.rule' }));
  });
});

describe('004-cv-page-FR-031: no motion, with or without reduced motion', () => {
  test('every computed transition and animation duration is 0 on both pages', async () => {
    const { url } = await serveBuilt();
    for (const target of ['/cv', '/missing-page']) {
      for (const reducedMotion of ['reduce', 'no-preference'] as const) {
        const page = await openPage(`${url}${target}`, { width: 375, reducedMotion });
        expect(await motionProblems(page, target, reducedMotion === 'reduce' ? 'reduced-motion' : '-'), `${target} ${reducedMotion}`).toEqual([]);
        await page.context().close();
      }
    }
  });

  test('the modes part names a transition by its property and duration', async () => {
    const { url } = await serveBuilt();
    const page = await openPage(`${url}/cv`, { width: 375, reducedMotion: 'reduce' });
    await page.addStyleTag({ content: 'p.date { transition: color 200ms; }' });
    const problems = await motionProblems(page, '/cv', 'reduced-motion');
    expect(problems[0]).toMatchObject({ part: 'modes', page: '/cv', variant: 'reduced-motion', type: 'motion', subject: 'p.date', detail: 'transition-duration 200ms' });
  });
});
