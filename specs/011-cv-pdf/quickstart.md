# Quickstart: Validating the CV PDF Download

How to see that 011 works, end to end. The contracts define the details:
[page.md](./contracts/page.md), [pdf.md](./contracts/pdf.md), [site.md](./contracts/site.md).

## Prerequisites

- Node 26 (`nvm use`), `npm ci`.
- Playwright's Chromium: `npx playwright install chromium`. `npm run build` now needs it.

## 1. Build and look at the PDF

```sh
time npm run build
ls -l packages/web/dist/site/cv.pdf
open packages/web/dist/site/cv.pdf
```

Expected:

- The build prints nothing and exits 0.
- `cv.pdf` exists and is under 1,000,000 bytes (about 300 KB).
- It holds 7 A4 pages today, the same as printing `/cv`, with margins, no header or footer, and no
  "Download PDF" or footer text.
- The reader's document properties show the title (name and role), the author (the CV's name) and
  English.
- Text can be selected and searched, and the links open.

**SC-008**: compare `time npm run build` with the same command on `main`. The difference must be
under 30 s; a few seconds is expected. Record both numbers in the pull request.

## 2. The PDF follows the CV

1. Change one highlight in `packages/content/resume.json`.
2. Run `npm run build`.
3. Search `cv.pdf` for the new text: it is there, and the old text isn't.
4. Revert the change.

## 3. The build fails without a renderer

```sh
PLAYWRIGHT_BROWSERS_PATH=$(mktemp -d) npm run build; echo "exit $?"
```

Expected: `site build failed: the CV PDF can't be made: Chromium didn't start (…)`, then
`exit 2`.

## 4. Serve and download

```sh
npm run serve        # http://127.0.0.1:4173/
curl -sI http://127.0.0.1:4173/cv.pdf     # 200, application/pdf, no-cache
curl -sI http://127.0.0.1:4173/CV.pdf     # 404
```

In a browser, open `http://127.0.0.1:4173/cv`, at 1440 px and at 375 px:

- **Placement**: the row `CV · Download PDF ↓` is the last contact row, as in
  `design/mockup/*.png`.
- **Pointer**: activating the link saves `Alex-Profir-CV.pdf`.
- **Keyboard**: Tab reaches the link after the last profile, with a focus ring, and Enter
  downloads it.
- **No script**: with scripting off (DevTools → Disable JavaScript), the same download works.
- **Print**: the print preview has no download row.
- **OS shell**: opening the CV app at `/` shows no download row.

## 5. Offline

1. Open `http://127.0.0.1:4173/cv` once online, and wait for the service worker to install
   (DevTools → Application).
2. Stop `npm run serve`, and turn the network off in DevTools.
3. Reload `/cv`: it shows from the stored copy.
4. Activate the link: `Alex-Profir-CV.pdf` is saved, identical to `dist/site/cv.pdf`
   (`cmp` the two).
5. In a fresh private window with no visit, offline: activating the link shows the browser's
   failed-download message, and `/cv` stays as it was.

## 6. The automated checks

```sh
npm run site-check                         # includes the new `pdf` part and the offline step
npx vitest run --project slow packages/web/test/pdf.test.ts packages/web/test/offline.test.ts packages/web/test/structure.test.tsx
npx vitest run --project slow tools/site-check/test/pdf.test.ts tools/site-check/test/offline.test.ts
npm run traceability                       # every 011 requirement has a test
```

Expected: every part passes, every test passes, and traceability reports 011 complete, with FR-021
removed.

## 7. On the host

On the pull request's Vercel preview:

- **Build log**: the libraries and the headless shell install, and the build succeeds. Note
  the deploy's added time against `main`'s last deploy, about 50 s in the trial (R1, R9).
- **Headers**: `curl -sI https://<preview>/cv.pdf` gives 200, `application/pdf` and
  `Cache-Control: no-cache`. `curl -sI https://<preview>/CV.pdf` gives 404.
- **Download**: the link on the preview's `/cv` downloads the PDF.
