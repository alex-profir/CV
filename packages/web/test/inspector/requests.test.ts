// The inspector's requests (FR-028, SC-009): showing every spec view, with
// "What's this?" open, asks nothing of any origin but the site's own.
import { describe, expect, test, vi } from 'vitest';
import { showSpecs, specViewSelector } from '../helpers/inspector.ts';
import type { InspectorView } from '../helpers/inspector.ts';
import { openShell, settle } from '../helpers/shell.ts';
import { serveBuilt } from '../helpers/site.ts';
import { SHELL_PAGE } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 180_000 });

const VIEWS: readonly InspectorView[] = ['cv', 'terminal', 'about'];
const DATA_FILE = /\/assets\/requirements-[0-9a-f]{8}\.json$/;

describe('007-requirement-inspector-FR-028: the inspector requests nothing from another origin (SC-009)', () => {
  for (const shell of ['desktop', 'mobile'] as const) {
    test(`${shell}: / and every spec view, with What's this? open, request only the site's origin, the data file once`, async () => {
      const server = await serveBuilt();
      const requested: string[] = [];
      const page = await openShell({
        ...SHELL_PAGE[shell],
        url: server.url,
        beforeGoto: async (target) => {
          target.on('request', (request) => requested.push(request.url()));
        },
      });
      for (const view of VIEWS) {
        await showSpecs(page, view, shell);
        const button = page.locator(`${specViewSelector(view)} button.whats-this`);
        if (shell === 'desktop') await button.click();
        else await button.tap();
        await settle(page);
      }
      await page.waitForLoadState('networkidle');
      const origin = new URL(server.url).origin;
      const elsewhere = requested.filter((url) => !url.startsWith('data:') && new URL(url).origin !== origin);
      expect(elsewhere).toEqual([]);
      expect(requested.filter((url) => DATA_FILE.test(new URL(url).pathname)).length).toBe(1);
    });
  }
});
