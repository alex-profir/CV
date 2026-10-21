import type { Argument, CallExpression, Directive, Expression, Node, ObjectExpression, Statement } from 'oxc-parser';
import { findTokens } from './ids.ts';
import type { Token } from './ids.ts';
import type { Problem } from './report.ts';
import { createLocator, literalParts, parseSource } from './source.ts';

// A test or group declared in a test file (data-model.md, TestNode).
export type TestNode = {
  kind: 'test' | 'group';
  tokens: Token[];
  markedInactive: boolean;
  unrecognized: boolean;
  parent: TestNode | null;
};

const ROOTS = new Set(['test', 'it', 'describe', 'suite']);
const NO_EFFECT = new Set(['only', 'concurrent', 'fails', 'shuffle']);
const INACTIVE = new Set(['skip', 'todo']);
const MUST_BE_CALLED = new Set(['skipIf', 'runIf', 'each', 'for']);

// One step of a callee chain: a member name (null when computed) or a call.
type Link = { name: string | null } | { args: Argument[] };

// The callee chain from its root identifier outwards, or null when it doesn't
// start at an identifier.
function chainOf(expression: Expression): { root: string; links: Link[] } | null {
  if (expression.type === 'Identifier') return { root: expression.name, links: [] };
  if (expression.type === 'MemberExpression') {
    const chain = chainOf(expression.object);
    const property = expression.property;
    chain?.links.push({ name: !expression.computed && property.type === 'Identifier' ? property.name : null });
    return chain;
  }
  if (expression.type === 'CallExpression') {
    const chain = chainOf(expression.callee);
    chain?.links.push({ args: expression.arguments });
    return chain;
  }
  return null;
}

// Whether a literal is truthy, or null when the node isn't a literal. A missing
// argument is `undefined`, so it's falsy.
function literalTruthiness(node: Node | null | undefined): boolean | null {
  if (node === undefined) return false;
  if (node?.type === 'Literal') return 'regex' in node || Boolean(node.value);
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) return Boolean(node.quasis[0]!.value.cooked);
  return null;
}

// Whether the argument of skipIf, runIf, each or for decides in the code that
// the tests never run: skipIf(true), runIf(false), or each([]) and for([]),
// which declare no tests. Any other argument is a runtime condition.
function inactiveByArgument(name: string, arg: Argument | undefined): boolean {
  if (name === 'skipIf') return literalTruthiness(arg) === true;
  if (name === 'runIf') return literalTruthiness(arg) === false;
  return arg?.type === 'ArrayExpression' && arg.elements.length === 0;
}

// What a chain rooted at test, it, describe or suite declares, or null when its
// shape isn't recognized (research R4). `contextParam` is the position of the
// test body's parameter that receives the test context: `.for` passes it
// second, and `.each` doesn't pass it at all.
function shapeOf(
  root: string,
  links: Link[],
): { kind: 'test' | 'group'; markedInactive: boolean; contextParam: number | null } | null {
  let kind: 'test' | 'group' = root === 'test' || root === 'it' ? 'test' : 'group';
  let markedInactive = false;
  let contextParam: number | null = 0;
  for (let i = 0; i < links.length; i++) {
    const link = links[i]!;
    if (!('name' in link) || link.name === null) return null;
    if (i === 0 && root === 'test' && (link.name === 'describe' || link.name === 'suite')) {
      kind = 'group';
    } else if (INACTIVE.has(link.name)) {
      markedInactive = true;
    } else if (MUST_BE_CALLED.has(link.name)) {
      const next = links[i + 1];
      if (next === undefined || !('args' in next)) return null;
      i += 1;
      if (inactiveByArgument(link.name, next.args[0])) markedInactive = true;
      if (link.name === 'each') contextParam = null;
      if (link.name === 'for') contextParam = 1;
    } else if (!NO_EFFECT.has(link.name)) {
      return null;
    }
  }
  return { kind, markedInactive, contextParam };
}

function isFunction(node: Argument | undefined) {
  return node?.type === 'ArrowFunctionExpression' || node?.type === 'FunctionExpression';
}

function keyName(key: Node): string | null {
  if (key.type === 'Identifier') return key.name;
  if (key.type === 'Literal' && typeof key.value === 'string') return key.value;
  return null;
}

// The value of the last non-computed property with this name.
function propertyValue(object: ObjectExpression | undefined, name: string): Expression | undefined {
  const property = object?.properties.findLast(
    (property) => property.type === 'Property' && !property.computed && keyName(property.key) === name,
  );
  return property?.type === 'Property' ? property.value : undefined;
}

// The call a statement makes, unwrapping `await`. An arrow function's
// expression body counts as a statement.
function statementCall(statement: Statement | Directive | Expression): CallExpression | null {
  const expression = statement.type === 'ExpressionStatement' ? statement.expression : statement;
  const unwrapped = expression.type === 'AwaitExpression' ? expression.argument : expression;
  return unwrapped.type === 'CallExpression' ? unwrapped : null;
}

// A function's top-level statements. An expression body is one statement.
function statementsOf(fn: Argument): (Statement | Directive | Expression)[] {
  if (fn.type === 'FunctionExpression') return fn.body?.body ?? [];
  if (fn.type === 'ArrowFunctionExpression') return fn.body.type === 'BlockStatement' ? fn.body.body : [fn.body];
  return [];
}

// Whether `skip(arg, …)` on the test context always skips. Vitest skips unless
// the condition is exactly `false`, and a string is a note, not a condition.
function alwaysSkips(arg: Argument | undefined): boolean {
  if (arg === undefined || arg.type === 'TemplateLiteral') return true;
  return arg.type === 'Literal' && arg.value !== false;
}

// A test body that always skips: a top-level `ctx.skip(…)` on its context
// parameter, or a call to `skip` destructured from it, whose argument means it
// always skips.
function skipsUnconditionally(body: Argument, contextParam: number | null): boolean {
  if (contextParam === null || (body.type !== 'ArrowFunctionExpression' && body.type !== 'FunctionExpression')) return false;
  const param = body.params[contextParam];
  let context: string | null = null;
  let skip: string | null = null;
  if (param?.type === 'Identifier') context = param.name;
  if (param?.type === 'ObjectPattern') {
    for (const property of param.properties) {
      if (property.type === 'Property' && !property.computed && keyName(property.key) === 'skip' && property.value.type === 'Identifier') {
        skip = property.value.name;
      }
    }
  }
  return statementsOf(body).some((statement) => {
    const call = statementCall(statement);
    if (call === null || !alwaysSkips(call.arguments[0])) return false;
    const callee = call.callee;
    if (callee.type === 'Identifier') return callee.name === skip;
    return (
      callee.type === 'MemberExpression' &&
      !callee.computed &&
      callee.object.type === 'Identifier' &&
      callee.object.name === context &&
      callee.property.type === 'Identifier' &&
      callee.property.name === 'skip'
    );
  });
}

// Reads the tests and groups of a test file. A file that fails to parse gives
// no nodes, only its problem.
export function readTestFile(file: string, text: string): { nodes: TestNode[]; problem: Problem | null } {
  const parsed = parseSource(file, text);
  if ('problem' in parsed) return { nodes: [], problem: parsed.problem };

  const locate = createLocator(file, text);
  const nodes: TestNode[] = [];

  const tokensOf = (parts: { text: string; offset: number }[]): Token[] =>
    parts.flatMap((part) =>
      findTokens(part.text).map((token) => ({ text: token.text, location: locate(part.offset + token.index) })),
    );

  // A string literal, or a template literal without substitutions.
  const literalOnly = (node: Node | null | undefined) =>
    node?.type === 'TemplateLiteral' && node.expressions.length > 0 ? [] : literalParts(node, text);

  const tagParts = (options: ObjectExpression | undefined) => {
    const tags = propertyValue(options, 'tags');
    return tags?.type === 'ArrayExpression' ? tags.elements.flatMap(literalOnly) : literalOnly(tags);
  };

  const readCall = (call: CallExpression, parent: TestNode | null) => {
    const chain = chainOf(call.callee);
    if (chain === null || !ROOTS.has(chain.root)) return;
    const shape = shapeOf(chain.root, chain.links);
    const [title, ...rest] = call.arguments;
    const options = rest.find((arg): arg is ObjectExpression => arg.type === 'ObjectExpression');
    const tokens = tokensOf([...literalParts(title, text), ...tagParts(options)]);

    if (shape === null) {
      const node: TestNode = { kind: 'group', tokens, markedInactive: false, unrecognized: true, parent };
      nodes.push(node);
      const callback = call.arguments.find(isFunction);
      if (callback !== undefined) visitStatements(statementsOf(callback), node);
      return;
    }

    const body = rest.find((arg) => arg !== options && !(arg.type === 'Literal' && typeof arg.value === 'number'));
    const markedInactive =
      shape.markedInactive ||
      literalTruthiness(propertyValue(options, 'skip')) === true ||
      literalTruthiness(propertyValue(options, 'todo')) === true ||
      body === undefined ||
      (shape.kind === 'test' && skipsUnconditionally(body, shape.contextParam));
    const node: TestNode = { kind: shape.kind, tokens, markedInactive, unrecognized: false, parent };
    nodes.push(node);
    // Test bodies are never searched for tests (fail closed).
    if (shape.kind === 'group' && body !== undefined) visitStatements(statementsOf(body), node);
  };

  // Statements of the program, of group callbacks, and of the blocks,
  // branches, loops, try and switch statements nested in them. Function
  // bodies other than group callbacks are never entered.
  const visitStatements = (statements: (Statement | Directive | Expression)[], parent: TestNode | null): void => {
    for (const statement of statements) visitStatement(statement, parent);
  };

  const visitStatement = (statement: Statement | Directive | Expression, parent: TestNode | null): void => {
    switch (statement.type) {
      case 'BlockStatement':
        return visitStatements(statement.body, parent);
      case 'IfStatement':
        visitStatement(statement.consequent, parent);
        if (statement.alternate !== null) visitStatement(statement.alternate, parent);
        return;
      case 'ForStatement':
      case 'ForInStatement':
      case 'ForOfStatement':
      case 'WhileStatement':
      case 'DoWhileStatement':
      case 'LabeledStatement':
        return visitStatement(statement.body, parent);
      case 'TryStatement':
        visitStatement(statement.block, parent);
        if (statement.handler !== null) visitStatement(statement.handler.body, parent);
        if (statement.finalizer !== null) visitStatement(statement.finalizer, parent);
        return;
      case 'SwitchStatement':
        for (const switchCase of statement.cases) visitStatements(switchCase.consequent, parent);
        return;
      default: {
        const call = statementCall(statement);
        if (call !== null) readCall(call, parent);
      }
    }
  };

  visitStatements(parsed.program.body, null);
  return { nodes, problem: null };
}

// The effective tokens of every test: its own and those of every ancestor.
// They count only when neither the test nor an ancestor is inactive or
// unrecognized. Otherwise an unrecognized ancestor puts them in
// `unrecognized`, and an inactive one in `skipped`.
export function coverageOf(nodes: TestNode[]): { counting: Token[]; skipped: Token[]; unrecognized: Token[] } {
  const coverage = { counting: [] as Token[], skipped: [] as Token[], unrecognized: [] as Token[] };
  for (const node of nodes) {
    if (node.kind !== 'test') continue;
    const tokens: Token[] = [];
    let inactive = false;
    let unrecognized = false;
    for (let current: TestNode | null = node; current !== null; current = current.parent) {
      tokens.push(...current.tokens);
      inactive ||= current.markedInactive;
      unrecognized ||= current.unrecognized;
    }
    const bucket = unrecognized ? coverage.unrecognized : inactive ? coverage.skipped : coverage.counting;
    bucket.push(...tokens);
  }
  return coverage;
}
