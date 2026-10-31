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

// A refactoring TypeScript offers at a selection, with its edits to the code.
export type Refactor = { title: string; kind: string; edits: { start: number; length: number; text: string }[] };

// TypeScript's own errors for what an import names, dropped where the
// packages message stands (R11): cannot find module, cannot find name
// 'require', a dynamic import's module option, and the like.
const IMPORT_ERRORS = new Set([2306, 2307, 2580, 2591, 2688, 2792, 1323, 1324, 2875, 7016]);

const CATEGORY: Record<number, Diagnostic['category']> = { 0: 'warning', 1: 'error', 2: 'suggestion', 3: 'message' };

// Every place the code imports something (R11): import and export-from
// declarations with a specifier, `import x = require(…)`, `import(…)` calls and
// types, `/// <reference types="…" />`, and calls to a `require` or an
// `importScripts` the code doesn't declare.
function findImports(file: any): Import[] {
  const found: Import[] = file.typeReferenceDirectives.map((directive: any) => ({ start: directive.pos, end: directive.end, specifier: directive.fileName }));
  const declares = (name: string) => file.locals?.has?.(name) === true;
  const isLoader = (name: any) => ts.isIdentifier(name) && (name.text === 'require' || name.text === 'importScripts') && !declares(name.text);
  const visit = (node: any): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined) {
      const specifier = node.moduleSpecifier;
      found.push({ start: specifier.getStart(file), end: specifier.getEnd(), specifier: ts.isStringLiteral(specifier) ? specifier.text : specifier.getText(file) });
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      const expression = node.moduleReference.expression;
      found.push({ start: expression.getStart(file), end: expression.getEnd(), specifier: ts.isStringLiteral(expression) ? expression.text : expression.getText(file) });
    } else if (ts.isImportTypeNode(node)) {
      const literal = ts.isLiteralTypeNode(node.argument) ? node.argument.literal : node.argument;
      found.push({ start: literal.getStart(file), end: literal.getEnd(), specifier: ts.isStringLiteralLike(literal) ? literal.text : literal.getText(file) });
    } else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || isLoader(node.expression))) {
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

// The code's top level has no `this`, as a module's hasn't (`moduleDetection:
// force`), though its script body sits in a function that would see the worker's
// (FR-032, R13). Any function or class member but an arrow has a `this` of its
// own. A wrapper can't do it: an ordinary function round the body would give the
// code an `arguments` a module doesn't have.
function moduleThis(): any {
  return (context: any) => (file: any) => {
    const visit = (node: any): any => {
      if (node.kind === ts.SyntaxKind.ThisKeyword) return ts.setTextRange(context.factory.createVoidZero(), node);
      if ((ts.isFunctionLike(node) && !ts.isArrowFunction(node)) || ts.isClassElement(node)) return node;
      return ts.visitEachChild(node, visit, context);
    };
    return ts.visitEachChild(file, visit, context);
  };
}

// A `#!` line is only valid at the start of a file, and a script body isn't one.
// Its line stays, empty, so the map's lines hold (FR-032, R13).
const withoutHashbang = (text: string) => text.replace(/^#!.*/, '');

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

  // What the Errors pane and the logs count (FR-022, FR-033): syntax, types,
  // options and, through the language service, declarations; without what an
  // import's mark stands for.
  private found(fileName: string, file: any, imports: Import[]): Diagnostic[] {
    const service = this.getLanguageService();
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
    return diagnostics;
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
    const diagnostics = this.found(fileName, file, imports);
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
    const found = findImports(file);
    const imports = found.length;
    const errors = this.found(fileName, file, found).filter((entry) => entry.category === 'error').length;
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
      { after: [stripExports(), moduleThis()] },
    );
    // A declaration that can't be made skips the emit but leaves the JavaScript,
    // which runs (FR-033); `noEmitOnError` with errors leaves none.
    if (result.emitSkipped && code === '') return { code: '', map: '', imports, errors, skipped: true };
    return { code: withoutHashbang(withoutMapComment(code)), map, imports, errors, skipped: false };
  }

  // What each name in the code is, as TypeScript knows it, for the syntax
  // colors the tokenizer can't tell (FR-068: functions, properties, types):
  // TypeScript's 2020 classifications in the span asked, as offset, length
  // and kind triples.
  async getNameKinds(fileName: string, start: number, length: number): Promise<number[]> {
    if (this.getLanguageService().getProgram()?.getSourceFile(fileName) === undefined) return [];
    return this.getLanguageService().getEncodedSemanticClassifications(fileName, { start, length }, ts.SemanticClassificationFormat.TwentyTwenty).spans;
  }

  // TypeScript's refactorings at a selection, each with its edits (FR-082):
  // none that adds an import or reaches another file.
  async getRefactors(fileName: string, start: number, end: number, invoked: boolean): Promise<Refactor[]> {
    const service = this.getLanguageService();
    if (service.getProgram()?.getSourceFile(fileName) === undefined) return [];
    const range = { pos: start, end };
    const format = { ...ts.getDefaultFormatCodeSettings('\n'), indentSize: 2, tabSize: 2, convertTabsToSpaces: true };
    const found: Refactor[] = [];
    for (const refactor of service.getApplicableRefactors(fileName, range, {}, invoked ? 'invoked' : 'implicit')) {
      for (const action of refactor.actions) {
        if (action.notApplicableReason !== undefined) continue;
        const changes = service.getEditsForRefactor(fileName, format, range, refactor.name, action.name, {})?.edits ?? [];
        if (changes.length === 0 || changes.some((change: any) => change.fileName !== fileName || change.textChanges.some((edit: any) => /^\s*import\b/m.test(edit.newText)))) continue;
        found.push({ title: action.description, kind: action.kind ?? 'refactor', edits: changes.flatMap((change: any) => change.textChanges.map((edit: any) => ({ start: edit.span.start, length: edit.span.length, text: edit.newText }))) });
      }
    }
    return found;
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
