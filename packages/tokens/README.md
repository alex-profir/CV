# @cv/tokens

The site's design tokens, and the only place code reads design values from.

| File | What it is |
|------|------------|
| `penpot/tokens.json` | The token export: Penpot's Single file export, byte for byte. Never edited by hand |
| `motion/tokens.json` | The motion token source: durations and easing curves, which Penpot can't hold yet. Edited by hand |
| `src/tokens.generated.css` | Generated: the active themes' values as `--token-…` custom properties, and breakpoints as `@custom-media` |
| `src/tokens.generated.ts` | Generated: every token name, its type, the theme groups and every theme combination's values |
| `src/index.ts` | The reading functions: `cssVar`, `typography`, `mediaQuery`, `tokenValue` and `durationMs` |

Never edit the generated files. `npm run token-output` writes them, and `npm run token-check`
fails when they don't match the two sources.

## Updating the export

1. In the site's Penpot file, change the tokens.
2. Export from the tokens panel. Keep the export dialog's **Single file** tab, the default.
   Penpot downloads `tokens.json`.
3. Save it over `packages/tokens/penpot/tokens.json`. Don't open it in an editor that adds a
   final newline: the check compares it with what Penpot writes.
4. Run `npm run token-output`, then `npm run token-check`.

If the check passes, commit the export and the two generated files together. Code that reads a
removed or renamed token now fails the checks, which name each place.

Before exporting:

- Make sure the active themes are the ones the site should use. Each theme group needs exactly
  one active theme, and the active themes decide what `tokens.generated.css` holds.
- Don't switch sets on by hand, outside themes. Code only sees sets that a theme enables.

## Changing a motion value

1. Edit the value in `packages/tokens/motion/tokens.json`. Durations are strings with `ms` or
   `s`, such as `"150ms"`, and may use arithmetic and references to other durations, such as
   `"{motion.duration.base} * 2"`. Easing curves are four numbers, `[x1, y1, x2, y2]`, with `x1`
   and `x2` from 0 to 1.
2. Run `npm run token-output`, then `npm run token-check`.

The motion source holds only `duration` and `cubicBezier` tokens, and may refer only to motion
tokens. Anything Penpot can hold, such as a color, belongs in Penpot.

## Moving motion tokens into Penpot later

When Penpot supports durations or easing curves, those tokens move into Penpot under the same
names. Create them in Penpot, export, and delete them from the motion source in the same change.
Code doesn't change: nothing in the package tells which source a token came from.

## Reading tokens

Load the CSS once, where the site's global styles load:

```ts
import '@cv/tokens/tokens.css';
```

In a style sheet, read tokens with `var()`, and breakpoints as custom media:

```css
.card {
  padding: var(--token-space-4);
  color: var(--token-color-text-primary);
  font-size: var(--token-typography-body-font-size);
  transition: opacity var(--token-motion-duration-fast) var(--token-motion-easing-standard);
}

@media (--token-breakpoint-wide) {
  .card { padding: var(--token-space-8); }
}
```

In TypeScript, use the reading functions. A name that doesn't exist fails `npm run typecheck`:

```tsx
import { cssVar, durationMs, mediaQuery, tokenValue, typography } from '@cv/tokens';

<p style={{ ...typography('typography.body'), color: cssVar('color.text.primary') }} />;
const wide = matchMedia(mediaQuery('breakpoint.wide'));
el.animate(frames, { duration: durationMs('motion.duration.fast'), easing: tokenValue('motion.easing.standard') });
```

A token's CSS name is `--token-` and its name in lower case, with `.` and `_` replaced by `-`.
A typography token has no single property: it gives one per part, such as
`--token-typography-body-font-size`.

Never copy a value into a style or a component. `npm run token-check` reports every color,
length, font family, shadow, duration and easing curve written out in the site's styles and
components, and no comment can switch that off.

## The `--token-` namespace

Every custom property and custom media name starting with `--token-` belongs to tokens. Name
local variables anything else:

```css
.card {
  --card-gap: var(--token-space-2);
  gap: var(--card-gap);
}
```

Defining a variable under `--token-` fails the check.

## Custom media needs the CSS build

No browser supports `@custom-media` yet. The web app's CSS build must replace it, for example
with Lightning CSS and `drafts.customMedia`, or with `postcss-custom-media`. Until then,
`@media (--token-breakpoint-wide)` matches nothing in a browser.
