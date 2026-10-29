// Site text: English, set by the design, and holding no CV fact
// (data-model.md Site text).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { resume } from '@cv/content';
import { siteText } from '../src/site-text.ts';
import { openHtml } from './helpers/browser.ts';
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
// inspector's chain labels (007 contracts/inspector.md).
const ENGLISH = /^[\x20-\x7E–—·’↗…›]*$/u;

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
    const facts = [
      resume.basics?.name,
      resume.basics?.email,
      resume.basics?.location?.city,
      ...(resume.basics?.profiles ?? []).map((profile) => profile.username),
      ...(resume.work ?? []).map((work) => work.name),
      ...(resume.projects ?? []).map((project) => project.name),
      ...(resume.education ?? []).map((entry) => entry.institution),
    ].filter((fact): fact is string => typeof fact === 'string' && fact !== '');
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
