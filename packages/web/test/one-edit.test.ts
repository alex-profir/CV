// One edit at the source changes the page after a rebuild, with no edit to
// the page (spec US6 scenarios 1 and 2, SC-008). Each case changes a copy of
// the repository the way the owner would and builds the copy.
import { describe, expect, onTestFinished, test, vi } from 'vitest';
import { startServer } from '../../../tools/site-check/src/server.ts';
import { EXPORT_FILE, OUTPUT_CSS_FILE, OUTPUT_TS_FILE } from '../../../tools/token-check/src/paths.ts';
import { runGenerate } from '../../../tools/token-check/test/helpers/tokens.ts';
import { RESUME_FILE } from '../../../tools/content-check/src/paths.ts';
import { openPage } from './helpers/browser.ts';
import { buildCopy, changedFiles, editJson, repoCopy, snapshot } from './helpers/copy.ts';
import type { CopyBuild } from './helpers/copy.ts';

vi.setConfig({ testTimeout: 180_000 });

// Serves a successful build of a copy for the current test.
async function serveCopy(build: CopyBuild): Promise<string> {
  expect(build.stderr).toBe('');
  expect(build.status).toBe(0);
  const server = await startServer({ siteDir: build.site!.dir, manifest: build.site!.manifest });
  onTestFinished(() => server.close());
  return server.url;
}

describe('004-cv-page-FR-003: changing a CV fact takes one edit, in the CV document', () => {
  test("a new position in the copy's resume.json shows in the work entry's h3 after a build, and only resume.json changed", async () => {
    const root = repoCopy();
    const before = snapshot(root);
    const position = 'Principal Test Engineer';
    editJson(root, RESUME_FILE, (resume) => (resume.work[0].position = position));

    const url = await serveCopy(buildCopy(root));
    const page = await openPage(`${url}/cv`, { width: 1440 });
    expect(await page.locator('section[aria-labelledby="section-work"] h3').first().textContent()).toBe(position);
    expect(changedFiles(before, snapshot(root))).toEqual([RESUME_FILE]);
  });

  test("a new ink color in the copy's export changes the body's text color after token-output and a build, and only the export and the generated files changed (SC-008)", async () => {
    const root = repoCopy();
    const before = snapshot(root);
    editJson(root, EXPORT_FILE, (tokens) => (tokens.base.color.base.ink.$value = '#2a2723'));
    expect(runGenerate(root).status).toBe(0);

    const url = await serveCopy(buildCopy(root));
    const page = await openPage(`${url}/cv`, { width: 1440 });
    expect(await page.locator('body').evaluate((body) => getComputedStyle(body).color)).toBe('rgb(42, 39, 35)');
    expect(changedFiles(before, snapshot(root))).toEqual([EXPORT_FILE, OUTPUT_CSS_FILE, OUTPUT_TS_FILE].sort());
  });
});
