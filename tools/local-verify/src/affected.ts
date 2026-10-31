// Which test files a change touches (FR-038). The rules are coarse on purpose:
// they name a change's own area, not everything that could depend on it. The
// site's checks in CI and the daily full run catch what they leave out.
import path from 'node:path';

const WEB_PAGES = 'packages/web/test/*.test.*';
const WEB_ALL = 'packages/web/test/**';
const SITE_CHECK_TESTS = 'tools/site-check/test/';

// A changed file's first matching rule gives the tests it touches. A file no
// rule matches, such as package.json or a config, touches every test but the
// site check's own.
export const AREAS: { changed: string[]; tests: string[] }[] = [
  { changed: ['docs/**', '.specify/**', '.claude/**', '*.md'], tests: [] },
  { changed: ['specs/**'], tests: ['packages/web/test/requirement-data/**', 'packages/web/test/spec-list.test.ts'] },
  { changed: ['.github/**'], tests: ['tools/*/test/repo-settings.test.ts'] },
  { changed: ['packages/content/**'], tests: ['packages/content/test/**', 'tools/content-check/test/**', WEB_PAGES] },
  { changed: ['packages/tokens/**'], tests: ['packages/tokens/test/**', 'tools/token-check/test/**', WEB_PAGES] },
  { changed: ['packages/os-core/**'], tests: ['packages/os-core/test/**', 'packages/web/test/shell/**', 'packages/web/test/inspector/**'] },
  { changed: ['packages/web/src/apps/terminal/**', 'packages/web/test/terminal/**'], tests: ['packages/web/test/terminal/**'] },
  { changed: ['packages/web/src/inspector/**', 'packages/web/test/inspector/**'], tests: ['packages/web/test/inspector/**'] },
  { changed: ['packages/web/src/shells/**', 'packages/web/src/os/**', 'packages/web/test/shell/**'], tests: ['packages/web/test/shell/**'] },
  { changed: ['packages/web/src/cv/**', 'packages/web/src/apps/cv/**', 'packages/web/src/pages/**', 'packages/web/src/format/**'], tests: [WEB_PAGES] },
  { changed: ['packages/web/**'], tests: [WEB_ALL] },
  { changed: ['tools/site-check/**'], tests: [`${SITE_CHECK_TESTS}**`] },
  { changed: ['tools/content-check/**'], tests: ['tools/content-check/test/**'] },
  { changed: ['tools/token-check/**'], tests: ['tools/token-check/test/**'] },
  { changed: ['tools/traceability/**'], tests: ['tools/traceability/test/**'] },
  { changed: ['tools/local-verify/**'], tests: ['tools/local-verify/test/**'] },
  { changed: ['tools/speckit-auto/**'], tests: ['tools/speckit-auto/test/**'] },
];

const matches = (file: string, globs: string[]) => globs.some((glob) => path.posix.matchesGlob(file, glob));

// The test files a feature run covers: all of them but the site check's own.
export function withoutSiteCheckTests(testFiles: string[]): string[] {
  return testFiles.filter((file) => !file.startsWith(SITE_CHECK_TESTS));
}

// The test files `changed` touches, as `testFiles` lists them. A changed test
// file always counts, whatever its area.
export function affectedTests(changed: string[], testFiles: string[]): string[] {
  const picked = new Set<string>();
  for (const file of changed) {
    if (testFiles.includes(file)) picked.add(file);
    const area = AREAS.find((entry) => matches(file, entry.changed));
    const tests = area === undefined ? withoutSiteCheckTests(testFiles) : testFiles.filter((test) => matches(test, area.tests));
    for (const test of tests) picked.add(test);
  }
  return testFiles.filter((test) => picked.has(test));
}
