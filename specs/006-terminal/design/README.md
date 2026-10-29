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

The names and types below are in the hand-written export's form, as research R22 sets: sizes
are `sizing` and unitless, line heights live in `typography` tokens, and every semantic color
refers to a base color. No value changed.

| Token | Type | Set | Value |
|-------|------|-----|-------|
| `color.base.mint` | color | base | `#5eead4` |
| `color.base.rose` | color | base | `#fda4af` |
| `color.base.amber` | color | base | `#fcd34d` |
| `color.base.amber-wash` | color | base | `#fcd34d33` |
| `color.base.amber-wash-strong` | color | base | `#fcd34d6b` |
| `color.base.wash` | color | base | `#ffffff14` |
| `color.base.terminal-glass` | color | base | `#1b1c24e0` |
| `color.base.rim-soft` | color | base | `#ffffff29` |
| `color.terminal-glass` | color | light | `{color.base.terminal-glass}` |
| `color.terminal-sheen` | color | light | `{color.base.speck}` |
| `color.terminal-rim` | color | light | `{color.base.rim-soft}` |
| `color.terminal-text` | color | light | `{color.base.snow}` |
| `color.terminal-text-secondary` | color | light | `{color.base.haze}` |
| `color.terminal-dim` | color | light | `{color.base.fog}` |
| `color.terminal-user` | color | light | `{color.base.lilac}` |
| `color.terminal-user-text` | color | light | `{color.base.night}` |
| `color.terminal-path` | color | light | `{color.base.periwinkle}` |
| `color.terminal-caret` | color | light | `{color.base.mint}` |
| `color.terminal-error` | color | light | `{color.base.rose}` |
| `color.terminal-cursor` | color | light | `{color.base.haze}` |
| `color.terminal-control` | color | light | `{color.base.periwinkle}` |
| `color.terminal-heading` | color | light | `{color.base.lilac}` |
| `color.terminal-draft` | color | light | `{color.base.amber}` |
| `color.terminal-approved` | color | light | `{color.base.mint}` |
| `color.pocket-key-accent` | color | light | `{color.base.indigo}` |
| `color.vim-key` | color | light | `{color.base.periwinkle}` |
| `color.vim-string` | color | light | `{color.base.haze}` |
| `color.vim-number` | color | light | `{color.base.amber}` |
| `color.vim-literal` | color | light | `{color.base.rose}` |
| `color.vim-punctuation` | color | light | `{color.base.fog}` |
| `color.vim-match` | color | light | `{color.base.amber-wash}` |
| `color.vim-match-current` | color | light | `{color.base.amber-wash-strong}` |
| `color.vim-mode` | color | light | `{color.base.mint}` |
| `color.vim-mode-help` | color | light | `{color.base.lilac}` |
| `color.vim-band` | color | light | `{color.base.speck}` |
| `color.vim-status` | color | light | `{color.base.wash}` |
| `size.vim-status` | sizing | base | `24` |
| `size.vim-message` | sizing | base | `28` |
| `size.terminal-blur` | sizing | base | `32` |
| `size.terminal-padding` | sizing | base | `20` |
| `size.terminal-padding-pocket` | sizing | base | `14` |
| `size.terminal-padding-pocket-narrow` | sizing | base | `12` |
| `size.terminal-window-width` | sizing | base | `760` |
| `size.terminal-window-height` | sizing | base | `536` |
| `size.terminal-window-margin` | sizing | base | `40` |
| `size.terminal-window-offset` | sizing | base | `120` |
| `size.terminal-control-row` | sizing | base | `24` |
| `size.terminal-chip` | sizing | base | `26` |
| `size.pocket-key` | sizing | base | `52` |
| `size.pocket-key-narrow` | sizing | base | `48` |
| `size.pocket-max-width` | sizing | base | `560` |
| `size.pocket-max-width-landscape` | sizing | base | `900` |
| `font.size.terminal` | fontSizes | base | `14` |
| `font.size.terminal-pocket` | fontSizes | base | `12.5` |
| `font.size.terminal-pocket-narrow` | fontSizes | base | `12` |
| `typography.terminal` | typography | base | `{font.family.mono}`, `{font.size.terminal}` on `1.5` (21 px) |
| `typography.terminal-pocket` | typography | base | `{font.family.mono}`, `{font.size.terminal-pocket}` on `1.52` (19 px) |
| `typography.terminal-pocket-narrow` | typography | base | `{font.family.mono}`, `{font.size.terminal-pocket-narrow}` on `1.5` (18 px) |
| `radius.pocket` | borderRadius | base | `28` |
| `radius.pocket-screen` | borderRadius | base | `16` |
| `radius.pocket-key` | borderRadius | base | `12` |
| `breakpoint.pocket-narrow` | dimension | base | `375` |
| `command-line.max-length` | number | base | `500` |

The window's size and position, and every other value the spec leaves to the design, are in
[wireframes.md](wireframes.md#design-values-the-spec-leaves-to-the-design).
