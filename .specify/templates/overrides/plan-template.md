# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Design**: [link to `/specs/[###-feature-name]/design/review.md`, or "No UI"]

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]

**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]

**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]

**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]

**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]

**Project Type**: [e.g., library/cli/web-service/mobile-app/compiler/desktop-app or NEEDS CLARIFICATION]

**Shells**: [Desktop / Mobile / Both, matching the spec's Shell Scope]

**Offline Approach**: [How the spec's Offline Behavior is delivered, or NEEDS CLARIFICATION]

**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]

**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]

**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

<!--
  One row per principle in .specify/memory/constitution.md. Status is Pass, Fail or N/A,
  with evidence from this plan. Any Fail must appear in Complexity Tracking, or the gate fails.
-->

| # | Principle | Check | Status | Evidence |
|---|-----------|-------|--------|----------|
| I | Spec First | spec.md `Status: Approved`; this plan holds the "how", the spec holds none | [ ] | |
| II | Design Gate | design/ has wireframe, PNGs, Penpot link, signed review.md; or spec says "No UI" | [ ] | |
| III | Traceable Requirements | Every FR has a planned test and, if UI, a `data-req` target (see Requirement Traceability) | [ ] | |
| IV | One Source of Truth | CV data read only from `packages/content`; styles use tokens only, from Penpot or the motion token source | [ ] | |
| V | Shared Core, Per-Shell Scope | Apps declare shells; shared logic in `os-core`; matches spec Shell Scope | [ ] | |
| VI | Offline by Default | Offline Approach delivers everything the spec lists as offline | [ ] | |
| VII | Recruiter First | No added steps before the CV; `/cv` stays server-rendered | [ ] | |
| VIII | Accessible and Fast | WCAG 2.2 AA, desktop keyboard operation, reduced motion, Lighthouse 90+ planned and verifiable | [ ] | |
| IX | Original Design | No Apple icons, fonts, wallpapers or other Apple assets | [ ] | |
| X | Simple and Vetted | Every new dependency, skill and abstraction listed below with a reason | [ ] | |
| XI | One Feature, One PR | Feature ships in one PR linking spec.md and tasks.md | [ ] | |

## Requirement Traceability

<!--
  Constitution III. One row per FR-### in spec.md, including every FR the spec defines.
  "UI target" is the element that carries data-req, or "Non-UI".
-->

| Requirement | Test(s) | UI target (`data-req`) |
|-------------|---------|------------------------|
| [###-feature-name]-FR-001 | [test type and what it asserts] | [element, or Non-UI] |

## Dependencies, Skills & Abstractions

<!--
  Constitution X. List every new runtime or dev dependency, agent skill, and abstraction this
  feature introduces. If there are none, write "None" and delete the table.
  Vendor-maintained means published by the platform or library vendor.
-->

| Item | Kind | Reason | Simpler alternative rejected because | Vendor-maintained |
|------|------|--------|--------------------------------------|-------------------|
| [name] | [dependency / dev dependency / agent skill / abstraction] | [problem it solves] | [why] | [Yes / No: who maintains it] |

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── spec.md              # Feature spec (/speckit-specify output)
├── design/              # Design gate artifacts (UI features only)
│   ├── wireframe.md     # ASCII wireframes
│   ├── *.png            # Penpot mockup exports
│   └── review.md        # Owner sign-off, Penpot link and mockup version
├── checklists/          # Quality checklists (/speckit-specify, /speckit-checklist)
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the tree below with the real paths this feature touches.
  `packages/content` is fixed by the constitution. Paths for os-core, the shells, apps,
  the token output and /cv follow whatever earlier plans established; the first plan that
  creates them decides and records them here.
-->

```text
packages/
├── content/             # All CV data (Constitution IV)
└── [os-core path]/      # Shared OS behavior for both shells

[desktop shell path]/    # macOS-style shell
[mobile shell path]/     # iOS-style shell
[apps path]/             # Apps, each declaring its supported shells
[token output path]/     # Design tokens from Penpot and the motion token source
[cv route path]/         # /cv, server-rendered

tests/
└── [test layout]        # Tests reference <feature>-FR-### IDs
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**
>
> Per the constitution's Governance section, an exception not recorded here is a violation.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
