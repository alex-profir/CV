// Links: the email, the profiles, the basics address and entry addresses,
// each named by its own text (contracts/page.md Links).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { axNodes } from './helpers/ax.ts';
import { openHtml, openPage } from './helpers/browser.ts';
import { fixture } from './helpers/fixtures.ts';
import { builtSite, renderFixtureHtml, serveBuilt, serveFixture } from './helpers/site.ts';

vi.setConfig({ testTimeout: 60_000 });

const realHtml = () => fs.readFileSync(path.join(builtSite().dir, 'cv.html'), 'utf8');

describe('004-cv-page-FR-012: the email, profiles and every address in the CV document are links; anything without one is plain text', () => {
  test("the real CV's email opens a message, and the GitHub profile links to its address (US1 scenario 9)", async () => {
    const page = await openHtml(realHtml());
    expect(await page.locator('main a[href="mailto:alexprofir512@gmail.com"]').textContent()).toBe('alexprofir512@gmail.com');
    expect(await page.locator('main a[href="https://github.com/alex-profir"]').count()).toBe(1);
  });

  test("every-field.json's basics, profile, work, project and education addresses are links to them", async () => {
    const cv = fixture('every-field');
    const page = await openHtml(renderFixtureHtml(cv));
    for (const url of [cv.basics!.url!, ...cv.basics!.profiles!.map((profile) => profile.url!), cv.work![0]!.url!, cv.projects![0]!.url!, cv.education![0]!.url!]) {
      expect(await page.locator(`main a[href="${url}"]`).count(), url).toBe(1);
    }
    expect(await page.locator(`main a[href="${cv.basics!.url!}"]`).textContent()).toBe('fixture-person.example.org');
  });

  test('a project and a profile with no address are plain text, not links (US1 scenario 12)', async () => {
    const cv = fixture('no-url-no-dates');
    const page = await openHtml(renderFixtureHtml(cv));
    const project = page.locator('main section h3', { hasText: 'Plain Project Name' });
    expect(await project.count()).toBe(1);
    expect(await project.locator('a').count()).toBe(0);
    const profile = page.locator('main .profiles li', { hasText: 'urlless-user' });
    expect(await profile.count()).toBe(1);
    expect(await profile.locator('a').count()).toBe(0);
    expect(await page.locator('main a').count()).toBe(0);
  });

  test('no link opens a new window', async () => {
    for (const html of [realHtml(), renderFixtureHtml(fixture('every-field'))]) {
      const page = await openHtml(html);
      expect(await page.locator('a[target]').count()).toBe(0);
      expect(await page.locator('a:not([href])').count()).toBe(0);
    }
  });
});

describe('004-cv-page-FR-013: every link names its target: a profile its network, an entry link the entry', () => {
  test("the real profile link's accessible name is GitHub: alex-profir", async () => {
    const { url } = await serveBuilt();
    const page = await openPage(`${url}/cv`, { width: 1440 });
    const [link] = await axNodes(page, 'a[href="https://github.com/alex-profir"]');
    expect(link).toMatchObject({ role: 'link', name: 'GitHub: alex-profir' });
  });

  test('a profile with no username is named by its network, and entry links by the entry', async () => {
    const cv = fixture('every-field');
    const { url } = await serveFixture(cv);
    const page = await openPage(`${url}/cv`, { width: 375 });
    const name = async (href: string) => (await axNodes(page, `a[href="${href}"]`))[0]?.name;
    expect(await name('https://network-a.example.org/fixture-user-a')).toBe('FixtureNetworkA: fixture-user-a');
    expect(await name('https://network-b.example.org/profile-b')).toBe('FixtureNetworkB');
    expect(await name('https://work-company.example.org')).toBe('Fixture Work Company');
    expect(await name('https://project.example.org')).toBe('Fixture Project Name');
    expect(await name('https://institution.example.org')).toBe('Fixture Institution');
    expect(await name(`mailto:${cv.basics!.email}`)).toBe(cv.basics!.email);
  });

  test('every link on both pages has a non-empty accessible name', async () => {
    const { url } = await serveBuilt();
    for (const target of ['/cv', '/missing-page']) {
      const page = await openPage(`${url}${target}`, { width: 1440 });
      for (const link of await axNodes(page, 'a[href]')) expect(link.name.trim(), target).not.toBe('');
    }
  });
});
