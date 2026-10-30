# Contract: The Inspector's Interface

What the page holds for the inspector: elements, names, roles, focus and the `data-req` targets.
The design ([wireframes.md](../design/wireframes.md), [review.md](../design/review.md)) sets the
look; this file sets what tests and the site check read. 005's
[contracts/shell.md](../../005-os-shell/contracts/shell.md) and 006's
[contracts/terminal.md](../../006-terminal/contracts/terminal.md) hold for everything else.

`[view]` below is the view's name: `CV`, `Terminal` or `About this site`. In the heading and
region of About this site's view it is `the shell`.

## "Show specs"

| Where | Element |
|-------|---------|
| Desktop | `button.show-specs` in `.title-bar`, after `.controls`, at the bar's right end |
| Mobile | `button.show-specs` in `.app-header`, after `.app-title`, at the header's right end |

- Accessible name: `Show specs for [view]` (`aria-label`). Visible label: `Show specs` on desktop,
  `Specs` on mobile, after the sheet glyph (`aria-hidden`).
- Not rendered while the view shows its specs.
- No `title` attribute, tooltip or other text appears on hover or focus (FR-005).
- A pointer down on it doesn't start a title bar drag: `TitleBar`'s drag ignores it as it ignores
  005's controls.
- Activating it (click, tap, Enter, Space) runs `showSpecs` through the cross-fade (research R2,
  R11).

## The app's menu (desktop)

In the focused window's menu, after the app's own commands and before 005's window commands, in
the same group: a `menuitem` `Show specs`, or `Back to [view]` while the view shows its specs.
For About this site, it is first. No shortcut is shown.

## The titles

| Where | Showing the app | Showing the specs |
|-------|-----------------|-------------------|
| `.window-title` (names the window) | The app's name, or its `WindowTitle` (006) | `[view] · Specs` |
| `.app-title` (names the full-screen view) | The name | The name, then `span.title-suffix` `Specs` (shown in capitals by the style sheet); accessible name `[view] · Specs` |
| `document.title` | 005 FR-042's | `[view] · Specs – [Site name]` |

## The spec view

```html
<section class="spec-view" aria-label="[view] specs" data-view="cv">
  <div class="spec-bar">                         <!-- sticky top bar -->
    <button class="spec-back">Back to [view]</button>
    <button class="whats-this" aria-expanded="false" aria-controls="whats-this-cv">
      <svg aria-hidden="true">…</svg>What's this?
    </button>
  </div>
  <section class="whats-this-panel" id="whats-this-cv" aria-labelledby="…" hidden>
    <h2>What's this?</h2>
    <p>…</p>
    <p class="chain"><span aria-hidden="true">Feature › Spec › Requirement FR-### › Interface › Tests</span>
       <span class="visually-hidden">Feature, then Spec, then Requirement, then Interface, then Tests</span></p>
    <p>…</p>
    <a href="[repository]">The site's repository on GitHub</a>
  </section>
  <h1 class="spec-heading" tabindex="-1">Specs for [view]</h1>
  <p class="spec-lede">…</p>
  <p class="spec-build">[n] requirements · [n] specs · built from <a class="build-commit" href="…">[short commit]</a></p>
  <p class="spec-note note-uncommitted">…</p>    <!-- only in a dirty build -->
  <p class="spec-note note-offline">…</p>        <!-- only offline -->
  <section class="spec-group" aria-labelledby="spec-cv-004" data-feature="004-cv-page">
    <h2 id="spec-cv-004">
      <span class="spec-number">004</span> <span class="spec-title">The /cv Page</span>
      <span class="status" data-status="approved"><span class="visually-hidden">, </span>Approved</span>
    </h2>
    <p class="not-shown">36 more requirements in this spec aren't shown here</p>
    <a class="open-spec" href="…">Open the spec</a>
    <ul class="requirements">
      <li class="requirement" data-id="004-cv-page-FR-001">
        <span class="visually-hidden">004-cv-page-FR-001</span>
        <span class="short-id" aria-hidden="true">FR-001</span>
        <p class="requirement-text">…</p>
        <a class="spec-line" href="…">In the spec, line 408</a>
        <p class="tests-label">Tests, 1</p>       <!-- shows TESTS · 1 -->
        <ul class="tests">
          <li><a class="test-name" href="…">…</a> <span class="test-place">packages/web/test/content.test.tsx:31</span></li>
        </ul>
      </li>
    </ul>
  </section>
</section>
```

The markup above is the structure, not the class list's final spelling; tests select by the
classes named here.

- **Heading levels**: one `h1`, an `h2` per spec and for the panel, no skipped level (FR-018). The
  window's or view's name isn't a heading, as in 005, so the view's heading is its first.
- **Requirement text** (`p.requirement-text`): `InlineText` renders the Inline tree
  (data-model.md): `code`, `strong`, `em`, `s`, and `a` for `link`, `file` and `ref`. A `ref`'s
  link text is the reference as written, and its accessible name adds the full ID when the text
  has the short one (`FR-011, 007-requirement-inspector-FR-011`). No HTML is ever parsed from the
  data.
- **No tests**: `p.tests-label` reads `Tests` with no count, then `p.no-tests`
  `No test covers this yet.` with the dashed mark (`aria-hidden`), and no `ul.tests`.
- **Status**: `data-status="approved"` or `"draft"`. Its shape, not its color, carries it: a
  filled dot and a solid outline, or a hollow dot and a dashed outline (FR-023).
- **Count**: `p.not-shown` only when `notShown > 0` (FR-006).
- **Notes**: `p.note-uncommitted` when `version.dirty`; `p.note-offline` while
  `navigator.onLine` is false. Neither is a live region (design). The uncommitted note comes first.
- **Links**: every repository link is a plain `a` with an `href`, no `target`, so Ctrl-click,
  middle-click and long-press behave as for any link (spec Edge Cases). They are rendered only when
  `siteData.repository` is set (research R8).
- **While the data loads** (research R9): the bar, heading, lede and an empty build line show; the
  groups follow when it arrives. **If it fails**: the offline note shows, with no groups.

## Layout and scrolling

- The view is the content of `.window-content` or `.view-content`, which scrolls (005 FR-022);
  `.spec-bar` is `position: sticky` at its top. The view starts at the top each time it shows.
- Reading width `size.spec-measure` (760); padding `space.10` (40) when the scroller is at least
  `breakpoint.spec-wide` (700) wide, `space.6` (24) below, `space.5` (20) on mobile.
- Two columns (`size.spec-id-column`, 64 px, then the rest) while the content is at least
  `breakpoint.spec-two-column` (480) wide; below, the ID above the text. Long IDs, names, paths
  and links wrap (`overflow-wrap: anywhere`) (FR-020).
- The CV's light page doesn't extend into the spec view: the view sets its own surface,
  `color.shell-surface`, except in the Terminal's glass window, where it has none (design).

## Keyboard and focus

| After | `document.activeElement` |
|-------|--------------------------|
| "Show specs", by control or menu | `h1.spec-heading` of that view (FR-017) |
| `Back to [view]`, by control or menu | That view's `button.show-specs` (FR-017) |
| Opening or closing "What's this?" | `button.whats-this` |

Tab order in a window showing its specs: the title bar's controls, `button.spec-back`,
`button.whats-this`, the panel's link when open, `a.build-commit`, then per spec `a.open-spec` and
per requirement its text's links, `a.spec-line` and each `a.test-name`. On mobile: Home,
`button.spec-back`, then the same. The view isn't a Tab stop; with focus on its heading or inside
it, the arrow keys, Page Up, Page Down, Home and End scroll it, as 005's content does. Escape does
nothing. Focus is never trapped (FR-016, 005 FR-030).

Every control and link is at least 24 × 24 px; `button.show-specs` on mobile is the header's full
52 px height and at least 44 px wide (FR-019).

## Motion and modes

- Showing and leaving: a cross-fade of the scroller's old and new content over
  `motion.duration.fast` with `motion.easing.standard`; nothing moves or scales. With reduced
  motion, no fade (FR-022, research R11).
- Forced colors: `button.show-specs`, the status chips and the notes keep a visible border (solid
  or dashed), dots stay filled or hollow, links stay underlined, and no part relies on a
  background color or image (FR-023).

## `data-req` targets

Every element below carries `data-req="…"` with the IDs listed, as `007-requirement-inspector-FR-###`
(FR-029). Each is written literally in TSX, so 001 reads it, and each is in a shell module, so
About this site's view lists it (FR-011).

| Element | Requirements |
|---------|--------------|
| `button.show-specs` (desktop and mobile) | FR-001, FR-005, FR-016, FR-019 |
| The app menu's `Show specs` / `Back to [view]` item | FR-001, FR-003 |
| `.window-title` and `.app-title` while showing specs (the title span) | FR-002 |
| `section.spec-view` | FR-002, FR-006, FR-018, FR-020, FR-024 |
| `button.spec-back` | FR-003, FR-017 |
| `h1.spec-heading` | FR-017, FR-018 |
| `button.whats-this` and `section.whats-this-panel` | FR-009 |
| `p.spec-build` and `a.build-commit` | FR-010, FR-013 |
| `section.spec-group` | FR-006 |
| `li.requirement` | FR-007, FR-008 |
| `a.spec-line`, `a.open-spec`, `a.test-name` | FR-010 |
| `p.note-uncommitted` | FR-010 |
| `p.note-offline` | FR-027 |
| `section.spec-view` in About this site | FR-011, FR-012 |

Requirements with no element of their own (FR-004, FR-012 to FR-015, FR-021 to FR-023, FR-025,
FR-026, FR-028, FR-030 to FR-034) are covered by tests only, as plan.md's traceability table sets.
