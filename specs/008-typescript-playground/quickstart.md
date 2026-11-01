# Quickstart: Validating the TypeScript Playground

How to prove the Playground works end to end, once it is built. What each check asserts is in
[contracts/cli.md](./contracts/cli.md) and plan.md's Requirement Traceability; this guide is how to
run them and what to look for by hand.

## Prerequisites

- Node 26 (`nvm use`), from the repository root; `npm ci`.
- Playwright's browsers: `npx playwright install chromium firefox webkit` (Firefox and WebKit are
  for the owner's local run only, research R25).
- A clean branch: the build reads Git for 007's data.

## 1. The fast checks (what CI runs)

```sh
npm run typecheck
npm run test:fast          # options, share links, log book, formatting, source maps, keys, os-core
npm run traceability       # every 008 FR, and 005's FR-063/FR-065 and 006's FR-008/FR-014, covered
npm run token-check        # passes with no exception added for the Playground (FR-068)
npm run content-check      # the examples and site text hold no CV fact (FR-031)
npm run site-check         # builds, then every part, the new `playground` part included
```

Expected: every command exits 0. `site-check` prints the `playground` part's variants with no
problem lines, and `lighthouse` still scores 90+ on `/` and `/cv` in both profiles.

## 2. The full run (the owner's local sign-off)

```sh
npm run verify
```

Expected: every test passes, the browser tests in Chromium, and the sandbox, memory and key tests
in Firefox and WebKit too. Then `npm run signoff` posts `local-verify` on the head commit.

## 3. By hand, at a desktop width (1440 × 900)

Serve the built site: `npm run build && npm run serve`, then open `http://127.0.0.1:4173/` in a
fresh browser profile.

1. **First open** (story 1): the dock reads CV, Terminal, Playground. Open the Playground: the
   window shows the download with its progress, then the editor with Welcome, focused, and
   `TypeScript 5.9.3` in the status bar.
2. **Editing**: type `const n: number = "one";` — a wavy underline within a second, the message
   after the line, Errors ① lists `TS2322`. Hover a name; `Ctrl+Space`; F12, `Shift+F12`, F2,
   `Ctrl+.` on an error TypeScript can fix (`interface Job { title: string; years: number }`, then
   `const job: Job = {};`: Add missing properties), F1, `Shift+Alt+F` (`Cmd` and `Option` on a
   Mac). `Alt+Shift+M` from inside the editor reaches the menu bar and types nothing.
3. **Options**: turn off `strict`: strict-only errors go, the panes update.
4. **Running** (story 2): Examples → Timers and promises → Run: "Running · 1 timer left", then
   "Finished in 5.0 s". An endless loop: the site stays usable; after 5 s the popup inside the
   window; Keep waiting asks again 5 s later; Stop ends it.
5. **Examples** (story 3): each CV example's logs match the CV window.
6. **Sharing** (story 4): Share, open the link in another profile: same code and options, the note,
   nothing ran. Change one character of the link's payload: the broken-link message.
7. **Offline** (story 8): in a fresh profile, turn the network off in the developer tools, open the
   Playground: the offline state with the size; turn it on: the download starts by itself. Then
   offline again, reload: everything works, including running and sharing.
8. **Kept code**: reload; the code and options are as left. Reset… brings Welcome back; Undo brings
   the code back.

## 4. By hand, on a phone width (375 × 812)

The home screen's third icon opens "The Playground is best on a desktop"; Share link and Copy link
give a link that opens the Playground on a desktop. A shared link opened here shows "This link
holds TypeScript code", and the network panel shows no request under `/playground/` (story 5).

## 5. Deferred manual checks (research R26)

May wait for the final testing phase under the interim provision; each is an open task in
`tasks.md` and listed in the pull request:

- A desktop screen reader (VoiceOver with Safari, or NVDA with Firefox): every step of story 6 is
  announced as contracts/playground.md sets (SC-010).
- The keys of research R12 tried by hand in Chrome, Edge, Firefox and Safari, with a screen reader
  running.
- Forced colors in Edge, text-only zoom to 200% in Firefox (story 7).
- The built Playground against the design exports in `design/mockup/`.
