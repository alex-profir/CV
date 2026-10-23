# Research: The /cv Page

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-22

The project's toolchain (Node.js 26 running TypeScript directly, npm workspaces, Vitest 5,
TypeScript 7, GitHub Actions, `oxc-parser`, the three existing checks) was set by 001 to 003 and
isn't revisited here. This feature adds the first page, so it decides how pages are rendered,
built, served, stored offline and checked in a browser.

Versions were read from the npm registry on 2026-10-22. Facts about the existing checks were read
from their source in this repository. Points that can only be confirmed by running code are marked
**Verify** and become the first task of the area they belong to.

## R1. The site package, and rendering at build time with React

**Decision**:

- The site is a new npm workspace, `packages/web` (`@cv/web`). It holds the pages, their
  components and styles, the fonts, the service worker and the build script.
- Pages are TSX components rendered to HTML **at build time** with React 19.3.1's
  `renderToStaticMarkup` (`react-dom/server`). The build writes one complete HTML file per page.
  No component is hydrated, and the page ships no React code to the browser.
- The page component takes the CV document and the site data as props. The build passes
  `resume` and `siteData` from `@cv/content`. Tests pass fixture documents, so every edge case in
  the spec can be rendered without editing the real CV.

**Rationale**:

- "Server-rendered" (Constitution VII) means the HTML the server sends holds the whole page.
  Rendering once at build time gives exactly that, with the fastest possible response, and leaves
  the host open: the publishing feature can serve the files from any static host or a server.
- TSX is the only component format the existing checks read. 001 reads `data-req` from JSX
  attributes and `'data-req'` object properties (`tools/traceability/src/ui-files.ts`). 003 reads
  component code with React DOM's style rules (003 R16) and reports `.astro`, `.vue`, `.svelte`
  and `.html` files as unreadable (`tools/token-check/src/site-files.ts`). A template language
  would need both checks extended first.
- React is what 003 already assumed for JSX, and what the shells are likely to use. Using it here
  adds no second component model later.
- `renderToStaticMarkup` writes plain HTML with no hydration markers, which is what a page with
  no client components needs.

**Alternatives considered**:

- *Astro*: built for content pages with no JavaScript, but `.astro` files are unreadable to 001
  and 003. Using it with TSX components only would keep a framework for its router and build,
  for two pages and a redirect.
- *Next.js static export*: brings a router, a runtime and conventions this page doesn't use. A
  static export can't express the root redirect or the not-found status either, so the host
  config is needed anyway.
- *Preact with `preact-render-to-string`*: smaller in the browser, but nothing of either library
  reaches the browser here, and 003's JSX rules follow React DOM.
- *HTML in template strings*: no type checking of markup, manual escaping, and `data-req` inside
  a string is invisible to the traceability check.
- *A request-time server*: needs a host decision now, and adds a process to run for no gain, as
  the page changes only when the CV document or the tokens change.

## R2. The build: Vite for assets, a prerender step for pages

**Decision**: `npm run build` runs `packages/web/scripts/build-site.ts`, which:

1. Runs a Vite 8.3.5 **client build**: the style sheets, the fonts (through the generated
   `@font-face`, R5) and the service worker registration script, all with content-hashed names
   under `/assets/`, plus Vite's `manifest.json`.
2. Runs a Vite **SSR build** of `src/render.tsx`, which exports one render function per page.
3. Imports the SSR output and renders each page in the route table (R3) to
   `dist/site/<file>.html`, with links to the hashed assets read from the manifest.
4. Writes the service worker, `dist/site/sw.js`, with the precache list and version (R4).
5. Writes `dist/site-manifest.json`: the routes, the pages, and every served file with its hash.
   It sits outside `dist/site/`, so it's never served.

Vite's CSS uses Lightning CSS (`css.transformer: 'lightningcss'`) with
`drafts: { customMedia: true }`, which replaces the token output's `@custom-media` breakpoints
at build time, as 003 R11 requires. JSX uses React's automatic runtime, set in `tsconfig.json`
(`jsx: "react-jsx"`) for `tsc`, and in Vite's and Vitest's transform options.

The service worker is not bundled. The build strips its types with Node's built-in
`module.stripTypeScriptTypes` and prepends the precache list and version (R4).

**Rationale**:

- Vite is maintained by its core team (VoidZero), and is already installed: Vitest 5 runs on it
  (`node_modules/vite` 8.3.5, with `lightningcss` 1.33.0 and `rolldown` 1.2.15). Pinning it as a
  direct dev dependency adds nothing to the install.
- Its documented pre-rendering pattern (a client build, an SSR build, then a script that renders
  each route) is what this step follows.
- Content hashes make every asset immutable, so the offline store can tell versions apart (R4).

**Alternatives considered**:

- *Lightning CSS and a TSX compiler driven by hand*: possible, but re-does Vite's hashing,
  manifest and asset handling.
- *Bundling the service worker with Vite*: it has no imports, so a bundler adds nothing. Its
  precache list only exists after the client build finishes anyway.
- *Inlining the style sheet into the HTML*: saves one request on a first visit, but the page is
  small (R13), and a separate hashed file is cached across pages and versions.

**Naming constraint**: `build`, `dist`, `out` and `coverage` directories are skipped at any depth
by all three checks (`tools/traceability/src/files.ts`). The build script therefore lives in
`packages/web/scripts/`, not `packages/web/build/`, so the checks still read it.

## R3. Addresses: one route table, a local server, and what the publishing feature maps

**Decision**:

- `packages/web/src/routes.ts` is the only place that defines the site's addresses:
  - page `/cv`, also answered at `/cv/`, rendered to `cv.html`;
  - a temporary redirect from `/` to `/cv`, with status **307**, keeping any query string;
  - the not-found page, `404.html`, sent with status **404** for every other path.
- The build copies the table into `dist/site-manifest.json` ([contracts/site.md](./contracts/site.md)).
- `tools/site-check/src/server.ts` is a small Node HTTP server that serves `dist/site/` by that
  manifest, and nothing else: it doesn't map paths to files on its own, so `/cv.html` is
  not-found. It sets the cache headers in [contracts/site.md](./contracts/site.md) and compresses
  text responses with gzip or Brotli from `node:zlib`, as a host would. `npm run serve` starts it
  for the owner; the checks and tests start it on a free port.
- The publishing feature translates the same table into its host's configuration.

**Rationale**:

- The root redirect and the not-found status are HTTP behavior, which plain files can't carry.
  Writing them down once, as data, lets the server, the service worker (R4), the checks (which
  pages to cover, FR-056) and the later host config agree.
- 307 is the standard temporary redirect. With no cache headers, browsers don't store it
  (RFC 9111 §4.2.2: 307 isn't heuristically cacheable), so FR-018's "browsers don't remember" holds,
  and the shells feature can later give the root a page.
- Serving `cv.html` at both `/cv` and `/cv/`, with no redirect between them, follows FR-017 and
  keeps the copied link `/cv`. Assets use absolute paths, so they resolve the same from both.

**Alternatives considered**:

- *`dist/cv/index.html`*: most static servers would then redirect `/cv` to `/cv/` permanently,
  which FR-017 and FR-018 rule out.
- *`vite preview` or a static server package*: neither sends the not-found page with a 404 status
  and a 307 for the root from one table without configuration of its own, which would be a second
  copy of the routes.
- *A `_redirects` file*: a format of some hosts, not a standard. The publishing feature can write
  one from the manifest.

## R4. Offline: a hand-written service worker with atomic, versioned storage

**Decision**: `packages/web/src/sw/service-worker.ts`, about a hundred lines, plus a registration
module. Behavior, fixed in [contracts/site.md](./contracts/site.md):

- **Registration** (`src/client/register-sw.ts`, a module script on both pages): registers
  `/sw.js` with scope `/` after the page loads, if `serviceWorker` exists. A failure, as in some
  private modes, is caught and ignored (FR-041). It shows nothing and asks nothing.
- **Precache**: every file in `dist/site/` except `sw.js`: both pages, the style sheet, the
  registration script and every font file. The version is a hash over every file's hash.
- **Install**: opens the cache `cv-<version>` and adds every file with `cache: 'reload'`.
  `cache.addAll` stores all or nothing, so a version that fails to download leaves no partial
  cache, and the previous worker and its cache stay in charge (FR-039, US4 scenario 4). On
  success it calls `skipWaiting()`.
- **Activate**: deletes every `cv-…` cache except its own, then `clients.claim()`.
- **Navigations** (network first):
  - It asks the network. If the network answers within **3 seconds**, its answer is used, whatever
    the status: the 307 for the root, the 404 for an unknown path, the new version of `/cv`.
  - If the network fails, or doesn't answer in time, it answers from its own cache only: the
    route table maps `/` to a 307 to `/cv` (`Response.redirect`), `/cv` and `/cv/` to `cv.html`,
    and anything else to `404.html` with status 404. Query strings are ignored.
- **Other requests**: same-origin `GET`s are answered from the worker's own cache first, then the
  network. Hashed file names make a cached copy correct by construction. Other origins are never
  handled (there are none, FR-016).

**How this meets the spec**:

- FR-038: one visit to `/cv` or `/` installs the worker, which stores everything. Offline, `/`
  leads to `/cv`, and an unknown path gets the not-found page.
- FR-039: the browser checks `/sw.js` on every navigation, bypassing the HTTP cache for it (the
  default `updateViaCache: 'imports'`), and the server sends it with `Cache-Control: no-cache`.
  The visit itself gets the new HTML from the network, and its new hashed assets from the network
  too, since they aren't in the old cache. The new worker installs in the background and replaces
  the stored copy in one step.
- FR-040: a failed or slow navigation falls back to the stored copy instead of an error page.
- FR-041: no install prompt, no reload request, no banner. There's no web app manifest, so
  browsers don't offer to install.

**The 3-second timeout**: the spec leaves it to the plan (Assumptions). It bounds the wait on a
connection that is up but not delivering, and it only applies once a copy is stored. Lighthouse
loads with a cleared cache (R13), so it doesn't affect the scores or SC-003. The trade-off: a
visitor whose network takes longer than 3 seconds to answer sees the stored version on that
visit, and the new one on the next.

**Known limit**: if the network answers a navigation with the new HTML and then fails before its
new style sheet arrives, that visit is unstyled. It needs the network to fail within a fraction of
a second of answering, and the next visit is complete.

**Verify**: returning `Response.redirect('/cv', 307)` from a service worker for a navigation is
followed by Chromium (the fetch spec allows a redirect response for navigations, whose redirect
mode is `manual`). Confirmed by the offline check's root case.

**Alternatives considered**:

- *Workbox* (Google): its `generateSW` brings a Rollup and Babel toolchain, and its precache route
  serves precached HTML cache first, which would need custom routes to meet FR-039. The behavior
  needed fits in a short file that a reviewer can read whole.
- *Cache first for pages*: fast, but a visit after a release would show the old version, against
  FR-039.
- *No timeout*: a dead-but-connected network would hang the page until the browser gives up.
- *The Cache API without a worker*: can't answer navigations offline.

## R5. Fonts: committed files, a generated `@font-face`, and no 003 amendment

**Decision**:

- **Families**, from the approved design (design/review.md): Space Grotesk (name and headings),
  Schibsted Grotesk (body), JetBrains Mono (dates, labels, chips). All three are under the SIL Open
  Font License 1.1 and are variable fonts with a weight axis. None is an Apple or system font
  (Constitution IX).
- **Files**: each family's WOFF2 files as Google Fonts serves them for the web, one file per
  character subset (`latin`, `latin-ext` and every other subset the family has), each with its
  `unicode-range`. They're downloaded once by the owner and committed to
  `packages/web/src/fonts/<family>/`, with the family's `OFL.txt` from its upstream repository
  next to them (FR-045). `packages/web/src/fonts/README.md` records the source address, date and
  SHA-256 of each file.
- **Description**: `packages/web/src/fonts/fonts.json` lists each family with its `family` name,
  the font token it serves (such as `font.family.display`), and its files with weight range,
  style and `unicode-range` ([contracts/fonts.md](./contracts/fonts.md)).
- **`@font-face` is generated at build time** by a small Vite plugin in
  `packages/web/scripts/fonts-plugin.ts`, as the virtual module `virtual:cv-fonts.css`, imported
  by the global style sheet. Vite then hashes the font files. Every face has `font-display: swap`,
  so text shows in the token's fallback family while fonts load (FR-045).
- **The token is the source of the choice**: the plugin fails the build when the first family in
  a font token's value has no `fonts.json` entry, or when an entry names a token whose family
  differs. Changing the family in Penpot without adding its files stops the build with a message
  naming the token.
- **Preload**: the `latin` file of each family used above the fold (all three) is preloaded with
  `<link rel="preload" as="font" type="font/woff2" crossorigin>`. Other subsets load only when
  their characters appear, as `unicode-range` intends. The `latin-ext` files are needed for `ș`
  in `Timișoara`, and the browser fetches them for that reason.
- **Arrows** (`→`, `↗`) are drawn as inline SVG with `stroke: currentColor`, hidden from
  assistive technology, not as font glyphs. Google's subsets don't promise arrow glyphs, and an
  SVG follows the link color in every mode, forced colors included (FR-030).

**Why no amendment to 003 is needed (FR-046)**:

- 003's literal values search reports a family name written in a style sheet or component
  (003 R15), and noted that hosting fonts would need either an exemption for `@font-face` "or a
  generated `@font-face` file".
- With the rules generated at build time, no style sheet or component in the repository names a
  family. The family names live in the token export (the design choice) and in `fonts.json` (a
  description of the files, which the search doesn't read as styles). The build ties the two
  together, so they can't drift silently.
- `npm run token-check` therefore passes over the site with no exception and no change, and 003's
  spec stays as it is. If implementation finds a literal the search reports after all, FR-046's
  amendment path applies, in this pull request, before the fonts are declared.

**Rationale**:

- Committed files keep the site free of requests to other sites (FR-016) and make the license
  sit next to each font (FR-045).
- Subsets with `unicode-range` keep the first visit small: the browser fetches only the subsets
  the page uses (about 15 to 30 KB each in WOFF2), instead of the full files (Space Grotesk's
  variable TTF is 137 KB, Schibsted Grotesk's 176 KB, JetBrains Mono's WOFF2 114 KB, upstream).
  On Lighthouse's simulated mobile connection, the full files would compete with the style sheet
  for bandwidth.
- Not subsetting by the CV's own characters keeps SC-008: a new character in the CV document
  needs no new font file, as long as some subset of the family has it. FR-007's check (R16)
  fails if none does.

**Alternatives considered**:

- *Amending 003 to allow `font-family` inside `@font-face`*: works, but writes each family name
  twice by hand (Penpot and the style sheet), and changes another feature's check when no change
  is needed.
- *Fontsource packages*: the same subsets, but a community repackaging, added as dependencies.
  The files are the deliverable, so committing them is simpler.
- *Full upstream files*: simplest, but about 250 KB on a first visit.
- *`font-display: optional`*: avoids a layout shift, but on a slow first visit the design's fonts
  may not show at all.
- *Metric-matched fallback faces* (`size-adjust` and the ascent, descent and line-gap overrides):
  they reduce the shift when fonts swap, but need font metrics read from the files. Not added now
  (Constitution X): the Lighthouse check measures the layout shift, and these can be added if it
  ever costs points.

## R6. The design's tokens, written by hand in Penpot's form

**Decision**:

- Penpot can't be reached until at least 2026-10-26. Under Constitution 1.2.0's interim provision
  on local mockups, the export is **written by hand** at `packages/tokens/penpot/tokens.json`, in
  exactly the form Penpot 2.18.3 exports (003 R2, R3): one `base` set, one theme in its own group,
  every token with `$value`, `$type` and `$description`, sizes as unitless strings, two-space
  indentation and no final newline. 003's check rejects anything Penpot wouldn't write, so a file
  it accepts is one Penpot can import (FR-043).
- Values come from the approved design: the five colors in design/review.md, and the type scale,
  spacing, widths, rules, radius and dot size read from direction C's HTML exploration, which the
  Penpot frames were built from, and checked against the revision 10 exports at 1440 and 375 px. The owner reviews the file in the pull request against the frames. `npm run
  token-output` regenerates the output.
- The roles the page needs are listed in [data-model.md](./data-model.md#token-roles): five colors,
  three families, the type scale, weights, line heights, letter spacing, the spacing scale, the
  content and column widths, border widths, the chip radius, the timeline dot size, the focus
  indicator's width and offset, and the breakpoint where the two-column layout starts. Names follow
  003's naming rules and stay the same when the file goes into Penpot.
- Starter tokens the design doesn't use are deleted. A test asserts every token in the export is
  read by the site, directly or through a reference.
- The motion token source doesn't change: the design has no motion (FR-043, FR-031).
- **After Penpot is back**, in the provision's follow-up pull request: the file is imported into
  the site's Penpot file and exported again over itself (quickstart 11). The expected result is no
  change. Any difference, such as an id or the order of keys Penpot writes, is reviewed and
  committed with regenerated output. Code doesn't change, because names don't.

**Alternatives considered**:

- *Keeping the starter tokens until Penpot is back*: the page would be built against values the
  design doesn't use, and restyled later.
- *Writing the design values as CSS first*: 003's check blocks literal values, and the provision
  allows a hand-written export precisely so it doesn't have to.

**Finding: text size and pixel tokens**: Penpot writes sizes as unitless numbers, and the token
output turns them into `px` (003). A browser's "default font size" setting scales `rem` and `em`,
not `px`, so it doesn't enlarge this page's text. WCAG 2.2 SC 1.4.4 accepts browser zoom as the
way to resize text, and every browser's zoom and text-zoom (Firefox's "Zoom text only", Chrome
Android's text scaling) do scale `px`. FR-021's 200% case is therefore tested with 200% zoom
(R19). Making text follow the default font size would need 003's output in `rem`, which is a
change to 003 and out of scope here. It's recorded as a follow-up.

## R7. Content: what is shown, where site text lives, dates and countries

**Decision**:

- **Section order** (FR-001), from design/review.md: the basics block (role, name, summary,
  location, email, profiles), then Experience (`work`), Projects, Skills, Education, Languages,
  Interests. Entries keep the CV document's order. Nothing is sorted.
- **Fields** (FR-002): the Key Entities table, mapped to markup in
  [contracts/page.md](./contracts/page.md#fields).
- **Site text** (FR-006): every heading, label and message that isn't CV content lives in one
  module, `packages/web/src/site-text.ts`, so changing a word is one edit there. It holds English
  only and no CV fact, which the content check (002) confirms over it like any site file.
- **The repository link** ("How this page was built ↗") reads its address from a new site data
  field, `repository`, in `packages/content/site.json`. That follows 002's process for site data
  (its [site-data-rules.md](../002-cv-content/contracts/site-data-rules.md): schema, value,
  regenerated shape). The vision's "link to the repo" will read the same field.
- **Dates** (FR-009 to FR-011), in `packages/web/src/format/dates.ts`, a pure function from the
  CV document's strings to parts:
  - precision is taken from the string: `2018` → year, `2018-07` → month, `2018-07-29` → day;
  - visible text uses the design's form: `2018`, `Jul 2018`, `29 Jul 2018`, joined by ` – `,
    with `Present` for an ongoing entry;
  - month names, short and long, are site text, not `Intl`, so output can't change with the ICU
    version (`Intl`'s short English September is `Sep` or `Sept` depending on locale data);
  - every date is a `<time datetime="…">` with the original string;
  - start only → ongoing; end only → the end date alone; start equal to end at the shown
    precision → one date; neither → no date line;
  - screen readers get a separate text with long month names and the word `to`, such as
    "July 2018 to October 2026" or "December 2025 to present", while the visible short form is
    hidden from them ([contracts/page.md](./contracts/page.md#dates)).
- **Country** (FR-008): `Intl.DisplayNames(['en'], { type: 'region' })` at build time. The code
  is already restricted to the 249 ISO 3166-1 alpha-2 codes by the content check (002,
  `tools/content-check/src/countries.ts`). The English names are CLDR's, shipped with Node's ICU:
  "Romania", "United States", "South Korea". ISO 3166-1's own English short names are formal
  ("Korea (the Republic of)", "Netherlands (Kingdom of the)"), and read badly in a location line.
  A test asserts all 249 codes get a name that isn't the code. **This reads FR-008's "the
  country's English name, taken from its country code using the ISO 3166-1 list" as: the ISO
  3166-1 code, named in English by CLDR.** If the owner wants ISO's official short names, the
  change is a 249-entry table in the same module.
- **Unsupported content** (FR-005): `packages/web/src/supported.ts` lists the supported sections
  and, per section, the shown fields (the Key Entities table). The site check's `content` part
  (R11) walks the CV document and reports any unsupported section with at least one entry, and any
  field not in the list, by its JSON path. `$schema` and `meta` are ignored, as the spec says.

**Alternatives considered**:

- *Site text in `site.json`*: every label would need a schema field and a regenerated shape, for
  text that isn't data about the CV. 002's site data is for facts the site needs, such as the
  repository address.
- *`Intl.DateTimeFormat` for months*: locale data differences across Node versions, as above.

## R8. Markup and accessibility

**Decision** (the full contract is [contracts/page.md](./contracts/page.md)):

- `<html lang="en">`, `<meta name="color-scheme" content="light">` (the page's one theme, so the
  browser keeps its own controls and scrollbars light for a visitor who prefers dark).
- One `<main>` holding the CV. The footer with the repository link is a `<footer>` outside it,
  which is the only site element (FR-025).
- One `<h1>`: the name, or the site heading `CV` when there's none (FR-023). Each section is a
  `<section aria-labelledby>` with an `<h2>` (a named region, FR-024, FR-025). Each work, project
  and education entry has an `<h3>`. The decorative section numbers (`01` to `06`) are
  `aria-hidden`.
- Entries are `<li>` in an `<ol>`. Within an entry, the DOM order is the visual order: date line,
  `<h3>`, organization, text, list. No CSS `order`, no absolute positioning of content, so reading
  and focus order follow the visual order at every width (FR-027).
- Highlights, keywords, courses, profiles, languages, skills and interests are lists (FR-026). The
  location and email rows are a `<dl>`.
- Link text names the target (FR-013): a profile link's text is the username, and it carries the
  network in its accessible name ("GitHub: alex-profir") through visually hidden text, so it isn't
  lost out of context. A profile without a username is named by its network. Entry links wrap the
  entry's heading text.
- **Focus**: every link gets `outline` (not `box-shadow`, which forced colors remove) with width,
  offset and color from tokens. The accent on the background is 9:1 (design/review.md), above the
  3:1 of FR-029. Nothing is sticky or overlaid, so a focused link can't be hidden (WCAG 2.4.11).
- **Forced colors** (FR-030): rules, the timeline line and dots, and chip outlines are borders, not
  backgrounds, so they stay. Links keep their underline. Inside `@media (forced-colors: active)`
  the focus outline uses the system color `Highlight`, which 003 allows there (003 FR-056).
- **Motion** (FR-031): the design has none, so the page declares no transition or animation, and
  a test asserts none is computed.
- **Target size**: inline links in text are exempt from WCAG 2.5.8. Standalone links (contact
  rows, the footer, "Go to the CV") get a minimum block size of 24 CSS px from a token.
- **No favicon request**: `<link rel="icon" href="data:,">` stops the browser's automatic
  `/favicon.ico` request, which would log a 404 and cost Lighthouse's Best Practices "errors in
  console". The design has no icon, and adding one is a design change.

## R9. Print

**Decision**: `packages/web/src/styles/print.css`, inside `@media print`:

- The single-column layout, regardless of the paper width (FR-032). Text in the primary text color
  on no background, links in the primary text color with their underline (FR-035).
- The footer and anything marked as a site element: `display: none` (FR-032).
- After each external link whose text isn't its address: `content: " (" attr(href) ")"`. The email
  link's text is the address, so it gets nothing (FR-033, US3 scenario 3). Addresses wrap with
  `overflow-wrap: anywhere`, so none is cut off.
- `break-after: avoid` on `h2` and `h3`, and `break-inside: avoid` on each entry's head (date
  line, heading and organization), so no heading ends a page (FR-034).
- No `@page` rule: the browser's default margins leave its own headers and footers to the
  visitor's print dialog (FR-032, Clarifications).
- `print-color-adjust` isn't used: nothing relies on a background, so the "background graphics"
  option changes nothing (FR-035).

## R10. Title and link previews

**Decision**: `<title>` and `og:title` are `<name> — <label>`, the separator being site text. When
one is missing, the other alone, and with neither, the site heading `CV` (FR-036, FR-037).
`<meta name="description">` and `og:description` hold the summary, else the label. When both are
missing, no description is declared at all. `og:type` is `website` and `twitter:card` is
`summary`. There is no `og:image`, no `og:url` and no `<link rel="canonical">` (FR-017, out of
scope until the domain exists).

## R11. The site check: one command, one report, Chromium through Playwright

**Decision**: a fourth repository check, `tools/site-check/`, in the same shape as the other three
(`main.js` with the Node version gate, `cli.ts`, `check.ts`, `report.ts`):

- `npm run site-check` builds the site (`npm run build`), starts the local server (R3) on a free
  port, launches Chromium, runs every part below, prints every problem and then a summary, and
  exits 1 if any part failed (FR-049, FR-058).
- Pages come from `dist/site-manifest.json`: every page with status 200 for Lighthouse, and those
  plus the not-found page (requested at a fixed unknown path) for the rest (FR-056). A later page
  added to `routes.ts` is covered with no change to the check.
- Every part runs even when another fails. A part that crashes is reported as failed with its
  error, and the rest continue (FR-058).

| Part | Pages | Widths or profiles | What fails it | FR |
|------|-------|--------------------|---------------|----|
| `content` | (the CV document) | - | An unsupported section with entries, or an unsupported field | FR-005 |
| `accessibility` | all | 320, 375, 1440 px | Any axe-core violation tagged WCAG 2.0, 2.1 or 2.2 A or AA | FR-050 |
| `lighthouse` | status 200 pages | mobile, desktop | Any category below 90 | FR-051 |
| `no-script` | `/cv` | 320, 1440 px | A shown field missing or out of order, styles not applied, or a script-only control | FR-052 |
| `offline` | `/cv`, `/`, unknown path | 375 px | Content, styles or fonts missing with the network off | FR-053 |
| `keyboard` | all | 375, 1440 px | A link not reached, out of order, without a visible indicator, or covered | FR-054 |
| `other-sites` | all | 375, 1440 px | Any request to another origin | FR-055 |
| `fonts` | all | 375, 1440 px | Text drawn in a font the site doesn't serve | FR-007 |
| `layout` | all | 320 to 2560 px, 200% and 400% zoom, text spacing | Horizontal scrolling, clipped or overlapping text | FR-020 to FR-022 |
| `print` | `/cv` | A4, US Letter | Site elements printed, a link without its address, text cut off, a heading ending a page | FR-032 to FR-035 |
| `modes` | all | 375, 1440 px | In forced colors, an invisible separator, link or focus indicator; any computed motion | FR-030, FR-031 |

The spec names the first six as merge checks. The others enforce FRs that the spec says "the
checks" fail on (FR-005, FR-007), or that are cheap to verify on the real build with the same
browser, so the page as published is covered, not only the components in tests.

**Playwright** 1.64.1 (Microsoft) drives Chromium as a library, not as a test runner. Its Chromium
build is Chrome for Testing, which Lighthouse accepts (R13). Chromium only, because Lighthouse
needs it, and the CDP font query (R16) and PDF printing (R18) are Chromium features. Other
browsers are covered by hand: the screen reader pass of SC-004 uses Safari or Firefox, and print
in two browsers is SC-005.

**Why a CLI and not Playwright Test**: the three existing checks are CLIs with a report and a
summary, tested by Vitest against seeded samples. Playwright Test would add a second runner whose
syntax 001's reader only partly understands (001 research, Appendix A: scope-level `test.skip()`
and the `tag` option). Using Playwright as a library inside the CLI and inside Vitest tests keeps
one runner.

**Why not the Node permission model**: 001 to 003 run under `node --permission` with no network
grant. This check must listen on a port and start a browser, which needs `--allow-net` and
`--allow-child-process`, and a child process isn't bound by the parent's permissions. The model
would grant everything that matters here. The network guarantee is enforced in the browser
instead (R17), where the requests happen.

## R12. The accessibility part: axe-core

**Decision**: axe-core 4.14.0 (Deque), injected with Playwright's `addScriptTag` from the local
package file, run on the whole document with `runOnly` tags `wcag2a`, `wcag2aa`, `wcag21a`,
`wcag21aa`, `wcag22aa`. Each violation node is one problem: part, page, width, rule id, the
element's selector and axe's summary (US2 scenario 2).

**Alternatives considered**: *`@axe-core/playwright`* (also Deque) adds a builder over the same
call. One `addScriptTag` and one `evaluate` don't need it. *Lighthouse's accessibility category*
runs a subset of axe, at one width, and reports a score, not every element.

## R13. The Lighthouse part

**Decision**:

- Lighthouse 13.5.0 (Google's Chrome team), as a Node module, with Chromium from Playwright
  (`chromium.executablePath()`) started by `chrome-launcher` (a Lighthouse dependency) with
  `--headless=new` and the isolation flags of R17.
- Categories: whatever Lighthouse reports, which today is Performance, Accessibility, Best
  Practices and SEO (spec Assumptions). Profiles: Lighthouse's default mobile config and its
  desktop config (`lighthouse/core/config/desktop-config.js`). Throttling: simulated (the
  default), which computes timings from a trace, so it doesn't depend on the machine's network.
- **Three runs per page and profile, median per category.** A static page this size scores near
  100, so the pass or fail result is stable across machines (SC-009). Each score is printed in the
  summary.
- Storage is cleared before each run (Lighthouse's default), so the service worker never answers
  a measured load.

**Budget check, by estimate**: the HTML of `/cv` is about 25 KB (6 KB compressed), the style sheet
about 10 KB (3 KB), the registration script under 1 KB, and the above-the-fold font subsets about
60 KB. On the simulated mobile connection (150 ms round trip, 1.6 Mbps), text paints with the
fallback font after the HTML and style sheet, which is well under SC-003's 2.5 seconds.

**SEO and Best Practices, as they apply**: a meta description, descriptive link text, status 200,
no `noindex`, a viewport tag and a declared charset are all in the page. `robots.txt` is absent,
which Lighthouse treats as not applicable. `http://localhost` counts as secure. The `data:` icon
avoids the favicon 404 (R8).

**Alternatives considered**: *Lighthouse CI* (`@lhci/cli`, also Google): adds assertions, upload
targets and a server this check doesn't use. Taking a median of three runs is a few lines.

## R14. The no-script part, and reading the expected fields from the CV document

**Decision**:

- A browser context with `javaScriptEnabled: false` opens `/cv` at 320 and 1440 px.
- `tools/site-check/src/expected.ts` reads `packages/content/resume.json` (the same file
  `@cv/content` exports) and lists every shown field it holds, in the design's section order, as
  text to find (FR-052):
  - text fields as written, after NFC normalization;
  - each date by its `datetime` attribute, which must equal the CV document's string;
  - the country by its English name (R7).
- The part reads the text of `<main>` and checks that each expected text occurs, each after the
  previous one. It names the first missing or misplaced field by its JSON path.
- It also checks that the style sheet applied (the body's computed font family and background
  color are the token values, read from `@cv/tokens`), and that the page holds no `<button>`,
  form control or `<noscript>` (FR-015: there is nothing a script would need to make work).

**Alternative considered**: *A hand-written list of expected strings*: FR-052 forbids it, and it
would go stale at the first CV edit.

## R15. The keyboard part: order, reach and a visible indicator

**Decision**, at 375 and 1440 px on every page:

1. Collect every `a[href]` in DOM order. The DOM order is the reading order (R8).
2. Press Tab from the top until focus leaves the document or returns to a visited element.
   Each focused element must be the next link in the list (FR-054).
3. For each link, take a screenshot of its box, enlarged by the focus outline's width and offset,
   unfocused and focused. The pixels that change are the indicator. It must cover at least the
   perimeter of the box at the token's outline width, and those pixels must have a contrast of at
   least 3:1 against the same pixels unfocused (FR-029, WCAG 2.4.11 and 1.4.11).
4. The element at the link's center (`elementFromPoint`) must be the link or inside it, so the
   link isn't covered (WCAG 2.4.11).

Each failure names the page, the width and the link by its text and `href`. Links without a
visible indicator are all listed (US2 scenario 6).

## R16. The fonts part: which font drew each piece of text

**Decision**: the Chrome DevTools Protocol's `CSS.getPlatformFontsForNode`, through Playwright's
CDP session, lists for each element the fonts that drew its text, with `isCustomFont` and a glyph
count. For every element with text, every font used must be a custom (served) font whose family
is one of `fonts.json`'s. When one isn't, the part splits that element's text into characters and
queries each, to name the character (as `U+0219 ș`), the page, and the element's selector and
section (FR-007, "naming the character and where it appears").

The same query, in the offline part, proves that text is drawn in the design's fonts with the
network off (FR-053, US2 scenario 5), naming the font that didn't load.

**Rationale**: it checks what was drawn, not what a file claims to contain, so it covers the
subsets, `unicode-range`, the CSS families and the site text in one pass. It needs no font parser.

**Verify**: the method is part of the protocol's `CSS` domain, which needs `DOM.enable` and
`CSS.enable` first. The first task of this part confirms it reports a fallback for a character
outside every subset, using a fixture page.

**Alternative considered**: *Reading each WOFF2 file's character map* (`fontkit` or a hand-written
reader with `zlib`'s Brotli): proves what the files hold, but not that the right family was used
for each piece of text.

## R17. Requests to other sites, and running with no network

**Decision**:

- Every Chromium the check starts, through Playwright or for Lighthouse, gets two flags:
  - `--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1` (no host name resolves);
  - `--proxy-server=127.0.0.1:9` (every non-loopback connection goes to a closed port; loopback
    bypasses proxies by default).
  So the browser can't reach another site even by IP address, and neither can Lighthouse
  (FR-057).
- The `other-sites` part records every request each page makes, the service worker's included
  (Playwright routes service worker requests through `context.route` in Chromium), and reports any
  whose origin isn't the local server's, by its full address (FR-055, US2 scenario 7). `data:` is
  allowed.
- The check's own Node code reads local files and talks only to the local server and the browser.
  Lighthouse's error reporting is off by default in its Node API.
- A test proves the isolation with a positive control: a fixture page that requests
  `https://example.com/x.css` and `http://203.0.113.10/x.js` (a documentation address,
  RFC 5737) gets both reported, with no connection made.

## R18. The print part: Chromium's PDF output, read with PDF.js

**Decision**: for A4 and US Letter, `page.pdf()` with `printBackground: false` (FR-035), then
`pdfjs-dist` 6.4.299 (Mozilla's PDF.js, legacy build for Node) reads each page's text items with
positions:

- every text item lies inside the page's box (no text cut off, FR-032);
- no text from a site element appears (FR-032);
- each external link's address appears in the text (FR-033), and the email address appears once
  (US3 scenario 3);
- the last text line on each page isn't a section or entry heading (FR-034);
- in print emulation, every text color has at least 4.5:1 contrast against white (FR-035).

For FR-034, Vitest renders `/cv` with a fixture CV that adds a variable-height spacer before
Projects, in steps of one line across a page height, so in at least one step the heading would
fall on the last line without the rule. The site check runs the same assertions on the real CV.

**Alternatives considered**: *checking only computed `break-after`*: proves the rule is written,
not that Chromium honors it. *Rendering PDF pages to images*: needs a canvas package and image
comparison for the same assertions.

## R19. The layout part

**Decision**, on every page:

- **Widths** (FR-020): 320, 375, 768, 1024, 1440 and 2560 px. `scrollWidth` of the document must
  not exceed its `clientWidth`, and no text element's box may extend past the viewport.
- **200% zoom** (FR-021, US1 scenario 5): a 1280 px window at 200% is a 640 px viewport with a
  device scale factor of 2. **400% zoom** (US1 scenario 4): a 320 px viewport with a factor of 4.
  The layout must be one column at 320 px.
- **Text spacing** (FR-021, WCAG 1.4.12): a style sheet sets line height 1.5, paragraph spacing 2
  em, letter spacing 0.12 em and word spacing 0.16 em on everything. Then: no horizontal scroll,
  no element with `overflow: hidden` or `clip` whose content is larger than its box, and no two
  text boxes that overlap.
- **Long words** (FR-022): Vitest renders a fixture CV with a 120-character word in a project
  name and a 200-character URL in a summary, at 320 px. The style sheet sets
  `overflow-wrap: anywhere` on text that holds CV content.

## R20. CI and merge blocking

**Decision** ([contracts/ci.md](./contracts/ci.md)):

- A new job, `site`: checkout, Node from `.nvmrc`, `npm ci`, Playwright's browser cache keyed by
  the Playwright version, `npx playwright install --with-deps chromium`, then
  `npm run site-check`. The report goes to the job log and, in a code block, to the job summary.
- The `test` job gets the same browser install, because the page tests and the site check's own
  tests open Chromium.
- The ruleset requires `site`, beside `traceability`, `test`, `content` and `tokens` (FR-048).
  Applying it is a repository setting made during the pull request, as in 002 and 003.
- Installing the browser needs the network, like `npm ci`. The checks themselves don't (FR-057).

## R21. Testing

**Decision**:

- **Page tests**, `packages/web/test/`: Vitest. A helper builds the real site once per run into a
  temporary directory and exposes the SSR render functions. Each test renders a page with the
  real CV or a fixture CV, serves it with the real style sheet and fonts through the local server,
  and queries it in Chromium. Fixture CVs live in `packages/web/test/__fixtures__/` and cover the
  spec's edge cases: no name, no summary, no URL, no dates, partial dates, same-month range, end
  date only, empty sections, long words, non-ASCII text.
- **Check tests**, `tools/site-check/test/`: each part against small fixture sites under
  `__fixtures__/` (a link with no accessible name, low contrast, a blocking 2 MB script, a
  script-only section, fonts left out of the precache, a removed focus outline, an analytics
  script from another site, a `certificates` entry), each asserting the report names what the spec
  says it names (US2). A seeded fixture with problems in every part has an `expected-report.txt`,
  as in 001 to 003. The `__fixtures__` directories are skipped by every check, so their `.html`
  files don't upset 003's reader.
- **Offline update tests**: two versions of a fixture build, B differing from A in one text; a
  third, C, whose font file answers 500. Tests assert US4 scenarios 3 and 4 with the server's files
  switched between visits.
- **Self-check**: the CI `site` job is the run over the real repository. A Vitest test runs
  `npm run site-check` on the real repository only off CI, as 001 does for its performance test,
  because the CI job already runs it.
- Test titles carry `004-cv-page-FR-###`, which the traceability check reads.

## R22. The design gate under the interim provision

design/review.md is signed, with the wireframes and four PNG exports from Penpot revision 10, but
its Penpot link reads "to be added by the owner", and Penpot can't be reached until at least
2026-10-26. Constitution 1.2.0's interim provision lets a design that already exists in Penpot
keep its exports and sign-off and add its link later, so the gate passes and UI tasks can start
once 1.2.0 is merged. No local mockup is needed for this feature: the approved design is the
Penpot exports.

The provision's ending steps for this feature, in one follow-up pull request:

1. Import the hand-written export into Penpot and export it again (R6, quickstart 11).
2. Add the Penpot link to design/review.md and tick the spec's Design box.
3. If the round trip changed any value, regenerate the token output and run every check.
