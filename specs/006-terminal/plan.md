# Implementation Plan: The Terminal

**Branch**: `006-terminal`, amended on `006-terminal-shell` | **Date**: 2026-10-28, amended
2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-terminal/spec.md`, as amended 2026-10-29 (a
bash-like shell, and a terminal's cursor, focus and keys)

**Design**: [design/review.md](./design/review.md): the Penpot page **006 Terminal — Glass**,
exports of commit `c34fd51`, approved 2026-10-27, with its
[Penpot link](https://design.penpot.app/#/workspace?team-id=86d07029-2be7-815f-8008-d2a9447f2808&file-id=eaccfa4c-8a01-81ad-8008-d441a46da254&page-id=07f3159c-7750-805c-8008-dade1b6b707f).
The amendment's design was approved 2026-10-29 on the same page (review.md, "2026-10-29
amendment"), with the greeting removed and the standard commands' names in `help` running
`help <name>`.

## Summary

The Terminal is the shell's second app. On desktop it opens from the dock as a frosted-glass
window. On a phone it opens full screen as the pocket terminal, with big command keys. Visitors
read the CV by typing commands (`work`, `projects`, `skills`) or by clicking or tapping them,
browse it as files, read the whole CV as JSON in a read-only vim view (`cv` runs
`cat cv.json | jq | vim -`), and learn how the site was built (`site`, `specs`). That Terminal is
built and merged (`bba9650`).

The amendment, after the owner's review, makes it a real bash-like shell: bash's language, the
standard commands a bash user expects, `jq` filters, and files the visitor can make and change
beside the protected CV and spec files. The command line loses its box, its cursor becomes the
focus indicator, a click anywhere puts focus back, and it takes a terminal's keys.

The design review of the amendment also removed the greeting: the Terminal opens on its starter
command controls and a prompt (FR-005), and `help`'s standard commands run `help <name>` (FR-008,
FR-015). Tasks T121 to T126 already cover the greeting.

Technical approach (details in [research.md](./research.md)):

- **What stays** (R1 to R24): the app in 005's shell, the session store, output as data blocks
  with one renderer, the CV following `/cv`'s rules, the file tree and its names, the spec list
  read at build time, `cv.json`, the JSON lexer, the vim view, the pocket terminal, the tokens and
  the site check's states.
- **The shell is just-bash 3.6.0** (R25), Vercel Labs' bash interpreter in TypeScript, built for
  agents that need a shell without a machine. It gives FR-067's language and FR-068's commands, a
  pluggable file system, custom commands, execution limits, and no network or other language. Its
  gaps found while researching and building (G1 to G20) are each handled, and six are reported
  upstream.
- **In a worker, loaded on first open** (R26, R34): a module worker, `assets/shell-<hash>.js`
  (295 KB Brotli as built), so a runaway line never freezes the page and `/` and `/cv` load none of it.
  Ctrl+C and the watchdog stop a line by restarting the worker from the last line's snapshot. The
  service worker keeps the version an open page came from, so the shell still loads after an
  update (R35).
- **State carried by an adapter** (R27): just-bash resets variables, functions and the working
  folder after each run, so the adapter wraps each line in a prelude and an epilogue and carries
  them, with function bodies from just-bash's own parser.
- **The Terminal's file system** (R28): the CV and spec files are protected (`Permission denied`,
  owned by `root`), the visitor writes anywhere else up to 1 MB, and everything is gone when the
  Terminal closes.
- **The site's commands are shell commands** (R29, R30): each prints its block as text, so pipes
  and `grep` work, and records the block. When its output reaches the screen unchanged it is drawn
  rich, with headings, links and controls, as a terminal shows colors that a pipe doesn't get.
- **The cursor and the keys** (R36, R37): the line's text field keeps the system's own editing
  keys and undo; the Terminal adds macOS's readline keys, select-all of its own text, and Ctrl+C,
  taking no key a browser or screen reader reserves.
- **Proved against real bash** (R38): a test runs at least 30 command lines in the Terminal's
  shell and in bash with GNU tools on the same files, and compares them.

## Technical Context

**Language/Version**: TypeScript with erasable syntax and TSX, run by Node.js 26, as 001 to 005.
CSS compiled by Lightning CSS. Browser code bundled by Vite (Rolldown): 005's one `os` script, and
from the amendment one module worker script.

**Primary Dependencies**: **new**: `just-bash` 3.6.0, exact, a dependency of `@cv/web` (R25).
Its browser build bundles `diff`, `sprintf-js` and `turndown` (R40). Used as before: `react` and
`react-dom` 19.3.1, `vite` 8.3.5, `lightningcss` 1.33.0, `playwright` 1.64.1, `axe-core` 4.14.0,
`lighthouse` 13.5.0. Reused: `@cv/content` (002), `@cv/tokens` (003), 004's formatting modules,
`Arrow`, test helpers and site check, 005's `@cv/os-core`, shells, `metrics.ts`, `focus.ts`,
state driver and shell test helper, and 001's spec reader (`tools/traceability/src/specs.ts`).

**Storage**: none on a server. The session, the shell's state and the visitor's files live in
memory for the visit only (R5, R26, FR-022). Offline, 004's cache `cv-<version>` holds both
scripts, and the service worker keeps an older version's cache while a page from it is open
(R35).

**Testing**:

- Vitest unit tests in Node: the engine (`packages/web/test/terminal/engine/`) and, new, the shell
  (`packages/web/test/terminal/shell/`: adapter, file system, site commands, standard commands,
  limits, jq), which runs the same modules the worker runs. `@cv/os-core`'s placement as before.
- `bash-parity.test.ts` (Node): 30+ lines in the shell and in real bash with GNU tools (R38).
- Vitest browser tests in Chromium through Playwright on the real build
  (`packages/web/test/terminal/`), with 005's shell helper and the Terminal helper, now also
  covering loading, the cursor, click to focus, the line keys, select all and stopping.
- `npm run site-check` on the real build: the `terminal` part and the Terminal's states, with the
  amendment's lines and states (R41).
- `tsc --noEmit`, `npm run traceability`, `npm run content-check`, `npm run token-check`.
- By hand: screen readers, real phone keyboards, forced colors in Edge, the look against the
  exports, and the macOS keys in Safari and Firefox (quickstart 7 to 9 and 11). They may wait for
  the final testing phase under the interim provision on deferred manual checks (R24).

**Target Platform**: as 005: the current and previous major versions of Chrome, Edge, Firefox and
Safari, on desktop and phone, all with module workers. Build and checks on Node.js 26, macOS and
Linux (GitHub Actions `ubuntu-latest`). The bash parity test needs bash 5 and GNU tools (R38).

**Project Type**: a static web site. One app in the existing shell page, with a worker of its own,
small general additions to the shell, one site check part.

**Shells**: Both, as the spec's Shell Scope sets. Desktop: a window opened from the dock, with its
own menu. Mobile: the pocket terminal, full screen from the home screen. The shell worker is the
same in both.

**Offline Approach**: the Terminal's interface, its data and its styles are in the `os` script and
style sheet, and the shell is `assets/shell-<hash>.js`. Both are built files, so 005's service
worker precaches them after one visit to `/` or `/cv` (FR-036, FR-070). No command makes a
request. A version published while a page is open doesn't strand that page's shell file (R35).

**Performance Goals**:

- A command's output within 100 ms of Enter at 1440 px, and within 300 ms with 4× CPU throttling,
  `cv` included (SC-002). Lines measured in just-bash take 2 to 30 ms after a warm-up line the
  worker runs before it says ready (R34). **Verify** in `performance.test.ts`, with the worker's
  message round trip included.
- The shell ready within 1 s at desktop speed and 3 s with Lighthouse's mobile CPU and network
  slowdown (SC-013). Measured on a build like the site's: 241 ms and 2.08 s (gzip). **Verify** in
  `loading.test.ts` on the real build.
- Lighthouse 90+ in every category for `/` on both profiles (SC-005). The `os` script stays
  within 5% of its gzipped size before the amendment, as T127 measures it (T104 measured 107 KB)
  (SC-013), as the commands move into the worker.

**Constraints**:

- Static files only. The `os` script is one file with no import; the shell is one worker file
  with no import, loaded only when the Terminal opens (FR-070, R34).
- No request to any other site, and nothing typed leaves the browser or is stored (FR-022). The
  worker has its network functions removed before just-bash loads (R39).
- No CV fact or design value written in code, with no exception added to the content or token
  check (FR-010, FR-031).
- The Terminal takes no key a browser, screen reader or the shell uses (FR-026, FR-060, FR-074).
- Nothing in front of the CV: the Terminal never opens by itself, and the CV stays first (FR-001,
  FR-002).
- A line stops at 5 s, 10,000 commands or 1 MB of output, and the page answers throughout
  (FR-069).

**Scale/Scope**: 75 requirements (9 added, 16 amended, and 7 more whose tests change); 2 shells; 22 site commands and 3 aliases;
31 standard commands (FR-068's and `yes`) and the shell's builtins; a protected file system of about
30 files and the visitor's up to 1 MB; a vim view of about 290 lines; 21 desktop and 13 mobile check
states; about 60 tokens plus the amendment's (R42); 1 site check part and 7 parts extended; 1 new
dependency.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The initial check for the amendment passed before research, and the re-check after design passed
too. The table shows the post-design state.

| # | Principle | Check | Status | Evidence |
|---|-----------|-------|--------|----------|
| I | Spec First | spec.md `Status: Approved`; this plan holds the "how", the spec holds none | Pass | spec.md line 7 reads `**Status**: Approved`, and line 11 records the owner's approval of the amendment on 2026-10-29. The spec leaves the shell's choice to the plan (its Clarifications and Assumptions, "A real shell"). just-bash, the worker, the adapter, TerminalFs, the service worker change and every file path appear only in this plan, research.md and the contracts |
| II | Design Gate | design/ has wireframe, PNGs, Penpot link, signed review.md; or an interim local mockup with PNGs and signed review.md; or spec says "No UI" | Pass | The original states are designed, exported and signed (`review.md`, commit `c34fd51`, 2026-10-27). The amendment's states are on the same Penpot page: `wireframes.md` gains every state of the spec's amended Design section in both shells (11 desktop, 11 phone at 375 px, 3 at 320 px), `exports/` holds them and the re-exports, and `review.md`'s "2026-10-29 amendment" section is signed by the owner on 2026-10-29, with the greeting removed. The spec's Design checklist item for the amendment is ticked. R42 lists what this plan takes from that design |
| III | Traceable Requirements | Every FR has a planned test and, if UI, a `data-req` target (see Requirement Traceability) | Pass | All 75 FRs have planned tests below, with UI targets as [contracts/terminal.md](./contracts/terminal.md#data-req-targets) sets. The amendment's new FRs (FR-067 to FR-075) each have a Node or browser test, and those with UI a target. `data-req` is written literally in TSX, so 001's check reads it |
| IV | One Source of Truth | CV data read only from `packages/content`; styles use tokens only, from Penpot (or a hand-written export, under the interim provision) or the motion token source | Pass | Every CV word, `cv.json`, the protected files' text and names come from `@cv/content` at build time (FR-010, FR-055), through the same block builders in the worker and the page. The repository link comes from `siteData`. New site text (replies, standard group, loading, stopped) is in `site-text.ts`. The cursor's colors, the selection color and the blink's timing are tokens from the design (R42), the blink's from the motion token source. The limits (5 s, 10,000, 1 MB) are the spec's numbers, set once in `shell/adapter.ts`, not design values |
| V | Shared Core, Per-Shell Scope | Apps declare shells; shared logic in `os-core`; matches spec Shell Scope | Pass | `apps/terminal/app.tsx` still declares both shells and `needsNetwork: false`. The shell worker and its client are the Terminal's own, in its app folder (R26), used by both shells. `os-core` doesn't change for the amendment (contracts/shell.md). Matches the Shell Scope |
| VI | Offline by Default | Offline Approach delivers everything the spec lists as offline | Pass | Both scripts are built files the service worker precaches (FR-036, FR-070), no command uses the network, and R35 keeps the shell loadable after an update. Proven by the `offline` part in both shells and `offline.test.ts`'s update case (FR-041) |
| VII | Recruiter First | No added steps before the CV; `/cv` stays server-rendered | Pass | The Terminal is after the CV and never opens by itself (FR-001, FR-002). The shell isn't loaded on `/` or `/cv` (FR-070, SC-013), so first load is unchanged. `/cv` is untouched |
| VIII | Accessible and Fast | WCAG 2.2 AA, desktop keyboard operation, reduced motion, Lighthouse 90+ planned and verifiable | Pass | axe in every FR-035 state and the amendment's states of both shells (R41). The focused line's indicator is its filled cursor, at 3:1, and the keyboard check confirms filled and hollow at each step (FR-072, SC-015). The blink stops within 5 s and never runs under reduced motion (FR-032). No key is taken from browsers or screen readers, checked per platform (R37). A runaway line never freezes the page (R26). Lighthouse 90+ on `/` stays a merge check; `/` loads none of the shell. Screen readers are checked by hand (quickstart 7, 11) |
| IX | Original Design | No Apple icons, fonts, wallpapers or other Apple assets | Pass | Unchanged: the icon, prompt mark, clock and cursor are the design's own SVG and CSS, the fonts the site's. The hollow cursor and the lilac selection are drawn in the site's tokens, and the owner's review of the amendment records that nothing is taken from another terminal's look (review.md, SC-010) |
| X | Simple and Vetted | Every new dependency, skill and abstraction listed below with a reason | Pass | One new dependency, just-bash, with its reason and the rejected options (R25), vendor-maintained by Vercel Labs and pinned. The new abstractions are listed below with the simpler option each rejected. Two removed: the Terminal's own parser (R7) and `jq` (R11) |
| XI | Features and Amendments in Their Own PRs | A new feature ships in one PR; an amendment in one or more PRs of its own, each carrying its part of the spec amendment with its tests and design; each PR links spec.md and tasks.md | Pass | The Terminal shipped as a new feature in one pull request (#24). The 2026-10-29 amendment is recorded in spec.md as Constitution 1.4.0 asks (a dated clarification session, the owner's approval, each changed requirement marked Amended, FR-067 to FR-075 added), and ships in one pull request of its own from `006-terminal-shell`, holding the spec amendment, this plan's changes, the design update, the shell, the interface changes and the check changes, linking spec.md and tasks.md and naming the amendment by its date. It merges once CI passes and the owner's local run has signed off its head commit (Merge requirements). Upstream just-bash fixes are pull requests to that repository, not to this one |

## Requirement Traceability

Constitution III. Paths are relative to `packages/web/test/terminal/engine/` (marked **engine**,
Node), `packages/web/test/terminal/shell/` (marked **shell**, Node, new),
`packages/web/test/terminal/` (marked **term**, the real build in Chromium),
`packages/os-core/test/` (marked **core**), `packages/web/test/` (marked **web**) and
`tools/site-check/test/` (marked **check**). Each test or group title carries the
`006-terminal-FR-###` IDs it covers. "Both shells" means at 1440 × 900 and at 375 × 812 with touch.
UI targets follow [contracts/terminal.md](./contracts/terminal.md#data-req-targets). Rows marked
*(amended)* (the spec amends the requirement), *(new)* or *(tests change)* (the requirement is as
it was, but its tests change) change with the 2026-10-29 amendment; the tests they replace are
rewritten, not kept.

| Requirement | Test(s) | UI target (`data-req`) |
|-------------|---------|------------------------|
| 006-terminal-FR-001 | core `apps.test.ts`: `appsFor(APPS, shell)` is `[cv, terminal]` for both shells. term `open.test.ts`: the dock and the home screen show CV, then Terminal; the Terminal declares both shells and no network need | dock item, home icon |
| 006-terminal-FR-002 | term `open.test.ts`: on first load at 1440 only the CV window is open, at 375 the home screen with nothing open; after 5 s nothing else has opened | Non-UI |
| 006-terminal-FR-003 | term `open.test.ts`: the window moves, resizes, minimizes, maximizes, restores and closes as 005's CV window does, through 005's helpers; at 375 it opens full screen with the header and Home. term `menu.test.ts`: the menu is titled `Terminal` and holds `Clear output` first, then 005's window commands; `Clear output` clears | Terminal menu's `Clear output` |
| 006-terminal-FR-004 | term `open.test.ts`: from the dock, the Window menu, `Alt+Shift+N`, a dock restore and the home screen, `document.activeElement` is `input.command-line`; its accessibility tree ancestor is the window or view named `Terminal…`, and its name is `Command`. web `focus.test.ts`: a `focusOnOpen` selector that matches nothing falls back to the title | `input.command-line` |
| 006-terminal-FR-005 *(amended)* | term `output.test.ts`: before the first prompt the Terminal shows only the 5 starter chips, in order, that run `help`, `about`, `work`, `projects` and `cv`, in both shells; no greeting text (no status line, no name, no intro), with the real CV and with the `no-name` fixture alike; `clear` removes the chips with the runs; while the shell loads, its loading line sits under them (FR-070) | `div.starter` |
| 006-terminal-FR-006 | term `command-line.test.ts`: typing `Help ` and Enter adds a group whose `h2` reads `Help ` exactly, then `help`'s output, then an empty prompt | `input.command-line`, `section.run` |
| 006-terminal-FR-007 *(tests change)* | shell `adapter.test.ts`: ` HELP `, `work\t`, `Work  ` and `help   work` run the site command; `GREP` is "command not found", as in bash; an empty or blank line runs nothing. term `command-line.test.ts`: Enter on an empty line adds a prompt and no message, and nothing to `history` | `input.command-line` |
| 006-terminal-FR-008 *(amended)* | engine `help.test.ts`: `COMMANDS` names exactly FR-008's commands, with `whoami`, `experience` and `?` as aliases; `help` lists them, then a standard group. shell `standard.test.ts`: the names just-bash has registered, plus the builtins, equal `help`'s standard group; every name runs `--help`; a word in no list is "command not found"; `help grep` shows `grep --help`; `whoami` runs `about` | `help` output, `help`'s standard group |
| 006-terminal-FR-009 | engine `cv-output.test.ts`: on the `every-field`, `nothing-optional`, `partial-dates`, `non-ascii` and `three-projects` fixtures, each CV command shows the fields of `CV_FIELDS` in order, dates as 004's formatter writes and dates them, the location as 004 writes it, and links with 004's names; `CV_FIELDS` matches 004's `expectedFields`. check `terminal.test.ts` on the real build | `div.run-output` |
| 006-terminal-FR-010 | engine `cv-output.test.ts`: changing one fact in a fixture CV changes the output and the protected file, with no other edit. web `self-check.test.ts`: `npm run content-check` passes with no exception added, over `shell/` too. check `terminal.test.ts`: the owner's email written into the Terminal's site text fails the content check, naming the file and line (US8 scenario 3) | `div.run-output` |
| 006-terminal-FR-011 | engine `cv-output.test.ts`: on `empty-sections`, each empty command shows `The CV lists no {section}.` with no heading or list, and `help` still lists it | `div.run-output` |
| 006-terminal-FR-012 *(amended)* | shell `fs.test.ts`: the file system holds every section of the fixture CV, and `ls`, `cd`, `cat`, `find`, `grep -r` and `tree` reach all of it; every section is also shown by its named command | Non-UI |
| 006-terminal-FR-013 | web `spec-list.test.ts`: on a fixture repository (an approved spec, a draft, one with a removed requirement, a folder without `spec.md`) `readSpecList` gives numbered order, statuses and active counts equal to `runCheck`'s; on the real repository it equals `npm run traceability`'s. engine `commands.test.ts`: `specs` rows show number, name, status and count, each linking to `{repository}/blob/main/specs/{folder}/spec.md`. check `terminal.test.ts`: a spec added in a temporary copy shows after the build | `specs` output |
| 006-terminal-FR-014 | term `open-command.test.ts`: `open cv` with the CV closed opens it focused in front; with it behind, brings it to the front; `open about` opens About; at 375 `open cv` opens the CV full screen; `open settings` lists `cv` and `about` as controls; `true && open cv` opens it too (an effect after the line) | Non-UI |
| 006-terminal-FR-015 *(amended)* | term `controls.test.ts`: every starter chip, every control in `help`, the unknown reply, the path replies, `ls` and the pocket keys runs its line on click, Enter and Space, as typed (in the output and in `history`), and focus returns to the command line; a name in `help`'s standard group runs `help <name>`; on touch the command line has `inputmode="none"` when focused by a control, and a tap on it removes it | command controls |
| 006-terminal-FR-016 *(amended)* | engine `suggest.test.ts`: `wrok` → `work`, `hlep` → `help`, `proj` → `projects`, `experiance` → `experience`, `WROK` (capitals free), `sudo` → none, over FR-008's names only; ordering by distance then `help` order; at most 3; an alias and its command count once. engine `output-map.test.ts`: the shell's `bash: wrok: command not found` is shown as `wrok: command not found.`, the typed word first, then `Run help to see them all, or try:` with `help` and the chips (design) | suggestion chips |
| 006-terminal-FR-017 *(amended)* | engine `replies.test.ts`: `work 2020`, `open` alone and `help nosuch` get the usage reply on stderr with status 2; `help work` shows `work`'s own help. shell `standard.test.ts`: `ls --badopt`, `grep` alone and `head -n x` give GNU's errors and statuses. term `command-line.test.ts`: `maxlength` equals the token, typing and pasting 600 characters keeps 500, and a 500-character line wraps inside the window | `input.command-line` |
| 006-terminal-FR-018 *(amended)* | term `command-line.test.ts`: `<b>hi</b>`, `<img src=x onerror=alert(1)>` and a URL echo as text, with no `b`, `img` or `a` created; `echo '<b>x</b>'` and `printf '\e]8;;https://x\e\\x'` print as text, with no element or link made; a pasted `help\nwork` becomes `help work` and nothing runs until Enter. engine `output-map.test.ts`: text that equals a site command's output, printed by `echo` with no recording, stays text | `input.command-line`, `div.run-output` |
| 006-terminal-FR-019 | term `output.test.ts`: output stays until `clear`, `Clear output` or closing; the wheel scrolls the output, never the document; after `help` the command's heading is at the top of the view; after `pwd` the new prompt is in view; scrolled up, a control moves the view to the new command | `div.terminal` |
| 006-terminal-FR-020 | engine `session.test.ts`: Up and Down step newest first, Down past the newest restores the draft, Up with no history changes nothing. term `history.test.ts`: the same in the browser; `history` lists the commands oldest first, `history 2` the last two, `history -c` empties it | `input.command-line` |
| 006-terminal-FR-021 *(amended)* | engine `session.test.ts`: `reset` empties output, history, draft, the shell state and the visitor's files. term `state.test.ts`: minimize and restore, mobile Home and reopen, and a 1440 → 375 → 1440 resize keep the output, history, working folder, draft, scroll position, a variable, a function, a visitor's file and an open vim view's cursor, folds and search; close and reopen starts afresh, with `echo $X`, `f` and `ls notes` showing nothing of before | Non-UI |
| 006-terminal-FR-022 *(tests change)* | term `requests.test.ts`: opening the Terminal and running every command `help` lists, and the `terminal` part's lines, requests only `127.0.0.1`; `localStorage`, `sessionStorage`, IndexedDB and cookies are empty afterwards; a new page shows nothing typed before. shell `adapter.test.ts`: in the worker's entry, `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` and `importScripts` throw; `curl` is "command not found" | Non-UI |
| 006-terminal-FR-023 | term `layout.test.ts`: with the `long-words` fixture, in a 400 px wide window and at 320 px, the output has no horizontal scroll, `seq -s ' ' 400` included; a mouse drag selects output text and copies it, and focus doesn't move to the command line. check `layout` | `div.terminal` |
| 006-terminal-FR-024 | term `pocket.test.ts`: at 375 the Terminal is a `.pocket` with its case, screen and keys; the command line, output and controls tests run in both shells (`describe.each`) | `div.pocket` |
| 006-terminal-FR-025 | term `pocket.test.ts`: by taps alone, starting from the starter chips and the keys, every CV section, `site`, `specs` and every file is reached (a search over controls), each CV section within 2 taps (SC-001); in `pocket-keyboard` the command line and the last output are inside the visual viewport | `div.pocket` |
| 006-terminal-FR-026 | term `keyboard.test.ts`: Tab from the command line moves focus on and leaves its value unchanged; Shift+Tab comes back; `Alt+Shift+D` and `Alt+Shift+M` from the command line reach the dock and the menu bar. term `line-keys.test.ts`: on each platform, every key FR-026's table reserves isn't `defaultPrevented` (research R37). check `keyboard.test.ts` | `input.command-line` |
| 006-terminal-FR-027 | term `screen-reader.test.ts`: the command line's accessible name is `Command`; the prompt is `aria-hidden`; each run's heading name is the command as typed, with no prompt | `input.command-line`, `span.prompt` |
| 006-terminal-FR-028 *(tests change)* | engine `announce.test.ts`: rows at the desktop column count, `pwd` → its text, `work` on a 4-entry fixture → `work: 4 entries`, `help` → `help: {n} commands`, counting the standard commands too (design), `ls` → `ls: 11 entries`, `grep -r a ~` printing 12 lines → `grep: 12 lines`; Ctrl+C → `Cancelled`; the shell loading → `Loading the shell`. term `screen-reader.test.ts`: the status region holds that text once after the result, focus stays in the command line, and scrolling earlier output doesn't change it | `.terminal-status` |
| 006-terminal-FR-029 | term `screen-reader.test.ts`: one `h1` `Terminal`; an `h2` per run; in `projects` and `work` an `h3` per entry, with no section heading between; no level skipped (004's `ax.ts`); lists are `ul`, links `a`, controls `button`s named by their line; the reading order follows the boxes' order on screen; `work \| grep x` shows text with no heading | `h1`, `section.run` |
| 006-terminal-FR-030 *(amended)* | term `site-text.test.ts`: every value under `siteText.terminal` is English and holds no key fact of the real CV (004's check), the amendment's replies and lines included; every text node of the rendered Terminal is CV text, spec list text, site text or text the shell printed | `div.starter` |
| 006-terminal-FR-031 | term `design.test.ts`: the output and command line use the mono token's family; the window opens at 760 × 536 at 640, 176 at 1440 × 900; the glass's computed colors and blur, and the cursor's filled and hollow colors, come from the tokens; the icon and glyphs are the committed SVG components; no Apple or system UI font is named. web `self-check.test.ts`: `npm run token-check` passes with no skip. Manual: design/review.md (SC-010) | `div.terminal` |
| 006-terminal-FR-032 *(amended)* | term `motion.test.ts`: a command's whole output is in the frame after its result; with focus in the line and no reduced motion, the cursor has a running animation after a key press and none 5 s after the last one, staying filled, and a key press starts it again; with reduced motion it never has one, and sampled frames while opening, running commands and pressing pocket keys show no `transform` or `scale` change. check `modes` | `span.cursor-mirror`, `div.terminal` |
| 006-terminal-FR-033 | term `modes.test.ts`: with forced colors the window, chips, keys, fold lines and command line show, the filled cursor is `Highlight` with a 1 px `Highlight` bottom edge and its letter `HighlightText`, the hollow one a 2 px `Highlight` outline, a selection the system's `Highlight` and `HighlightText`, other focus outlines show, and no element relies on a background image or color alone; with reduced transparency the window is solid `color.shell-surface` | `div.terminal` |
| 006-terminal-FR-034 | term `targets.test.ts`: every control in every FR-035 state and the amendment's states of both shells is at least 24 × 24 px, pocket keys 44 × 44, fold lines 24 × 24 | command controls, `button.vim-fold` |
| 006-terminal-FR-035 | term `accessibility.test.ts`: axe (WCAG 2.2 A and AA tags) finds nothing in each FR-035 state and the amendment's states of both shells; 200% zoom, text-only 200%, 400% on 1280 px and text spacing keep every part visible, with no clipping or overlap. check `accessibility` and `layout` | `div.terminal` |
| 006-terminal-FR-036 | term `offline.test.ts`: after one visit to `/`, and separately to `/cv` only, `/` offline at 375 and 1440 px opens the Terminal in the site's fonts, the shell starts, every command `help` lists gives the online output, and no offline message shows | Non-UI |
| 006-terminal-FR-037 | term `data-req.test.tsx`: every target in contracts/terminal.md carries its IDs in the rendered Terminal. web `self-check.test.ts`: `npm run traceability` passes | Non-UI |
| 006-terminal-FR-038 | check `shell-states.test.ts`: the summary lists `/` under `accessibility` in every Terminal state at both widths, the amendment's included, and `other-sites` records the Terminal's commands and the `terminal` part's lines in both shells | Non-UI |
| 006-terminal-FR-039 *(amended)* | check `keyboard.test.ts`: the flow passes on the real build, with the cursor filled in the line and hollow after Tab, line start and end and by word with Linux's keys, a word deleted, select all holding only the Terminal's text, and Ctrl+C on a typed line; copies where the command line catches Tab, has an outline when focused, or keeps a filled cursor after Tab fail naming the step (US8 scenario 2, SC-015) | Non-UI |
| 006-terminal-FR-040 *(amended)* | check `terminal.test.ts`: passes on the real build, with the expected fields read from the CV document (a temporary CV with an extra entry still passes), and with the amendment's lines (a pipe into `grep`, `grep -r` over `~/work`, a `jq` filter, a file made, moved and removed, a write to a protected file, a line that never ends); copies where `work` drops the end date, a project has no file, the vim view drops a line, or `rm about` succeeds fail with lines naming the command, field and shell, or the folder and entry (US8 scenarios 1, 4) | Non-UI |
| 006-terminal-FR-041 | check `offline.test.ts`: a copy whose shell worker isn't precached fails the Terminal's offline run at both widths, naming the shell and width | Non-UI |
| 006-terminal-FR-042 | check `cli.test.ts`: the local command and the CI step are the same; every Terminal problem line names shell, state or command, and width; two runs give the same result; the whole check stays within 005's time budget plus 4 minutes off CI | Non-UI |
| 006-terminal-FR-043 *(tests change)* | engine `files.test.ts`: the home folder's built entries are `cv.json`, `about`, `contact`, `work/`, `projects/`, `skills`, `education/`, `languages`, `interests`, `readme`, `specs/` in that order; empty sections are left out (`empty-sections`); entries keep the CV order and specs numbered order. shell `fs.test.ts`: `readdir` gives that order, then the visitor's in name order. term `files.test.ts`: `ls`'s names on screen keep that order, folders end in `/`, with color removed; `touch zz aa` lists `aa` and `zz` after `specs/` | `ls` output |
| 006-terminal-FR-044 | engine `files.test.ts`: `fileName` lowercases, strips accents (`non-ascii` fixture) and hyphenates; two roles at one company get start years, then numbers; the same CV gives the same names on every build | Non-UI |
| 006-terminal-FR-045 *(amended)* | shell `fs.test.ts`: home is `/home/guest`, `ls /` lists `bin dev home tmp usr`; relative paths, `.`, `..`, `~/`, `/`, globs (`~/work/*`, `?`, `[a-c]*`) and capitals in built names resolve as FR-045 sets, from every folder; `cd ..` from home reaches `/home`, `cd` comes back | Non-UI |
| 006-terminal-FR-046 *(tests change)* | engine `output-map.test.ts`: the prompt path is `~` for `/home/guest`, `~/work` below it, and `/tmp` outside it. term `files.test.ts`: the prompt and the window title show `~/work` after `cd work`, `/tmp` after `cd /tmp`; `pwd` prints `/home/guest/work` | `span.prompt`, the `WindowTitle` `span` |
| 006-terminal-FR-047 *(tests change)* | engine `files.test.ts`: on every fixture, each entry's file's block equals the named command's block for that entry; `about`, `contact`, `skills`, `languages`, `interests` and `readme` equal `about`, `contact`, `skills`, `languages`, `interests` and `site`; a spec's file equals its `specs` row. shell `site-commands.test.ts`: every protected file's text equals `blockText` of its block, and `cat` on it records that block. term `files.test.ts`: `cat ~/work/<file>` is drawn with the same headings and links as `work` | Non-UI |
| 006-terminal-FR-048 *(tests change)* | engine `output-map.test.ts`: `cat nothing-here` and `cat work/nowhere` show the command's message with the path as typed; `cd about` and `cat work` add `cat` and `ls` controls after bash's line; `vim work` and `ls about` give their replies | path reply controls |
| 006-terminal-FR-049 *(amended)* | shell `fs.test.ts`: `rm`, `rm -rf ~`, `mv`, `cp` onto, `touch` inside, `mkdir` inside, `>`, `>>`, `tee` and `sed -i` on every kind of protected path (a file, a folder, the root, `/home`, `/bin`) give `Permission denied` naming the path as typed, once per path, and the protected tree is equal before and after a scripted run of every command; `ls -l` shows protected entries `-r--r--r--` or `dr-xr-xr-x` and `root root`, the visitor's `guest guest`; the home folder itself takes writes | Non-UI |
| 006-terminal-FR-050 | term `files.test.ts`: each name in `ls`'s output runs `ls ~/{folder}` or `cat ~/{path}`; a search over controls from `ls` reads every file without typing; `ls \| cat` shows plain text with no controls | `ls` output |
| 006-terminal-FR-051 | term `pocket.test.ts`: 8 keys in the design's order, each a `button` named by its command, at least 44 × 44 px, each running its command | `div.pocket-keys` |
| 006-terminal-FR-052 | term `pocket.test.ts`: at 320 × 568, 375 × 812, 568 × 320, 812 × 375 and 1023 × 700, the screen and keys fit below the header with no horizontal scroll, and the output scrolls inside the screen; at 200% text zoom no key is cut off | `div.pocket` |
| 006-terminal-FR-053 | term `pocket.test.ts`: after a tap on the command line and the page made 300 px shorter, `data-keyboard` is set, the keys are hidden, and the command line and newest output are visible; restoring the height brings the keys back. Manual: quickstart 8 | `div.pocket` |
| 006-terminal-FR-054 | term `pocket.test.ts`: the case is `aria-hidden`, has no focusable element, and none of its text is in the accessibility tree; with reduced motion a pressed key changes no `transform`. Manual: design/review.md | `div.pocket-case` |
| 006-terminal-FR-055 | engine `json.test.ts`: `cv.json`'s text equals `JSON.stringify(resume, null, 2)` and `packages/content/resume.json`'s text without its final line break, and parses to the CV with every key in order. shell `jq.test.ts`: `cat cv.json`, and `cat cv.json \| jq` with a final line break removed, print that text. check `terminal.test.ts` (json) | Non-UI |
| 006-terminal-FR-056 *(amended)* | shell `jq.test.ts`: `jq '.work[0].name' cv.json`, `jq '.skills[].name' cv.json`, `jq 'keys' cv.json` and `cat cv.json \| jq .basics` print what jq 1.7 prints for them; `jq` and `jq .` pretty-print with 2-space indents and keys in order, `cat cv.json \| jq` equal to `cv.json`'s text; `cat about \| jq` and `jq '.[' cv.json` give a `jq: parse error` with a non-zero status, as just-bash words it (research R25, G12). term `vim.test.ts`: `cat cv.json \| jq`'s colored rows' text equals the plain printed text, and `jq . cv.json \| head` is plain | `json` output rows |
| 006-terminal-FR-057 *(amended)* | shell `adapter.test.ts`: `cat cv.json \| jq`, `work \| grep -i rest`, `ls \| wc -l` and `help \| head -3` pipe as bash does; `ls \| work` runs `work` and ignores its input; `ls \|`, `\| jq` and `ls \|\|\| x` give bash's syntax error, shown without its `bash: ` prefix (design), and run nothing | Non-UI |
| 006-terminal-FR-058 | shell `site-commands.test.ts`: `vim cv.json` and `cat cv.json \| vim -` return the vim effect with the file's name and text; `vim work`, `vim nowhere`, `vim -` with nothing piped and `vim` alone give their replies and no effect. term `vim.test.ts`: the view fills the window's content and the pocket screen, with line numbers, a status line holding mode, name, `[RO]`, type, line and column and position, and a message line | `section.vim` |
| 006-terminal-FR-059 | shell `site-commands.test.ts`: `cv`'s result equals running `cat cv.json \| jq \| vim -` from the home folder, from any working folder; `help` describes `cv` with that pipe. term `vim.test.ts`: the status line shows the pipe | `section.vim` |
| 006-terminal-FR-060 | engine `vim.test.ts`: every key of FR-060 does what data-model.md's table sets; `i`, `a`, `o`, `x`, `dd`, `p`, `:w`, `:wq`, `:w!` change nothing and set the read-only message; `:foo` names it; Escape cancels `/` and `:`. term `vim.test.ts`: `Ctrl+D`, `Ctrl+F` and `Ctrl+U` aren't `defaultPrevented` | `div.vim-text` |
| 006-terminal-FR-061 | engine `vim.test.ts`: on opening, each top-level object or array is one closed fold naming its key and line count, and everything else is open. term `vim.test.ts`: a fold line is a `button` with `aria-expanded`, toggled by click, Enter and Space, at least 24 × 24 px | `button.vim-fold` |
| 006-terminal-FR-062 | engine `vim.test.ts`: `/REST` finds every match, `n` and `N` move between them, a missing word gives `not found`. term `vim.test.ts`: matches are `mark`s, the current one has `aria-current` and an outline, and the message reads `match 1 of 3` | `mark` |
| 006-terminal-FR-063 | term `vim.test.ts`: with the `long-words` fixture, at 320 px and in a 400 px window, no horizontal scroll; a wrapped line's second row starts 2 characters past its first row's text; its number shows on the first row only | `div.vim-text` |
| 006-terminal-FR-064 | engine `vim.test.ts`: `:help` opens the split, the first `:q` closes it, the second quits. term `vim.test.ts`: `:q` and the `:q` chip restore the output with `cv` after its prompt and a new prompt, focus in the command line; the `:help` chip opens the split | `div.vim-help`, `:q` and `:help` chips |
| 006-terminal-FR-065 | term `vim.test.ts`: on opening, focus is on `.vim-text`, named and read only; the status region announces name, read only, line count and `:q`; a message change is announced once; fold lines expose `aria-expanded`; Tab moves to the chips, then out of the Terminal | `section.vim` |
| 006-terminal-FR-066 | term `pocket.test.ts`: with the vim view open the keys are `j`, `k`, `za`, `/`, `n`, `gg`, `G`, `:q`, named `Down` to `Quit`, at least 44 × 44, acting on the view; after `:q` the command keys are back; a tap on a fold line toggles it | `div.pocket-keys` |
| 006-terminal-FR-067 *(new)* | shell `adapter.test.ts`: one case per feature FR-067 names (`;`, `&&`, `\|\|`, quotes, escapes, `$VAR`, `${VAR}`, `${VAR:-d}`, `export`, `$?`, each glob, each redirect, `if`, `for`, `while`, `until`, functions), each in the shell; variables, exported variables, functions, options, `$?` and the working folder carry to the next line; `unset -f` removes a function; a site command works in a pipe, a redirect, a chain and a loop; runtime messages name the visitor's line number. shell `bash-parity.test.ts` (SC-014). term `shell.test.ts`: the same lines in the real build | Non-UI |
| 006-terminal-FR-068 *(new)* | shell `standard.test.ts`: every command FR-068 names, and `yes`, is registered and answers `--help`, and no other standard command is; `ls -la`, `cat -n`, `pwd -P` and `history 3` take their options; every left-out name of research R32 (`curl`, `wget`, `ssh`, `python`, `node`, `bash`, `sh`, `chmod`, `ln`) is "command not found". shell `bash-parity.test.ts`: GNU's output for the parity lines | `help`'s standard group |
| 006-terminal-FR-069 *(new)* | shell `limits.test.ts`: `while true; do :; done` stops at 10,000 commands, `i=0; while :; do i=$((i+1)); done` at 5 s (fake clock), `seq 1000000` at 1 MB, and `yes`, which ends at exactly 1 MB with status 0, counted as the output limit (research G13), each with `end: 'limit'` and its kind, and the state as before the line. engine `output-map.test.ts`: each limit shows its site text (`stopped: it ran for 5 seconds, …`), after the output printed before it. term `stop.test.ts`: during a 5 s loop, a click on the CV window brings it to the front and a key types in another app; a worker made to hang is terminated after 6 s, restarted from the snapshot (a variable and a file survive), and the "stopped" text shows | `p.run-stopped` |
| 006-terminal-FR-070 *(new)* | term `loading.test.ts`: `/` and `/cv` request no `shell-*.js`; opening the Terminal requests it once; with its response delayed, the starter chips, the prompt and the command line show at once with the loading line under the chips, two lines typed wait after their prompts and run in order once it answers, and the loading line goes; with it answered 503, the failure text and `try again` show, and `try again` after the server recovers runs the waiting lines; offline after one visit it loads from the cache. web `offline.test.ts`: a page from version A opens the Terminal after B has activated, online and offline, and the shell loads (research R35). web `build.test.ts`: the build fails when the worker imports a file or the `os` entry imports the worker | `p.shell-loading`, `p.shell-failed` |
| 006-terminal-FR-071 *(new)* | term `focus-click.test.ts`: with focus on the dock, a click on the output's empty space, on a text line and beside the starter chips focuses the command line, keeps `scrollTop` and the typed text; a click on a link, a chip, a fold line and inside the vim view doesn't; a drag that selects text keeps the selection and doesn't move focus; on touch, a tap focuses the line with no `inputmode="none"` | `div.terminal-screen` |
| 006-terminal-FR-072 *(new)* | term `cursor.test.ts`: the command line's computed `outline-style`, `border` widths, `box-shadow` and `background-color` are none or transparent, focused and not; the cursor has `data-focused` and the filled style with focus, the hollow style without; both colors are at least 3:1 against the screen's computed background; every other control's focus outline still shows. check `keyboard.test.ts` (SC-015) | `input.command-line`, `span.cursor-mirror` |
| 006-terminal-FR-073 *(new)* | shell `fs.test.ts`: `touch`, `mkdir`, `mv`, `cp`, `rm`, `>`, `>>` and `tee` work in home, in a visitor's folder and in `/tmp`; a write past 1,048,576 bytes gives `No space left on device` and leaves the earlier files; a write into a missing folder gives `No such file or directory`; `reset` leaves no visitor file. term `shell.test.ts`: US3 scenario 10 in both shells, and the files gone after closing and opening | Non-UI |
| 006-terminal-FR-074 *(new)* | term `line-keys.test.ts`: with the platform set to macOS, in `cat cv.json \| jq`, Cmd+Left puts the cursor at 0, each Option+Right at the next word end the field gives, and Cmd+Right at 16, the mirror's cursor always at the field's caret (US5 scenario 8); Ctrl+A, Ctrl+E, Ctrl+B, Ctrl+F, Ctrl+K, Ctrl+U, Ctrl+W and Ctrl+L do readline's, and Cmd+Z after Ctrl+W restores the word; Shift+Option+Left selects a word and the mirror shows it selected; with Linux and Windows, Home, End, Ctrl+Left, Ctrl+Right, Ctrl+Backspace and Shift+Home do the same, and Ctrl+W, Ctrl+L, Ctrl+U aren't `defaultPrevented` | `input.command-line`, `span.cursor-mirror` |
| 006-terminal-FR-075 *(new)* | term `select-all.test.ts`: Cmd+A (macOS) and Ctrl+A (others) in the command line or the output select a range inside `.terminal-screen` only, whose text holds the output and the typed line; the copied text has no cursor character and no control's `aria-label`; a letter then clears the selection and is typed. term `stop.test.ts`: Ctrl+C with nothing selected shows the line with `^C` and an empty prompt, not in `history`; during a running line it stops it as FR-069 does; with text selected it isn't `defaultPrevented` | `div.terminal-screen`, `input.command-line` |

Success criteria without an FR of their own:

- SC-001: term `pocket.test.ts` (2 taps per section, 1 per key command) and `controls.test.ts` on
  desktop.
- SC-002: term `performance.test.ts`: Enter to output under 100 ms at 1440 px, and under 300 ms
  with 4× CPU throttling over CDP, for every command `help` lists, `cv` included, through the
  worker.
- SC-003, SC-011: FR-040 and FR-047 above.
- SC-004: FR-035 above, and by hand, quickstart 7 and 11.
- SC-005: check `lighthouse` on `/` on both profiles, and 005's first-load tests unchanged.
- SC-006 to SC-008: FR-036, FR-022 and FR-032 above.
- SC-009: FR-037, FR-010 and FR-031's self-checks, and FR-042.
- SC-010: design/review.md, with the amendment's sign-off (research R42).
- SC-012: FR-052 above.
- SC-013 *(new)*: term `loading.test.ts`: no shell bytes on `/` and `/cv`; the `os` script's
  gzipped size within 5% of the budget recorded before the amendment (also enforced by
  `build-site.ts`); ready within 1 s, and within 3 s with Lighthouse's mobile CPU and network
  slowdown over CDP.
- SC-014 *(new)*: shell `bash-parity.test.ts` (research R38): at least 30 lines, every FR-067
  feature and FR-068 command, the same stdout, stderr and status as bash with GNU tools, except
  the differences FR-044, FR-045 and FR-049 set, written beside their lines, and bash's
  `bash: line N: ` prefix, which non-interactive bash adds and the Terminal's shell doesn't.
- SC-015 *(new)*: FR-039 and FR-072 above, in every keyboard check step.

## Dependencies, Skills & Abstractions

One new dependency, no agent skill. Abstractions from the first plan that the amendment keeps are
listed first, unchanged unless noted; then the amendment's.

| Item | Kind | Reason | Simpler alternative rejected because | Vendor-maintained |
|------|------|--------|--------------------------------------|-------------------|
| Terminal engine (`apps/terminal/engine/`) | abstraction | The blocks, the CV builders, the file tree, suggestions, the JSON lexer, the vim model and the output mapping as pure functions, tested in Node and shared by the page and the worker (R2) | Logic in components: testable only in a browser, and repeated per shell. A workspace package: a boundary with one consumer | N/A |
| `COMMANDS` table (`engine/commands.ts`) | abstraction | One list that `help`, the shell's site commands, suggestions and the site text read, so no site command is hidden or missing from `help` (R7, R29, FR-008) | A `switch` on the command word: `help`'s list would be a second copy | N/A |
| Output blocks and their renderer (`engine/block.ts`, `Output.tsx`) | abstraction | Commands return data, never markup. One renderer, the summary count, `blockText` and the site check's reading depend on it (R3) | Strings: no links or controls. React elements from commands: the engine would depend on React | N/A |
| Session store (`session.ts`) | abstraction | The visit's Terminal state outside the components that unmount, now with the shell's state and the visitor's files (R5, R26) | Component state: lost on mobile Home and a shell switch | N/A |
| File tree (`engine/files.ts`) | abstraction | The protected tree, its order and names, built from the CV and the spec list (R9) | Names typed by hand: against FR-044 | N/A |
| JSON lexer (`engine/json.ts`) | abstraction | Colors and fold lines with keys and numbers as written, now for jq's output and the vim view (R11, R31) | `JSON.parse`: reorders integer-like keys. A highlighter package: Constitution X | N/A |
| Vim model and view (`engine/vim.ts`, `VimView.tsx`) | abstraction | The read-only vim view, opened by the `vim` effect (R12) | CodeMirror or Monaco read-only: hundreds of KB, their own key maps and looks | N/A |
| Suggestion distance (`engine/suggest.ts`) | abstraction | FR-016's rule, in about 30 lines (R8) | A fuzzy-search package: its scoring isn't FR-016's | N/A |
| Spec list reader and Vite plugin (`scripts/spec-list.ts`) | abstraction (build) | `specs` read from the repository at build time with 001's reader (R10) | A committed generated file: drifts | N/A |
| App declaration fields and the `os` handle (`apps/index.ts`, `View.tsx`) | abstraction | General ways for any app to focus an input, title its window, add menu items, react to closing, open views and exit (R6) | `'terminal'` special cases in the shell's components | N/A |
| `TERMINAL` metrics (`os/metrics.ts`) | abstraction | The design values the Terminal's scripts need, read from tokens in one place (R13, R22) | `tokenValue` calls spread through the Terminal | N/A |
| Cursor mirror (`CommandLine.tsx`) | abstraction | The design's block cursor over a real input, now filled or hollow, blinking, and showing the selection (R15, R36) | `caret-shape: block`: not in Safari or Firefox. A `contenteditable` line: unreliable with screen readers and phone keyboards | N/A |
| On-screen keyboard detection (`useOnScreenKeyboard.ts`) | abstraction | FR-053's room for the keyboard, from `visualViewport` (R15) | The `interactive-widget` viewport meta: Safari ignores it | N/A |
| Terminal test helper (`packages/web/test/helpers/terminal.ts`) | abstraction (tests only) | Opens the Terminal, types a line, waits for its result and reads it, now also waiting for the shell to be ready | Repeating those steps in about thirty test files | N/A |
| Site check part `terminal` and `terminalFields` | abstraction | FR-040's check, with the amendment's lines (R20, R41) | Folding it into `cv-app`: a different app | N/A |
| `just-bash` 3.6.0 | dependency | FR-067's language and FR-068's commands, with a pluggable file system, custom commands, limits, and no network or other language, in the browser (R25) | The Terminal's own parser grown into bash, with `sed`, `awk` and `jq`: each larger than the Terminal. Real bash in WebAssembly: real programs and MBs. ShellJS: Node only | Yes: Vercel Labs |
| Shell worker and its client (`shell/worker.ts`, `shell-client.ts`, `shell/protocol.ts`) | abstraction | Runs the shell off the page's thread, so a runaway line never freezes it, and loads it only when the Terminal opens (R26, R34, FR-069, FR-070) | The shell on the main thread: freezes the page for up to 5 s, as measured. A dynamic `import()`: the same freeze | N/A |
| Network lock (`shell/no-network.ts`) | abstraction | Replaces `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` and `importScripts` before just-bash's module body runs (R39, FR-022) | Doing it in `worker.ts`'s body: ES imports are hoisted, so just-bash would already be evaluated | N/A |
| Shell adapter (`shell/adapter.ts`) | abstraction | Carries variables, functions, options, `$?` and the working folder between lines, which just-bash resets, and checks syntax first (R27) | One endless `exec`: loses per-line limits. just-bash's private state: not an interface | N/A |
| TerminalFs (`shell/fs.ts`) | abstraction | Protected files with bash's "Permission denied", the visitor's files with a 1 MB limit, names without regard to capitals, owners for `ls -l` (R28) | `MountableFs` read-only: answers "Read-only file system", and can't mix both kinds in one folder | N/A |
| Site commands and wrappers (`shell/site-commands.ts`) | abstraction | The FR-008 commands as shell commands that print text and record their blocks, except where the adapter marks them piped (`__CV_PIPED`); `cat`, `ls`, `rm` and `jq` wrapped for blocks, owners and protected `rm -r` (R29); `sed`, `tee`, `cp` and `mv` wrapped so a refused write gives GNU's wording, naming the path as typed (G5, G19, G20) | Telling commands whether output is a terminal, with no output match: decided at parse time, wrong for functions. Escape sequences: forgeable with `printf` | N/A |
| Output mapping (`engine/output-map.ts`) | abstraction | A run's result to the shown block: recordings, text, bash's messages with the site's replies, limits, announcements (R30) | Mapping inside the renderer: untestable in Node | N/A |
| `STANDARD_COMMANDS` and `SHELL_BUILTINS` (`shell/standard.ts`) | abstraction | The one list just-bash registers and `help` lists, so no command is missing from `help`, and each left-out name has a reason (R32) | All of just-bash's commands: the network, other languages and scripts | N/A |
| Redirect guard plugin (in `shell/adapter.ts`) | abstraction (temporary) | Refuses a redirect to a protected path before the line runs, until just-bash's G1 fix is released (R28) | Nothing: a refused redirect rejects the whole line and loses its output. Deleted once the fix ships | N/A |
| Kept caches in the service worker (`src/sw/service-worker.ts`) | abstraction | A page from an older version can still load its shell file (R35, FR-070) | Deleting old caches at once: strands the page. Mixing files into the new cache: against 004 FR-039 | N/A |
| Linux key sender (`pressLinux`, `asLinux` in `tools/site-check/src/parts/keyboard.ts`) | abstraction (check only) | Playwright gives a key the editing command of the machine it runs on, so on a Mac FR-074's Linux keys (Home, End, Ctrl+Left…) do nothing in a field; the sender gives them Linux's editing command through CDP there, and presses them plainly elsewhere, with the page reporting Linux (FR-039) | Skipping the steps on a Mac: the local full run is the merge gate, and would never check them | N/A |
| Worker license file (`scripts/shell-licenses.ts`) | abstraction (build only) | A Vite plugin of the worker build that writes `assets/shell-licenses-<hash>.txt` from each bundled package's `package.json` and `LICENSE`, and puts the comment naming it at the top of the worker file (R40); it reads the worker chunk's modules and the license list just-bash's browser build carries for what it inlined (`re2js`, `ieee754`) | A hand-kept list in `build-site.ts`: misses what just-bash inlines, and goes stale on an update | N/A |
| Bash parity test (`test/terminal/shell/bash-parity.test.ts`) | abstraction (tests only) | Compares the shell with real bash and GNU tools on the same files (R38, SC-014) | Committed expected outputs: a second edit for every CV change | N/A |

## Project Structure

### Documentation (this feature)

```text
specs/006-terminal/
├── spec.md              # Feature spec (approved; amendment approved 2026-10-29)
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── design/
│   ├── README.md        # The glass, the tokens; + the amendment's tokens (research R42)
│   ├── wireframes.md    # Every state of both shells; + the amendment's states
│   ├── exports/         # 19 Penpot PNG exports; + the amendment's
│   └── review.md        # Owner sign-off, commit c34fd51, 2026-10-27; + the amendment's sign-off
├── plan.md              # This file
├── research.md          # Phase 0: R1–R24, and the amendment's R25–R42
├── data-model.md        # Phase 1: + shell state, file system, run protocol, session additions, cursor
├── quickstart.md        # Phase 1: validation scenarios; + 10 (the shell) and 11 (cursor and keys)
├── contracts/
│   ├── terminal.md      # The interface; + cursor, click to focus, keys, new targets
│   ├── commands.md      # Every command, reply and suggestion; + the shell's line, standard commands
│   ├── shell-worker.md  # New: the worker's files, messages, limits and build
│   ├── shell.md         # Changes to 005's os-core and shell (none for the amendment)
│   ├── site.md          # Build and output; + the worker file, licenses, the service worker
│   └── cli.md           # Site check; + the amendment's lines, steps and states
└── tasks.md             # Phase 2 (/speckit-tasks; the amendment's tasks are added there)
```

### Source Code (repository root)

The tree as built, with the amendment's changes marked `+` (added), `~` (changed) and `-`
(removed).

```text
package-lock.json                    # ~ just-bash 3.6.0

packages/
├── content/                         # unchanged; read by the Terminal
├── tokens/
│   ├── penpot/tokens.json           # ~ the amendment's tokens (research R42)
│   ├── motion/…                     # ~ the cursor's blink (research R36)
│   └── src/tokens.generated.{css,ts} # regenerated
├── os-core/                         # unchanged by the amendment
└── web/
    ├── package.json                 # ~ "just-bash": "3.6.0"
    ├── vite.config.ts               # ~ the worker build: one file, node:zlib resolved to a stub
    ├── scripts/
    │   ├── build-site.ts            # ~ the os script and one worker file; os script budget
    │   ├── shell-licenses.ts        # + the worker's license file and its header comment (R40)
    │   └── spec-list.ts
    ├── src/
    │   ├── site-text.ts             # ~ terminal: replies, standard group, loading, stopped, footer
    │   ├── sw/service-worker.ts     # ~ kept caches (research R35)
    │   └── apps/terminal/
    │       ├── app.tsx              # ~ onClose also resets the shell
    │       ├── session.ts           # ~ shell status, waiting lines, state, files, cwd
    │       ├── shell-client.ts      # + starts the worker, queue, watchdog, Ctrl+C, restarts
    │       ├── Terminal.tsx         # ~ starter chips (no greeting), click to focus, select all, loading and stopped lines
    │       ├── Output.tsx           # ~ stdout and stderr text nodes
    │       ├── CommandLine.tsx      # ~ no box, filled and hollow cursor, blink, selection, keys
    │       ├── VimView.tsx  Pocket.tsx  useOnScreenKeyboard.ts  TerminalIcon.tsx  data.ts  glyphs/
    │       ├── terminal.css         # ~ the cursor, the line, the selection
    │       ├── pocket.css
    │       ├── engine/
    │       │   ├── commands.ts      # ~ COMMANDS and the site commands' runs; no runLine
    │       │   ├── parse.ts         # - (the shell parses)
    │       │   ├── output-map.ts    # + research R30
    │       │   ├── block.ts         # ~ text nodes' stream; blockText
    │       │   ├── cv.ts  files.ts  json.ts  vim.ts  suggest.ts  announce.ts
    │       └── shell/               # + runs in the worker (contracts/shell-worker.md)
    │           ├── worker.ts  no-network.ts (imported first)  protocol.ts  adapter.ts  fs.ts
    │           ├── site-commands.ts  standard.ts  no-zlib.ts
    └── test/
        ├── helpers/terminal.ts      # ~ waits for the shell
        ├── offline.test.ts          # ~ a page from an older version loads the shell
        ├── build.test.ts            # + the worker and os script checks (or in the existing build tests)
        └── terminal/
            ├── engine/              # ~ parse.test.ts removed; + output-map.test.ts, block.test.ts
            ├── shell/               # + adapter, fs, site-commands, standard, limits, jq, bash-parity;
            │                        #   context.ts (the shell's test helper)
            └── … existing browser tests, ~ files, commands, motion, keyboard, state, requests, performance;
                + loading, cursor, focus-click, line-keys, select-all, stop, shell

tools/site-check/
├── src/
│   ├── shell-states.ts              # ~ the amendment's states
│   └── parts/terminal.ts  keyboard.ts  modes.ts  other-sites.ts   # ~ the amendment's lines and steps
└── test/
    └── terminal.test.ts  keyboard.test.ts  shell-states.test.ts  # ~ extended
```

**Structure Decision**: the Terminal keeps 005's convention for an app: everything in
`packages/web/src/apps/terminal/`. The shell joins it as `shell/`, the code that runs in the
worker, kept free of React and the DOM by the boundaries test, as `engine/` is. `engine/` stays
the shared, pure layer both the page and the worker import. The shell code is in the app's folder,
not in `os-core`, because no other app uses it (Constitution V, R2), and a later Files app could
move it, as the spec's Assumptions say of the file system.

## Complexity Tracking

None. Every Constitution Check row is Pass, and no exception is needed. The design gate for the
amendment's UI tasks is a prerequisite recorded for `tasks.md`, not an exception. The hand-written
token export is allowed by the constitution's interim provision on local mockups. The redirect
guard plugin is temporary and listed above with its reason and its end. The four differences
from bash that just-bash's gaps cause (research G3, G5, G11, G12) are allowed by spec FR-068, not
exceptions here.
