// The local server (004 research R3, contracts/site.md HTTP behavior). It
// serves a built site by its manifest and nothing else: it never maps a path
// to a file on its own, so `/cv.html` is not found. It binds 127.0.0.1 only.
//
// Run as a script, it's `npm run serve`: the site in `packages/web/dist/` on
// `PORT` or 4173.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import zlib from 'node:zlib';
import { resolveRoute } from '../../../packages/web/src/routes.ts';
import type { SiteManifest } from '../../../packages/web/src/routes.ts';

export type RunningServer = { url: string; close: () => Promise<void> };

const HOST = '127.0.0.1';

const HTML_TYPE = 'text/html; charset=utf-8';

const NO_CACHE = 'no-cache';

const IMMUTABLE = 'public, max-age=31536000, immutable';

type Answer = { status: number; headers: Record<string, string>; body: Buffer | null; compressible: boolean };

function isText(type: string): boolean {
  return /^text\/|^application\/(?:json|javascript)|^image\/svg\+xml/.test(type);
}

// The encoding to send, from the request's Accept-Encoding: Brotli, then
// gzip, skipping any the request refuses with `q=0`.
function chooseEncoding(header: string | undefined): 'br' | 'gzip' | null {
  if (header === undefined) return null;
  const accepted = new Set<string>();
  for (const part of header.split(',')) {
    const [name = '', ...params] = part.trim().toLowerCase().split(';');
    const q = params.map((param) => param.trim()).find((param) => param.startsWith('q='));
    if (q !== undefined && Number(q.slice(2)) === 0) continue;
    accepted.add(name.trim());
  }
  if (accepted.has('br')) return 'br';
  if (accepted.has('gzip')) return 'gzip';
  return null;
}

const brotli = promisify(zlib.brotliCompress);
const gzip = promisify(zlib.gzip);

// Compressed bodies, by their content, for every server on the machine. Brotli
// takes over 20 s on the Playground's largest file, and each test file starts
// a server, so it's done once, and never on the event loop: this process also
// answers the other requests, and drives the browser in the tests.
const COMPRESSED_DIR = path.join(os.tmpdir(), 'cv-site-check-compressed');

async function compressedOnce(body: Buffer, encoding: 'br' | 'gzip'): Promise<Buffer> {
  const file = path.join(COMPRESSED_DIR, `${createHash('sha256').update(body).digest('hex')}.${encoding}`);
  try {
    return await fs.promises.readFile(file);
  } catch {
    // Not there yet.
  }
  const made = await (encoding === 'br' ? brotli(body) : gzip(body));
  try {
    await fs.promises.mkdir(COMPRESSED_DIR, { recursive: true });
    // Whole or not at all, as another server may be reading.
    const part = `${file}.${process.pid}.${Date.now()}`;
    await fs.promises.writeFile(part, made);
    await fs.promises.rename(part, file);
  } catch {
    // Compressed again next time.
  }
  return made;
}

export function startServer({ siteDir, manifest, port = 0 }: { siteDir: string; manifest: SiteManifest; port?: number }): Promise<RunningServer> {
  const files = new Map(manifest.files.map((file) => [file.path, file]));
  // The manifest's files don't change while the server runs, so each is
  // read, and compressed in each encoding, once.
  const bodies = new Map<string, Buffer>();
  const read = (file: string) => {
    let body = bodies.get(file);
    if (body === undefined) bodies.set(file, (body = fs.readFileSync(path.join(siteDir, file))));
    return body;
  };
  // By the body `read` returned, which is the same buffer for each file.
  const compressed = new WeakMap<Buffer, Partial<Record<'br' | 'gzip', Promise<Buffer>>>>();
  const compress = (body: Buffer, encoding: 'br' | 'gzip') => {
    let forBody = compressed.get(body);
    if (forBody === undefined) compressed.set(body, (forBody = {}));
    return (forBody[encoding] ??= compressedOnce(body, encoding));
  };
  const notFound = (): Answer => ({
    status: manifest.routes.notFound.status,
    headers: { 'Content-Type': HTML_TYPE, 'Cache-Control': NO_CACHE },
    body: read(manifest.routes.notFound.file),
    compressible: true,
  });

  function answer(method: string, target: string): Answer {
    if (method !== 'GET' && method !== 'HEAD') return { status: 405, headers: { Allow: 'GET, HEAD' }, body: null, compressible: false };
    const url = new URL(target, `http://${HOST}`);
    const route = resolveRoute(manifest.routes, url.pathname);
    if (route.kind === 'page') {
      return { status: 200, headers: { 'Content-Type': HTML_TYPE, 'Cache-Control': NO_CACHE }, body: read(route.file), compressible: true };
    }
    if (route.kind === 'redirect') {
      return { status: route.status, headers: { Location: `${route.to}${url.search}` }, body: null, compressible: false };
    }
    // Pages are served only by their routes, never by file name.
    const file = files.get(url.pathname);
    if (file === undefined || file.type === 'text/html') return notFound();
    const cache = url.pathname.startsWith('/assets/') ? IMMUTABLE : NO_CACHE;
    return { status: 200, headers: { 'Content-Type': file.type, 'Cache-Control': cache }, body: read(file.path), compressible: isText(file.type) };
  }

  const respond = async (request: http.IncomingMessage, response: http.ServerResponse): Promise<void> => {
    const result = answer(request.method ?? 'GET', request.url ?? '/');
    const headers = { ...result.headers };
    let body = result.body;
    if (body !== null && result.compressible) {
      headers.Vary = 'Accept-Encoding';
      const encoding = chooseEncoding(request.headers['accept-encoding']);
      if (encoding !== null) {
        body = await compress(body, encoding);
        headers['Content-Encoding'] = encoding;
      }
    }
    headers['Content-Length'] = String(body?.length ?? 0);
    response.writeHead(result.status, headers);
    response.end(request.method === 'HEAD' ? undefined : (body ?? undefined));
  };

  const server = http.createServer((request, response) => {
    respond(request, response).catch((error: unknown) => {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(`server error: ${error instanceof Error ? error.message : String(error)}\n`);
    });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, HOST, () => {
      const { port: bound } = server.address() as AddressInfo;
      resolve({
        url: `http://${HOST}:${bound}`,
        close: () =>
          new Promise<void>((done, fail) => {
            server.close((error) => (error ? fail(error) : done()));
            server.closeAllConnections();
          }),
      });
    });
  });
}

async function main(): Promise<void> {
  const repoRoot = path.resolve(import.meta.dirname, '../../..');
  const distDir = path.join(repoRoot, 'packages/web/dist');
  const manifestFile = path.join(distDir, 'site-manifest.json');
  if (!fs.existsSync(manifestFile)) {
    process.stderr.write('serve: packages/web/dist/site-manifest.json not found: run npm run build first\n');
    process.exit(2);
  }
  const manifest: SiteManifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const port = process.env.PORT === undefined || process.env.PORT === '' ? 4173 : Number(process.env.PORT);
  const { url } = await startServer({ siteDir: path.join(distDir, 'site'), manifest, port });
  process.stdout.write(`Serving packages/web/dist/site at ${url}/\n`);
}

if (import.meta.main) await main();
