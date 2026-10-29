// The messages between the Terminal's interface and its shell worker, and
// the data they carry (006 contracts/shell-worker.md Messages, data-model.md
// Shell state, Terminal file system, Run request and result). Types only:
// both sides import them, and the worker sends back data, never markup
// (research R39).
import type { Block, Effect } from '../engine/block.ts';

// `set -o` options the adapter carries from line to line (research R27).
export type ShellOption = 'errexit' | 'nounset' | 'pipefail' | 'noglob' | 'noclobber' | 'xtrace';

// What the shell keeps between lines, since just-bash resets it after each
// run (research R27, G4).
export type ShellState = {
  cwd: string;
  // Shell variables, without the shell's own (PWD, IFS…).
  variables: Readonly<Record<string, string>>;
  exported: readonly string[];
  // Name → its definition, serialized.
  functions: Readonly<Record<string, string>>;
  options: readonly ShellOption[];
  // `$?` after the last line.
  status: number;
};

export const INITIAL_STATE: ShellState = { cwd: '/home/guest', variables: {}, exported: [], functions: {}, options: [], status: 0 };

export type Owner = 'root' | 'guest';
export type FsEntryInfo = { path: string; kind: 'file' | 'folder'; owner: Owner; protected: boolean };

// The visitor's files, as the interface keeps them for a restarted worker
// (research R26).
export type VisitorFiles = {
  // Absolute paths, parents first.
  folders: readonly string[];
  // Absolute path → text.
  files: Readonly<Record<string, string>>;
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
  // Unchanged when `end` is 'syntax' or 'limit'.
  state: ShellState;
  // Only when the visitor's files changed.
  files?: VisitorFiles;
};

// What the worker can't build alone: nothing on the site, a fixture CV in
// a test.
export type ShellData = Record<string, never>;

export type ToWorker =
  | { type: 'start'; data: ShellData }
  | { type: 'run'; request: RunRequest }
  | { type: 'restore'; state: ShellState; files: VisitorFiles }
  | { type: 'reset' };

export type FromWorker = { type: 'ready' } | { type: 'failed'; reason: string } | { type: 'result'; result: RunResult };
