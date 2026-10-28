# Fixture sites for the site check's tests

Each directory is laid out as a repository, so the check runs on it as on the real one:
`packages/web/dist/site-manifest.json`, the served files in `packages/web/dist/site/`, and
`packages/content/resume.json` (research R21). The pages are written by hand, not built, and their
text is made up. Each manifest's routes match `packages/web/src/routes.ts`, except where a fixture
says otherwise, and each manifest's files and version are computed by `siteManifest` from
`packages/web/scripts/build-site.ts`. No check searches `__fixtures__` directories.

`minimal/` passes every part. Every other fixture is `minimal/` with one change, and seeds the
problem its name says. Font files are copied, unchanged, from the `latin` subset files of
`packages/web/src/fonts/` into the fixtures whose cases need fonts: `minimal/`,
`fonts-not-stored/`, `root-not-offline/`, `missing-glyph/` and `seeded/`. Their `@font-face` rules give each
file the `latin` subset's `unicode-range` from `fonts.json`, as the real build does. The others
declare no `@font-face`. Each family's license is copied with the files, into
`font-licenses/<family>/OFL.txt`.

Each fixture's service worker, `sw.js`, is hand-written after contracts/site.md: it stores the
assets with `cache.addAll`, and the two pages by their routes (`/cv`, and `/missing-page` with its
404 status), and answers navigations network first with a 3-second limit.

| Fixture | What it seeds | Part |
|---------|---------------|------|
| `minimal/` | A valid site, with a tiny CV document, that passes every part | all |
| `no-link-name/` | The footer link on both pages holds only a hidden icon, so it has no accessible name | `accessibility` |
| `low-contrast/` | The summary's text color is `#a8a8a0` on `#f4f4ef`, about 2.2:1 | `accessibility` |
| `script-only-projects/` | `resume.json` has a project, which the page inserts with a module script | `no-script` |
| `has-button/` | A `<button>` in `<main>` | `no-script` |
| `fonts-not-stored/` | The service worker stores no font file | `offline` |
| `root-not-offline/` | Offline, the service worker answers `/` with a network error | `offline` |
| `no-focus-outline/` | `a:focus-visible { outline: none; }` | `keyboard` |
| `positive-tabindex/` | The GitHub link has `tabindex="1"`, so focus reaches it before the email link | `keyboard` |
| `covered-link/` | A fixed, nearly transparent `div.banner` covers the whole viewport | `keyboard` |
| `other-sites/` | Both pages load a script from `https://www.googletagmanager.com/gtag/js?id=G-X` and a style sheet from `https://example.com/x.css`; the service worker fetches `https://example.org/worker.json` while installing | `other-sites` |
| `ip-request/` | `/cv` loads a script from `http://203.0.113.10/x.js`, a documentation address (RFC 5737) | `other-sites` |
| `missing-glyph/` | The work entry's location is `Timișoara`; `ș` (U+0219) is outside every served subset | `fonts` |
| `certificates/` | `resume.json` has 2 `certificates` entries, `basics.phone` and `work[0].contact` | `content` |
| `empty-unsupported/` | `resume.json` holds only `$schema`, `meta` and `"awards": []` | `content` |
| `second-page/` | The manifest lists a second page, `/about` (`about.html`), beside `/cv` | every page part, `lighthouse` |
| `seeded/` | The seeded sample: at least one problem in every part but `cv-app`, listed in the comment above its test in `cli.test.ts`. Its worker doesn't store the not-found page and answers `/` offline with a network error | all |

These fixtures keep 004's redirect at `/`, and the check treats a redirect there as 004 did: the
`cv-app` part has no CV app to open, so it passes with nothing measured. The cases on the site root,
the OS shell (005), use no fixture here. A hand-written shell would have to pass every keyboard
flow, so they run on copies of the real build, or on a temporary copy of the repository with one
change, built (`test/helpers/root.ts`).

The Lighthouse part's own test makes its page with a 2 MB blocking script with `siteProject` from
`test/helpers/sites.ts`. The seeded sample commits one, `seeded/packages/web/dist/site/assets/big.js`,
written the same way.

`seeded/expected-report.txt` is the check's report on the sample, with every Lighthouse score
replaced by `<n>` (contracts/cli.md Determinism). To make it again after changing the sample,
recompute the manifest with `siteManifest`, run `node ../../../src/main.js > expected-report.txt`
from `seeded/`, then replace the scores with `maskScores` from `test/helpers/sites.ts`. Run it twice
and check that the file doesn't change.
