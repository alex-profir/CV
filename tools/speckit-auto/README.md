# speckit-auto

Runs the Spec Kit steps unattended so most of the drafting and coding happens in
long headless runs, and the owner reviews at the gates the constitution sets.

Every agent step is a fresh `claude -p` session on Opus at high effort. An
implement session that reaches 40% of its 1M-token context finishes its task,
writes a handoff and stops; the next session picks up from `tasks.md` and the
handoff. One-shot steps (plan, tasks, analyze, converge) are never cut short,
since nothing would continue them.

## Use

```bash
# 1. On main: draft the spec and commit it on a new branch named after the
#    feature directory. Nothing is planned or built.
tools/speckit-auto/run.sh spec "Describe the feature"

# 2. You: review spec.md, run /speckit-clarify for any [NEEDS CLARIFICATION],
#    set **Status**: Approved, and for a UI feature pass the design gate.

# 3. Plan, write tasks, analyze and build. Refuses to start until step 2 is done.
tools/speckit-auto/run.sh build specs/005-example
tools/speckit-auto/run.sh build specs/005-example --review   # pause after plan/tasks/analyze
tools/speckit-auto/run.sh resume <run_id> -i plan_verdict=approve
tools/speckit-auto/run.sh build specs/005-example --implement-only  # after editing plan/tasks

# 4. You: review the commits, the BLOCKED tasks listed at the end, and .specify/analysis.md.
```

Run it in `tmux` with `caffeinate -i` for long builds. `specify workflow status`
lists runs; a failed or paused run continues with `run.sh resume <run_id>`.

`build` and `resume` resume the run on their own when a session fails on the usage
limit or a passing API error (429, 5xx, overloaded): after a limit they wait until
the reset time it names, plus two minutes, or check again every 30 minutes if it
names none; after an API error they back off from one minute to 15. Any other
failure stops the run as before. `SPECKIT_AUTO_RESUME_MAX` caps the resumes per
command (default 30; 0 turns it off).

## Several features at once

Each feature can build in its own worktree, with its own loop, while you keep
working in the main checkout. Create the feature's branch first, numbered and
with its approved spec; it can be local or only on origin.

```bash
tools/speckit-auto/run.sh worktree start 008-example [--review | --implement-only]
tools/speckit-auto/run.sh worktree resume 008-example <run_id> [-i key=value ...]
tools/speckit-auto/run.sh worktree list
tools/speckit-auto/run.sh worktree clean [--dry-run]
```

`start` checks the branch out in `<repo>-worktrees/008-example` next to the main
checkout (`SPECKIT_WORKTREES` moves it), runs `npm ci` there the first time and
runs `run.sh build specs/008-example` in it, using that branch's copy of the
loop. Run each in its own `tmux` window; `caffeinate -i` is added for you. While
the loop runs the worktree is locked (`git worktree lock`) with the loop's pid
and a `PORT` no other loop holds, from 4174 up, for `npm run serve`. The output
also goes to `<repo>-worktrees/.logs/008-example.log`. A lock whose loop died is
stale and cleared. A branch checked out in another checkout is refused: switch
that checkout away first.

`clean` runs before every `start` and `resume`. Merges are squash merges, so it
asks GitHub (`gh`) which pull requests are merged rather than asking git. It
removes a worktree, its branch and its log when the branch's last pull request is
merged, none is open, the tip is part of what was merged, nothing is uncommitted
and no loop is running there. It deletes other local branches on the same terms,
except `main` and branches checked out anywhere. Everything else is kept, and
worktrees are listed with the reason. If GitHub can't be reached, nothing is
cleaned. Conflicts between features are resolved when each branch merges `main`
before its pull request, not by the loop.

## How the build works

`workflows/speckit-build.yml`:

1. `gates.sh` checks spec status and, for a UI feature, the wireframes, PNG
   mockups and an Approved `review.md` (Constitution I, II). `run.sh` also
   refuses to start unless HEAD is the feature's branch, since sessions commit.
2. `/speckit-plan` and `/speckit-tasks`, each followed by `expect.sh`, which stops
   the run if the step exited cleanly but wrote nothing. Then `/speckit-analyze`, whose CRITICAL and
   HIGH findings are fixed in `plan.md` and `tasks.md` only. The report goes to
   `.specify/analysis.md`; anything needing a spec change is left for the owner.
   Plan and tasks are committed as one `docs:` commit.
3. A loop of up to 12 `/speckit-implement` sessions. When every task is ticked,
   `/speckit-converge` compares the code with the spec and adds tasks for gaps.
   The loop ends when nothing is left, or when two sessions in a row tick no task.
   Tasks a session marks `BLOCKED:` are left for the owner and listed when the run ends.
   If the loop ends with tasks still open, the run fails rather than reporting success.
4. `checks.sh` runs CI's required checks: content, tokens, traceability, typecheck and
   tests. `site-check` needs a browser, so run it yourself for UI features.

## Files

| File | Role |
|---|---|
| `run.sh` | Entry point; sources `env.sh` and starts or resumes a workflow |
| `env.sh` | Node 26, Opus/high for sessions, subagents and background tasks, context budget, permission mode |
| `context-budget.sh` | `PostToolUse` hook (registered in `.claude/settings.json`); inert unless `CONTEXT_BUDGET_PCT` is set |
| `spec-branch.sh` | Commits a drafted spec on its own branch; Spec Kit 1.2 creates none without its git extension |
| `gates.sh` | Owner gates before planning |
| `expect.sh` | Checks that plan and tasks were really written |
| `tasks-status.sh` | Counts open and ticked tasks; detects a stalled session |
| `checks.sh` | The repository's checks after the build |
| `worktree.sh` | Builds features side by side in worktrees and removes merged ones (`run.sh worktree`) |
| `test/worktree.test.ts` | `worktree.sh` against a throwaway repository, with `gh`, `npm` and the loop stubbed |

Settings: `CONTEXT_BUDGET_PCT` (default 40), `CONTEXT_WINDOW_TOKENS` (default
1000000) and `CONTEXT_BUDGET_COMMANDS`, the commands whose sessions the budget
applies to (default `speckit-implement`). An implement session uses about 80k
tokens before its first task, so keep the budget well above that. Sessions run in auto permission mode; actions the classifier
won't allow are denied rather than waiting for a person.
