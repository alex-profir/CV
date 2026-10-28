# Implementation Plan: The Terminal

**Branch**: `006-terminal` | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-terminal/spec.md`

**Design**: [design/review.md](./design/review.md): the Penpot page **006 Terminal — Glass**,
exports of commit `c34fd51`, approved 2026-10-27, with its
[Penpot link](https://design.penpot.app/#/workspace?team-id=86d07029-2be7-815f-8008-d2a9447f2808&file-id=eaccfa4c-8a01-81ad-8008-d441a46da254&page-id=07f3159c-7750-805c-8008-dade1b6b707f).

## Summary

The Terminal is the shell's second app. On desktop it opens from the dock as a frosted-glass
window. On a phone it opens full screen as the pocket terminal, with big command keys. Visitors
read the CV by typing commands (`work`, `projects`, `skills`) or by clicking or tapping them. They
browse it as a read-only file system (`ls`, `cd`, `cat`), read the whole CV as JSON in a
read-only vim view (`cv` runs `cat cv.json | jq | vim -`), and learn how the site was built
(`site`, and `specs`, read from the repository at build time).

Technical approach (details in [research.md](./research.md)):

- **Built on 005.** The Terminal is an app folder, `packages/web/src/apps/terminal/`, in 005's
  shell. That shell is implemented on the `005-os-shell` branch, which this branch merges before
  any code (R1). The shell gains five general features any app can use: a third view, the
  Terminal's window placement, focus into an input on opening, an app's own window title and
  menu items, and an `os` handle to open views and exit. The CV app and About this site don't
  change (R6, [contracts/shell.md](./contracts/shell.md)).
- **A pure engine.** Parsing, the commands, suggestions, the file system, the JSON printer and the
  vim view's model are pure TypeScript in `apps/terminal/engine/`, with no React or DOM. They are
  unit-tested in Node (R2, R7 to R12).
- **Output as data.** A command returns a typed block (text, headings, lists, links, dates,
  command controls), never markup. One React renderer draws it, so typed text can never become
  markup or a link. `cat` and the named commands share their block builders, so they can't
  differ (R3, R4).
- **One session per visit** in a store outside the shells. It survives minimizing, going home and
  shell switches, and is emptied only when the visitor closes the Terminal (R5).
- **The spec list** is read at build time with 001's own spec reader, and served to the bundle as
  a Vite virtual module. `specs` can't drift from the repository or from the traceability check
  (R10).
- **No new package.** The JSON lexer, the vim view and the suggestion distance are small, own
  code. Editors and highlighters were weighed and rejected (R8, R11, R12).
- **Checks.** A new site check part, `terminal`, compares every command's output and every file
  with the CV document in both shells. 005's state driver gains the Terminal's states, and the
  keyboard, offline, other-sites, layout and modes parts cover them (R20,
  [contracts/cli.md](./contracts/cli.md)).

## Technical Context

**Language/Version**: TypeScript with erasable syntax and TSX, run by Node.js 26, as 001 to 005.
CSS compiled by Lightning CSS. Browser code bundled by Vite (Rolldown) into 005's one `os` script.

**Primary Dependencies**: no new package. Used as 005 uses them: `react` and `react-dom` 19.3.1,
`vite` 8.3.5, `lightningcss` 1.33.0, `playwright` 1.64.1, `axe-core` 4.14.0, `lighthouse` 13.5.0.
Reused: `@cv/content` (002), `@cv/tokens` (003), 004's formatting modules, `Arrow`, test helpers
and site check, 005's `@cv/os-core`, shells, `metrics.ts`, `focus.ts`, state driver and shell
test helper, and 001's spec reader (`tools/traceability/src/specs.ts`).

**Storage**: none on a server. The Terminal's session lives in memory for the visit only (R5,
FR-022). Offline, 004's single cache `cv-<version>` holds the bundle that holds the Terminal.

**Testing**:

- Vitest unit tests in Node for the engine (`packages/web/test/terminal/engine/`) and for
  `@cv/os-core`'s placement.
- Vitest browser tests in Chromium through Playwright on the real build
  (`packages/web/test/terminal/`), with 005's shell helper and a new Terminal helper.
- `npm run site-check` on the real build: the `terminal` part and the Terminal's states (R20).
- `tsc --noEmit`, `npm run traceability`, `npm run content-check`, `npm run token-check`.
- By hand: screen readers, real phone keyboards, forced colors in Edge, and the look against the
  exports (quickstart 7 to 9). They may wait for the final testing phase under the interim
  provision on deferred manual checks (R24).

**Target Platform**: as 005: the current and previous major versions of Chrome, Edge, Firefox and
Safari, on desktop and phone. Build and checks on Node.js 26, macOS and Linux (GitHub Actions
`ubuntu-latest`).

**Project Type**: a static web site. One new app in the existing shell page, small general
additions to the shell, one new site check part.

**Shells**: Both, as the spec's Shell Scope sets. Desktop: a window opened from the dock, with its
own menu. Mobile: the pocket terminal, full screen from the home screen.

**Offline Approach**: nothing new to store. The Terminal, its data (the CV, `cv.json` and the spec
list) and its styles are in the `os` script and style sheet, which 005's service worker already
precaches after one visit to `/` or `/cv`. No command makes a request, so every command works
offline with the same output (FR-036, R21).

**Performance Goals**:

- A command's output within 100 ms of Enter at 1440 px, and within 300 ms with 4× CPU throttling,
  `cv` included (SC-002). Every command is synchronous and renders in one commit (R21).
- Lighthouse 90+ in every category for `/` on both profiles, with the Terminal in the bundle
  (SC-005). **Verify**: the script grows from about 85 to about 102 KB compressed, and R21 gives
  the fallbacks.

**Constraints**:

- Static files only. One `os` script with no lazy chunks (005 R14).
- No request to any other site, and nothing typed leaves the browser or is stored (FR-022).
- No CV fact or design value written in code, with no exception added to the content or token
  check (FR-010, FR-031).
- The Terminal takes no key a browser, screen reader or the shell uses (FR-026, FR-060).
- Nothing in front of the CV: the Terminal never opens by itself, and the CV stays first (FR-001,
  FR-002).

**Scale/Scope**: 66 requirements; 2 shells; 22 commands and 3 aliases; a file system of about 30
files; a vim view of about 290 lines; 13 desktop and 12 mobile check states; about 60 new tokens;
1 new site check part and 6 parts extended.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The initial check passed before research, and the re-check after design passed too. The table
shows the post-design state.

| # | Principle | Check | Status | Evidence |
|---|-----------|-------|--------|----------|
| I | Spec First | spec.md `Status: Approved`; this plan holds the "how", the spec holds none | Pass | spec.md line 7 reads `**Status**: Approved`. React, the session store, the virtual module, the lexer, CSS techniques and every file path appear only in this plan, research.md and the contracts. 005 FR-040's widening, which FR-004 relies on, was made in 005's spec before 005 merged (spec Clarifications) |
| II | Design Gate | design/ has wireframe, PNGs, Penpot link, signed review.md; or an interim local mockup with PNGs and signed review.md; or spec says "No UI" | Pass | `design/wireframes.md` covers every state of both shells listed in the spec's Design section. `design/exports/` holds 19 PNGs at 1440, 375, 320 and 568 px. The Penpot link is in spec.md, README.md and review.md. `review.md` is signed by the owner, naming commit `c34fd51` and 2026-10-27. The token renames of R22 change the design README, not the design, and are committed as `docs:` before code |
| III | Traceable Requirements | Every FR has a planned test and, if UI, a `data-req` target (see Requirement Traceability) | Pass | All 66 FRs have planned tests below, with UI targets as [contracts/terminal.md](./contracts/terminal.md#data-req-targets) sets. `data-req` is written literally in TSX, so 001's check reads it |
| IV | One Source of Truth | CV data read only from `packages/content`; styles use tokens only, from Penpot (or a hand-written export, under the interim provision) or the motion token source | Pass | Every CV word, `cv.json`, the file names and the pocket case's name come from `@cv/content` at build time (FR-010, FR-055). The repository link comes from `siteData`. Section names and labels reuse 004's site text. Styles use `var(--token-…)`. Scripts read design values only through `metrics.ts` (`METRICS`, `TERMINAL`). The design's tokens go into the hand-written export under the interim provision, in its existing form (R22). The font's advance width is a font fact in `fonts.json`, tested against the served file, not a design value (R13) |
| V | Shared Core, Per-Shell Scope | Apps declare shells; shared logic in `os-core`; matches spec Shell Scope | Pass | `apps/terminal/app.tsx` declares both shells and `needsNetwork: false`. OS behavior (placement, the view id) is in `@cv/os-core`. The Terminal's own behavior is in its app folder, which Constitution V keeps with the app (R2). Shell code changes are general and stay in the shells (contracts/shell.md). Matches the Shell Scope: a window on desktop, the pocket terminal on mobile |
| VI | Offline by Default | Offline Approach delivers everything the spec lists as offline | Pass | Everything is in the precached `os` bundle, and no command uses the network (FR-036). Proven by the `offline` part in both shells on every pull request (FR-041) |
| VII | Recruiter First | No added steps before the CV; `/cv` stays server-rendered | Pass | The Terminal is after the CV in the dock and on the home screen, and never opens by itself (FR-001, FR-002). First load is unchanged: the CV window on desktop, one tap on mobile. `/cv` is untouched |
| VIII | Accessible and Fast | WCAG 2.2 AA, desktop keyboard operation, reduced motion, Lighthouse 90+ planned and verifiable | Pass | axe in every FR-035 state of both shells, FR-039's keyboard flow, forced colors, reduced motion, zoom and text spacing run on every pull request (R20). No key is taken from browsers or screen readers. Output never types itself out, and the cursor never blinks (R19). Lighthouse 90+ on `/` stays a merge check, with the bundle growth marked **Verify** and fallbacks in R21. Screen readers are checked by hand (quickstart 7), possibly in the final testing phase |
| IX | Original Design | No Apple icons, fonts, wallpapers or other Apple assets | Pass | The icon, prompt mark, clock and cursor are the design's own SVG and CSS. Fonts are the site's OFL families. The owner's review records that nothing traces macOS's Terminal, another terminal or a real device (design/review.md, SC-010). The vim view copies vim's keys, not a color scheme |
| X | Simple and Vetted | Every new dependency, skill and abstraction listed below with a reason | Pass | No new package and no agent skill. The abstractions are listed below, each with the simpler alternative it rejected |
| XI | One Feature, One PR | Feature ships in one PR linking spec.md and tasks.md | Pass | One pull request from `006-terminal`, after 005's has merged, holding the shell additions, the tokens, the Terminal, the check changes and the design README's `docs:` rename. It links spec.md and tasks.md |

## Requirement Traceability

Constitution III. Paths are relative to `packages/web/test/terminal/engine/` (marked **engine**,
Node), `packages/web/test/terminal/` (marked **term**, the real build in Chromium),
`packages/os-core/test/` (marked **core**), `packages/web/test/` (marked **web**) and
`tools/site-check/test/` (marked **check**). Each test or group title carries the
`006-terminal-FR-###` IDs it covers. "Both shells" means at 1440 × 900 and at 375 × 812 with
touch. UI targets follow [contracts/terminal.md](./contracts/terminal.md#data-req-targets).

| Requirement | Test(s) | UI target (`data-req`) |
|-------------|---------|------------------------|
| 006-terminal-FR-001 | core `apps.test.ts`: `appsFor(APPS, shell)` is `[cv, terminal]` for both shells. term `open.test.ts`: the dock and the home screen show CV, then Terminal; the Terminal declares both shells and no network need | dock item, home icon |
| 006-terminal-FR-002 | term `open.test.ts`: on first load at 1440 only the CV window is open, at 375 the home screen with nothing open; after 5 s nothing else has opened | Non-UI |
| 006-terminal-FR-003 | term `open.test.ts`: the window moves, resizes, minimizes, maximizes, restores and closes as 005's CV window does, through 005's helpers; at 375 it opens full screen with the header and Home. term `menu.test.ts`: the menu is titled `Terminal` and holds `Clear output` first, then 005's window commands; `Clear output` clears | Terminal menu's `Clear output` |
| 006-terminal-FR-004 | term `open.test.ts`: from the dock, the Window menu, `Alt+Shift+N`, a dock restore and the home screen, `document.activeElement` is `input.command-line`; its accessibility tree ancestor is the window or view named `Terminal…`, and its name is `Command`. web `focus.test.ts`: a `focusOnOpen` selector that matches nothing falls back to the title | `input.command-line` |
| 006-terminal-FR-005 | term `output.test.ts`: the greeting holds the design's site text with the fixture CV's name and label, then 5 chips that run `help`, `about`, `work`, `projects` and `cv`; with the `no-name` fixture it shows the site heading | `div.greeting` |
| 006-terminal-FR-006 | term `command-line.test.ts`: typing `Help ` and Enter adds a group whose `h2` reads `Help ` exactly, then `help`'s output, then an empty prompt | `input.command-line`, `section.run` |
| 006-terminal-FR-007 | engine `parse.test.ts`: ` HELP `, `work\t`, `help   work`, tabs and capitals parse to the same command; an empty or blank line is `empty`. term `command-line.test.ts`: Enter on an empty line adds a prompt and no message, and nothing to `history` | `input.command-line` |
| 006-terminal-FR-008 | engine `help.test.ts`: `COMMANDS` names exactly FR-008's commands, with `whoami`, `experience` and `?` as aliases; `help`'s rows list every name and alias, and nothing else; every word that isn't in the table parses as unknown (generated words) | Non-UI |
| 006-terminal-FR-009 | engine `cv-output.test.ts`: on the `every-field`, `nothing-optional`, `partial-dates`, `non-ascii` and `three-projects` fixtures, each CV command shows the fields of `CV_FIELDS` in order, dates as 004's formatter writes and dates them, the location as 004 writes it, and links with 004's names; `CV_FIELDS` matches 004's `expectedFields`. check `terminal.test.ts` on the real build | `div.run-output` |
| 006-terminal-FR-010 | engine `cv-output.test.ts`: changing one fact in a fixture CV changes the output, with no other edit (as 004's `one-edit.test.ts`). web `self-check.test.ts`: `npm run content-check` passes with no exception added. check `terminal.test.ts`: the owner's email written into the Terminal's site text fails the content check, naming the file and line (US8 scenario 3) | `div.run-output` |
| 006-terminal-FR-011 | engine `cv-output.test.ts`: on `empty-sections`, each empty command shows `The CV lists no {section}.` with no heading or list, and `help` still lists it | `div.run-output` |
| 006-terminal-FR-012 | engine `files.test.ts`: the tree holds every section of the fixture CV, and `ls`, `cd`, `cat` and `pwd` reach all of it; every section is also shown by its named command | Non-UI |
| 006-terminal-FR-013 | web `spec-list.test.ts`: on a fixture repository (an approved spec, a draft, one with a removed requirement, a folder without `spec.md`) `readSpecList` gives numbered order, statuses and active counts equal to `runCheck`'s; on the real repository it equals `npm run traceability`'s. engine `commands.test.ts`: `specs` rows show number, name, status and count, each linking to `{repository}/blob/main/specs/{folder}/spec.md`. check `terminal.test.ts`: a spec added in a temporary copy shows after the build | `specs` output |
| 006-terminal-FR-014 | term `open-command.test.ts`: `open cv` with the CV closed opens it focused in front; with it behind, brings it to the front; `open about` opens About; at 375 `open cv` opens the CV full screen; `open settings` lists `cv` and `about` as controls | Non-UI |
| 006-terminal-FR-015 | term `controls.test.ts`: every control in the greeting, `help`, the unknown reply, the path replies, `ls` and the pocket keys runs its line on click, Enter and Space, as typed (in the output and in `history`), and focus returns to the command line; on touch the command line has `inputmode="none"` when focused by a control, and a tap on it removes it | command controls |
| 006-terminal-FR-016 | engine `suggest.test.ts`: `wrok` → `work`, `hlep` → `help`, `proj` → `projects`, `experiance` → `experience`, `WROK` (capitals free), `sudo` → none; ordering by distance then `help` order; at most 3; an alias and its command count once. engine `replies.test.ts`: the reply names the word as typed and mentions `help` | suggestion chips |
| 006-terminal-FR-017 | engine `replies.test.ts`: `work 2020`, `cat`, `cd a b` and `open` alone get the usage reply; `help work` shows `work`'s own help. term `command-line.test.ts`: `maxlength` equals the token, typing and pasting 600 characters keeps 500, and a 500-character line wraps inside the window | `input.command-line` |
| 006-terminal-FR-018 | term `command-line.test.ts`: `<b>hi</b>`, `<img src=x onerror=alert(1)>` and a URL echo as text, with no `b`, `img` or `a` created; a pasted `help\nwork` becomes `help work` and nothing runs until Enter. engine `parse.test.ts`: no block node is built from typed text except `text` | `input.command-line`, `div.run-output` |
| 006-terminal-FR-019 | term `output.test.ts`: output stays until `clear`, `Clear output` or closing; the wheel scrolls the output, never the document; after `help` the command's heading is at the top of the view; after `pwd` the new prompt is in view; scrolled up, a control moves the view to the new command | `div.terminal` |
| 006-terminal-FR-020 | engine `session.test.ts`: Up and Down step newest first, Down past the newest restores the draft, Up with no history changes nothing. term `history.test.ts`: the same in the browser, and `history` lists the commands oldest first | `input.command-line` |
| 006-terminal-FR-021 | engine `session.test.ts`: `reset` empties output, history, folder and draft. term `state.test.ts`: minimize and restore, mobile Home and reopen, and a 1440 → 375 → 1440 resize keep the output, history, folder, draft, scroll position and an open vim view's cursor, folds and search; close and reopen starts afresh | Non-UI |
| 006-terminal-FR-022 | term `requests.test.ts`: opening the Terminal and running every command `help` lists requests only `127.0.0.1`; `localStorage`, `sessionStorage`, IndexedDB and cookies are empty afterwards; a new page shows nothing typed before | Non-UI |
| 006-terminal-FR-023 | term `layout.test.ts`: with the `long-words` fixture, in a 400 px wide window and at 320 px, the output has no horizontal scroll; a mouse drag selects output text and copies it, and focus doesn't move to the command line. check `layout` | `div.terminal` |
| 006-terminal-FR-024 | term `pocket.test.ts`: at 375 the Terminal is a `.pocket` with its case, screen and keys; the command line, output and controls tests run in both shells (`describe.each`) | `div.pocket` |
| 006-terminal-FR-025 | term `pocket.test.ts`: by taps alone, starting from the greeting and the keys, every CV section, `site`, `specs` and every file is reached (a search over controls), each CV section within 2 taps (SC-001); in `pocket-keyboard` the command line and the last output are inside the visual viewport | `div.pocket` |
| 006-terminal-FR-026 | term `keyboard.test.ts`: Tab from the command line moves focus on and leaves its value unchanged; Shift+Tab comes back; `Alt+Shift+D` and `Alt+Shift+M` from the command line reach the dock and the menu bar; Ctrl and Alt key events reaching the page aren't `defaultPrevented`. check `keyboard.test.ts` | `input.command-line` |
| 006-terminal-FR-027 | term `screen-reader.test.ts`: the command line's accessible name is `Command`; the prompt is `aria-hidden`; each run's heading name is the command as typed, with no prompt | `input.command-line` |
| 006-terminal-FR-028 | engine `announce.test.ts`: rows at the desktop column count, `pwd` → its text, `work` on a 4-entry fixture → `work: 4 entries`, `ls` → `ls: 11 files`. term `screen-reader.test.ts`: the status region holds that text once after Enter, focus stays in the command line, and scrolling earlier output doesn't change it | `.terminal-status` |
| 006-terminal-FR-029 | term `screen-reader.test.ts`: one `h1` `Terminal`; an `h2` per run; in `projects` and `work` an `h3` per entry, with no section heading between; no level skipped (004's `ax.ts`); lists are `ul`, links `a`, controls `button`s named by their line; the reading order follows the boxes' order on screen | `h1`, `section.run` |
| 006-terminal-FR-030 | term `site-text.test.ts`: every value under `siteText.terminal` is English and holds no key fact of the real CV (004's check); every text node of the rendered Terminal is CV text, spec list text or site text | `div.greeting` |
| 006-terminal-FR-031 | term `design.test.ts`: the output and command line use the mono token's family; the window opens at 760 × 536 at 640, 176 at 1440 × 900; the glass's computed colors and blur come from the tokens; the icon and glyphs are the committed SVG components; no Apple or system UI font is named. web `self-check.test.ts`: `npm run token-check` passes with no skip. Manual: design/review.md (SC-010) | `div.terminal` |
| 006-terminal-FR-032 | term `motion.test.ts`: a command's whole output is in the frame after Enter; the cursor has no animation at 0 and 6 s; with reduced motion, sampled frames while opening, running commands and pressing pocket keys show no `transform` or `scale` change. check `modes` | `span.cursor-mirror`, `div.terminal` |
| 006-terminal-FR-033 | term `modes.test.ts`: with forced colors the window, chips, keys, fold lines and command line have visible borders, the cursor uses `Highlight`, the focus outline shows, and no element relies on a background image or color alone; with reduced transparency the window is solid `color.shell-surface` | `div.terminal` |
| 006-terminal-FR-034 | term `targets.test.ts`: every control in every FR-035 state of both shells is at least 24 × 24 px, pocket keys 44 × 44, fold lines 24 × 24 | command controls, `button.vim-fold` |
| 006-terminal-FR-035 | term `accessibility.test.ts`: axe (WCAG 2.2 A and AA tags) finds nothing in each FR-035 state of both shells; 200% zoom, text-only 200%, 400% on 1280 px and text spacing keep every part visible, with no clipping or overlap. check `accessibility` and `layout` | `div.terminal` |
| 006-terminal-FR-036 | term `offline.test.ts`: after one visit to `/`, and separately to `/cv` only, `/` offline at 375 and 1440 px opens the Terminal in the site's fonts, every command `help` lists gives the online output, and no offline message shows | Non-UI |
| 006-terminal-FR-037 | term `data-req.test.tsx`: every target in contracts/terminal.md carries its IDs in the rendered Terminal. web `self-check.test.ts`: `npm run traceability` passes | Non-UI |
| 006-terminal-FR-038 | check `shell-states.test.ts`: the summary lists `/` under `accessibility` in every Terminal state at both widths, and `other-sites` records the Terminal's commands in both shells | Non-UI |
| 006-terminal-FR-039 | check `keyboard.test.ts`: the flow passes on the real build; in a copy where the command line catches Tab, it fails naming the step (US8 scenario 2) | Non-UI |
| 006-terminal-FR-040 | check `terminal.test.ts`: passes on the real build, with the expected fields read from the CV document (a temporary CV with an extra entry still passes); copies where `work` drops the end date, a project has no file, or the vim view drops a line fail with lines naming the command, field and shell, or the folder and entry (US8 scenarios 1, 4) | Non-UI |
| 006-terminal-FR-041 | check `offline.test.ts`: a copy whose `os` script isn't precached fails the Terminal's offline run at both widths, naming the shell and width | Non-UI |
| 006-terminal-FR-042 | check `cli.test.ts`: the local command and the CI step are the same; every Terminal problem line names shell, state or command, and width; two runs give the same result; the whole check stays within 005's time budget plus 3 minutes off CI | Non-UI |
| 006-terminal-FR-043 | engine `files.test.ts`: the home folder lists `cv.json`, `about`, `contact`, `work/`, `projects/`, `skills`, `education/`, `languages`, `interests`, `readme`, `specs/` in that order; empty sections are left out (`empty-sections`); entries keep the CV order and specs numbered order; folders end in `/`. term `files.test.ts`: folder names differ from files by the slash, with color removed | `ls` output |
| 006-terminal-FR-044 | engine `files.test.ts`: `fileName` lowercases, strips accents (`non-ascii` fixture) and hyphenates; two roles at one company get start years, then numbers; the same CV gives the same names on every build | Non-UI |
| 006-terminal-FR-045 | engine `files.test.ts`: relative paths, `.`, `..`, `~/`, `/`, capitals, and `../..` from home resolve as FR-045 sets, from every folder | Non-UI |
| 006-terminal-FR-046 | engine `commands.test.ts`: `pwd` shows `~` and `~/work`. term `files.test.ts`: the prompt and the window title show `~/work` after `cd work` | Non-UI |
| 006-terminal-FR-047 | engine `files.test.ts`: on every fixture, `cat` on each entry's file equals the named command's block for that entry; `cat about`, `contact`, `skills`, `languages`, `interests` and `readme` equal `about`, `contact`, `skills`, `languages`, `interests` and `site`; a spec's file equals its `specs` row; `cat cv.json` is the JSON text | Non-UI |
| 006-terminal-FR-048 | engine `replies.test.ts`: `cat nothing-here`, `cat work/nowhere`, `cd about`, `cat work`, `vim work` and `ls about` give FR-048's replies, the path as typed, and `cat` or `ls` as controls | path reply controls |
| 006-terminal-FR-049 | engine `files.test.ts`: `rm`, `mkdir`, `touch`, `mv` and `sudo` get the unknown reply; the tree is frozen and equal before and after a scripted run of every command | Non-UI |
| 006-terminal-FR-050 | term `files.test.ts`: each name in `ls`'s output runs `ls ~/{folder}` or `cat ~/{path}`; a search over controls from `ls` reads every file without typing | `ls` output |
| 006-terminal-FR-051 | term `pocket.test.ts`: 8 keys in the design's order, each a `button` named by its command, at least 44 × 44 px, each running its command | `div.pocket-keys` |
| 006-terminal-FR-052 | term `pocket.test.ts`: at 320 × 568, 375 × 812, 568 × 320, 812 × 375 and 1023 × 700, the screen and keys fit below the header with no horizontal scroll, and the output scrolls inside the screen; at 200% text zoom no key is cut off | `div.pocket` |
| 006-terminal-FR-053 | term `pocket.test.ts`: after a tap on the command line and the page made 300 px shorter, `data-keyboard` is set, the keys are hidden, and the command line and newest output are visible; restoring the height brings the keys back. Manual: quickstart 8 | `div.pocket` |
| 006-terminal-FR-054 | term `pocket.test.ts`: the case is `aria-hidden`, has no focusable element, and none of its text is in the accessibility tree; with reduced motion a pressed key changes no `transform`. Manual: design/review.md | `div.pocket-case` |
| 006-terminal-FR-055 | engine `json.test.ts`: `cv.json`'s text equals `JSON.stringify(resume, null, 2)` and `packages/content/resume.json`'s text without its final line break, and parses to the CV with every key in order. check `terminal.test.ts` (json) | Non-UI |
| 006-terminal-FR-056 | engine `json.test.ts`: 2-space indents; key order kept, integer-like keys included; numbers kept as written; token classes; `jq .` accepted, `jq .work` gets the "only pretty-prints" reply; `cat about \| jq` and `jq readme` get the "is not JSON" reply naming `\|` or the path. term `vim.test.ts`: the colored rows' text equals the plain printed text | `json` output rows |
| 006-terminal-FR-057 | engine `parse.test.ts`: `cat cv.json \| jq` pipes; `ls \| work` gets the "doesn't read piped input" reply naming `work`; `ls \|`, `\| jq` and `ls \|\| jq` get the usage reply; `$(ls)`, `` `ls` `` and `;` are plain words, never run | Non-UI |
| 006-terminal-FR-058 | engine `commands.test.ts`: `vim cv.json` and `cat cv.json \| vim -` open the view; `vim work`, `vim nowhere`, `vim -` with nothing piped and `vim` alone give their replies without opening it. term `vim.test.ts`: the view fills the window's content and the pocket screen, with line numbers, a status line holding mode, name, `[RO]`, type, line and column and position, and a message line | `section.vim` |
| 006-terminal-FR-059 | engine `commands.test.ts`: `cv`'s result equals running `cat cv.json \| jq \| vim -`; `help` describes `cv` with that pipe. term `vim.test.ts`: the status line shows the pipe | `section.vim` |
| 006-terminal-FR-060 | engine `vim.test.ts`: every key of FR-060 does what data-model.md's table sets; `i`, `a`, `o`, `x`, `dd`, `p`, `:w`, `:wq`, `:w!` change nothing and set the read-only message; `:foo` names it; Escape cancels `/` and `:`. term `vim.test.ts`: `Ctrl+D`, `Ctrl+F` and `Ctrl+U` aren't `defaultPrevented` | `div.vim-text` |
| 006-terminal-FR-061 | engine `vim.test.ts`: on opening, each top-level object or array is one closed fold naming its key and line count, and everything else is open. term `vim.test.ts`: a fold line is a `button` with `aria-expanded`, toggled by click, Enter and Space, at least 24 × 24 px | `button.vim-fold` |
| 006-terminal-FR-062 | engine `vim.test.ts`: `/REST` finds every match, `n` and `N` move between them, a missing word gives `not found`. term `vim.test.ts`: matches are `mark`s, the current one has `aria-current` and an outline, and the message reads `match 1 of 3` | `mark` |
| 006-terminal-FR-063 | term `vim.test.ts`: with the `long-words` fixture, at 320 px and in a 400 px window, no horizontal scroll; a wrapped line's second row starts 2 characters past its first row's text; its number shows on the first row only | `div.vim-text` |
| 006-terminal-FR-064 | engine `vim.test.ts`: `:help` opens the split, the first `:q` closes it, the second quits. term `vim.test.ts`: `:q` and the `:q` chip restore the output with `cv` after its prompt and a new prompt, focus in the command line; the `:help` chip opens the split | `div.vim-help`, `:q` and `:help` chips |
| 006-terminal-FR-065 | term `vim.test.ts`: on opening, focus is on `.vim-text`, named and read only; the status region announces name, read only, line count and `:q`; a message change is announced once; fold lines expose `aria-expanded`; Tab moves to the chips, then out of the Terminal | `section.vim` |
| 006-terminal-FR-066 | term `pocket.test.ts`: with the vim view open the keys are `j`, `k`, `za`, `/`, `n`, `gg`, `G`, `:q`, named `Down` to `Quit`, at least 44 × 44, acting on the view; after `:q` the command keys are back; a tap on a fold line toggles it | `div.pocket-keys` |

Success criteria without an FR of their own:

- SC-001: term `pocket.test.ts` (2 taps per section, 1 per key command) and `controls.test.ts` on
  desktop.
- SC-002: term `performance.test.ts`: Enter to output under 100 ms at 1440 px, and under 300 ms
  with 4× CPU throttling over CDP, for every command `help` lists, `cv` included.
- SC-003, SC-011: FR-040 and FR-047 above.
- SC-004: FR-035 above, and by hand, quickstart 7.
- SC-005: check `lighthouse` on `/` on both profiles, and 005's first-load tests unchanged.
- SC-006 to SC-008: FR-036, FR-022 and FR-032 above.
- SC-009: FR-037, FR-010 and FR-031's self-checks, and FR-042.
- SC-010: design/review.md.
- SC-012: FR-052 above.

## Dependencies, Skills & Abstractions

No new package and no agent skill.

| Item | Kind | Reason | Simpler alternative rejected because | Vendor-maintained |
|------|------|--------|--------------------------------------|-------------------|
| Terminal engine (`apps/terminal/engine/`) | abstraction | The commands, parser, file system, JSON printer and vim model as pure functions, tested in Node and shared by both shells (R2) | Logic in components: testable only in a browser, and repeated per shell. A workspace package: a boundary with one consumer | N/A |
| `COMMANDS` table (`engine/commands.ts`) | abstraction | One list that `help`, the parser and suggestions read, so no command can be hidden or missing from `help` (R7, FR-008) | A `switch` on the command word: `help`'s list would be a second copy | N/A |
| Output blocks and their renderer (`engine/block.ts`, `Output.tsx`) | abstraction | Commands return data, never markup. One renderer, the summary count, the shared `cat` builders and the site check's reading all depend on it (R3) | Strings: no links or controls. React elements from commands: the engine would depend on React, and the summary would have to read the DOM | N/A |
| Session store (`session.ts`) | abstraction | The visit's Terminal state outside the components that unmount on Home and shell switches (R5) | Component state: lost on mobile Home and a shell switch. The OS reducer: `os-core` would hold one app's data | N/A |
| File system (`engine/files.ts`) | abstraction | The tree, the names and path resolution, built from the CV and the spec list (R9) | A file system package: writing and permissions the Terminal must not have | N/A |
| JSON lexer and printer (`engine/json.ts`) | abstraction | Pretty-printing with keys and numbers exactly as written, token classes for colors, and fold lines (R11) | `JSON.parse`/`stringify`: reorders integer-like keys and rewrites numbers. A highlighter package: Constitution X, and no fold lines | N/A |
| Vim model and view (`engine/vim.ts`, `VimView.tsx`) | abstraction | The read-only vim view's keys, folds, search and help as a pure reducer, rendered once for both shells (R12) | CodeMirror or Monaco read-only: hundreds of KB in the one bundle, their own key maps and looks | N/A |
| Suggestion distance (`engine/suggest.ts`) | abstraction | FR-016's rule, in about 30 lines (R8) | A fuzzy-search package: its scoring isn't FR-016's | N/A |
| Spec list reader and Vite plugin (`scripts/spec-list.ts`) | abstraction (build) | `specs` read from the repository at build time with 001's reader, into the bundle (R10) | A committed generated file: drifts between regenerations. Fetching from GitHub: a request to another site | N/A |
| App declaration fields and the `os` handle (`apps/index.ts`, `View.tsx`) | abstraction | General ways for any app to focus an input, title its window, add menu items, react to closing, open views and exit (R6) | `'terminal'` special cases in the shell's components: every later app would add more | N/A |
| `TERMINAL` metrics (`os/metrics.ts`) | abstraction | The design values the Terminal's scripts need, read from tokens in one place, as 005's `METRICS` (R13, R22) | `tokenValue` calls spread through the Terminal | N/A |
| Cursor mirror (`CommandLine.tsx`) | abstraction | The design's steady block cursor over a real input (R15) | `caret-shape: block`: not in Safari or Firefox, and it blinks. A `contenteditable` line: unreliable with screen readers and phone keyboards | N/A |
| On-screen keyboard detection (`useOnScreenKeyboard.ts`) | abstraction | FR-053's room for the keyboard, from `visualViewport` (R15) | The `interactive-widget` viewport meta: changes every app's page, and Safari ignores it | N/A |
| Terminal test helper (`packages/web/test/helpers/terminal.ts`) | abstraction (tests only) | Opens the Terminal in a shell, types a line, waits for its group and reads it, for every Terminal browser test | Repeating those steps in about twenty test files | N/A |
| Site check part `terminal` and `terminalFields` (`tools/site-check/src/parts/terminal.ts`, `expected.ts`) | abstraction | FR-040's check, reusing 004's `expectedFields` and 005's state driver (R20) | Folding it into `cv-app`: a different app, opened and read differently | N/A |

## Project Structure

### Documentation (this feature)

```text
specs/006-terminal/
├── spec.md              # Feature spec (approved)
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── design/
│   ├── README.md        # The glass, the proposed tokens (renamed per research R22 in a docs: commit)
│   ├── wireframes.md    # Every state of both shells, design values, keyboard, site text
│   ├── exports/         # 19 Penpot PNG exports
│   └── review.md        # Owner sign-off, commit c34fd51, 2026-10-27
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R24
├── data-model.md        # Phase 1: commands, blocks, file system, spec list, JSON, vim, session, shell additions
├── quickstart.md        # Phase 1: validation scenarios
├── contracts/
│   ├── terminal.md      # The interface: structure, pocket terminal, vim view, keyboard, focus, announcements, data-req
│   ├── commands.md      # Every command, reply and suggestion
│   ├── shell.md         # Changes to 005's os-core and shell
│   ├── site.md          # Build and output changes
│   └── cli.md           # Site check changes
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
vitest.config.ts                     # + specListPlugin()

packages/
├── content/                         # unchanged; read by the Terminal
├── tokens/
│   ├── penpot/tokens.json           # + the Terminal's tokens (research R22)
│   └── src/tokens.generated.{css,ts} # regenerated
├── os-core/
│   ├── src/types.ts                 # ViewId + 'terminal'; Metrics + four placement values
│   ├── src/geometry.ts              # placeWindow: the Terminal's rule
│   └── test/                        # geometry, reducer, invariants and apps tests extended
└── web/
    ├── vite.config.ts               # + specListPlugin()
    ├── scripts/
    │   └── spec-list.ts             # readSpecList, specListPlugin (research R10)
    ├── src/
    │   ├── virtual-modules.d.ts     # virtual:cv-spec-list's type
    │   ├── site-text.ts             # + os.views.terminal, terminal: { … }
    │   ├── fonts/fonts.json         # + "advance": 0.6 on JetBrains Mono
    │   ├── os/
    │   │   ├── Os.tsx               # isView, onClose, onHome for apps
    │   │   ├── View.tsx             # builds the os handle
    │   │   ├── focus.ts             # focusOnOpen
    │   │   ├── metrics.ts           # + placement values, TERMINAL
    │   │   └── shell-props.ts       # + onHome
    │   ├── shells/
    │   │   ├── desktop/MenuBar.tsx  # + menuItems
    │   │   ├── desktop/TitleBar.tsx # + WindowTitle
    │   │   └── mobile/FullScreenView.tsx # passes onHome to View
    │   └── apps/
    │       ├── index.ts             # APPS = [cvApp, terminalApp]; App and AppProps fields
    │       └── terminal/
    │           ├── app.tsx          # the declaration: both shells, focusOnOpen, WindowTitle, menuItems, onClose
    │           ├── TerminalIcon.tsx # the dock and home screen glyph (svg)
    │           ├── data.ts          # resume, siteData, the spec list, cv.json's text
    │           ├── session.ts       # the session store (research R5)
    │           ├── Terminal.tsx     # the app's content: greeting, runs, prompt line, status
    │           ├── Output.tsx       # renders blocks
    │           ├── CommandLine.tsx  # the input and its cursor mirror
    │           ├── VimView.tsx      # the vim view
    │           ├── Pocket.tsx       # the pocket terminal: case, screen, keys
    │           ├── useOnScreenKeyboard.ts
    │           ├── glyphs/          # prompt mark, clock (svg)
    │           ├── terminal.css     # the window's glass and the output
    │           ├── pocket.css       # the pocket terminal
    │           └── engine/
    │               ├── commands.ts  # COMMANDS and each command's run
    │               ├── parse.ts     # lines, stages, pipes
    │               ├── block.ts     # output block types and builders
    │               ├── cv.ts        # CV_FIELDS and the CV block builders
    │               ├── files.ts     # the file system, names, paths
    │               ├── json.ts      # lexer and printer
    │               ├── vim.ts       # the vim model and reducer
    │               ├── suggest.ts   # suggestions
    │               └── announce.ts  # rows and announcements
    └── test/
        ├── helpers/terminal.ts      # open, type, run, read a group
        ├── spec-list.test.ts
        └── terminal/
            ├── engine/              # parse, help, commands, cv-output, replies, suggest, files, json, vim, session, announce, boundaries
            └── open, menu, command-line, controls, output, history, state, files, open-command, keyboard,
                screen-reader, site-text, design, motion, modes, targets, accessibility, layout, pocket,
                vim, offline, requests, performance, data-req

tools/site-check/
├── src/
│   ├── shell-states.ts              # + the Terminal's states (contracts/cli.md)
│   ├── expected.ts                  # + terminalFields
│   ├── report.ts                    # + part terminal, problem types
│   ├── check.ts                     # runs the terminal part
│   └── parts/
│       ├── terminal.ts              # new
│       ├── keyboard.ts              # + FR-039's flow
│       ├── offline.ts               # + the Terminal offline
│       ├── other-sites.ts           # + the Terminal's commands
│       ├── layout.ts  modes.ts  fonts.ts  accessibility.ts   # + the Terminal's states
└── test/
    ├── terminal.test.ts             # new
    └── shell-states.test.ts  keyboard.test.ts  offline.test.ts  other-sites.test.ts  cli.test.ts   # extended

specs/006-terminal/design/README.md  # the token renames of research R22 (docs: commit, before code)
```

**Structure Decision**: the Terminal follows 005's convention for a new app: a folder in
`packages/web/src/apps/terminal/` with an `app.tsx` declaration, added to `src/apps/index.ts`, so
the dock, the home screen and the site check's states pick it up. Its behavior is in its own
`engine/`, kept free of React and the DOM by a test. Changes to 005's shell are the general app
fields in [contracts/shell.md](./contracts/shell.md), with `os-core` changed only for the view id
and the Terminal's placement, tests first. Site text stays in `site-text.ts`, and design values
for scripts go through `metrics.ts`, as 005 set.

## Complexity Tracking

None. Every Constitution Check row is Pass, and no exception is needed. The hand-written token
export is allowed by the constitution's interim provision on local mockups, not by an exception
here. The token renames of R22 keep the design's values and are recorded in the design README
before code, as 005 R7 did.
