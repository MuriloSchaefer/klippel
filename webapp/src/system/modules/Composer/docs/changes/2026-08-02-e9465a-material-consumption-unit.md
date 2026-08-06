---
id: 2026-08-02-e9465a
name: Material consumption unit
description: Usage/cost math targets the material type's `consumptionUnit` when declared, and converts totals back into the stock unit for stock-coverage reads.
status: implemented
modules: [Materials, Composer]
---

## Context

`computeMaterialCost` hard-codes the conversion target for every `CONSUMES`
edge to the material's stock unit:

```
utils/computeMaterialCost.ts:54-61
  totalCost.quotient.unit      = materialState.stock.unit
  totalAggregate.quotient.unit = materialState.stock.unit
```

Materials gains an optional `consumptionUnit` on the material **type schema**
(see the Materials half of this change document). This module is the consumer:
when the schema declares one, it becomes the target unit for usage per unit and
for the grade-aware aggregate total; when it does not, behaviour is byte-for-byte
what it is today.

Because usage is also read *against stock* ("Em estoque" on the material row,
the material line in the cost audit), a diverging consumption unit would leave
two incomparable numbers side by side. So when the two units differ, the totals
are additionally converted back into the stock unit for those comparison reads.

## Change

### Resolving the target unit

- `utils/computeMaterialCost.ts` — new optional `consumptionUnit?: string`
  parameter. `const targetQuotientUnit = consumptionUnit || materialState.stock.unit`
  is computed once and used for both `totalCost.quotient.unit` and
  `totalAggregate.quotient.unit`. Everything downstream already reads
  `totalCost.quotient.unit` (`convertOnce`, the error-message `targetUnits`,
  `convertedUnit` on each `ProcessStepAudit`), so no other line in the per-edge
  loop changed. The dividend stays `unitario18`.
- `store/computation/middlewares.ts` — resolves the unit via
  `resolveTypeSchema(materialType, materialState.schemaVersion)` from the
  Materials module and passes `schema?.consumptionUnit` in. That resolver reads
  the type's **latest** schema, not the material's pinned version — the
  reasoning is in the Materials half of this document (Status notes, decision 4).
  The middleware already holds the full root state, so this is a plain lookup —
  no new selector subscription, no extra dispatch.
- `store/computation/middlewares.ts` — the effect body was extracted into a
  `recomputeGraph(graphId, state, dispatch)` helper, and a **second listener**
  added on `materialTypeVersionRegistered`. That action carries no `graphId` and
  changes nothing about the loaded graphs, so the original graph-action matcher
  could never see it; without the second listener a consumption-unit edit would
  sit stale until the next node/edge edit or model reopen. It walks every loaded
  non-conversion graph behind the same 300 ms debounce.

  Only the *settled* event is matched, not the `registerMaterialTypeVersion`
  command — the schema has to be in Redux before a recompute can read it.
  `materialsCatalogLoaded` was deliberately **not** added: it fires on every
  peer catalog sync, and at 100k materials that would turn each sync tick into a
  full recompute of every open graph.

### Stock-equivalent conversion for comparison reads

- `utils/computeMaterialCost.ts` — when `targetQuotientUnit !==
  materialState.stock.unit`, the finished totals are re-expressed in the stock
  unit by `convertQuotientToStockUnit`. Two new return values:
  `stockEquivalentCost` and `stockEquivalentTotal` (`CompoundValue |
  undefined`), both `undefined` when the units already match or when the
  conversion fails — a failure never blanks out the primary result, it only
  records the reason in the audit.

  That helper tries **two routes, in order**:

  1. compound → compound (`m²/un → Kg/un`) via `traceConversion`. Preferred:
     the graph models material conversions at this level, and those edges carry
     the gramatura/rendimento expressions that make the conversion meaningful.
  2. quotient-only (`m → Kg`) via the Converter's `convert`. Both sides share
     the same dividend, so the conversion reduces to a plain unit conversion of
     the numerator.

  Route 2 is not merely a fallback. When the stock unit *is* `unitario18` — any
  per-piece material: linha, botão, agulha — the compound target would be the
  degenerate `un/un`, which nobody models and which will never exist in the
  graph. The first cut asked for it anyway and every such material reported
  `Unidade composta de destino não encontrada no grafo: unitario18/unitario18`
  in its audit. Route 1 is skipped outright in that case.

  A `hasConversionPath` BFS over `CONVERTS_TO` edges gates route 2, because
  `convert` logs an error and throws when no path exists — and this recompute
  runs on every graph edit, so an unconvertible pair would spam the console
  indefinitely. When there is genuinely no path the audit says so in words
  ("não há conversão definida entre essas unidades…") instead of naming
  internal node ids.
- `typings.ts` — `CostAudit` gained `targetUnit?: string` and
  `stockEquivalent?: { unit: string; cost: number; total?: number; error?:
  string }`; `MaterialNode` gained `computedStockEquivalentCost?` /
  `computedStockEquivalentTotal?`. Both new node keys are registered in
  `COMPUTED_WRITE_BACK_KEYS` — without that the write-back cycle guard would not
  recognise them and the middleware would re-enter on its own updates.

### Display

- `components/viewports/MaterialListAccordion/components/MaterialCostInfo.tsx` —
  the per-unit and total figures render in the consumption unit automatically
  (they already read `cost.quotient.unit`). Trails the stock-unit equivalent
  when present, e.g. `3.200 m / un · Total: 320.000 m ≈ 96.000 Kg em estoque`,
  under `data-testid="material-cost-stock-equivalent"`.
- `components/viewports/MaterialListAccordion/components/MaterialCostAuditContent.tsx`
  — a "Unidade de consumo:" line below "Material:", rendered only when the
  target differs from the stock unit, carrying the stock equivalent per unit and
  in total, or the conversion error in warning colour. The consumption unit is
  added to the `useUnits` id set so its abbreviation resolves.
- `components/viewports/MaterialListAccordion/components/ShowMaterial.tsx` —
  "Em estoque" still renders `stock.amount` in the stock unit. Gained a
  `data-cost-unit` mirror on the `material-cost-info` span so e2e can wait on
  the recompute landing instead of polling text (e2e-tests.md §2).
- `components/viewports/ProcessListAccordion/processMaterialUsageButton.tsx` —
  the new-consumption form seeded a hard-coded `kilogramas6 / unitario18`. Now
  seeds the quotient from the selected material's consumption unit (falling back
  to its stock unit, then to that hard-coded default, extracted as
  `defaultConsumption()`), so the user is not typing a value in one unit that is
  immediately converted into another. UX default only — the `CompoundSelector`
  stays fully editable and any source unit still converts.

### Tests

- `tests/standalone/functionality/linkProcessMaterial.e2e.test.ts` — new
  describe: link a `malha` material (stocked in `kilogramas6`), assert the row
  reports usage in `kilogramas6`, register `malha@0.0.2` with
  `consumptionUnit: metros5`, and assert the *already-linked* material — still
  pinned to `0.0.1` — flips to `metros5`. That last step is the regression guard
  for both the latest-schema rule and the new registration listener.
- `tests/standalone/functionality/openMaterialAuditLog.e2e.test.ts` — new
  describe (last in the file, since it mutates the shared `malha` type) that
  asserts the audit prints the "Unidade de consumo" line once the target
  differs from the stock unit.
- Existing cases (no `consumptionUnit` declared) are unmodified — that is the
  regression proof for the fallback.
- `components/.../drivers/ShowMaterial.click.puppeteer.ts` — new
  `waitForMaterialCostUnit(page, label, unitId)` helper wrapping the
  `data-cost-unit` mirror wait.

## Status notes

Implemented. `npx tsc -p webapp/tsconfig.json --noEmit` passes.

Verified against the running dev app's live state (a `linha` type with
`stockUnit: unitario18` / `consumptionUnit: metros5`, and a `malha` with
`consumptionUnit: metrosquadrados17` over `stockUnit: kilogramas6`): the malha
stock equivalent is unchanged at 0.4125 Kg/un and 12.705 Kg total, and the linha
audit now reports the missing conversion in words rather than the degenerate
`unitario18/unitario18` compound lookup.

**Two follow-ups, tracked separately as `2026-08-02-c8636c`:** that same `linha`
material initially computed `0.000 m` and showed no stock equivalent. Neither
was caused by this change — the pre-change code path produces the same zero —
but both had to be resolved before the feature was usable for per-piece
materials:

1. Its CONSUMES edge read `4 m / 1 m`, and no `m/m` compound exists. Resolved as
   data: the edge is now `4 m / un`, which the graph does model.
2. There was no `metros5 → unitario18` conversion at all, so the stock
   equivalent could never resolve for thread. Adding one exposed a DFS
   predecessor bug in `convert`. Both fixed under `c8636c`.

With those in place the material reports 4 m/un, 120 m total, ≈0.3 cones.

The e2e cases above were authored but **not executed** — they require a live
Electron dev app reachable over CDP (`npm run test:e2e`), which was not running
in this session. They should be run before merge.

Settled during implementation: schema-level placement, stock-unit fallback,
converting back to the stock unit for comparison reads, and reading the unit
from the type's latest schema rather than the material's pinned version (see the
Materials half, Status notes decision 4).

Remaining open questions:

- Whether `stockEquivalent` should also be computed per graduation in
  `GraduationBreakdownEntry`. Shipped computing it only on the two aggregate
  values (cost, total), keeping the extra conversion count at O(1) per material
  rather than O(graduations).
- What to show when the consumption→stock hop has no path in the conversion
  graph (e.g. metres → kg on a material with no gramatura attribute). Shipped
  degrading to "no equivalent shown" on the material row, with the error string
  in `CostAudit.stockEquivalent.error` surfaced in the audit panel. An inline
  warning chip on the row is the alternative if that proves too quiet.

## Security

None. No new input surface — the target unit is a unit-node id read from a
schema the Materials module already persists and syncs. The extra conversion
hop reuses `traceConversion`, which evaluates only expressions already stored on
conversion-graph edges via the existing `safeExpression` path; this change adds
no new expression source and no new evaluation context.

## Performance

The recompute path gains at most **one** additional `traceConversion` call per
material (not per edge, not per graduation), and only when the consumption unit
differs from the stock unit. The dominant cost of the listener is already the
per-`CONSUMES`-edge conversion inside the loop plus the per-graduation override
hops; this is a constant-factor addition on top.

Everything stays inside the existing 300 ms debounce and the existing single
batched write-back, so no new render passes are introduced. The two new
`computedStockEquivalent*` keys **are** registered in
`COMPUTED_WRITE_BACK_KEYS`; had they not been, the middleware would re-enter on
its own write-back and the recompute would loop. That is the first thing to
check if a recompute storm ever shows up here.

The new `materialTypeVersionRegistered` listener recomputes every loaded
non-conversion graph. Registering a schema version is a rare, explicit user
action and the work is the same recompute a model open already does, so this is
not a hot path. `materialsCatalogLoaded` was kept off the matcher precisely
because it is one.

Two extra optional `CompoundValue`s per material node are persisted into the
variation graph — negligible against the existing `costAudit` payload, which
already carries per-process and per-graduation breakdowns.

Worth a run of the existing Composer computation benchmarks on a graph with many
materials to confirm the added hop stays in the noise.
