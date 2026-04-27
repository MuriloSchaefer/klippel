# Change: Consumption per Grade

**Context:** [Composition Graph — structure & conventions](../architecture/composition-graph.ts)
**Status:** Draft
**Depends on:** [Store Graduation Amounts for Process Time Computation](graduation-amount-storage.md)

---

## Motivation

Today the `ConsumesEdge` between a `ProcessNode` and a `MaterialNode` carries a
single `amount: CompoundValue` representing the material a process consumes per
garment unit. The total usage shown in the material list accordion is computed
as `amount × Σ graduation.amount`, treating every graduation as if it consumed
the same quantity per garment.

In practice consumption varies per grade — a size G garment consumes more fabric
than a size P. We need to allow the user to set a distinct consumption per
graduation and to use those grade-specific values when computing both the
per-unit summary and the total usage.

## Data model change

Keep the default `amount` on `ConsumesEdge` and add **two parallel
per-graduation maps**:

- `consumptionPerGrade` — the authoritative absolute consumption per grade
  (user-editable),
- `gradeDeltas` — the signed percentage delta against the default (persisted
  but **read-only** from the user's perspective; recomputed every time
  `amount` or `consumptionPerGrade[graduationId]` changes).

Persisting `gradeDeltas` keeps the edge self-describing: any consumer reading
the graph can render the percentage badge or feed it into reports without
re-deriving it. The invariant is enforced by the variation actions, never by
the UI.

```ts
export type ConsumesEdge = Edge & {
  type: "CONSUMES";
  amount: CompoundValue; // default consumption (baseline)
  consumptionPerGrade?: {
    [graduationNodeId: string]: CompoundValue; // explicit consumption for this grade
  };
  gradeDeltas?: {
    [graduationNodeId: string]: number; // derived: signed % vs. amount; persisted but read-only
  };
};
```

Mirror the same shape on `ConsumedByEdge` so reverse traversal stays consistent.

Rules:

- `amount` remains required and is the fallback when a graduation has no entry
  in `consumptionPerGrade`.
- `consumptionPerGrade[graduationId]` is the authoritative consumption for that
  graduation. The dividend should normally match `amount.dividend`; if it
  differs the value is converted before comparing.
- `gradeDeltas[graduationId]` is **always** kept consistent with
  `consumptionPerGrade[graduationId]` and `amount` via the formula
  `delta = ((override.quotient.amount − amount.quotient.amount) / amount.quotient.amount) × 100`
  (after normalising dividends). The UI must not write to it directly.
- a missing entry in `consumptionPerGrade` implies no entry in `gradeDeltas`
  (and vice versa); the two maps share the same key set.
- removing a graduation node must drop the matching entries from both
  `consumptionPerGrade` and `gradeDeltas` on every `ConsumesEdge` referencing
  it (cleanup happens in the variation action `removeGraduation`).

### Invariant maintenance

A single helper keeps the two maps in sync:

```ts
function recomputeGradeDelta(edge: ConsumesEdge, graduationId: string): number | undefined {
  const override = edge.consumptionPerGrade?.[graduationId];
  if (!override) return undefined;
  const base = edge.amount.quotient.amount;
  if (base === 0) return undefined; // surfaced as "—" in UI
  return ((override.quotient.amount - base) / base) * 100; // assumes normalised dividends
}
```

The variation actions call this helper whenever:

- `amount` changes (recompute `gradeDeltas[g]` for every key in
  `consumptionPerGrade`),
- `consumptionPerGrade[g]` is set (write/refresh `gradeDeltas[g]`),
- `consumptionPerGrade[g]` is cleared (delete `gradeDeltas[g]`).

This guarantees the persisted percentages never drift from the absolute
values.

## Composition graph change

The graph remains the authoritative source. The CONSUMES edge now encodes a
default consumption plus an optional explicit consumption per graduation:

- when no graduations exist, the edge behaves as before (`amount` is the only
  value).
- when graduations exist, each graduation either has its own
  `consumptionPerGrade` entry (a full `CompoundValue`) or falls back to
  `amount`.
- snapshots and persisted variations include both `consumptionPerGrade` and
  `gradeDeltas` verbatim. The variation actions are responsible for keeping
  `gradeDeltas` consistent with `consumptionPerGrade` and `amount`; readers can
  trust the stored percentages.

## UI integration

### `ProcessMaterialUsageButton`

The form that edits a process → material consumption gains a per-grade editor.

- list each graduation linked to the garment, sorted by `order`.
- for each row, show:
  - the graduation label,
  - a `CompoundSelector` bound to
    `consumptionPerGrade[graduationId] ?? amount` for editing the absolute
    consumption,
  - a **read-only** badge displaying `gradeDeltas[graduationId]` (e.g. `+10%`,
    `-5%`, `—` when there is no override). The value comes from the persisted
    map and is refreshed by the variation action whenever either side changes.
- a per-row toggle ("usar padrão" / "personalizar") clears or installs the
  override. Switching to "personalizar" seeds the override from the current
  default; switching back removes the entry.
- editing the default `amount` keeps existing overrides intact; the variation
  action recomputes every entry of `gradeDeltas` against the new baseline as
  part of the same write.

New variation actions:

- `setProcessMaterialConsumptionForGraduation(processNodeId, materialNodeId, graduationId, consumption)`
- `clearProcessMaterialConsumptionForGraduation(processNodeId, materialNodeId, graduationId)`

The existing `updateProcessMaterialConsumption` continues to write the default
`amount` and, in the same reducer pass, recomputes every entry of
`gradeDeltas` so the persisted percentages stay aligned with the new baseline.
There is no setter for `gradeDeltas` — it is fully managed by the actions
above.

### `MaterialListAccordion`

Total usage already considers the sum of graduation amounts. After this change
it must aggregate per graduation instead of multiplying the default by the sum:

```
total = Σ_g graduation[g].amount × resolveConsumption(edge, g)
```

where

```
resolveConsumption(edge, g) = edge.consumptionPerGrade?.[g] ?? edge.amount
```

The "consumption per unit" line continues to show the default `amount` for
backwards-compatible reading. When at least one graduation has an override, the
UI surfaces a small indicator (e.g. asterisk or chip) next to the per-unit
value, and the audit detail panel lists the per-grade breakdown — including
the absolute consumption and its derived `gradeDelta` (`+x%` / `-x%`).

## Cost & total computation

`computeMaterialCost` currently reduces every `ConsumesEdge` to a single
converted scalar accumulated into `totalCost`. After this change the reducer
becomes:

1. read all graduations attached to the garment, sorted by `order`.
2. for each `ConsumesEdge` consuming this material:
   - for each graduation `g`, resolve the effective consumption with
     `resolveConsumption(edge, g)`.
   - convert it to the material's stock unit using the existing
     `traceConversion` flow.
   - accumulate `g.amount × converted` into the running total.
3. the per-unit value displayed in `MaterialCostInfo` remains the converted
   default (current behaviour). The new total reflects the grade-aware sum.

Audit entries (`ProcessStepAudit`) gain an optional `graduationBreakdown` that
records `{ graduationId, graduationLabel, garmentAmount, consumption, gradeDelta, convertedAmount, contribution }`
for traceability in the cost detail panel. `gradeDelta` is read directly from
the persisted `gradeDeltas` map (no recomputation needed at audit time).

When no graduations exist the formula degenerates to the current behaviour and
no migration is required for existing graphs (missing `consumptionPerGrade` is
treated as empty).

## Migration

- existing edges keep working: both `consumptionPerGrade` and `gradeDeltas` are
  optional.
- no schema bump for stored variations; older payloads load with both fields
  undefined and behave exactly as before. The first write that introduces an
  override populates both maps atomically.
- removal of a graduation must sweep matching keys from both
  `consumptionPerGrade` and `gradeDeltas` to avoid dangling entries.
- if a loaded payload ever has a stale `gradeDeltas` entry (e.g. produced by a
  buggy writer), the next mutation through the variation actions will
  recompute and overwrite it — readers should still treat the persisted value
  as the source of truth for display.

## Out of scope

- per-grade editor inside the graduation list — editing stays under the process
  material usage popover.
- inheritance from a "base" graduation — only explicit overrides are supported.
