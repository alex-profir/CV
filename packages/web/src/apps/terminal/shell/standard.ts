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

// What just-bash's `type` names as a builtin or keyword and that doesn't run
// here: `type` and `command -v` say it isn't found (T336, research G10).
export const NAMED_NOT_RUN: ReadonlySet<string> = new Set(['alias', 'unalias', 'trap', 'kill', 'jobs', 'fg', 'bg', 'disown', 'times', 'enable', 'caller', 'suspend', 'umask', 'ulimit', 'fc', 'select', 'coproc']);

// bash's reserved words that just-bash parses, which a command's first word
// completes to too (research R43). `select` and `coproc` it doesn't.
export const SHELL_KEYWORDS = ['if', 'then', 'else', 'elif', 'fi', 'case', 'esac', 'for', 'while', 'until', 'do', 'done', 'in', 'function', 'time', '{', '}', '[[', ']]', '!'] as const;

export type LeftOutReason = 'network' | 'language' | 'scripts' | 'permissions' | 'zlib' | 'aliases' | 'site' | 'unproved';

// Each command just-bash offers that the Terminal leaves out, and why.
// `time`, which just-bash also lists, is a reserved word of the language,
// as in bash (FR-067), not a command.
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

// The help of the standard commands that don't answer `--help` in just-bash
// 3.6.0 (research G18), in the form its other commands print theirs, with
// the options it implements. GNU's words, not the site's.
type CommandHelp = { summary: string; usage: string; options: readonly string[] };

export const MISSING_HELP: Readonly<Record<string, CommandHelp>> = {
  mkdir: {
    summary: 'make directories',
    usage: 'mkdir [OPTION]... DIRECTORY...',
    options: ['-p, --parents     no error if existing, make parent directories as needed', '-v, --verbose     print a message for each created directory', '    --help        display this help and exit'],
  },
  rm: {
    summary: 'remove files or directories',
    usage: 'rm [OPTION]... [FILE]...',
    options: ['-f, --force           ignore nonexistent files, never prompt', '-r, -R, --recursive   remove directories and their contents recursively', '-v, --verbose         explain what is being done', '    --help            display this help and exit'],
  },
  seq: {
    summary: 'print a sequence of numbers',
    usage: 'seq [OPTION]... LAST\n       seq [OPTION]... FIRST LAST\n       seq [OPTION]... FIRST INCREMENT LAST',
    options: ['-s STRING    use STRING to separate numbers (default: \\n)', '-w           equalize width by padding with leading zeroes', '    --help   display this help and exit'],
  },
  touch: {
    summary: 'change file timestamps',
    usage: 'touch [OPTION]... FILE...',
    options: ['-a                 change only the access time', '-c, --no-create    do not create any files', '-d, --date=STRING  parse STRING and use it instead of current time', '-m                 change only the modification time', '    --help         display this help and exit'],
  },
};

export const helpText = (name: string, help: CommandHelp): string => `${name} - ${help.summary}\n\nUsage: ${help.usage}\n\nOptions:\n${help.options.map((option) => `  ${option}\n`).join('')}`;
