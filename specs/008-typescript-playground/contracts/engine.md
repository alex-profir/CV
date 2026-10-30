# Contract: The Engine

The boundary between the Playground's interface, in the `os` script, and the engine, the bundle
downloaded on the first desktop open (research R2 to R4). The interface never imports the engine's
modules; it loads the engine through the loader and calls only what is below. `api: 1` names this
contract: a change that breaks it raises the number, and the loader then refuses older stored
engines (R4).

## Files

```text
<site>/playground/<engine-hash>/
├── files.json                 # EngineManifest (data-model.md)
├── engine-<hash>.js           # the entry: export const api = 1; export function createEngine
├── engine-<hash>.css          # Monaco's styles and ours (engine/editor.css)
├── editor.worker-<hash>.js    # Monaco's editor worker
├── ts.worker-<hash>.js        # our TypeScript worker (R6)
├── codicon-<hash>.ttf         # Monaco's icon font (R22)
└── …                          # any other chunk Vite writes; every file is listed in files.json
```

The shell page's `#os` carries `data-playground="/playground/<engine-hash>/files.json"` and
`data-playground-bytes="<total>"`, written by `renderShell` from the build (R3, R4).

## The loader (`src/apps/playground/engine/loader.ts`, in the `os` script)

```ts
type LoaderEvents = { onState(state: DownloadState): void };   // data-model.md Download state

function loadEngine(manifestPath: string, totalBytes: number, events: LoaderEvents, signal: AbortSignal):
  Promise<{ module: EngineModule; manifest: EngineManifest; kept: boolean }>;
```

- Resolves with the engine module once it is imported; rejects only when aborted (the window
  closed). Every failure becomes the `offline` state and a wait for Retry or `online`.
- Never imports a copy that isn't complete (FR-007, FR-011), and never loads anything from another
  site (FR-010).

## The module

```ts
type EngineModule = {
  api: 1;
  createEngine(init: EngineInit): Promise<Engine>;
};

type EngineInit = {
  code: string;                       // what the editor starts with
  options: ChangedOptions;
  cvTypes: string;                    // the CV declaration file (R10)
  globalsTypes: string;               // alert, prompt, confirm (R14)
  theme: EditorTheme;                 // colors and fonts from tokens.generated.ts (R22)
  text: EngineText;                   // site text the engine shows (below)
  mac: boolean;
  onChange(version: number): void;     // the model changed (for R7's pause and for keeping)
  onCheck(result: CheckResult): void;  // R7
  onCommand(id: 'playground.run' | 'playground.keys'): void;  // Run's key, accessibility help (R12)
};

type Engine = {
  typescript: string;                  // ts.version, from the worker (FR-012)
  // The editor
  mountEditor(element: HTMLElement, viewState: unknown | null, description: string): EditorView;
  mountOutput(element: HTMLElement, kind: 'javascript' | 'declarations'): OutputView;
  getCode(): string;
  replaceCode(code: string): void;     // one undoable edit (FR-027, FR-057, FR-080)
  setOptions(options: ChangedOptions): void;   // re-checks at once (FR-025)
  check(): void;                       // ask for a check now (R7)
  reveal(line: number, column: number): void;  // the Errors pane, an error's line (FR-022, FR-035)
  commands(): { id: string; label: string; keys: string[] }[];  // what the palette lists (FR-085)
  runCommand(id: string): void;         // the menu's Command palette, Format, …
  // Running (contracts/runner.md)
  run(input: RunInput, events: RunEvents): RunHandle;
  dispose(): void;
};

type EditorView = { saveViewState(): unknown; focus(): void; layout(): void; dispose(): void };
type OutputView = { setText(text: string): void; layout(): void; dispose(): void };
```

- `mountEditor` may be called again after `dispose` of the previous view: the model, its undo
  history and its markers stay (FR-005, FR-061).
- `EditorTheme` holds the syntax, surface, line-number, cursor, selection, occurrence, error,
  warning and widget colors, the code font, the gutter's width and the inset before the code (after
  the gutter, above the first line, and in the output panes), every one read from the token output by the interface; the engine has no design value
  of its own (FR-068).
- `EngineText` holds the packages message (R11), the editor's name and description, and the labels
  the engine adds to the palette (Run, Keys).

## Not in the contract

The engine doesn't render site text of its own beyond `EngineText`, doesn't touch the shell's
DOM outside the elements it is given, stores nothing, and makes no request but its own workers'
scripts, which come from its folder.
