// The first load with the inspector (FR-005, FR-015): the CV opens showing
// the CV with only "Show specs" added, nothing of the inspector appears by
// itself, and the requirement data waits until the shell is ready, never in
// the page or the shell's script.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { Page, Request } from 'playwright';
import { inlineText, requirementData, viewSelector } from '../helpers/inspector.ts';
import { openShell, openShellHeld, settle } from '../helpers/shell.ts';
import { builtSite } from '../helpers/site.ts';
import { SHELL_PAGE } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 180_000 });

const CV = viewSelector('cv', 'desktop');
const DATA_FILE = /\/assets\/requirements-[0-9a-f]{8}\.json$/;

// Every inspector element but "Show specs": anything carrying one of 007's
// requirements, and every part of a spec view, the title suffix and any
// tooltip.
const OTHER_INSPECTOR =
  '[data-req*="007-requirement-inspector-"]:not(button.show-specs), .spec-view, .spec-bar, .spec-back, .whats-this, .whats-this-panel, .spec-heading, .spec-note, .title-suffix, [role="tooltip"]';

const otherInspector = (page: Page) =>
  page.evaluate((selector) => [...document.querySelectorAll(selector)].map((element) => `${element.tagName.toLowerCase()}.${String(element.className)}`), OTHER_INSPECTOR);

// Watches the page for `ms`: every element added, and every inspector
// element but "Show specs" seen at any moment.
function watch(page: Page, ms: number): Promise<{ added: string[]; inspector: string[] }> {
  return page.evaluate(
    ({ selector, ms }) =>
      new Promise<{ added: string[]; inspector: string[] }>((resolve) => {
        const added: string[] = [];
        const inspector = new Set<string>();
        const name = (element: Element) => `${element.tagName.toLowerCase()}.${String(element.className)}`;
        const look = () => {
          for (const element of document.querySelectorAll(selector)) inspector.add(name(element));
        };
        const observer = new MutationObserver((records) => {
          for (const record of records) for (const node of record.addedNodes) if (node instanceof Element) added.push(name(node));
          look();
        });
        observer.observe(document, { subtree: true, childList: true, attributes: true });
        look();
        setTimeout(() => {
          observer.disconnect();
          look();
          resolve({ added, inspector: [...inspector] });
        }, ms);
      }),
    { selector: OTHER_INSPECTOR, ms },
  );
}

describe('007-requirement-inspector-FR-005: the CV opens showing the CV, with nothing of the inspector but "Show specs"', () => {
  test('at 1440 the CV window shows the CV and one Show specs, and nothing else of the inspector appears within 10 s', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    expect(await page.locator(`${CV} .cv h1`).isVisible()).toBe(true);
    expect(await page.locator('#os button.show-specs').count()).toBe(1);
    expect(await page.locator(`${CV} .title-bar button.show-specs`).isVisible()).toBe(true);
    expect(await otherInspector(page)).toEqual([]);
    expect((await watch(page, 10_000)).inspector).toEqual([]);
    expect(await page.locator(`${CV} .cv h1`).isVisible()).toBe(true);
  });

  test('hovering and focusing Show specs adds no element, and it has no title or tooltip', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    const control = page.locator(`${CV} button.show-specs`);
    // No `title` on it or inside it, and no SVG title element.
    expect(await control.evaluate((button) => button.hasAttribute('title') || button.querySelector('[title], title') !== null)).toBe(false);
    const watching = watch(page, 2_000);
    await control.hover();
    await page.waitForTimeout(800);
    await control.focus();
    await page.keyboard.press('Shift');
    const { added, inspector } = await watching;
    expect(added).toEqual([]);
    expect(inspector).toEqual([]);
    expect(await page.locator('[role="tooltip"]').count()).toBe(0);
  });

  test('at 375 the home screen shows as 005 sets, with nothing of the inspector', async () => {
    const page = await openShell(SHELL_PAGE.mobile);
    await settle(page);
    expect(await page.locator('#os .home').isVisible()).toBe(true);
    expect(await page.locator('#os .full-screen').count()).toBe(0);
    expect(await page.locator('#os button.show-specs').count()).toBe(0);
    expect(await otherInspector(page)).toEqual([]);
  });
});

describe('007-requirement-inspector-FR-015: the requirement data waits for the shell, and is in neither the page nor its script', () => {
  test('the data file is requested once, and only once #os[data-ready] is set', async () => {
    const requests: { url: string; at: number }[] = [];
    const { page, release } = await openShellHeld({
      ...SHELL_PAGE.desktop,
      beforeGoto: async (target) => {
        target.on('request', (request: Request) => requests.push({ url: request.url(), at: Date.now() }));
        // When `data-ready` is set, and for each fetch whether it was set
        // then, on the page's own clock.
        await target.addInitScript(() => {
          const log = { readyAt: null as number | null, fetches: [] as { url: string; at: number; ready: boolean }[] };
          (window as unknown as { inspectorLog: typeof log }).inspectorLog = log;
          new MutationObserver(() => {
            if (log.readyAt === null && document.querySelector('#os[data-ready]') !== null) log.readyAt = performance.now();
          }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-ready'] });
          const original = window.fetch;
          window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
            log.fetches.push({ url, at: performance.now(), ready: document.querySelector('#os[data-ready]') !== null });
            return original(input, init);
          };
        });
      },
    });
    // While the shell's script is held, the page is parsed and painted, and
    // nothing asks for the data.
    await page.waitForTimeout(1_000);
    expect(requests.filter((request) => DATA_FILE.test(request.url))).toEqual([]);
    const readyRequested = Date.now();
    await release();
    await expect.poll(() => requests.filter((request) => DATA_FILE.test(request.url)).length, { timeout: 15_000 }).toBe(1);
    expect(requests.find((request) => DATA_FILE.test(request.url))!.at).toBeGreaterThanOrEqual(readyRequested);
    const log = await page.evaluate(() => (window as unknown as { inspectorLog: { readyAt: number | null; fetches: { url: string; at: number; ready: boolean }[] } }).inspectorLog);
    expect(log.readyAt).not.toBeNull();
    const fetches = log.fetches.filter((entry) => DATA_FILE.test(new URL(entry.url, 'http://localhost').pathname));
    expect(fetches).toHaveLength(1);
    expect(fetches[0]!.ready).toBe(true);
    // The resource timing agrees: the request started after the shell was ready.
    const started = await page.evaluate(() => performance.getEntriesByType('resource').filter((entry) => /\/assets\/requirements-[0-9a-f]{8}\.json$/.test(entry.name)).map((entry) => entry.startTime));
    expect(started).toHaveLength(1);
    expect(started[0]!).toBeGreaterThanOrEqual(log.readyAt! - 1);
    // The page names the file it fetched.
    expect(await page.locator('#os').getAttribute('data-requirements')).toMatch(DATA_FILE);
  });

  test('neither index.html nor the os script holds any listed requirement\'s text', () => {
    const site = builtSite();
    const data = requirementData(site);
    const index = fs.readFileSync(path.join(site.dir, 'index.html'), 'utf8');
    const script = fs.readdirSync(path.join(site.dir, 'assets')).find((name) => /^os-[\w-]{8}\.js$/.test(name));
    expect(script).toBeDefined();
    const os = fs.readFileSync(path.join(site.dir, 'assets', script!), 'utf8');
    const html = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
    const listed = [...new Set(Object.values(data.views).flat())];
    expect(listed.length).toBeGreaterThan(0);
    for (const id of listed) {
      const text = inlineText(data.requirements[id]!.text);
      for (const form of new Set([text, html(text), JSON.stringify(text).slice(1, -1)])) {
        expect(index.includes(form), `${id} in index.html`).toBe(false);
        expect(os.includes(form), `${id} in ${script}`).toBe(false);
      }
    }
  });
});
