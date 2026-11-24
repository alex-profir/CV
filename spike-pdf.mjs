// Throwaway spike: can Vercel's build image run Playwright Chromium and print /cv to PDF?
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('packages/web/dist/site');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/cv' || p === '/cv/') p = '/cv.html';
  const file = path.join(root, p);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const t0 = Date.now();
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${server.address().port}/cv`, { waitUntil: 'networkidle' });
await page.pdf({ path: path.join(root, 'cv.pdf'), format: 'A4', tagged: true, outline: true, printBackground: false });
await browser.close();
server.close();
console.log(`spike: cv.pdf ${fs.statSync(path.join(root, 'cv.pdf')).size} bytes in ${Date.now() - t0} ms`);
