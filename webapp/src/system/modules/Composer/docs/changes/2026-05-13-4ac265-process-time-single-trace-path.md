---
id: 2026-05-13-4ac265
name: Collapse computeProcessTime to a single trace path
description: Drop the inverse-form convert() branch and the minutes-fallback branch from computeProcessTime now that the conversion graph covers every temporal × unitario pairing; expose initial context and planned steps in the audit, and surface failures with partial state instead of silently returning undefined.
status: implemented
modules: [Composer, Converter]
---

## Context

`computeProcessTime` carried three escape hatches (inverse-form via `convert()`, generic `traceConversion`, and a "dividend already in minutes" raw fallback) because the converter would normalize `min/un` to `seg/un` (temporal scale base = `segundos248`) and then fail to find a `seg/un` compound node. Each branch reshaped the audit differently, and the audit on failure was simply `undefined` — making errors invisible in the UI.

After this change the conversion graph covers every temporal × `unitario18` pairing in both orientations (see companion change in `Converter/docs/changes/`), and `traceConversion` short-circuits base-unit normalization when the un-normalized compound node already exists. Both removed the need for the special branches.

## Change

### `utils/computeProcessTime.ts`
- Removed the inverse-form branch (no more direct `convert()` import).
- Removed the "raw dividend in minutes" fallback.
- Single path now: validate process → one `traceConversion` call → one audit-mapping block. Success writes `result`; failure writes `error` and whatever partial state the trace produced.
- Target quotient/dividend hoisted to optional parameters (`targetQuotient`, `targetDividend`), defaulting to `minutos249` / `unitario18`.
- Returns a populated audit even on early-exit paths (`costTime` missing → audit with `error: "Processo sem costTime definido."`).

### `components/viewports/MaterialListAccordion/utils/traceConversion.ts`
- New `findCompound(quotient, dividend)` helper. Looks up the compound node by un-normalized units first; only falls through to base-unit normalization when no direct match exists. This makes `min/un → min/un` a trivial identity path instead of a `seg/un` lookup that fails.
- Failure return shape extended with optional `initialContext`, `plannedSteps`, partial `steps`, and `attributeConversions` so the audit can show planned work even when execution didn't reach the end.
- Step execution wrapped in try/catch: an eval error on step `i` returns `error` plus the steps that *did* run, the planned remainder, and the initial context.
- Success return also exposes `initialContext` and `plannedSteps`.

### `typings.ts`
- `ProcessTimeAudit` gained optional `error`, `initialContext`, `plannedSteps`. `result` became optional (absent when `error` is set).
- New `PlannedConversionStep` type (`fromUnit`, `toUnit`, `expression`).
- `fallback` field on `ProcessTimeAudit` retained as optional for backwards compatibility but is no longer produced by the single-path implementation.

### `components/viewports/ProcessTimeAccordion/ProcessTimeAuditContent.tsx`
- New sections rendered regardless of success/failure: **Contexto inicial** (variable→value table) and **Conversões planejadas** (full path with raw expressions; each step marked "executado" or "não executado" depending on whether the walk reached it).
- The error block replaces the result block when present and includes a "Mostrar erro completo" toggle button that expands long error messages. Only the result section displays the error — no separate error block above the steps.

### `components/viewports/ProcessTimeAccordion/index.tsx`
- Added a `Chip` next to each process label showing the linked `ElectiveNode` (green when `value=true`, default gray otherwise; hidden when no elective is linked). Mirrors the existing pattern in `ProcessItem.tsx`.

## Status notes

Implemented. The `fallback` audit field is dead in production but kept on the type to avoid touching unrelated graduation-audit code. The legacy `MaterialListAccordion`-located `traceConversion` is still consumed by material-cost too; the `findCompound` short-circuit is backwards-compatible (only triggers when the un-normalized form is already a graph node).

## Security

None.

## Performance

Net win on the process-time pipeline: one trace call instead of up to three sequential attempts, and zero `seg/un` lookup detour. Audit payloads grow modestly (initial context + planned steps), but this fires once per debounced graph mutation, not per render.
