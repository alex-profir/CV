// The only place a Chromium is launched for Playwright (research R17). Every
// browser the tests and the site check start gets the two isolation flags,
// so it can reach 127.0.0.1 and nothing else, not even by IP address. The
// name `localhost` resolves too, still to this machine only: the Playground's
// tests use it as another site beside 127.0.0.1 (008 research R25).
import fs from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import type { Browser } from 'playwright';

export const ISOLATION_ARGS = ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost', '--proxy-server=127.0.0.1:9'];

export function launchChromium(): Promise<Browser> {
  return chromium.launch({ args: ISOLATION_ARGS });
}

// Playwright's Chromium, for Lighthouse's chrome-launcher, which must pass
// ISOLATION_ARGS too.
export function chromiumPath(): string {
  return chromium.executablePath();
}

// Whether Playwright's Chromium is installed (the CLI exits 2 when it isn't).
export function hasChromium(): boolean {
  try {
    return fs.existsSync(chromiumPath());
  } catch {
    return false;
  }
}

// Whether Playwright's Firefox and WebKit are installed, for the Playground's
// tests in other engines (008 research R25), which only the local full run
// starts.
export function hasOtherEngines(): boolean {
  try {
    return fs.existsSync(firefox.executablePath()) && fs.existsSync(webkit.executablePath());
  } catch {
    return false;
  }
}
