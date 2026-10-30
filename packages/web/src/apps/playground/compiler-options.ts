// The compiler options the Playground offers (FR-024 to FR-026, data-model.md
// Compiler options, research R9): the table without its site text, read by
// the engine as well as the interface, so it holds no words. `options.ts`
// adds each option's description.

export type Target = 'ES2015' | 'ES2016' | 'ES2017' | 'ES2018' | 'ES2019' | 'ES2020' | 'ES2021' | 'ES2022' | 'ES2023' | 'ES2024' | 'ESNext';

export type FlagName =
  | 'strict'
  | 'noImplicitAny'
  | 'strictNullChecks'
  | 'strictFunctionTypes'
  | 'strictBindCallApply'
  | 'strictPropertyInitialization'
  | 'strictBuiltinIteratorReturn'
  | 'noImplicitThis'
  | 'useUnknownInCatchVariables'
  | 'noUncheckedIndexedAccess'
  | 'exactOptionalPropertyTypes'
  | 'noImplicitReturns'
  | 'noFallthroughCasesInSwitch'
  | 'noImplicitOverride'
  | 'noPropertyAccessFromIndexSignature'
  | 'noUnusedLocals'
  | 'noUnusedParameters'
  | 'declaration'
  | 'removeComments'
  | 'noEmitOnError'
  | 'useDefineForClassFields'
  | 'experimentalDecorators'
  | 'preserveConstEnums';

export type OptionName = 'target' | FlagName;

export type OptionGroup = 'language' | 'strict' | 'checks' | 'output';

export type OptionSpec =
  | { name: 'target'; group: 'language'; kind: 'choice'; values: readonly Target[]; default: Target }
  | { name: FlagName; group: Exclude<OptionGroup, 'language'>; kind: 'flag'; default: boolean; underStrict: boolean };

// What the visitor chose: only options that differ from the defaults.
export type ChangedOptions = Partial<{ target: Target } & Record<FlagName, boolean>>;

export const TARGETS: readonly Target[] = Object.freeze(['ES2015', 'ES2016', 'ES2017', 'ES2018', 'ES2019', 'ES2020', 'ES2021', 'ES2022', 'ES2023', 'ES2024', 'ESNext'] as const);

const flag = (name: FlagName, group: Exclude<OptionGroup, 'language'>, value: boolean, underStrict = false): OptionSpec => ({ name, group, kind: 'flag', default: value, underStrict });

// In the design's order (wireframes, Compiler options).
export const OPTION_TABLE: readonly OptionSpec[] = Object.freeze([
  { name: 'target', group: 'language', kind: 'choice', values: TARGETS, default: 'ES2022' },
  flag('strict', 'strict', true),
  flag('noImplicitAny', 'strict', true, true),
  flag('strictNullChecks', 'strict', true, true),
  flag('strictFunctionTypes', 'strict', true, true),
  flag('strictBindCallApply', 'strict', true, true),
  flag('strictPropertyInitialization', 'strict', true, true),
  flag('strictBuiltinIteratorReturn', 'strict', true, true),
  flag('noImplicitThis', 'strict', true, true),
  flag('useUnknownInCatchVariables', 'strict', true, true),
  flag('noUncheckedIndexedAccess', 'checks', false),
  flag('exactOptionalPropertyTypes', 'checks', false),
  flag('noImplicitReturns', 'checks', false),
  flag('noFallthroughCasesInSwitch', 'checks', false),
  flag('noImplicitOverride', 'checks', false),
  flag('noPropertyAccessFromIndexSignature', 'checks', false),
  flag('noUnusedLocals', 'checks', false),
  flag('noUnusedParameters', 'checks', false),
  flag('declaration', 'output', true),
  flag('removeComments', 'output', false),
  flag('noEmitOnError', 'output', false),
  flag('useDefineForClassFields', 'output', true),
  flag('experimentalDecorators', 'output', false),
  flag('preserveConstEnums', 'output', false),
]);

const SPECS = new Map(OPTION_TABLE.map((spec) => [spec.name, spec]));

const STRICT_CHECKS = OPTION_TABLE.filter((spec) => spec.kind === 'flag' && spec.underStrict).map((spec) => spec.name as FlagName);

export type Settled = { target: Target } & Record<FlagName, boolean>;

// Every option's value: the defaults, with the changed ones over them.
export function settle(changed: ChangedOptions): Settled {
  const values = Object.fromEntries(OPTION_TABLE.map((spec) => [spec.name, spec.default])) as Settled;
  return { ...values, ...changed };
}

// Only the options that differ from the defaults, in the table's order.
export function changedOptions(values: Partial<Settled>): ChangedOptions {
  const changed: Record<string, unknown> = {};
  for (const spec of OPTION_TABLE) {
    const value = values[spec.name];
    if (value !== undefined && value !== spec.default) changed[spec.name] = value;
  }
  return changed as ChangedOptions;
}

// A set written in kept code or a link. A name not in the table, or a value
// of the wrong kind, is left out and named in `unknown`; a flag set to its
// default is dropped. `strict: false` with no strict check written turns
// every strict check off, as the panel does.
export function readOptions(written: unknown): { options: ChangedOptions; unknown: string[] } {
  const unknown: string[] = [];
  if (written === null || typeof written !== 'object' || Array.isArray(written)) return { options: {}, unknown };
  const values: Partial<Settled> = {};
  for (const [name, value] of Object.entries(written)) {
    const spec = SPECS.get(name as OptionName);
    if (spec === undefined) unknown.push(name);
    else if (spec.kind === 'choice' ? typeof value === 'string' && (spec.values as readonly string[]).includes(value) : typeof value === 'boolean') (values as Record<string, unknown>)[name] = value;
    else unknown.push(name);
  }
  if (values.strict === false) for (const check of STRICT_CHECKS) if (!(check in values)) values[check] = false;
  return { options: changedOptions(values), unknown };
}

// The visitor's `strict` choice in the panel: it sets every strict check.
export function withStrict(changed: ChangedOptions, strict: boolean): ChangedOptions {
  const values: Partial<Settled> = { ...settle(changed), strict };
  for (const check of STRICT_CHECKS) values[check] = strict;
  return changedOptions(values);
}

export const strictChecks = (): readonly FlagName[] => STRICT_CHECKS;

// TypeScript's own enum values for the fixed options and the target, as its
// compiler options take them.
const SCRIPT_TARGET: Record<Target, number> = { ES2015: 2, ES2016: 3, ES2017: 4, ES2018: 5, ES2019: 6, ES2020: 7, ES2021: 8, ES2022: 9, ES2023: 10, ES2024: 11, ESNext: 99 };
const MODULE_ESNEXT = 99;
const MODULE_DETECTION_FORCE = 3;
const JSX_NONE = 0;

// The library files for a target: its own, and a worker's in place of the
// page's (research R14).
export function libFor(target: Target): string[] {
  return [`lib.${target.toLowerCase()}.d.ts`, 'lib.webworker.d.ts', 'lib.webworker.iterable.d.ts', 'lib.webworker.asynciterable.d.ts'];
}

// The compiler options the engine sets: the visitor's, over the defaults,
// with the fixed ones no one changes (FR-024, R9).
export function compilerOptions(changed: ChangedOptions): Record<string, unknown> {
  const { target, ...flags } = settle(changed);
  return {
    ...flags,
    target: SCRIPT_TARGET[target],
    module: MODULE_ESNEXT,
    moduleDetection: MODULE_DETECTION_FORCE,
    lib: libFor(target),
    sourceMap: true,
    noEmit: false,
    isolatedModules: false,
    jsx: JSX_NONE,
    types: [],
    allowJs: false,
    allowNonTsExtensions: true,
  };
}
