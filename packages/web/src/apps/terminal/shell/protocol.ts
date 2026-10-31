// The messages between the Terminal's interface and its shell worker, and
// the data they carry (006 contracts/shell-worker.md Messages, data-model.md
// Shell state, Terminal file system, Run request and result). Types only:
// both sides import them, and the worker sends back data, never markup
// (research R39).
import type { Block, Effect } from '../engine/block.ts';

// `set -o` options the adapter carries from line to line (research R27).
export type ShellOption = 'errexit' | 'nounset' | 'pipefail' | 'noglob' | 'noclobber' | 'xtrace' | 'allexport' | 'verbose';

// What the shell keeps between lines, since just-bash resets it after each
// run (research R27, G4).
export type ShellState = {
  cwd: string;
  // Shell variables that differ from a fresh shell's, without the shell's own
  // (PWD, LINENO…).
  variables: Readonly<Record<string, string>>;
  exported: readonly string[];
  // Name → its definition, serialized.
  functions: Readonly<Record<string, string>>;
  options: readonly ShellOption[];
  // `$?` after the last line.
  status: number;
  // Variables a fresh shell has that the visitor unset.
  unset: readonly string[];
  // `declare -p`'s line for each array and each variable with an attribute
  // (readonly, integer…).
  declarations: readonly string[];
  // `$1`, `$2`…
  positional: readonly string[];
  // `shopt` settings that are on; empty until the first line.
  shopts: readonly string[];
  // `$_` and `${PIPESTATUS[@]}` after the last line (T299, T305).
  last: string;
  pipes: readonly number[];
  // `dirs`' stack below the working folder (T305).
  stack: readonly string[];
};

export const INITIAL_STATE: ShellState = { cwd: '/home/guest', variables: {}, exported: [], functions: {}, options: [], status: 0, unset: [], declarations: [], positional: [], shopts: [], last: '', pipes: [], stack: [] };

export type Owner = 'root' | 'guest';
export type FsEntryInfo = { path: string; kind: 'file' | 'folder'; owner: Owner; protected: boolean };

// The visitor's files, as the interface keeps them for a restarted worker
// (research R26).
export type VisitorFiles = {
  // Absolute paths, parents first.
  folders: readonly string[];
  // Absolute path → text.
  files: Readonly<Record<string, string>>;
  // The files that aren't valid UTF-8: their text holds one character a byte.
  binary?: readonly string[];
  // Their total, at most QUOTA.
  bytes: number;
};

export const NO_FILES: VisitorFiles = { folders: [], files: {}, bytes: 0 };

// The visitor's space: 1 MB (FR-073).
export const QUOTA = 1_048_576;

// `shell`: which shell shows the output, for the words that differ by shell
// (`help`'s lead).
export type RunRequest = { id: number; line: string; state: ShellState; history: readonly string[]; shell?: 'desktop' | 'mobile' };

// What a site command printed, and its block (research R29).
export type Recorded = { text: string; block: Block };

export type { Effect };

export type RunEnd = 'done' | 'exited' | 'limit' | 'syntax';
// `cancelled`: the visitor pressed Ctrl+C (FR-075).
export type Limit = 'time' | 'commands' | 'output' | 'cancelled';

export type RunResult = {
  id: number;
  stdout: string;
  stderr: string;
  status: number;
  // In the order they were printed.
  recorded: readonly Recorded[];
  // Applied by the interface after the line.
  effects: readonly Effect[];
  end: RunEnd;
  // When `end` is 'limit' (FR-069).
  limit?: Limit;
  // Unchanged when `end` is 'syntax', and from the last point it could be read
  // when 'limit' (T310).
  state: ShellState;
  // Only when the visitor's files changed.
  files?: VisitorFiles;
};

// Tab's request and answer (data-model.md Completion, research R43).
export type CompleteRequest = { id: number; line: string; cursor: number; state: ShellState };
// As listed: the last part of a path, a folder with its `/`.
export type CompletionMatch = { name: string; folder: boolean };
// Replace `line[start, end)` with `insert`, which is empty when nothing is
// added. `matches` are sorted in byte order and merged.
export type Completion = { id: number; start: number; end: number; insert: string; matches: readonly CompletionMatch[] };

// A write from the vim view (data-model.md Write request and outcome,
// research R49). `path` as typed or the buffer's, resolved from `cwd`.
export type WriteRequest = { id: number; path: string; text: string; force: boolean; cwd: string };
export type WriteOutcome =
  | { id: number; ok: true; path: string; created: boolean; lines: number; bytes: number; files: VisitorFiles }
  | { id: number; ok: false; error: 'exists' | 'cant-open' | 'full'; path: string };

// What the worker can't build alone: nothing on the site, a fixture CV in
// a test.
export type ShellData = Record<string, never>;

export type ToWorker =
  | { type: 'start'; data: ShellData }
  | { type: 'run'; request: RunRequest }
  | { type: 'restore'; state: ShellState; files: VisitorFiles }
  | { type: 'reset' }
  | { type: 'complete'; request: CompleteRequest }
  | { type: 'write'; request: WriteRequest };

export type FromWorker = { type: 'ready' } | { type: 'failed'; reason: string } | { type: 'result'; result: RunResult } | { type: 'completion'; completion: Completion } | { type: 'wrote'; outcome: WriteOutcome };
