// The site's own fonts (research R5, contracts/fonts.md): every character on
// the page is drawn by one of them, using the site check's fonts part
// (research R16); they are licensed and declared only in the build output;
// and the build refuses fonts that don't match the font tokens.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import fonts from '../src/fonts/fonts.json' with { type: 'json' };
import { fontProblems } from '../../../tools/site-check/src/parts/fonts.ts';
import { EXPORT_FILE } from '../../../tools/token-check/src/paths.ts';
import { siteFiles } from '../../../tools/token-check/src/site-files.ts';
import { runCli as runTokenCheck, runGenerate } from '../../../tools/token-check/test/helpers/tokens.ts';
import { openPage } from './helpers/browser.ts';
import { REPO_ROOT, buildCopy, editJson, repoCopy } from './helpers/copy.ts';
import { fixture } from './helpers/fixtures.ts';
import { builtSite, serveBuilt, serveFixture } from './helpers/site.ts';

vi.setConfig({ testTimeout: 120_000 });

const FAMILIES = fonts.families.map((entry) => entry.family);

const FONTS_DIR = path.join(REPO_ROOT, 'packages/web/src/fonts');

// The built style sheets, as one text.
function builtCss(): string {
  const { dir, manifest } = builtSite();
  return manifest.files
    .filter((file) => file.type === 'text/css')
    .map((file) => fs.readFileSync(path.join(dir, file.path), 'utf8'))
    .join('\n');
}

const fontFaces = (css: string) => [...css.matchAll(/@font-face\s*\{[^}]*\}/g)].map((match) => match[0]);

// The one line a failed build writes, `site build failed: <message>`, and
// its exit code, as contracts/cli.md gives them.
function failure(build: { status: number | null; stderr: string }): string {
  expect(build.status).toBe(2);
  expect(build.stderr.endsWith('\n')).toBe(true);
  const lines = build.stderr.slice(0, -1).split('\n');
  expect(lines).toHaveLength(1);
  return lines[0]!;
}

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

describe('004-cv-page-FR-045: the fonts are licensed, served by the site, and keep text visible while they load', () => {
  test("every file and license fonts.json lists exists, and each family's directory holds OFL.txt", () => {
    for (const entry of fonts.families) {
      expect(fs.existsSync(path.join(FONTS_DIR, entry.license)), entry.license).toBe(true);
      for (const { file } of entry.files) {
        expect(fs.existsSync(path.join(FONTS_DIR, file)), file).toBe(true);
        expect(fs.existsSync(path.join(FONTS_DIR, path.dirname(file), 'OFL.txt')), file).toBe(true);
      }
    }
  });

  test('no family is an Apple font or the system interface font', () => {
    expect(FAMILIES.length).toBeGreaterThan(0);
    for (const family of FAMILIES) {
      expect(family, family).not.toMatch(/^\.?SF\b/i);
      expect(family, family).not.toMatch(/San Francisco|New York/i);
      expect(['system-ui', '-apple-system', 'blinkmacsystemfont'], family).not.toContain(family.toLowerCase());
      expect(family.toLowerCase().startsWith('ui-'), family).toBe(false);
    }
  });

  test('every built @font-face has font-display: swap', () => {
    const faces = fontFaces(builtCss());
    expect(faces.length).toBeGreaterThan(0);
    for (const face of faces) expect(face).toMatch(/font-display:\s*swap/);
  });

  test('a build whose font.family.display names a family with no fonts.json entry fails, naming the token', () => {
    const root = repoCopy();
    editJson(root, EXPORT_FILE, (tokens) => (tokens.base.font.family.display.$value = ['Inter', 'sans-serif']));
    expect(runGenerate(root).status).toBe(0);
    expect(failure(buildCopy(root))).toMatch(/^site build failed: .*\bfont\.family\.display\b.*"Inter"/);
  });

  test('a build with a missing font file fails, naming it', () => {
    const root = repoCopy();
    fs.rmSync(path.join(root, 'packages/web/src/fonts/space-grotesk/vietnamese.woff2'));
    expect(failure(buildCopy(root))).toMatch(/^site build failed: .*space-grotesk\/vietnamese\.woff2/);
  });

  test('a build with a missing license fails, naming it', () => {
    const root = repoCopy();
    fs.rmSync(path.join(root, 'packages/web/src/fonts/jetbrains-mono/OFL.txt'));
    expect(failure(buildCopy(root))).toMatch(/^site build failed: .*jetbrains-mono\/OFL\.txt/);
  });
});

describe('004-cv-page-FR-046: the fonts are declared without a literal the token check reports', () => {
  test('no style sheet in the repository holds an @font-face rule, and no style sheet or component names a family', () => {
    const { files } = siteFiles(REPO_ROOT);
    expect(files.some((file) => file.file.startsWith('packages/web/src/'))).toBe(true);
    for (const file of files) {
      if (file.kind === 'style-sheet') expect(file.text, file.file).not.toMatch(/@font-face/i);
      for (const family of FAMILIES) expect(file.text.toLowerCase().includes(family.toLowerCase()), `${file.file} ${family}`).toBe(false);
    }
  });

  test('the built CSS holds one @font-face per fonts.json file', () => {
    const faces = fontFaces(builtCss());
    expect(faces).toHaveLength(fonts.families.reduce((count, entry) => count + entry.files.length, 0));
    const family = (face: string) => /font-family:\s*(["']?)([^;"'}]+)\1/.exec(face)?.[2]?.trim();
    for (const entry of fonts.families) {
      for (const { file } of entry.files) {
        // The file's hashed asset, `assets/<family-dir>-<subset>-<hash>.woff2`,
        // with Vite's eight-character hash.
        const asset = new RegExp(String.raw`url\(["']?/assets/${file.replace('/', '-').replace(/\.woff2$/, '')}-[\w-]{8}\.woff2["']?\)`);
        const own = faces.filter((face) => asset.test(face));
        expect(own, file).toHaveLength(1);
        expect(family(own[0]!), file).toBe(entry.family);
      }
    }
  });

  test('npm run token-check passes with the fonts declared', () => {
    const result = runTokenCheck(REPO_ROOT);
    expect(result.stdout).toContain('PASS: both token sources are valid and no literal design values were found.');
    expect(result.status).toBe(0);
  });
});
