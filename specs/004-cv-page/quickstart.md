# Quickstart: Validating the /cv Page

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Scenarios that prove the feature works end to end. Commands run from the repository root. The
automated tests cover each FR (plan.md, Requirement Traceability). These scenarios are how a
reviewer or the owner sees it for themselves, and the manual ones are required before merge.

## Prerequisites

```sh
nvm use                                # Node 26, from .nvmrc
npm ci
npx playwright install chromium        # once per machine, needs the network
```

## 1. Build and look at the site

```sh
npm run build
npm run serve                          # http://127.0.0.1:4173
```

Expected:

- `http://127.0.0.1:4173/` lands on `/cv`, and the address bar shows `/cv` (FR-018).
- `/cv/` and `/cv?utm_source=x` show the same page (FR-017).
- `/nope` shows the not-found page, and the browser's network panel shows status 404, with a
  link to `/cv` (FR-019).
- The page matches `design/mockup/cv-desktop-1440.png` at 1440 px and `cv-phone-375.png` at
  375 px, and the not-found page its two exports (FR-042). Compare side by side.

## 2. Run every check, as the pull request does

```sh
npm run site-check
```

Expected: `Site check: PASSED`, every part listed, every Lighthouse category at 90 or more on both
profiles, and the run under 5 minutes (SC-002, SC-009).

## 3. With no internet connection

Turn Wi-Fi off, then repeat scenario 2. Expected: the same result (FR-057, US2 scenario 8).

## 4. The other checks still pass

```sh
npm run traceability && npm run content-check && npm run token-check && npm run typecheck && npm test
```

Expected: all pass. The content and token checks hold no exception for the page (FR-003, FR-044,
SC-010).

## 5. With JavaScript off (by hand)

In a browser's settings, turn JavaScript off, open `/cv` at a phone width and a desktop width.
Expected: every section present and styled, nothing broken (US1 scenario 2).

## 6. Screen readers (by hand, SC-004)

With VoiceOver on macOS (Safari) and VoiceOver on iOS or TalkBack on Android:

- the headings list holds `Alex Profir`, then one heading per section, then the entries;
- moving by heading reaches every section;
- the work entry's dates are read as "July 2018 to October 2026", and the first project's as
  "December 2025 to present";
- the GitHub link is announced with its network and username.

Record the result in the pull request.

## 7. Print (by hand, SC-005)

Print `/cv` to PDF on A4 and on US Letter, in Chrome and in Firefox or Safari, with the browser's
headers and footers on and background graphics off. Expected: only the CV; every link's address
printed, the email once; no heading as the last line of a page; no text cut off. Record the result
in the pull request.

## 8. Offline (by hand)

Open `/cv` once online. In the browser's developer tools, set the network to offline, then open
`/cv`, `/` and `/nope`. Expected: the full CV, styled and in the design's fonts; `/` leads to
`/cv`; `/nope` shows the not-found page (US4 scenarios 1 and 2, FR-038).

## 9. One edit changes the page (SC-008)

1. Change the work entry's `position` in `packages/content/resume.json`, then `npm run build` and
   `npm run serve`. Expected: the page shows the new position. `git status` lists only
   `resume.json` (US6 scenario 1). Revert.
2. Change the primary text color token: in Penpot, exporting to
   `packages/tokens/penpot/tokens.json`, or, while the interim provision applies, in that file
   directly, keeping Penpot's form. Run `npm run token-output` and `npm run build`. Expected: the page uses the new color, and only
   the export and the two generated token files changed (US6 scenario 2). Revert.
3. Add `"certificates": [{ "name": "X" }]` to the CV document and run `npm run site-check`.
   Expected: the `content` part fails, naming `certificates` (US6 scenario 5). Revert.

## 10. Sharing

Open `packages/web/dist/site/cv.html` and read the head. Expected: the title
`Alex Profir — Software Engineer`, the summary as description and `og:description`, and no
canonical address, `og:url` or image (US5, FR-017, FR-036).

## 11. After Penpot is back (the interim provision's follow-up)

Done in a follow-up pull request, not this one:

1. Import `packages/tokens/penpot/tokens.json` into the site's Penpot file (tokens panel, Import),
   then export the single file over it. Expected: `git diff` shows no change, or only differences
   the owner reviews; `npm run token-output` and `npm run token-check` pass.
2. Check the imported tokens against the revision 10 frames, then add the Penpot link to
   `design/review.md` and tick the spec's Design box.

## 12. The pull request (verified live)

1. Apply the updated ruleset:

   ```sh
   gh api -X PUT repos/alex-profir/CV/rulesets/<id> --input .github/rulesets/main.json
   ```

   Read it back and compare with the committed file.
2. Push a commit to the pull request that removes the focus outline from links. Expected: the
   `site` job fails, naming every link in the keyboard part, and merging is blocked. Revert it.
3. Expected: the job summary shows the report with every part and score.
