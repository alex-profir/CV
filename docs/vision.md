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

| App | What it does |
|-----|--------------|
| **CV** | The CV itself, one click or tap from first load. Same content as `/cv`. |
| **Terminal** | Explore the CV and the site through commands. Ships on both shells; on phones it is deliberately a little odd, as a nice touch. |
| **Contact** | A way to reach the owner. Its spec decides how it works. |
| **Settings** | Theme, wallpaper and accessibility preferences such as reduced motion. |

Each app's spec decides which shells it supports and what the other shell shows instead.

### Showing the process

- **Requirement inspector**: a toggle that reveals which requirement each UI element
  implements, using its `data-req` attribute. Each requirement links to its spec in the repo.
- **Link to the repo**: the GitHub repository holds the full record: specs, plans, tasks,
  pull requests and CI runs.

### The plain CV page

`/cv` is a server-rendered page with the full CV. It works without JavaScript and without the OS,
for visitors who only want the document.

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

## Open questions

- **Name**: "AboutThisDev" or "Alex Profir".
- **Domain**: where the site is hosted.
- **Contact method**: links only, or a form that needs a server. This is decided in the Contact
  spec, with its offline behavior.
