// The Playground's data (data-model.md), as types only: read by the
// interface in the `os` script and by the engine, which imports nothing else
// from the interface (contracts/engine.md).
import type { ChangedOptions } from './compiler-options.ts';

export type { ChangedOptions };

// data-model.md TypeScript copy.
export type EngineManifest = {
  api: 1;
  version: string;
  typescript: string;
  entry: string;
  style: string;
  files: { path: string; bytes: number }[];
  total: number;
};

// data-model.md Download state.
export type DownloadState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'downloading'; received: number; total: number; announcedStep: 0 | 1 | 2 | 3 | 4 }
  | { kind: 'offline'; total: number; stopped: boolean; wontOpen?: boolean }
  | { kind: 'ready'; typescript: string; kept: boolean };

// data-model.md Diagnostic and check result.
export type Diagnostic = {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  message: string;
  code: number;
  category: 'error' | 'warning' | 'suggestion' | 'message';
};

export type CheckResult = {
  version: number;
  diagnostics: Diagnostic[];
  javascript: { text: string; map: string } | { none: 'noEmitOnError' };
  declarations: { text: string } | { none: 'declaration-off' | 'noEmitOnError' };
  imports: { line: number; column: number; specifier: string }[];
};

// data-model.md Log book.
export type Shown =
  | { t: 'str'; v: string }
  | { t: 'num' | 'bigint' | 'bool' | 'sym'; v: string }
  | { t: 'null' }
  | { t: 'undef' }
  | { t: 'fn'; name: string; cls: boolean }
  | { t: 'arr'; items: Shown[]; more: number }
  | { t: 'obj'; ctor: string | null; entries: [string, Shown][]; more: number }
  | { t: 'map'; entries: [Shown, Shown][]; more: number }
  | { t: 'set'; items: Shown[]; more: number }
  | { t: 'date'; v: string }
  // Text the formatter makes for a browser object, such as `/a+/g`.
  | { t: 'text'; v: string }
  | { t: 'err'; name: string; message: string }
  | { t: 'circ' }
  | { t: 'deep' };

export type NoteKey =
  | { key: 'noErrors' }
  | { key: 'errorsNote'; n: number }
  | { key: 'nothingRan'; reason: 'noEmitOnError' | 'packages' }
  | { key: 'cantRead'; n: number }
  | { key: 'prompt' | 'confirm' }
  | { key: 'closed' }
  | { key: 'ended'; outcome: RunOutcome };

export type LogEntry = {
  id: number;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug' | 'alert' | 'note';
  values: Shown[];
  line?: number;
  cut?: true;
  note?: NoteKey;
};

export type LogBook = { entries: LogEntry[]; dropped: number; newSinceAnnounce: number };

// data-model.md Run.
export type RunOutcome = { kind: 'finished' | 'stopped' | 'errors' | 'crashed' | 'nothing-ran'; ms: number; reason?: string; uncaught?: number; errors?: number };

export type Run = {
  id: number;
  startedAt: number;
  state: 'starting' | 'running' | 'waiting' | 'ended';
  pending: { timers: number; requests: number };
  blockedSince: number | null;
  stuck: 'no' | 'due' | 'shown' | 'kept-waiting';
  askAgainAt: number | null;
  uncaught: number;
  outcome: RunOutcome | null;
};

// data-model.md Shared link.
export type ReadLink =
  | { kind: 'none' }
  | { kind: 'app' }
  | { kind: 'code'; code: string; options: ChangedOptions; unknown: string[]; href: string }
  | { kind: 'broken'; href: string };

// data-model.md Message.
export type MessageKey =
  | 'linkCopied'
  | 'linkField'
  | 'tooLong'
  | 'brokenLink'
  | 'unknownOptions'
  | 'unknownKeptOptions'
  | 'sharedOpened'
  | 'sharedReplaced'
  | 'exampleReplaced'
  | 'resetDone'
  | 'cantKeepCode'
  | 'cantKeepTypeScript'
  | 'codeCopied';

export type MessageAction = 'undo' | 'run' | 'share-with' | 'copy-code' | 'retry';

export type Message = {
  kind: 'done' | 'warn' | 'error' | 'info';
  text: MessageKey;
  // The pattern's values, as `fill` takes them.
  values?: Record<string, string | number>;
  actions: MessageAction[];
  link?: string;
  // A counter, so the same message is announced again.
  id: number;
};

export type Pane = 'javascript' | 'declarations' | 'errors' | 'logs';
export type Panel = 'none' | 'options' | 'examples';
export type Popup = 'none' | 'stuck' | 'reset' | 'keys';
