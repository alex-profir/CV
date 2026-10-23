// Every character on the page is drawn by one of the site's own fonts, using
// the site check's fonts part (research R16).
import { describe, expect, test, vi } from 'vitest';
import fonts from '../src/fonts/fonts.json' with { type: 'json' };
import { fontProblems } from '../../../tools/site-check/src/parts/fonts.ts';
import { openPage } from './helpers/browser.ts';
import { fixture } from './helpers/fixtures.ts';
import { serveBuilt, serveFixture } from './helpers/site.ts';

vi.setConfig({ testTimeout: 120_000 });

const FAMILIES = fonts.families.map((entry) => entry.family);

describe("004-cv-page-FR-007: the site's fonts draw every character of the CV document", () => {
  test('on the real CV and the not-found page at 375 and 1440 px, every character is drawn by a served face', async () => {
    const { url } = await serveBuilt();
    for (const target of ['/cv', '/missing-page']) {
      for (const width of [375, 1440]) {
        const page = await openPage(`${url}${target}`, { width });
        expect(await fontProblems(page, FAMILIES, target, `${width}px`), `${target} ${width}px`).toEqual([]);
        await page.context().close();
      }
    }
  });

  test('on non-ascii.json at 375 and 1440 px, every character is drawn by a served face', async () => {
    const { url } = await serveFixture(fixture('non-ascii'));
    for (const width of [375, 1440]) {
      const page = await openPage(`${url}/cv`, { width });
      expect(await fontProblems(page, FAMILIES, '/cv', `${width}px`), `${width}px`).toEqual([]);
      await page.context().close();
    }
  });

  test('a character no served subset holds is named, with its section and element', async () => {
    const cv = fixture('nothing-optional');
    cv.work = [{ ...cv.work![0], position: 'Position ꙮ' }];
    const { url } = await serveFixture(cv);
    const page = await openPage(`${url}/cv`, { width: 1440 });
    const problems = await fontProblems(page, FAMILIES, '/cv', '1440px');
    expect(problems).toContainEqual(
      expect.objectContaining({ part: 'fonts', page: '/cv', variant: '1440px', type: 'missing-glyph', subject: 'U+A66E ꙮ' }),
    );
    expect(problems.find((problem) => problem.subject === 'U+A66E ꙮ')?.detail).toMatch(/^in section "Experience" \(h3\), drawn in a fallback font$/);
  });
});
