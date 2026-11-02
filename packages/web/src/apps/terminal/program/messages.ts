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

export type FileChange = { path: string; text: string; binary?: true } | { path: string; removed: true } | { path: string; made: boolean };

// The latest of a path's file and of its folder, in the order they happened, so
// applying them in turn ends where the program did. Applied once, at the end.
export type FileChanges = readonly FileChange[];

// The most a program prints: 1 MB (FR-026, 006 FR-069).
export const OUTPUT_LIMIT = 1_048_576;

export const NO_CHANGES: FileChanges = [];

export type EndReason = 'exit' | 'uncaught' | 'type-error' | 'offline' | 'interrupted' | 'output' | 'memory' | 'died' | 'closed';

export type Stream = 'stdout' | 'stderr';

export type OutputChunk = { stream: Stream; text: string };

export type ProgramEnd = { status: number; reason: EndReason; changes: FileChanges };

export type ProgramEvents = {
  onOutput(chunks: readonly OutputChunk[]): void;
  onProgress(step: 0 | 1 | 2 | 3 | 4): void;
  onEnded(end: ProgramEnd): void;
};

export type ProgramHandle = { interrupt(): void; close(): void };

export type Compiled = Readonly<Record<string, { js: string; map: string; syntax?: { line: number; column: number; message: string } }>>;

export type WorkerMessage =
  | { out: Stream; text: string }
  | { sigint: boolean }
  | { file: string; text: string; binary?: true }
  | { file: string; removed: true }
  | { folder: string; made: boolean }
  | { exit: number; uncaught?: true }
  | { limit: 'output' };

// The file a program's script names, as Node looks for it (FR-001, FR-014): itself,
// with an extension, or a folder's `index`. A TypeScript program also finds `./b.js`
// for its `b.ts`, as TypeScript has it. Null if there is none.
export function resolveModuleFile(path: string, typed: boolean, kindOf: (path: string) => 'file' | 'folder' | undefined): string | null {
  if (kindOf(path) === 'file') return path;
  if (typed && /\.[mc]?js$/.test(path)) {
    const named = path.replace(/js$/, 'ts');
    if (kindOf(named) === 'file') return named;
  }
  for (const extension of ['.js', '.json', '.mjs', '.cjs', '.ts', '.mts', '.cts']) if (kindOf(`${path}${extension}`) === 'file') return `${path}${extension}`;
  if (kindOf(path) === 'folder') for (const name of ['index.js', 'index.json', 'index.mjs', 'index.ts']) if (kindOf(`${path}/${name}`) === 'file') return `${path}/${name}`;
  return null;
}

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
