// Opens pages in Chromium for page tests (004 research R21). One browser per
// test file, launched by the site check's launcher with its isolation flags
// (research R17), and closed after the file. Each page gets its own context,
// closed when the current test finishes.
import { afterAll, onTestFinished } from 'vitest';
import type { Browser, BrowserContextOptions, Page } from 'playwright';
import { launchChromium } from '../../../../tools/site-check/src/browser.ts';

export type OpenPageOptions = {
  width: number;
  height?: number;
  deviceScaleFactor?: number;
  javaScriptEnabled?: boolean;
  forcedColors?: BrowserContextOptions['forcedColors'];
  reducedMotion?: BrowserContextOptions['reducedMotion'];
  colorScheme?: BrowserContextOptions['colorScheme'];
  serviceWorkers?: BrowserContextOptions['serviceWorkers'];
  media?: 'screen' | 'print';
};

let browser: Promise<Browser> | undefined;

afterAll(async () => {
  if (browser !== undefined) await (await browser).close();
  browser = undefined;
}, 60_000);

// A new page at `url`, loaded. Call it inside a test.
export async function openPage(url: string, options: OpenPageOptions): Promise<Page> {
  browser ??= launchChromium();
  const { width, height = 900, deviceScaleFactor, javaScriptEnabled, forcedColors, reducedMotion, colorScheme, serviceWorkers, media } = options;
  const context = await (await browser).newContext({
    viewport: { width, height },
    ...(deviceScaleFactor === undefined ? {} : { deviceScaleFactor }),
    ...(javaScriptEnabled === undefined ? {} : { javaScriptEnabled }),
    ...(forcedColors === undefined ? {} : { forcedColors }),
    ...(reducedMotion === undefined ? {} : { reducedMotion }),
    ...(colorScheme === undefined ? {} : { colorScheme }),
    ...(serviceWorkers === undefined ? {} : { serviceWorkers }),
  });
  onTestFinished(() => context.close());
  const page = await context.newPage();
  if (media !== undefined) await page.emulateMedia({ media });
  await page.goto(url);
  return page;
}

// A page holding `html`, with scripting off, for reading the markup of a
// rendered string. Asset links don't load: nothing is served.
export async function openHtml(html: string, { width = 1440 }: { width?: number } = {}): Promise<Page> {
  browser ??= launchChromium();
  const context = await (await browser).newContext({ viewport: { width, height: 900 }, javaScriptEnabled: false });
  onTestFinished(() => context.close());
  const page = await context.newPage();
  await page.setContent(html);
  return page;
}
