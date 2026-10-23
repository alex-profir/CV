// The site's addresses, against the built site served by the local server
// (contracts/site.md HTTP behavior, research R3).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';
import { describe, expect, test, vi } from 'vitest';
import { builtSite, serveBuilt } from './helpers/site.ts';
import { openPage } from './helpers/browser.ts';

vi.setConfig({ testTimeout: 60_000 });

type Response = { status: number; headers: http.IncomingHttpHeaders; body: Buffer };

// A raw HTTP request, with no redirect following or decompression.
function request(base: string, target: string, { method = 'GET', headers = {} }: { method?: string; headers?: Record<string, string> } = {}): Promise<Response> {
  const { hostname, port } = new URL(base);
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname, port, path: target, method, headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

const builtFile = (file: string) => fs.readFileSync(path.join(builtSite().dir, file));

// Whether a Cache-Control value lets a cache store the response.
const allowsStoring = (value: string | undefined) => value !== undefined && !/no-store/i.test(value);

describe('004-cv-page-FR-017: the CV page answers at /cv, with or without a trailing slash, a query or a fragment', () => {
  test('/cv, /cv/, /cv?x=1 and /cv#a answer 200 with the same page', async () => {
    const { url } = await serveBuilt();
    const page = builtFile('cv.html');
    for (const target of ['/cv', '/cv/', '/cv?x=1', '/cv#a']) {
      const response = await request(url, target);
      expect(response.status, target).toBe(200);
      expect(response.body.equals(page), target).toBe(true);
    }
  });

  test('the page names no canonical address and no og:url', async () => {
    const { url } = await serveBuilt();
    const html = (await request(url, '/cv')).body.toString('utf8');
    expect(html).not.toMatch(/<link\b[^>]*\brel="canonical"/i);
    expect(html).not.toMatch(/og:url/i);
  });
});

describe('004-cv-page-FR-018: the root address leads to /cv with a temporary redirect', () => {
  test('/ answers 307 to /cv, keeping the query string, with no cache header that allows storing', async () => {
    const { url } = await serveBuilt();
    for (const [target, location] of [
      ['/', '/cv'],
      ['/?x=1', '/cv?x=1'],
    ] as const) {
      const response = await request(url, target);
      expect(response.status, target).toBe(307);
      expect(response.headers.location, target).toBe(location);
      expect(allowsStoring(response.headers['cache-control']), target).toBe(false);
    }
  });

  test('a browser opening / ends at /cv', async () => {
    const { url } = await serveBuilt();
    const page = await openPage(`${url}/`, { width: 1440 });
    expect(page.url()).toBe(`${url}/cv`);
  });
});

describe('004-cv-page-FR-019: any other address answers 404 with the not-found page', () => {
  test('/nope, /cv.html and /cv/x answer 404 with 404.html, which links to /cv', async () => {
    const { url } = await serveBuilt();
    const notFound = builtFile('404.html');
    expect(notFound.toString('utf8')).toMatch(/<a\b[^>]*\bhref="\/cv"/);
    for (const target of ['/nope', '/cv.html', '/cv/x']) {
      const response = await request(url, target);
      expect(response.status, target).toBe(404);
      expect(response.body.equals(notFound), target).toBe(true);
    }
  });
});

describe('HTTP behavior (contracts/site.md)', () => {
  test('HEAD /cv answers as GET, with no body', async () => {
    const { url } = await serveBuilt();
    const get = await request(url, '/cv');
    const head = await request(url, '/cv', { method: 'HEAD' });
    expect(head.status).toBe(get.status);
    for (const name of ['content-type', 'cache-control', 'content-length']) expect(head.headers[name], name).toBe(get.headers[name]);
    expect(head.body.length).toBe(0);
  });

  test('POST /cv answers 405 with Allow: GET, HEAD', async () => {
    const { url } = await serveBuilt();
    const response = await request(url, '/cv', { method: 'POST' });
    expect(response.status).toBe(405);
    expect(response.headers.allow).toBe('GET, HEAD');
    expect(response.body.length).toBe(0);
  });

  test('a listed asset is cached for a year as immutable, and HTML is revalidated', async () => {
    const { url } = await serveBuilt();
    const asset = builtSite().manifest.files.find((file) => file.path.startsWith('/assets/'));
    expect(asset).toBeDefined();
    const response = await request(url, asset!.path);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe(asset!.type);
    expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    for (const target of ['/cv', '/nope']) {
      const html = await request(url, target);
      expect(html.headers['content-type'], target).toBe('text/html; charset=utf-8');
      expect(html.headers['cache-control'], target).toBe('no-cache');
    }
  });

  test('HTML is compressed with Brotli when the request accepts it', async () => {
    const { url } = await serveBuilt();
    const response = await request(url, '/cv', { headers: { 'Accept-Encoding': 'br' } });
    expect(response.headers['content-encoding']).toBe('br');
    expect(zlib.brotliDecompressSync(response.body).equals(builtFile('cv.html'))).toBe(true);
  });
});
