// The compile mode of the engine's TypeScript worker (009 research R12,
// contracts/program.md): given the visitor's files and a root, the root's program's
// diagnostics under strict options when asked to check, and JavaScript with a source
// map for every TypeScript file. It parses and checks, and never runs anything.
// TypeScript is given to it, so a test can give it the same one in Node.

export type CompileRequest = { root: string; mode: 'check' | 'strip'; files: Readonly<Record<string, string>> };

export type CompileDiagnostic = { file: string; line: number; column: number; code: number; message: string };

export type CompileResult = { diagnostics: CompileDiagnostic[]; outputs: Record<string, { js: string; map: string }> };

// The compiler's types come with the TypeScript it is given, whichever that is.
type Ts = any;

export const NODE_TYPES = '/node-runtime/node.d.ts';

const TS_FILE = /\.[mc]?ts$/;
const DECLARATIONS = /\.d\.[mc]?ts$/;

function outputOf(ts: Ts, path: string, text: string): { js: string; map: string } {
  const { outputText, sourceMapText } = ts.transpileModule(text, {
    fileName: path,
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, sourceMap: true, inlineSources: false, removeComments: false },
  });
  return { js: outputText as string, map: (sourceMapText as string | undefined) ?? '' };
}

function checked(ts: Ts, libFiles: Readonly<Record<string, string>>, { root, files }: CompileRequest): CompileDiagnostic[] {
  if (files[root] === undefined) return [];
  const options = {
    strict: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2023,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowImportingTsExtensions: true,
    esModuleInterop: true,
    allowJs: true,
    checkJs: true,
    skipLibCheck: true,
    types: [],
    lib: ['lib.es2023.d.ts'],
  };
  const read = (name: string): string | undefined => files[name] ?? libFiles[name.replace(/^.*\//, '')];
  const folders = new Set(Object.keys(files).flatMap((path) => path.split('/').slice(1, -1).map((_, at, parts) => `/${parts.slice(0, at + 1).join('/')}`)));
  const host = {
    getSourceFile: (name: string, version: unknown) => {
      const text = read(name);
      return text === undefined ? undefined : ts.createSourceFile(name, text, version, true);
    },
    getDefaultLibFileName: () => '/lib/lib.es2023.d.ts',
    getDefaultLibLocation: () => '/lib',
    writeFile: () => undefined,
    getCurrentDirectory: () => '/',
    getCanonicalFileName: (name: string) => name,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    fileExists: (name: string) => read(name) !== undefined,
    readFile: read,
    directoryExists: (name: string) => name === '/' || folders.has(name),
    getDirectories: () => [],
  };
  const program = ts.createProgram({ rootNames: [root, NODE_TYPES], options, host });
  const found: any[] = [...program.getOptionsDiagnostics(), ...program.getGlobalDiagnostics(), ...program.getSyntacticDiagnostics(), ...program.getSemanticDiagnostics()];
  const diagnostics: CompileDiagnostic[] = [];
  for (const each of found) {
    if (each.category !== ts.DiagnosticCategory.Error) continue;
    const file: string = each.file?.fileName ?? root;
    if (file === NODE_TYPES) continue;
    const at = each.file === undefined ? { line: 0, character: 0 } : ts.getLineAndCharacterOfPosition(each.file, each.start ?? 0);
    diagnostics.push({ file, line: at.line + 1, column: at.character + 1, code: each.code, message: ts.flattenDiagnosticMessageText(each.messageText, '\n') });
  }
  return diagnostics;
}

export function compile(ts: Ts, libFiles: Readonly<Record<string, string>>, request: CompileRequest): CompileResult {
  const outputs: CompileResult['outputs'] = {};
  for (const [path, text] of Object.entries(request.files)) if (TS_FILE.test(path) && !DECLARATIONS.test(path) && path !== NODE_TYPES) outputs[path] = outputOf(ts, path, text);
  return { diagnostics: request.mode === 'check' ? checked(ts, libFiles, request) : [], outputs };
}
