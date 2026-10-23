# Feature Specification: Design Tokens Source

**Feature Branch**: `003-design-tokens`

**Created**: 2026-10-22

**Status**: Approved

<!--
  Status moves from Draft to Approved only when the project owner approves the spec.
  No code is written for this feature before then (Constitution I).
-->

**Input**: User description:

> Design tokens source. Short name: design-tokens.
>
> Why: Principle IV says design tokens come from Penpot, and code uses them only through the
> token output exported from Penpot. Literal values in components or styles block merge. Every
> UI feature (the /cv page first) needs this in place before it can merge, so it comes before
> any UI. The tokens are kept exactly as Penpot exports them, so they can be imported back into
> Penpot unchanged.
>
> Who uses it: the owner, when designing in Penpot and exporting tokens; later features, which
> read the tokens; reviewers, who see the check results on pull requests. It has no
> visitor-facing behavior yet.
>
> What it does:
>
> - All design tokens (color, typography, spacing, radii, shadows and motion) are defined in the
>   site's Penpot token file and committed to the repo as Penpot exports them, unchanged.
>   Updating the tokens is one export that replaces the committed files.
> - The committed export can be imported back into Penpot and gives the same tokens, sets and
>   themes.
> - The export is checked on every pull request and locally with one command, with the same
>   result, and without network access. The check never contacts Penpot.
> - The check fails when a token refers to a token that doesn't exist, when references form a
>   loop, when a theme names a set that doesn't exist, or when a token name can't be used from
>   code.
> - Code reads tokens through a description of their names and types, so using a token that
>   doesn't exist fails the checks before merge, not at runtime.
> - A check fails when the site's styles or components contain a literal design value (a color,
>   a length, a font family, a shadow, a duration or an easing curve) instead of a token. A short
>   list of neutral values is allowed, such as zero, inherit and the current text color. Specs,
>   docs and tests are not checked.
> - The token structure supports more than one theme, so a dark theme or per-shell values can be
>   added later without changing how code reads tokens. This feature ships one theme.
> - A starter token set covers every category with placeholder values, enough to prove the
>   pipeline end to end. Real values arrive with the /cv mockup.
> - Every problem is reported with the file, the token path and what is wrong, all in one run,
>   followed by a summary.
>
> Edge cases: an export that isn't valid syntax; a reference to a missing token; a reference
> loop; the same token name in two sets (set order decides which wins); a set that no theme
> uses; an empty set; colors with transparency; a token type Penpot doesn't support.
>
> Out of scope: the real visual design and token values (they come with the /cv mockup);
> choosing fonts and hosting font files; theme switching (the Settings feature); any page that
> previews tokens; the web app and deploys; pulling tokens from Penpot automatically.
>
> Shell scope: not a UI feature. Neither shell is affected, and the CV path is unchanged (no
> shells exist yet).
> Offline: no visitor-facing offline behavior. The checks run without network access.
> Design: No UI. Keep the spec free of tool, language and CI-provider choices; the plan decides
> those. Penpot is named because the constitution names it.

## Clarifications

### Session 2026-10-22

- Q: Penpot has no token type for durations or easing curves. How are motion tokens held? →
  A: In one motion token source in the repository, outside Penpot, in the same format as the
  Penpot export. It holds only durations and easing curves, follows the same rules as the
  export, and code reads it the same way. Motion is judged by running the app or an HTML mockup,
  which Penpot can't do. Constitution 1.1.0 amends Principle IV to allow it (FR-001, FR-008,
  FR-042 to FR-050).
- Q: Which theme combinations must give the same token names and types? → A: Exactly one theme
  from every theme group. Every theme must belong to a group, and a theme without one is
  reported. The starter theme gets a group, such as `mode` / `light` (FR-004, FR-023).
- Q: Can styles define their own local variables, or must every variable a style reads be a
  token? → A: Local variables are allowed. Tokens are read under a namespace reserved for them,
  which local names can't use, and any name read there that isn't a token is reported. A local
  variable's value must still come from tokens or neutral values (FR-026, FR-051).
- Q: Should breakpoints in screen-size conditions come from tokens or be left out of the
  literal-value check? → A: From tokens, like every other length. The export holds breakpoint
  tokens, the starter set includes one, the token output lets code use them in screen-size
  conditions, and a written-out breakpoint is reported (FR-006, FR-027, FR-052).
- Q: Should a plain number that the page treats as pixels or milliseconds be reported as a
  literal? → A: Yes. A plain number other than zero, in a setting that takes a length or a
  duration, is a literal length or duration. Plain numbers in other settings are not reported
  (FR-029, FR-053).
- Q: Should standalone vector image files, such as icons and illustrations kept as their own
  files, be searched for literal values? → A: No. They are image files and are skipped. An icon
  that must follow the theme is drawn in component markup, where it is checked, or uses the
  current text color (FR-028, FR-033).
- Q: When a theme group holds more than one theme, which one does the site use until theme
  switching exists? → A: The themes the export marks as active. Every group must have exactly
  one active theme, and the check reports a group with none or with more than one. The token
  output still holds every theme's values (FR-054).
- Q: In an icon drawn in component markup, should the drawing's own geometry be skipped by the
  literal-length check? → A: Yes. Coordinates, path data, the drawing area and shape sizes in
  drawing units are skipped. Colors, stroke width and the icon's displayed size are still
  checked (FR-053, FR-055).
- Q: Should the system color keywords the browser fills in from the visitor's operating system
  settings (such as `Canvas`, `CanvasText` and `Highlight`) be allowed without a token? → A:
  Only inside a condition that applies when forced colors (high contrast) are active. Anywhere
  else they are reported as literal colors (FR-029, FR-056).
- Q: Should site files be able to mark one line or block so the literal-value check skips it?
  → A: No. There is no skip marker. A value that's needed becomes a token, or the neutral-value
  list or the excluded files change through an edit to this spec (FR-057).
- Q: Should the check report a real token used in a setting that doesn't fit its type, such as
  a color token used as a padding? → A: No. Only names are checked. The types in the
  description serve the theme checks and code's own type checking (FR-026, FR-058).
- Q: A reference can resolve with one theme from each group active and fail with another pairing.
  Is it resolved per theme or per combination of themes? → A: Per combination: one theme from
  every theme group, as the themes are compared. A failure names the combination where it fails
  (FR-009).
- Q: Does a theme with no group, or one that enables no sets, take part in the comparison of
  themes and the active-theme rules? → A: No. It is reported once, for its own problem, and isn't
  compared or counted as active, so it doesn't cause a second report for every token (FR-004,
  FR-023, FR-054).
- Q: Should the width and height attributes of an embedded image, video, canvas or frame in
  component markup be checked as literal lengths? → A: No. They give the media's own size, so the
  page can keep its space while it loads. A size set through the element's styles is still
  checked (FR-028, FR-057).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Keep the tokens exactly as Penpot exports them, and check them (Priority: P1)

The owner designs the tokens in the site's Penpot file, exports them, and commits the export
as it is, replacing the previous one. They run the check and learn straight away whether every
reference resolves, every theme points at real sets, and every token can be imported back into
Penpot unchanged.

**Why this priority**: Constitution IV makes Penpot the source of every design token it can
hold. Without a committed, checked export there is nothing for code to read, and every UI
feature, starting with `/cv`, is blocked from merging.

**Independent Test**: with only the export and its check in place, run the check on the
starter tokens and confirm it passes. In a copy of the export, make one token refer to a token
that doesn't exist, run the check, and confirm it fails and names the file, the token path and
the missing token.

**Acceptance Scenarios**:

1. **Given** the committed export holds the starter tokens, **When** the owner runs the check,
   **Then** it passes and reports the number of sets, themes and tokens it checked.
2. **Given** the token `color.text.primary` refers to `color.base.ink`, which no set defines,
   **When** the check runs, **Then** it fails and reports the file, the path
   `color.text.primary`, and that `color.base.ink` doesn't exist.
3. **Given** `space.a` refers to `space.b` and `space.b` refers to `space.a`, **When** the
   check runs, **Then** it fails and reports one loop: `space.a`, `space.b`, `space.a`.
4. **Given** a theme enables the set `brand-dark`, which the export doesn't contain, **When**
   the check runs, **Then** it fails and reports the theme and the missing set.
5. **Given** a token whose type Penpot doesn't support, such as a duration type, **When** the
   check runs, **Then** it fails and reports the token path, its type, and that Penpot doesn't
   support it.
6. **Given** the owner changes a color in Penpot and exports again, replacing the committed
   export, **When** the checks run, **Then** they pass with no other edit, and code reads the
   new value.
7. **Given** the owner's machine has no network connection, **When** the owner runs the check,
   **Then** it completes and gives the same result as with a connection.

---

### User Story 2 - Code reads tokens by name, and a wrong name fails before merge (Priority: P2)

Later features read tokens through a description of every token's name and type, produced from
the export. When code uses a token that doesn't exist, for example because of a typo or a token
renamed in Penpot, the project's checks fail before merge, not when a visitor loads a page.

**Why this priority**: until code can read tokens, no UI feature can style anything without
literal values. It must be in place before the first UI feature starts.

**Independent Test**: write a small style that reads `color.text.primary` and one that reads
`color.text.primray`. Run the project's checks and confirm the first passes and the second
fails before merge, naming the token and the location.

**Acceptance Scenarios**:

1. **Given** a style that reads `color.text.primary` through the token output, **When** the
   project's checks run, **Then** they pass.
2. **Given** a style that reads `color.text.primray`, which doesn't exist, **When** the
   project's checks run, **Then** they fail and name the token, the file and the line.
3. **Given** component code that reads a token that doesn't exist, **When** the project's
   checks run, **Then** they fail and name the token and the code location.
4. **Given** the owner adds `color.accent` in Penpot and exports again, **When** code reads
   `color.accent`, **Then** the checks pass, with no separate, hand-written description to
   update.
5. **Given** the token `color.overlay` is half-transparent black, `#00000080`, **When** code
   reads it, **Then** it gets the same color with the same transparency.
6. **Given** the export holds both `space.1-5` and `space.1.5`, **When** the check runs,
   **Then** it fails and reports that code would read both under the same name.
7. **Given** a component's style defines a local variable for its padding, set from `space.4`,
   and reads that variable, **When** the project's checks run, **Then** they pass.
8. **Given** a style defines its own variable inside the token namespace, **When** the project's
   checks run, **Then** they fail and name the variable, the file and the line.
9. **Given** a style sets a padding from the color token `color.text.primary`, **When** the
   project's checks run, **Then** nothing is reported, because the token exists.

---

### User Story 3 - Block literal design values in the site's styles and components (Priority: P3)

When a style or component writes out a color, a length, a font family, a shadow, a duration or
an easing curve instead of reading a token, the check fails and says where. That way a design
change is always one edit at its source, and no page or app drifts from the design.

**Why this priority**: Constitution IV says literal design values block merge. It matters from
the first UI feature on, and that feature needs Stories 1 and 2 to have tokens to use instead.

**Independent Test**: add a style that sets a text color to `#1a1a1a`. Run the check and
confirm it fails and names the file, the line and the value. Put the same value in a spec, a
doc and a test, and confirm none of those is reported. Set a margin to zero and a border color
to the current text color, and confirm neither is reported.

**Acceptance Scenarios**:

1. **Given** a style sheet sets a padding of `12px`, **When** the check runs, **Then** it fails
   and reports the file, the line, the value `12px`, and that it is a literal length.
2. **Given** a component sets an inline background color of `#00000080`, **When** the check
   runs, **Then** it is reported as a literal color.
3. **Given** a style sets the font family to `Georgia, serif`, **When** the check runs,
   **Then** it is reported as a literal font family.
4. **Given** a style sets a transition of `200ms` with the curve `ease-out`, **When** the check
   runs, **Then** both the duration and the easing curve are reported.
5. **Given** a style reads `color.text.primary` with the fallback `#000000`, **When** the check
   runs, **Then** the fallback is reported as a literal color.
6. **Given** styles that set a margin of `0`, a color of `inherit`, a border color of the
   current text color, and a width of `100%`, **When** the check runs, **Then** none of them is
   reported.
7. **Given** a component uses a color from a styling tool's built-in palette instead of a
   token, **When** the check runs, **Then** it is reported as a literal color.
8. **Given** `#1a1a1a` appears in a comment in a style sheet, and in a spec, a doc, a test and
   the token export, **When** the check runs, **Then** none of them is reported.
9. **Given** a style changes its layout at a screen width of `768px`, written out, **When** the
   check runs, **Then** it is reported as a literal length. The same condition using the token
   `breakpoint.wide` is not reported.
10. **Given** a component sets an inline padding of `12` and an animation duration of `300`, both
    plain numbers the page treats as pixels and milliseconds, **When** the check runs, **Then**
    they are reported as a literal length and a literal duration. A line-height of `1.5` and an
    opacity of `0.8` in the same component are not reported.
11. **Given** an app icon kept as its own vector image file with several written-out colors, and
    an icon drawn in component markup with a fill of `#1a1a1a`, **When** the check runs,
    **Then** only the fill in the component markup is reported.
12. **Given** an icon drawn in component markup with a drawing area of `0 0 24 24`, path data,
    a circle of radius `4`, a stroke width of `2` and a displayed width of `24`, **When** the
    check runs, **Then** the stroke width and the displayed width are reported as literal
    lengths, and the drawing area, path data and radius are not.
13. **Given** a style sets a focus outline color of `Highlight` inside a condition that applies
    only when forced colors are active, and sets a border color of `CanvasText` outside any such
    condition, **When** the check runs, **Then** only the border color is reported, as a literal
    color.
14. **Given** a style sets a padding of `12px` on a line with a comment asking the check to
    skip it, **When** the check runs, **Then** the padding is reported as a literal length.

---

### User Story 4 - Add themes later without changing code (Priority: P4)

The export can hold more than one theme, for example a dark theme, or per-shell values for the
desktop and mobile shells. Every theme, and every combination of themes that can be active
together, gives code the same token names with the same types. A later feature can add a theme
in Penpot without touching code that reads tokens.

**Why this priority**: this feature ships one theme, so nothing needs a second one yet. The
structure has to allow it now, so later features (Settings, the shells) don't force a change
to every place that reads tokens.

**Independent Test**: with a test export that adds a `dark` theme defining the same token
names, run the checks and confirm they pass with no change to code that reads tokens. Remove
one token from the `dark` theme's sets and confirm the check fails, naming the theme and the
token.

**Acceptance Scenarios**:

1. **Given** a test export with `light` and `dark` themes in the group `mode` that define the
   same token names and types, **When** the checks run, **Then** they pass, and code that reads
   tokens is unchanged.
2. **Given** the `dark` theme's sets don't define `color.text.primary`, **When** the check runs,
   **Then** it fails and reports the theme `dark` and the missing token.
3. **Given** `color.surface` is a color in the `light` theme and a number in the `dark` theme,
   **When** the check runs, **Then** it fails and reports the token and both types.
4. **Given** themes `light` and `dark` in the group `mode`, and `desktop` and `mobile` in the
   group `shell`, and every combination of one theme per group gives the same token names and
   types, **When** the check runs, **Then** it passes.
5. **Given** the sets `base` and `brand` both define `color.accent` as a color, `brand` comes
   later in the set order, and a theme enables both, **When** the tokens are resolved for that
   theme, **Then** `color.accent` has the value from `brand`, and no problem is reported.
6. **Given** a set `drafts` that no theme enables, **When** the check runs, **Then** it fails
   and reports the set as unused.
7. **Given** themes `light` and `dark` in the group `mode`, and the export marks `light` as
   active, **When** code reads `color.text.primary`, **Then** it gets the value from `light`,
   and the derived output also holds the value from `dark`.
8. **Given** the export marks both `light` and `dark` as active in the group `mode`, or marks
   neither, **When** the check runs, **Then** it fails and reports the group `mode` and the
   active themes it found.

---

### User Story 5 - Tune motion in the repository (Priority: P5)

The owner keeps durations and easing curves in the motion token source, because Penpot can't
hold them. They change a value, watch it move in the app or an HTML mockup, and run the check.
The check makes sure the source holds only motion and follows the same rules as the export, and
code reads motion tokens like any other token.

**Why this priority**: nothing animates yet, and a UI feature without animation can ship
without it. It has to be in place before the first feature that animates, so that feature
doesn't write durations and easing curves out.

**Independent Test**: with the starter motion tokens in place, run the check and confirm it
passes. Put a color token in the motion token source, run the check, and confirm it fails and
names the file, the token path, and that colors belong in Penpot.

**Acceptance Scenarios**:

1. **Given** the motion token source holds the duration `motion.duration.fast` of `150ms` and
   the easing curve `motion.easing.standard`, **When** the check runs, **Then** it passes, and
   the summary counts the motion tokens.
2. **Given** a color token `color.flash` in the motion token source, **When** the check runs,
   **Then** it fails and reports the file, the path `color.flash`, and that colors belong in
   Penpot.
3. **Given** the export holds a number token named `motion.duration.fast`, and the motion token
   source holds a duration with the same name, **When** the check runs, **Then** it fails and
   reports the name as defined in both sources.
4. **Given** `motion.duration.slow` refers to `space.4` in the export, **When** the check runs,
   **Then** it fails and reports a reference between the two sources.
5. **Given** an easing curve whose first number is `1.5`, **When** the check runs, **Then** it
   fails and reports the curve as invalid.
6. **Given** code reads `motion.duration.fast` the same way it reads `color.text.primary`,
   **When** the project's checks run, **Then** they pass, and a misspelled motion token fails
   them as in Story 2.
7. **Given** the owner changes `motion.duration.fast` to `200ms`, **When** the checks run,
   **Then** they pass with no other edit, and code reads the new value.

---

### Edge Cases

- **An export that isn't valid syntax**: reported with the file and the line and column where
  reading failed. Any other export files are still checked. Checks that need the unreadable
  file are reported as not run, and the check fails.
- **An export, or a file the export lists, that is missing**: reported, and the check fails.
- **A reference to a missing token**: reported with the file, the referring token's path, the
  name referred to, and the combination of themes in which it fails to resolve. A reference that
  resolves in one combination but not in another is reported for the combination where it fails.
- **A reference loop**: reported once, listing every token in the loop in order. Tokens that
  only depend on the loop are not reported again.
- **References inside composite values** (such as one part of a typography or shadow token) and
  **inside arithmetic** (such as twice a spacing token): checked like any other reference.
- **A reference to a token of an unsuitable type**, such as a color that refers to a spacing
  token: reported as an invalid value for its type.
- **The same token name in two sets** that a theme enables: the set later in the set order
  wins, and this is accepted. If the two definitions have different types, it is reported.
- **The same token name twice in one set**: reported with both occurrences.
- **A set that no theme enables**: reported as unused, because code can never read its tokens.
- **An empty set**: accepted.
- **A theme that enables no sets**, or an export with no theme at all: reported. Such a theme
  takes no part in the comparison of themes or the active-theme rules, so it is reported only
  once.
- **A theme that isn't in a theme group**: reported, because the themes compared are exactly one
  from every group. It takes no part in the comparison or the active-theme rules either.
- **A theme group with no active theme, or with more than one**: reported, because the site
  uses exactly one theme from every group. So is a group whose active theme differs between the
  two sources.
- **Colors with transparency**: accepted in every form Penpot accepts, and code reads the
  transparency unchanged.
- **A token type Penpot doesn't support in the export**, or content Penpot doesn't write in an
  export: reported, because the export could not be imported back into Penpot unchanged.
- **A token in the motion token source that isn't a duration or an easing curve**: reported,
  because it belongs in Penpot.
- **A name defined in both sources**, or two names in different sources that code would read
  as the same name: reported.
- **A reference between the two sources**, in either direction: reported.
- **A negative duration**, or **an easing curve** that isn't four numbers, or whose first or
  third number is outside 0 to 1: reported.
- **A motion token source that is missing or isn't valid syntax**: reported like the export.
- **Token names code can't use**: a name with an empty part, a part with characters other than
  ASCII letters, digits, hyphens and underscores, two names code would read as the same, and a
  name that is both a token and a group of tokens are all reported.
- **Non-ASCII characters in token descriptions**: accepted and kept exactly.
- **Derived output edited by hand or left stale** after a new export: reported.
- **A real token used in a setting that doesn't fit its type**, such as a color token used as a
  padding: not reported. Only the name is checked.
- **A local style variable**: accepted outside the token namespace, with its value checked like
  any other style value. A local variable defined inside the token namespace is reported.
- **A literal design value used as the fallback** of a token reference: reported.
- **A literal design value in a comment**: not reported.
- **A written-out breakpoint** in a screen-size condition: reported as a literal length, like any
  other length.
- **A written-out shadow**: reported once, as a shadow, not once for each length and color in it.
- **Values that aren't design lengths**: percentages, viewport-relative units, grid fractions and
  plain numbers in settings that don't take a length or a duration are not reported.
- **A plain number the page treats as pixels or milliseconds**, such as an inline padding of `12`
  or an animation duration of `300`: reported as a literal length or duration.
- **Design values from a styling tool's built-in scale or palette**, rather than from the
  tokens: reported, as literals.
- **Literal design values in files that aren't site source**: specs, documentation, tests and
  test fixtures, the token export, the motion token source, output derived from them, the
  project's own tooling, third-party code, generated files, image and font files (including
  standalone vector images) and version-control data are not searched.
- **A literal color in a standalone vector image file**, such as an app icon: not reported. The
  same color in an icon drawn in component markup is reported.
- **The geometry of an icon drawn in component markup** (its coordinates, path data, drawing
  area and shape sizes in drawing units): not reported. The icon's colors, stroke width and
  displayed size are checked like any other style value.
- **The size attributes of an embedded image, video, canvas or frame** in component markup: not
  reported, because they give the media's own size. A size set through the element's styles is
  checked.
- **System color keywords**, the colors the browser takes from the visitor's operating system
  settings, such as `Canvas`, `CanvasText` and `Highlight`: not reported inside a condition that
  applies only when forced colors are active, because there the operating system chooses the
  colors. Anywhere else, including inline styles, they are reported as literal colors. Other
  values inside such a condition are checked as usual.
- **A comment or marker asking the check to skip a line, a block or a file**: has no effect.
  The values there are checked as usual.

## Requirements *(mandatory)*

<!--
  Requirement IDs are permanent (Constitution III): never reuse or renumber them.
  To drop a requirement, keep its line and mark it, e.g.
  "- ~~**FR-004**~~: Removed [DATE] - [reason]".
-->

**Traceability**: Every requirement below MUST be covered by at least one automated test that
references `003-design-tokens-FR-###`. UI implementing a requirement carries
`data-req="003-design-tokens-FR-###"` (Constitution III).

### Functional Requirements

**The token export**

- **FR-001**: All design tokens of the kinds Penpot can hold (color, typography, spacing, radii
  and shadows) MUST be defined in the site's Penpot file and committed to the repository as
  Penpot exports them, unchanged. Motion is the one exception (FR-008).
- **FR-002**: Updating the tokens held in Penpot MUST take one export from Penpot that replaces
  the committed export. Other files MUST NOT need a hand edit for the new tokens to reach code.
- **FR-003**: The committed export MUST be importable back into Penpot and give the same tokens,
  sets and themes, with the same names, types, values, descriptions and set order.
- **FR-004**: The export MUST hold at least one theme. Every theme MUST belong to a theme group
  and enable at least one set, and the check MUST report a theme that doesn't. The export this
  feature ships holds exactly one theme, in its own group.
- **FR-005**: Anything the project derives from the two token sources for code to read MUST be
  produced from them by the project and never edited by hand. If derived output is kept in the
  repository, the check MUST report it when it doesn't match its sources.
- **FR-006**: The tokens MUST start with placeholder values covering every category: color,
  typography, spacing, radii and shadows in the export, and at least one duration and one easing
  curve in the motion token source. The export MUST include at least one color with
  transparency, one token that refers to another, one typography token that combines several
  values, one shadow, and one breakpoint (FR-052). Placeholder font families MUST NOT name an
  Apple font or the operating system's interface font (Constitution IX).
- **FR-007**: The starter tokens in the export MUST be made in the site's Penpot file and
  exported from it, not written by hand.

**The motion token source**

- **FR-008**: Motion tokens (durations and easing curves) MUST live in one motion token source
  in the repository, outside Penpot, because Penpot has no token type for them
  (Constitution IV).
- **FR-042**: The motion token source MUST hold only durations and easing curves, the token
  types Penpot doesn't support. The check MUST report any other type there, such as a color or
  a spacing value, as belonging in Penpot.
- **FR-043**: The motion token source MUST use the same format as the Penpot export, with the
  format's own types for durations and easing curves, so its tokens can move into Penpot under
  the same names once Penpot supports those types.
- **FR-044**: The check MUST apply the export's rules to the motion token source too: themes and
  sets (FR-004, FR-011, FR-012, FR-017, FR-018), references (FR-009, FR-010, FR-015), duplicate
  names (FR-016) and names code can use (FR-020 to FR-022).
- **FR-045**: The check MUST report a duration that isn't zero or a positive length of time,
  and an easing curve that isn't four numbers whose first and third are between 0 and 1.
- **FR-046**: Motion tokens MUST refer only to other motion tokens, and tokens in the export
  MUST NOT refer to motion tokens. The check MUST report every reference between the two
  sources.
- **FR-047**: A token name MUST be defined in only one of the two sources. The check MUST report
  a name defined in both, and FR-021 and FR-022 MUST apply across both sources.
- **FR-048**: Themes MUST span both sources: a theme with the same group and name in both is
  one theme, and FR-023 MUST apply to every combination across both sources.
- **FR-049**: Code MUST read motion tokens exactly as it reads tokens from the export, through
  the same description (FR-025), and MUST NOT depend on which source a token comes from. Moving a
  token between the sources under the same name MUST NOT require changing code that reads it.
- **FR-050**: Changing a motion value MUST take one edit, in the motion token source. Other files
  MUST NOT need a hand edit for code to read the new value.

**Checking the export**

- **FR-009**: The check MUST report every token that refers to a token that doesn't exist.
  References MUST be resolved for each combination of themes that can be active together
  (exactly one theme from every theme group, as in FR-023), using only the sets those themes
  enable, and a failure MUST name the combination.
- **FR-010**: The check MUST report every reference loop once, listing every token in the loop
  in order.
- **FR-011**: The check MUST report every theme that enables a set the export doesn't contain.
- **FR-012**: The check MUST report every set that no theme enables.
- **FR-013**: The check MUST report every token in the export whose type Penpot doesn't support
  (see Key Entities), and any other content Penpot doesn't write in an export.
- **FR-014**: The check MUST report every token in the export whose value, once references are
  resolved, is not a value Penpot accepts for its type, such as a color token that resolves to a
  length.
- **FR-015**: The check MUST resolve and check references wherever Penpot allows them, including
  inside composite values, such as typography and shadow, and inside arithmetic.
- **FR-016**: The check MUST report a token name defined more than once in the same set, naming
  every occurrence.
- **FR-017**: When a theme enables several sets that define the same token name, the definition
  from the set later in the set order MUST win. The check MUST accept this, and MUST report it
  when the definitions have different types.
- **FR-018**: The check MUST accept an empty set.
- **FR-019**: The check MUST accept colors with transparency in every form Penpot accepts, and
  code MUST read the transparency unchanged.

**Names code can use**

- **FR-020**: The check MUST report every token name with a part (the text between dots) that is
  empty or contains characters other than ASCII letters, digits, hyphens and underscores.
- **FR-021**: The check MUST report token names that code would read as the same name: names
  that differ only in letter case, or only in which separator (dot, hyphen or underscore) joins
  their parts.
- **FR-022**: The check MUST report every name that is both a token and a group of other tokens,
  such as `color.primary` alongside `color.primary.light`.

**Themes**

- **FR-023**: Every combination of themes that can be active together (exactly one theme from
  every theme group) MUST resolve the same token names, each with the same type.
  The check MUST report every name that is missing from a combination or has a different type
  there, naming the combination. A theme reported under FR-004 takes no part in these
  combinations, nor in FR-054's active themes.
- **FR-024**: Adding a theme MUST NOT require any change to code that reads tokens.
- **FR-054**: Until theme switching exists, the site MUST use the themes the export marks as
  active. Every theme group MUST have exactly one active theme, and a group that appears in both
  sources MUST have the same active theme in both. The check MUST report a group with no active
  theme, with more than one, or whose active theme differs between the sources. The derived
  output MUST hold the values of every theme, not only the active ones.

**Reading tokens from code**

- **FR-025**: The project MUST give code a description of every token's name and type,
  produced from both token sources, so the description and the sources can't disagree.
- **FR-026**: The project's checks MUST fail before merge when a style or a component reads a
  name in the token namespace (FR-051) that the description doesn't define, and MUST name the
  token and the location.
- **FR-058**: The check MUST NOT compare a token's type with the setting it is used in. A token
  the description defines is accepted in any setting, such as a color token used as a padding.
  The types in the description serve the theme checks (FR-023) and code's own type checking.
- **FR-051**: Code MUST read tokens under a namespace reserved for them. Styles and components
  MAY define their own local variables outside that namespace, and a local variable's value is
  checked like any other style value (FR-027). The check MUST report a local variable defined
  inside the token namespace.
- **FR-052**: Code MUST be able to use tokens as breakpoints in screen-size conditions, the
  widths where a layout changes, including where styles can't read a variable. Breakpoints MUST
  come from tokens like any other length, and FR-026 MUST apply to them.

**Literal design values**

- **FR-027**: The check MUST report every literal design value in the site's styles and
  components: a color, a length, a font family, a shadow, a duration or an easing curve written
  out instead of read from a token. A length is a value in absolute or font-relative units, such
  as pixels, rems or ems, including a breakpoint in a screen-size condition. Each report MUST
  give the file, the line, the value and its kind.
- **FR-028**: Styles and components MUST include style sheets, style blocks, inline styles, and
  style values set in component markup or component code, such as an icon's fill color. The
  width and height attributes of an embedded image, video, canvas or frame are not style values:
  they give the media's own size, so the page can keep its space while it loads, and the check
  MUST NOT report them. A size set through such an element's styles is checked as usual.
- **FR-029**: The check MUST NOT report neutral values: zero in any unit, `inherit`, `initial`,
  `unset`, `revert`, the current text color, `transparent`, `none` and `auto`, and system color
  keywords where FR-056 allows them. It MUST NOT report percentages, viewport-relative units,
  grid fractions or plain numbers, except as FR-053 says.
- **FR-030**: The check MUST report a design value taken from a styling tool's built-in scale
  or palette, rather than from the tokens, as a literal.
- **FR-031**: The check MUST report a literal design value used as the fallback of a token
  reference.
- **FR-032**: The check MUST NOT report values inside comments.
- **FR-053**: The check MUST report a plain number other than zero, in a setting that takes a
  length or a duration and treats a plain number as pixels or milliseconds, as a literal length
  or duration. It MUST NOT report plain numbers in other settings, such as line-height ratios,
  font weights, opacity and layer order, or in the geometry of a drawing (FR-055).
- **FR-055**: In a vector drawing in component markup, the check MUST NOT report the drawing's
  geometry: coordinates, path data, the drawing area, and shape sizes in drawing units, such as
  a circle's radius. It MUST check the drawing's colors, its stroke width and its displayed size
  like any other style value.
- **FR-056**: The check MUST NOT report a system color keyword (a color the browser takes from
  the visitor's operating system settings, such as `Canvas`, `CanvasText` or `Highlight`) inside
  a condition that applies only when forced colors are active. It MUST report a system color
  keyword anywhere else as a literal color. Other values inside such a condition MUST be checked
  as usual.
- **FR-057**: Site files MUST NOT be able to make the check skip a literal design value. A
  comment or marker asking it to skip a line, a block or a file MUST have no effect. The only
  values and files exempt from the check are those this spec lists (FR-028, FR-029, FR-033,
  FR-053, FR-055, FR-056), and changing that list is a change to this spec.
- **FR-033**: The check MUST search the files that make up the site, and MUST NOT search specs,
  documentation, tests, test fixtures, the token export, the motion token source, output
  derived from them, the project's own tooling, third-party code, generated files, image and
  font files (including standalone vector images) or version-control data.

**Report**

- **FR-034**: The check MUST report every problem it finds in a single run, not stop at the
  first one. A file that can't be read MUST NOT stop the checks that don't need it.
- **FR-035**: Each problem MUST state the file, the token path (or, for site files, the line),
  and what is wrong. A problem that applies to one theme or combination MUST name it. A syntax
  problem MUST give the line and column where reading failed.
- **FR-036**: Every run MUST end with a summary giving the token files checked, the number of
  sets, themes and tokens in each source, the number of site files searched for literal values,
  the number of problems of each type, and any checks that could not run. A passing run MUST say
  that both token sources are valid and no literal design values were found.
- **FR-037**: Two runs over the same files MUST produce the same report, with problems listed in
  the same order.
- **FR-038**: The check MUST report a problem when the export or the motion token source is
  missing, and MUST fail when it reports at least one problem.

**Running**

- **FR-039**: The check MUST run on every pull request. When it fails, the pull request MUST NOT
  be mergeable, under the same repository rules as the requirement traceability check.
- **FR-040**: The owner MUST be able to run the check locally with one command. Over the same
  files, it MUST give the same result and the same report as the pull-request run.
- **FR-041**: The check MUST make no network requests, and MUST never contact Penpot.

### Key Entities

- **Token export**: the site's tokens exactly as Penpot exports them: every token, set and
  theme, and the set order. It is the only source of design values other than motion.
- **Motion token source**: the repository's source for durations and easing curves, in the same
  format as the export. It holds only the token types Penpot doesn't support.
- **Token**: a named design value. It has a name made of parts joined by dots (such as
  `color.text.primary`), a type, a value that is either written out or refers to other tokens,
  and an optional description.
- **Token type**: one of the types Penpot supports: color, dimension, spacing, sizing, border
  radius, border width, opacity, rotation, number, font families, font sizes, font weights,
  letter spacing, text case, text decoration, typography and shadow. Penpot has no type for
  durations or easing curves, so those live in the motion token source.
- **Token set**: a named group of tokens. Sets have an order. When two sets that a theme enables
  define the same name, the later set wins.
- **Theme**: a named choice of sets, in a theme group. Exactly one theme per group is active at
  a time, so a dark theme and a per-shell theme can be combined. A theme with the same
  group and name in both sources is one theme. The export marks which theme of each group is
  active, and that is the one the site uses (FR-054).
- **Reference**: a token's value naming another token in the same source. It is resolved per
  combination of themes.
- **Token description for code**: what code sees of the tokens: every name and its type, from
  both sources, with nothing that shows which source a token came from.
- **Token namespace**: the part of the names code reads that is reserved for tokens. Local
  variables in styles and components live outside it.
- **Derived output** (the constitution's "token output"): anything the project produces from
  the two sources for code to read,
  including the description.
- **Literal design value**: a color, a length, a font family, a shadow, a duration or an easing
  curve written out in the site's styles or components instead of read from a token.
- **Neutral value**: a value allowed in styles without a token (FR-029).
- **Problem**: a finding that fails the check. Its type is one of: unreadable file, missing file,
  unsupported content, invalid value, missing reference, reference loop, reference between
  sources, missing set, unused set, theme without sets, theme without a group, invalid active
  themes, duplicate token
  (in one set, or in both sources), token in the wrong source, conflicting types, unusable name,
  name collision, token used as a group, theme mismatch, stale derived output, unknown token,
  local variable in the token namespace, or literal design value. It carries the file and the
  token path or line.
- **Report**: the list of problems in a stable order, followed by the summary.

## Shell Scope *(mandatory)*

| Shell | Supported | Instead |
|-------|-----------|---------|
| Desktop (macOS-style) | No: not a UI feature | Not shown. Nothing changes for visitors. |
| Mobile (iOS-style) | No: not a UI feature | Not shown. Nothing changes for visitors. |

**CV path**: Unchanged. No shells exist yet. Once they do, the CV stays one click (desktop) or
one tap (mobile) from first load, and `/cv` remains a plain server-rendered page.

## Offline Behavior *(mandatory)*

- **Works offline**: Fully. Both token sources are part of the project, and the check makes no
  network requests and never contacts Penpot, locally or on a pull request.
- **Available offline**: nothing visitor-facing yet. The owner can run the full check without a
  connection. Exporting from Penpot needs Penpot, but that happens outside this feature's
  checks.
- **Needs the network**: Nothing.
- **Offline state shown**: Not applicable. The feature has no visitor-facing state.

## Design *(mandatory)*

**No UI**: this feature adds or changes no user interface.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On seeded samples that together hold at least one case of every problem type and
  edge case in this spec, the check reports 100% of the seeded problems and no others.
- **SC-002**: Importing the committed export into an empty Penpot file and exporting it again
  gives the same tokens, sets, themes and set order. This is verified by hand before merge,
  since the check never contacts Penpot.
- **SC-003**: Changing any token's value takes exactly one edit at its source: one export from
  Penpot, or one edit in the motion token source. Every check still passes with no hand edit to
  any other file.
- **SC-004**: A test export with a second theme that defines the same token names and types
  passes every check, with no change to code that reads tokens.
- **SC-005**: For the same files, the local run and the pull-request run give the same result
  and identical reports every time.
- **SC-006**: The check completes with the network turned off, in under 10 seconds on the
  owner's machine for the whole repository.
- **SC-007**: For every reported problem, a reviewer can go straight to the file and the token
  path, or the file and line, using only the report.
- **SC-008**: When this feature is merged, the check passes on the repository, and every
  requirement in this spec is covered by at least one test.

## Assumptions

- **Users**: the owner is the only author of the tokens. Reviewers read results on pull
  requests. Visitors see nothing from this feature until the `/cv` feature.
- **Penpot** is named because the constitution names it as the design source. The supported
  token types are those Penpot offers when this spec is written (see Key Entities). If Penpot
  adds a type, updating that list is a change to this spec. If the new type covers durations or
  easing curves, those tokens move from the motion token source into Penpot under the same
  names, as Constitution IV requires.
- **Motion review**: motion is judged by running the app or an HTML mockup, not in Penpot,
  which can't preview it. How a feature animates, including how it honors reduced motion
  (Constitution VIII), belongs to that feature. The motion token source can later hold a
  reduced-motion theme or per-shell motion.
- **The site's Penpot file**: one Penpot file holds the site's tokens. Later features may keep
  their mockups there too.
- **Export form**: Penpot can export tokens as one file or as one file per set. The plan picks
  one. Either way, the committed files are exactly what Penpot writes. The motion token source
  follows the same form.
- **Hand edits**: the check can't prove that an export came from Penpot unedited. It reports
  anything Penpot doesn't write (FR-013), review catches the rest, and the round trip is
  verified by hand (SC-002).
- **Starter tokens**: placeholders that prove the pipeline from Penpot to code. Their names and
  values may change completely with the `/cv` mockup. The checks then catch any code still using
  an old name. Starter motion tokens are written by hand in the motion token source, as Penpot
  can't make them.
- **Unused sets** are reported rather than allowed, because code can never read their tokens.
  Draft sets stay in Penpot only if a theme enables them, or are removed before export.
- **Files that make up the site** are the source of the site's pages, apps, shells and shared
  packages, as in the CV content feature (002). The project's own tooling is a fixed list. Any
  other file that isn't a spec, documentation, a test, third-party, generated or version-control
  data counts as site source until it's added to that list, so a new file is searched rather
  than missed. Image and font files are not searched, including standalone vector images such as
  icons and illustrations kept as their own files. An icon that must follow the theme is drawn
  in component markup, where FR-028 applies, or uses the current text color.
- **Unitless and proportional values**, such as line-height ratios, font weights, opacity,
  layer order, percentages and viewport-relative sizes, are not checked. Bringing any of them
  under the check is a change to this spec. A plain number in a setting that takes a length or a
  duration is not unitless in this sense (FR-053).
- **No skip markers**: Constitution IV allows no literal design values, so the check has no way
  to be turned off from inside a file. A value the site needs either becomes a token or is added
  to the exempt values through a change to this spec (FR-057).
- **Breakpoints in style sheets**: browsers don't yet read a screen-size condition that names a
  breakpoint instead of writing it out. The site's build, which belongs to the web app feature,
  turns those conditions into written-out ones. Until then, the checks prove that breakpoint
  tokens are named and read correctly, not that a page changes its layout (FR-052).
- **Token use isn't type-checked**: Penpot's types are finer than what style settings accept
  (spacing, sizing and dimension are all lengths to a style), so matching them strictly would
  reject valid uses. A misused token shows when the page is compared with its mockup (FR-058).
- **Blocking merge** reuses the repository rules set up by the requirement traceability feature:
  required checks, no direct pushes to the main branch, and no bypass.
- **Out of scope**:
  - The real visual design and token values. They come with the `/cv` mockup.
  - Choosing fonts and hosting font files.
  - Theme switching, which belongs to the Settings feature.
  - Any page that previews tokens.
  - The web app and deploys.
  - Pulling tokens from Penpot automatically.
- **Depends on**: Constitution IV as amended in 1.1.0 (the motion token source), Constitution IX,
  the requirement traceability check (001), and Penpot's token export. The spec can't be
  approved before the amendment is merged.
- **Interim hand-written export** (Constitution 1.2.0, added 2026-10-23): while the
  constitution's interim provision on local mockups applies, the export may be written by hand
  in the form Penpot exports. FR-001 and FR-002 are then met once Penpot can be reached again,
  by importing the file into the site's Penpot file and exporting it again, as the provision's
  ending steps say. FR-007 is unaffected: the starter tokens were made in Penpot. The check
  doesn't change, because it reads only the file.
