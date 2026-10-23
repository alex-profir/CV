// The only place a Chromium is launched for Playwright (research R17). Every
// browser the tests and the site check start gets the two isolation flags,
// so it can reach 127.0.0.1 and nothing else, not even by IP address.
import fs from 'node:fs';
import { chromium } from 'playwright';
import type { Browser } from 'playwright';

export const ISOLATION_ARGS = ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1', '--proxy-server=127.0.0.1:9'];

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
