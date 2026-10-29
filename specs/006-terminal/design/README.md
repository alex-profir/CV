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
| Desktop, after `help`, scrolled to its end: the standard commands | `exports/desktop-2-after-help-1440.png` |
| Desktop, after `cv`: the vim view, folded | `exports/desktop-3a-vim-opened-by-cv-1440.png` |
| Desktop, the vim view with a fold open and a search | `exports/desktop-3b-vim-fold-open-search-1440.png` |
| Desktop, the vim view's key help | `exports/desktop-3c-vim-key-help-1440.png` |
| Desktop, after an unknown command | `exports/desktop-4-after-unknown-command-1440.png` |
| Desktop, after `ls` | `exports/desktop-5-after-ls-1440.png` |
| Desktop, inside a folder after `cat` | `exports/desktop-6-folder-after-cat-1440.png` |
| Desktop, after `specs` | `exports/desktop-7-after-specs-1440.png` |
| Desktop, maximized | `exports/desktop-8-maximized-1440.png` |
| Desktop, the Terminal menu open | `exports/desktop-9-menu-open-1440.png` |
| Desktop, focus elsewhere (on the dock): the hollow cursor | `exports/desktop-10-cursor-unfocused-1440.png` |
| Desktop, text selected in the command line | `exports/desktop-11-line-selection-1440.png` |
| Desktop, Cmd+A: all of the Terminal's text selected | `exports/desktop-12-select-all-1440.png` |
| Desktop, a typed line cancelled with Ctrl+C | `exports/desktop-13-ctrl-c-1440.png` |
| Desktop, the shell loading on first open | `exports/desktop-14-loading-1440.png` |
| Desktop, the shell failing to load | `exports/desktop-15-load-failed-1440.png` |
| Desktop, a command line stopped by its limit | `exports/desktop-16-stopped-by-limit-1440.png` |
| Desktop, `ls` with the visitor's own files | `exports/desktop-17-ls-visitor-files-1440.png` |
| Desktop, `rm` on a protected file, then `ls -l` | `exports/desktop-18-permission-denied-1440.png` |
| Desktop, a pipe into `grep` and a `jq` filter | `exports/desktop-19-pipe-and-filter-1440.png` |
| Desktop, a syntax error and "command not found" | `exports/desktop-20-syntax-error-not-found-1440.png` |
| Phone, just opened | `exports/phone-1-just-opened-375.png` |
| Phone, after `help`, scrolled to its end: the standard commands | `exports/phone-2-after-help-375.png` |
| Phone, after `ls` | `exports/phone-3-after-ls-375.png` |
| Phone, the on-screen keyboard open | `exports/phone-4-keyboard-open-375.png` |
| Phone at 320 × 568, just opened | `exports/phone-5-just-opened-320.png` |
| Phone in landscape at 568 × 320, just opened | `exports/phone-6-landscape-568.png` |
| Phone, the vim view with its vim keys | `exports/phone-7-vim-keys-375.png` |
| Phone, focus elsewhere (on Home): the hollow cursor | `exports/phone-8-cursor-unfocused-375.png` |
| Phone, text selected in the command line | `exports/phone-9-line-selection-375.png` |
| Phone, select all: the Terminal's text selected | `exports/phone-10-select-all-375.png` |
| Phone, a typed line cancelled with Ctrl+C | `exports/phone-11-ctrl-c-375.png` |
| Phone, the shell loading on first open | `exports/phone-12-loading-375.png` |
| Phone, the shell failing to load | `exports/phone-13-load-failed-375.png` |
| Phone, a command line stopped by its limit | `exports/phone-14-stopped-by-limit-375.png` |
| Phone, `ls` with the visitor's own files | `exports/phone-15-ls-visitor-files-375.png` |
| Phone, `rm` on a protected file, then `ls -l` | `exports/phone-16-permission-denied-375.png` |
| Phone, a pipe into `grep` and a `jq` filter | `exports/phone-17-pipe-and-filter-375.png` |
| Phone, a syntax error and "command not found" | `exports/phone-18-syntax-error-not-found-375.png` |
| Phone at 320 × 568, after `help`, scrolled to its end | `exports/phone-19-after-help-320.png` |
| Phone at 320 × 568, `rm` on a protected file, then `ls -l` | `exports/phone-20-permission-denied-320.png` |
| Phone at 320 × 568, a pipe into `grep` and a `jq` filter | `exports/phone-21-pipe-and-filter-320.png` |
| The glass recipe, the proposed tokens and the contrast checks | `exports/glass-recipe-1440.png` |
| The cursor and the selection: states, proposed tokens and contrast checks | `exports/cursor-selection-1440.png` |

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

## The cursor and the selection (2026-10-29)

The spec's amendment of 2026-10-29 takes the box off the command line and makes the block cursor
its focus indicator (FR-072, FR-032), adds the command line's own selection and selecting all of
the Terminal (FR-074, FR-075), and the shell's new states. The Penpot page holds a board for each,
and `exports/cursor-selection-1440.png` sums up the cursor and the selection.

- **No box.** The command line has no border, outline, background or underline, focused or not.
  The prompt's `❯` and the cursor are all that mark it.
- **The cursor, with focus**: a block one character wide and the line's text height, filled with
  `color.terminal-cursor` (haze) at full strength. The 90% the first boards used is dropped, so
  the cursor is exactly its token. A letter under the cursor turns `color.terminal-cursor-text`
  (night). It blinks while the command line has focus: on for half of
  `motion.duration.cursor-blink`, off for the other half, with hard steps and no fade. Focus or a
  key press starts it blinking; `motion.duration.cursor-idle` after the last of them it stops,
  on and filled. With reduced motion it never blinks. Exports show the on half.
- **The cursor, without focus**: hollow. The same block with no fill and a `border.thick` (2 px)
  outline in haze, inside its box so nothing moves. It never blinks. It comes back filled when
  focus returns.
- **Selection**: `color.terminal-selection` (lilac) behind, `color.terminal-selection-text`
  (night) for the text, links, prompt and chip names inside it. Bands are square and one per
  line, as a browser draws a text selection. The shell's own `color.selection` is indigo, which
  is too dark to show on the glass (1.2:1), so the Terminal takes the next step of the same hue.
  Nothing is taken from macOS Terminal, iTerm or Ghostty: their defaults are a grey or light blue
  band, or swapped foreground and background.
- **The cursor and a selection together**: the cursor sits at the end the keys move, after the
  selection or before it, never on top of it.
- **Every other control** keeps 005's focus indicator: a 2 px periwinkle outline 2 px outside
  (the dock item in board 10, the Home control in phone board 8).

### Proposed tokens (2026-10-29)

In the hand-written export's form, as above. The colors refer to existing base colors; the
motion values go into `packages/tokens/motion/tokens.json`, the motion token source.

| Token | Type | Set | Value |
|-------|------|-----|-------|
| `color.terminal-cursor-text` | color | light | `{color.base.night}` |
| `color.terminal-selection` | color | light | `{color.base.lilac}` |
| `color.terminal-selection-text` | color | light | `{color.base.night}` |
| `motion.duration.cursor-blink` | duration | motion | `1000ms` |
| `motion.duration.cursor-idle` | duration | motion | `5000ms` |

`color.terminal-cursor` (haze) already exists and is unchanged. The hollow cursor's outline is the
existing `border.thick`. No other new value is needed: the new states use the existing text,
error, control and chip colors and sizes.

### Contrast checks (2026-10-29)

Each check is against `#35363c`, the worst case review.md uses: the glass over the light CV page.
The phone's recessed screen is darker, so every ratio there is higher (filled cursor 11.1:1, lilac
6.1:1).

| What | Colors | Ratio | Needs |
|------|--------|-------|-------|
| Filled cursor against the glass | haze on `#35363c` | 7.4:1 | 3:1 |
| Hollow cursor's outline against the glass | haze on `#35363c` | 7.4:1 | 3:1 |
| A letter under the cursor | night on haze | 11.9:1 | 4.5:1 |
| Selection against the glass | lilac on `#35363c` | 4.0:1 | 3:1 |
| Selected text | night on lilac | 6.5:1 | 4.5:1 |
| The cursor beside a selection | haze next to lilac | 1.9:1 | none (told apart by shape and place) |
| Loading line, `^C`, `ls -l` details | fog on `#35363c` | 4.8:1 | 4.5:1 |
| "Permission denied", "command not found", "stopped", the load error | rose on `#35363c` | 6.4:1 | 4.5:1 |
| The `try again` chip's name | periwinkle on the chip (white 6% over `#35363c`) | 5.0:1 | 4.5:1 |
| The `Standard commands` heading | snow on `#35363c` | 10.2:1 | 4.5:1 |
| Owner `guest` in `ls -l` | haze on `#35363c` | 7.4:1 | 4.5:1 |

The heading and the `guest` owner were first drawn in lilac, which is 4.0:1 on the worst case:
enough for the selection, not for text. They take snow and haze instead.

### The new states

- **No greeting** (owner's decision in design review, FR-005): the Terminal opens with the
  starter chips, then the prompt. Every board that showed the greeting is redrawn and
  re-exported without it.

- **`help`** lists the site's commands with their descriptions as before, then a group headed
  `Standard commands` (snow, bold) with `as in bash. help <command> shows its options.` (fog), then
  every command of FR-068 by name, in alphabetical order, two spaces apart, wrapping within the
  window. Each name is a control that runs `help <name>` (FR-015), underlined periwinkle as in
  the list above. Rows are
  24 px tall; names as short as `rm` are narrower than 24 px but are spaced so a 24 px circle on
  each touches no other (WCAG 2.2 success criterion 2.5.8's spacing exception), as `?` and `cv`
  already are.
- **Loading**: a fog line under the starter chips, `loading the shell · type away, commands run
  once it is ready`. No spinner, nothing moves. Typed and run command lines wait and run in order
  once the shell is ready (FR-070).
- **Failed to load**: the loading line becomes `The shell couldn't load.` (rose) `Check the
  connection, then try again.` (haze), with a `try again` chip below it. The prompt and the
  command line stay.
- **Stopped by its limit**: `stopped` (rose) and the reason (haze) under the command line, then a
  new prompt. Three reasons, one per limit of FR-069.
- **Ctrl+C**: the line stays as typed with `^C` after it in fog, then a new prompt.
- **`ls` with the visitor's files**: the built files in the design's order, then the visitor's in
  name order, marked as the built ones are (folders periwinkle, bold, trailing slash).
- **`rm` on a protected file and `ls -l`**: GNU's wording. `ls -l` shows protected files
  `-r--r--r--` and folders `dr-xr-xr-x`, owned by `root`; the visitor's files are `guest`'s and
  writable. Names stay command controls and keep the trailing slash on folders (FR-043). Sizes in
  the mockup are illustrative except `cv.json`'s 10,215 bytes; the build sets the real ones.
- **A pipe and a filter**: `work | grep -i engineer` prints the matching line of `work`'s text as
  the pipe passes it on, without the list's bullet. `jq '.work[0].name' cv.json` prints the JSON
  string with its quotes, in `color.vim-string` (haze).
- **Errors**: ``unexpected EOF while looking for matching `"'`` in rose for an unclosed quote;
  `sudo: command not found. Run help to see them all.` with the typed word in snow, "command not
  found" in rose and `help` as a control. The unknown-command reply of `desktop-4` takes the same
  form, `wrok: command not found. Run help to see them all, or try:`.
