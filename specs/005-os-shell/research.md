# Research: The OS Shell

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-26

The toolchain (Node.js 26 running TypeScript, npm workspaces, Vitest 5, TypeScript 7, React 19.3.1,
Vite 8.3.5 with Lightning CSS, Playwright, axe-core, Lighthouse, the four checks) was set by 001
to 004 and isn't revisited here. This feature adds the first page with behavior: the site root
becomes the OS shell. So it decides how a page that needs scripting is rendered, hydrated, stored
offline and checked, and how windows, menus and full-screen apps work.

The owner's input for this plan: **pre-render the shell at build time and hydrate it on the
client; keep the output static files.** R1 to R3 follow from it.

Facts about the existing code were read from this repository on 2026-10-26. Points that can only
be confirmed by running code are marked **Verify** and become the first task of the area they
belong to.

## R1. The root page: rendered at build time, hydrated in the browser

**Decision**:

- The site root gets a page of its own, `index.html`, written by the build like `/cv` (004 R2).
  The build stays a static site: HTML, CSS, JS, fonts and `sw.js`, with no server code.
- The page's document (`<html>`, `<head>`, the no-script page) is rendered with
  `renderToStaticMarkup`, as 004's pages are. The shell inside it is rendered with React's
  `renderToString` into `<div id="os">`, so React can take it over.
- A new client entry, `src/client/os.tsx`, calls `hydrateRoot` on `#os` with the same component
  and the same props. The props are the CV document and the site data, imported from
  `@cv/content` in both builds, so the build and the browser render from one source
  (Constitution IV).
- `/cv` and the not-found page don't change: rendered with `renderToStaticMarkup`, with no React
  code in the browser. The root is the only page that loads React.

**Rationale**:

- The pre-rendered HTML holds the menu bar, the dock, the home screen and the CV window, so the
  shell and the CV are painted from the first response, before any script runs. That's what
  makes SC-001 (the CV visible with no click on desktop) and SC-003 (the CV icon within 2.5 s on
  the mobile profile) reachable with a script-driven shell.
- Hydration reuses the markup instead of building it again, so there's no second paint and no
  layout shift when the script arrives.
- `renderToString` is synchronous, like 004's `renderToStaticMarkup`. The tree has no Suspense
  and loads no data, so nothing is gained from a streaming renderer.
- The CV document is bundled with the client code (about 10 KB before compression). The repository
  is public, so this exposes nothing new, and the components and the document stay the only
  source of the CV app's text.

**Alternatives considered**:

- *A shell built in the browser from an empty page*: nothing to paint until the script runs, a
  blank first frame on a slow phone, and SC-003 at risk. Rejected by the owner's input too.
- *`react-dom/static`'s `prerender`*: made for trees that suspend while data loads. This tree
  doesn't, and the synchronous call keeps the build step the same shape as 004's.
- *Passing the CV to the client as JSON in the page*: the same bytes as bundling it, but a second
  copy in every HTML response and a hand-written serialisation step.
- *Showing the CV in the shell by framing `/cv`*: the mockup does this, but it's two documents.
  Shortcuts and focus tracking would stop at the frame edge (FR-025, FR-030), the frame's footer
  and page structure don't fit a window, and the heading structure would be split (FR-009).

## R2. Both shells in the page, picked before the first paint

The build doesn't know the visitor's screen. FR-001 picks the shell by the space available only.

**Decision**:

- The pre-rendered `#os` holds **both shells**: the desktop as it is on first load, with the CV
  window open and focused (FR-005), and the mobile home screen (FR-005).
- A classic inline script, the first thing in `<head>`, sets `data-shell="desktop"` or
  `data-shell="mobile"` on `<html>` before the first paint. It's one statement:
  `matchMedia(<query>).matches`. The build writes the query from tokens:
  `(min-width: <breakpoint.desktop-width>) and (min-height: <size.desktop-min-height>)` (R7).
  `@cv/os-core`'s `shellQuery()` builds that text, and the browser code uses the same function.
- The style sheet shows only the shell named by `data-shell`. The other one is `display: none`,
  so it is out of the accessibility tree and out of the tab order.
- The client's first render matches the server's: both shells. Right after hydration, the client
  reads the same media query and renders the active shell only. On a phone, it also closes the
  CV that the desktop markup opened, since the mobile shell starts on the home screen (FR-005).
  The desktop markup is hidden by then, so nothing visible changes.
- A `change` listener on the same media query switches shells later (R12) and keeps
  `data-shell` in step.

**Without scripts (FR-049)**: `data-shell` is never set. The style sheet hides `#os` and shows
the no-script page, rendered beside `#os` (outside the hydrated root) in `/cv`'s look: the role,
the name, the sentence and the link to `/cv`, then `/cv`'s footer. When `data-shell` is set, the
no-script page is `display: none`.

**Rationale**:

- The inline script runs before the body is parsed, so the right shell is the first thing
  painted. A phone never sees the desktop, and the other way round.
- Picking in a script rather than in a style sheet media query sidesteps a gap in 003's token
  output: breakpoint tokens always produce *width* conditions (`(width >= …)`), and the desktop
  minimum also has a height (R7). The script can combine a width breakpoint with a height size
  token, and CSS never needs the height condition.
- Hiding `#os` without scripts and showing a plain page means no control that needs a script is
  ever shown (FR-049), with no `<noscript>` element for React to treat specially.

**Alternatives considered**:

- *Pre-rendering one shell and replacing it on the other*: a flash of the wrong shell on half of
  all visits.
- *A style sheet media query picking the shell*: needs a height breakpoint the token output can't
  give without amending 003 (R7).
- *`<noscript>` around the no-script page*: React skips `<noscript>` content during hydration,
  and the page would sit outside the style rules that hide it. Rendering it beside `#os` and
  hiding it by attribute is simpler and the same with or without React.

## R3. First-load geometry without knowing the screen

The CV window's first position depends on the desktop area: centered, 24 px below the menu bar,
1000 px wide at most (the area's width minus 64), the area's height minus 48
(design/wireframes.md).

**Decision**:

- The pre-rendered CV window carries `data-placement="initial"`. Its position and size come from
  the style sheet, written with tokens: `inset-inline-start: 50%` with a translate of `-50%`,
  `inline-size: min(<size.window-cv-width>, 100% - 2 × <space.8>)`, `inset-block-start: <space.6>`,
  `block-size: calc(100% - <space.12>)`.
- On hydration, the client measures the desktop area and asks `@cv/os-core`'s `placeWindow()` for
  the same box in pixels. Every window from then on has an explicit `{ x, y, width, height }` in
  state, set as inline `left`, `top`, `width` and `height` from state values.
- A browser test compares the window's box before and after hydration at 1024 × 640, 1440 × 900 and
  2560 × 1440. They must match within half a pixel, so the formula in CSS and in `placeWindow()`
  can't drift apart.

**Rationale**: the window is where the design puts it from the first paint, and becomes a normal,
movable window without moving. Inline geometry from state isn't a design value: the token check
reports literal values in `style` props, not variables (`tools/token-check/src/components.ts`
reads only string, number and template literals).

**Alternatives considered**: *rendering the window hidden until measured* delays the CV past the
first paint (SC-001). *Keeping CSS placement until the first move* splits geometry between CSS
and state, and FR-021's fitting on resize would need two code paths.

## R4. Where the code lives: `os-core`, the shells and the apps

**Decision**:

- **`packages/os-core` (`@cv/os-core`)**, a new workspace, as the constitution names it. Pure
  TypeScript with no React, DOM or Node import:
  - the OS state and one reducer over it (`osReducer`): windows, their order, focus, minimize,
    maximize and restore, keyboard move and resize sessions, and the mobile view's open app and
    scroll positions (data-model.md);
  - geometry: placing, clamping, fitting and resizing windows within the desktop area (FR-018,
    FR-021, FR-061, FR-065);
  - the shortcut table and key matching (FR-025 to FR-029);
  - `shellQuery()` (R2), the app declaration type and `appsFor(shell)` (FR-003);
  - design values arrive as a `Metrics` object of numbers, built by the site from tokens (R7),
    so `os-core` reads no token itself and its tests use plain numbers.
- **The shells** in `packages/web/src/shells/desktop/` and `packages/web/src/shells/mobile/`.
  Shell-specific components stay there (Constitution V).
- **Shared site glue** in `packages/web/src/os/`: the `Os` root (holds the reducer, picks the
  shell, history, announcements, title), `About` and the icons the two shells share.
- **Apps** in `packages/web/src/apps/<app>/`. Each declares its name, icon, shells and network
  need beside its component (Constitution V, FR-003). `apps/index.ts` lists them in dock order.
  The CV app is the only one.

**Rationale**: the reducer is where every window rule lives, and as a pure function it can be
tested exhaustively and fast, without a browser. Both shells read the same state, so switching
shell (FR-002) is a re-render, not a hand-over. Keeping React out of `os-core` keeps it a
behavior package that a later shell or the requirement inspector can read too.

**Alternatives considered**:

- *State in React components* (one `useState` per window): window rules would be spread across
  components and testable only in a browser.
- *A state library* (Redux, Zustand, XState): React's `useReducer` over a pure reducer does the
  same here, with no dependency (Constitution X).
- *`os-core` as a folder inside `packages/web`*: the constitution names it as a shared package,
  and a package boundary stops it importing site or React code.

## R5. The CV app: the same components as `/cv`, laid out by its window

**Decision**:

- The `/cv` page body moves into a `CvDocument` component that renders the intro and sections and
  takes the element to render as (`main` on `/cv`, `div` in the shell, since the desktop area is
  the shell's `main`). `CvPage` becomes `<CvDocument as="main">` plus the footer. The CV app is
  the link to `/cv` (FR-007) above `<CvDocument as="div">`. Every 004 `data-req` stays on the
  element it marks.
- The CV's layout follows its window's width, not the screen's (design/wireframes.md: CV layout
  inside a window). `cv.css` changes its `@media (--token-breakpoint-wide)` blocks to
  `@container (--token-breakpoint-wide)`. On `/cv`, `<body>` is the size container, so `/cv`
  behaves as before. In the shell, each window's content area and the full-screen view are size
  containers.
- No browser reads a token name in a container query, and Lightning CSS's `customMedia` replaces
  them only in `@media`. A Lightning CSS **visitor**, passed through Vite's `css.lightningcss`
  options, rewrites `@container (--token-breakpoint-<name>)` to the token's width condition, read
  from `@cv/tokens`' `mediaQuery()`. The build fails if any `--token-breakpoint-` is left in its
  output.
- The token check already accepts `@container (--token-breakpoint-wide)` as a breakpoint read
  (`tools/token-check/src/css.ts`, `readPrelude` covers `@media`, `@container` and
  `@custom-media`), so the source stays free of literal breakpoints.
- `cv.css`'s element selectors (`h2`, `h3`, `main`, `footer`, `li > h3`) are scoped to the CV's
  root class, so they style the CV in the shell without reaching shell elements.

**Verify** (first task of the area): Lightning CSS 1.33.0 parses
`@container (--token-breakpoint-wide)` as a boolean feature with a custom name and keeps it, and
the visitor can replace the condition. If it can't, the fallback is a post-build step in
`build-site.ts` that rewrites the same prelude in the emitted CSS, followed by the same "nothing
left" failure.

**Rationale**:

- One component tree and one style sheet render the CV on `/cv` and in the app, so FR-006 and
  FR-009 hold by construction, and a change to the CV's look is one edit.
- A container query is the only way a style sheet can follow a window's width. Using it on `/cv`
  too, with `<body>` as the container, avoids keeping the same rules in an `@media` and an
  `@container` copy. The difference on `/cv` is the width of a classic scrollbar, which moves the
  breakpoint by about 15 px on browsers that show one. 004's layout and design tests guard the
  widths that matter.

**Alternatives considered**:

- *A class set by a `ResizeObserver`*: `/cv` must lay out without scripts (004 FR-014), so the
  rules would exist twice, once under `@media` and once under the class.
- *An iframe of `/cv`*: rejected in R1.
- *Amending 003's output to write container conditions*: 003's output is consumed by more than
  this feature, and the visitor does the job at build time where the custom media is already
  replaced.

## R6. Style sheets and the look

**Decision**:

- Style sheets:
  - `base.css`: box sizing, resets, links, `.visually-hidden`, the focus outline. Shared by every
    page.
  - `cv.css`: the CV document, scoped to its root class, with container queries (R5).
  - `global.css`: `/cv` and the not-found page. It imports the fonts, tokens, `base.css`, `cv.css`
    and `print.css`, and adds the page frame.
  - `os.css`: the root page. It imports the fonts, tokens, `base.css` and `cv.css`, the shells'
    sheets and the no-script page's rules. It is a new client build entry.
  - The shells' sheets live with the shells: `shells/desktop/desktop.css`,
    `shells/mobile/mobile.css`, plus `os/shell.css` for what both shells share (windows' content
    areas, the About view, the live region, the pad). Every value is a `var(--token-…)`, as
    004's sheets are.
- **Wallpaper**: drawn in CSS from tokens (`color.wallpaper*`, `size.wallpaper-glow`,
  `size.wallpaper-dots`), as radial gradients and a dot pattern. No image file, so nothing extra
  to fetch or store offline (FR-052, FR-054).
- **Glass**: `backdrop-filter: blur(<size.chrome-blur>)` over `color.chrome`. Where
  `backdrop-filter` isn't supported, the translucent color alone still meets the contrast in
  design/review.md, since its contrast was measured on the darkest wallpaper.
- **Icons and glyphs**: inline SVG components (the site mark, the CV icon, the control glyphs, the
  Home chevron), drawn with `currentColor` and CSS custom properties so the token check reads
  their colors from tokens. They're the original drawings of the mockup (FR-044).
- **Forced colors**: every window, menu, dock, pad and the menu bar has a real border, kept in
  forced colors. The focused window's border is thicker and in `Highlight`. Each control's
  circle keeps an outline. The open marks are shapes (FR-047, design/wireframes.md). This uses
  the same `@media (forced-colors: active)` pattern as `global.css`.
- **Desktop never scrolls**: with `data-shell="desktop"`, the shell root is fixed to the viewport,
  and each window's content area scrolls on its own (FR-022, spec edge cases).

**Rationale**: the root page loads one style sheet with everything it shows, and `/cv` loads
nothing of the shell. Drawing the wallpaper in CSS keeps it a token-driven, resolution-independent
design with nothing to download.

## R7. Tokens: the design's 85, one renamed, read as metrics

**Decision**:

- The 85 tokens proposed in [design/mockup/README.md](./design/mockup/README.md#proposed-tokens)
  are added by hand to `packages/tokens/penpot/tokens.json`, in Penpot's export form, under
  Constitution 1.2.0's interim provision (as 004 R6 did). `npm run token-output` regenerates the
  output.
- **One rename**: `breakpoint.desktop-height` becomes `size.desktop-min-height` (dimension,
  640px). 003's output turns every `breakpoint.*` token into a *width* condition
  (`tools/token-check/src/output.ts`, `mediaQuery()` in `packages/tokens/src/index.ts`), so a
  height breakpoint would produce `@custom-media --token-breakpoint-desktop-height (width >= 640px)`,
  a wrong condition waiting to be used. `breakpoint.desktop-width` keeps its name. The mockup
  README's token table is updated in a `docs:` commit before any code reads the token. Only a
  name changes, and no value or look, so the design review stands (Constitution II).
- Values the shell needs as numbers come from `tokenValue()` once, in
  `packages/web/src/os/metrics.ts`, which builds `os-core`'s `Metrics`: the menu bar and title bar
  heights, the dock's reserved space, the window sizes and minimum size, the controls' size, the
  keyboard steps (`space.4` for 16 px, `space.16` for 64 px), the margins and offsets (`space.6`,
  `space.8`, `space.12`), the desktop minimum, and the motion duration.
- Motion reuses `motion.duration.fast` and `motion.easing.standard`. No motion token is added.

**Rationale**: every design value comes from tokens (FR-045), including the ones the JavaScript
needs. Reading them through one module means one place to look and one test that the metrics
match the token output.

**Alternatives considered**: *amending 003 so breakpoint tokens can name a height*: a change to
another feature's spec and check for one value that only the script needs. *Hard-coding the
steps and sizes in `os-core`*: literal design values, which FR-045 forbids.

## R8. Windows

**Decision**:

- **State**: each window has its view (`cv` or `about`), `geometry` `{ x, y, width, height }`
  relative to the desktop area, `minimized`, `maximized` with the geometry to restore, and a place
  in the front-to-back order (the array order). One window, or none, is focused (FR-017).
  Maximize keeps `restore` geometry, and minimize keeps the geometry as it is (FR-064, FR-065).
- **Placement** (FR-018): the CV window as R3 when that box is on no shown window's title bar;
  otherwise its top steps down 48 px at a time, its bottom edge kept, until it isn't, never
  shorter than the minimum (design/review.md, 2026-10-28). About this site at 560 × 520, fitted to the area,
  48 px right of and below the window in front, or centered when no window is shown. If that
  would put its title bar on another window's title bar, it steps a further 48 px, wrapping to the
  area's top left, until it doesn't (`placeWindow()`).
- **Dragging** (FR-019, FR-061): Pointer Events on the title bar and on eight resize handles
  (8 px edges, 16 × 16 px corners), with `setPointerCapture` and `touch-action: none`, so mouse,
  pen and touch behave alike. Moves are batched per animation frame. A drag that starts on a
  control doesn't move the window, and a control acts on `click`, so releasing away from it does
  nothing (spec edge cases).
- **Clamping** (FR-021, FR-061): a move stops when the title bar would leave the desktop area. A
  resize stops at 400 × 300 and at the area's edges. Both are pure functions in `os-core`.
- **The area changing size**: a `ResizeObserver` on the desktop area sends the new size to the
  reducer, which moves each window back inside, fits windows larger than the area, and keeps
  maximized windows filling it (FR-021, FR-065).
- **Focus and order**: `pointerdown` anywhere in a window, and `focusin` from Tab, bring it to the
  front and focus it (FR-017, FR-030).
- **Minimize** (FR-063): the window stays mounted with `hidden`, so its scroll position and
  content survive, and its dock mark becomes hollow. **Close** (FR-023) unmounts it.

**Rationale**: Pointer Events cover mouse, pen and touch with one code path, and pointer capture
keeps a fast drag attached to its window. Keeping minimized windows mounted makes restoring
instant and exact.

## R9. Keyboard

**Decision**:

- **Tab order** (design/wireframes.md): the menu bar as one stop, then the open windows front to
  back, then the dock as one stop. The menu bar and the dock use a roving `tabindex`. Inside a
  window: the title, the controls, then the content in reading order. Windows are rendered in
  front-to-back order in the DOM, and drawn by `z-index`, so DOM order is the Tab order.
- **Menus**: the WAI-ARIA menubar pattern. Left and Right move between titles. Enter, Space or
  Down opens a menu. Up and Down move inside it, and Enter chooses. Escape closes it and returns
  focus to its title (FR-015). A pointer click outside, or focus leaving, closes it too.
- **Shortcuts** (FR-025 to FR-029): `Alt+Shift` (`Option+Shift` on a Mac) with M, D, N, W, H, F,
  P and S, as the design sets. One `keydown` listener on the document matches them through
  `os-core`'s `matchShortcut()`:
  - `altKey && shiftKey`, with no Ctrl or Meta;
  - the letter from `event.key` when it is a letter, so the label matches the key on any layout.
    On a Mac, Option changes `event.key` to another character (Option+Shift+M gives `Â`), so the
    letter comes from `event.code` there;
  - a shortcut that needs a focused window does nothing when none is focused.
  - Menus show each shortcut next to its command, and expose it with `aria-keyshortcuts`. About
    this site lists all eight (FR-029, FR-038). Labels read `Alt+Shift+…` in the pre-rendered
    page, and switch to `Option+Shift+…` after hydration on a Mac
    (`navigator.userAgentData?.platform`, falling back to `navigator.platform`). This changes
    text only, never which shell shows.
- **Reserved shortcuts** (FR-029): from current documentation of Chrome, Edge, Firefox and
  Safari, and of NVDA, JAWS, Narrator and VoiceOver, none of the eight combinations is a browser
  or screen reader command. The nearest are Chrome's and Edge's `Alt+Shift+I` (feedback) and
  `Alt+Shift+T` (toolbar), which the design doesn't use. Screen readers use their own modifier
  keys (Insert or Caps Lock on Windows, Control+Option on a Mac). Two notes:
  - Windows switches input language on `Alt+Shift` pressed and released alone, not with a letter.
  - ChromeOS reserves `Alt+Shift+M`, `N` and `S` for the operating system (Files, notifications,
    quick settings). That's the operating system rather than a browser, and the page never sees
    those keys there. The menu bar, the dock and every window stay reachable by Tab, so nothing
    is lost.

  **Verify** (first task of the area): each combination reaches the page in the current Chrome,
  Edge, Firefox and Safari, and with NVDA, JAWS and VoiceOver running, on the owner's machines.
  The results go in quickstart 8. If one clashes, design/wireframes.md and design/review.md
  change first (Constitution II, as the review asks), then the code.
- **Keyboard move and resize** (FR-027, FR-062): a session in `os-core` state holds the starting
  geometry. The pad opens on the window, with focus on its first button. Arrow keys step 16 px, or
  64 px with Shift, and so do the pad's buttons (FR-020). Enter or Done confirms. Escape or Cancel
  restores the start (FR-027). A click outside the window counts as Done (wireframes). Moves and
  resizes are clamped as dragging is.
- **Escape** closes an open menu or cancels a session. It never closes a window.

**Rationale**: the menubar and roving-tabindex patterns are what screen reader and keyboard users
expect from a menu bar and a toolbar. A single document listener keeps shortcuts in one place
and makes FR-029's rule easy to test against the table.

## R10. Screen readers, names and the page title

**Decision** (the full contract is in [contracts/shell.md](./contracts/shell.md)):

- `<html lang="en">` (FR-039). The menu bar is `role="menubar"` named `Menu bar`, the desktop area
  is `<main>` named `Desktop`, and the dock is `role="toolbar"` named `Dock`. On mobile, the
  shell's `<main>` holds the home screen, a region named `Home screen`, and the full-screen view.
  Only the active shell is rendered, so the page has one `<main>`.
- A window is a `<section>` named by its title, with `aria-roledescription="window"`. The focused
  window has `aria-current="true"` (FR-039). Its title element has `tabindex="-1"` and takes focus
  when the window opens (FR-040). The window title isn't a heading, so the CV keeps its `h1`, then
  `h2` per section, unchanged inside the window (FR-009). About this site's heading is its own
  `h1`.
- Dock items are buttons named by their app, with `open` or `minimized` added to the name when
  that applies (FR-011, wireframes' Screen readers table).
- One visually hidden `role="status"` region announces changes that don't move focus: `CV moved.`,
  `Move cancelled.`, `CV resized to W by H.`, `Resize cancelled.`, `CV maximized.`, `CV restored.`
  (FR-041). The text is site text.
- On mobile, the full-screen view is a `<section>` named by the app. While it's open, the home
  screen is `inert`, so neither the keyboard nor a screen reader reaches it (FR-035).
- The page title is `<app> – <site name>` with a focused window or open app, and `<site name>`
  otherwise (FR-042, FR-066). The pre-rendered `<title>` is the desktop's first-load title. The
  client sets `document.title` on every change, including right after hydration on a phone.

**Rationale**: these are standard roles that every major screen reader announces. `inert` is
supported in every target browser and is the platform's own way to take a background out of
reach.

## R11. Mobile: full-screen apps, scroll and Back

**Decision**:

- Opening an app renders its view full screen over the home screen, with a 52 px header holding
  Home and the app's name (FR-032). Focus moves to the header's title (FR-040).
- The view is its own scroll container. Going home stores its `scrollTop` in state, by app.
  Opening it again restores it in a layout effect, before paint (FR-034).
- **Back** (FR-050): opening an app full screen calls `history.pushState` with the **same URL** and
  a marker in the state object, so the address doesn't change. A `popstate` returns home. The Home
  control calls `history.back()`, so its entry is used up and the next Back leaves the site. The
  desktop never pushes an entry.
- Going home, by Home or Back, puts focus on the icon of the app that was open (FR-034).

**Rationale**: an entry with the same URL is the one way to make Back close the app without
changing the address. Using it up on Home keeps the history one entry deep, so Back from the home
screen leaves the site in one press.

## R12. Switching shells while the site is open

**Decision** (FR-002): when the media query of R2 changes:

- **Desktop to mobile**: the focused window's app opens full screen. With no window shown, the home
  screen appears. Minimized and maximized flags are kept, unused on mobile, for the way back
  (spec edge cases). A full-screen app pushes its history entry (R11).
- **Mobile to desktop**: a full-screen app becomes the focused window, in front. If it has no
  window yet, it opens one by FR-018. With no app open, the desktop is empty. If a history entry
  was pushed, the client calls `history.back()` and ignores the `popstate` it causes, so Back still
  leaves the site in one press (FR-050).
- Focus moves to the open app's title, or stays where it was if that element is still shown.

**Rationale**: all of it is a reducer action (`switchShell`) plus the history step, so it is
tested without a browser and once more in one.

## R13. Motion

**Decision**:

- Opening, closing, minimizing, restoring and maximizing a window, opening a full-screen app and
  showing a menu use the Web Animations API (`element.animate`), with duration
  `durationMs('motion.duration.fast')` and easing `tokenValue('motion.easing.standard')`. The
  keyframes are opacity 0 to 1 and scale 0.96 to 1 (wireframes).
- With `prefers-reduced-motion: reduce`, the keyframes are opacity only (FR-046). Dragging and
  keyboard moves are never animated, so a dragged window always follows the pointer.
- Only actions the visitor takes animate. The first load, hydration and shell switches don't.
- Closing waits for the animation's `finished` promise before the reducer removes the window, and
  focus moves when the window is gone. (Since the amendment of 2026-10-28, minimizing no longer
  waits, and minimize, restore and maximize animate their boxes: R20.)

**Rationale**: the WAAPI runs closing animations without keeping removed elements in the DOM by
hand. It reads token values in the same way the README of `@cv/tokens` shows, so the token check
can see where values come from.

**Alternatives considered**: *CSS `@starting-style` transitions* animate opening only, run on the
first load too, and closing still needs a script.

## R20. The amendment of 2026-10-28: windows past the edges, the dock's glass, box animations

**Decision**:

- **Moves** (FR-021): `clampMove` keeps the title bar's top between 0 and the area's height less
  the title bar, as before, so the title bar stays between the menu bar and the dock's space.
  Sideways, `x` runs from `grab - width` to `area.width - grab`, with `grab` the smaller of the
  window's width and `size.title-bar-grab` (120 px), a new metric. `fitToArea` and `placeWindow`
  go through `clampMove`, so a shrinking area moves windows back only as far as that, and new
  windows still open inside (their boxes are placed inside before clamping).
- **Resizes** (FR-061): `clampResize` takes the window's box before the drag too. A dragged edge
  stops at the area's top and sides and at the browser's bottom (`area.height + dockReserve`),
  or, when the edge is already past that limit (a window moved past the edge), where it was, so
  a keyboard resize of such a window can shrink it but never makes it jump. The size limits are
  unchanged.
- **Drawing behind the dock** (FR-010): `.desktop-area` is no longer clipped, so a window's lower
  part draws below the area, under the dock (the dock and the menu bar are later in the same
  stacking context). `.desktop` uses `overflow: clip` rather than `hidden`: an element with
  `overflow: hidden` is still a scroll container, and focusing an element past the screen's
  edge would scroll the whole desktop to it. With `clip` it can't scroll, and FR-067 moves the
  window instead.
- **Focus into view** (FR-067): a window's `focus` listener waits one animation frame, as the
  browser scrolls the window's content to the element after the focus event, then measures the
  element with its focus outline (`border.thick` plus `space.0-5`) against the desktop area and
  dispatches `reveal { view, box }`. The reducer moves the window by `revealMove`, the least
  distance that brings the box inside the area (its start when it is larger), clamped as a move.
  Focus that follows a pointer doesn't count: the shell keeps the visitor's last input (a
  `keydown` or a `pointerdown`, caught on the document), and while a pointer came last, focus
  the browser gives and focus a script gives (opening from the dock, the Window menu) both
  leave the window where the visitor put it, so a click or a tap on a link half behind the dock
  leaves it there (spec edge cases). Touch focuses on the compatibility `mousedown` after
  `touchend`, after the `pointerdown`, so it counts as a pointer too. Nor does the focus a
  keyboard move or resize gives, to its pad and, when it ends, back to the window's title: the
  visitor has just put the window where it is (FR-021).
- **The dock's glass** (FR-068): the dock gets `color.dock-glass` (70%), a backdrop blur of
  `size.chrome-blur` with `saturate(scale.dock-saturate)`, a rim and a hairline as inset shadows,
  and a sheen as a `::before` behind its items. The lens is a separate `.dock-lens` element just
  before the dock, with `backdrop-filter: url(#dock-lens)` and the dock's radius, placed on the
  dock by CSS anchor positioning (`anchor-name: --dock`). The dock then blurs what the lens has
  bent. An element with a backdrop filter is a backdrop root for its children, so the lens can't
  be inside the dock. A browser without anchor positioning gives the lens no size, and one that
  can't apply an SVG filter as a backdrop filter draws nothing for it: either way the dock's own
  glass is unchanged. `#dock-lens` is an SVG filter in the dock's markup: an `feImage` of a
  displacement map (a data URI, neutral in the middle) and an `feDisplacementMap` whose scale is
  `size.dock-lens`. `prefers-reduced-transparency: reduce` gives the solid `color.chrome-solid`
  and hides the lens and the sheen. Forced colors keep the dock's border (FR-047).
- **Minimize and restore** (FR-069, FR-071): the reducer runs at once, so focus moves and the
  status region speaks when the action starts. The window, already `hidden` by React, is shown
  again by the animation for its 250 ms (`motion.duration.base`): `animateInto` moves and scales
  its box to the dock item's icon (the site menu's title for About), fading out over the last
  third, with `fill: 'forwards'`, then the element is hidden again. The window is `inert` while
  it goes. Restoring plays the same keyframes backwards from the icon. With reduced motion, a
  fade over `motion.duration.fast`. Closing keeps R13's animation and its wait.
- **Maximize and restore** (FR-070): `animateBox` plays the window's change of box as a transform
  from the old box to the new one (translate and scale, from its top left corner) over
  `motion.duration.base`. With reduced motion, no animation. A change of the area while
  maximized isn't a toggle, so it never animates.
- **Interruption** (FR-071): each window keeps its running animation; a new one, or a pointer
  down on the window, calls `finish()` on it first, which jumps to its end state. Windows mounted
  with the shell don't animate (R13).

**Rationale**: the clamps stay pure functions in `os-core`, with one new metric. CSS alone draws
the glass, and the lens fails safe in browsers that can't draw it, with no script and no
browser detection. Transforms animate without reflowing the CV.

**Alternatives considered**: *A genie effect* (owner's choice, spec clarifications): needs a
snapshot of the window in WebGL. *Detecting the browser for the lens*: the anchor and the
backdrop filter fail safe without it. *Keeping the minimize animation before the reducer runs*
(R13): focus would wait for it, against FR-071.

## R14. Routes, build output and offline

**Decision**:

- The route table (`packages/web/src/routes.ts`, 004 R3) gains the page
  `{ path: '/', aliases: [], file: 'index.html' }`, and the redirect from `/` to `/cv` is removed.
  The redirect type stays in the table: the server, the service worker and the checks already
  read it, and the publishing feature's host config will too. `/index.html` is not found, as
  `/cv.html` is.
- The client build gains one entry, `os`: `src/client/os.tsx`, which imports
  `src/styles/os.css`. Vite emits `assets/os-<hash>.js` and `assets/os-<hash>.css` and lists both
  under the entry in its manifest. The root page links the style sheet in `<head>`, so it blocks
  rendering as `/cv`'s does, and loads the script as a module, with the service worker's
  registration script. `/cv` and the not-found page load what they load now.
- **No code splitting**: Rolldown is told to emit the `os` entry as one file (no dynamic imports
  in the shell). Every script the shell will ever run is loaded with the page.
- The service worker is unchanged. Its precache list is every built file (004 R4), so after one
  visit to `/` **or** `/cv`, the root, its script, its style sheet and the fonts are all stored
  (FR-052). The root is a page route, so offline navigation answers it from the cache.
- **Updates while the shell is open** (FR-053): the worker activates a new version at once
  (`skipWaiting`, `clients.claim`), and deletes the old cache. The open shell has already loaded
  its only script and style sheet, so nothing it needs is fetched again, and nothing reloads. The
  root preloads the `latin` file of all three families, as `/cv` does, so no font the shell shows
  later comes from a removed cache. The next visit gets the new version.
- **Offline storage unavailable**: the registration ignores the failure, as on `/cv` (004 FR-041).

**Rationale**: the precache list is already "everything the build wrote", so adding a page and its
assets needs no change to the worker. One bundle loaded up front is what makes a mid-visit update
harmless.

## R15. Amending 004 (FR-051)

**Decision**: in this feature's pull request, before the root changes, 004's spec is amended with
the owner's approval:

- `~~**FR-018**~~: Removed 2026-10-xx – replaced by 005-os-shell-FR-001: the site root shows the
  OS shell.` Its test in `packages/web/test/routes.test.ts` is replaced by tests for 005 FR-001 and
  FR-050 (`/` answers 200 with the shell).
- `~~**FR-038**~~: Removed – replaced by 004-cv-page-FR-059.` A new **FR-059**: "After one complete
  online visit to `/cv` or the site root, opening `/cv` or an unknown path with no network MUST
  show the same page as online, with all its content, styles and fonts. 005-os-shell-FR-052 covers
  the site root." 004's offline tests move from FR-038 to FR-059, and the root's offline case moves
  to 005 FR-052.
- 004's CV path text (Shell Scope) and the site contract's redirect line get a note pointing to
  005.
- The site check's `offline` part already visits the root; it now expects the shell there, not
  `/cv`.

The date is the day the owner approves the amendment, filled in then.

## R16. Site name and site text

**Decision**:

- `siteName(resume)` returns `basics.name` when present, else `siteText.siteHeading` (`CV`), as
  `/cv`'s `h1` does (FR-066, 004 FR-023). It lives in `src/format/meta.ts` beside 004's
  `pageMeta`.
- Every shell word in [design/wireframes.md's Site text](./design/wireframes.md#site-text) joins
  `src/site-text.ts` under `os`, `desktop`, `mobile`, `about` and `noScript` keys. Patterns with a
  placeholder (`Close {window}`, `{window} resized to {width} by {height}.`) are filled by one
  function, so each phrase is written once (FR-043).
- About this site's paragraph names the owner through the CV document: `This is {name}'s CV …`,
  with `{name}` from `siteName()`.
- The content check (002) walks every site file in the repository, so it searches
  `packages/web` and the new `packages/os-core` with no change and no exception (FR-006).

## R17. Testing and the site check

**Decision**:

- **`os-core` unit tests** (`packages/os-core/test/`): the reducer, geometry, shortcuts and the
  shell query, with plain numbers for metrics. They hold most of the window rules: FR-012,
  FR-017, FR-018, FR-021, FR-026, FR-027, FR-061 to FR-065.
- **Shell browser tests** (`packages/web/test/shell/`), with 004's helpers: the real build, served
  locally, opened in Chromium through Playwright (004 R21). They act like a visitor: clicks,
  drags, touch, keys, resizing the viewport, reduced motion, forced colors, text-only zoom, the
  history. Each test title carries its `005-os-shell-FR-###` IDs.
- **The site check** (`tools/site-check/`) covers the root in both shells:
  - A **state driver** (`src/shell-states.ts`) brings a fresh page to each state FR-048 lists, by
    real clicks and keys, never through a test hook. Desktop: first load, no window, About open,
    a menu open, two windows, one minimized, one maximized, a keyboard move and a keyboard resize
    in progress. Mobile: the home screen in portrait and in landscape, the CV app, About this
    site.
  - The `accessibility`, `modes`, `fonts`, `layout` and `other-sites` parts run on the root once
    per relevant state, at the phone and desktop widths (FR-056).
  - The `keyboard` part runs FR-057's flows on the root: the desktop sequence at 1440 × 900 and the
    mobile sequence at 375 × 812, checking focus targets and a visible indicator at each step.
  - A new **`cv-app`** part opens the CV app in each shell and compares its fields, in order, with
    the expected fields read from the CV document by 004's `expectedFields` (FR-058).
  - The `no-script` part checks the root's no-script page (FR-049), and the `offline` part opens the
    root offline at both widths and opens the CV app (FR-059).
  - Variants on the root are named `<shell>/<state>/<width>`, such as
    `desktop/two-windows/1440px`, so every failure names the shell, the state and the width
    (FR-060).
- **Seeded breaks** (`tools/site-check/test/shell.test.ts`): a temporary copy of the repository
  (004's `copy.ts`) with one change each: a close control without a name, a shortcut handler
  removed, a CV field left out of the CV app, a font from another site. Each must fail its part
  with a clear message (US7).
- **Timing** (SC-010): the site check's new runs add about 2 minutes to 004's 5. The whole local
  run stays under 8 minutes, asserted off CI by `performance.test.ts`, as in 004.

**Rationale**: the reducer can be tested on every rule in milliseconds, while the browser tests
prove the wiring. The site check drives the shell the way a visitor would, so a regression in the
real build can't hide behind a test hook.

## R18. Size and speed

**Decision and estimate**:

- The root's script: React and React DOM's client (about 60 KB compressed), the CV components and
  document (about 10 KB), the shells and `os-core` (about 15 KB). About 85 KB compressed in all.
  The style sheet is about 8 KB compressed. The HTML is about 15 KB compressed, since it holds the
  CV once in the desktop window.
- On the mobile profile, the first paint is the home screen from HTML and CSS, before the script.
  The CV icon is inline SVG, so it's drawn in that paint (SC-003, 2.5 s). Opening the CV renders
  its components in the browser. At 4× CPU slowdown that's estimated at under 300 ms, inside
  SC-003's 1 s.
- Hydrating the hidden desktop markup on a phone costs main-thread time. **Verify**: Lighthouse's
  mobile Performance score on the root is 90 or more (SC-004). If it isn't, the first fallback is
  to hydrate only the active shell's subtree, by rendering the inactive shell as an empty
  placeholder on the client with `suppressHydrationWarning`, and measure again.

## R19. The design gate under the interim provision

design/ holds the wireframes, the interim local mockup with its 18 PNG exports, and `review.md`
signed by the owner on 2026-10-26, naming commit `4d2e29f`. Constitution 1.2.0's interim provision
accepts a local mockup in place of Penpot, so the gate passes.

The provision's ending steps for this feature, in one follow-up pull request:

1. Rebuild the Graphite shells in Penpot to match the local mockup, and replace the PNGs with
   Penpot's exports.
2. Add the Penpot link to design/review.md, update its sign-off, and tick the spec's Design box.
3. The 85 tokens (with `size.desktop-min-height`) are imported into Penpot with the rest of the
   hand-written export (004 R22, step 1), and exported again.
