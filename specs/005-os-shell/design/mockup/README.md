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
| Desktop, a window moved behind the dock and past the screen's edge | `desktop-past-edge-1440.png` |
| Desktop, the only window minimized | `desktop-minimized-1440.png` |
| Desktop, a window maximized | `desktop-maximized-1440.png` |
| Desktop, a keyboard move in progress | `desktop-keyboard-move-1440.png` |
| Desktop, a keyboard resize in progress | `desktop-keyboard-resize-1440.png` |
| Desktop, a window minimizing into the dock: one frame of the animation | `desktop-minimizing-1440.png` |
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
under these names. Under the interim provision that export is written by hand. Every color refers
to a base color, an existing one where one fits.

The look is Graphite: a dark shell around the CV app, which keeps `/cv`'s light look. It needs a
dark color scale (`color.base.night` to `color.base.snow`), two accents and translucent colors
for glass, hairlines and shadows. Translucent colors are 8-digit hex, `#rrggbbaa`.

| Token | Type | Value |
|-------|------|-------|
| `breakpoint.desktop-width` | dimension | 1024px |
| `size.desktop-min-height` | dimension | 640px |
| `color.base.night` | color | `#0c0d12` |
| `color.base.dusk` | color | `#171821` |
| `color.base.carbon` | color | `#1b1c24` |
| `color.base.soot` | color | `#20212a` |
| `color.base.smoke` | color | `#262732` |
| `color.base.slate` | color | `#737482` |
| `color.base.fog` | color | `#a3a3b0` |
| `color.base.haze` | color | `#c9cad6` |
| `color.base.snow` | color | `#ececf2` |
| `color.base.periwinkle` | color | `#a5b4fc` |
| `color.base.lilac` | color | `#818cf8` |
| `color.base.glass` | color | `#1212188c` |
| `color.base.hairline` | color | `#ffffff12` |
| `color.base.hairline-strong` | color | `#ffffff1a` |
| `color.base.rim` | color | `#ffffff33` |
| `color.base.speck` | color | `#ffffff0d` |
| `color.base.glow-lilac` | color | `#818cf861` |
| `color.base.glow-teal` | color | `#2dd4bf33` |
| `color.base.shade` | color | `#00000073` |
| `color.base.shade-strong` | color | `#000000a6` |
| `color.wallpaper` | color | `{color.base.night}` |
| `color.wallpaper-top` | color | `{color.base.dusk}` |
| `color.wallpaper-glow` | color | `{color.base.glow-lilac}` |
| `color.wallpaper-glow-second` | color | `{color.base.glow-teal}` |
| `color.wallpaper-dots` | color | `{color.base.speck}` |
| `color.chrome` | color | `{color.base.glass}` |
| `color.chrome-solid` | color | `{color.base.soot}` |
| `color.chrome-border` | color | `{color.base.hairline-strong}` |
| `color.chrome-text` | color | `{color.base.snow}` |
| `color.shell-surface` | color | `{color.base.carbon}` |
| `color.shell-raised` | color | `{color.base.smoke}` |
| `color.shell-text` | color | `{color.base.snow}` |
| `color.shell-text-secondary` | color | `{color.base.fog}` |
| `color.shell-accent` | color | `{color.base.periwinkle}` |
| `color.shell-rule` | color | `{color.base.hairline}` |
| `color.title-bar` | color | `{color.base.soot}` |
| `color.title-bar-text` | color | `{color.base.fog}` |
| `color.title-bar-focused` | color | `{color.base.smoke}` |
| `color.title-bar-focused-text` | color | `{color.base.snow}` |
| `color.window-border` | color | `{color.base.hairline}` |
| `color.window-border-focused` | color | `{color.base.rim}` |
| `color.control` | color | `{color.base.slate}` |
| `color.control-focused` | color | `{color.base.haze}` |
| `color.control-glyph` | color | `{color.base.carbon}` |
| `color.selection` | color | `{color.base.indigo}` |
| `color.selection-text` | color | `{color.base.white}` |
| `color.icon-top` | color | `{color.base.lilac}` |
| `color.icon-bottom` | color | `{color.base.indigo}` |
| `color.icon-glyph` | color | `{color.base.white}` |
| `color.ghost` | color | `{color.base.periwinkle}` |
| `color.focus-shell` | color | `{color.base.periwinkle}` |
| `shadow.window-focused` | shadow | 0 30px 90px 0 `{color.base.shade-strong}` |
| `shadow.window` | shadow | 0 14px 40px 0 `{color.base.shade}` |
| `shadow.menu` | shadow | 0 12px 32px 0 `{color.base.shade}` |
| `shadow.dock` | shadow | 0 16px 40px 0 `{color.base.shade}` |
| `font.size.home-name` | dimension | 40px |
| `font.letter-spacing.home-name` | dimension | -1.2px |
| `radius.window` | borderRadius | 12px |
| `radius.menu` | borderRadius | 8px |
| `radius.dock` | borderRadius | 22px |
| `radius.icon` | borderRadius | 14px |
| `radius.small` | borderRadius | 6px |
| `size.menu-bar` | dimension | 32px |
| `size.title-bar` | dimension | 40px |
| `size.control` | dimension | 24px |
| `size.control-dot` | dimension | 14px |
| `size.control-glyph` | dimension | 10px |
| `size.menu-item` | dimension | 32px |
| `size.dock-icon` | dimension | 48px |
| `size.dock-reserve` | dimension | 104px |
| `size.open-mark` | dimension | 6px |
| `size.app-icon` | dimension | 64px |
| `size.home-target` | dimension | 44px |
| `size.mobile-header` | dimension | 52px |
| `size.wallpaper-dots` | dimension | 22px |
| `size.wallpaper-glow` | dimension | 900px |
| `size.chrome-blur` | dimension | 24px |
| `size.window-cv-width` | dimension | 1000px |
| `size.window-about-width` | dimension | 560px |
| `size.window-about-height` | dimension | 520px |
| `size.window-min-width` | dimension | 400px |
| `size.window-min-height` | dimension | 300px |
| `size.pad-button` | dimension | 36px |
| `scale.open-start` | number | 0.96 |

Motion uses the existing `motion.duration.fast` and `motion.easing.standard`, so no motion token is
added. `scale.open-start` is the scale windows, full-screen apps and menus grow from as they open
(the wireframes' 96%). Penpot holds it as a `number` token, so it isn't a motion token.

### Proposed 2026-10-28: the dock's glass (FR-068)

| Token | Type | Value |
|-------|------|-------|
| `color.base.glass-deep` | color | `#121218b3` |
| `color.base.sheen` | color | `#ffffff1f` |
| `color.dock-glass` | color | `{color.base.glass-deep}` |
| `color.dock-sheen` | color | `{color.base.sheen}` |
| `color.dock-rim` | color | `{color.base.rim}` |
| `scale.dock-saturate` | number | 1.6 |
| `size.dock-lens` | dimension | 24px |
| `size.title-bar-grab` | dimension | 120px |

The lens is an SVG filter in each desktop page, `#dock-lens`: a displacement map that is neutral
in the middle and pushes toward the edges. An SVG attribute can't read a CSS variable, so the
mockup writes `size.dock-lens` as its literal 24 there. The plan decides how the shell reads it.
`size.title-bar-grab` is the wireframes' 120 px of title bar kept on screen (How far a window
moves); the mockup draws no state that needs it.

