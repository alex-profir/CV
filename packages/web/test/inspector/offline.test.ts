// The inspector offline (FR-026, FR-027, SC-008): after one visit to `/`,
// or to `/cv` only, every spec view shows offline as it did online, in the
// site's fonts, with a note that the links need a connection; the note
// follows the connection; and with nothing stored and the network gone, the
// view still shows what it can, then its groups once the data comes.
import { describe, expect, test, vi } from 'vitest';
import type { BrowserContext, Page } from 'playwright';
import fonts from '../../src/fonts/fonts.json' with { type: 'json' };
import { siteText } from '../../src/site-text.ts';
import { unservedFonts } from '../../../../tools/site-check/src/parts/fonts.ts';
import { waitForWorker } from '../../../../tools/site-check/src/parts/offline.ts';
import { leaveSpecs, showSpecs, specViewSelector, viewSelector } from '../helpers/inspector.ts';
import type { InspectorShell, InspectorView } from '../helpers/inspector.ts';
import { firstPage, goOffline, switchableServer } from '../helpers/offline.ts';
import { openShell, PHONE_USER_AGENT, settle, waitForReady } from '../helpers/shell.ts';
import { builtSite } from '../helpers/site.ts';
import { SHELL_PAGE } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 300_000 });

const FAMILIES = fonts.families.map((entry) => entry.family);
const VIEWS: readonly InspectorView[] = ['cv', 'terminal', 'about'];
const DATA_FILE = /\/assets\/requirements-[0-9a-f]{8}\.json$/;
const text = siteText.inspector;

const SIZES = [
  { shell: 'mobile', width: 375, height: 812 },
  { shell: 'desktop', width: 1440, height: 900 },
] as const;

// A view's text, with the offline note left out.
const viewText = (page: Page, view: InspectorView) =>
  page.locator(specViewSelector(view)).evaluate((element) => {
    const copy = element.cloneNode(true) as Element;
    copy.querySelector('.note-offline')?.remove();
    return (copy.textContent ?? '').replace(/\s+/g, ' ').trim();
  });

const noteText = async (page: Page, view: InspectorView) => {
  const note = page.locator(`${specViewSelector(view)} p.note-offline`);
  return (await note.count()) === 0 ? null : (await note.innerText()).replace(/\s+/g, ' ').trim();
};

// `/` in a new page of the context, at a size, ready.
async function openRoot(context: BrowserContext, url: string, size: (typeof SIZES)[number]): Promise<Page> {
  const page = await context.newPage();
  await page.setViewportSize({ width: size.width, height: size.height });
  await page.goto(`${url}/`, { waitUntil: 'load' });
  await waitForReady(page);
  return page;
}

// Each view's text, its offline note and whether its fonts are served,
// shown in turn in a fresh page.
async function readViews(context: BrowserContext, url: string, size: (typeof SIZES)[number]) {
  const found = new Map<InspectorView, { text: string; note: string | null; unserved: unknown[] }>();
  for (const view of VIEWS) {
    const page = await openRoot(context, url, size);
    await showSpecs(page, view, size.shell);
    found.set(view, { text: await viewText(page, view), note: await noteText(page, view), unserved: await unservedFonts(page, FAMILIES) });
    await page.close();
  }
  return found;
}

describe('007-requirement-inspector-FR-026: every spec view works offline after one visit (SC-008)', () => {
  for (const first of ['/', '/cv']) {
    test(`after one visit to ${first} only, each view at 375 and 1440 px shows offline what it showed online, in the site's fonts`, async () => {
      const server = await switchableServer();
      await server.serve(builtSite());
      const page = await firstPage(`${server.url}${first}`, { hasTouch: true, userAgent: PHONE_USER_AGENT });
      expect(await waitForWorker(page)).toBe(true);
      const online = new Map<string, Awaited<ReturnType<typeof readViews>>>();
      for (const size of SIZES) online.set(size.shell, await readViews(page.context(), server.url, size));
      await server.close();
      await goOffline(page.context());
      for (const size of SIZES) {
        const offline = await readViews(page.context(), server.url, size);
        for (const view of VIEWS) {
          const where = `${first} ${size.shell} ${view}`;
          const before = online.get(size.shell)!.get(view)!;
          const after = offline.get(view)!;
          expect(before.text.length, where).toBeGreaterThan(200);
          expect(after.text, where).toBe(before.text);
          expect(before.note, `${where}: no offline note online`).toBeNull();
          // FR-027: offline, the note says the links need a connection.
          expect(after.note, where).toBe(text.offline);
          expect(after.unserved, where).toEqual([]);
        }
      }
    });
  }
});

describe('007-requirement-inspector-FR-027: offline, the view says its links need a connection', () => {
  test('the note comes and goes with the connection while the view is open, and is never a live region', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await showSpecs(page, 'cv', 'desktop');
    const note = page.locator(`${specViewSelector('cv')} p.note-offline`);
    expect(await note.count()).toBe(0);
    await page.context().setOffline(true);
    await note.waitFor({ state: 'visible' });
    expect((await note.innerText()).replace(/\s+/g, ' ').trim()).toBe(text.offline);
    expect(await note.getAttribute('aria-live')).toBeNull();
    expect(await note.getAttribute('role')).toBeNull();
    expect(await note.locator('svg[aria-hidden="true"]').count()).toBe(1);
    await page.context().setOffline(false);
    await note.waitFor({ state: 'detached' });
    await page.context().setOffline(true);
    await note.waitFor({ state: 'visible' });
    await page.context().setOffline(false);
  });

  test('with storage blocked and the network gone after load, the view shows its bar, heading, lede and the note, with no groups and no error; online again, Show specs shows the groups', async () => {
    let blocked = true;
    const errors: string[] = [];
    const page = await openShell({
      ...SHELL_PAGE.desktop,
      serviceWorkers: 'block',
      beforeGoto: async (target) => {
        target.on('pageerror', (error) => errors.push(error.message));
        await target.addInitScript(() => {
          // Storage is blocked: every Web Storage call throws.
          for (const name of ['localStorage', 'sessionStorage'] as const) {
            Object.defineProperty(window, name, {
              get() {
                throw new DOMException('Storage is blocked', 'SecurityError');
              },
            });
          }
        });
        await target.route(DATA_FILE, async (route) => {
          if (blocked) await route.abort('internetdisconnected');
          else await route.continue();
        });
      },
    });
    await page.context().setOffline(true);
    await page.locator(`${viewSelector('cv', 'desktop')} button.show-specs`).click();
    const view = specViewSelector('cv');
    await page.locator(`${view} p.note-offline`).waitFor({ state: 'visible' });
    await settle(page);
    expect(await page.locator(`${view} .spec-bar`).isVisible()).toBe(true);
    expect(await page.locator(`${view} h1.spec-heading`).isVisible()).toBe(true);
    expect(await page.locator(`${view} p.spec-lede`).isVisible()).toBe(true);
    expect(await page.locator(`${view} section.spec-group`).count()).toBe(0);
    expect(await page.locator('#os [role="alert"]').count()).toBe(0);
    expect(errors).toEqual([]);

    await leaveSpecs(page, 'cv', 'desktop');
    blocked = false;
    await page.context().setOffline(false);
    await showSpecs(page, 'cv', 'desktop');
    expect(await page.locator(`${view} section.spec-group`).count()).toBeGreaterThan(0);
    expect(await page.locator(`${view} p.note-offline`).count()).toBe(0);
    expect(errors).toEqual([]);
  });
});
