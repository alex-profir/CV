# Quickstart: Validating the Terminal

How to prove the Terminal works, end to end. Scenarios 1 to 6 are automated and run on every pull
request. Scenarios 7 to 9 are by hand, and may wait for the final testing phase under the
constitution's interim provision on deferred manual checks (research R24).

## Prerequisites

- Node.js 26 (`.nvmrc`), `npm ci`.
- The branch has 005 merged in (research R1).
- Chromium for Playwright, as 004 and 005 use it.
- For the bash parity test (2026-10-29, research R38): bash 5 and the GNU tools on `PATH`. Linux
  has them. On macOS: `brew install bash coreutils grep gnu-sed gawk findutils diffutils`, with
  their `gnubin` folders first on `PATH`.

## 1. Fast checks

```sh
npm run typecheck
npm run traceability     # every 006-terminal-FR-### has a test (FR-037)
npm run content-check    # no CV fact typed into the Terminal (FR-010)
npm run token-check      # no literal design value (FR-031)
npm test                 # engine, core and browser tests on the real build
```

Expected: each exits 0. `npm run traceability` lists 75 requirements for `006-terminal`, all
covered.

## 2. The site check

```sh
npm run site-check
```

Expected: exit 0. The summary lists the `terminal` part with both shells, and `accessibility`,
`fonts`, `layout`, `keyboard`, `offline`, `other-sites` and `modes` with the Terminal's states
([contracts/cli.md](./contracts/cli.md)).

## 3. Explore the CV (US1, desktop)

```sh
npm run build && npm run serve
```

Open the printed address at 1440 × 900.

1. Only the CV window is open. Click **Terminal** in the dock. Expected: a glass window opens at
   640, 176, in front and focused. Focus is in the command line, and the title bar reads
   `Terminal — ~`.
2. Type `help`, Enter. Expected: every command of [contracts/commands.md](./contracts/commands.md)
   with its description, each name a control. The command sits at the top of the view.
3. Click `work` in that list. Expected: `work` runs as if typed, every role shows with `/cv`'s
   fields and dates, and focus is back in the command line.
4. Type `wrok`. Expected: `bash: wrok: command not found`, then the reply with a `work` chip.
5. Type `cv`. Expected: the vim view, every top-level section folded, `[RO]` and
   `cat cv.json | jq | vim -` on the status line. `za` on `"work"` opens it. `/REST` Enter
   highlights the matches and counts them. `i` says the file is read only. `:q` brings the output
   back, with `cv` after its prompt.
6. Up twice gives the earlier command. `clear` empties the screen. `exit` closes the window and
   focus lands on the Terminal's dock item.

## 4. The site and the file system (US2, US3)

1. `site`: what the site is, with the repository link. `specs`: every folder of `specs/`, with
   its number, name, status and requirement count matching `npm run traceability`.
2. `ls`, then click `work/`, then a file. Each runs `ls ~/work` and `cat ~/work/<name>` as
   typed, and the file shows what `work` shows for that entry. `cd work`: the prompt and the title
   bar show `~/work`. `cd ..` goes back. `cat nowhere`, `cd about` and `cat work` give FR-048's
   replies. `rm about` gives `Permission denied` (scenario 10 below).
3. Add a spec folder with a `spec.md`, or a work entry to `packages/content/resume.json`, and build
   again. Expected: `specs` or `ls ~/work` shows it, with no change to the Terminal's code.

## 5. The pocket terminal (US4)

With the browser's device toolbar at 375 × 812, with touch:

1. Tap **Terminal** on the home screen. Expected: the pocket terminal below the header, the
   starter chips and a prompt on its screen and 8 keys below.
2. Tap `help`, then `work` in the output, then the `projects` key. Expected: each runs without the
   keyboard opening.
3. Tap `cv`. Expected: the vim view in the screen, and the keys become `j k za / n gg G :q`.
   `:q` brings the command keys back.
4. Go Home, then open the Terminal again. Expected: the same output and scroll position.
5. Repeat at 320 × 568 and at 568 × 320. Expected: no horizontal scroll, and every key at least
   44 px.

## 6. Offline (US7)

Visit `/` once online, then turn the network off in the browser's tools and reload. Open the
Terminal at 375 and 1440 px and run every command `help` lists. Expected: the same output as
online, in the site's fonts, with no offline message.

## 7. Screen readers (US5, SC-004) — by hand

With NVDA and Firefox, or VoiceOver and Safari, on the desktop, then VoiceOver on iOS or TalkBack
on Android:

1. Open the Terminal from the dock. Expected: "Terminal", then "Command, edit text".
2. Run `pwd`. Expected: `~`, read once. Run `work`. Expected: "work: N entries", and focus stays in
   the command line.
3. Move by heading. Expected: each command is a heading, and within `projects` each project is
   one level below.
4. Run `cv`. Expected: the file's name, read only, its line count and "Type :q to leave". Read the
   file in browse mode. Switch to focus mode, press `j` and `za`, then `:q`.
5. On the phone: the case is never read, and each key is a button named by its command.

## 8. Real phones — by hand

On iOS Safari and Android Chrome: tap the command line. Expected: the keyboard opens, the keys
hide, and the command line and newest output stay above the keyboard. Close the keyboard: the
keys come back (FR-053). A command key or chip never opens the keyboard (FR-015).

## 9. Look — by hand

Compare `/` in every state of the design's exports with `design/exports/`, in Chrome at
1440 × 900 and at 375 × 812. In Edge with forced colors on, check that every part of the Terminal
is visible (FR-033). With reduced transparency, the window is solid. The look matches the approved
design, and nothing traces another terminal's look (SC-010).

## 10. The shell (amendment 2026-10-29, FR-067 to FR-073)

Automated by `packages/web/test/terminal/shell/` and `shell.test.ts`, and by the site check's
`terminal` part. By hand, at 1440 × 900, with `npm run build && npm run serve`:

1. Open DevTools' Network panel, then load `/`. Expected: no `shell-*.js` request. Open the
   Terminal. Expected: one `shell-*.js` request, and the prompt shows at once (FR-070, SC-013).
2. `work | grep -i engineer`: only the matching lines. `ls | wc -l`: a number. `grep -ril rest
   ~/work`: paths of work files, one per line (FR-057, FR-068, US3 scenario 11).
3. `X=1; f() { echo $((X + 1)); }`, Enter, then `f`. Expected: `2`. `false`, then `echo $?`:
   `1` (FR-067).
4. `jq '.work[0].name' cv.json`: the first role's name. `cat about | jq`: jq's parse error
   (FR-056).
5. `rm about`, `mv work jobs`, `echo hi > cv.json`, `rm -rf ~`: each `Permission denied` per path,
   and `cat about`, `ls work`, `cat cv.json` are unchanged (FR-049).
6. `mkdir notes && echo hi > notes/a && mv notes/a notes/b && cat notes/b`: `hi`. `ls`: `notes/`
   after the built names. Close the Terminal and open it again: `ls` has no `notes` (FR-021,
   FR-073).
7. `while true; do :; done`: while it runs, drag the CV window; it moves. Within 5 s: the
   "stopped" text and a new prompt. Again, then Ctrl+C at once: `^C` and a new prompt (FR-069,
   FR-075).
8. `help`: the site's commands, then "Standard commands" with every name. `help grep` shows
   `grep --help` (FR-008, FR-068).
9. `sudo`, `curl x`, `python`: `command not found`, with only `help` offered for `sudo`
   (FR-016, FR-068).

## 11. The cursor and the keys (amendment 2026-10-29, FR-071 to FR-075) — partly by hand

1. The focused command line has no box. Its cursor is filled and blinks, and stops blinking 5 s
   after the last key. Tab to the dock: the cursor turns hollow. Click an empty part of the output:
   focus returns, the cursor is filled, nothing scrolls (FR-071, FR-072, FR-032).
2. Drag to select some output, then release: the selection stays and focus doesn't move (FR-071).
3. On macOS: type `cat cv.json | jq`. Cmd+Left, Option+Right twice, Cmd+Right move the cursor as
   US5 scenario 8 sets. Ctrl+A, Ctrl+E, Ctrl+W, Ctrl+U, Ctrl+K and Ctrl+L do readline's. Cmd+Z
   undoes a Ctrl+W (FR-074). On Windows or Linux: Home, End, Ctrl+Left, Ctrl+Right and
   Ctrl+Backspace do the same, and Ctrl+W still closes the tab (FR-026).
4. Cmd+A (Ctrl+A off macOS), then copy and paste into a text editor: the Terminal's text and the
   typed line, and nothing of the dock or the menu bar. Type a letter: the selection clears and the
   letter is typed (FR-075).
5. Ctrl+C on a typed line: the line with `^C`, then an empty prompt (FR-075).

The macOS keys, VoiceOver and NVDA with the new cursor, and Safari's and Firefox's readline keys
are by hand, and may wait for the final testing phase (research R24).
