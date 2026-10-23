# Environment for unattended Spec Kit runs. Sourced by run.sh; can also be
# sourced by hand before `specify workflow run` or `specify workflow resume`.

# The project needs Node 26 (.nvmrc). Put it on PATH so every session's shell
# commands inherit it, whatever the login shell's default is.
if [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
  _speckit_flags=$-   # nvm.sh fails under set -eu; restore the caller's flags after
  set +eu
  # shellcheck disable=SC1091
  . "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  nvm use >/dev/null
  case $_speckit_flags in *e*) set -e ;; esac
  case $_speckit_flags in *u*) set -u ;; esac
  unset _speckit_flags
fi

# Opus only, on high effort. Opus 5.5 runs with a 1M-token window natively.
# CLAUDE_CODE_EFFORT_LEVEL overrides --effort, /effort and settings.
export ANTHROPIC_MODEL=opus
export CLAUDE_CODE_EFFORT_LEVEL=high
# Subagents and background tasks would otherwise use other models.
export CLAUDE_CODE_SUBAGENT_MODEL=opus
export CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1
export ANTHROPIC_DEFAULT_SONNET_MODEL=claude-opus-5-5
export ANTHROPIC_DEFAULT_HAIKU_MODEL=claude-opus-5-5

# Start a fresh session once a session's context passes this share of the
# window (see context-budget.sh).
export CONTEXT_BUDGET_PCT=${CONTEXT_BUDGET_PCT:-40}
export CONTEXT_WINDOW_TOKENS=${CONTEXT_WINDOW_TOKENS:-1000000}
export SPECKIT_HANDOFF_FILE=.specify/handoff.md

# Each workflow command step runs `claude -p`. Without a permission mode it
# starts in Manual mode and every edit is denied. Auto mode lets a classifier
# review each action; anything that would still need a person is denied.
export SPECKIT_INTEGRATION_CLAUDE_EXTRA_ARGS=${SPECKIT_INTEGRATION_CLAUDE_EXTRA_ARGS:-"--permission-mode auto --permission-prompts none"}
