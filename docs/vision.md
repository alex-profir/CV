# Vision

## What this is

A public CV, presented as a browser operating system. On desktop it is a macOS-style desktop
with windows, a dock and a menu bar. On phones it is an iOS-style home screen with full-screen
apps. The interaction is inspired by both, and the look is original.

The site is built with spec-driven development, and the process is part of what it shows.
Every feature starts as a spec, and every requirement can be traced through the UI to a test.
The rules for how features are built live in
[the constitution](../.specify/memory/constitution.md).

## Who it is for

In priority order:

1. **Recruiters.** They need the CV quickly, often on a phone, and may never explore the OS.
   The CV is one click or tap from first load, and `/cv` is a plain page they can open and share.
2. **Hiring managers and engineering leaders.** They look for evidence of judgment: how
   requirements are written, how decisions are justified and how quality is enforced.
3. **Engineers reviewing the craft.** They read the code, tests and history, and check
   accessibility and performance for themselves.

## Goal

Showcase the owner's skills by putting them to work, not by listing them:

- **The work**: an OS-style site that is accessible, fast, works offline, and has an original
  look.
- **The way of working**: requirements written down before code, traceable from spec to UI to
  test, with decisions recorded and quality gates enforced in CI. These are lead- and
  staff-level skills, and the hardest to show on a CV.

The site makes the process something a visitor can see, not just read about.

## First release

### Apps

| App | Shells | What it does |
|-----|--------|--------------|
| **CV** | Both | The CV itself, one click or tap from first load. Same content as `/cv`, with a way to download it as a PDF. On phones it also has a home-screen widget. |
| **Terminal** | Both | Explore the CV and the site through commands. On phones it is deliberately a little odd, as a nice touch. |
| **TypeScript playground** | Desktop | Write and run TypeScript, with live type errors, types on hover and autocomplete, the compiled output, examples, and sharing code by link. A shared link opens the code but never runs it. Code runs in a sandbox with no access to the site's storage, and it can be stopped. Phones show a "best on desktop" screen with a way to share the link instead, because a code editor on a phone keyboard is a poor experience. |
| **Files** | Both | Browse the site's files: the CV laid out as files, the specs, and the visitor's own files, and open each one in its app. The Terminal works on the same files. |
| **Spotlight** | Both | Search apps, CV sections, files, Terminal commands and actions such as downloading the CV. It opens from the keyboard on desktop and by swiping down on the home screen on phones, and it works offline. |
| **React Native showcase** | Both | Live React Native examples, the owner's main field. On desktop a QR code opens them on a phone; on a phone they open there directly. They need the network, so offline the app says so instead. |
| **Contact** | Both | A way to reach the owner. Its spec decides how it works. |
| **Settings** | Both | Theme, wallpaper and accessibility preferences such as reduced motion. |

Each app's spec confirms its shells, and says what the other shell shows instead. An app that
needs the network shows its own offline state; the shell has no offline indicator.

### Planned order

1. TypeScript playground
2. Files, with the Terminal moved onto the shared files
3. Spotlight
4. The CV as a PDF
5. Settings
6. React Native showcase
7. Contact

### What the site remembers

Files the visitor makes and their settings are kept in their browser, on their device, and can
be reset. Nothing is sent anywhere. The OS shell (005) and the Terminal (006) remember nothing
between visits today; the features that add files and settings amend their specs.

### Showing the process

- **Requirement inspector**: a toggle that reveals which requirement each UI element
  implements, using its `data-req` attribute. Each requirement links to its spec in the repo.
- **Link to the repo**: the GitHub repository holds the full record: specs, plans, tasks,
  pull requests and CI runs.

### The plain CV page

`/cv` is a server-rendered page with the full CV. It works without JavaScript and without the OS,
for visitors who only want the document.

### The CV as a PDF

A PDF of the CV, made from `/cv` when the site is built, so the two never differ. It can be
downloaded from `/cv` and from the CV app, and it is kept for offline use.

## After the first release

These need the site to be published at a public address, and Handoff needs a server.

- **Installing the site as an app** on phones, from a control in Settings. It is never a prompt
  in front of the CV.
- **Handoff**: the desktop shows a QR code, and the phone continues with the same apps and the
  visitor's files. The session is held on a server for a few minutes and can be used once. Its
  spec says what is stored and for how long.

## What success looks like

- A recruiter reaches the CV in one click or tap from first load, on either shell.
- `/cv` reads in full with JavaScript turned off.
- The CV, and every app that does not need the network, works offline.
- Both shells and `/cv` meet WCAG 2.2 AA and score 90+ in every Lighthouse category on mobile
  and desktop.
- Any visible UI element can be traced to its requirement with the inspector, and from there to
  its tests in the repo.

There are no analytics (see non-goals), so success is judged by these checks and by the
conversations the site starts, not by traffic.

## Non-goals for the first release

- A blog or other writing.
- Games or easter eggs.
- Visitor analytics or tracking of any kind.
- Languages other than English.
- A replica of macOS or iOS. The interaction borrows from them; icons, fonts, wallpapers and
  the overall look do not.

## Considered and left out

- **A web browser app**: most sites refuse to be shown inside another site, so it could only
  show a handful of pages.
- **An offline indicator in the menu bar or status bar**: each app that needs the network says
  so itself.
- **A C++ playground**: the compiler is too large to load in a browser for a CV site.
- **AI in the Terminal**: it needs a server, rate limits and a spending cap.
- **Live presence** (other visitors' cursors, a visitor count, a guestbook): it needs a server,
  and a visitor count comes close to tracking.
- **A game or a mascot**: games and easter eggs are non-goals.
- **An app switcher on phones, and drag and drop between apps**: too little value for the cost.

## Open questions

- **Name**: "AboutThisDev" or "Alex Profir".
- **Domain**: where the site is hosted.
- **Contact method**: links only, or a form that needs a server. This is decided in the Contact
  spec, with its offline behavior. Links only keeps the first release without a server.
