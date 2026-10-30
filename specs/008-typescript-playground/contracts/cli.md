# Contract: Site Check, Changes from 007

004's to 007's contracts/cli.md still hold: the command (`npm run site-check`), exit codes,
streams, problem lines, determinism and variant naming. The command and the CI job don't change,
so the Playground's checks run in the same command and on the same pull requests, and give the
same result locally (FR-079). `npm run verify` (the owner's local run) runs the browser tests of
research R25 in Chromium, Firefox and WebKit as well.

## Parts

One new part, `playground`, after `inspector`:

```text
content, cv-app, terminal, inspector, playground, accessibility, lighthouse, no-script, offline,
keyboard, other-sites, fonts, layout, print, modes
```

| Part | What it adds |
|------|--------------|
| `playground` | At 1440 × 900, from a fresh profile: opens the Playground from the dock; checks the download state and its progress against `files.json`, then the editor and `TypeScript <version>` against the engine manifest's `typescript`; for every example: chooses it, checks no diagnostics with the default options, runs `to-end` ones to `finished` and compares the CV examples' logs with values computed from `resume.json`; runs code that logs, waits on a 2 s timer and logs (count, end, duration); an interval until Stop; an endless loop: the popup between 5 and 6 s, inside the Playground's window only, Keep waiting asks again 5 s later, Stop ends it within 1 s; a 60 s timer with no popup; `alert`, `prompt`, `confirm`; the sandbox probe (storage, IndexedDB, caches, cookies, `document`, the page's address all give nothing); the output limits; reload keeps code and options; Reset; Share then open the link in a new profile: same code and options, the note, no runner frame; a broken and a too-long link; Show specs and back with the state kept. At 375 × 812: the "best on desktop" screen from the icon and from a shared link, with no request under `/playground/` (FR-075, SC-003, SC-004, SC-006 to SC-008, SC-014) |
| `accessibility` | axe-core in every Playground state below (FR-071, FR-076, SC-010) |
| `keyboard` | FR-077's flow at 1440 × 900, focus target and a visible indicator at each step, and the shell's shortcuts from inside the editor |
| `offline` | FR-078: a fresh profile with the network off opens the Playground: the offline state; network on: the download and the editor; network off again, reload: FR-073's actions at 1440 × 900 (SC-011) |
| `other-sites` | Records requests during the download, a run of code that makes none, sharing, and the mobile screen: none leaves the site (FR-076, SC-012) |
| `layout` | No horizontal scroll outside the code in the Playground states, in a 600 px window, at 200% and 400% zoom and with text spacing (FR-071, FR-072) |
| `modes` | Reduced motion: the download, a run and the popup move, spin and scale nothing. Forced colors: error marks, log levels, focus, controls and the popup visible, none by color alone (FR-069, FR-070, SC-013) |
| `fonts` | Every text node of the Playground's interface drawn by a served face in `desktop/playground-ready` and `mobile/playground-best-on-desktop` |
| `lighthouse` | Unchanged scores (90+, both profiles, `/` and `/cv`); and the site root's first load requests nothing under `/playground/` (SC-009) |

## States

Added to the state driver (`tools/site-check/src/shell-states.ts`), each from a fresh page by
real input. Desktop states after `playground-downloading` and `playground-offline` start once the
engine is stored in the profile.

| Shell | State | How it is reached |
|-------|-------|-------------------|
| desktop | `playground-downloading` | Open the Playground from the dock with the engine's files held back by the driver |
| desktop | `playground-offline` | Open it with the network off in a fresh profile |
| desktop | `playground-ready` | Open it; the editor shows |
| desktop | `playground-errors` | Type `const n: number = "one";`, open Errors |
| desktop | `playground-hover` | Hover a name |
| desktop | `playground-suggestions` | Type `job.le` in the Narrowing example's style of code |
| desktop | `playground-peek` | `Alt+F12` on a name |
| desktop | `playground-rename` | F2 on a name |
| desktop | `playground-quick-fixes` | `Ctrl+.` on a fixable error |
| desktop | `playground-palette` | F1 |
| desktop | `playground-keys` | The menu's Keys… |
| desktop | `playground-menu` | The Playground menu open |
| desktop | `playground-options` | Options |
| desktop | `playground-examples` | Examples |
| desktop | `playground-running` | Timers and promises, run, 1 s in |
| desktop | `playground-stuck` | An endless loop, run, 5 s in, the window moved right of the CV |
| desktop | `playground-shared` | Share |
| desktop | `playground-too-long` | Share with code over the limit |
| desktop | `playground-broken-link` | Open a broken link |
| desktop | `playground-shared-opened` | Open a link |
| desktop | `playground-reset` | Reset… |
| desktop | `playground-specs` | Show specs |
| desktop | `playground-narrow` | The window resized to 600 px wide |
| desktop | `playground-contained` | A failure while drawing the logs, forced by the test (accessibility test only; the site can't reach it by input) |
| mobile | `playground-best-on-desktop` | Tap the Playground icon |
| mobile | `playground-shared-link` | Open a shared link |
| mobile | `playground-best-on-desktop-320` | At 320 × 568 |
| mobile | `playground-best-on-desktop-landscape` | At 812 × 375 |

## Variants

| Variant | Part |
|---------|------|
| `desktop/playground-<check>/1440px` | `playground`: `download`, `version`, `editing` (errors, a type, suggestions, a definition, every use, renaming, a quick fix, formatting, the palette and the shell's keys), `panes`, `examples/<id>`, `run`, `interval`, `stop`, `stuck`, `timer-60s`, `dialogs`, `sandbox`, `limits`, `kept`, `reset`, `share`, `broken-link`, `too-long`, `specs` |
| `mobile/playground-<check>/375px` | `playground`: `icon`, `shared-link` |
| `<shell>/<state>/<width>px` with a state above | `accessibility`, `fonts`, `layout`, `modes`, `other-sites` |
| `desktop/playground-reduced-motion/1440px` | `modes`: one sequence through the download, a run and the popup |
| `first-load` | `lighthouse`: the root's first load, with no scores |
| `desktop/playground-keyboard/1440px` | `keyboard` |
| `desktop/playground-offline/1440px` | `offline` |

## Problem lines (examples)

```text
playground desktop/playground-examples/skills-at-a-glance/1440px: 1 diagnostic with the default options: 6:21 TS2339 Property 'keyword' does not exist on type 'ResumeSkill'.
playground desktop/playground-stuck/1440px: the popup appeared after 4.2 s; expected between 5 and 6 s
playground desktop/playground-share/1440px: a runner frame exists after opening the link; a shared link must not run
playground mobile/playground-shared-link/375px: requested /playground/3f2a…/files.json; the phone must not download TypeScript
offline desktop/playground-offline/1440px: the CV example "Projects, newest first" logged nothing offline
```

Every failure names the part, the state or check, the width, and the example where there is one
(FR-079).
