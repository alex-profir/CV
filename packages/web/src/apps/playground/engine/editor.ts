// Monaco, set up as the Playground's editor (research R1, R6, R9, R10, R12,
// R14, R23): only the features FR-015 and FR-081 to FR-085 need, Monaco's
// TypeScript language features over our worker, one model for the code.
import { KeyCode, KeyMod, MarkerSeverity, Uri, editor, languages } from 'monaco-editor/editor';
import 'monaco-editor/languages/definitions/typescript/register';
import { getTypeScriptWorker, typescriptDefaults } from 'monaco-editor/languages/features/typescript/register';
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
import 'monaco-editor/features/smartSelect/register';
import 'monaco-editor/features/snippet/register';
import 'monaco-editor/features/suggest/register';
import 'monaco-editor/features/toggleTabFocusMode/register';
import 'monaco-editor/features/wordHighlighter/register';
import 'monaco-editor/features/wordOperations/register';
import 'monaco-editor/features/wordPartOperations/register';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import TsWorker from './ts.worker.ts?worker';
import { compilerOptions } from '../compiler-options.ts';
import type { ChangedOptions, CheckResult } from '../types.ts';
import type { EditorTheme, EditorView, EngineInit, OutputView } from './contract.ts';
import { THEME, defineTheme } from './theme.ts';

export const CODE_URI = Uri.parse('file:///playground.ts');

// A language for the output panes: TypeScript's colors with no language
// service, so their text is never checked as code.
const OUTPUT_LANGUAGE = 'playground-output';

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
  getRunnable(fileName: string): Promise<{ code: string; map: string; imports: number; errors: number } | null>;
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
    { content: init.globalsTypes, filePath: 'file:///playground.d.ts' },
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
  let checking: Promise<void> | null = null;
  let again = false;

  model.onDidChangeContent(() => init.onChange(model.getVersionId()));

  const worker = async (): Promise<WorkerProxy> => {
    const get = await getTypeScriptWorker();
    return (await get(model.uri)) as unknown as WorkerProxy;
  };

  async function checkOnce(): Promise<void> {
    const result = await (await worker()).getCheck(CODE_URI.toString(), init.text.packages);
    if (result === null || model.isDisposed()) return;
    if (result.version === model.getVersionId()) {
      editor.setModelMarkers(
        model,
        'playground',
        result.diagnostics.map((entry) => ({ startLineNumber: entry.line, startColumn: entry.column, endLineNumber: entry.endLine, endColumn: Math.max(entry.endColumn, entry.column + (entry.endLine === entry.line ? 1 : 0)), message: entry.message, code: entry.code === 0 ? undefined : `TS${entry.code}`, severity: SEVERITY[entry.category] ?? MarkerSeverity.Error, source: 'ts' })),
      );
    }
    init.onCheck(result);
  }

  // One check at a time; a change while one is out queues one more (R7).
  function check(): void {
    if (checking !== null) {
      again = true;
      return;
    }
    checking = checkOnce()
      .catch(() => undefined)
      .finally(() => {
        checking = null;
        if (again) {
          again = false;
          check();
        }
      });
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
      lineDecorationsWidth: 8,
      lineNumbersMinChars: 3,
      glyphMargin: false,
      folding: true,
      scrollBeyondLastLine: false,
      renderLineHighlight: 'all',
      cursorBlinking: 'solid',
      fixedOverflowWidgets: false,
      lightbulb: { enabled: editor.ShowLightbulbIconMode.OnCode },
      tabSize: 2,
      insertSpaces: true,
      stickyScroll: { enabled: false },
      'semanticHighlighting.enabled': false,
    });
    view = created;
    const input = created.getDomNode()?.querySelector('textarea');
    input?.setAttribute('aria-describedby', describedBy);
    created.addAction({ id: 'playground.run', label: init.text.runCommand, keybindings: [KeyMod.CtrlCmd | KeyCode.Enter], run: () => init.onCommand('playground.run') });
    created.addAction({ id: 'playground.keys', label: init.text.keysCommand, keybindings: [KeyMod.Alt | KeyCode.F1], run: () => init.onCommand('playground.keys') });
    if (viewState !== null) created.restoreViewState(viewState as editor.ICodeEditorViewState);
    created.onDidChangeCursorPosition((event) => init.onCursor?.({ line: event.position.lineNumber, column: event.position.column }));
    created.onDidChangeConfiguration((event) => {
      if (event.hasChanged(editor.EditorOption.tabFocusMode)) init.onTabFocus?.(created.getOption(editor.EditorOption.tabFocusMode));
    });
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
      lineDecorationsWidth: 8,
      scrollBeyondLastLine: false,
      renderLineHighlight: 'none',
      editContext: false,
      contextmenu: false,
      stickyScroll: { enabled: false },
      'semanticHighlighting.enabled': false,
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
    view?.setPosition({ lineNumber: 1, column: 1 });
  }

  function setOptions(options: ChangedOptions): void {
    typescriptDefaults.setCompilerOptions(compilerOptions(options) as never);
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
      model.dispose();
    },
  };
}
