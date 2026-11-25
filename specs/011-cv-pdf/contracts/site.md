# Contract: Serving /cv.pdf, Offline, and the Checks

**Feature**: [spec.md](../spec.md) | **Research**: [research.md](../research.md) (R7, R8, R12)

This amends 004's `contracts/site.md` "HTTP behavior" and "Service worker", and its
`contracts/cli.md` "Parts" and "Problem line".

## HTTP behavior

| Request | Local server | Vercel |
|---|---|---|
| `GET /cv.pdf` | 200, `application/pdf`, `Cache-Control: no-cache` | Same, through the `/cv\.pdf` route before `{ "handle": "filesystem" }` |
| `HEAD /cv.pdf` | 200, the same headers, no body | Same |
| `GET /cv.pdf/`, `/CV.pdf`, `/cv.PDF` | 404, the not-found page | Same, through the catch-all |

The local server sends it uncompressed, as it does every file that isn't text.

`vercel.json` gains, after the `/sw\.js` route:

```json
{ "src": "/cv\\.pdf", "headers": { "Cache-Control": "no-cache" }, "continue": true }
```

## Service worker

- `PRECACHE` holds `/cv.pdf`, stored under `/cv.pdf`. Install stays all or nothing.
- **Fetch** (not a navigation) of a precached file that is outside `/assets/` and `/playground/`
  and isn't a page: the network within 3 s, then this version's stored copy. `/assets/` stays
  cache first, `/playground/` keeps its own rule.
- **Navigation** that the network fails or doesn't answer within 3 s:
  1. a page route gives its stored page, as before;
  2. else a precached non-page file at that path gives its stored copy (new: `/cv.pdf`);
  3. else the stored not-found page, as before.

## Site check: the `pdf` part

Added to `PARTS` after `print`. It runs once, with no width:

```text
pdf /cv.pdf - <type> <subject>: <detail>
```

| Type | Subject | Detail, for example |
|---|---|---|
| `pdf-header` | `Content-Type` or `Cache-Control` | `is "application/octet-stream", expected "application/pdf"` |
| `pdf-missing-field` | the field's path, such as `work[0].highlights[2]` | `"Led the migration…" is not in the PDF` |
| `pdf-out-of-order` | a field's path | `appears before work[0].position` |
| `pdf-missing-link` | a field's path | `https://github.com/… has no link in the PDF` |
| `pdf-site-element` | the element, such as `div.contact-row.download` | `"Download PDF" is in the PDF` |
| `pdf-not-a4` | `page 3` | `612 × 792 pt, expected A4 (595.92 × 842.88 pt)` |
| `pdf-margin` | `page 2` | `text at 8 pt from the left edge, inside the 28.8 pt margin` |
| `pdf-heading-at-page-end` | an `h2` or `h3` and its text | `last line of page 2` |
| `pdf-metadata` | `Title`, `Author` or `Language` | `Author is missing, expected "Alex Profir"` |
| `pdf-untagged` | `structure` | `4 headings in the PDF's structure, 23 on /cv` |
| `pdf-font-not-embedded` | the font's name | `is not embedded` |
| `pdf-font-family` | the font's name | `is not one of Space Grotesk, Schibsted Grotesk, JetBrains Mono` |
| `pdf-too-large` | `/cv.pdf` | `1,204,331 bytes, over the 1,000,000-byte limit` |

The expected fields come from `expectedFields(resume)`, never a hand-written list (FR-040).

## Site check: the `offline` part's new step

After the existing one online visit to `/cv` at 375 px, with the browser offline and the server
dropping every connection, it activates the download link and expects a download:

```text
offline /cv 375px offline-pdf a[href="/cv.pdf"]: no download with the network off
offline /cv 375px offline-pdf a[href="/cv.pdf"]: downloaded 512 bytes that differ from the built cv.pdf
offline /cv 375px offline-pdf a[href="/cv.pdf"]: suggested name "cv.pdf", expected "Alex-Profir-CV.pdf"
```
