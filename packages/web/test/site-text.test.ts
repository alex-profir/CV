// Site text: English, set by the design, and holding no CV fact
// (data-model.md Site text).
import fs from 'node:fs';
import path from 'node:path';
import { parseSync } from 'oxc-parser';
import { describe, expect, test, vi } from 'vitest';
import { resume } from '@cv/content';
import { examples } from '../src/apps/playground/examples/index.ts';
import { siteText } from '../src/site-text.ts';
import { searchFiles } from '../../../tools/content-check/src/facts.ts';
import { RESUME_FILE } from '../../../tools/content-check/src/paths.ts';
import { openHtml } from './helpers/browser.ts';
import { REPO_ROOT } from './helpers/copy.ts';
import { builtSite } from './helpers/site.ts';

vi.setConfig({ testTimeout: 60_000 });

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value !== null && typeof value === 'object') return Object.entries(value).flatMap(([key, child]) => (key === '$schema' ? [] : strings(child)));
  return [];
}

// Printable ASCII and the few typographic characters the design uses,
// including the shell's ellipsis (005 `Move…`) and the arrow between the
// inspector's chain labels (007 contracts/inspector.md), and the
// Playground's marks for no errors and for errors (008 wireframes, The
// editor with errors).
const ENGLISH = /^[\x20-\x7E–—·’↗…›✓⊗]*$/u;

// Key facts of the real CV, as the checks below look for them.
const keyFacts = () =>
  [
    resume.basics?.name,
    resume.basics?.email,
    resume.basics?.location?.city,
    ...(resume.basics?.profiles ?? []).map((profile) => profile.username),
    ...(resume.work ?? []).map((work) => work.name),
    ...(resume.projects ?? []).map((project) => project.name),
    ...(resume.education ?? []).map((entry) => entry.institution),
  ].filter((fact): fact is string => typeof fact === 'string' && fact !== '');

describe('004-cv-page-FR-006: site text is English, set by the design, and holds no CV fact', () => {
  test('every site text string uses only English characters', () => {
    const values = strings(siteText);
    expect(values.length).toBeGreaterThan(30);
    for (const value of values) expect(value, value).toMatch(ENGLISH);
    expect(Object.isFrozen(siteText)).toBe(true);
  });

  test('the strings the design sets', () => {
    expect(siteText.siteHeading).toBe('CV');
    expect(Object.values(siteText.sections)).toEqual(['Experience', 'Projects', 'Skills', 'Education', 'Languages', 'Interests']);
    expect(siteText.present).toEqual({ visible: 'Present', spoken: 'present' });
    expect(siteText.builtWith).toBe('How this page was built');
    expect(siteText.notFound).toEqual({
      label: '404 · Not found',
      heading: "This page doesn't exist.",
      hint: 'The address may be mistyped, or the page may have moved.',
      link: 'Go to the CV',
    });
    expect(siteText.monthsShort).toHaveLength(12);
    expect(siteText.monthsLong).toHaveLength(12);
  });

  test("no site text string contains a key fact of the real CV", () => {
    const facts = keyFacts();
    expect(facts.length).toBeGreaterThan(5);
    for (const value of strings(siteText)) {
      for (const fact of facts) expect(value.toLowerCase(), value).not.toContain(fact.toLowerCase());
    }
  });

  test('the rendered not-found page holds no CV string from the real CV', async () => {
    const page = await openHtml(fs.readFileSync(path.join(builtSite().dir, '404.html'), 'utf8'));
    const text = (await page.locator('body').textContent())!;
    const title = await page.title();
    for (const value of strings(resume)) {
      expect(text, value).not.toContain(value);
      expect(title, value).not.toContain(value);
    }
  });
});

// Every example's site text, for both systems' starting example: its title,
// its description and each comment in its code, as the repository's
// TypeScript parser reads them.
function exampleText(): { id: string; text: string }[] {
  const seen = new Map<string, { id: string; text: string }>();
  for (const example of [...examples(true), ...examples(false)]) {
    const { comments, errors } = parseSync(`${example.id}.ts`, example.code);
    expect(errors, example.id).toEqual([]);
    const texts = [example.title, example.description, ...comments.map((comment) => comment.value.trim()).filter((text) => text !== '')];
    for (const text of texts) seen.set(`${example.id}\n${text}`, { id: example.id, text });
  }
  return [...seen.values()];
}

describe('008-typescript-playground-FR-001: the Playground\'s name and words are site text', () => {
  test('the app name and every playground string are English and hold no key fact of the real CV', () => {
    expect(siteText.os.views.playground).toBe('Playground');
    const values = strings([siteText.os.views.playground, siteText.playground]);
    expect(values.length).toBeGreaterThan(60);
    const facts = keyFacts();
    for (const value of values) {
      expect(value, value).toMatch(ENGLISH);
      for (const fact of facts) expect(value.toLowerCase(), value).not.toContain(fact.toLowerCase());
    }
  });
});

describe("008-typescript-playground-FR-031: the examples' titles, descriptions and comments are English site text with no CV fact", () => {
  test('every title, description and comment is English and holds no key fact of the real CV', () => {
    const texts = exampleText();
    expect(new Set(texts.map(({ id }) => id)).size).toBe(11);
    expect(texts.length).toBeGreaterThan(40);
    const facts = keyFacts();
    for (const { id, text } of texts) {
      expect(text, id).toMatch(ENGLISH);
      for (const fact of facts) expect(text.toLowerCase(), `${id}: ${text}`).not.toContain(fact.toLowerCase());
    }
  });

  test("the content check reads the examples' files as site files", () => {
    const dir = 'packages/web/src/apps/playground/examples';
    const files = fs.readdirSync(path.join(REPO_ROOT, dir)).map((name) => `${dir}/${name}`);
    expect(files.length).toBe(13);
    const searched = new Set(searchFiles(REPO_ROOT, [RESUME_FILE]).files.map((file) => file.file));
    expect(files.filter((file) => !searched.has(file))).toEqual([]);
  });
});
