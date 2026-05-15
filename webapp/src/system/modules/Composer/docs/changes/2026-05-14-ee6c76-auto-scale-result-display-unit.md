---
id: 2026-05-14-ee6c76
name: auto-scale result display unit
description: Render process time and material results in a scale unit that keeps the number to at most 2 integer digits.
status: implemented
modules: [Converter, Composer]
---

## Context

Computed results in the Composer viewports are shown in a fixed unit, producing
unreadable numbers — `0.0042 min`, `1843.0 g`, `0.08 Kg`. The request: every
result should display in the unit of its scale that keeps the **integer part to
at most 2 digits** — drop to a smaller unit when `< 1`, climb to a larger unit
when over 2 digits.

The scale-aware unit-picking logic lives in the Converter module (see its
matching change doc). This module's part is calling that helper at each result
render site and recombining compound results.

## Change

Apply `pickDisplayUnit` (from Converter) at the points where a final result is
rendered. Display-only — `computedTimePerUnit`, `costMoney`, material amounts
and their canonical units are untouched.

`pickDisplayUnit` is consumed from the `IConverterModule` public surface.

Affected render sites:

- **ProcessTimeAccordion** — `ProcessTimeAuditContent.tsx`: the "Tempo por
  unidade" block currently renders `audit.result.amount.toFixed(4)` +
  `abbr(audit.result.unit)`. Pass the result's quotient through
  `pickDisplayUnit` and render the rescaled amount/unit **at full precision —
  no rounding or `toFixed`**. The audit's intermediate steps and raw cost stay
  as-is (they are diagnostic).
  Also the per-row summary in `ProcessTimeAccordion/index.tsx` if it shows a
  result number.
- **ProcessCostAccordion** — no change. The monetary scale has no sub/super
  units to step to, so `pickDisplayUnit` would be a no-op. Cost figures stay in
  `reais`. (If routed through the shared helper anyway it harmlessly returns
  the input unchanged, but there is no reason to touch this viewport.)
- **MaterialListAccordion** — result/consumption rendering: route the
  displayed material amount through `pickDisplayUnit` against the material's
  own scale (`peso5`, volume, length, area, …).

Compound results (`min / un`, `R$ / un`): scale only the **quotient**; keep the
dividend (`un`) fixed. Each call site extracts the quotient `{amount, unit}`,
calls `pickDisplayUnit`, and recombines for display.

Add a shared formatting helper under
`src/system/modules/Composer/utils/` (e.g. `formatScaledResult.ts`) so the
three viewports format consistently (rescale + abbr lookup) instead of each
repeating `toFixed` + `abbr`. **No rounding** — the helper renders the exact
rescaled amount; it only swaps `toFixed` for full-precision display plus the
unit abbreviation.

## Status notes

Implemented. `src/system/modules/Composer/utils/formatScaledResult.ts` added —
calls `pickDisplayUnit` and resolves the chosen unit's abbreviation straight
from the conversion graph (so it works even when the rescaled unit was not in a
component's filtered `useUnits` subset).

- `ProcessTimeAuditContent.tsx` — the "Tempo por unidade" result now renders
  through `formatScaledResult` at full precision (replaced `toFixed(4)` + the
  local `abbr` lookup). Diagnostic sections (raw cost, steps) untouched.
- `MaterialCostInfo.tsx` — the per-unit cost and the running total now render
  through `formatScaledResult` on the compound's quotient; the dividend (`un`)
  abbreviation is unchanged. `costAbbreviation` removed (superseded).

Scope: time + material only — ProcessCostAccordion excluded (monetary scale is
single-unit, so rescaling would be inert).

## Security

None. Display-only transformation of already-computed values; no new inputs or
permissions.

## Performance

Low. One extra `pickDisplayUnit` call per rendered result row. For long
material/process lists, memoise the formatting helper per `(amount, unit)` —
noted, not required for the first cut.
