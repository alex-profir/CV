# Design Review: CV PDF Download

**Status**: Draft

<!--
  Status moves from Draft to Approved only when the project owner signs off the design
  (Constitution II). Until then, no UI code is written for this feature.
-->

**Design**: an interim local mockup, under the constitution's interim provision on local mockups,
built from the real `/cv` page, so only the download row is new.

## What is reviewed

| Artifact | File |
|----------|------|
| Wireframes and site text | [wireframes.md](wireframes.md) |
| Local mockup | `mockup/*.html`, built by `mockup/build.mjs` |
| Exports: desktop at 1440 × 900 | `mockup/desktop-1-intro-1440.png`, `mockup/desktop-2-link-focused-1440.png` |
| Exports: phone at 375 × 812 and 320 × 568 | `mockup/phone-1-intro-375.png`, `mockup/phone-2-intro-narrow-320.png` |
| Penpot file | Not needed for an interim local mockup. It is added in the provision's follow-up pull request |

## Design decisions

- **A contact row, not a button**: the link joins the contact rows as their last row, labelled `CV`,
  so it reads as one more way to get the CV and adds no new component or style.
- **↓ arrow**: a downward arrow in the site's arrow set says the link downloads, as ↗ says a link
  leaves the site.
- **Hidden in print**: the row is a site element, so the PDF never contains its own download link.

## Sign-off

- Reviewed mockup: pending the owner's review.
