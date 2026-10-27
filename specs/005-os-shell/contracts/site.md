# Contract: The Built Site, Changes from 004

004's [contracts/site.md](../../004-cv-page/contracts/site.md) still holds. This file lists what
this feature changes. The output stays static files: the build writes HTML, CSS, JS, fonts and
`sw.js`, and the host serves them by the route table, with no code running on the server.

## Build steps

`npm run build` (`packages/web/scripts/build-site.ts`) keeps 004's five steps, with these changes:

1. **Client build**: one new entry, `os` (`src/client/os.tsx`, which imports `src/styles/os.css`).
   Its script is emitted as one file, with no dynamic chunks. The Lightning CSS visitor rewrites
   `@container (--token-breakpoint-<name>)` to the token's width condition (research R5).
2. **SSR build**: `src/render.tsx` gains `renderShell`.
3. **Pages**: the route table now holds `/`, rendered by `renderShell` into `index.html`
   (research R1, R2). Its assets come from the manifest's `os` entry, the register script and the
   font preloads.
4. **Checks before writing**: the build fails, with `site build failed: <message>`, when any
   emitted CSS still holds `--token-breakpoint-`, when the `os` entry has more than one script
   file, or when `index.html` lacks the inline shell script, `#os` or the no-script page.

## Output layout

```text
packages/web/dist/
├── site-manifest.json
└── site/
    ├── index.html                        # new: the shell
    ├── cv.html
    ├── 404.html
    ├── sw.js
    └── assets/
        ├── cv-<hash>.css
        ├── os-<hash>.css                 # new
        ├── os-<hash>.js                  # new: React, the shells, os-core, the CV app and document
        ├── register-sw-<hash>.js
        └── <font>-<subset>-<hash>.woff2
```

## Site manifest

```json
{
  "routes": {
    "pages": [
      { "path": "/", "aliases": [], "file": "index.html" },
      { "path": "/cv", "aliases": ["/cv/"], "file": "cv.html" }
    ],
    "redirects": [],
    "notFound": { "file": "404.html", "status": 404 }
  }
}
```

## HTTP behavior

One row changes, one is added:

| Request | Status | Body | Headers |
|---------|--------|------|---------|
| `GET /`, with any query | 200 | `index.html` | `Content-Type: text/html; charset=utf-8`, `Cache-Control: no-cache` |
| `GET /index.html` | 404 | `404.html` | as any unknown path |

## Service worker

The code doesn't change (research R14). Because `/` is now a page route:

- install stores `index.html` at `/`, with status 200;
- a navigation to `/` that fails or times out is answered with the stored `index.html`.

**Guarantees** (005 FR-052, FR-053):

- After one complete visit to `/` or `/cv`, the shell, its script, its style sheet and the fonts
  are stored, and the root opens offline in either shell with the CV app's full content.
- A new version installed while the shell is open never reloads it, and the open shell needs
  nothing more from the network or the old cache.

## For the publishing feature

The host serves `/` with `index.html` and status 200, not a redirect. The rest of 004's note is
unchanged.
