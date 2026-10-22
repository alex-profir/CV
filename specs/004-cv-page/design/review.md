# Design Review: The /cv Page

**Status**: Approved

**Direction**: C, Technical timeline. The owner chose it on 2026-10-22 from three explorations
(A Editorial, B Two-column, C Technical timeline).

## What is reviewed

| Artifact | File |
|----------|------|
| Wireframes: /cv at phone, desktop and print widths, and the not-found page | [wireframes.md](wireframes.md) |
| Penpot export: /cv, desktop 1440 px | [mockup/cv-desktop-1440.png](mockup/cv-desktop-1440.png) |
| Penpot export: /cv, phone 375 px | [mockup/cv-phone-375.png](mockup/cv-phone-375.png) |
| Penpot export: not-found page, desktop 1440 px | [mockup/not-found-desktop-1440.png](mockup/not-found-desktop-1440.png) |
| Penpot export: not-found page, phone 375 px | [mockup/not-found-phone-375.png](mockup/not-found-phone-375.png) |
| Penpot file | File id `eaccfa4c-8a01-81ad-8008-d441a46da254`, page "004 cv-page — Direction C", revision 10 when exported. Link: _to be added by the owner_ |

## Design decisions

- **Type**: Space Grotesk for the name and headings, Schibsted Grotesk for body text, JetBrains
  Mono for dates, labels and keyword chips. All three are under the SIL Open Font License, and
  none is an Apple or operating-system font (Constitution IX).
- **Color**: one light theme. Background `#F4F4EF`, text `#121212`, secondary text `#55554F`,
  rules `#D6D6CE`, accent `#3730A3`. Contrast against the background: text 17:1, secondary
  text 6.8:1, accent 9:1, all above WCAG 2.2 AA. The light rules, timeline line and chip
  outlines (1.3:1) are decoration only: no information depends on them.
- **Section order**: Experience, Projects, Skills, Education, Languages, Interests (FR-001).
- **Dates**: abbreviated month and year, such as `Jul 2018 – Oct 2026`, and `Present` for an
  ongoing entry (FR-009, FR-010).
- **Links**: underlined in the accent color, so they're never shown by color alone.
- **Site element**: "How this page was built ↗" in the footer, outside the CV and left out of
  print.

## Sign-off

- Reviewed mockup version: Penpot file revision 10 (the four exports in `mockup/`)
- Date: 2026-10-22
- Approved by: Alex Profir (project owner)
- Notes: Approved in review of the exported frames. The Penpot link is still to be added.
