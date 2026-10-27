# Design: The Terminal

The Terminal's look, drawn in Penpot on the page **006 Terminal — Glass** (file id
`eaccfa4c-8a01-81ad-8008-d441a46da254`). It builds on 005's Graphite look: the same wallpaper,
menu bar, dock, window controls and fonts. The Terminal window is frosted glass instead of a solid
panel.

## Exports

Each PNG is one board of the Penpot page, exported at 1× scale.

| Board | Export |
|-------|--------|
| Desktop, the Terminal just opened in front of the CV window | `exports/desktop-greeting-1440.png` |
| Desktop, a session: `ls`, `cd work`, `cat`, an unknown command, a half-typed command | `exports/desktop-session-1440.png` |
| Phone, the pocket terminal after `about` | `exports/phone-pocket-375.png` |
| The glass recipe, the proposed tokens and the contrast checks | `exports/glass-recipe-1440.png` |

## The glass

The window is five layers, bottom to top:

1. **Backdrop**: what is behind the window, blurred by `size.terminal-blur` (CSS
   `backdrop-filter`). Penpot has no background blur, so the mockup draws a blurred copy of the
   wallpaper and the CV window clipped to the Terminal window.
2. **Tint**: `color.terminal-glass`, the window color at 88% opacity.
3. **Sheen**: `color.terminal-sheen` fading to nothing over the top 120 px.
4. **Rim**: a 1 px inner hairline in `color.terminal-rim`, and a 1 px light along the top edge,
   brightest at its center.
5. **Chrome and screen**: the title bar is part of the glass, with no rule under it. The window
   controls are 005's neutral circles. Text is JetBrains Mono.

The pocket terminal uses the same glass for its body, with a darker recessed screen and raised
command keys.

## Proposed tokens

Once the plan is written, these go into `packages/tokens/penpot/tokens.json` in Penpot's form.
Every color refers to a base color, an existing one where one fits. Translucent colors are
8-digit hex, `#rrggbbaa`.

| Token | Type | Value |
|-------|------|-------|
| `color.base.mint` | color | `#5eead4` |
| `color.base.rose` | color | `#fda4af` |
| `color.base.terminal-glass` | color | `#1b1c24e0` |
| `color.base.sheen` | color | `#ffffff0d` |
| `color.base.rim-soft` | color | `#ffffff29` |
| `color.terminal-glass` | color | `{color.base.terminal-glass}` |
| `color.terminal-sheen` | color | `{color.base.sheen}` |
| `color.terminal-rim` | color | `{color.base.rim-soft}` |
| `color.terminal-text` | color | `{color.base.snow}` |
| `color.terminal-text-secondary` | color | `{color.base.haze}` |
| `color.terminal-dim` | color | `{color.base.fog}` |
| `color.terminal-user` | color | `{color.base.lilac}` |
| `color.terminal-user-text` | color | `{color.base.night}` |
| `color.terminal-path` | color | `{color.base.periwinkle}` |
| `color.terminal-caret` | color | `{color.base.mint}` |
| `color.terminal-error` | color | `{color.base.rose}` |
| `color.terminal-cursor` | color | `{color.base.haze}` |
| `color.terminal-control` | color | `{color.base.periwinkle}` |
| `size.terminal-blur` | dimension | 32px |
| `size.terminal-padding` | dimension | 20px |
| `size.terminal-padding-pocket` | dimension | 14px |
| `size.terminal-window-width` | dimension | 760px |
| `size.terminal-window-height` | dimension | 536px |
| `font.size.terminal` | fontSizes | 14px |
| `font.size.terminal-pocket` | fontSizes | 12.5px |
| `font.line-height.terminal` | dimension | 21px |
| `font.line-height.terminal-pocket` | dimension | 19px |
| `radius.pocket` | borderRadius | 28px |
| `radius.pocket-screen` | borderRadius | 16px |
| `radius.pocket-key` | borderRadius | 12px |

The window opens at 600, 196 on a 1440 × 900 desktop, in front of the CV window.
