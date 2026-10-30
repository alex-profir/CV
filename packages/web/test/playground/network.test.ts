// Requests from the code (spec US2): to any site, with an opaque origin and
// none of the site's cookies; offline they fail and the code sees why.
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { startOtherSite } from '../helpers/other-site.ts';
import type { OtherSite } from '../helpers/other-site.ts';
import { openPlaygroundPage, readLogs, run, setCode, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

let other: OtherSite | null = null;
afterEach(async () => {
  await other?.close();
  other = null;
});

const fetchCode = (url: string) => `try {
  const reply = await fetch(${JSON.stringify(url)});
  console.log("reply", reply.status, await reply.text());
} catch (error) {
  console.log("failed", (error as Error).name);
}`;

async function runCode(page: Page, code: string): Promise<string[]> {
  await setCode(page, code);
  await waitForCode(page, code.split('\n')[0]!);
  await waitChecked(page);
  await run(page);
  return (await readLogs(page)).filter((row) => row.level === 'log').map((row) => row.text);
}

describe("008-typescript-playground-FR-041: the code's requests carry no origin or cookies of the site's", () => {
  test('a fetch to another site arrives with Origin null and no Cookie, and the code logs the reply', async () => {
    other = await startOtherSite({ pages: { '/hello': 'hello from the other site' } });
    const page = await openPlaygroundPage();
    await page.evaluate(() => (document.cookie = 'site=kept; path=/'));
    expect(await runCode(page, fetchCode(`${other.url}/hello`))).toEqual(['reply 200 hello from the other site']);
    const request = other.requests.find((entry) => entry.path === '/hello');
    expect(request?.headers['origin']).toBe('null');
    expect(request?.headers['cookie']).toBeUndefined();
  });

  // Playwright's offline switch doesn't reach the sandboxed frame's worker,
  // so the network is cut where the request goes: the other site is down.
  test('offline, the request fails and the code logs the error', async () => {
    const down = await startOtherSite();
    const url = `${down.url}/hello`;
    await down.close();
    const page = await openPlaygroundPage();
    await page.context().setOffline(true);
    expect(await runCode(page, fetchCode(url))).toEqual(['failed TypeError']);
    await page.context().setOffline(false);
  });
});
