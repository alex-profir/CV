// Every repository link the inspector shows is built in one place (007
// research R8, contracts/requirement-data.md Links).
import { describe, expect, test } from 'vitest';
import { siteData } from '@cv/content';
import { commitUrl, fileUrl, shortCommit } from '../src/format/repository.ts';

const COMMIT = '0123456789abcdef0123456789abcdef01234567';

describe('007-requirement-inspector-FR-010: links name the built commit, the file and the line', () => {
  for (const repository of ['https://github.com/owner/site', 'https://github.com/owner/site/']) {
    test(`fileUrl and commitUrl from ${repository}`, () => {
      expect(fileUrl(repository, COMMIT, 'specs/004-cv-page/spec.md')).toBe(`https://github.com/owner/site/blob/${COMMIT}/specs/004-cv-page/spec.md`);
      expect(fileUrl(repository, COMMIT, 'specs/004-cv-page/spec.md', 412)).toBe(`https://github.com/owner/site/blob/${COMMIT}/specs/004-cv-page/spec.md?plain=1#L412`);
      expect(fileUrl(repository, COMMIT, 'packages/web/test/content.test.tsx', 37)).toBe(`https://github.com/owner/site/blob/${COMMIT}/packages/web/test/content.test.tsx#L37`);
      expect(fileUrl(repository, COMMIT, 'packages/web/test/content.test.tsx')).toBe(`https://github.com/owner/site/blob/${COMMIT}/packages/web/test/content.test.tsx`);
      expect(commitUrl(repository, COMMIT)).toBe(`https://github.com/owner/site/commit/${COMMIT}`);
    });
  }

  test('shortCommit gives the first 7 characters', () => {
    expect(shortCommit(COMMIT)).toBe('0123456');
  });

  test('the site names its repository, so the links can be made (research R8)', () => {
    expect(siteData.repository).toMatch(/^https:\/\/github\.com\/[^/]+\/[^/]+$/);
  });
});
