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

The tokens the page reads from `@cv/tokens` (R6, FR-043, FR-044), approved by the owner before
implementation. Names follow 003's naming rules and keep the starter's names where the role
matches (`color.base.ink`, `color.base.paper`, `color.text.primary`, `color.surface`, `space.1`,
`space.2`, `space.4`, `space.8`, `border.thin`, `breakpoint.wide`, `font.family.body`,
`font.size.body`, `font.weight.regular`, `font.letter-spacing.normal`, `typography.body`). Names
and values come from direction C's HTML exploration and the Penpot token script written with it
on 2026-10-22, so they stay the same when the file is imported into Penpot. Sizes are unitless
pixels, as Penpot writes them.

**`base` set**

| Tokens | Type | Values |
|--------|------|--------|
| `color.base.ink`, `.paper`, `.stone`, `.graphite`, `.mist`, `.indigo`, `.white` | color | `#121212`, `#f4f4ef`, `#55554f`, `#2b2b28`, `#d6d6ce`, `#3730a3`, `#ffffff` |
| `font.family.display`, `.body`, `.mono` | fontFamilies | `["Space Grotesk", "sans-serif"]`, `["Schibsted Grotesk", "sans-serif"]`, `["JetBrains Mono", "monospace"]` |
| `font.weight.regular`, `.medium`, `.semibold` | fontWeights | `400`, `500`, `600` |
| `font.size.label`, `.chip`, `.small`, `.mono`, `.body`, `.h4`, `.lead-narrow`, `.lead-wide`, `.h3-narrow`, `.h3-wide`, `.h2-narrow`, `.h2-wide`, `.notfound-narrow`, `.name-narrow`, `.notfound-wide`, `.name-wide` | fontSizes | `12`, `12.5`, `13`, `14`, `16`, `17`, `17`, `20`, `20`, `22`, `26`, `30`, `44`, `56`, `72`, `104` |
| `font.letter-spacing.normal`, `.role`, `.label`, `.h3`, `.h2-narrow`, `.h2-wide`, `.notfound-narrow`, `.notfound-wide`, `.name-narrow`, `.name-wide` | letterSpacing | `0`, `0.3`, `0.7`, `-0.2`, `-0.5`, `-0.6`, `-1.3`, `-2.2`, `-2.2`, `-4.2` |
| `font.case.label` | textCase | `uppercase` |
| `space.0_5`, `.1`, `.1_5`, `.2`, `.2_5`, `.3`, `.4`, `.5`, `.6`, `.7`, `.8`, `.10`, `.11`, `.12`, `.14`, `.16`, `.22`, `.24` | spacing | `2`, `4`, `6`, `8`, `10`, `12`, `16`, `20`, `24`, `28`, `{space.4} * 2`, `40`, `44`, `48`, `56`, `64`, `88`, `96` |
| `size.page`, `size.section-label`, `size.timeline-dot`, `size.notfound-title`, `size.target` | sizing | `1180`, `260`, `9`, `600`, `24` |
| `border.thin`, `border.thick` | borderWidth | `1`, `2` |
| `radius.pill` | borderRadius | `999` |
| `breakpoint.wide` | dimension | `900` |

Typography tokens, each referring to a family, size, weight and letter spacing above, with a
line height (and `font.case.label` for `level`):

| Token | Family | Size | Weight | Letter spacing | Line height |
|-------|--------|------|--------|----------------|-------------|
| `typography.role` | mono | mono | medium | role | 1.5 |
| `typography.name-wide`, `typography.name-narrow` | display | name-wide, name-narrow | semibold | name-wide, name-narrow | 0.95 |
| `typography.lead-wide`, `typography.lead-narrow` | body | lead-wide, lead-narrow | regular | normal | 1.55 |
| `typography.label` | mono | mono | regular | normal | 1.5 |
| `typography.section-number` | mono | small | medium | normal | 1.5 |
| `typography.h2-wide`, `typography.h2-narrow` | display | h2-wide, h2-narrow | semibold | h2-wide, h2-narrow | 1.1 |
| `typography.date` | mono | small | medium | normal | 1.5 |
| `typography.h3-wide`, `typography.h3-narrow` | display | h3-wide, h3-narrow | semibold | h3 | 1.25 |
| `typography.org` | body | body | medium | normal | 1.6 |
| `typography.body` | body | body | regular | normal | 1.6 |
| `typography.marker` | mono | small | regular | normal | 1.6 |
| `typography.h4` | display | h4 | semibold | normal | 1.4 |
| `typography.level` | mono | label | regular | label | 1.5 |
| `typography.chip` | mono | chip | regular | normal | 1.5 |
| `typography.small` | mono | small | regular | normal | 1.5 |
| `typography.link` | mono | body | medium | normal | 1.5 |
| `typography.notfound-wide`, `typography.notfound-narrow` | display | notfound-wide, notfound-narrow | semibold | notfound-wide, notfound-narrow | 1 |

**`light` set**

| Token | Refers to | Role |
|-------|-----------|------|
| `color.surface` | `{color.base.paper}` | page background |
| `color.surface-raised` | `{color.base.white}` | chip fill |
| `color.text.primary` | `{color.base.ink}` | text, links |
| `color.text.secondary` | `{color.base.stone}` | dates, labels, levels, footer |
| `color.text.list` | `{color.base.graphite}` | highlight text |
| `color.text.accent` | `{color.base.indigo}` | role, section numbers, organizations, skill levels, list markers |
| `color.rule.strong` | `{color.base.ink}` | section and contact top rules |
| `color.rule.subtle` | `{color.base.mist}` | light rules, timeline line, chip outline |
| `color.link.underline` | `{color.base.indigo}` | link underline, timeline dot |
| `color.focus` | `{color.base.indigo}` | focus outline |

How the layout uses them:

- **Page**: a column at most `size.page` wide, centered, with `space.14` padding on each side
  from `breakpoint.wide`, so the content is 1068 px wide. Below `breakpoint.wide`, the side
  padding is `space.5` (the phone margin). Each section's heading column is
  `size.section-label` wide from `breakpoint.wide`.
- **Links**: underline `border.thick` thick in `color.link.underline`, offset `space.1`.
- **Focus**: an outline `border.thick` wide in `color.focus`, offset `space.0_5`.
- **Targets**: standalone links are at least `size.target` tall (FR-028).
- **Timeline**: a `border.thin` line in `color.rule.subtle`; dots `size.timeline-dot` across,
  with a `border.thick` ring in `color.link.underline` on `color.surface`.
- **Chips**: `border.thin` in `color.rule.subtle`, on `color.surface-raised`, `radius.pill`.
- A few of the exploration's values are off the spacing scale: the phone timeline indent
  (22 px), chip padding (3 × 9 px) and the dot's offset (derived from the indent). The CSS
  snaps them to the nearest token or derives them with `calc()` over tokens, and the owner
  checks the result against the exports (T105).

In the export, typography values use Penpot's written keys (`fontFamilies` as a list,
`fontSizes`, `fontWeights`, `letterSpacing`, `lineHeights`, `textCase`), as in 003's starter.
The colors are written in lowercase, as Penpot writes them, and compared with design/review.md's
uppercase values without regard to case.

`color.base.graphite` and `color.base.white` are in the approved exports (highlight text and chip
fill) but not in design/review.md's list of five colors. Both are decoration or body text with
sufficient contrast: graphite on the background is 12.9:1.

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
