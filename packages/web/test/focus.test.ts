// Keyboard reach, order and a visible focus indicator for every link, using
// the site check's keyboard part (research R15).
import { describe, expect, test, vi } from 'vitest';
import { keyboardProblems } from '../../../tools/site-check/src/parts/keyboard.ts';
import { openPage } from './helpers/browser.ts';
import { fixture } from './helpers/fixtures.ts';
import { serveBuilt, serveFixture } from './helpers/site.ts';

vi.setConfig({ testTimeout: 180_000 });

describe('004-cv-page-FR-029: every link is reached by keyboard in reading order, with a visible indicator, and is not covered', () => {
  test('the real CV and the not-found page at 375 and 1440 px', async () => {
    const { url } = await serveBuilt();
    for (const target of ['/cv', '/missing-page']) {
      for (const width of [375, 1440]) {
        const page = await openPage(`${url}${target}`, { width });
        expect(await keyboardProblems(page, target, `${width}px`), `${target} ${width}px`).toEqual([]);
        await page.context().close();
      }
    }
  });

  test('every-field.json, with a link of every kind, at 375 and 1440 px', async () => {
    const { url } = await serveFixture(fixture('every-field'));
    for (const width of [375, 1440]) {
      const page = await openPage(`${url}/cv`, { width });
      expect(await keyboardProblems(page, '/cv', `${width}px`), `${width}px`).toEqual([]);
      await page.context().close();
    }
  });

  test('the keyboard part reports every link whose focus indicator is removed', async () => {
    const { url } = await serveBuilt();
    const page = await openPage(`${url}/cv`, { width: 1440 });
    await page.addStyleTag({ content: 'a:focus, a:focus-visible { outline: none !important; }' });
    const links = await page.locator('a[href]').count();
    const problems = await keyboardProblems(page, '/cv', '1440px');
    const missing = problems.filter((problem) => problem.type === 'no-focus-indicator');
    expect(missing).toHaveLength(links);
    expect(missing[0]).toMatchObject({ part: 'keyboard', page: '/cv', variant: '1440px' });
    expect(missing.map((problem) => problem.subject)).toContain('a[href="https://github.com/alex-profir"] "GitHub: alex-profir"');
  });
});
