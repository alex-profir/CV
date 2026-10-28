# Design: The Requirement Inspector

The inspector's look, drawn in Penpot on the page
[007 Requirement inspector — Graphite](https://design.penpot.app/#/workspace?team-id=86d07029-2be7-815f-8008-d2a9447f2808&file-id=eaccfa4c-8a01-81ad-8008-d441a46da254&page-id=83c58681-afbf-80ee-8008-dc17f0627e87).
It builds on 005's Graphite look and 006's Terminal: the same wallpaper, menu bar, dock, windows,
mobile headers, fonts and colors. The frames around the inspector are copies of 005's and 006's
boards, so only the inspector is new.

## Exports

Each PNG is one board of the Penpot page, exported at 1× scale. [wireframes.md](wireframes.md)
describes each state.

| State | Export |
|-------|--------|
| Desktop, the CV window with "Show specs" | `exports/desktop-1-show-specs-1440.png` |
| Desktop, the CV spec view | `exports/desktop-2-cv-spec-view-1440.png` |
| Desktop, "What's this?" open | `exports/desktop-3-whats-this-open-1440.png` |
| Desktop, the Terminal spec view beside the CV showing its app | `exports/desktop-4-terminal-spec-view-beside-cv-1440.png` |
| Desktop, About this site's spec view (the shell's specs) | `exports/desktop-5-about-spec-view-1440.png` |
| Desktop, a draft spec with no tests yet | `exports/desktop-6-draft-no-tests-1440.png` |
| Desktop, offline | `exports/desktop-7-offline-1440.png` |
| Desktop, the CV menu with "Show specs" | `exports/desktop-8-cv-menu-1440.png` |
| Phone, the CV app with "Specs" | `exports/phone-1-show-specs-375.png` |
| Phone, the CV spec view | `exports/phone-2-cv-spec-view-375.png` |
| Phone, the pocket terminal's spec view | `exports/phone-3-terminal-spec-view-375.png` |
| Phone, About this site's spec view | `exports/phone-4-about-spec-view-375.png` |
| Phone at 320 × 568, the CV spec view | `exports/phone-5-cv-spec-view-320.png` |
| Phone in landscape at 812 × 375, the CV spec view | `exports/phone-6-cv-spec-view-landscape-812.png` |

## Sample data

The requirements, tests, counts and commit in the frames show what the build gathers. They are
taken from the repository at commit `917c7a3`: 004's and 005's requirement texts, lines and test
names are real. 006's test names and lines are stand-ins, as 006 isn't merged yet. The real view
reads all of it from the repository when the site is built (FR-013).

The counts of requirements each group doesn't list are worked out from the specs' active
requirements: 004 has 57, of which the CV app carries 21 (36 not shown); 005 has 66, of which the
CV app carries 3 (63 not shown) and the shell 46 (20 not shown). The Terminal's and 007's counts
are stand-ins.

## Proposed tokens

Once the plan is written, these go into `packages/tokens/penpot/tokens.json` in Penpot's form. The
rest of the design uses tokens that exist already: 005's shell colors (`color.shell-surface`,
`color.shell-raised`, `color.shell-text`, `color.shell-text-secondary`, `color.shell-accent`,
`color.shell-rule`, `color.chrome-solid`, `color.chrome-border`), its sizes (`size.title-bar`,
`size.control`), radii (`radius.pill`, `radius.menu`, `radius.small`), the `space.*` scale, the
type scale and the motion tokens.

| Token | Type | Value |
|-------|------|-------|
| `color.shell-text-soft` | color | `{color.base.haze}` |
| `color.status-approved` | color | `{color.base.mint}` |
| `color.status-draft` | color | `{color.base.amber}` |
| `size.spec-bar-touch` | sizing | 48 |
| `size.spec-id-column` | sizing | 64 |
| `size.spec-measure` | sizing | 760 |
| `size.spec-two-column` | dimension | 480px |
| `size.spec-wide` | dimension | 700px |

`color.base.mint` and `color.base.amber` are proposed by 006 (its
[README](../../006-terminal/design/README.md#proposed-tokens)). If 007's plan comes first, it
adds them.

## Contrast

Text on the spec view's surface (`color.shell-surface`, `#1b1c24`): snow 14.4:1, haze 10.4:1, fog
6.8:1, periwinkle 8.5:1, mint 11.5:1, amber 11.8:1. On the raised "What's this?" panel
(`#262732`): snow 12.6:1, haze 9.1:1, periwinkle 7.4:1, fog 5.9:1. On the top bar (`#20212a`):
periwinkle 8.0:1, snow 13.6:1. "Show specs": haze on a focused title bar 7.8:1, fog on one behind
6.1:1. In the Terminal's glass the text colors are the ones 006 checked on glass. Hairlines, the
chips' and note's outlines and the scroll thumb are decoration: the chips' text and the note's
text carry their meaning.
