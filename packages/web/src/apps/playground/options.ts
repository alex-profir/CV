// The compiler options the Playground offers (FR-024 to FR-026, data-model.md
// Compiler options, research R9): one table, read by the options panel, the
// engine, kept code, shared links and the tests. The table and its rules are
// in `compiler-options.ts`, which holds no words; here each option gets its
// description from site text.
import { siteText } from '../../site-text.ts';
import { OPTION_TABLE } from './compiler-options.ts';
import type { OptionSpec } from './compiler-options.ts';

export * from './compiler-options.ts';

export type DescribedOption = OptionSpec & { description: string };

export const OPTIONS: readonly DescribedOption[] = Object.freeze(OPTION_TABLE.map((spec) => ({ ...spec, description: siteText.playground.options.descriptions[spec.name] })));
