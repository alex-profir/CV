// A Lightning CSS visitor that turns `@container (--token-breakpoint-<name>)`
// into the token's width condition at build time (005 research R5). No
// browser reads a custom name in a container query, and Lightning CSS's
// `customMedia` replaces names in `@media` only. With it, cv.css can follow
// its window's width in the shell and the page's width on /cv, from one
// rule.
import { transform } from 'lightningcss';
import type { ContainerCondition, Visitor } from 'lightningcss';
import { mediaQuery, tokenTypes } from '@cv/tokens';
import type { BreakpointTokenName } from '@cv/tokens';

// The CSS names of breakpoint tokens start with this. Written in two parts,
// as it names no token itself.
export const BREAKPOINT_PREFIX = ['--token', 'breakpoint', ''].join('-');

// A condition's text, such as `(width >= 900px)`, parsed by Lightning CSS
// itself into the form a visitor returns.
function parseCondition(text: string): ContainerCondition {
  let condition: ContainerCondition | null = null;
  transform({
    filename: 'condition.css',
    code: Buffer.from(`@container ${text} { a { color: inherit } }`),
    visitor: {
      Rule: {
        container(rule) {
          condition = rule.value.condition ?? null;
        },
      },
    },
  });
  if (condition === null) throw new Error(`Lightning CSS can't read the container condition ${text}`);
  return condition;
}

// The width condition of every breakpoint token, by its CSS name.
function breakpointConditions(): Map<string, ContainerCondition> {
  const names = Object.keys(tokenTypes).filter((name): name is BreakpointTokenName => name.startsWith('breakpoint.'));
  return new Map(names.map((name) => [`${BREAKPOINT_PREFIX}${name.slice('breakpoint.'.length).replace(/[._]/g, '-')}`, parseCondition(mediaQuery(name))]));
}

// The rule without its `null` fields. Lightning CSS hands a visitor optional
// fields as `null` (a container's missing name, a `var()` with no `from`),
// and can't read `null` back where it expects an absent field.
function withoutNulls<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutNulls) as T;
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== null).map(([key, field]) => [key, withoutNulls(field)])) as T;
}

export function containerBreakpoints(): Visitor<never> {
  const conditions = breakpointConditions();
  return {
    Rule: {
      container(rule) {
        const condition = rule.value.condition;
        if (condition?.type !== 'feature' || condition.value.type !== 'boolean' || !condition.value.name.startsWith(BREAKPOINT_PREFIX)) return undefined;
        const replacement = conditions.get(condition.value.name);
        if (replacement === undefined) throw new Error(`no breakpoint token is named ${condition.value.name}`);
        return withoutNulls({ ...rule, value: { ...rule.value, condition: replacement } });
      },
    },
  };
}
