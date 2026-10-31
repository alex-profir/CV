---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, design/ (required for UI features)

**Tests**: REQUIRED. The constitution (Principle III) maps every requirement to at least one automated test. Each test task names the `[###-feature-name]-FR-###` IDs it covers, and every FR in spec.md is covered by at least one test task.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions
- Tasks that implement or test a requirement name its ID in the description (e.g., "covers 001-dock-FR-003")

## Path Conventions

- CV data: `packages/content/` (Constitution IV)
- Other paths (os-core, shells, apps, token output, `/cv`, tests) come from plan.md's Project Structure
- Paths in the samples below are illustrative only

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit-tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/

  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment

  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Configure linting and formatting tools

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Design gate (Constitution II)**: for UI features, the first foundational task confirms the
design artifacts. No task that creates or changes UI may start until it is done. Omit it only
when spec.md says "No UI".

- [ ] T004 Confirm design gate: specs/[###-feature-name]/design/ has wireframe.md, Penpot PNG exports, the Penpot link and a signed review.md (or, under the constitution's interim provision, an interim local mockup with its PNG exports and a signed review.md)

Examples of other foundational tasks (adjust based on your project):

- [ ] T005 [P] Add [entity] content to packages/content/[file]
- [ ] T006 [P] Declare supported shells for [app] in [app manifest path]
- [ ] T007 Create shared [behavior] in [os-core path]/[file]

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T010 [P] [US1] Test for [behavior], covers [###-feature-name]-FR-001, in [tests path]/[name]
- [ ] T011 [P] [US1] Test for [user journey] on [desktop / mobile], covers [###-feature-name]-FR-002, in [tests path]/[name]

### Implementation for User Story 1

- [ ] T012 [P] [US1] Build [component] with data-req="[###-feature-name]-FR-001" in [path]/[file]
- [ ] T013 [P] [US1] Build [mobile variant or fallback per Shell Scope] in [path]/[file]
- [ ] T014 [US1] Implement offline behavior per spec for [component] in [path]/[file]
- [ ] T015 [US1] Add keyboard operation and reduced-motion handling for [component] in [path]/[file]

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2 (REQUIRED) ⚠️

- [ ] T018 [P] [US2] Test for [behavior], covers [###-feature-name]-FR-003, in [tests path]/[name]

### Implementation for User Story 2

- [ ] T020 [P] [US2] Build [component] with data-req="[###-feature-name]-FR-003" in [path]/[file]
- [ ] T021 [US2] Integrate with User Story 1 components (if needed)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 3 (REQUIRED) ⚠️

- [ ] T024 [P] [US3] Test for [behavior], covers [###-feature-name]-FR-004, in [tests path]/[name]

### Implementation for User Story 3

- [ ] T026 [P] [US3] Build [component] with data-req="[###-feature-name]-FR-004" in [path]/[file]

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Constitution Verification

**Purpose**: Cross-cutting checks the constitution requires before merge

- [ ] TXXX Verify every FR in spec.md has a passing test that references it (Constitution III)
- [ ] TXXX [P] Verify no hardcoded CV data or literal token values in changed files (Constitution IV)
- [ ] TXXX [P] Verify offline behavior matches spec.md's Offline Behavior section (Constitution VI)
- [ ] TXXX [P] Verify the CV is still one click (desktop) and one tap (mobile) from first load, and /cv renders without JavaScript (Constitution VII)
- [ ] TXXX [P] Audit WCAG 2.2 AA, desktop keyboard operation and prefers-reduced-motion (Constitution VIII)
- [ ] TXXX [P] Run Lighthouse on mobile and desktop profiles; every category scores 90+ (Constitution VIII)
- [ ] TXXX Run quickstart.md validation
- [ ] TXXX Owner action, by hand: the checks only a person can do, such as screen readers, forced colors and comparing the built pages with the design exports. Record each result here and in the PR. Under the interim provision on deferred manual checks, they may wait for the final testing phase: record that here, list them in the PR and leave the task open
- [ ] TXXX Open the PR linking spec.md and tasks.md, with Conventional Commits: one PR for a new feature, also linking any older spec it amends; for an amendment of its own, one PR per part it ships in, each naming the amendment by its date (Constitution XI)
- [ ] TXXX New features only: run `npm run verify:feature` once on any commit of the PR, use `--failed` after a fix, and name the commit and result in the PR description (Constitution, Merge requirements)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **Design gate**: Every task that creates or changes UI depends on the design gate task
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Content and tokens before components
- Shared os-core behavior before shell-specific UI
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Desktop and mobile variants within a story marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Test for [behavior], covers [###-feature-name]-FR-001, in [tests path]/[name]"
Task: "Test for [user journey] on [shell], covers [###-feature-name]-FR-002, in [tests path]/[name]"

# Launch the desktop and mobile builds for User Story 1 together:
Task: "Build [component] with data-req=\"[###-feature-name]-FR-001\" in [path]/[file]"
Task: "Build [mobile variant or fallback per Shell Scope] in [path]/[file]"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational, including the design gate (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

A new feature's stories ship in its single PR (Constitution XI), with any amendment of an older
spec the feature makes; the increments above are checkpoints within it. An amendment of its own
may ship in several PRs, each with its part of the spec amendment, its tests and its design.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Requirement IDs in task descriptions map tasks to spec.md requirements
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group, using Conventional Commits
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
