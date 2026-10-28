# Design Review: The Requirement Inspector

**Status**: Awaiting the owner's review

**Design**: the Penpot page **007 Requirement inspector — Graphite** (file id
`eaccfa4c-8a01-81ad-8008-d441a46da254`). The inspector adds one control to every app and to About
this site, and a spec view that takes the place of the app inside its own window or full-screen
view, on 005's Graphite desktop and 006's Terminal.

## What is reviewed

| Artifact | File |
|----------|------|
| Wireframes: every state the spec's Design section lists, the design values the spec leaves to the design, keyboard, screen readers and site text | [wireframes.md](wireframes.md) |
| Exports: desktop at 1440 × 900, 8 states | `exports/desktop-*-1440.png` |
| Exports: phone at 375 × 812 (the CV app, the CV, Terminal and About this site spec views), 320 × 568 and 812 × 375 in landscape | `exports/phone-*.png` |
| Notes, sample data, proposed tokens and contrast | [README.md](README.md) |
| Penpot file | [007 Requirement inspector — Graphite](https://design.penpot.app/#/workspace?team-id=86d07029-2be7-815f-8008-d2a9447f2808&file-id=eaccfa4c-8a01-81ad-8008-d441a46da254&page-id=83c58681-afbf-80ee-8008-dc17f0627e87) |

## Design decisions

- **"Show specs" in the title bar**: at the right end of every window's title bar, the one place
  005 leaves empty, so it is in the same place for every app and covers none of the app's content
  (FR-005). An outlined pill, 24 px tall, with an original sheet glyph and the label. On a phone it
  sits at the right of the 52 px header, opposite Home, with the shorter label `Specs`. Its
  accessible name is always `Show specs for [app]`.
- **The spec view replaces the content, not the window**: the window keeps its frame, controls,
  place and size, and its title reads `[app] · Specs`. On a phone the header keeps Home and adds
  `SPECS` under the app's name. "Show specs" hides while the view shows, and `Back to [app]` at the
  top of the view takes its place.
- **Dark surface**: the spec view uses the shell's window surface in every app. Even the light CV
  turns dark, so the change of view is plain at a glance. In the Terminal's glass window the glass
  shows through.
- **Reading the view**: a heading, a one-sentence lede and a build line naming the commit. Then
  one group per spec: number, title and status chip, then how many of the spec's requirements the
  view doesn't list, such as `36 more requirements in this spec aren't shown here`, and "Open the
  spec ↗". With every requirement listed, only the link shows (FR-006). Each
  requirement shows the short ID in a 64 px column, its full text (code in mono, references as
  links), `In the spec, line [n] ↗` and its tests, each by name with its path and line.
- **Status without color**: `APPROVED` has a filled dot and a solid outline in mint, `DRAFT` a
  hollow dot and a dashed outline in amber.
- **No tests yet**: the `TESTS` label without a count and `◌ No test covers this yet.`.
- **"What's this?"**: a disclosure in the view's top bar. It opens a panel at the top of the
  content that explains spec-first in two short paragraphs, with the chain
  `Feature > Spec > Requirement FR-### > Interface > Tests` and a link to the repository.
- **Offline**: one dashed note under the build line. Nothing else changes.
- **Uncommitted changes**: a local build from a copy with uncommitted changes shows the same
  dashed note with its own sentence, naming the commit its links lead to (FR-010). Wireframed only:
  the published site never shows it.
- **Menus**: `Show specs` (or `Back to [app]`) in each app's menu after its first command, with
  no shortcut.
- **Motion**: a 150 ms cross-fade, no movement or scaling; reduced motion drops the fade.
- **Layout**: content at most 760 px wide; two columns from 480 px of content; 24 px padding
  under 700 px, as in About this site's 560 px window.
- **New tokens**: listed in [README.md](README.md#proposed-tokens).

## Original look (FR-021)

- [ ] The sheet glyph, the question glyph, the offline glyph, the status chips and the spec view's
  layout are drawn for this site in its own tokens and fonts. Nothing comes from or traces an
  Apple asset or another product's inspector.

## Sign-off

- Reviewed mockup version: _the Penpot page above, as exported to `exports/` in commit `[hash]`_
- Date: _[YYYY-MM-DD]_
- Approved by: _[project owner]_
- Notes: _[ ]_
