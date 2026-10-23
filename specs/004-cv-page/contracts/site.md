# Contract: The Built Site, Its Addresses and Its Offline Behavior

## Commands

| Command | What it does |
|---------|--------------|
| `npm run build` | Builds the site into `packages/web/dist/` (research R2). Writes nothing else |
| `npm run serve` | Serves `packages/web/dist/site/` by the site manifest on `http://127.0.0.1:4173`, or the port in `PORT`. Prints the address. For the owner to look at the built site |
| `npm run site-check` | Builds, then checks ([cli.md](./cli.md)) |

## Output layout

```text
packages/web/dist/
├── site-manifest.json        # never served
└── site/                     # everything served
    ├── cv.html
    ├── 404.html
    ├── sw.js
    └── assets/
        ├── cv-<hash>.css
        ├── register-sw-<hash>.js
        └── <font>-<subset>-<hash>.woff2   # one per committed font file
```

## Site manifest

```json
{
  "version": "<sha256 over every file's path and hash, hex, first 16 characters>",
  "routes": {
    "pages": [{ "path": "/cv", "aliases": ["/cv/"], "file": "cv.html" }],
    "redirects": [{ "from": "/", "to": "/cv", "status": 307 }],
    "notFound": { "file": "404.html", "status": 404 }
  },
  "files": [{ "path": "/assets/cv-1a2b3c4d.css", "hash": "<sha256 hex>", "type": "text/css" }]
}
```

`files` lists every file under `site/`, sorted by path. The same build gives the same manifest
byte for byte.

## HTTP behavior

The local server and, later, the publishing host answer as follows:

| Request | Status | Body | Headers |
|---------|--------|------|---------|
| `GET /cv`, `GET /cv/`, with any query | 200 | `cv.html` | `Content-Type: text/html; charset=utf-8`, `Cache-Control: no-cache` |
| `GET /`, with any query | 307 | empty | `Location: /cv` plus the original query. No `Cache-Control` that allows storing |
| `GET /sw.js` | 200 | `sw.js` | `Content-Type: text/javascript`, `Cache-Control: no-cache` |
| `GET /assets/<file>` listed in the manifest | 200 | the file | Its type, `Cache-Control: public, max-age=31536000, immutable` |
| Anything else, `/cv.html` included | 404 | `404.html` | `Content-Type: text/html; charset=utf-8`, `Cache-Control: no-cache` |
| `HEAD` of any of the above | as `GET` | none | as `GET` |
| Any other method | 405 | none | `Allow: GET, HEAD` |

Text responses are compressed with Brotli or gzip when the request accepts it. The server binds
to `127.0.0.1` only.

## Service worker

`/sw.js`, scope `/`, registered by the module script on every page (research R4).

| Event | Behavior |
|-------|----------|
| install | Opens `cv-<version>`, adds every manifest file except `/sw.js` with `cache: 'reload'`: each asset at its path, each page at its route (`cv.html` at `/cv`, since `/cv.html` answers 404), and the not-found page at its own path `/404.html`, which answers it with status 404. Each must answer with that status and no redirect. All or nothing: every file is downloaded before any is stored, and a cache left half written is deleted. Then `skipWaiting()` |
| activate | Deletes every cache whose name starts with `cv-` except its own. Then `clients.claim()` |
| fetch, navigation | Network first, 3 second limit. On failure or timeout: `/` → `Response.redirect('/cv', 307)`; `/cv`, `/cv/` → cached `cv.html`, 200; anything else → cached `404.html` with status 404. Query strings ignored |
| fetch, same-origin `GET` | Own cache first, then network |
| fetch, anything else | Not handled |

The build writes `sw.js` as the worker's code with its types stripped, after three constants:
`PRECACHE` (every manifest file except `/sw.js`, by path), `ROUTES` (the route table) and
`VERSION`. `VERSION`, the `<version>` in the cache name, is a hash over every other file's path
and hash and the worker's code, first 16 hex characters. It can't be the site manifest's
`version`, which covers `sw.js` itself, so the two differ.

**Guarantees** (spec FR-038 to FR-041):

- After one complete visit to `/cv` or `/`, every page and every file it uses is stored.
- A stored copy is one version. A failed install leaves the previous version in place.
- The worker shows nothing, prompts for nothing and logs nothing on success. A failed
  registration is caught silently.
- With scripting off, nothing is registered, and the site works online as plain pages.

## For the publishing feature

The host must reproduce the HTTP behavior table from `site-manifest.json`. In particular: the
root is a 307, never a 301 or 308; `/cv/` answers 200 with the same page, without a redirect;
unknown paths answer 404 with `404.html`; `sw.js` is never cached long-term.
