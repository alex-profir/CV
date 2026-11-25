// Writes the interim local mockup of 011's one new element, the download row in /cv's intro, from the
// real /cv page: it serves the built site (`npm run build` first), adds the row as the feature would
// render it, and saves each state as a script-free page beside its PNG. The pages read the site's own
// style sheets and fonts, copied into assets/. Run with `node specs/011-cv-pdf/design/mockup/build.mjs`.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(here, '../../../../packages/web/dist/site');
const assets = path.join(here, 'assets');
fs.mkdirSync(assets, { recursive: true });

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/cv') p = '/cv.html';
  const file = path.join(site, p);
  if (!file.startsWith(site) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

// The row as 011 renders it: a contact row after the profiles, a site element, with a downward arrow.
const ROW = `<div class="contact-row download" data-site-element="">
  <span class="contact-label" aria-hidden="true">CV</span>
  <a class="contact-link" href="/cv.pdf" download="Alex-Profir-CV.pdf">Download PDF<svg class="arrow arrow-down" aria-hidden="true" focusable="false" viewBox="0 0 10 10" fill="none" stroke="currentColor"><path d="M5 1v8M1.5 5.5 5 9l3.5-3.5"></path></svg></a>
</div>`;

const STATES = [
  { name: 'desktop-1-intro', width: 1440, height: 900 },
  { name: 'desktop-2-link-focused', width: 1440, height: 900, focus: true },
  { name: 'phone-1-intro', width: 375, height: 812 },
  { name: 'phone-2-intro-narrow', width: 320, height: 568 },
];

const browser = await chromium.launch();
for (const state of STATES) {
  const page = await browser.newPage({ viewport: { width: state.width, height: state.height } });
  await page.route('**/sw.js', (route) => route.abort());
  await page.goto(`${origin}/cv`, { waitUntil: 'networkidle' });
  await page.evaluate((row) => {
    for (const s of document.querySelectorAll('script')) s.remove();
    document.querySelector('.contact-block').insertAdjacentHTML('beforeend', row);
  }, ROW);
  await page.locator('.download a').scrollIntoViewIfNeeded();
  if (state.focus) await page.locator('.download a').focus();
  const html = (await page.content()).replace(/(href|src)="\/assets\/([^"]+)"/g, '$1="assets/$2"');
  fs.writeFileSync(path.join(here, `${state.name}.html`), html);
  await page.screenshot({ path: path.join(here, `${state.name}-${state.width}.png`) });
  await page.close();
}
for (const file of fs.readdirSync(path.join(site, 'assets'))) {
  if (/\.(css|woff2)$/.test(file)) fs.copyFileSync(path.join(site, 'assets', file), path.join(assets, file));
}
// Style sheets name their fonts from the site root; the copies read them from beside themselves.
for (const file of fs.readdirSync(assets).filter((f) => f.endsWith('.css'))) {
  const p = path.join(assets, file);
  fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replaceAll('/assets/', ''));
}
await browser.close();
server.close();
