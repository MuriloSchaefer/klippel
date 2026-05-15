---
id: 2026-05-14-ee6c76
name: auto-scale result display unit
description: Pick the display unit within a scale so a computed result always shows with at most 2 integer digits.
status: implemented
modules: [Converter, Composer]
---

## Context

Computed results (process time, process cost, material consumption) are shown
in a fixed unit — e.g. time always renders as `min`, material always in its
stored unit. This produces unreadable numbers: `0.0042 min`, `1843.0 g`,
`0.08 Kg`. The request: a result should always be displayed in the unit of its
scale that keeps the **integer part to at most 2 digits**.

Rules:
- If the value is `< 1`, step **down** to a smaller unit in the same scale
  (e.g. `0.08 Kg` → `80 g`).
- If the value has **more than 2 integer digits**, step **up** to a larger
  unit (e.g. `1843 g` → `1.843 Kg`, then `1.843 Kg` is fine).
- Stop at the smallest/largest unit of the scale even if the rule can't be
  fully satisfied (e.g. a huge value with no larger unit just stays).

## Change

This module owns the scale-aware unit selection. Add a pure helper, e.g.
`src/system/modules/Converter/utils/pickDisplayUnit.ts`:

```
pickDisplayUnit(
  conversionGraph,
  value: { amount: number; unit: string },
): { amount: number; unit: string }
```

Behavior:
1. Resolve the scale of `value.unit` via the `BELONGS_TO` edge. If the unit
   belongs to no scale, return the value unchanged.
2. Enumerate the scale's sibling units and their magnitude relative to the
   scale base. Magnitude comes from each unit's `CONVERTS_TO`-to-base factor
   (the same logic `traceConversion.getBaseUnit` already uses for `factor`
   edges; for `expression` edges evaluate with `quantidade = 1`). Order
   siblings by magnitude.
3. Convert `value` into each candidate unit (reuse `convert`) and pick the
   smallest unit whose amount has `< 1000`... — precisely: pick the unit where
   `1 <= abs(amount) < 100` if one exists; otherwise the closest:
   - if every candidate is `< 1`, pick the largest-magnitude-smallest-unit that
     still maximises the amount (the smallest unit available);
   - if every candidate is `>= 100`, pick the largest unit available.
4. Return `{ amount, unit }` in the chosen unit. Never throws — on any lookup
   failure, return the input unchanged.

Notes / decisions:
- "At most 2 integer digits" = `abs(amount) < 100`. The comparison is on the
  raw value; **no rounding** is applied — `pickDisplayUnit` only changes the
  unit and returns the exact converted amount. Callers render full precision.
- Compound results (e.g. `min / un`): only the **quotient** unit is scaled; the
  dividend stays fixed (`un`). The helper takes a simple `{amount, unit}` — the
  caller passes the quotient and recombines. A thin `pickDisplayCompound`
  wrapper may be added if multiple call sites need it.
- This is display-only. Stored/computed values and their canonical units do not
  change — only what the UI renders.
- `pickDisplayUnit` is exposed through the module's public surface
  (`IConverterModule`), since Composer is a separate module and consumes it.

## Status notes

Implemented. `src/system/modules/Converter/utils/pickDisplayUnit.ts` added and
exposed via `IConverterModule.utils.pickDisplayUnit`. It resolves the scale via
the unit's `BELONGS_TO` edge, converts the value into every sibling unit with
`convert`, then picks the largest amount still `< 100` (or the smallest amount
when every candidate overflows). Selection is on the raw value — no rounding.

## Security

None. Pure, display-only computation over already-loaded graph data; no new
inputs, IO, or permissions.

## Performance

Negligible. Runs once per rendered result row; each call does a handful of
`convert` walks within a single scale. If a hot list renders many rows,
memoise per `(amount, unit)` — noted, not required for first cut.
