# Local Mockup: The OS Shell

The interim local mockup of both shells, under the constitution's interim provision on local
mockups (1.2.0). Penpot can't be reached until at least 2026-10-26. Once it can, this design is
rebuilt in Penpot to match, and Penpot's exports replace these PNGs (the provision's step 2).

Each HTML page is one state from [the wireframes](../wireframes.md), drawn with the geometry the
design sets for it. The pages have no scripts. Each PNG is a page rendered at the width named in
its file name, at 1× scale, as 004's exports are.

## What's here

| File | What it is |
|------|------------|
| `*.html` | One page per state |
| `*.png` | The exports, one per state and width |
| `shell.css` | The shells' styles. Every value is a `var(--token-…)` |
| `proposed-tokens.css` | Tokens the shell needs that the export doesn't hold yet (see below) |
| `fonts.css` | The site's three fonts, read from `packages/web/src/fonts/` |

The CV inside the CV window and the full-screen CV app is the built `/cv` page, shown in a frame.
The CV app shows the same CV as `/cv` (FR-006), so the mockup shows the real thing rather than a
copy. In the shell itself the CV app won't be a frame. That is for the plan to decide.

## Exports

| State | Export |
|-------|--------|
| Desktop, first load: the CV window open and focused | `desktop-first-load-1440.png` |
| Desktop, no window open | `desktop-empty-1440.png` |
| Desktop, two windows | `desktop-two-windows-1440.png` |
| Desktop, the site menu open | `desktop-site-menu-1440.png` |
| Desktop, the focused window's menu open | `desktop-window-own-menu-1440.png` |
| Desktop, the Window menu open, with the CV minimized | `desktop-window-menu-1440.png` |
| Desktop, a window resized | `desktop-resized-1440.png` |
| Desktop, the only window minimized | `desktop-minimized-1440.png` |
| Desktop, a window maximized | `desktop-maximized-1440.png` |
| Desktop, a keyboard move in progress | `desktop-keyboard-move-1440.png` |
| Desktop, a keyboard resize in progress | `desktop-keyboard-resize-1440.png` |
| Phone, the home screen | `phone-home-375.png`, `phone-home-320.png`, `phone-home-landscape-812.png` |
| Phone, the CV app full screen | `phone-cv-375.png` |
| Phone, About this site full screen | `phone-about-375.png` |
| Without scripts | `noscript-desktop-1440.png`, `noscript-phone-375.png` |

## Viewing the mockup

The pages read the token output and the fonts by relative paths from the repository, and frame
`/cv` from the local server.

1. `npm run build`, then `npm run serve`. It serves the built site on `http://127.0.0.1:4173`.
2. Serve the repository root with any static file server, such as
   `python3 -m http.server 8005 --bind 127.0.0.1`.
3. Open `http://127.0.0.1:8005/specs/005-os-shell/design/mockup/desktop-first-load.html` in a
   window of the export's size.

## Proposed tokens

`proposed-tokens.css` writes these new tokens as the token output would write them. Once the
design is approved, the plan adds them to `packages/tokens/penpot/tokens.json`, in Penpot's form,
under these names. Under the interim provision that export is written by hand. Colors refer to the
existing base colors.

| Token | Type | Value |
|-------|------|-------|
| `breakpoint.desktop-width` | dimension | 1024px |
| `breakpoint.desktop-height` | dimension | 640px |
| `color.wallpaper` | color | `{color.base.paper}` |
| `color.wallpaper-grid` | color | `{color.base.mist}` |
| `color.chrome` | color | `{color.base.white}` |
| `color.chrome-border` | color | `{color.base.ink}` |
| `color.title-bar-focused` | color | `{color.base.ink}` |
| `color.title-bar-focused-text` | color | `{color.base.paper}` |
| `color.title-bar` | color | `{color.base.paper}` |
| `color.title-bar-text` | color | `{color.base.stone}` |
| `color.window-border` | color | `{color.base.stone}` |
| `color.ghost` | color | `{color.base.indigo}` |
| `color.focus-on-dark` | color | `{color.base.paper}` |
| `shadow.window-focused` | shadow | 8px 8px 0 0 `{color.base.ink}` |
| `shadow.window` | shadow | 4px 4px 0 0 `{color.base.mist}` |
| `shadow.menu` | shadow | 4px 4px 0 0 `{color.base.ink}` |
| `shadow.dock` | shadow | 4px 4px 0 0 `{color.base.ink}` |
| `size.menu-bar` | dimension | 32px |
| `size.title-bar` | dimension | 40px |
| `size.control` | dimension | 28px |
| `size.menu-item` | dimension | 32px |
| `size.dock-icon` | dimension | 48px |
| `size.dock-reserve` | dimension | 104px |
| `size.open-mark` | dimension | 6px |
| `size.app-icon` | dimension | 64px |
| `size.home-target` | dimension | 44px |
| `size.mobile-header` | dimension | 52px |
| `size.wallpaper-grid` | dimension | 24px |
| `size.window-cv-width` | dimension | 1000px |
| `size.window-about-width` | dimension | 560px |
| `size.window-about-height` | dimension | 520px |
| `size.window-min-width` | dimension | 400px |
| `size.window-min-height` | dimension | 300px |
| `size.pad-button` | dimension | 36px |

Motion uses the existing `motion.duration.fast` and `motion.easing.standard`, so no motion token is
added.
