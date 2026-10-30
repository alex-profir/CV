// The plain CV page (FR-025): `/cv` stays 004's page, with no "Show specs",
// no spec view and no requirement data, and loads no script but the service
// worker's registration.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { Request } from 'playwright';
import { openPage } from '../helpers/browser.ts';
import { builtSite, serveBuilt } from '../helpers/site.ts';

vi.setConfig({ testTimeout: 120_000 });

const REGISTRATION = /^\/assets\/register-sw-[\w-]{8}\.js$/;

const cvHtml = () => {
  const site = builtSite();
  const page = site.manifest.routes.pages.find((candidate) => candidate.path === '/cv');
  if (page === undefined) throw new Error('the route table has no /cv page');
  return fs.readFileSync(path.join(site.dir, page.file), 'utf8');
};

describe('007-requirement-inspector-FR-025: /cv stays the plain page, with no inspector', () => {
  test('its HTML holds no show-specs, spec-view or data-requirements, and names no script but the registration', () => {
    const html = cvHtml();
    for (const word of ['show-specs', 'spec-view', 'data-requirements', 'requirements-']) expect(html.includes(word), word).toBe(false);
    const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map(([tag]) => /\bsrc="([^"]*)"/.exec(tag)?.[1] ?? 'inline');
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toMatch(REGISTRATION);
  });

  test('loaded in a browser, it asks for no script but the registration and no requirement data, and shows no inspector', async () => {
    const { url } = await serveBuilt();
    const requests: { path: string; type: string }[] = [];
    const page = await openPage(`${url}/cv`, {
      width: 1440,
      height: 900,
      beforeGoto: async (target) => {
        target.on('request', (request: Request) => requests.push({ path: new URL(request.url()).pathname, type: request.resourceType() }));
      },
    });
    await page.waitForLoadState('networkidle');
    const scripts = requests.filter((request) => request.type === 'script').map((request) => request.path);
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toMatch(REGISTRATION);
    expect(requests.filter((request) => /\/assets\/requirements-/.test(request.path))).toEqual([]);
    expect(await page.locator('.show-specs, .spec-view, [data-requirements], [data-req*="007-requirement-inspector-"]').count()).toBe(0);
    expect(await page.locator('main h1').count()).toBe(1);
  });
});
