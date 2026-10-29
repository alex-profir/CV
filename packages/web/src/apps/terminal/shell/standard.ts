// The standard commands the shell has, beside the site's (006 research R32):
// the commands FR-068 names, `yes`, and the four FR-008 commands just-bash
// implements. Each is a promise that it behaves as its GNU version does,
// which the parity test proves (SC-014). Every other command just-bash
// offers is left out, with its reason.

export const STANDARD_COMMANDS = [
  'awk', 'basename', 'cp', 'cut', 'date', 'diff', 'dirname', 'echo', 'env', 'false', 'find', 'grep', 'head', 'mkdir', 'mv', 'printf', 'rm', 'sed', 'seq',
  'sort', 'tail', 'tee', 'touch', 'tr', 'tree', 'true', 'uniq', 'wc', 'which', 'xargs', 'yes',
  'cat', 'jq', 'ls', 'pwd',
] as const;

export type StandardCommand = (typeof STANDARD_COMMANDS)[number];

// The shell's builtins that run in just-bash 3.6.0. `type` also calls some
// others "a shell builtin" (`alias`, `trap`, `kill`…) that answer "command
// not found", so the list is the ones that run (research G10).
export const SHELL_BUILTINS = [
  '.', ':', '[', 'break', 'builtin', 'cd', 'command', 'compgen', 'complete', 'continue', 'declare', 'dirs', 'echo', 'eval', 'exec', 'exit', 'export', 'false',
  'getopts', 'hash', 'help', 'let', 'local', 'mapfile', 'popd', 'pushd', 'read', 'readarray', 'readonly', 'return', 'set', 'shift', 'shopt', 'source', 'test',
  'true', 'type', 'typeset', 'unset', 'wait',
] as const;

export type LeftOutReason = 'network' | 'language' | 'scripts' | 'permissions' | 'zlib' | 'aliases' | 'site' | 'unproved';

// Each command just-bash offers that the Terminal leaves out, and why.
export const LEFT_OUT: Readonly<Record<string, LeftOutReason>> = {
  curl: 'network',
  'html-to-markdown': 'network',
  python3: 'language',
  python: 'language',
  'js-exec': 'language',
  node: 'language',
  sqlite3: 'language',
  bash: 'scripts',
  sh: 'scripts',
  chmod: 'permissions',
  ln: 'permissions',
  readlink: 'permissions',
  gzip: 'zlib',
  gunzip: 'zlib',
  zcat: 'zlib',
  tar: 'zlib',
  alias: 'aliases',
  unalias: 'aliases',
  help: 'site',
  history: 'site',
  clear: 'site',
  whoami: 'site',
  mktemp: 'unproved',
  rmdir: 'unproved',
  stat: 'unproved',
  fgrep: 'unproved',
  egrep: 'unproved',
  rg: 'unproved',
  comm: 'unproved',
  paste: 'unproved',
  rev: 'unproved',
  nl: 'unproved',
  fold: 'unproved',
  expand: 'unproved',
  unexpand: 'unproved',
  strings: 'unproved',
  split: 'unproved',
  column: 'unproved',
  join: 'unproved',
  du: 'unproved',
  printenv: 'unproved',
  base64: 'unproved',
  sleep: 'unproved',
  timeout: 'unproved',
  time: 'unproved',
  expr: 'unproved',
  md5sum: 'unproved',
  sha1sum: 'unproved',
  sha256sum: 'unproved',
  file: 'unproved',
  tac: 'unproved',
  hostname: 'unproved',
  od: 'unproved',
  yq: 'unproved',
  xan: 'unproved',
};
