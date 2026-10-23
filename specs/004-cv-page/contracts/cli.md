# Contract: Site Check Command and Report

**Feature**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md) |
**Research**: [research.md](../research.md) (R11 to R19)

The owner runs this locally, and the pull-request workflow runs the same command
([ci.md](./ci.md)). It follows the shape of 001 to 003's checks: one command, one report, a
summary, and exit codes 0, 1 and 2.

## Command

```sh
npm run site-check
```

Behind the script:

```sh
npm run build && node tools/site-check/src/main.js
```

- Run from the repository root. Takes no arguments; any argument is a usage error (exit 2).
- Needs Playwright's Chromium, installed once with `npx playwright install chromium`. If it's
  missing, the check exits 2 and says so.
- Reads `packages/web/dist/` and `packages/content/resume.json`. Writes only temporary browser
  profiles and PDFs under the system's temporary directory, removed at exit.
- Starts the local server on `127.0.0.1` at a free port, and stops it at exit.
- Every browser it starts can reach only `127.0.0.1` (research R17). It needs no network beyond
  the machine (FR-057).
- Takes under 5 minutes on the owner's machine (SC-009). An estimate: build 10 s, Lighthouse
  6 runs at about 15 s, every other part under 60 s together.

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Every part passed |
| `1` | At least one part failed, or crashed (`error`) |
| `2` | The check couldn't start: an argument, Node older than 26, the build failed, Chromium isn't installed, or a dependency is missing. The message goes to stderr |

## Output streams

The report goes to stdout. stderr carries only:

- `usage: npm run site-check (takes no arguments)`;
- `site check needs Node 26 or later (see .nvmrc), but this is Node <version>`;
- `site check needs Chromium: run npx playwright install chromium`;
- `site check could not start: <message>`.

## Report format

Plain text, UTF-8, `\n` line endings. Problem lines first, sorted by part (in the order of the
summary), page, variant, type and subject. Then one empty line, then the summary. With no
problems, the report starts at the summary.

### Problem line

```text
<part> <page> <variant> <type> <subject>: <detail>
```

`<page>` is a URL path, or `-` for the `content` part. `<variant>` is a width (`375px`), a profile
(`mobile`), a zoom (`400%-zoom`), a paper size (`A4`), a mode (`forced-colors`) or `-`.

Examples, one per kind (selectors, values and scores are illustrative):

```text
content - - unsupported-section certificates: the CV document has 2 certificates entries, which /cv doesn't show yet
content - - unsupported-field basics.phone: /cv doesn't show this field
accessibility /cv 375px axe:color-contrast main > section:nth-of-type(2) p.summary: Element has insufficient color contrast of 3.2 (foreground #8a8a85, background #f4f4ef, 4.5:1 expected)
accessibility /missing-page 1440px axe:link-name footer > a: Links must have discernible text
lighthouse /cv mobile low-score performance: 85 (runs 84, 85, 87); needs 90
no-script /cv 320px missing-field projects[2].name: "Guided Tours System" is not in the page with scripting off
no-script /cv 1440px out-of-order education[0].institution: appears before work[0].position
no-script /cv 320px unstyled body: the style sheet did not apply (background is rgba(0, 0, 0, 0), expected the background token)
offline /cv 375px missing-font "Space Grotesk": text in h1 was drawn in "Times New Roman" with the network off
offline / 375px no-redirect /: did not lead to /cv with the network off (got a browser error page)
keyboard /cv 1440px no-focus-indicator a[href="https://github.com/alex-profir"] "alex-profir": no visible change when focused
keyboard /cv 375px out-of-order a[href="mailto:…"]: focus reached it 3rd, its reading position is 2nd
keyboard /cv 375px not-reached a[href="/cv"]: never received focus
keyboard /cv 1440px covered a[href="…"]: covered by div.banner when focused
other-sites /cv 375px other-site-request https://www.googletagmanager.com/gtag/js?id=G-X: requested by the page
fonts /cv 1440px missing-glyph U+0219 ș: in section "Education" (p.org), drawn in a fallback font
layout /cv 320px horizontal-scroll document: 412px wide in a 320px viewport
layout /cv text-spacing clipped p.summary: content 140px tall in a 120px box with overflow hidden
print /cv A4 heading-at-page-end h2 "Projects": last line of page 2
print /cv Letter missing-address a "alex-profir": https://github.com/alex-profir is not printed
print /cv A4 site-element-printed footer: "How this page was built" is printed
modes /cv forced-colors invisible-separator hr.rule: no border in forced colors
modes /cv reduced-motion motion p.date: transition-duration 200ms
<part> <page> <variant> error <part>: the part crashed: <message>
```

### Summary

```text
Site check: FAILED

  Site:   packages/web/dist/site (version 1a2b3c4d5e6f7a8b)
  Pages:  /cv (200), /missing-page (404, the not-found page)

  content         pass
  accessibility   fail    /cv 320px pass, /cv 375px fail (1), /cv 1440px pass,
                          /missing-page 320px pass, /missing-page 375px pass, /missing-page 1440px fail (1)
  lighthouse      fail    /cv mobile:  performance 85, accessibility 100, best-practices 100, seo 100
                          /cv desktop: performance 100, accessibility 100, best-practices 100, seo 100
  no-script       pass    /cv 320px, /cv 1440px
  offline         pass    /cv, /, /missing-page
  keyboard        pass    /cv 375px, /cv 1440px, /missing-page 375px, /missing-page 1440px
  other-sites     pass    …
  fonts           pass    …
  layout          pass    …
  print           pass    /cv A4, /cv Letter
  modes           pass    …

  4 problems in 2 parts. 9 of 11 parts passed.
```

- Every part, page and variant is listed, passing or not (FR-058, US2 scenario 1).
- Every Lighthouse category of every page and profile is listed with its median score.
- The first line is `Site check: PASSED` or `Site check: FAILED`.

## Determinism

For the same files, two runs give the same result (FR-049, SC-009): the same exit code, the
same problem lines, and the same summary once every Lighthouse score is replaced by `<n>`.
Lighthouse scores may differ by a point or two between runs and machines, so whether a score is
90 or more is part of the result, and the exact number isn't. The median of three runs keeps the
pass or fail result stable for a page that scores near 100 (research R13). Tests that compare
two reports mask the scores the same way.
