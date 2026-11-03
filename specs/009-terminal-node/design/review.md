# Design Review: Node in the Terminal

**Status**: Approved (mockup `cb38050`, 2026-11-02)

<!--
  Status moves from Draft to Approved only when the project owner signs off the design
  (Constitution II). Until then, no UI code is written for this feature.
-->

**Design**: an interim local mockup, under the constitution's interim provision on local mockups, built from the
real Terminal, so only what this feature adds is new.

## What is reviewed

| Artifact | File |
|----------|------|
| Wireframes and all site text | [wireframes.md](wireframes.md) |
| Local mockup: nine states per shell | [mockup/](mockup/README.md) |
| Exports: desktop at 1440 × 900 | `mockup/desktop-*-1440.png` |
| Exports: phone at 375 × 812 and 320 × 568 | `mockup/phone-*-375.png`, `mockup/phone-*-320.png` |
| Penpot file | Not needed for an interim local mockup. It is added in the provision's follow-up pull request |

## Design decisions

- **No new surface**: a program is an ordinary run in the Terminal. Nothing new on desktop but text.
- **Stop replaces `clear`** while a program runs, in the error color with dark text (10.3:1), so the grid doesn't
  move and the key is plain to find.
- **Stop with the keyboard open** (amended 2026-11-02): the row above the keyboard holds one key, so Stop takes Tab's
  place there while a program runs. Export: `mockup/phone-10-keyboard-open-375.png`.
- **Stderr and errors** use the existing error tone, so a whole Node error reads as one block.
- **Original design**: the key is text in the site's own key style (Constitution IX).

## Sign-off

- Reviewed mockup: commit `cb38050`, an interim local mockup. Approved by the owner on 2026-11-02.
- Amendment: Stop in the keyboard row, built ahead of this review and approved by the owner on 2026-11-02, before the
  feature's pull request.
