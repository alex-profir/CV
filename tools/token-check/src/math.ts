import { Parser } from 'expr-eval-fork';

export type MathResult = { value: string } | { error: 'mixed-units' | 'unknown-unit' | 'not-a-number' };

// A number, with the unit written directly after it: letters, or a `%` with
// no space before it. A `%` after a space is the remainder operator. The
// lookbehind keeps digits inside a name such as `atan2` out.
const OPERAND = /(?<![A-Za-z0-9_.])(\d+\.?\d*|\.\d+)(%|[A-Za-z]+)?/g;

const PLAIN = /^\s*-?(?:\d+\.?\d*|\.\d+)(?:%|[A-Za-z]+)?\s*$/;

const OPERATOR = /[-+*/%^(]/;

// Evaluates token arithmetic the way Penpot's resolver does, through
// sd-transforms' checkAndEvaluateMath (research R7): units are taken off,
// the expression goes to expr-eval-fork, the result is rounded to 4 fraction
// digits, and the one unit goes back on. `units` lists the units the type
// allows. Text with no operator or function call is returned unchanged.
export function evaluateMath(text: string, units: readonly string[]): MathResult {
  if (PLAIN.test(text) || !OPERATOR.test(text)) return { value: text };

  const found = new Set<string>();
  for (const [, , unit] of text.matchAll(OPERAND)) {
    if (unit === undefined) continue;
    if (!units.includes(unit)) return { error: 'unknown-unit' };
    found.add(unit);
  }
  if (found.size > 1) return { error: 'mixed-units' };

  let result: number;
  try {
    result = Parser.evaluate(text.replace(OPERAND, (_match, number: string) => number));
  } catch {
    return { error: 'not-a-number' };
  }
  if (typeof result !== 'number' || !Number.isFinite(result)) return { error: 'not-a-number' };
  return { value: `${Number(result.toFixed(4))}${[...found][0] ?? ''}` };
}
