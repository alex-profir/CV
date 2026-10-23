#!/usr/bin/env bash
# The repository's own checks, run once the build loop ends.
# A UI feature should also get npm run site-check before its pull request.
set -euo pipefail

# The project needs Node 26 (.nvmrc); the shell default may be older.
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

# The checks CI requires, minus site-check, which needs a browser and a build.
npm run content-check
npm run token-check
npm run traceability
npm run typecheck
npm test
