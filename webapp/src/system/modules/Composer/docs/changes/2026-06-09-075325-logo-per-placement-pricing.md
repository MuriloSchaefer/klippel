---
id: 2026-06-09-075325
name: Per-placement logo pricing with safe math functions and garment total
description: Move the logo cost expression from the logo to each placement, expose curated math functions (min/max/median/…) to the expression evaluator without opening an RCE surface, and aggregate the per-unit logo cost into a garment total via the graduation amounts.
status: implemented
modules: [Composer]
---

## Context

The logo cost feature shipped in the `feat: add logo crud` commit (`dcc259c`) prices a
logo with a single `costExpression` on the `LogoNode`, evaluated once per placement
over the numeric context `{ colors, width, height, methodFactor, gradesTotal }`
(see [computeLogoCost.ts](../../utils/computeLogoCost.ts) and
[typings.ts:291](../../typings.ts#L291)). Three gaps motivate this change:

1. **One expression for all placements is wrong.** Different placements (chest, sleeve,
   back) on the same logo are priced differently — small left-chest embroidery vs. a
   large back print are not the same formula. Pricing must be defined **per placement**.
2. **No aggregate functions.** The current evaluator only does arithmetic plus the
   `sqrt` unary op registered for the Converter. Quotes routinely need `min`, `max`,
   `median`, `clamp`, `round`, etc. (e.g. a floor price: `max(minCharge, area * rate)`).
   These must be available **without** opening a remote-code-execution hole — the
   expression string is user/operator authored and must never reach `constructor`,
   prototypes, or host globals.
3. **Per-unit cost is never turned into a garment total.** `computeLogoCost` returns a
   cost-per-piece `CompoundValue` (`BRL / un`) and the `moneyCost` comment explicitly
   defers garment-total aggregation. Materials already do this: they multiply the
   per-unit converted amount by each graduation's `amount` and sum
   (`totalAggregate` in [computeMaterialCost.ts:202](../../utils/computeMaterialCost.ts#L202)).
   Logos should follow the same pattern so a logo contributes a real garment total.

## Change

### 1. Pricing moves to the placement

- In [typings.ts](../../typings.ts): remove `costExpression?` from `LogoNode`
  ([typings.ts:291](../../typings.ts#L291)) and add `costExpression?: string` to
  `LogoPlacement` ([typings.ts:240](../../typings.ts#L240) area). Each placement carries
  its own numeric expression over `{ colors, width, height, methodFactor, gradesTotal }`.
- `LogoPlacementCostAudit.expression` already exists ([typings.ts:256](../../typings.ts#L256));
  it now reflects the placement's own expression rather than the shared logo expression.
- In [computeLogoCost.ts](../../utils/computeLogoCost.ts): compile per placement inside the
  loop (`safeCompile(placement.costExpression)`) instead of once for the whole logo
  ([computeLogoCost.ts:125-126](../../utils/computeLogoCost.ts#L125-L126)). A placement with
  no expression contributes `cost = 0` (unchanged fallback behaviour).
- UI: the cost-expression input moves from the logo editor to the placement editor
  ([LogoEditButton.tsx](../../components/viewports/LogoListAccordion/LogoEditButton.tsx) /
  [LogoPlacementsButton.tsx](../../components/viewports/LogoListAccordion/LogoPlacementsButton.tsx)).
  The audit popover ([LogoCostAuditContent.tsx](../../components/viewports/LogoListAccordion/LogoCostAuditContent.tsx))
  already renders per-placement cost rows and a summed total — no structural change, but it
  should surface each placement's expression for traceability.
- MCP: `addLogo` ([mcpTools/addLogo.ts](../../mcpTools/addLogo.ts)) drops the logo-level
  `costExpression` param; `addLogoPlacement` ([mcpTools/addLogoPlacement.ts](../../mcpTools/addLogoPlacement.ts))
  gains an optional `costExpression` param.

### 2. Curated math functions, no RCE

- Extend the existing `jse-eval` `registerPlugin` pattern (today only `sqrt` as a unary op
  in [convert.ts:6-11](../../../Converter/utils/convert.ts#L6-L11)) with an explicit
  **allow-list** of pure numeric functions: `min`, `max`, `median`, `mean`/`avg`, `sum`,
  `clamp`, `round`, `floor`, `ceil`, `abs`, `pow`. Each is registered as a named op/function
  so the expression can call it by name only.
- RCE mitigations — **a numeric-only context is NOT sufficient on its own.** `jse-eval`
  ships live evaluators for `MemberExpression`, `CallExpression`, `ThisExpression`,
  `NewExpression`, `ArrowFunctionExpression`, and `AssignmentExpression`/`UpdateExpression`
  (see [index.d.ts](../../../../../node_modules/jse-eval/dist/index.d.ts)). It resolves
  member access against the **real JS value**, not a sandbox — so even with a purely numeric
  context, `width.constructor.constructor("return process")()` evaluates `width` → `Number`
  → `Function` → **call** → RCE. The boundary lives in the AST evaluators, not the context.
  The mitigations are therefore active and explicit:
  - **Neuter the dangerous evaluators.** Delete/override the `MemberExpression`,
    `ThisExpression`, `NewExpression`, `ArrowFunctionExpression`, `AssignmentExpression`,
    and `UpdateExpression` entries on `ExpressionEval.evaluators` (the static map exposed by
    `jse-eval`) so they return `undefined`/throw rather than touch real object properties or
    the prototype chain.
  - **Restrict `CallExpression` to the allow-list.** Variadic ops (`min`/`max`/`median`/…)
    require `CallExpression` — the same evaluator that enables `Function(...)()`. Override it
    so the callee must be a **bare identifier** resolved against the registered allow-list;
    reject any `MemberExpression` callee outright. Keeping `CallExpression` intact while
    "just registering functions" would leave the hole open.
  - The evaluation **context stays numeric-only** — a necessary but secondary defence: no
    functions, objects, or arrays are placed in `context`. With member/call access locked
    down above, an unknown identifier evaluates to `undefined`/`NaN` and is coerced to `0` by
    the existing `Number.isFinite` guard ([computeLogoCost.ts:146-147](../../utils/computeLogoCost.ts#L146-L147)).
  - Compilation failures already fall back to `undefined` via `safeCompile`
    ([computeLogoCost.ts:43-49](../../utils/computeLogoCost.ts#L43-L49)); the same guard
    rejects malformed/oversized expressions.
  - The allow-listed functions are pure and side-effect-free; none expose `this`, the
    prototype chain, or host globals.
- The allow-list lives in one place so material/process cost expressions (which compile via
  the same Converter `registerPlugin`) inherit the identical, audited capability set.

### 3. Per-unit → garment total via grades

- In [typings.ts](../../typings.ts): add `computedTotal?: CompoundValue` to `LogoNode`
  (mirroring `MaterialNode` at [typings.ts:180](../../typings.ts#L180); note `ProcessNode`
  has no such field) and a `garmentTotal: number` field to `LogoCostAudit` alongside the
  existing per-unit `total` (kept as-is for the smaller blast radius).
- In [computeLogoCost.ts](../../utils/computeLogoCost.ts): the per-unit cost stays the sum
  of placement costs (already computed as `total`). Add a garment total computed as
  `perUnitCost * gradesTotal`, where `gradesTotal` is the already-summed graduation
  `amount` ([computeLogoCost.ts:100](../../utils/computeLogoCost.ts#L100)). Return it as a
  second `CompoundValue` (absolute `BRL`, dividend `un`/garment). This mirrors materials'
  `totalAggregate = Σ garmentAmount * convertedForG`
  ([computeMaterialCost.ts:202-203](../../utils/computeMaterialCost.ts#L202-L203)).
  The elective-gated path returns total `0` for both, unchanged.
- In [middlewares.ts](../../store/computation/middlewares.ts): the LOGO bulk loop writes
  back `computedTotal` in addition to `computedCost`/`costAudit`
  ([middlewares.ts:154-157](../../store/computation/middlewares.ts#L154-L157)).
  `computedTotal` is **already** present in `COMPUTED_WRITE_BACK_KEYS`
  ([middlewares.ts:25](../../store/computation/middlewares.ts#L25)), so the new write-back
  already won't retrigger the listener — no change needed to that set.
- UI: [LogoItem.tsx](../../components/viewports/LogoListAccordion/LogoItem.tsx) shows the
  garment total beside the per-unit cost; the audit popover shows both figures and the
  `gradesTotal` multiplier (already displayed).

## Status notes

Implemented. How each design decision landed:

- **Audit field naming.** Kept `LogoCostAudit.total` as the per-unit figure and added a
  separate `garmentTotal` (smaller blast radius on existing tests/UI).
- **Shared evaluator module.** The allow-list and the AST hardening live in
  [Converter/utils/safeExpression.ts](../../../Converter/utils/safeExpression.ts), imported
  for side effects by [convert.ts](../../../Converter/utils/convert.ts) so logos, materials,
  processes, and unit conversions share one audited capability set. Variadic ops
  (`min`/`max`/`median`/…) are dispatched by a replaced `CallExpression` evaluator (callee
  must be a bare allow-listed identifier); the existing `sqrt` unary op is retained and also
  callable as a function.
- **Per-placement, no inheritance.** Every placement defines its own expression; there is no
  logo-level default. A freshly added placement starts unpriced (cost 0) until an expression
  is set.
- **Migration.** None. Per-placement pricing landed in the same change as logo cost itself,
  so no saved model carries a node-level `costExpression` to fold forward;
  [computeLogoCost.ts](../../utils/computeLogoCost.ts) reads only `placement.costExpression`.
- **Tests.** Security/allow-list boundary pinned by a fast unit test
  ([safeExpression.test.ts](../../../Converter/utils/safeExpression.test.ts), 49 assertions);
  the logo cost e2e ([cost.e2e.test.ts](../../tests/standalone/functionality/cost.e2e.test.ts))
  now sets expressions per placement.

## Security

The core risk is RCE through operator-authored cost expressions. Mitigations (above):
numeric-only evaluation context, an explicit pure-function allow-list, no host
functions/objects/prototypes reachable from the AST, non-finite/unknown results coerced to
`0`, and compile failures rejected by `safeCompile`. No new network, filesystem, auth, or
secret surface.

These invariants must be **locked down by an automated test**, not just code review — the
allow-list is the security boundary and silent regressions (a future contributor exposing a
host function or object in the context) would reopen the RCE hole. The test asserts a
malicious-expression corpus all evaluates to `0`/`NaN`→`0` and never executes, e.g.:
`constructor.constructor("return process")()`, `this`, `globalThis`, `[].constructor`,
`__proto__`, `import("fs")`, property access on the numeric context (`width.constructor`),
and any identifier outside the allow-list. The same test pins the **positive** allow-list
(`min`/`max`/`median`/`clamp`/… return correct values) so the boundary is asserted from both
sides. It belongs with the existing logo cost e2e/unit coverage
([cost.e2e.test.ts](../../tests/standalone/functionality/cost.e2e.test.ts)); a fast unit test
directly over the shared evaluator is preferred so the corpus runs cheaply on every change.
Expression length/complexity should be bounded to avoid pathological compile/eval (see
Performance).

## Performance

Cost recompute runs in the debounced computation middleware's LOGO bulk loop over all logo
nodes on every non-conversion graph action — unchanged in shape. Per-placement compilation
adds one `compile` call per placement instead of one per logo; placements per logo are small
(handful), so the delta is negligible against the existing material/process loops. The
garment-total step is a single multiply per logo. The allow-listed functions are O(1) except
`median`/`sum`/`mean` over their argument list, which is bounded by the expression's literal
arity. Recommend bounding expression length to keep `jse-eval` compile time predictable. No
benchmark required; if logo cardinality grows, fold logos into the existing perf-test
cardinality tiers rather than measuring in isolation.
