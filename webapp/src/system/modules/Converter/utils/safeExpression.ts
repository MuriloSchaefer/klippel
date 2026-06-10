/**
 * Shared, RCE-hardened expression evaluator for operator-authored numeric
 * expressions (logo/material/process cost formulas, unit conversions).
 *
 * jse-eval ships *live* evaluators for `MemberExpression`, `CallExpression`,
 * `ThisExpression`, `NewExpression`, `ArrowFunctionExpression`, and
 * `AssignmentExpression`/`UpdateExpression`, and it resolves member access
 * against the REAL JS value — not a sandbox. So even with a purely numeric
 * context, `width.constructor.constructor("return process")()` would walk
 * `Number → Function` and execute. A numeric-only context is therefore
 * necessary but NOT sufficient; the security boundary lives in the AST
 * evaluators, which this module locks down at import time:
 *
 *   1. The prototype-traversal / arbitrary-call node types are neutered to
 *      return `undefined`.
 *   2. `CallExpression` is replaced so the callee MUST be a bare identifier
 *      resolved against the curated `ALLOWED_FUNCTIONS` allow-list below — any
 *      member-expression callee (`x.constructor(...)`) is rejected outright.
 *
 * Because jse-eval's evaluator table is a process-wide singleton, importing
 * this module hardens every `compile()` in the app (cost formulas AND unit
 * conversions get the same audited capability set — defense in depth).
 *
 * This is the security boundary. It is pinned by safeExpression.test.ts from
 * both sides (malicious corpus → 0/NaN; positive allow-list → correct values).
 * Do NOT place functions, objects, or arrays into an evaluation context, and do
 * NOT widen the allow-list without extending that test.
 */
import { compile, registerPlugin } from "jse-eval";

// Upper bound on an expression's source length. Bounds jse-eval compile/eval
// time and rejects pathological inputs before they reach the parser.
export const MAX_EXPRESSION_LENGTH = 500;

const toNum = (x: unknown): number => Number(x);

const median = (...values: number[]): number => {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

const sum = (...values: number[]): number =>
  values.reduce((acc, v) => acc + v, 0);

const mean = (...values: number[]): number =>
  values.length === 0 ? NaN : sum(...values) / values.length;

// The complete capability set reachable from a call expression. Every entry is
// a pure, side-effect-free numeric function; none expose `this`, the prototype
// chain, or host globals. Shared so logo + material + process cost expressions
// (and conversions) agree on exactly one audited set.
const ALLOWED_FUNCTIONS: { [name: string]: (...args: number[]) => number } = {
  min: (...a) => Math.min(...a),
  max: (...a) => Math.max(...a),
  median,
  mean,
  avg: mean,
  sum,
  clamp: (x, lo, hi) => Math.min(Math.max(x, lo), hi),
  round: (x) => Math.round(x),
  floor: (x) => Math.floor(x),
  ceil: (x) => Math.ceil(x),
  abs: (x) => Math.abs(x),
  pow: (b, e) => Math.pow(b, e),
  sqrt: (x) => Math.sqrt(x),
};

// AST node types that can reach the prototype chain, host globals, or arbitrary
// callables. Neutered to `undefined` so any attempt to use them collapses to a
// non-finite value (coerced to 0 by the cost guards) instead of executing.
const NEUTERED_NODE_TYPES = [
  "MemberExpression",
  "OptionalMemberExpression",
  "ThisExpression",
  "NewExpression",
  "ArrowFunctionExpression",
  "AssignmentExpression",
  "UpdateExpression",
  "TaggedTemplateExpression",
  "TemplateLiteral",
];

registerPlugin({
  name: "Safe numeric expression evaluator",
  initEval(jseEval) {
    for (const nodeType of NEUTERED_NODE_TYPES) {
      jseEval.addEvaluator(nodeType, () => undefined);
    }

    // Allow-listed calls only: callee must be a bare identifier present in
    // ALLOWED_FUNCTIONS. A member-expression callee (the RCE vector) fails the
    // identifier check and yields `undefined`.
    jseEval.addEvaluator("CallExpression", function (this: any, node: any) {
      const callee = node?.callee;
      if (!callee || callee.type !== "Identifier") return undefined;
      const fn = ALLOWED_FUNCTIONS[callee.name];
      if (!fn) return undefined;
      const args = (node.arguments ?? []).map((arg: unknown) =>
        toNum(this.eval(arg)),
      );
      return fn(...args);
    });
  },
});

/**
 * Compile an operator-authored numeric expression with the hardened evaluator.
 * Returns `undefined` for empty, oversized, or unparseable input so callers can
 * fall back to a zero cost. The returned function is safe to invoke with a
 * numeric-only context.
 */
export function safeCompile(
  expression: string | undefined,
): ((ctx: { [k: string]: number }) => unknown) | undefined {
  if (!expression || expression.length > MAX_EXPRESSION_LENGTH) return undefined;
  try {
    return compile(expression) as (ctx: { [k: string]: number }) => unknown;
  } catch {
    return undefined;
  }
}

export { ALLOWED_FUNCTIONS };
