# Research: The Requirement Inspector

Phase 0 of [plan.md](./plan.md). Each decision gives what was chosen, why, and what else was
weighed. The spec, its clarifications and the approved design leave no open question about
behavior, so the questions here are all about how.

## R1. Built on 006, after 005

**Decision**: the inspector's code starts once 006 (the Terminal) has merged into `main`. This
branch merges `main` before its first code commit, as 006 merged 005's branch (006 research R1).
The spec gives the Terminal a spec view (US1 scenarios 5 and 6, FR-003), and 006 brings three
things this plan reuses:

- **The app fields** of 006 [contracts/shell.md](../006-terminal/contracts/shell.md):
  `menuItems` (the app's own commands, which "Show specs" follows in the menu) and `WindowTitle`
  (which the spec view's title replaces while it shows).
- **The session store** (006 research R5): the Terminal's output, history, draft, folder, scroll
  position and vim view live outside its components, and survive their unmounting. R3 relies on
  it to bring the Terminal back exactly as it was (FR-003).
- **The spec list reader**, `readSpecList` in `packages/web/scripts/spec-list.ts` (006 research
  R10): spec numbers, titles and statuses, read with 001's own reader. The requirement data (R6)
  takes each spec's number, title and status from it, so the Terminal's `specs` and the spec view
  can't disagree (spec Assumptions).

Until then, 007's design artifacts and this plan are the only things on the branch.

**Alternatives considered**: building the inspector before the Terminal, with the CV app and About
this site only (the Terminal's spec view and its state on Back would then wait for a follow-up
pull request, against Constitution XI's one feature, one pull request); merging 006's branch
before it merges (its review isn't done, and its history could still change).

## R2. Where "showing specs" lives

**Decision**: in `@cv/os-core`'s state, as a field of `OsState`:

```ts
specs: Partial<Record<ViewId, { appScroll: number }>>
```

A view is showing its specs exactly when it has an entry. Two new actions change it:

- `showSpecs { view, appScroll }` adds the entry, keeping the app's scroll position to restore
  later. On desktop it also brings the window to the front and focuses it, as acting on a window
  does. Its effect is a focus move to the new target `spec-heading` (FR-017).
- `showApp { view }` removes the entry. Its effect is a focus move to the new target `show-specs`
  (FR-017).

`close` removes the view's entry too, so an app always opens showing the app (FR-004), and so does
a desktop `open` that creates a new window (only possible for a view left showing its specs on
mobile before a shell switch). Nothing else touches it: `minimize`, `open` (including `open cv` from the Terminal and the dock),
`mobileHome`, `mobileOpen`, `shellChanged`, drags and resizes leave it alone (FR-004, spec Edge
Cases). `initialState` has no entry, and the state is never stored, so a reload or a later visit
starts with every app showing the app (FR-004).

The reducer ignores `showSpecs` for a view that isn't open, and `showApp` for one not showing its
specs, so a double activation changes nothing.

**Rationale**: which view shows what, and where focus goes, is OS behavior both shells share
(Constitution V). The reducer already survives every shell switch and every unmount, and its
invariant tests (`run`, 005 data-model.md) cover the new field for free.

**Alternatives considered**: component state in the window (lost on mobile Home, which unmounts
the full-screen view, and on a shell switch, against FR-004); a store per app like the Terminal's
session (every app would repeat it, and the menu bar and title rule, which read OS state, would
need a second source).

## R3. Swapping the content and bringing the app back

**Decision**: while a view shows its specs, `View.tsx` renders the spec view in place of the
app's content, inside the same scroller (`.window-content` on desktop, `.view-content` on mobile).
The app's content unmounts. Going back mounts it again:

- **Scroll position**: `Show specs` reads the scroller's `scrollTop` and passes it as
  `appScroll`. The spec view starts at the top. On going back, the window or full-screen view sets
  the scroller back to `appScroll` in a layout effect, before the browser paints, as 005's
  full-screen view restores its scroll on reopening (005 FR-034).
- **The app's state**: the CV app has none beyond its scroll position. The Terminal keeps all of
  its state in its session store (R1), which exists so that unmounting on mobile Home loses
  nothing (006 FR-021). Going back from its specs is the same unmount and mount, so its output,
  history, half-typed command and vim view come back as they were (FR-003). The inspector check
  proves it on every pull request (FR-030).
- **Keys**: with the Terminal unmounted, its command line and key handlers are gone, so its keys
  do nothing while the specs show, and the shell's shortcuts keep working (spec Edge Cases).

On mobile, Home while the specs show saves the spec view's scroll in `mobile.scroll`, as for any
content, and reopening shows the spec view where it was. The app's own position stays in
`specs[view].appScroll`.

**Rationale**: it keeps 005's structure (one scroller per window or view, the CV's layout
container) and every test that relies on it. It adds no new way of keeping an app's state: an app
that survives mobile Home survives the spec view.

**Alternatives considered**:

- Keeping the app mounted and hidden with `display: none`: nested scroll positions, such as the
  Terminal's output, aren't kept by every browser when their box is removed.
- Keeping it mounted with `visibility: hidden` or `content-visibility: hidden` in a pane of its
  own: every app and the spec view would need their own scroller inside `.window-content`,
  changing 005's FR-022 scroller, its mobile scroll save and 006's scroll handling. A hidden
  Terminal would also stay live behind the view.

## R4. The controls, the menu and the titles

**Decision**:

- **"Show specs"** is one component, `ShowSpecs`, rendered by the shell, not by apps, so every app
  and About this site get it with no change to their declarations (FR-001, FR-011). The desktop
  title bar renders it at its right end; the mobile header at the right of its title, opposite
  Home, with the label `Specs`. Its accessible name is always `Show specs for [view]`, which holds
  the visible label (WCAG 2.5.3). It isn't rendered while the view shows its specs, and the spec
  view's own `Back to [view]` takes its place (design).
- **The app's menu** (desktop): `MenuBar.tsx` adds one entry, `Show specs` or `Back to [view]`,
  after the app's own commands (the CV's `Open the CV as a page`, the Terminal's `Clear output`)
  and before 005's window commands, in the same group. About this site has no own command, so it
  comes first. No shortcut is added (design).
- **Titles**: a new `viewTitle(view)` in `Os.tsx` gives `[view] · Specs` while the view shows its
  specs, and the view's name otherwise. The title bar shows it in place of the name, or of an
  app's `WindowTitle` (006). The mobile header shows the name with `SPECS` below it. The page title
  rule (005 FR-042) uses it, giving `CV · Specs – [Site name]` (FR-002). The window and the
  full-screen view stay named by their title, so their accessible names follow.

Nothing else in the window, the dock, the home screen or the other windows changes (FR-002,
FR-004).

**Alternatives considered**: adding "Show specs" to each app's `menuItems` and content (every app
would repeat it, and About this site isn't an app); a separate inspector toolbar under the title
bar (covers app content, against FR-005 and the design).

## R5. Which requirements an app and the shell carry

**Decision**: at build time, from the import graph of the site's own source, read with 001's own
`data-req` reader (`tools/traceability/src/ui-files.ts`, `readUiFile`).

- **An app's content root** is the module its declaration takes `Content` from. The reader parses
  each app's `app.tsx` (listed by `src/apps/index.ts`), finds the `Content` property's identifier
  and the import that binds it. The build fails, naming the file, if it can't.
- **An app carries** every `data-req` written in every module reachable by static imports from its
  content root.
- **The shell carries** every `data-req` written in every module reachable from the shell's two
  roots, `src/client/os.tsx` (the hydrated shell) and `src/pages/ShellPage.tsx` (the root
  document and its no-script page), without going into any app's content root. So the menu bar,
  dock, windows' frames, mobile headers, home screen, About this site and the inspector's own
  controls and spec view are the shell's (FR-011), and so is an app's icon, which the dock shows.
- **Imports followed**: static `import` and `export … from` with a relative specifier, resolved as
  written (the site's imports name their extensions). Type-only imports carry no element and are
  skipped. Package imports (`@cv/content`, `@cv/os-core`, `react`) are skipped: none of them holds
  UI. A test asserts no `data-req` exists outside `packages/web/src`, so a later package with UI
  makes it fail rather than go unseen.
- **A module reached from both** an app and the shell, such as a shared glyph, counts for both,
  as the spec's edge case wants.

This reads every element an app can show, whether shown or not (FR-006): Terminal output not run
yet is written in the Terminal's modules, so its `data-req` is read. It reads `data-req` exactly
as the traceability check does (FR-013): a literal string or template literal, in a JSX attribute
or an object property, nothing computed (001 research R6).

On today's `main`, a prototype gives the CV app 23 requirements (19 of 004's, 4 of 005's) and the
shell 44 of 005's, in line with the design's sample (README.md Sample data).

**Proof against the bundler**: a test builds the site and compares the walker's set of modules
reached from `src/client/os.tsx` with the module list Rolldown reports for the `os` chunk. Any
import form the walker misses makes it fail (FR-012).

**Alternatives considered**:

- Reading `data-req` from the rendered DOM, at build time or in the browser: misses every element
  not shown yet, against FR-006.
- A folder convention (`src/apps/<app>/` is the app): would give the CV icon and the Terminal's
  window title to the app, though the dock and the frame are the shell's, and would miss the CV
  app's use of `src/cv/`.
- Rolldown's module graph as the source: known only after the bundle is written, so the bundle
  couldn't name the data file without changing a hashed chunk after hashing (R9).
- A hand-written list per app: forbidden by FR-013.

## R6. Requirement records, titles and tests, read as 001 reads them

**Decision**: `packages/web/scripts/requirements/read.ts` exports
`readRequirementData(root, version, carried)`, which builds the data of
[contracts/requirement-data.md](./contracts/requirement-data.md) from:

- **Specs**: `readSpecList(root)` (006) for each spec's number, folder, title and status; 001's
  `parseSpec` and `requirementsOf` for each requirement's ID, state and line. Only active
  requirements count, so a removed one never shows (001 FR-017, spec Edge Cases).
- **Text**: a new export of 001's `specs.ts`, `requirementText(text, entry)`, returns the
  requirement's text: its bullet line after `**FR-###**:` and its continuation lines, joined with
  single spaces, with HTML comments and fences blanked as `parseSpec` blanks them. It reuses
  `parseSpec`'s internal blanking, so the text and the entries are read from the same lines.
- **Tests**: 001's `TestNode` gains two fields, `title` (the call's title, as written: literal
  parts in order, with any substitution kept as its source text) and `location` (the line and
  column of the call). A requirement's tests are the counting tests (`coverageOf`'s rule: neither
  the test nor an ancestor is skipped, a placeholder or unrecognized) whose own or ancestors'
  tokens hold its full ID (FR-008). For an approved spec this is exactly the coverage the check
  counts. A draft spec's requirements get the same rule, so the list shows what will count once
  the spec is approved, and is empty until a test exists (design state 6).
- **What each view carries**: from R5.

001's existing outputs don't change: `parseSpec`'s entries keep their shape (001's tests compare
them whole), and `TestNode`'s new fields are only read by the new code. 001's own tests gain cases
for both.

A test runs the reader on the real repository and checks it against `runCheck`: every active
requirement of an approved spec has at least one test in the data exactly when the check doesn't
report it uncovered, and the counts agree (FR-008, FR-013).

**Alternatives considered**: a second spec and test parser in the site (it would drift from the
check, against the spec's assumption that they never disagree); calling `runCheck` and extending
its report (the report is for problems, and changing it touches 001's CLI contract).

## R7. A requirement's text: code, links and references

**Decision**: the text is parsed at build time, by `scripts/requirements/inline.ts`, into a small
tree of inline nodes (data-model.md Inline), and rendered by one component, `InlineText.tsx`. No
markup from a spec ever becomes HTML: there is no `dangerouslySetInnerHTML`, and React escapes
every text node. The parser knows:

| Written in the spec | Becomes |
|---------------------|---------|
| `` `code` `` | `code`, shown in JetBrains Mono in haze (design) |
| `**strong**`, `*em*`, `_em_` | `strong`, `em` |
| `~~struck~~` | `s` |
| `[text](https://…)` | a link to that address. Only `http` and `https` |
| `[text](relative/path)` | a link to that file in the repository, at the built commit, resolved from the spec's folder |
| `NNN FR-###` | a reference to that spec's requirement: a link to its line (design) |
| A bare `FR-###` | a reference to the same spec's requirement, or, right after `NNN FR-###` with only ` to `, ` and `, `, ` or `, and ` between, to that spec's (`001 FR-010 to FR-012`) |
| Anything else | text, as written |

A reference whose spec or requirement doesn't exist, or a link with another scheme, stays text.
The rule for bare IDs is tested on every reference in today's specs (a fixture with each form).

**Rationale**: FR-007 asks for code, links and references to show as such and for links to behave
as links. Parsing at build time keeps the browser's code small and the data checkable. The
subset is what the specs use; anything else shows as written, which is still readable.

**Alternatives considered**: a Markdown package (micromark, markdown-it): produces HTML that would
need sanitizing, knows nothing of requirement references, and is a dependency for a dozen rules
(Constitution X); showing the text raw (backticks and asterisks would show, against FR-007).

## R8. The version, its links and uncommitted changes

**Decision**: `scripts/requirements/version.ts` reads the version with Git, at the repository
root:

- `commit`: `git rev-parse HEAD`.
- `dirty`: whether `git status --porcelain` prints anything: a changed, staged, deleted or
  untracked file that `.gitignore` doesn't exclude. Build output and `node_modules` are ignored,
  so a build doesn't make itself dirty.

The build fails with `site build failed: can't tell which commit the site is built from (…)` when
Git or a commit is missing, rather than publish links that lead nowhere (FR-010).

Links (`src/format/repository.ts`), from `siteData.repository` (002) and the version:

| Link | Form |
|------|------|
| A requirement's line | `{repository}/blob/{commit}/{spec file}?plain=1#L{line}` |
| A spec's top | `{repository}/blob/{commit}/{spec file}` |
| A test | `{repository}/blob/{commit}/{test file}#L{line}` |
| A file a spec links to | `{repository}/blob/{commit}/{path}` |
| The commit | `{repository}/commit/{commit}` |

`?plain=1` makes GitHub show a Markdown file as source, where `#L{line}` is an anchor; the
rendered view has no line anchors. Without `siteData.repository`, the links aren't rendered and
their text stays, as 005's About this site and menu do with the repository link. A test asserts
the real `site.json` has one.

A dirty build shows the uncommitted-changes note in every spec view (FR-010, design 7b), with the
short commit (the first 7 characters, as the build line shows it). Pull-request and published
builds check out a commit and never show it.

**Tests that build a copy** (004's `repoCopy`, 005's `seededCopy`): the copy gains a Git
repository with one commit of its files, made with a fixed author and date, so it builds clean,
and a test can make it dirty on purpose. `repoCopy` also copies `specs/` and the `test`
directories of `tools/`, which the requirement data reads.

**Alternatives considered**: the branch name (`main` moves on, so lines and text would drift from
what the view shows, against FR-010); an environment variable set by CI (local builds would have
none, and FR-034 wants the same result locally); refusing to build with uncommitted changes (the
owner builds mid-edit, and the clarification chose a note instead).

## R9. Getting the data to the browser without delaying the shell

**Decision**: a separate file, `assets/requirements-<hash>.json`, written by `build-site.ts` after
the client build. The hash is the first 8 hex characters of its SHA-256, as Vite names assets.

- `renderShell` puts its path on the root element: `<div id="os" data-requirements="/assets/…">`.
  `#os`'s attributes are outside what React hydrates.
- `src/inspector/data.ts` starts one `fetch` of it, with `priority: 'low'`, right after the shell
  marks itself ready (`#os[data-ready]`), and keeps the promise for the visit. The first "Show
  specs" uses it; later ones reuse the parsed data.
- The service worker is unchanged: its precache list is every built file (004 R4, 005 R14), so the
  file is stored with the page after one visit to `/` or `/cv`, and is answered from the store
  offline (FR-026).
- If the fetch fails (no network and no stored copy, such as storage blocked and the network gone
  since load), the spec view shows its top bar, heading, lede and the offline note, and "Show
  specs" tries again next time. If it fails while the browser is online (such as an error from
  the server), the offline note would be wrong, so a note says the requirements couldn't be
  loaded, with a "Try again" button.

**Why after hydration and not on the first "Show specs"**: 005 R14 keeps every file the shell
uses loaded up front because a new version can activate mid-visit and delete the old cache, so a
file fetched later may be gone (005 FR-053). The fetch starts as soon as the shell is ready, before
`register-sw.ts` even registers the worker (it waits for `load`), so it is answered from the
current version's store or the network long before a new version could activate.

**Why not in the shell's script**: about 20 KB compressed of text (about 140 requirements with
their tests, measured from today's specs and the design's sample) would arrive before the shell
could hydrate, and a tap on a phone would wait for it, against FR-015. The inspector's code stays
in the one `os` script (005 R14); only its data is separate.

**Alternatives considered**:

- The data inside the `os` script, like 006's spec list: delays hydration, against FR-015.
- A `<script type="application/json">` in `index.html`: the shell's module script runs only after
  the whole document is parsed, so it would wait for the data too.
- Fetching on the first "Show specs": a version activated mid-visit could have deleted the file
  (005 FR-053).
- `<link rel="preload">`: competes with the page's fonts and style sheet during the first load,
  and browsers warn when it isn't used within seconds.

## R10. Rendering the view within 300 ms

**Decision**: the spec view renders in one commit, with no virtualization: about 140 requirements
in the largest view (the shell's), each a list item with a short test list, about 2,000 elements.
`performance.test.ts` measures the time from the click to the last group's paint with 4× CPU
throttling over CDP, as 005 and 006 measure (SC-005).

**Verify**: if the shell's view misses 300 ms, the first two spec groups render in the click's
commit and the rest in a `startTransition` update right after, so the heading, lede and first
requirements paint within the budget and focus is already on the heading. Going back unmounts the
view in one commit (within 100 ms, SC-005).

**Alternatives considered**: virtualizing the list (find in page, screen-reader browse mode and
"every requirement listed" checks would all see a partial list, against FR-006 and FR-018).

## R11. The cross-fade

**Decision**: the View Transitions API, scoped to the one window's or view's content.
`src/inspector/transition.ts` exports `crossFade(scroller, swap)`:

- It gives the scroller `view-transition-name: spec-swap` and calls
  `document.startViewTransition(() => flushSync(swap))`, then removes the name when the transition
  ends. Only that box takes part, so nothing outside it changes (FR-002).
- The style sheet sets the old and new images' animation to `var(--token-motion-duration-fast)`
  and `var(--token-motion-easing-standard)`. The box doesn't move or resize, so the only change is
  the opacity of the two images: a cross-fade, as the design sets.
- With `prefers-reduced-motion: reduce`, or where the API is missing, `swap` runs at once, with no
  fade (design, FR-022).

`Os.tsx`'s `act` runs `showSpecs` and `showApp` through it. Focus moves after the swap, from the
reducer's effect.

**Alternatives considered**: fading the new content in with `element.animate` (a fade from the
window's surface, not the approved cross-fade); keeping the outgoing content mounted for 150 ms
over the new one (two Terminals reading one session for that time, R3).

## R12. Offline and uncommitted notes

**Decision**: the offline note shows while `navigator.onLine` is `false`, and follows the `online`
and `offline` events (FR-027). The offline checks switch the network with Playwright's
`context.setOffline`, which sets both. It is not a live region: it is read in order after the
build line (design). The uncommitted note shows when the data's `version.dirty` is true, before the
offline note when both show (design).

**Alternatives considered**: probing the network with a request (a request nobody asked for, and
slower to update); showing the note whenever a link fails (a browser doesn't tell the page).

## R13. Tokens

**Decision**: the design's proposed tokens go into the hand-written export
(`packages/tokens/penpot/tokens.json`) under the interim provision, with two renamed:

| Design README | In the export | Why |
|---------------|---------------|-----|
| `size.spec-two-column` (480px, dimension) | `breakpoint.spec-two-column` (480) | Used as a container condition. 003's output and 005's container visitor turn only `breakpoint.*` tokens into width conditions, and `var()` can't appear in a query |
| `size.spec-wide` (700px, dimension) | `breakpoint.spec-wide` (700) | The same: the 40 px or 24 px padding depends on the window's width |

The others go in as proposed: `color.shell-text-soft`, `color.status-approved`,
`color.status-draft`, `size.spec-bar-touch`, `size.spec-id-column`, `size.spec-measure`.
`color.base.mint` and `color.base.amber` come from 006, which adds them; if 006's tokens change
before it merges, this plan follows them.

The renames are recorded in the design README as a `docs:` commit before any code, as 005 R7 and
006 R22 did. The values and the look don't change, so the sign-off stands.

Scripts read no new design value: the spec view's layout is all CSS. Motion reads
`motion.duration.fast` and `motion.easing.standard` through CSS custom properties.

**Alternatives considered**: a third container visitor for `size.*` dimensions (two rules for one
kind of condition); media queries on the viewport (the CV window is 1000 px wide on a 1440 px
screen, and About's is 560 px, so the view's layout must follow its window, not the screen).

## R14. Structure, names and focus

**Decision**: [contracts/inspector.md](./contracts/inspector.md) sets the markup. In short:

- The spec view is a `section` named `[view] specs` (`aria-label`), holding the top bar (Back and
  What's this?), then the panel when open, then an `h1` `Specs for [view]` with `tabindex="-1"`,
  the lede, the build line and notes, then one `section` per spec with an `h2`
  (`004 The /cv Page, Approved`), and a `ul` of requirements, each with a `ul` of tests.
- `h1` matches 005's About this site and the CV app, whose content starts at `h1` under a title
  bar that isn't a heading, so no level is skipped (FR-018). The panel's heading is an `h2`.
- The short ID is shown and hidden from assistive technology; the full ID is visually hidden text
  that starts the item (design Screen readers).
- Focus moves through two new `FocusTarget`s, `spec-heading` and `show-specs`, resolved by
  `focus.ts` inside the view's window or full-screen view, with 005's `moveFocus`, so the
  indicator shows after a key (FR-016, FR-017).

## R15. The checks

**Decision**: one new site check part, `inspector`, after `terminal`, and additions to five
parts, as [contracts/cli.md](./contracts/cli.md) sets. The part reads what it expects from the
repository with the same `readRequirementData` the build uses, and from the built data file, and
cross-checks both against the page:

1. Each view lists exactly its app's or the shell's requirements, in order, with each group's count
   (FR-006, FR-030).
2. Each requirement's text, read from the page, equals its spec's text with Markdown marks
   removed, read again from the spec file at its line (FR-007, FR-013).
3. Each requirement's tests equal 001's counting tests for it (FR-008).
4. Every `data-req` found in the page, in every state 005's and 006's state driver reaches, is in
   the view of the app it sits in, or the shell's (FR-012). This is the check's own reading of the
   page, so a gap in R5's walker shows here.
5. Going back restores the scroll position and the Terminal's state (FR-003, SC-011).

Every problem line names the part, the variant (`<shell>/<state>/<width>px`), the view and the
requirement (FR-034).

**Alternatives considered**: checking against the built data file only (a wrong reader would agree
with itself); a hand-written expected list (FR-030 forbids it).

## R16. Bundle and performance budget

**Decision**: the inspector's code (the spec view, its controls, the inline renderer, the loader
and the transition) adds about 6 KB compressed to the `os` script. The data file is about 20 KB
compressed, fetched after the shell is ready. Budget for `/`, compressed, on top of 006's: script
about 108 KB, style sheet about 14 KB, HTML about 16 KB. Lighthouse 90+ on both profiles stays a
merge check (SC-006). **Verify** with the `lighthouse` part; the data's fetch after hydration is
not render-blocking and isn't counted in total blocking time.

## R17. Manual checks and the interim provisions

**Decision**: the design is in Penpot, with its link and exports, so the interim provision on
local mockups applies only to the token export, written by hand (R13). The screen-reader passes of
SC-007, forced colors in Edge and text-only zoom in Firefox are done by hand (quickstart 6 to 8).
Under the interim provision on deferred manual checks they may wait for the final testing phase:
each stays an open task in tasks.md, marked deferred, and the pull request lists them.
