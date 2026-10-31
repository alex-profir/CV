// The bundled TypeScript in Node (008 FR-075): the same TypeScript, library
// files, CV declaration and globals the Playground's worker uses, with the
// compiler options the engine sets, so a test's expected diagnostics, emit
// and quick info come from TypeScript itself, never from a hand-written copy.
import { typescript as ts } from 'monaco-editor/languages/features/typescript/lib/typescriptServices';
import { libFileMap } from 'monaco-editor/languages/features/typescript/lib/lib';
import { readCvTypes } from '../../scripts/cv-types.ts';
import { compilerOptions } from '../../src/apps/playground/compiler-options.ts';
import type { ChangedOptions } from '../../src/apps/playground/compiler-options.ts';
import { GLOBALS_TYPES } from '../../src/apps/playground/globals-types.ts';

export { ts };

export const CODE_FILE = 'file:///playground.ts';

export type Bundled = {
  // TypeScript's language service over the code alone.
  service: any;
  // The diagnostics the Playground shows: errors and warnings in the code's
  // file, with 1-based lines and columns, in line then column order.
  diagnostics(): { line: number; column: number; message: string; code: number }[];
  // What the panes show: the JavaScript (without its source-map comment) and
  // the declarations.
  emit(): { javascript: string; declarations: string | null };
  // An offset in the code, from a 1-based line and column.
  offset(line: number, column: number): number;
};

export function bundled(code: string, options: ChangedOptions = {}): Bundled {
  const files: Record<string, string> = {
    [CODE_FILE]: code,
    'file:///cv.d.ts': readCvTypes(),
    'file:///playground-globals.d.ts': GLOBALS_TYPES,
  };
  const settings = compilerOptions(options);
  const read = (name: string): string | undefined => files[name] ?? libFileMap[name.replace(/^.*\//, '')];
  const host = {
    getCompilationSettings: () => settings,
    getScriptFileNames: () => Object.keys(files),
    getScriptVersion: () => '1',
    getScriptSnapshot: (name: string) => {
      const text = read(name);
      return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
    },
    getCurrentDirectory: () => '',
    getDefaultLibFileName: () => 'lib.d.ts',
    fileExists: (name: string) => read(name) !== undefined,
    readFile: read,
    useCaseSensitiveFileNames: () => true,
  };
  const service = ts.createLanguageService(host, ts.createDocumentRegistry());
  const file = () => service.getProgram().getSourceFile(CODE_FILE);
  return {
    service,
    diagnostics() {
      const source = file();
      const raw = [...service.getSyntacticDiagnostics(CODE_FILE), ...service.getSemanticDiagnostics(CODE_FILE), ...service.getCompilerOptionsDiagnostics()];
      return raw
        .filter((entry: any) => entry.category === ts.DiagnosticCategory.Error || entry.category === ts.DiagnosticCategory.Warning)
        .filter((entry: any) => entry.file === undefined || entry.file.fileName === CODE_FILE)
        .map((entry: any) => {
          const { line, character } = source.getLineAndCharacterOfPosition(entry.start ?? 0);
          return { line: line + 1, column: character + 1, message: ts.flattenDiagnosticMessageText(entry.messageText, '\n'), code: entry.code };
        })
        .sort((a: { line: number; column: number }, b: { line: number; column: number }) => a.line - b.line || a.column - b.column);
    },
    emit() {
      const output = service.getEmitOutput(CODE_FILE);
      const js = output.outputFiles.find((out: any) => out.name.endsWith('.js'));
      const dts = output.outputFiles.find((out: any) => out.name.endsWith('.d.ts'));
      return { javascript: (js?.text ?? '').replace(/\n?\/\/# sourceMappingURL=.*\s*$/, '\n'), declarations: dts?.text ?? null };
    },
    offset(line: number, column: number) {
      return file().getPositionOfLineAndCharacter(line - 1, column - 1);
    },
  };
}
