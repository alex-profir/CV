// What a program's parts say to each other (009 contracts/program.md,
// data-model.md). The worker runs the visitor's code, so the page checks every
// field of what it sends: nothing it says reaches the session unchecked.

export type ProgramCommand = 'node' | 'ts-node';

// What the visitor can read. For a `binary` file, `text` holds one character a
// byte, as `VisitorFiles` does.
export type SnapshotEntry = { path: string; kind: 'file' | 'folder'; owner: 'root' | 'guest'; protected: boolean; text?: string; binary?: true };

export type FileSnapshot = { entries: readonly SnapshotEntry[]; bytes: number };

export type ProgramRequest = {
  command: ProgramCommand;
  // Absolute, or null with `-e` or `-p`.
  script: string | null;
  code: string | null;
  print: boolean;
  args: readonly string[];
  cwd: string;
  env: Readonly<Record<string, string>>;
  files: FileSnapshot;
};

export type FileChange = { text: string; binary?: true } | { removed: true };

// Per path, the latest; applied once, at the end.
export type FileChanges = { files: Readonly<Record<string, FileChange>>; folders: readonly { path: string; made: boolean }[] };

// The most a program prints: 1 MB (FR-026, 006 FR-069).
export const OUTPUT_LIMIT = 1_048_576;

export const NO_CHANGES: FileChanges = { files: {}, folders: [] };

export type EndReason = 'exit' | 'uncaught' | 'type-error' | 'interrupted' | 'output' | 'memory' | 'died' | 'closed';

export type Stream = 'stdout' | 'stderr';

export type OutputChunk = { stream: Stream; text: string };

export type ProgramEnd = { status: number; reason: EndReason; changes: FileChanges };

export type ProgramEvents = {
  onOutput(chunks: readonly OutputChunk[]): void;
  onProgress(step: 0 | 1 | 2 | 3 | 4): void;
  onEnded(end: ProgramEnd): void;
};

export type ProgramHandle = { interrupt(): void; close(): void };

export type Compiled = Readonly<Record<string, { js: string; map: string }>>;

export type WorkerMessage =
  | { out: Stream; text: string }
  | { sigint: boolean }
  | { file: string; text: string; binary?: true }
  | { file: string; removed: true }
  | { folder: string; made: boolean }
  | { exit: number; uncaught?: true }
  | { limit: 'output' };

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

// A message the runtime could have made, or null. Nothing else gets through.
export function workerMessage(value: unknown): WorkerMessage | null {
  if (!isRecord(value)) return null;
  if (value['out'] === 'stdout' || value['out'] === 'stderr') return typeof value['text'] === 'string' ? { out: value['out'], text: value['text'] } : null;
  if (typeof value['sigint'] === 'boolean') return { sigint: value['sigint'] };
  if (typeof value['file'] === 'string') {
    if (value['removed'] === true) return { file: value['file'], removed: true };
    if (typeof value['text'] !== 'string') return null;
    return value['binary'] === true ? { file: value['file'], text: value['text'], binary: true } : { file: value['file'], text: value['text'] };
  }
  if (typeof value['folder'] === 'string') return typeof value['made'] === 'boolean' ? { folder: value['folder'], made: value['made'] } : null;
  if (typeof value['exit'] === 'number' && Number.isFinite(value['exit'])) return value['uncaught'] === true ? { exit: value['exit'], uncaught: true } : { exit: value['exit'] };
  if (value['limit'] === 'output') return { limit: 'output' };
  return null;
}

// A process's status: the low eight bits of its code.
export const statusOf = (code: number): number => Math.trunc(code) & 255;
