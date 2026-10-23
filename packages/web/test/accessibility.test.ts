// WCAG 2.2 AA by axe-core on both pages, with the real CV and every fixture
// CV, at three widths, using the site check's accessibility part (research
// R12).
import { describe, expect, test, vi } from 'vitest';
import { axeProblems } from '../../../tools/site-check/src/parts/accessibility.ts';
import { openPage } from './helpers/browser.ts';
import { FIXTURE_NAMES, fixture } from './helpers/fixtures.ts';
import { serveBuilt, serveFixture } from './helpers/site.ts';

vi.setConfig({ testTimeout: 180_000 });

const WIDTHS = [320, 375, 1440];

describe('004-cv-page-FR-028: /cv and the not-found page conform to WCAG 2.2 AA at every width', () => {
  test('axe finds no violation on /cv with the real CV', async () => {
    const { url } = await serveBuilt();
    for (const width of WIDTHS) {
      const page = await openPage(`${url}/cv`, { width });
      expect(await axeProblems(page, '/cv', `${width}px`), `${width}px`).toEqual([]);
      await page.context().close();
    }
  });

  test.each(FIXTURE_NAMES)('axe finds no violation on /cv with %s.json', async (name) => {
    const { url } = await serveFixture(fixture(name));
    for (const width of WIDTHS) {
      const page = await openPage(`${url}/cv`, { width });
      expect(await axeProblems(page, '/cv', `${width}px`), `${width}px`).toEqual([]);
      await page.context().close();
    }
  });

  test('axe finds no violation at 375 px for a visitor whose system prefers a dark theme', async () => {
    const { url } = await serveBuilt();
    for (const target of ['/cv', '/missing-page']) {
      const page = await openPage(`${url}${target}`, { width: 375, colorScheme: 'dark' });
      expect(await axeProblems(page, target, '375px'), target).toEqual([]);
    }
  });

  test('the accessibility part names the rule and the element of a violation', async () => {
    const { url } = await serveBuilt();
    const page = await openPage(`${url}/cv`, { width: 375 });
    await page.evaluate(() => {
      const link = document.querySelector('main a[href^="mailto:"]')!;
      link.textContent = '';
    });
    const problems = await axeProblems(page, '/cv', '375px');
    expect(problems).toContainEqual(expect.objectContaining({ part: 'accessibility', page: '/cv', variant: '375px', type: 'axe:link-name' }));
    expect(problems.find((problem) => problem.type === 'axe:link-name')?.subject).toContain('mailto:');
  });
});

describe('004-cv-page-FR-019: the not-found page meets the same accessibility requirements as /cv', () => {
  test('axe finds no violation on the not-found page at every width', async () => {
    const { url } = await serveBuilt();
    for (const width of WIDTHS) {
      const page = await openPage(`${url}/missing-page`, { width });
      expect(await axeProblems(page, '/missing-page', `${width}px`), `${width}px`).toEqual([]);
      await page.context().close();
    }
  });
});
