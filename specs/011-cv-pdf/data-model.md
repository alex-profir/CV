# Data Model: CV PDF Download

The entities from the spec's Key Entities, with their fields, where each lives, and their rules.
Nothing here is stored at run time except the service worker's cache. Everything else is made
by the build.

## Site text additions (`packages/web/src/site-text.ts`)

A new group, `download`, beside the contact row labels:

| Key | Value | Used for |
|---|---|---|
| `download.rowLabel` | `CV` | The row's visible label, hidden from assistive technology |
| `download.link` | `Download PDF` | The link's text and accessible name (FR-001) |
| `download.suffix` | `-CV.pdf` | Appended to the joined name (FR-003) |
| `download.fallbackName` | `CV.pdf` | The suggested name when the CV document has no usable name (FR-003) |

Rules: no CV fact (the content check searches this file). The values are the wireframe's
"Site text" table.

## Download link

The one site element inside the intro block (FR-006).

| Field | Source | Rule |
|---|---|---|
| `href` | `CV_PDF.path` in `src/routes.ts` | Always `/cv.pdf` |
| `download` (suggested name) | `downloadName(resume.basics?.name)` | See **File name** below |
| text | `siteText.download.link` | Purpose clear from its own text (004 FR-013) |
| row label | `siteText.download.rowLabel` | `aria-hidden="true"` |
| `data-site-element` | Always present | Hidden in print, so never in the PDF (FR-004) |
| `data-req` | `011-cv-pdf-FR-001 011-cv-pdf-FR-002 011-cv-pdf-FR-003 011-cv-pdf-FR-004 011-cv-pdf-FR-006` | Constitution III |

Relationships:

- Rendered by `Intro` only when given its `download` prop.
- `CvPage` gives the prop. The OS shell's `CvApp` never does (FR-005).

### File name

`downloadName(name)` (research R10):

| Input `basics.name` | Suggested name |
|---|---|
| `Alex Profir` | `Alex-Profir-CV.pdf` |
| `  José   María ` | `José-María-CV.pdf` |
| `A/B: C` | `AB-C-CV.pdf` |
| absent, empty, or white space only | `CV.pdf` |
| only rejected characters, such as `/:` | `CV.pdf` |

Rejected characters: `/ \ : * ? " < > |` and control characters (U+0000 to U+001F, U+007F). The
name is normalized to NFC first. The result never starts with `-` and is never empty.

## CV PDF

The CV as a file, `<siteDir>/cv.pdf`, served at `/cv.pdf`.

| Field | Value | Requirement |
|---|---|---|
| Content | `/cv`'s print view from the same build: every shown CV field in page order, link addresses as print shows them, no site element | FR-004, FR-011 |
| Paper | A4 (595.92 × 842.88 pt as Chromium writes it), 0.4 in margin on every side, no header or footer | FR-012 |
| Text | Real text, and a link annotation for each `<a href>` | FR-013 |
| `Title` (Info) | The page's `<title>`: name and role | FR-014 |
| `Author` (Info) | `resume.basics.name`. Absent when the CV document has none | FR-014 |
| `/Lang` (catalog) | `en`, from `<html lang="en">` | FR-014 |
| Structure tree | Tagged: headings, lists and reading order from the DOM | FR-015 |
| Fonts | Embedded subsets of the design's three families | FR-016 |
| Size | At most 1,000,000 bytes | FR-016 |
| Version | Hashed into the service worker's `VERSION` with every other precached file | FR-031 |

Lifecycle: it is made by every `npm run build` (step 3b, research R2), never committed, and
replaced as a whole by the next build. When the step fails, the build fails, and nothing from
that run is published (FR-020).

## Served file entry (site manifest)

The site manifest already lists every served file. `/cv.pdf` appears as:

```json
{ "path": "/cv.pdf", "hash": "<sha256>", "type": "application/pdf" }
```

It is not a route: `ROUTES.pages` is unchanged. The local server serves it by exact path with
`Cache-Control: no-cache`, as it serves every file outside `/assets/`.

## Service worker cache entry

`/cv.pdf` is in `PRECACHE`, stored under the key `/cv.pdf` in `cv-<VERSION>` (research R7).

| Request | Online | Offline, or no answer within 3 s |
|---|---|---|
| Navigation to `/cv.pdf` | Network | This version's stored `/cv.pdf` |
| Fetch of `/cv.pdf` (the page's download script) | Network | This version's stored `/cv.pdf` |
| `<a download>` with no script, or no controlling worker | Network (it skips the worker, research R6) | The browser's failed-download message (FR-032) |

## Removed

- **Fingerprint** (FR-021's fallback): not built. The trial chose FR-020 (research R1).
