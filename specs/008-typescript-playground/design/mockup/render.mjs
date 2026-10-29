// Renders the mockup's PNG exports at 1× scale (see README.md). It serves
// the repository on a free local port, so the pages read the site's style
// sheets, tokens and fonts by their relative paths. The CV window frames
// the built /cv from `npm run serve` on 127.0.0.1:4173.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../..');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  const file = path.join(repo, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(repo) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}/${path.relative(repo, here)}`;

const sizes = { desktop: [[1440, 900, '1440']], phone: [[375, 812, '375']] };
const extra = {
  'phone-2-best-on-desktop': [[320, 568, '320'], [812, 375, 'landscape-812']],
  'phone-3-shared-link': [[320, 568, '320']],
};
const only = process.argv.slice(2);
const pages = fs.readdirSync(here).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5))
  .filter((name) => only.length === 0 || only.some((o) => name.includes(o)));

const browser = await chromium.launch();
for (const name of pages) {
  const shell = name.startsWith('phone') ? 'phone' : 'desktop';
  for (const [width, height, label] of [...sizes[shell], ...(extra[name] ?? [])]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`${base}/${name}.html`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(here, `${name}-${label}.png`) });
    await page.close();
  }
}
await browser.close();
server.close();
console.log(`Rendered ${pages.length} pages`);
