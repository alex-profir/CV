# Contract: The Pages

What `/cv` and the not-found page contain, as HTML a test can query. The visual design is the
approved mockup ([design/review.md](../design/review.md)). This contract fixes the structure, the
fields and the `data-req` targets.

## Document

Both pages:

```html
<!doctype html>
<html lang="en">                                     <!-- FR-027 -->
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>…</title>                                    <!-- FR-036, FR-037 -->
  <meta name="description" content="…">              <!-- only when there is a description -->
  <meta property="og:title" content="…">
  <meta property="og:description" content="…">       <!-- only when there is a description -->
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="data:,">
  <link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/…">  <!-- one per above-the-fold family -->
  <link rel="stylesheet" href="/assets/…css">
  <script type="module" src="/assets/…js"></script>  <!-- service worker registration only -->
</head>
<body>
  <main data-req="004-cv-page-FR-025">…</main>
  <footer data-site-element>…</footer>               <!-- only when siteData.repository exists -->
</body>
</html>
```

Never present: `<link rel="canonical">`, `og:url`, `og:image`, a web app manifest, any element
loaded from another origin, any `<noscript>`, `<button>` or form control (FR-015, FR-016,
FR-017, FR-036).

The not-found page has `<title>` `404 · Not found`, no description, and no CV fact (FR-006).

## /cv: structure

```text
main
├── div.intro                                  (basics block, no heading of its own)
│   ├── p.role             basics.label        (before the h1, as in the design)
│   ├── h1                 basics.name, or "CV"                     FR-023
│   ├── p.summary          basics.summary
│   └── dl.contact
│       ├── Based in   →   location line                            FR-008
│       ├── Email      →   a[href="mailto:…"] basics.email           FR-012
│       ├── Website    →   a basics.url        (when present; label is site text)
│       └── ul.profiles →  li per profile                            FR-026
├── section[aria-labelledby] → h2 "Experience"                      FR-024, FR-025
│   └── ol.timeline → li per work entry
│       ├── p.date              date range                          FR-009 to FR-011
│       ├── h3                  position, or name when no position  FR-024
│       ├── p.org               name (link when url), location
│       ├── p                   summary, then description
│       └── ul.highlights       li per highlight                    FR-026
├── section → h2 "Projects"
│   └── ol.timeline → li per project
│       ├── p.date
│       ├── h3                  name (link when url)                FR-012, FR-013
│       ├── p.meta              entity, type, roles
│       ├── p                   description
│       ├── ul.highlights
│       └── ul.chips            li per keyword
├── section → h2 "Skills"
│   └── ul → li per skill: name, level, ul.chips of keywords
├── section → h2 "Education"
│   └── ol.timeline → li per entry
│       ├── p.date
│       ├── h3                  studyType, area (whichever exist, joined by ", ")
│       ├── p.org               institution (link when url), score
│       └── ul.chips            li per course
├── section → h2 "Languages"
│   └── ul → li per language: language, fluency
└── section → h2 "Interests"
    └── ul → li per interest: name, keywords joined by ", "
```

- A section is rendered only when its array has at least one entry. An absent field leaves out its
  element, its label and its separator (FR-004).
- When an entry has no field for its `h3` (a work entry with neither position nor name, a project
  with no name, an education entry with neither study type nor area), the `h3` holds the first
  field present from: organization, then date. If the entry holds nothing shown, it isn't rendered.
- The section number before each `h2` (`01` to `06`) is `aria-hidden="true"`, and numbered by the
  sections actually shown.
- No element is reordered with CSS `order`, `flex-direction: *-reverse`, `grid` placement out of
  source order, or absolute positioning (FR-027).

## Fields

| Field | Element | Notes |
|-------|---------|-------|
| `basics.name` | `h1` | |
| `basics.label` | `p.role` | |
| `basics.email` | `a[href="mailto:<email>"]` | Text is the address |
| `basics.url` | `a[href]` | Text is the address without the scheme |
| `basics.summary` | `p.summary` | |
| `basics.location.*` | `dd` | `city, region, Country` |
| profile `network`, `username`, `url` | `li > a[href]` or `li > span` | Text is the username, or the network when there's no username. Accessible name `GitHub: alex-profir` via visually hidden text. No URL → plain text (FR-012) |
| `startDate`, `endDate` | `p.date` | See [Dates](#dates) |
| work `name`, `url`, `location` | `p.org` | Name is a link when `url` exists |
| work `position` | `h3` | |
| work `summary`, `description` | `p` | |
| `highlights[]` | `ul.highlights > li` | |
| project `name`, `url` | `h3`, its text a link when `url` exists | |
| project `entity`, `type`, `roles[]` | `p.meta` | Joined by ` · `, roles by `, ` |
| project `description` | `p` | |
| `keywords[]`, `courses[]` | `ul.chips > li` | |
| education `institution`, `url`, `score` | `p.org` | |
| education `studyType`, `area` | `h3` | |
| skill `name`, `level`, `keywords[]` | `li` | Level shown in capitals by CSS, written as in the CV |
| language `language`, `fluency` | `li` | |
| interest `name`, `keywords[]` | `li` | |

Every CV string is rendered as written. React escapes it, and no CV text is ever passed as HTML
(FR-007). Text containers set `overflow-wrap: anywhere` (FR-022).

## Dates

```html
<p class="date" data-req="004-cv-page-FR-009 004-cv-page-FR-010 004-cv-page-FR-011">
  <span aria-hidden="true"><time datetime="2018-07">Jul 2018</time> – <time datetime="2026-10">Oct 2026</time></span>
  <span class="visually-hidden">July 2018 to October 2026</span>
</p>
```

Ongoing: `<time datetime="2025-12">Dec 2025</time> – Present`, spoken "December 2025 to present".
The visually hidden class keeps text in the accessibility tree and out of view and print.

## Links

- Every `a` has an `href`, and visible text or a visually hidden name (FR-013).
- External links (`http:`, `https:`) don't open a new window. A link whose visible text is not its
  address gets its address in print (FR-033).
- Decorative arrows are inline `<svg aria-hidden="true" focusable="false">` sized and stroked by
  CSS from tokens.

## `data-req` targets

| Element | `data-req` |
|---------|------------|
| `main` | `004-cv-page-FR-001 004-cv-page-FR-014 004-cv-page-FR-025 004-cv-page-FR-027` |
| each `section` | `004-cv-page-FR-002 004-cv-page-FR-004 004-cv-page-FR-024 004-cv-page-FR-026` |
| `h1` | `004-cv-page-FR-023` |
| `p.date` | `004-cv-page-FR-009 004-cv-page-FR-010 004-cv-page-FR-011` |
| the location `dd` | `004-cv-page-FR-008` |
| every CV link | `004-cv-page-FR-012 004-cv-page-FR-013 004-cv-page-FR-029` |
| text containers with CV text | `004-cv-page-FR-003 004-cv-page-FR-007 004-cv-page-FR-022` (on the containing section, not every node) |
| `footer` | `004-cv-page-FR-025 004-cv-page-FR-032` |
| not-found `main` | `004-cv-page-FR-019` |

Requirements about the whole page, its build or its checks (FR-005, FR-006, FR-015 to FR-018,
FR-020, FR-021, FR-028, FR-030 to FR-058) are Non-UI in plan.md's traceability table: they have
no single element, and are verified by tests and the site check.

## Not-found page

```text
main
├── p            "404 · Not found"
├── h1           "This page doesn't exist."
├── p            "The address may be mistyped, or the page may have moved."
└── a[href="/cv"]  "Go to the CV" + arrow svg
footer           as on /cv
```

## Print

Inside `@media print` (R9): one column; `footer` and `[data-site-element]` not displayed; text in
the primary text color; external links followed by `(<href>)` unless their text is the address;
`h2`, `h3` with `break-after: avoid`; each entry's date, heading and organization with
`break-inside: avoid`; no `@page` rule.
