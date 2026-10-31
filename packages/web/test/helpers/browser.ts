// Opens pages in Chromium for page tests (004 research R21). One browser per
// test file, launched by the site check's launcher with its isolation flags
// (research R17), and closed after the file. Each page gets its own context,
// closed when the current test finishes. The Playground's engine-dependent
// tests may ask for Firefox or WebKit instead (008 research R25), launched by
// Playwright with no flags: those engines take none of Chromium's.
import { afterAll, onTestFinished } from 'vitest';
import { firefox, webkit } from 'playwright';
import type { Browser, BrowserContextOptions, Page } from 'playwright';
import { launchChromium } from '../../../../tools/site-check/src/browser.ts';

export type Engine = 'chromium' | 'firefox' | 'webkit';

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
  hasTouch?: boolean;
  userAgent?: string;
  // Permissions granted to the page's origin, such as `clipboard-read`.
  permissions?: string[];
  // Chromium by default.
  engine?: Engine;
  // Runs on the new page before it navigates: routes, CDP sessions.
  beforeGoto?: (page: Page) => Promise<void>;
  // When `goto` returns: 'load' by default.
  waitUntil?: 'commit' | 'domcontentloaded' | 'load';
};

const browsers = new Map<Engine, Promise<Browser>>();

const LAUNCH: Record<Engine, () => Promise<Browser>> = {
  chromium: launchChromium,
  firefox: () => firefox.launch(),
  webkit: () => webkit.launch(),
};

function launched(engine: Engine): Promise<Browser> {
  let browser = browsers.get(engine);
  if (browser === undefined) browsers.set(engine, (browser = LAUNCH[engine]()));
  return browser;
}

afterAll(async () => {
  for (const browser of browsers.values()) await (await browser).close();
  browsers.clear();
}, 60_000);

// A new page at `url`, loaded. Call it inside a test.
export async function openPage(url: string, options: OpenPageOptions): Promise<Page> {
  const { width, height = 900, deviceScaleFactor, javaScriptEnabled, forcedColors, reducedMotion, colorScheme, serviceWorkers, media, hasTouch, userAgent, permissions, engine = 'chromium', beforeGoto, waitUntil } = options;
  const context = await (await launched(engine)).newContext({
    viewport: { width, height },
    ...(deviceScaleFactor === undefined ? {} : { deviceScaleFactor }),
    ...(javaScriptEnabled === undefined ? {} : { javaScriptEnabled }),
    ...(forcedColors === undefined ? {} : { forcedColors }),
    ...(reducedMotion === undefined ? {} : { reducedMotion }),
    ...(colorScheme === undefined ? {} : { colorScheme }),
    ...(serviceWorkers === undefined ? {} : { serviceWorkers }),
    ...(hasTouch === undefined ? {} : { hasTouch }),
    ...(userAgent === undefined ? {} : { userAgent }),
    ...(permissions === undefined ? {} : { permissions }),
  });
  onTestFinished(() => context.close());
  const page = await context.newPage();
  if (media !== undefined) await page.emulateMedia({ media });
  await beforeGoto?.(page);
  await page.goto(url, waitUntil === undefined ? {} : { waitUntil });
  return page;
}

// A page holding `html`, with scripting off, for reading the markup of a
// rendered string. Asset links don't load: nothing is served.
export async function openHtml(html: string, { width = 1440 }: { width?: number } = {}): Promise<Page> {
  const context = await (await launched('chromium')).newContext({ viewport: { width, height: 900 }, javaScriptEnabled: false });
  onTestFinished(() => context.close());
  const page = await context.newPage();
  await page.setContent(html);
  return page;
}
