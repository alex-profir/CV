# Data Model: The /cv Page

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

This feature stores nothing at run time except the visitor's stored copy (R4). The entities below
are what the build reads, what it produces, and what the site check reports.

## Inputs

### CV document

`resume` from `@cv/content` (002): JSON Resume 1.3.1, every field optional, typed by
`shape.generated.ts`. The page reads it only through the package (Constitution IV).

### Site data

`siteData` from `@cv/content`. This feature adds one field, following 002's
[site-data-rules.md](../002-cv-content/contracts/site-data-rules.md):

| Field | Type | Rule | Used for |
|-------|------|------|----------|
| `repository` | string, `format: uri` | Optional. An `https` address. Holds no CV fact | The footer's "How this page was built ↗" link. When absent, the footer is left out |

### Supported content

`packages/web/src/supported.ts`, the Key Entities table as data (FR-002, FR-005):

| Section | Shown fields (JSON Resume names) |
|---------|----------------------------------|
| `basics` | `name`, `label`, `email`, `url`, `summary`, `location.city`, `location.region`, `location.countryCode`, `profiles` |
| `basics.profiles[]` | `network`, `username`, `url` |
| `work[]` | `name`, `position`, `location`, `url`, `startDate`, `endDate`, `description`, `summary`, `highlights` |
| `projects[]` | `name`, `description`, `entity`, `type`, `roles`, `url`, `startDate`, `endDate`, `highlights`, `keywords` |
| `education[]` | `institution`, `area`, `studyType`, `url`, `startDate`, `endDate`, `score`, `courses` |
| `skills[]` | `name`, `level`, `keywords` |
| `languages[]` | `language`, `fluency` |
| `interests[]` | `name`, `keywords` |

Ignored, neither shown nor reported: `$schema`, `meta`. Unsupported sections: `volunteer`,
`awards`, `certificates`, `publications`, `references`. Any other field present in the CV
document, such as `basics.phone`, `basics.image` or `basics.location.address`, is unsupported.

**Validation** (the site check's `content` part, FR-005):

- An unsupported section that is an array with at least one entry → `unsupported-section`, naming
  the section and its entry count.
- A field present (not `undefined`) and not in the table → `unsupported-field`, naming its JSON
  path, such as `basics.phone` or `work[0].contact`.
- An unsupported section that is absent or `[]` → nothing (Clarifications).

### Site text

`packages/web/src/site-text.ts`: one exported object of English strings, holding no CV fact
(FR-006). Its keys:

| Key | Value (from the approved design) |
|-----|----------------------------------|
| `siteHeading` | `CV` (the `h1` and title when the CV has no name, FR-023, FR-037) |
| `titleSeparator` | ` — ` |
| `sections` | `Experience`, `Projects`, `Skills`, `Education`, `Languages`, `Interests` |
| `basedIn`, `email`, `website` | `Based in`, `Email`, `Website` (the last for `basics.url`, which the real CV doesn't hold, so the design shows no row for it) |
| `present` | `Present` (visible), `present` (screen reader text) |
| `to` | `to` (screen reader text between dates) |
| `monthsShort`, `monthsLong` | `Jan` … `Dec`, `January` … `December` |
| `rangeSeparator` | ` – ` (visible only) |
| `builtWith` | `How this page was built` |
| `notFound` | `404 · Not found`, `This page doesn't exist.`, `The address may be mistyped, or the page may have moved.`, `Go to the CV` |
| `profileLabel` | how a profile's accessible name joins network and username, `{network}: {username}` |

## Derived values

### Date value

From one CV date string (`iso8601` in JSON Resume: `YYYY`, `YYYY-MM` or `YYYY-MM-DD`):

| Field | Meaning |
|-------|---------|
| `raw` | The string as written, the `datetime` attribute |
| `precision` | `year`, `month` or `day`, from the string's form |
| `visible` | `2018`, `Jul 2018`, `29 Jul 2018` |
| `spoken` | `2018`, `July 2018`, `29 July 2018` |

### Date range

From an entry's `startDate` and `endDate` (FR-010):

| Start | End | Visible | Spoken |
|-------|-----|---------|--------|
| yes | yes, different at the shown precision | `Jul 2018 – Oct 2026` | `July 2018 to October 2026` |
| yes | yes, equal at the shown precision | `Jul 2018` | `July 2018` |
| yes | no | `Dec 2025 – Present` | `December 2025 to present` |
| no | yes | `Oct 2026` | `October 2026` |
| no | no | no date line | nothing |

"Equal at the shown precision": compared at the coarser of the two precisions, so `2018` and
`2018-07` show `2018` once. Each side keeps its own precision when they differ, so `2018` and
`2019-03` show `2018 – Mar 2019`. Nothing is invented (FR-009).

### Location line

`city`, `region` and the country's English name (R7), each only when present, joined by `, `.
An absent location gives no row at all (FR-004).

### Page title and description

| CV document holds | Title | Description |
|-------------------|-------|-------------|
| name and label | `Alex Profir — Software Engineer` | summary, else label |
| name only | `Alex Profir` | summary, else none declared |
| label only | `Software Engineer` | summary, else label |
| neither | `CV` | summary, else none declared |

## Token roles

The roles the page reads from `@cv/tokens` (R6, FR-043, FR-044). The token names are set in the
export, following 003's naming rules: by hand under the interim provision, then kept when the file
is imported into Penpot. The values come from the approved mockup (design/review.md
gives the colors).

| Role | Type | From the design |
|------|------|-----------------|
| Background | color | `#F4F4EF` |
| Text, primary | color | `#121212` |
| Text, secondary | color | `#55554F` |
| Rule, light (rules, timeline line, chip outline) | color | `#D6D6CE` |
| Accent (role, organization, links, timeline dot, focus) | color | `#3730A3` |
| Family: display, body, mono | fontFamilies | Space Grotesk, Schibsted Grotesk, JetBrains Mono, each with a generic fallback |
| Type scale: name (phone, desktop), section heading, entry heading, body, small, mono label | fontSizes, with typography tokens grouping family, size, weight, line height and letter spacing | from the mockup |
| Weights used | fontWeights | from the mockup |
| Spacing scale | spacing | from the mockup |
| Content width (1068), section heading column, page margin (phone 20) | sizing | from the mockup |
| Rule widths: light and strong | borderWidth | from the mockup |
| Chip radius | borderRadius | from the mockup |
| Timeline dot size | sizing | from the mockup |
| Focus outline width and offset | borderWidth, spacing | set with the design, at least 2 px wide |
| Minimum target size | sizing | 24 |
| Breakpoint where the two-column layout starts | dimension (`breakpoint.` name) | from the mockup |

Every token in the export must be read by the site, directly or through another token's reference
(FR-043). The motion token source is unchanged.

## Fonts

### Font family entry

One per family in `packages/web/src/fonts/fonts.json` ([contracts/fonts.md](./contracts/fonts.md)):

| Field | Meaning |
|-------|---------|
| `family` | The family name as the font token's first value names it |
| `token` | The font token it serves, such as `font.family.display` |
| `license` | Path of its license file, next to the files |
| `files[]` | One per subset: `file`, `subset`, `weight` (a range such as `300 700`), `style`, `unicodeRange` |

**Validation** (build, FR-045):

- Every `fontFamilies` token read by the site has an entry whose `family` equals the token's first
  value. Otherwise the build fails, naming the token.
- Every entry's `token` exists and its first value equals `family`.
- Every file and the license exist.

## Build output

### Route table

`packages/web/src/routes.ts`, copied into the site manifest:

| Kind | Path | Answer |
|------|------|--------|
| page | `/cv`, `/cv/` | `cv.html`, 200 |
| redirect | `/` | 307 to `/cv`, query string kept |
| not found | any other path | `404.html`, 404 |

### Site manifest

`packages/web/dist/site-manifest.json` ([contracts/site.md](./contracts/site.md)):

| Field | Meaning |
|-------|---------|
| `version` | Hash over every served file's hash |
| `routes` | The route table above |
| `files[]` | Every file under `dist/site/`: `path` (URL path), `hash`, `type` |

### Stored copy

What the service worker keeps (R4):

| Field | Meaning |
|-------|---------|
| Cache name | `cv-<version>` |
| Entries | Every file in the manifest except `/sw.js` |

**State transitions**:

```text
(no worker) --first visit, install succeeds--> stored copy V1, active
V1 active --release V2, visit, install succeeds--> V2 stored and active, V1 deleted
V1 active --release V2, visit, install fails--> V1 still stored and active (no partial V2)
any --storage unavailable--> no stored copy; the page works online, no error
```

## Site check

### Part

One of `content`, `accessibility`, `lighthouse`, `no-script`, `offline`, `keyboard`,
`other-sites`, `fonts`, `layout`, `print`, `modes` (research R11).

### Check result

| Field | Meaning |
|-------|---------|
| `part` | The part |
| `page` | URL path, or `-` for `content` |
| `variant` | The width (`375px`), profile (`mobile`), zoom (`400% zoom`), paper (`A4`) or mode (`forced colors`) |
| `status` | `pass`, `fail` or `error` (the part crashed) |
| `problems[]` | What failed |
| `scores` | For `lighthouse`: each category's median score, 0 to 100, and the three runs |

### Problem

| Field | Meaning |
|-------|---------|
| `part`, `page`, `variant` | As above |
| `type` | Such as `axe:color-contrast`, `low-score`, `missing-field`, `missing-font`, `no-focus-indicator`, `other-site-request`, `unsupported-section` |
| `subject` | The element's selector, the link, the category, the field's JSON path, the font, the character or the address |
| `detail` | One sentence, from the tool where it has one (axe's summary) |

### Report

Every problem in a stable order (part, page, variant, then subject), then a summary of every
check result and every Lighthouse score ([contracts/cli.md](./contracts/cli.md)).
