// Our TypeScript worker (research R6, R11, R13): Monaco's, subclassed, so its
// language features run unchanged and three things are ours: one call for
// the panes and the marks (`getCheck`), the code to run (`getRunnable`), and
// quick fixes without imports (FR-082).
import { initialize } from 'monaco-editor/internal/common/initialize';
import { TypeScriptWorker } from 'monaco-editor/languages/features/typescript/tsWorker';
import { typescript as ts } from 'monaco-editor/languages/features/typescript/lib/typescriptServices';
import type { CheckResult, Diagnostic } from '../types.ts';

type Import = { start: number; end: number; specifier: string };

// The code to run (R13): its script body and map, how many imports and
// errors it has, and whether TypeScript gave no JavaScript (`noEmitOnError`).
export type Runnable = { code: string; map: string; imports: number; errors: number; skipped: boolean };

// TypeScript's own errors for what an import names, dropped where the
// packages message stands (R11): cannot find module, cannot find name
// 'require', a dynamic import's module option, and the like.
const IMPORT_ERRORS = new Set([2306, 2307, 2580, 2591, 2792, 1323, 1324, 2875, 7016]);

const CATEGORY: Record<number, Diagnostic['category']> = { 0: 'warning', 1: 'error', 2: 'suggestion', 3: 'message' };

// Every place the code imports something (R11): import and export-from
// declarations with a specifier, `import x = require(…)`, `import(…)` calls,
// and calls to a `require` the code doesn't declare.
function findImports(file: any): Import[] {
  const found: Import[] = [];
  const declaresRequire = file.locals?.has?.('require') === true;
  const visit = (node: any): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined) {
      const specifier = node.moduleSpecifier;
      found.push({ start: specifier.getStart(file), end: specifier.getEnd(), specifier: ts.isStringLiteral(specifier) ? specifier.text : specifier.getText(file) });
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      const expression = node.moduleReference.expression;
      found.push({ start: expression.getStart(file), end: expression.getEnd(), specifier: ts.isStringLiteral(expression) ? expression.text : expression.getText(file) });
    } else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (!declaresRequire && ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      const argument = node.arguments[0];
      const target = argument ?? node;
      found.push({ start: target.getStart(file), end: target.getEnd(), specifier: argument !== undefined && ts.isStringLiteralLike(argument) ? argument.text : target.getText(file) });
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

// Removes `export` from declarations and drops `export {}`, so the
// JavaScript is a plain script body (R13). What `export default` holds still
// runs: with no name, a function or class has to be an expression there, since
// a declaration in a script body needs one.
function stripExports(): any {
  return (context: any) => (file: any) => {
    const { factory } = context;
    const asExpression = (statement: any, expression: any) => ts.setSourceMapRange(ts.setTextRange(factory.createExpressionStatement(factory.createParenthesizedExpression(expression)), statement), statement);
    const statements = file.statements.flatMap((statement: any) => {
      if (ts.isExportDeclaration(statement)) return [];
      if (ts.isExportAssignment(statement)) return [asExpression(statement, statement.expression)];
      const own = (statement.modifiers ?? []).filter((modifier: any) => modifier.kind !== ts.SyntaxKind.ExportKeyword && modifier.kind !== ts.SyntaxKind.DefaultKeyword);
      if (ts.isFunctionDeclaration(statement) && statement.name === undefined) return [asExpression(statement, factory.createFunctionExpression(own, statement.asteriskToken, undefined, statement.typeParameters, statement.parameters, statement.type, statement.body))];
      if (ts.isClassDeclaration(statement) && statement.name === undefined) return [asExpression(statement, factory.createClassExpression(own, undefined, statement.typeParameters, statement.heritageClauses, statement.members))];
      const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
      if (modifiers === undefined || !modifiers.some((modifier: any) => modifier.kind === ts.SyntaxKind.ExportKeyword)) return [statement];
      return [ts.factory.replaceModifiers(statement, own)];
    });
    return context.factory.updateSourceFile(file, statements);
  };
}

const withoutMapComment = (text: string) => text.replace(/\n?\/\/# sourceMappingURL=.*\s*$/, '\n');

class PlaygroundWorker extends TypeScriptWorker {
  private position(file: any, offset: number): { line: number; column: number } {
    const { line, character } = file.getLineAndCharacterOfPosition(offset);
    return { line: line + 1, column: character + 1 };
  }

  private diagnostic(file: any, start: number, length: number, message: string, code: number, category: Diagnostic['category']): Diagnostic {
    const from = this.position(file, start);
    const to = this.position(file, start + length);
    return { line: from.line, column: from.column, endLine: to.line, endColumn: to.column, message, code, category };
  }

  // The bundled TypeScript's own version (FR-012).
  async getVersion(): Promise<string> {
    return ts.version;
  }

  // The diagnostics, the JavaScript, the declarations and the imports, in one
  // round trip (R7), for the model's version it was asked at.
  async getCheck(fileName: string, packagesMessage: string): Promise<CheckResult | null> {
    const model = this._getModel(fileName);
    const service = this.getLanguageService();
    const program = service.getProgram();
    const file = program?.getSourceFile(fileName);
    if (model === null || file === undefined) return null;
    const imports = findImports(file);
    const onImport = (start: number, length: number) => imports.some((entry) => start < entry.end + 1 && start + length > entry.start - 1);
    const raw = [...service.getSyntacticDiagnostics(fileName), ...service.getSemanticDiagnostics(fileName), ...service.getCompilerOptionsDiagnostics()];
    const diagnostics: Diagnostic[] = [];
    for (const entry of raw) {
      const category = CATEGORY[entry.category] ?? 'error';
      if (category !== 'error' && category !== 'warning') continue;
      const start = entry.start ?? 0;
      const length = entry.length ?? 0;
      if (entry.file !== undefined && entry.file.fileName !== file.fileName) continue;
      if (IMPORT_ERRORS.has(entry.code) && onImport(start, length)) continue;
      diagnostics.push(this.diagnostic(file, start, length, ts.flattenDiagnosticMessageText(entry.messageText, '\n'), entry.code, category));
    }
    for (const entry of imports) diagnostics.push(this.diagnostic(file, entry.start, entry.end - entry.start, packagesMessage, 0, 'error'));
    diagnostics.sort((a, b) => a.line - b.line || a.column - b.column);
    const options = this.getCompilationSettings();
    const errors = diagnostics.some((entry) => entry.category === 'error');
    const output = service.getEmitOutput(fileName);
    const js = output.outputFiles.find((out: any) => out.name.endsWith('.js'));
    const map = output.outputFiles.find((out: any) => out.name.endsWith('.js.map'));
    const dts = output.outputFiles.find((out: any) => out.name.endsWith('.d.ts'));
    const blocked = options.noEmitOnError === true && errors;
    return {
      version: model.version,
      diagnostics,
      javascript: blocked || js === undefined ? { none: 'noEmitOnError' } : { text: withoutMapComment(js.text), map: map?.text ?? '' },
      declarations: options.declaration !== true ? { none: 'declaration-off' } : blocked || dts === undefined ? { none: 'noEmitOnError' } : { text: dts.text },
      imports: imports.map((entry) => ({ ...this.position(file, entry.start), specifier: entry.specifier })),
    };
  }

  // The JavaScript to run (R13): the emit with `export` removed, as a script
  // body, with its source map; or nothing, with the imports, when the code
  // imports or may not be emitted.
  async getRunnable(fileName: string): Promise<Runnable | null> {
    const service = this.getLanguageService();
    const program = service.getProgram();
    const file = program?.getSourceFile(fileName);
    if (file === undefined) return null;
    const imports = findImports(file).length;
    const errors = [...program.getSyntacticDiagnostics(file), ...program.getSemanticDiagnostics(file)].filter((entry: any) => entry.category === 1).length;
    let code = '';
    let map = '';
    const result = program.emit(
      file,
      (name: string, text: string) => {
        if (name.endsWith('.js')) code = text;
        else if (name.endsWith('.js.map')) map = text;
      },
      undefined,
      false,
      { after: [stripExports()] },
    );
    if (result.emitSkipped) return { code: '', map: '', imports, errors, skipped: true };
    return { code: withoutMapComment(code), map, imports, errors, skipped: false };
  }

  // What each name in the code is, as TypeScript knows it, for the syntax
  // colors the tokenizer can't tell (FR-068: functions, properties, types):
  // TypeScript's 2020 classifications in the span asked, as offset, length
  // and kind triples.
  async getNameKinds(fileName: string, start: number, length: number): Promise<number[]> {
    if (this.getLanguageService().getProgram()?.getSourceFile(fileName) === undefined) return [];
    return this.getLanguageService().getEncodedSemanticClassifications(fileName, { start, length }, ts.SemanticClassificationFormat.TwentyTwenty).spans;
  }

  // TypeScript's fixes, without any that adds an import (FR-082). Monaco
  // passes the editor's format options by their older names
  // (`ConvertTabsToSpaces`, `IndentSize`), which TypeScript's fixes don't
  // read, so they are given by today's names, as its formatting reads them.
  override async getCodeFixesAtPosition(fileName: string, start: number, end: number, errorCodes: number[], formatOptions: unknown): Promise<readonly any[]> {
    const settings = Object.fromEntries(Object.entries(formatOptions as Record<string, unknown>).map(([name, value]) => [name.charAt(0).toLowerCase() + name.slice(1), value]));
    const fixes = await super.getCodeFixesAtPosition(fileName, start, end, errorCodes, settings);
    return fixes.filter((fix: any) => fix.fixName !== 'import' && !fix.changes.some((change: any) => change.textChanges.some((edit: any) => /^\s*import\b/m.test(edit.newText))));
  }
}

self.onmessage = () => {
  initialize((ctx, createData) => new PlaygroundWorker(ctx, createData));
};
