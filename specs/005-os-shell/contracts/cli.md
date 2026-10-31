# Contract: Site Check, Changes from 004

004's [contracts/cli.md](../../004-cv-page/contracts/cli.md) still holds: the command, exit codes,
streams, the problem line and determinism. This file lists what this feature adds (FR-056 to
FR-060). The command is unchanged: `npm run site-check`, locally and in the `site` CI job.

## Parts

One new part, `cv-app`, placed after `content` in the summary's order:

```text
content, cv-app, accessibility, lighthouse, no-script, offline, keyboard, other-sites, fonts,
layout, print, modes
```

What each part does on the root, `/`, beyond what it does on `/cv` and the not-found page:

| Part | On `/` |
|------|--------|
| `cv-app` | Opens the CV app in each shell (desktop: the window open on first load; mobile: one tap on the CV icon) and compares its fields, in order, with `expectedFields(resume)` (FR-058) |
| `accessibility` | axe-core in every state of FR-048: desktop states at 1440 × 900, mobile states at 375 × 812 (FR-056) |
| `lighthouse` | Scores `/` on both profiles, as `/cv` (FR-056, SC-004) |
| `no-script` | The no-script page: the name or site heading, the link to `/cv`, the style sheet applied, and no visible control (FR-049) |
| `offline` | After one visit to `/`, and separately to `/cv` only: `/` at 375 and 1440 px with the network off shows its shell, opens the CV app with every expected field, and draws text in the site's fonts (FR-052, FR-059) |
| `keyboard` | The flows of FR-057, desktop at 1440 × 900 and mobile at 375 × 812, with the focus target and a visible indicator checked at each step |
| `other-sites` | Records requests while loading `/` and opening the CV app, in both shells (FR-054, FR-056) |
| `fonts` | Every text node of the shell and the CV app is drawn by a served face, in states `desktop/two-windows` and `mobile/cv-app` |
| `layout` | 004's variants on `/`, plus: no horizontal scroll in the CV window narrowed to 400 px; at 200% and 400% zoom, the mobile shell; text-only zoom at 200% keeps menu bar and dock labels unclipped (FR-008, FR-048) |
| `modes` | Forced colors: borders on windows, menus, dock, pad and menu bar; the focused window distinguishable. Reduced motion: opening and closing the CV app and About, minimizing, restoring, maximizing and opening a menu move or scale nothing (FR-046, FR-047, SC-009) |
| `print` | Not run on `/` (spec Assumptions: printing the shell isn't designed) |

## Variants on the root

```text
<shell>/<state>/<width>px
```

`<shell>` is `desktop` or `mobile`. `<state>` is one of these names, and no other:

| `<state>` | Part | What it names |
|-----------|------|---------------|
| A shell state of data-model.md | `accessibility`, `fonts`; `layout` (`first-load`, `home`) | The shell in that state |
| `cv-app` | `cv-app`, `other-sites`, `offline` | The CV app's content: in its window on the desktop, full screen on the phone |
| `cv-app-after-cv` | `offline` | The CV app, offline, after one visit to `/cv` only |
| `keyboard` | `keyboard` | The keyboard flow, a sequence through several states |
| `reduced-motion`, `forced-colors` | `modes` | Each mode's sequence through several states |
| `narrow-window` | `layout` | The CV window narrowed to 400 px |
| `text-zoom` | `layout` | Text-only zoom at 200% |
| `200%-zoom`, `400%-zoom`, `text-spacing` | `layout` | 004's zoom and text spacing variants, on the shell |

Examples: `desktop/two-windows/1440px`, `mobile/cv-app/375px`, `desktop/keyboard/1440px`.
Lighthouse keeps its profile names, and the `no-script` part keeps 004's plain width (`320px`),
since no shell shows without scripting.

## Problem lines (examples)

```text
cv-app / mobile/cv-app/375px missing-field projects[1].name: "Guided Tours System" is not in the CV app
cv-app / desktop/cv-app/1440px out-of-order education[0].institution: appears before work[0].position
accessibility / desktop/two-windows/1440px axe:button-name section.window[data-view="about"] button.control: Buttons must have discernible text
keyboard / desktop/keyboard/1440px focus-target step 4 "close the CV window": focus went to body, expected the CV dock item
keyboard / desktop/keyboard/1440px shortcut Alt+Shift+N: focus did not move to the next window
keyboard / desktop/keyboard/1440px trapped section.window[data-view="cv"]: Tab stayed inside the window after 120 presses
keyboard / mobile/keyboard/375px focus-target step 3 "Back to the home screen": focus went to body, expected the CV icon
offline / mobile/cv-app/375px missing-field work[0].position: not in the CV app with the network off
modes / desktop/reduced-motion/1440px moved section.window[data-view="about"]: scaled to 0.96 while opening
no-script / 320px visible-control button.dock-item: a control is shown with scripting off
```

## Summary

The summary lists the root's variants like any page's, for example:

```text
  cv-app          pass    / desktop/cv-app/1440px, / mobile/cv-app/375px
  keyboard        pass    / desktop/keyboard/1440px, / mobile/keyboard/375px, /cv 375px, …
```

## Timing

The whole check, with the root's runs, stays within the latest feature's budget on the owner's
machine with no internet connection (SC-010, amended 2026-10-30 by 008: it said under 8 minutes).
