# Design: The Terminal

The Terminal's look, drawn in Penpot on the page
[006 Terminal — Glass](https://design.penpot.app/#/workspace?team-id=86d07029-2be7-815f-8008-d2a9447f2808&file-id=eaccfa4c-8a01-81ad-8008-d441a46da254&page-id=07f3159c-7750-805c-8008-dade1b6b707f). It builds on 005's Graphite look: the same wallpaper,
menu bar, dock, window controls and fonts. The Terminal window is frosted glass instead of a solid
panel.

## Exports

Each PNG is one board of the Penpot page, exported at 1× scale. [wireframes.md](wireframes.md)
describes each state.

| State | Export |
|-------|--------|
| Desktop, just opened in front of the CV window | `exports/desktop-1-just-opened-1440.png` |
| Desktop, after `help` | `exports/desktop-2-after-help-1440.png` |
| Desktop, after `cv`: the vim view, folded | `exports/desktop-3a-vim-opened-by-cv-1440.png` |
| Desktop, the vim view with a fold open and a search | `exports/desktop-3b-vim-fold-open-search-1440.png` |
| Desktop, the vim view's key help | `exports/desktop-3c-vim-key-help-1440.png` |
| Desktop, after an unknown command | `exports/desktop-4-after-unknown-command-1440.png` |
| Desktop, after `ls` | `exports/desktop-5-after-ls-1440.png` |
| Desktop, inside a folder after `cat` | `exports/desktop-6-folder-after-cat-1440.png` |
| Desktop, after `specs` | `exports/desktop-7-after-specs-1440.png` |
| Desktop, maximized | `exports/desktop-8-maximized-1440.png` |
| Desktop, the Terminal menu open | `exports/desktop-9-menu-open-1440.png` |
| Phone, just opened | `exports/phone-1-just-opened-375.png` |
| Phone, after `help` | `exports/phone-2-after-help-375.png` |
| Phone, after `ls` | `exports/phone-3-after-ls-375.png` |
| Phone, the on-screen keyboard open | `exports/phone-4-keyboard-open-375.png` |
| Phone at 320 × 568, just opened | `exports/phone-5-just-opened-320.png` |
| Phone in landscape at 568 × 320, just opened | `exports/phone-6-landscape-568.png` |
| Phone, the vim view with its vim keys | `exports/phone-7-vim-keys-375.png` |
| The glass recipe, the proposed tokens and the contrast checks | `exports/glass-recipe-1440.png` |

## The glass

The window is five layers, bottom to top:

1. **Backdrop**: what is behind the window, blurred by `size.terminal-blur` (CSS
   `backdrop-filter`). Penpot has no background blur, so the mockup draws a blurred stand-in of
   the wallpaper and the CV window clipped to the Terminal window.
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
| `color.vim-key` | color | `{color.base.periwinkle}` |
| `color.vim-string` | color | `{color.base.haze}` |
| `color.vim-number` | color | `{color.base.amber}` |
| `color.vim-literal` | color | `{color.base.rose}` |
| `color.vim-punctuation` | color | `{color.base.fog}` |
| `color.vim-match` | color | `#fcd34d33` |
| `color.vim-match-current` | color | `#fcd34d6b` |
| `color.vim-mode` | color | `{color.base.mint}` |
| `color.vim-mode-help` | color | `{color.base.lilac}` |
| `color.vim-band` | color | `#ffffff0d` |
| `color.vim-status` | color | `#ffffff14` |
| `size.vim-status` | dimension | 24px |
| `size.vim-message` | dimension | 28px |
| `size.terminal-blur` | dimension | 32px |
| `size.terminal-padding` | dimension | 20px |
| `size.terminal-padding-pocket` | dimension | 14px |
| `size.terminal-padding-pocket-narrow` | dimension | 12px |
| `size.terminal-window-margin` | dimension | 40px |
| `size.terminal-window-offset` | dimension | 120px |
| `size.terminal-control-row` | dimension | 24px |
| `size.terminal-chip` | dimension | 26px |
| `size.pocket-key` | dimension | 52px |
| `size.pocket-key-narrow` | dimension | 48px |
| `size.pocket-max-width` | dimension | 560px |
| `size.pocket-max-width-landscape` | dimension | 900px |
| `color.base.amber` | color | `#fcd34d` |
| `color.terminal-heading` | color | `{color.base.lilac}` |
| `color.terminal-draft` | color | `{color.base.amber}` |
| `color.terminal-approved` | color | `{color.base.mint}` |
| `color.pocket-key-accent` | color | `{color.base.indigo}` |
| `command-line.max-length` | number | 500 |
| `size.terminal-window-width` | dimension | 760px |
| `size.terminal-window-height` | dimension | 536px |
| `font.size.terminal` | fontSizes | 14px |
| `font.size.terminal-pocket` | fontSizes | 12.5px |
| `font.size.terminal-pocket-narrow` | fontSizes | 12px |
| `font.line-height.terminal` | dimension | 21px |
| `font.line-height.terminal-pocket` | dimension | 19px |
| `font.line-height.terminal-pocket-narrow` | dimension | 18px |
| `radius.pocket` | borderRadius | 28px |
| `radius.pocket-screen` | borderRadius | 16px |
| `radius.pocket-key` | borderRadius | 12px |

The window's size and position, and every other value the spec leaves to the design, are in
[wireframes.md](wireframes.md#design-values-the-spec-leaves-to-the-design).
