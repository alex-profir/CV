// The other-sites part (research R17, FR-055, FR-016): every request a page
// and its service worker make, recorded through the context, must go to the
// local server. Any other address is reported in full, and the request is
// stopped before it leaves the browser. `data:` addresses are the page's own.
import type { BrowserContext, Request } from 'playwright';
import type { Problem } from '../report.ts';
import { waitForWorker } from './offline.ts';

const local = (address: string, origin: string) => address.startsWith('data:') || address.startsWith('blob:') || address.startsWith(`${origin}/`) || address === origin;

const source = (request: Request) => (request.serviceWorker() !== null ? 'the service worker' : 'the page');

// Records every request of the context from now on. Requests to another
// origin are aborted.
export async function recordRequests(context: BrowserContext, origin: string): Promise<Map<string, string>> {
  const foreign = new Map<string, string>();
  const note = (request: Request) => {
    const address = request.url();
    if (!local(address, origin) && !foreign.has(address)) foreign.set(address, source(request));
  };
  context.on('request', note);
  await context.route(
    () => true,
    (route) => {
      const request = route.request();
      note(request);
      return local(request.url(), origin) ? route.continue() : route.abort('blockedbyclient');
    },
  );
  return foreign;
}

// Opens `url` in a context recorded by `recordRequests`, waits for the page
// and any service worker it registers to settle, and reports what went to
// another site.
export async function otherSiteProblems(context: BrowserContext, foreign: Map<string, string>, url: string, pageLabel: string, variant: string): Promise<Problem[]> {
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'load' });
  // Pages register their worker after `load`. Once it controls the page,
  // it has installed, so its requests are recorded too.
  await waitForWorker(page);
  await page.waitForLoadState('networkidle');
  return [...foreign].map(([address, from]) => ({ part: 'other-sites' as const, page: pageLabel, variant, type: 'other-site-request', subject: address, detail: `requested by ${from}` }));
}
