/**
 * Security boundary test for the shared expression evaluator.
 *
 * The allow-list + neutered AST evaluators in safeExpression.ts are the RCE
 * boundary for operator-authored cost/conversion expressions. A future
 * contributor exposing a host function/object — or re-enabling member/call
 * access — would silently reopen the hole, so this test pins the boundary from
 * both sides:
 *   - a malicious corpus must never execute and must collapse to 0;
 *   - the curated allow-list must compute correct values.
 *
 * Pure unit test (no Klippel dev app). Run with:
 *   KLIPPEL_E2E_SKIP_GLOBAL_SETUP=1 npx jest safeExpression
 */
import { safeCompile, ALLOWED_FUNCTIONS, MAX_EXPRESSION_LENGTH } from './safeExpression';

// Mirror the coercion every cost consumer applies: no compile → 0; non-finite
// or throwing → 0. This is the value that would actually become a cost.
const evalCost = (
  expression: string,
  context: { [k: string]: number } = {},
): number => {
  const fn = safeCompile(expression);
  if (!fn) return 0;
  try {
    const r = Number(fn(context));
    return Number.isFinite(r) ? r : 0;
  } catch {
    return 0;
  }
};

const NUMERIC_CONTEXT = {
  colors: 3,
  width: 10,
  height: 4,
  methodFactor: 0.6,
  gradesTotal: 25,
};

describe('safeExpression — RCE boundary', () => {
  // Each of these tries to escape the numeric sandbox. None may execute; all
  // must coerce to 0 (either undefined/NaN result or a rejected compile).
  const maliciousCorpus = [
    'constructor.constructor("return process")()',
    'constructor.constructor("return globalThis")()',
    'this',
    'this.constructor',
    'globalThis',
    'globalThis.process',
    '[].constructor',
    '[].constructor.constructor("return 1")()',
    '({}).constructor',
    '__proto__',
    'width.constructor',
    'width.constructor.constructor("return 42")()',
    'height.__proto__',
    'process',
    'process.exit(1)',
    'require("fs")',
    'import("fs")',
    'eval("1+1")',
    'Function("return 1")()',
    'global',
    'window',
    'colors.toString',
    'unknownIdentifier',
    'foo(1, 2, 3)',
    'width = 999',
    'width += 1',
    'width++',
  ];

  it.each(maliciousCorpus)('evaluates %p to 0 without executing', (expr) => {
    expect(evalCost(expr, NUMERIC_CONTEXT)).toBe(0);
  });

  it('does not execute a host call even when the expression parses', () => {
    const sentinel = '__safeExpression_pwned__';
    delete (globalThis as Record<string, unknown>)[sentinel];
    evalCost(
      `constructor.constructor("globalThis.${sentinel}=1")()`,
      NUMERIC_CONTEXT,
    );
    evalCost(`Function("globalThis.${sentinel}=1")()`, NUMERIC_CONTEXT);
    expect((globalThis as Record<string, unknown>)[sentinel]).toBeUndefined();
  });

  it('rejects oversized expressions before parsing', () => {
    const huge = `1+${'1+'.repeat(MAX_EXPRESSION_LENGTH)}1`;
    expect(huge.length).toBeGreaterThan(MAX_EXPRESSION_LENGTH);
    expect(safeCompile(huge)).toBeUndefined();
  });

  it('rejects empty / undefined expressions', () => {
    expect(safeCompile('')).toBeUndefined();
    expect(safeCompile(undefined)).toBeUndefined();
  });
});

describe('safeExpression — allow-listed functions', () => {
  it('computes arithmetic over the numeric context', () => {
    expect(evalCost('width * height', NUMERIC_CONTEXT)).toBe(40);
    expect(evalCost('width * height * methodFactor', NUMERIC_CONTEXT)).toBeCloseTo(24);
    expect(evalCost('colors + gradesTotal', NUMERIC_CONTEXT)).toBe(28);
  });

  it.each([
    ['min(5, 2, 9)', 2],
    ['max(5, 2, 9)', 9],
    ['median(1, 2, 3, 4)', 2.5],
    ['median(3, 1, 2)', 2],
    ['mean(2, 4, 6)', 4],
    ['avg(2, 4, 6)', 4],
    ['sum(1, 2, 3, 4)', 10],
    ['clamp(15, 0, 10)', 10],
    ['clamp(-5, 0, 10)', 0],
    ['clamp(5, 0, 10)', 5],
    ['round(2.6)', 3],
    ['floor(2.9)', 2],
    ['ceil(2.1)', 3],
    ['abs(-7)', 7],
    ['pow(2, 10)', 1024],
    ['sqrt(81)', 9],
  ])('evaluates %p to %p', (expr, expected) => {
    expect(evalCost(expr as string, NUMERIC_CONTEXT)).toBeCloseTo(expected as number);
  });

  it('supports the floor-price idiom max(minCharge, area * rate)', () => {
    // area = width*height = 40; rate 0.5 → 20; floor 30 wins.
    expect(evalCost('max(30, width * height * 0.5)', NUMERIC_CONTEXT)).toBe(30);
    // rate 1 → 40 beats the floor.
    expect(evalCost('max(30, width * height * 1)', NUMERIC_CONTEXT)).toBe(40);
  });

  it('exposes exactly the audited allow-list', () => {
    expect(Object.keys(ALLOWED_FUNCTIONS).sort()).toEqual(
      [
        'abs',
        'avg',
        'ceil',
        'clamp',
        'floor',
        'max',
        'mean',
        'median',
        'min',
        'pow',
        'round',
        'sqrt',
        'sum',
      ].sort(),
    );
  });
});
