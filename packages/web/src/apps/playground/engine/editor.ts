// Monaco, set up as the Playground's editor (research R1, R6, R9, R10, R12,
// R14, R23): only the features FR-015 and FR-081 to FR-085 need, Monaco's
// TypeScript language features over our worker, one model for the code.
// Monaco's TypeScript features first: through their worker manager they
// register every editor contribution and its services, which must happen
// before `monaco-editor/editor` starts the editor's services, or a
// contribution finds its service missing.
import { getTypeScriptWorker, typescriptDefaults } from 'monaco-editor/languages/features/typescript/register';
import 'monaco-editor/languages/definitions/typescript/register';
import { KeyCode, KeyMod, MarkerSeverity, Uri, editor, languages } from 'monaco-editor/editor';
import { conf, language } from 'monaco-editor/languages/definitions/typescript/typescript';
import 'monaco-editor/features/anchorSelect/register';
import 'monaco-editor/features/bracketMatching/register';
import 'monaco-editor/features/caretOperations/register';
import 'monaco-editor/features/clipboard/register';
import 'monaco-editor/features/codeAction/register';
import 'monaco-editor/features/codicon/register';
import 'monaco-editor/features/comment/register';
import 'monaco-editor/features/contextmenu/register';
import 'monaco-editor/features/cursorUndo/register';
import 'monaco-editor/features/documentSymbols/register';
import 'monaco-editor/features/find/register';
import 'monaco-editor/features/folding/register';
import 'monaco-editor/features/format/register';
import 'monaco-editor/features/gotoError/register';
import 'monaco-editor/features/gotoLine/register';
import 'monaco-editor/features/gotoSymbol/register';
import 'monaco-editor/features/hover/register';
import 'monaco-editor/features/indentation/register';
import 'monaco-editor/features/lineSelection/register';
import 'monaco-editor/features/linesOperations/register';
import 'monaco-editor/features/multicursor/register';
import 'monaco-editor/features/parameterHints/register';
import 'monaco-editor/features/quickCommand/register';
import 'monaco-editor/features/quickHelp/register';
import 'monaco-editor/features/quickOutline/register';
import 'monaco-editor/features/readOnlyMessage/register';
import 'monaco-editor/features/referenceSearch/register';
import 'monaco-editor/features/rename/register';
import 'monaco-editor/features/semanticTokens/register';
import 'monaco-editor/features/smartSelect/register';
import 'monaco-editor/features/snippet/register';
import 'monaco-editor/features/suggest/register';
import 'monaco-editor/features/toggleTabFocusMode/register';
import 'monaco-editor/features/wordHighlighter/register';
import 'monaco-editor/features/wordOperations/register';
import 'monaco-editor/features/wordPartOperations/register';
// Tab moving focus is one setting for every editor of the page; the
// editor's option doesn't report its changes, so its emitter is read.
import { TabFocus } from 'monaco-editor/editor/browser/config/tabFocus';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import TsWorker from './ts.worker.ts?worker';
import type { Runnable } from './ts.worker.ts';
import { compilerOptions } from '../compiler-options.ts';
import type { ChangedOptions, CheckResult } from '../types.ts';
import { mendListAria } from './aria.ts';
import type { EditorTheme, EditorView, EngineInit, OutputView } from './contract.ts';
import { THEME, defineTheme } from './theme.ts';

export const CODE_URI = Uri.parse('file:///playground.ts');

// A language for the output panes: TypeScript's colors with no language
// service, so their text is never checked as code.
const OUTPUT_LANGUAGE = 'playground-output';

// How long a check may stay out before it counts as lost.
const CHECK_LIMIT_MS = 15_000;

let set = false;

// Monaco's workers, from the engine's own folder (research R3, R6).
function setUp(theme: EditorTheme): void {
  if (set) return;
  set = true;
  (globalThis as { MonacoEnvironment?: unknown }).MonacoEnvironment = {
    getWorker: (_id: string, label: string) => (label === 'typescript' || label === 'javascript' ? new TsWorker({ name: label }) : new EditorWorker({ name: label })),
  };
  languages.register({ id: OUTPUT_LANGUAGE });
  languages.setLanguageConfiguration(OUTPUT_LANGUAGE, conf as languages.LanguageConfiguration);
  languages.setMonarchTokensProvider(OUTPUT_LANGUAGE, language as languages.IMonarchLanguage);
  defineTheme(theme);
}

type WorkerProxy = {
  getCheck(fileName: string, packagesMessage: string): Promise<CheckResult | null>;
  getNameKinds(fileName: string, start: number, length: number): Promise<number[]>;
  getRunnable(fileName: string): Promise<Runnable | null>;
  getVersion(): Promise<string>;
};

const SEVERITY: Record<string, MarkerSeverity> = { error: MarkerSeverity.Error, warning: MarkerSeverity.Warning };

export type Editing = ReturnType<typeof createEditing>;

export function createEditing(init: EngineInit) {
  setUp(init.theme);
  typescriptDefaults.setEagerModelSync(true);
  typescriptDefaults.setCompilerOptions(compilerOptions(init.options) as never);
  typescriptDefaults.setExtraLibs([
    { content: init.cvTypes, filePath: 'file:///cv.d.ts' },
    { content: init.globalsTypes, filePath: 'file:///playground-globals.d.ts' },
  ]);
  // Our markers come from getCheck (R7).
  typescriptDefaults.setModeConfiguration({
    completionItems: true,
    hovers: true,
    documentSymbols: true,
    definitions: true,
    references: true,
    documentHighlights: true,
    rename: true,
    diagnostics: false,
    documentRangeFormattingEdits: true,
    signatureHelp: true,
    onTypeFormattingEdits: true,
    codeActions: true,
    inlayHints: false,
  });
  const model = editor.getModel(CODE_URI) ?? editor.createModel(init.code, 'typescript', CODE_URI);
  model.updateOptions({ tabSize: 2, insertSpaces: true });
  let view: editor.IStandaloneCodeEditor | null = null;
  let checking: symbol | null = null;
  let optionsSet = JSON.stringify(compilerOptions(init.options));
  let again = false;

  model.onDidChangeContent(() => init.onChange(model.getVersionId()));

  // Names colored by what TypeScript knows they are (FR-068): the theme's
  // `function`, `property` and `type` rules, for what the tokenizer can't
  // tell from the text alone. TypeScript's 2020 kinds, by their number.
  const NAME_KINDS = ['type', 'type', 'type', 'type', 'type', 'type', 'parameter', 'variable', 'property', 'property', 'function', 'function'];
  const legend = { tokenTypes: [...new Set(NAME_KINDS)], tokenModifiers: [] };
  const names = languages.registerDocumentRangeSemanticTokensProvider('typescript', {
    getLegend: () => legend,
    provideDocumentRangeSemanticTokens: async (asked, range) => {
      if (asked.uri.toString() !== model.uri.toString()) return null;
      const version = asked.getVersionId();
      const start = asked.getOffsetAt(range.getStartPosition());
      const spans = await (await worker()).getNameKinds(asked.uri.toString(), start, asked.getOffsetAt(range.getEndPosition()) - start);
      if (asked.isDisposed() || asked.getVersionId() !== version) return null;
      const data: number[] = [];
      let lastLine = 0;
      let lastColumn = 0;
      for (let at = 0; at + 2 < spans.length; at += 3) {
        const kind = NAME_KINDS[(spans[at + 2]! >> 8) - 1];
        if (kind === undefined) continue;
        const where = asked.getPositionAt(spans[at]!);
        const line = where.lineNumber - 1;
        const column = where.column - 1;
        data.push(line - lastLine, line === lastLine ? column - lastColumn : column, spans[at + 1]!, legend.tokenTypes.indexOf(kind), 0);
        lastLine = line;
        lastColumn = column;
      }
      return { data: new Uint32Array(data) };
    },
  });

  const worker = async (): Promise<WorkerProxy> => {
    const get = await getTypeScriptWorker();
    return (await get(model.uri)) as unknown as WorkerProxy;
  };

  // Whether a result came.
  async function checkOnce(asked: symbol): Promise<boolean> {
    const result = await (await worker()).getCheck(CODE_URI.toString(), init.text.packages);
    if (asked !== checking || model.isDisposed()) return true;
    if (result === null) return false;
    if (result.version === model.getVersionId()) {
      editor.setModelMarkers(
        model,
        'playground',
        result.diagnostics.map((entry) => ({ startLineNumber: entry.line, startColumn: entry.column, endLineNumber: entry.endLine, endColumn: Math.max(entry.endColumn, entry.column + (entry.endLine === entry.line ? 1 : 0)), message: entry.message, code: entry.code === 0 ? undefined : String(entry.code), severity: SEVERITY[entry.category] ?? MarkerSeverity.Error, source: 'ts' })),
      );
    }
    init.onCheck(result);
    return true;
  }

  // One check at a time; a change while one is out queues one more (R7). A
  // check on a worker that restarted may never settle, so one that takes too
  // long is given up as lost, and one that was left behind is ignored.
  function check(): void {
    if (checking !== null) {
      again = true;
      return;
    }
    const mine = (checking = Symbol('check'));
    const settled = (came: boolean) => {
      if (checking !== mine) return;
      clearTimeout(limit);
      checking = null;
      if (!came) init.onCheckLost();
      if (again) {
        again = false;
        check();
      }
    };
    const limit = setTimeout(() => settled(false), CHECK_LIMIT_MS);
    void checkOnce(mine)
      .catch(() => false)
      .then(settled);
  }

  function mountEditor(element: HTMLElement, viewState: unknown | null, description: string): EditorView {
    const describedBy = `playground-editor-description-${Math.random().toString(36).slice(2)}`;
    const note = document.createElement('p');
    note.id = describedBy;
    note.hidden = true;
    note.textContent = description;
    element.append(note);
    const created = editor.create(element, {
      model,
      theme: THEME,
      ariaLabel: init.text.editorName,
      accessibilitySupport: 'on',
      editContext: false,
      automaticLayout: true,
      minimap: { enabled: false },
      fontFamily: init.theme.fontFamily,
      fontSize: init.theme.fontSize,
      lineHeight: init.theme.lineHeight,
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 3,
      padding: { top: init.theme.inset },
      // The gutter holds the lightbulb, before the line numbers (FR-082).
      glyphMargin: true,
      // Folding by its keys and the palette: the design's gutter draws no
      // folding controls.
      folding: true,
      showFoldingControls: 'never',
      scrollBeyondLastLine: false,
      renderLineHighlight: 'all',
      cursorBlinking: 'solid',
      fixedOverflowWidgets: false,
      lightbulb: { enabled: editor.ShowLightbulbIconMode.OnCode },
      tabSize: 2,
      insertSpaces: true,
      stickyScroll: { enabled: false },
      // A setting Monaco keeps for every editor: the output panes' language
      // has no provider, so it colors only the code.
      'semanticHighlighting.enabled': true,
    });
    view = created;
    // The gutter is the design's width, the lightbulb's lane and the line
    // numbers, and the code starts the inset after it; refitted as the
    // numbers grow or the font loads.
    const fitGutter = () => {
      const layout = created.getLayoutInfo();
      const rest = Math.max(0, init.theme.gutter + init.theme.inset - layout.glyphMarginWidth - layout.lineNumbersWidth);
      if (rest !== layout.decorationsWidth) created.updateOptions({ lineDecorationsWidth: rest });
    };
    fitGutter();
    created.onDidLayoutChange(fitGutter);
    const input = created.getDomNode()?.querySelector('textarea');
    input?.setAttribute('aria-describedby', describedBy);
    // Keys a browser keeps (R12, FR-084): Ctrl+Shift+P opens Firefox's private
    // window, Ctrl+L the address bar in every browser. And VoiceOver keeps
    // Ctrl+Option with the arrows on a Mac.
    editor.addKeybindingRules([
      { keybinding: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyP, command: '-editor.action.quickCommand' },
      { keybinding: KeyMod.CtrlCmd | KeyCode.KeyL, command: '-expandLineSelection' },
      { keybinding: KeyMod.WinCtrl | KeyMod.Alt | KeyCode.LeftArrow, command: '-cursorWordPartLeft' },
      { keybinding: KeyMod.WinCtrl | KeyMod.Alt | KeyCode.RightArrow, command: '-cursorWordPartRight' },
    ]);
    created.addAction({ id: 'playground.run', label: init.text.runCommand, keybindings: [KeyMod.CtrlCmd | KeyCode.Enter], run: () => init.onCommand('playground.run') });
    created.addAction({ id: 'playground.keys', label: init.text.keysCommand, keybindings: [KeyMod.Alt | KeyCode.F1], run: () => init.onCommand('playground.keys') });
    if (viewState !== null) created.restoreViewState(viewState as editor.ICodeEditorViewState);
    created.onDidChangeCursorPosition((event) => init.onCursor?.({ line: event.position.lineNumber, column: event.position.column }));
    // The message of the first mark on the cursor's line, after the line,
    // as the design shows it (FR-016).
    const inline = created.createDecorationsCollection();
    const showInline = () => {
      const line = created.getPosition()?.lineNumber;
      const mark = line === undefined ? undefined : editor.getModelMarkers({ resource: model.uri, owner: 'playground' }).find((entry) => entry.startLineNumber === line);
      if (line === undefined || mark === undefined) return inline.clear();
      const end = model.getLineMaxColumn(line);
      inline.set([
        {
          range: { startLineNumber: line, startColumn: end, endLineNumber: line, endColumn: end },
          options: { showIfCollapsed: true, after: { content: mark.message.split('\n')[0]!, inlineClassName: mark.severity === MarkerSeverity.Warning ? 'playground-inline-message is-warning' : 'playground-inline-message' } },
        },
      ]);
    };
    created.onDidChangeCursorPosition(showInline);
    const markers = editor.onDidChangeMarkers((uris) => {
      if (uris.some((uri) => uri.toString() === model.uri.toString())) showInline();
    });
    const tabFocus = TabFocus.onDidChangeTabFocus((on) => init.onTabFocus?.(on));
    const unmend = mendListAria(element.closest('.playground') ?? element);
    created.onDidDispose(() => {
      unmend();
      markers.dispose();
      tabFocus.dispose();
    });
    showInline();
    return {
      saveViewState: () => created.saveViewState(),
      focus: () => created.focus(),
      layout: () => created.layout(),
      dispose: () => {
        if (view === created) view = null;
        created.dispose();
        note.remove();
      },
    };
  }

  function mountOutput(element: HTMLElement, kind: 'javascript' | 'declarations'): OutputView {
    const output = editor.createModel('', OUTPUT_LANGUAGE, Uri.parse(`playground-output:///${kind}-${Math.random().toString(36).slice(2)}`));
    const created = editor.create(element, {
      model: output,
      theme: THEME,
      readOnly: true,
      domReadOnly: true,
      ariaLabel: kind,
      lineNumbers: 'off',
      minimap: { enabled: false },
      automaticLayout: true,
      fontFamily: init.theme.fontFamily,
      fontSize: init.theme.fontSize,
      lineHeight: init.theme.lineHeight,
      folding: false,
      glyphMargin: false,
      lineDecorationsWidth: init.theme.inset,
      scrollBeyondLastLine: false,
      renderLineHighlight: 'none',
      editContext: false,
      contextmenu: false,
      stickyScroll: { enabled: false },
    });
    return {
      setText: (text) => {
        if (output.getValue() !== text) output.setValue(text);
      },
      layout: () => created.layout(),
      dispose: () => {
        created.dispose();
        output.dispose();
      },
    };
  }

  function replaceCode(code: string): void {
    model.pushStackElement();
    model.pushEditOperations([], [{ range: model.getFullModelRange(), text: code }], () => null);
    model.pushStackElement();
    // The old code's marks don't belong to the new code: none shows until
    // its own check comes back.
    editor.setModelMarkers(model, 'playground', []);
    view?.setPosition({ lineNumber: 1, column: 1 });
  }

  function setOptions(options: ChangedOptions): void {
    // Setting them restarts the worker, so only when they differ, and a check
    // out on the old worker gives way to one with the new options.
    const key = JSON.stringify(compilerOptions(options));
    if (key !== optionsSet) {
      optionsSet = key;
      typescriptDefaults.setCompilerOptions(compilerOptions(options) as never);
      checking = null;
    }
    check();
  }

  function reveal(line: number, column: number): void {
    if (view === null) return;
    view.setPosition({ lineNumber: line, column });
    view.revealPositionInCenterIfOutsideViewport({ lineNumber: line, column });
    view.focus();
  }

  type KeybindingService = { lookupKeybinding(id: string): { getLabel(): string | null } | undefined };

  function commands(): { id: string; label: string; keys: string[] }[] {
    if (view === null) return [];
    const keys = (view as unknown as { _standaloneKeybindingService?: KeybindingService })._standaloneKeybindingService;
    return view
      .getSupportedActions()
      .map((action) => ({ id: action.id, label: action.label, keys: [keys?.lookupKeybinding(action.id)?.getLabel() ?? ''].filter((key) => key !== '') }))
      .filter((action) => action.label !== '');
  }

  function runCommand(id: string): void {
    if (view === null) return;
    view.focus();
    const action = view.getAction(id);
    if (action !== null) void action.run();
    else view.trigger('playground', id, null);
  }

  return {
    model,
    worker,
    check,
    mountEditor,
    mountOutput,
    replaceCode,
    setOptions,
    reveal,
    commands,
    runCommand,
    undo: () => (view !== null ? view.trigger('playground', 'undo', null) : void model.undo()),
    getCode: () => model.getValue(),
    version: () => model.getVersionId(),
    dispose: () => {
      view?.dispose();
      names.dispose();
      model.dispose();
    },
  };
}
