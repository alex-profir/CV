// Another site for the Playground's tests (008 research R25): a second local
// server, addressed as `localhost` while the site is `127.0.0.1`, so the
// browser treats it as a different site. It answers every request with CORS,
// can answer slowly, can serve fixed pages, and records each request with its
// headers. It binds 127.0.0.1 only, as the site's server does.
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { onTestFinished } from 'vitest';

export type RecordedRequest = { method: string; path: string; headers: http.IncomingHttpHeaders; body: string };

export type OtherSiteOptions = {
  // Milliseconds before each answer: 0 by default.
  delay?: number;
  // Pages served as HTML by path, such as a fixture page; every other path
  // answers `{"ok":true}` as JSON.
  pages?: Record<string, string>;
  // The name the URL uses: `localhost` by default, the other site. A fixture
  // page that stands for the site itself uses `127.0.0.1`.
  name?: 'localhost' | '127.0.0.1';
};

export type OtherSite = {
  // `http://localhost:<port>` (or the name asked for), with no final slash.
  url: string;
  // Every request so far, in order. Preflights included.
  requests: RecordedRequest[];
  close: () => Promise<void>;
};

function answer(request: http.IncomingMessage, response: http.ServerResponse, pages: Record<string, string>): void {
  response.setHeader('access-control-allow-origin', '*');
  response.setHeader('access-control-allow-headers', '*');
  response.setHeader('access-control-allow-methods', '*');
  response.setHeader('cache-control', 'no-store');
  const page = pages[new URL(request.url ?? '/', 'http://localhost').pathname];
  if (page !== undefined) {
    response.setHeader('content-type', 'text/html; charset=utf-8');
    response.end(page);
    return;
  }
  response.setHeader('content-type', 'application/json');
  response.end(request.method === 'OPTIONS' ? '' : '{"ok":true}');
}

// Starts the other site, closed when the current test finishes. Call it
// inside a test.
export async function startOtherSite({ delay = 0, pages = {}, name = 'localhost' }: OtherSiteOptions = {}): Promise<OtherSite> {
  const requests: RecordedRequest[] = [];
  const server = http.createServer((request, response) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk: string) => (body += chunk));
    request.on('end', () => {
      requests.push({ method: request.method ?? 'GET', path: request.url ?? '/', headers: request.headers, body });
      setTimeout(() => answer(request, response, pages), delay);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const close = () =>
    new Promise<void>((resolve) => {
      server.closeAllConnections();
      server.close(() => resolve());
    });
  onTestFinished(close);
  return { url: `http://${name}:${(server.address() as AddressInfo).port}`, requests, close };
}
