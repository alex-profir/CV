# Contract: The Build's PDF Step and the PDF

**Feature**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md) |
**Research**: [research.md](../research.md) (R2 to R5, R9)

This amends 004's `contracts/site.md` "Commands" and "Output layout".

## Command

`npm run build` is unchanged as a command. It now needs Playwright's Chromium, installed once with
`npx playwright install chromium`, as `npm run site-check` already did.

Build steps, with the new one in bold:

1. Fonts and spec list checks, the engine, the client build, the program bundle.
2. SSR build.
3. Every route's page written to `<out>/site/`.
4. **The CV's PDF: `/cv`, served from `<out>/site/`, printed to `<out>/site/cv.pdf`.**
5. The service worker, `<out>/site/sw.js`. Its `PRECACHE` lists `/cv.pdf`, and its `VERSION`
   covers it.
6. `<out>/site-manifest.json`, listing `/cv.pdf` as `application/pdf`.

## Module interface

`packages/web/scripts/cv-pdf.ts`:

```ts
// Prints the built /cv in `siteDir` to `<siteDir>/cv.pdf` and gives its size in bytes.
// `author` is the CV document's name, or undefined for none.
// Throws an Error naming the cause when it can't (FR-020).
export async function writeCvPdf(siteDir: string, author: string | undefined): Promise<number>;
```

`build-site.ts` calls it as `writeCvPdf(siteDir, present(resume.basics?.name) ? resume.basics.name : undefined)`.

## Failures

Each failure exits the build with code 2, as every build failure does:

```text
site build failed: the CV PDF can't be made: Chromium didn't start (<cause>). Install it with npx playwright install chromium
site build failed: the CV PDF can't be made: /cv answered 404
site build failed: the CV PDF can't be made: Chromium gave an empty file
```

A successful build still prints nothing.

## The PDF

| Property | Value |
|---|---|
| Path | `/cv.pdf` (served) and `<out>/site/cv.pdf` (on disk) |
| Content | `/cv` in print media: `print.css` applies, site elements are hidden, addresses follow external links |
| Paper | A4, 0.4 in margins, no header or footer, no backgrounds |
| Tagged | Yes, with an outline of the headings |
| Info `Title` | The page's `<title>` |
| Info `Author` | The CV document's `basics.name`, as UTF-16BE, added by an incremental update. Absent with no name |
| Catalog `/Lang` | `en` |
| Fonts | Embedded subsets |
| Size | ≤ 1,000,000 bytes, checked by the site check, not the build |

## Host build (Vercel only)

`vercel.json` `buildCommand`: `bash packages/web/scripts/vercel-build.sh`. The script runs:

```sh
set -euo pipefail
git update-index --assume-unchanged vercel.json
dnf install -y -q <Chromium's libraries>   # research R9: trimmed on a preview deploy
npx playwright install --only-shell chromium
npm run build
```
