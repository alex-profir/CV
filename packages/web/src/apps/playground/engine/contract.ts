// The engine's contract (contracts/engine.md, contracts/runner.md), as types
// only: the loader and the interface read them; the engine implements them.
import type { ChangedOptions, CheckResult, LogEntry, RunOutcome } from '../types.ts';

export type EditorTheme = {
  // Syntax colors by token class, and the surfaces, as `#rrggbb` or
  // `#rrggbbaa`, read from the token output by the interface.
  colors: {
    surface: string;
    text: string;
    keyword: string;
    type: string;
    function: string;
    property: string;
    string: string;
    number: string;
    comment: string;
    punctuation: string;
    lineNumber: string;
    lineNumberCurrent: string;
    currentLine: string;
    selection: string;
    occurrence: string;
    caret: string;
    error: string;
    warning: string;
    info: string;
    panel: string;
    raised: string;
    border: string;
    focus: string;
    widgetText: string;
    widgetTextSecondary: string;
  };
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  gutter: number;
};

export type EngineText = {
  editorName: string;
  packages: string;
  runCommand: string;
  keysCommand: string;
};

export type EngineCommand = 'playground.run' | 'playground.keys';

export type EngineInit = {
  code: string;
  options: ChangedOptions;
  cvTypes: string;
  globalsTypes: string;
  theme: EditorTheme;
  text: EngineText;
  mac: boolean;
  onChange(version: number): void;
  onCheck(result: CheckResult): void;
  onCommand(id: EngineCommand): void;
  onCursor?(position: { line: number; column: number }): void;
  onTabFocus?(on: boolean): void;
};

export type EditorView = { saveViewState(): unknown; focus(): void; layout(): void; dispose(): void };
export type OutputView = { setText(text: string): void; layout(): void; dispose(): void };

export type RunInput = { cv: unknown };

export type RunEvents = {
  // The code started, with the number of errors it has (FR-033).
  onStarted(info: { errors: number }): void;
  // A batch of entries; `cleared` when `console.clear` emptied the logs
  // before them (FR-034).
  onLogs(batch: { entries: LogEntry[]; dropped: number; cleared?: true }): void;
  onPending(pending: { timers: number; requests: number }): void;
  onBlocked(since: number | null): void;
  onEnded(outcome: RunOutcome): void;
};

export type RunHandle = { stop(): void };

export type Engine = {
  typescript: string;
  mountEditor(element: HTMLElement, viewState: unknown | null, description: string): EditorView;
  mountOutput(element: HTMLElement, kind: 'javascript' | 'declarations'): OutputView;
  getCode(): string;
  version(): number;
  replaceCode(code: string): void;
  undo(): void;
  setOptions(options: ChangedOptions): void;
  check(): void;
  reveal(line: number, column: number): void;
  commands(): { id: string; label: string; keys: string[] }[];
  runCommand(id: string): void;
  run(input: RunInput, events: RunEvents): RunHandle;
  dispose(): void;
};

export type EngineModule = { api: 1; createEngine(init: EngineInit): Promise<Engine> };
