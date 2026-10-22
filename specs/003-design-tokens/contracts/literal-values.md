# Contract: The Literal Values Search

**Feature**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md) |
**Research**: [research.md](../research.md) (R13, R14, R15, R16)

What the check reports as a literal design value in the site's styles and components, and where
it looks (FR-027 to FR-033, FR-051, FR-053, FR-055 to FR-057). Each report is a `literal-value`
problem with the file, line, column, the kind (`color`, `length`, `font-family`, `shadow`,
`duration`, `easing`) and the value as written.

The files searched are in [data-model.md](../data-model.md#sitefile). Nothing in a file can switch
the search off: there's no skip comment or marker of any kind (FR-057). Changing the rules
below is a change to the spec first.

## Style sheets

### Where values are read

| Read | Not read |
|------|----------|
| Every declaration's value, including custom properties (`--card-gap: 12px`) | Selectors |
| `var()` and `env()` fallbacks (FR-031) | `@supports` conditions |
| `@media` and `@container` preludes, including breakpoints (FR-027) | Comments (FR-032) |
| `@custom-media` definitions | Strings (`content: "…"`) and `url()` |
| Declarations in `@keyframes`, `@font-face`, `@property` (`initial-value`) and nested rules | |

### What is reported

| Kind | Reported when the value is | Wherever |
|------|----------------------------|----------|
| `length` | a non-zero dimension in `px`, `cm`, `mm`, `Q`, `in`, `pt`, `pc`, `em`, `rem`, `ex`, `rex`, `cap`, `rcap`, `ch`, `rch`, `ic`, `ric`, `lh` or `rlh` | any value or prelude |
| `length` | `thin`, `medium`, `thick` or `hairline` | the property accepts `<line-width>` |
| `length` | `xx-small`, `x-small`, `small`, `medium`, `large`, `x-large`, `xx-large`, `xxx-large`, `larger` or `smaller` | the property accepts a font size |
| `length` | a non-zero plain number | `stroke-width` only (FR-053) |
| `duration` | a non-zero dimension in `s` or `ms` | any value |
| `color` | a hex color (`#1a1a1a`, `#00000080`) | any value |
| `color` | `rgb()`, `rgba()`, `hsl()`, `hsla()`, `hwb()`, `lab()`, `lch()`, `oklab()`, `oklch()` or `color()`, unless it starts `from` and a token | any value |
| `color` | a named color (`rebeccapurple`, `red`), the CSS built-in palette (FR-030) | the property accepts `<color>` |
| `color` | a system color (`Canvas`, `CanvasText`, `Highlight` and the rest, deprecated ones too) outside a forced-colors condition (FR-056) | the property accepts `<color>` |
| `easing` | `cubic-bezier()`, `steps()` or `linear()` | any value |
| `easing` | `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`, `step-start`, `step-end` | the property accepts `<easing-function>` |
| `font-family` | any family name or generic family, once per declaration with the whole list | `font-family`, and the family part of `font` |
| `font-family` | `caption`, `icon`, `menu`, `message-box`, `small-caption`, `status-bar` | `font` |
| `shadow` | a shadow with any literal length or color in it, once, with the whole shadow | `box-shadow`, `text-shadow`, `drop-shadow()` |

- "The property accepts" is decided by CSSTree's grammar for that property. A custom property, or
  a property the grammar doesn't know, accepts everything, so nothing is missed.
- A shadow is one report. The lengths and colors inside it aren't reported again.
- `color-mix()`, `light-dark()`, `calc()`, `min()`, `max()` and `clamp()` aren't literals
  themselves. Their arguments are checked one by one, so `calc(100% - 12px)` reports `12px`, and
  `color-mix(in srgb, var(--token-color-surface) 80%, transparent)` reports nothing.

### Never reported (FR-029)

- Zero in any unit: `0`, `0px`, `0s`, `-0`.
- `inherit`, `initial`, `unset`, `revert`, `currentcolor` (any case), `transparent`, `none`,
  `auto`.
- Percentages, viewport units (`vw`, `vh`, `vi`, `vb`, `vmin`, `vmax` and their `sv`, `lv` and
  `dv` forms), container units (`cqw`, `cqh`, `cqi`, `cqb`, `cqmin`, `cqmax`), `fr`, angles,
  resolutions.
- Plain numbers, except in `stroke-width`: `line-height: 1.5`, `opacity: 0.8`, `z-index: 10`,
  `font-weight: 700`.
- Other keywords, such as `bold`, `solid`, `flex` or `uppercase`.

### Forced colors (FR-056)

A condition applies only when forced colors are active if every media query in it requires
`(forced-colors: active)` or `(forced-colors)`, alone or joined with `and`. Under `not`, `or`, or
in only some of a comma-separated list, it doesn't. Inside such a condition, at any nesting depth,
system colors are allowed. Every other value is checked as usual.

```css
@media (forced-colors: active) {
  .button:focus-visible { outline-color: Highlight; }   /* not reported */
}
.button { border-color: CanvasText; }                    /* color "CanvasText" */
```

### Token names

| Written | Result |
|---------|--------|
| `var(--token-color-text-primary)` | accepted, the token exists |
| `var(--token-color-text-primray)` | `unknown-token` (FR-026) |
| `@media (--token-breakpoint-wide)` | accepted, a breakpoint token |
| `@media (--token-space-4)` | `unknown-token`: no breakpoint has this name |
| `--token-card-gap: 4px;` or `@custom-media --token-x …` | `local-in-token-namespace` (FR-051), and the value is checked too |
| `--card-gap: var(--token-space-4);` | accepted: a local variable set from a token |
| `padding: var(--token-color-text-primary)` | accepted: only names are checked (FR-058) |

The namespace matches ignoring case, so `--TOKEN-x` is in it too.

## Component code

Files: `.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.cts`, `.mjs`, `.cjs`. A file `oxc-parser` can't
parse is `unreadable-file`.

### Where values are read

| Place | Values read |
|-------|-------------|
| A `style` prop on any JSX element, as an object literal | each property, with keys in camelCase (`backgroundColor`), kebab-case (`'background-color'`) or custom property form (`'--card-gap'`) |
| An SVG element's color attributes: `fill`, `stroke`, `stopColor`/`stop-color`, `floodColor`/`flood-color`, `lightingColor`/`lighting-color`, `color` | as colors |
| An SVG element's `strokeWidth`/`stroke-width` | as a length. A plain number is a length too (FR-055) |
| An SVG element's `fontFamily`/`font-family` | as a font family |
| `width` and `height` on `<svg>`, the displayed size | as lengths. A plain number is a length too (FR-055) |
| `x.style.<prop> = …`, `x.style['<prop>'] = …`, `x.style.cssText = …`, `x.style.setProperty(name, value)` | as that property |
| `x.setAttribute(name, value)` for `style` and the SVG attributes above | as that attribute |
| `x.animate(keyframes, options)` | keyframe properties as styles. Options `duration`, `delay` and `endDelay` as durations, a plain number meaning milliseconds. `easing` as an easing curve. A number as the second argument is a duration |
| Any string literal elsewhere whose **whole** text is one hex color, color function, length with a unit, duration with a unit, `cubic-bezier()`/`steps()`/`linear()`, or a full shadow | as that kind, with no property |
| Any string containing `--token-` | as a token name: a definition when it's a `style` key or `setProperty`'s first argument, a read otherwise |

A value is read when it's a string, a number, a template literal, or a ternary, `??`, `||` or
`&&` of those, through parentheses, `as` and `satisfies`. In a template literal with
substitutions, each literal part is read on its own.

### Plain numbers (FR-053)

React DOM appends `px` to a non-zero number unless the property is on its unitless list, matched
by exact camelCase name (React 19.3.1, `isUnitlessNumber.js`). A custom property never gets a
unit. So a number in a `style` prop is:

| Property | Result |
|----------|--------|
| on React's unitless list (`lineHeight`, `opacity`, `zIndex`, `fontWeight`, `flexGrow`, `order`, `scale`, …) | not reported |
| accepts a `<time>` (`transitionDuration`, `animationDelay`, …) | `duration` |
| accepts a `<length>` (`padding`, `width`, `gap`, `'line-height'` in kebab-case, …) | `length` |
| a custom property (`'--card-gap': 12`) | not reported |
| anything else | not reported |

### Not read

- SVG geometry (FR-055): `viewBox`, `d`, `points`, `x`, `y`, `cx`, `cy`, `r`, `rx`, `ry`, `x1`,
  `y1`, `x2`, `y2`, `dx`, `dy`, `width` and `height` on shapes, `transform`,
  `stroke-dasharray`, `stroke-dashoffset`, `pathLength`.
- Other props of custom components (`<Icon size={24} />`), and `width`/`height` on `<img>`,
  `<video>`, `<canvas>` and `<iframe>`, which give the media's own size (FR-028). A size set in
  their `style` prop is read.
- `className` strings. No utility-class framework is used (research R16).
- Bare keywords and plain numbers outside the places above (`const accent = 'red'`, `const gap = 12`).
- Values computed at runtime.

## The spec's scenarios

| Spec | Written | Result |
|------|---------|--------|
| US3 1 | `padding: 12px` | `length "12px"` |
| US3 2 | `style={{ background: '#00000080' }}` | `color "#00000080"` |
| US3 3 | `font-family: Georgia, serif` | `font-family "Georgia, serif"` |
| US3 4 | `transition: opacity 200ms ease-out` | `duration "200ms"` and `easing "ease-out"` |
| US3 5 | `color: var(--token-color-text-primary, #000000)` | `color "#000000"` |
| US3 6 | `margin: 0; color: inherit; border-color: currentColor; width: 100%` | nothing |
| US3 7 | `style={{ color: 'tomato' }}` | `color "tomato"`, CSS's built-in palette |
| US3 8 | `/* #1a1a1a */` in a style sheet, and `#1a1a1a` in a spec, a doc, a test and the export | nothing |
| US3 9 | `@media (min-width: 768px)` | `length "768px"`. `@media (--token-breakpoint-wide)` is accepted |
| US3 10 | `style={{ padding: 12, animationDuration: 300, lineHeight: 1.5, opacity: 0.8 }}` | `length "12"` and `duration "300"` only |
| US3 11 | `public/icon.svg` with colors, and `<path fill="#1a1a1a" />` in a component | only the `fill` |
| US3 12 | `<svg viewBox="0 0 24 24" width={24}><circle r={4} strokeWidth={2} /><path d="…" /></svg>` | `length "2"` and `length "24"` only |
| US3 13 | `Highlight` in `@media (forced-colors: active)`, `CanvasText` outside | `color "CanvasText"` only |
| US3 14 | `padding: 12px; /* token-check: ignore */` | `length "12px"` |
