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
# 1. Draft the spec. Stops when spec.md exists; nothing is planned or built.
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

## How the build works

`workflows/speckit-build.yml`:

1. `gates.sh` checks spec status and the design sign-off (Constitution I, II).
2. `/speckit-plan` and `/speckit-tasks`, each followed by `expect.sh`, which stops
   the run if the step exited cleanly but wrote nothing. Then `/speckit-analyze`, whose CRITICAL and
   HIGH findings are fixed in `plan.md` and `tasks.md` only. The report goes to
   `.specify/analysis.md`; anything needing a spec change is left for the owner.
   Plan and tasks are committed as one `docs:` commit.
3. A loop of up to 12 `/speckit-implement` sessions. When every task is ticked,
   `/speckit-converge` compares the code with the spec and adds tasks for gaps.
   The loop ends when nothing is left, or when two sessions in a row tick no task.
   Tasks a session marks `BLOCKED:` are left for the owner and listed when the run ends.
4. `checks.sh` runs CI's required checks: content, tokens, traceability, typecheck and
   tests. `site-check` needs a browser, so run it yourself for UI features.

## Files

| File | Role |
|---|---|
| `run.sh` | Entry point; sources `env.sh` and starts or resumes a workflow |
| `env.sh` | Node 26, Opus/high for sessions, subagents and background tasks, context budget, permission mode |
| `context-budget.sh` | `PostToolUse` hook (registered in `.claude/settings.json`); inert unless `CONTEXT_BUDGET_PCT` is set |
| `gates.sh` | Owner gates before planning |
| `expect.sh` | Checks that plan and tasks were really written |
| `tasks-status.sh` | Counts open and ticked tasks; detects a stalled session |
| `checks.sh` | The repository's checks after the build |

Settings: `CONTEXT_BUDGET_PCT` (default 40), `CONTEXT_WINDOW_TOKENS` (default
1000000) and `CONTEXT_BUDGET_COMMANDS`, the commands whose sessions the budget
applies to (default `speckit-implement`). An implement session uses about 80k
tokens before its first task, so keep the budget well above that. Sessions run in auto permission mode; actions the classifier
won't allow are denied rather than waiting for a person.
