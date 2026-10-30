// The compiler options table (data-model.md Compiler options, research R9),
// checked against the TypeScript Monaco bundles, read in Node.
import { describe, expect, test } from 'vitest';
import { typescript as ts } from 'monaco-editor/languages/features/typescript/lib/typescriptServices';
import { OPTIONS, changedOptions, compilerOptions, readOptions, settle, withStrict } from '../../../src/apps/playground/options.ts';

const declarations = (ts as unknown as { optionDeclarations: { name: string; type: unknown }[] }).optionDeclarations;

describe('008-typescript-playground-FR-024: the options are the design\'s, each one of the bundled TypeScript', () => {
  test('every name in the table is an option of the bundled TypeScript, of the right kind', () => {
    for (const spec of OPTIONS) {
      const declared = declarations.find((option) => option.name === spec.name);
      expect(declared, spec.name).toBeDefined();
      if (spec.kind === 'flag') expect(declared!.type, spec.name).toBe('boolean');
      else for (const value of spec.values) expect((declared!.type as Map<string, number>).has(value.toLowerCase()), value).toBe(true);
    }
  });

  test("the groups and order are the design's, and no module, file, package or JSX option is offered", () => {
    expect(OPTIONS.map((spec) => `${spec.group}:${spec.name}`)).toEqual([
      'language:target',
      'strict:strict',
      'strict:noImplicitAny',
      'strict:strictNullChecks',
      'strict:strictFunctionTypes',
      'strict:strictBindCallApply',
      'strict:strictPropertyInitialization',
      'strict:strictBuiltinIteratorReturn',
      'strict:noImplicitThis',
      'strict:useUnknownInCatchVariables',
      'checks:noUncheckedIndexedAccess',
      'checks:exactOptionalPropertyTypes',
      'checks:noImplicitReturns',
      'checks:noFallthroughCasesInSwitch',
      'checks:noImplicitOverride',
      'checks:noPropertyAccessFromIndexSignature',
      'checks:noUnusedLocals',
      'checks:noUnusedParameters',
      'output:declaration',
      'output:removeComments',
      'output:noEmitOnError',
      'output:useDefineForClassFields',
      'output:experimentalDecorators',
      'output:preserveConstEnums',
    ]);
    const offered = new Set<string>(OPTIONS.map((spec) => spec.name));
    for (const name of ['module', 'moduleResolution', 'moduleDetection', 'jsx', 'paths', 'baseUrl', 'types', 'typeRoots', 'lib', 'files', 'rootDir', 'outDir', 'outFile', 'sourceMap', 'composite', 'incremental', 'allowJs', 'resolveJsonModule', 'esModuleInterop']) expect(offered.has(name), name).toBe(false);
    for (const spec of OPTIONS) expect(spec.description.length, spec.name).toBeGreaterThan(0);
  });

  test('the target offers ES2015 to ES2024 and ESNext', () => {
    const target = OPTIONS[0]!;
    expect(target.kind === 'choice' && target.values).toEqual(['ES2015', 'ES2016', 'ES2017', 'ES2018', 'ES2019', 'ES2020', 'ES2021', 'ES2022', 'ES2023', 'ES2024', 'ESNext']);
  });
});

describe("008-typescript-playground-FR-025: every default is the design's", () => {
  test('target ES2022; strict and its eight checks on; the other checks off; declaration and useDefineForClassFields on; the rest off', () => {
    const values = settle({});
    expect(values.target).toBe('ES2022');
    const on = OPTIONS.filter((spec) => spec.kind === 'flag' && values[spec.name as Exclude<typeof spec.name, 'target'>]).map((spec) => spec.name);
    expect(on).toEqual(['strict', 'noImplicitAny', 'strictNullChecks', 'strictFunctionTypes', 'strictBindCallApply', 'strictPropertyInitialization', 'strictBuiltinIteratorReturn', 'noImplicitThis', 'useUnknownInCatchVariables', 'declaration', 'useDefineForClassFields']);
  });

  test('turning strict off turns every strict check off, and on again turns them on', () => {
    const off = withStrict({}, false);
    expect(Object.keys(off)).toEqual(['strict', 'noImplicitAny', 'strictNullChecks', 'strictFunctionTypes', 'strictBindCallApply', 'strictPropertyInitialization', 'strictBuiltinIteratorReturn', 'noImplicitThis', 'useUnknownInCatchVariables']);
    expect(Object.values(off).every((value) => value === false)).toBe(true);
    expect(withStrict(off, true)).toEqual({});
  });
});

describe('008-typescript-playground-FR-026: only changed options are written, and a written set is read safely', () => {
  test('changedOptions writes only options that differ, in the table\'s order', () => {
    expect(changedOptions({ noUnusedLocals: true, target: 'ES2022', strict: true, removeComments: false })).toEqual({ noUnusedLocals: true });
    expect(Object.keys(changedOptions({ preserveConstEnums: true, target: 'ESNext', noUnusedLocals: true }))).toEqual(['target', 'noUnusedLocals', 'preserveConstEnums']);
  });

  test('readOptions leaves out a name not in OptionName and a value of the wrong kind, naming each, and drops a flag set to its default', () => {
    expect(readOptions({ jsx: 'react', strict: 'yes', target: 'ES1999', noUnusedLocals: true, declaration: true })).toEqual({ options: { noUnusedLocals: true }, unknown: ['jsx', 'strict', 'target'] });
    expect(readOptions(null)).toEqual({ options: {}, unknown: [] });
    expect(readOptions([true])).toEqual({ options: {}, unknown: [] });
  });

  test('strict: false with no strict check written turns every strict check off', () => {
    expect(readOptions({ strict: false })).toEqual({ options: withStrict({}, false), unknown: [] });
    const { noImplicitAny: _kept, ...others } = withStrict({}, false);
    expect(readOptions({ strict: false, noImplicitAny: true }).options).toEqual(others);
  });
});

describe('008-typescript-playground-FR-024: compilerOptions adds the fixed options', () => {
  test('module ESNext, moduleDetection force, lib from target with WebWorker and no DOM, source maps, emit on, no JSX, no types, no JS', () => {
    const options = compilerOptions({ target: 'ES2020', noUnusedLocals: true });
    expect(options).toMatchObject({
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      moduleDetection: ts.ModuleDetectionKind.Force,
      lib: ['lib.es2020.d.ts', 'lib.webworker.d.ts', 'lib.webworker.iterable.d.ts', 'lib.webworker.asynciterable.d.ts'],
      sourceMap: true,
      noEmit: false,
      isolatedModules: false,
      jsx: ts.JsxEmit.None,
      types: [],
      allowJs: false,
      noUnusedLocals: true,
      strict: true,
    });
    expect((options.lib as string[]).some((lib) => lib.includes('dom'))).toBe(false);
    for (const target of ['ES2015', 'ES2022', 'ES2024', 'ESNext'] as const) expect(compilerOptions({ target }).target).toBe(ts.ScriptTarget[target]);
  });
});
