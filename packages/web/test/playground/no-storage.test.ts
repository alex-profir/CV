// A browser that can't keep TypeScript (spec US1): with Cache Storage
// refusing, the Playground still opens online and works, and says it will
// download again on each visit.
import { describe, expect, test, vi } from 'vitest';
import { siteText } from '../../src/site-text.ts';
import { editorText, freshProfile, MESSAGE, openPlayground, setCode, waitChecked, waitForCode, waitReady } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

describe('008-typescript-playground-FR-014: without Cache Storage the Playground opens online and says it can\'t keep TypeScript', () => {
  test('with caches.open throwing, the editor works and the cantKeepTypeScript message shows', async () => {
    const page = await freshProfile({
      beforeGoto: async (target) => {
        await target.addInitScript(() => {
          CacheStorage.prototype.open = () => Promise.reject(new DOMException('The operation is insecure.', 'SecurityError'));
        });
      },
    });
    await openPlayground(page);
    await waitReady(page);
    await expect.poll(async () => (await page.locator(MESSAGE).textContent())?.trim() ?? '').toContain(siteText.playground.messages.cantKeepTypeScript);
    const code = 'const total: number = 1 + 2;';
    await setCode(page, code);
    await waitForCode(page, code);
    await waitChecked(page);
    expect(await editorText(page)).toBe(code);
  });
});
