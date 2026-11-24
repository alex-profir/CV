# CV pitch, personal projects and PDF download: design

Date: 2026-11-24. Status: draft, waiting for the owner's approval.

## Intent

The CV reads as a list of jobs today. The owner wants it to sell: open with the problems they solve,
and let the experience, projects and skills underneath be the proof a reader can check. It should
also show that they build their own products, not only client work. Recruiters still file CVs as
files, so /cv gets a PDF download.

## Goals

1. A services-style pitch at the top of the CV: a short tagline, then 2–3 roles, each naming the
   problems the owner fixes in that role. The rest of the CV backs each claim.
2. Every CV text rewritten in a short, confident voice, problem first.
3. A personal projects section with four entries, no product names, a line or two each.
4. A "Download PDF" control on /cv that downloads the CV as a PDF matching the page's print view.

## Non-goals

- No new pages or routes beyond the PDF file itself.
- No change to the visual design system (tokens, fonts) beyond what the new sections need.
- No PDF in the OS shell's CV app or the terminal in this round (see Open to the builder).

## Anti-goals (a failure even if it works)

- Text that reads as AI-written, or as slogans. "I deliver." and lines like it are out.
- Invented metrics or claims. Every number must already be in the owner's facts or the current CV.
- A personal project named, or described closely enough to identify a private repo or a client.
- The source of the pitch idea named anywhere: in specs, docs, commits, PR text or code comments.
- A PDF that drifts from the page (different content, or stale after a CV edit).

## Constraints

- Constitution I and XI: behaviour changes start in a spec. The pitch section and the personal
  projects section change what /cv shows (004), the content rules (002), the shell CV app (005,
  shares `CvDocument`) and the terminal's `cv` output (006, `engine/cv.ts`). That is larger than a
  small change, so it goes through a new spec that amends the older ones.
- Every requirement gets an `FR-###` ID and a test that references it (traceability CI).
- UI changes pass the design gate first. Until Penpot is back, that is a local HTML mockup the
  owner approves.
- New dependencies need a written reason in the plan. Playwright and Chromium are already used in
  CI (`.github/workflows/ci.yml`), so the PDF build reuses them.
- Vercel deploys from `main` with `npm run build` (`vercel.json`). Any new route or file served at a
  new path must be added to `vercel.json`'s routes.
- The CV content lives in `packages/content/resume.json` (JSON Resume 1.3.1) and passes
  `npm run content-check`.

## Voice

The owner picked short and confident. The rules:

- Plain sentences, first person, active verbs. Lead with the problem or the outcome, then what was
  done.
- No slogans, no filler adjectives ("passionate", "robust", "seamless"), no em-dash-heavy
  rhythm, no triads used for cadence.
- Formal enough for an HR reader. No stack or years in the pitch; stack lives in projects and
  skills.
- Every draft goes through a public AI detector (GPTZero first, ZeroGPT as a second opinion,
  via Chrome) and is revised until both read it as human. The detectors are noisy: a pass is a
  filter, not proof. The owner sees and approves each draft's wording before it is committed, along
  with any lines still flagged; the owner's approval wins over a detector.

## Content

### Pitch

A tagline and 2–3 roles, in a new pitch field. `basics.summary` stays, rewritten short: it still
feeds the page's meta and link-preview description, the intro and the terminal, and it keeps "open
to remote or hybrid work". The tagline is not a copy of it. Each problem is plain text; the backing
is a writing rule checked in the owner's review, not an in-page link (builder's call: links would
need references, a content-check rule and print/terminal handling for little gain). Working draft of the
roles, to be reworded and approved with the owner:

- Product builder: from an early idea to a shipped web and mobile app.
- Platform engineer: monoliths split into services, cloud bills cut, releases made repeatable.
- AI-assisted delivery: spec-driven agent workflows that cut feature time from months to weeks.

Each role lists 2–4 problems, each backed somewhere below in the CV.

### Personal projects (no names)

The products are private, so neither this doc nor anything else in the repo names them. Each entry
gets a generic, descriptive name (worded with the owner). The mapping from entry to product stays out
of the repo; "never named" is enforced by review, since an automated guard would have to contain the
names.

| Entry, in substance |
|---|
| A toolkit for spec-driven, agent-built software (two of the owner's tools, as one entry): one ticket becomes one reviewed PR through a plan, questions, gates and review; approved work builds unattended, led from a planning console. Claude Code plugin, TypeScript, Node. |
| A multi-tenant restaurant platform: venues, staff management, owner auth, a shared tablet mode, tenant isolation. Next.js. | 2026-07 |
| A phone-first workout PWA with a native Android app: programs, a workout player with video, progress tracking. React, React Native, Supabase. |
| An Android app that reads ride offers from driver apps and rates them, through a native Kotlin accessibility module and an overlay. Expo, Kotlin, Firebase. |

Personal projects carry no start or end dates (the owner's choice; 004 already allows an undated
project). Keywords come from each repo's actual stack, so nothing is invented.

### Skills

"Also Familiar With" holds skills with no project behind them. Next.js now has one (the restaurant
platform), so it moves out of that group into "Web Frameworks & Libraries". The rest of the group
stays as it is.

### Rewrite

`basics.summary`, both `work` summaries and highlights, and every client project's description and
highlights, in the voice above. Facts stay as in the owner's 2026-11-02 answers.

## Approaches

### The pitch and personal projects

One sensible way: a new spec (`010-cv-pitch`) that adds the pitch as a new top-level field in
`resume.json`, validated by content-check, and a personal projects section built from `projects[]`
entries marked as personal. It amends 002, 004, 005 and 006 as above. Rewording only the existing
sections (no new section) was considered and rejected by the owner: it reads as a better CV, not a
pitch.

### The PDF

| Option | Trade-off |
|---|---|
| **1. Generate during the build (chosen)** | `npm run build` opens /cv in headless Chromium (Playwright) and prints it to `/cv.pdf` with `print.css`. Never stale, matches the page. Risk: Vercel's build image may not run Chromium. |
| 2. Committed PDF (fallback) | `npm run pdf` regenerates it locally; CI fails when the committed PDF no longer matches its inputs (for example a fingerprint of the content and print styles stored in the PDF's metadata). Always deploys, one extra step per CV edit. |
| 3. Button opens the print dialog | No build work, but not a download, and poor on phones. Rejected. |

The owner chose 1, falling back to 2 if a throwaway spike on a Vercel preview deploy shows Chromium
can't run there. The spike comes first in that feature's work.

## Order of work

1. Spec `010-cv-pitch` through speckit, the mockup through the design gate, then content drafts
   (detector-checked, owner-approved), then the build. One PR.
2. Spec `011-cv-pdf` through speckit, starting with the Vercel Chromium spike. One PR. The PDF
   includes the pitch and personal projects, so it follows 010.

## Decided by the owner

- The pitch as its own section at the top (not a rewrite only).
- Short, confident voice; no "I deliver." or similar.
- Personal projects: the four entries above, two tools merged into one, with no
  dates. No
  names, minimal detail.
- PDF: build-time generation, falling back to a committed PDF.
- The pitch's source is never named in the repo.
- Texts checked with an AI detector.
- "Also Familiar With" is for skills with no project behind them; Next.js leaves it for the main
  skills, now that a project backs it.

## Open to the builder

- The pitch field's exact shape and name in `resume.json`, and how personal projects are marked
  (`type`, `entity` or a separate list), as long as content-check validates it.
- Section order beyond "pitch first, personal projects after client projects".
- Where the download control sits (the intro block is the likely place) and its print/no-JS
  behaviour: it is a plain link to `/cv.pdf`, so it works without JavaScript.
- Whether the terminal's `cv` command and the shell CV app show the pitch (likely yes, as they share
  the builders) and whether they link the PDF (proposed: not this round).
- The PDF's file name on download (proposed: `Alex-Profir-CV.pdf` through the `download`
  attribute).

## Builder's calls (made in the design, for the owner to check)

- The tagline lives in the pitch field; `basics.summary` stays as a short summary.
- Pitch problems are plain text, not links to entries.
- Personal project keywords come from each repo's stack.
- The PDF is A4 (the owner is EU-based; US readers print A4 PDFs fine with scaling).
- This doc is committed with no product names.
- When a detector flags a line the owner approved, the owner's approval wins and the flag is reported.
