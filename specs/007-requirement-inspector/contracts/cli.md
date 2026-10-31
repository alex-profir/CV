# Contract: Site Check, Changes from 006

004's, 005's and 006's contracts/cli.md still hold: the command (`npm run site-check`), exit
codes, streams, problem lines, determinism and variant naming. The command and the CI job don't
change, so the inspector's checks run in the same command and on the same pull requests, and give
the same result locally (FR-034).

## Parts

One new part, `inspector`, after `terminal`:

```text
content, cv-app, terminal, inspector, accessibility, lighthouse, no-script, offline, keyboard,
other-sites, fonts, layout, print, modes
```

| Part | What it adds on `/` |
|------|---------------------|
| `inspector` | In each shell, at 1440 × 900 and 375 × 812: opens the CV app, the Terminal and About this site, shows each one's specs, and compares the view with `buildRequirementData` run on the repository and with the built data file: the requirements listed, their order, each group's number, title, status and count, each requirement's text against its spec's lines, its tests against 001's counting tests, and every link's commit, file and line. Then, in every state 005's and 006's driver reaches, reads every `data-req` in the page and checks that each one is in the view of the app whose content holds the element, or in the shell's. Then goes back, and checks the CV's scroll position and the Terminal's output, history, draft and vim view (FR-030, SC-003, SC-004, SC-011) |
| `accessibility` | axe-core in every inspector state below (FR-024, FR-031) |
| `keyboard` | FR-032's flow at 1440 × 900, with the focus target and a visible indicator checked at each step |
| `offline` | After one visit to `/`, and separately to `/cv` only: with the network off, at 375 and 1440 px, shows the spec view of every app and of About this site, compares its text with the online run, and checks the offline note shows (FR-033, SC-008) |
| `other-sites` | Records requests while every spec view shows, in both shells (FR-031, SC-009) |
| `layout` | No horizontal scroll in the spec views at 320 × 568, at 812 × 375, in a 400 px wide window, at 200% and 400% zoom and with text spacing (FR-020, FR-024) |
| `modes` | Reduced motion: showing and leaving each spec view moves or scales nothing. Forced colors: headings, status chips, links, notes and controls are visible, with no background image or color alone (FR-022, FR-023, SC-010) |
| `fonts` | Every text node drawn by a served face in `desktop/cv-specs` and `mobile/about-specs` |

## States

Added to the state driver (`tools/site-check/src/shell-states.ts`). Each is reached from a fresh
page by real input.

| Shell | State | How it is reached |
|-------|-------|-------------------|
| desktop | `cv-specs` | Click the CV window's "Show specs" |
| desktop | `cv-specs-whats-this` | Then click "What's this?" |
| desktop | `terminal-specs` | `terminal-help` (006), then the Terminal's "Show specs" |
| desktop | `terminal-specs-beside-cv` | `terminal-specs`, with the CV window behind it showing the CV |
| desktop | `about-specs` | Open About this site from the site menu, then its "Show specs" |
| desktop | `cv-specs-narrow` | `cv-specs`, the window resized to 400 px wide |
| mobile | `cv-specs` | Tap the CV icon, then "Specs" |
| mobile | `cv-specs-whats-this` | Then tap "What's this?" |
| mobile | `terminal-specs` | `pocket-help` (006), then "Specs" |
| mobile | `about-specs` | Tap About this site, then "Specs" |
| mobile | `cv-specs-320` | `cv-specs` at 320 × 568 |
| mobile | `cv-specs-landscape` | `cv-specs` at 812 × 375 |

## Variants

005's `<shell>/<state>/<width>px`, with these names and no other:

| Variant | Part |
|---------|------|
| `<shell>/<view>-specs/<width>px` | `inspector`, `offline`, `other-sites`: the view `cv`, `terminal` or `about` |
| `<shell>/<state>/<width>px` with a state above | `accessibility`, `fonts`, `layout`, `modes` |
| `<shell>/elements/<width>px` | `inspector`: the `data-req` sweep over every driven state |
| `desktop/inspector-keyboard/1440px` | `keyboard` |

## Problem lines (examples)

```text
inspector / desktop/cv-specs/1440px missing-requirement 005-os-shell-FR-007: the CV app carries it, but its spec view doesn't list it
inspector / mobile/about-specs/375px extra-requirement 004-cv-page-FR-001: listed in the shell's view, but the shell doesn't carry it
inspector / desktop/cv-specs/1440px wrong-count 004-cv-page: says 35 more requirements aren't shown, expected 36
inspector / desktop/terminal-specs/1440px text-mismatch 006-terminal-FR-014: differs from specs/006-terminal/spec.md line 512 at "open settings"
inspector / mobile/cv-specs/375px tests-mismatch 004-cv-page-FR-003: lists 2 tests, 001 counts 3 (missing packages/web/test/one-edit.test.ts:18)
inspector / desktop/cv-specs/1440px link-mismatch 004-cv-page-FR-001: the spec link names line 407, the requirement is on line 408
inspector / desktop/elements/1440px uncarried-element 006-terminal-FR-050: carried by div.run-output in the Terminal, but the Terminal's view doesn't list it
inspector / desktop/terminal-specs/1440px state-lost terminal: the half-typed command "hel" was "" after Back to Terminal
keyboard / desktop/inspector-keyboard/1440px focus-target step 3 "Back to CV": focus went to body, expected the CV window's Show specs
offline / mobile/about-specs/375px offline-mismatch about: the offline view differs from the online one at 005-os-shell-FR-013
modes / desktop/reduced-motion/1440px moved section.spec-view[data-view="cv"]: opacity changed while showing specs with reduced motion
```

## Tests

`tools/site-check/test/inspector.test.ts` (new) and the extended `shell-states.test.ts`,
`keyboard.test.ts`, `offline.test.ts`, `other-sites.test.ts` and `cli.test.ts` run the check on the
real build. Each also runs it on a copy with one fault, which must fail with the line that names it
(US7):

- The CV app's view leaves a requirement out (a filter added in the copy's `derive.ts`).
- A requirement's text in the built data file differs from its spec (the file edited after the
  build).
- A test dropped from a requirement's list (the copy's `read.ts` drops the last one).
- The Terminal's draft cleared on Back (the copy's session store reset on unmount).
- Back that leaves focus on `body`.
- The requirement data left out of the precache list.

Timing: the whole check stays within the latest feature's budget, off CI (FR-034, amended 2026-10-31 by 008; it said 006's budget plus 3 minutes).
