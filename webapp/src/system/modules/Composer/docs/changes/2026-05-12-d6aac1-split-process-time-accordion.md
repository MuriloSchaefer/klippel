---
id: 2026-05-12-d6aac1
name: Split ProcessTimeAccordion into time and cost accordions
description: Refactor ProcessTimeAccordion into two separate accordions (time consumption and money cost), starting with time consumption and computing graduation-level totals.
status: partially implemented
modules: [Composer, Converter]
---

## Revised UI requirements (2026-05-13)

After the first pass landed, the user clarified the time-accordion shape:

- **Per-process rows**: per-unit timing (unchanged).
- **Total row**: a single number summing across *all* graduations — `Σ ProcessNode.computedTimePerUnit × Σ GraduationNode.amount` (i.e. total minutes to produce every garment in every graduation). The per-graduation sub-list introduced in the first pass is removed; graduations contribute only to the aggregated total, displayed next to the unit count.
- **Audit button per process row**: mirrors the material audit pattern (`PointerContainer` + `FactCheckOutlined` `IconButton`), opening a popover with `ProcessTimeAuditContent`. The popover renders the `ProcessNode.timeAudit` captured by `computeProcessTime`: raw `costTime`, attribute normalisations (⚠ flagged), ordered conversion steps with expressions and values, fallback branch (⚠ flagged) when applicable, and the final per-unit result with timestamp.

`GraduationNode.computedProcessTime` and `processTimeAudit` remain on the graph (still computed and written by `computeGraduationProcessTotals`) — they are no longer rendered in the accordion but stay available for the deferred per-graduation audit UI and other consumers.

The audit-button keyboard shortcut + MCP tools (`openProcessTimeAudit` / `openProcessTimeAuditShortcut`) remain deferred — only the UI affordance is in place now.

## Implementation state (2026-05-13)

**Landed (time pipeline only — current scope per agreed split):**

- `typings.ts`: added `ProcessTimeAudit` and `GraduationProcessTimeAudit`; extended `ProcessNode` with `computedTimePerUnit?` + `timeAudit?` and `GraduationNode` with `computedProcessTime?` + `processTimeAudit?`. Shared audit types (`AttributeNormalisationAudit`, `ConversionStepAudit`) were already in `typings.ts` from the material-cost pass — reused, not duplicated.
- `utils/computeProcessTime.ts` (new): pure function. Skips processes whose elective is disabled. Two code paths:
  1. **Inverse-form (primary)**: when `costTime.quotient.unit === unitario18` (i.e. units-per-time, the stored convention seen in real data like `100 un / 1 hora`), convert the dividend time amount to minutes via the simple `convert(...)` utility and divide by the unit count. This is the path that actually fires in production data.
  2. **General-form (fallback)**: `traceConversion(costTime → minutos/un, initialParams: {})` if the inverse-form path doesn't apply. Preserves the legacy raw-dividend fallback when the converter returns nothing and `dividend.unit === minutos249`; flagged in `audit.fallback`.
- `utils/computeGraduationProcessTotals.ts` (new): per `GraduationNode`, multiplies `Σ ProcessNode.computedTimePerUnit` by `graduation.amount`. Emits `GraduationProcessTimeAudit` with the snapshot of per-process contributions.
- `store/computation/middlewares.ts`: extended the existing debounced material-cost listener. After materials, it runs `computeProcessTime` over every PROCESS node, builds a graph-state snapshot containing the just-computed per-process values (so graduation totals don't race the dispatched writes), then runs `computeGraduationProcessTotals` and writes results back to each `GraduationNode`. The re-entrancy guard's allow-list was widened to include `computedTimePerUnit`, `timeAudit`, `computedProcessTime`, `processTimeAudit`.
- `components/viewports/ProcessTimeAccordion/index.tsx`: rewritten as a thin reader. No `useMemo` over converter calls, no try/catch. Renders per-process rows (`process-time-accordion-item-<id>`) with an audit `IconButton` (`process-time-accordion-item-audit-<id>`) and a single total row (`process-time-accordion-total`) showing minutes summed across all graduations and the total garment count. Per-graduation sub-list rows that existed in the first pass have been removed per the revised UI requirements.
- `components/viewports/ProcessTimeAccordion/ProcessTimeAuditContent.tsx` (new): popover content for the audit button. Renders raw `costTime`, attribute normalisations, ordered conversion steps, fallback branch (when applicable), and the final per-unit result with computed-at timestamp. Pattern mirrors `MaterialCostAuditContent`.
- `components/viewports/ProcessCostAccordion/index.tsx` (new): sibling, money-only, at parity with old behavior — still runs `converter.convert` at render time. Named `ProcessCostAccordion` (open question resolved: matches `costMoney` field convention).
- `components/viewports/ModelViewport/index.tsx`: renders both accordions (`Tempo` then `Custo`, with `PaidSharpIcon` for the cost one).
- `Converter/assets/conversion-graph.ts`: added two reverse time-unit edges that were missing from the conversion graph, blocking real production data:
  - `dia251 → hora250` (`quantidade * 24`)
  - `dia251 → minutos249` (`quantidade * 1440`)
  The second was required because the convert utility's DFS predicate (`visitedNodes.at(-2)` as parent) does not robustly handle branching paths — when `dia251` has multiple outgoing CONVERTS_TO edges, the DFS gets stuck in the `→ semana253` subtree and never falls back to `→ hora250 → minutos249`. A direct edge sidesteps this. Adjacency lists for `dia251` and `minutos249` updated accordingly.

**Verified live:** Corte Bolso (`100 un / 1 h`) computes `0.60 min / un`; graduations multiply correctly (PP×2 = 1.20 min, G×6 = 3.60 min, EG×5 = 3.00 min). Corte (`100 un / 1 d`) computes once the user reloads against the new conversion graph edges.

**Follow-up updates (2026-05-13):**

- `computeProcessTime` was collapsed to a single `traceConversion` path; inverse-form (`convert()`) and minutes-fallback branches removed. Target quotient/dividend are now optional parameters. See `2026-05-13-4ac265-process-time-single-trace-path.md`.
- The `ProcessTimeAudit` shape gained optional `error`, `initialContext`, and `plannedSteps`; `result` became optional. The `fallback` field is retained on the type for compatibility but is no longer produced.
- `ProcessTimeAuditContent` now renders **Contexto inicial** and **Conversões planejadas** sections regardless of outcome, and replaces the result block with an error block (and "Mostrar erro completo" toggle) when the trace fails.
- `ProcessTimeAccordion` shows a `Chip` next to each process label reflecting the linked `ElectiveNode` (green when enabled, gray otherwise).
- The conversion graph was completed for temporal × `unitario18` pairings, removing the data gap that motivated the inverse-form branch. See `Converter/docs/changes/2026-05-13-4ac265-temporal-unitario-compound-coverage.md`.

**Follow-up updates (2026-05-13, shortcuts + MCP tools):**

- New keyboard shortcuts on `${MODULE_NAME}/ProcessTimeList` context: `Ctrl+Alt+T` toggles/focuses the Tempo accordion's first row; `ArrowDown`/`ArrowUp` cycles row focus; `l` opens the focused row's audit popover. All registered in `kernelCalls.ts`.
- `FocusShortcutProvider` wired around the Tempo `Accordion` in `ModelViewport` with `shortcutHint={MODULE_NAME}/ProcessTimeList/focus`. Audit `IconButton` wraps its icon in a `ShortcutHint` (`top-right`) for the `openAudit` binding.
- `data-testid="process-time-item"`, `data-process-id`, `data-process-label`, and `tabIndex={0}` added to each row; the list root gets `data-testid="process-time-accordion"`.
- Drivers in `ProcessTimeAccordion/drivers/`: `ProcessTimeItem.click.puppeteer.ts` (waitFor, click audit, read audit text) and `ProcessTimeItem.shortcut.puppeteer.ts` (focus list trigger, arrow-key triggers, open-audit trigger, focused-target probes; exports `FOCUS_PROCESS_TIME_LIST_SHORTCUT`, `OPEN_PROCESS_TIME_AUDIT_SHORTCUT`, etc.).
- MCP tools under `Composer/mcpTools/`: `focusProcessTimeList`, `cycleProcessTimeFocus`, `openProcessTimeAudit`, `openProcessTimeAuditShortcut`. Cycle-focus is keyboard-only (single tool, no Shortcut sibling, matching the existing `cycleProcessFocus` precedent). Registered in `mcpTools/index.ts`.
- E2E suites under `mcpTools/tests/`: `openProcessTimeAudit.e2e.test.ts` (click + shortcut variants) and `cycleProcessTimeFocus.e2e.test.ts` (keyboard variant: focus → arrow-down → arrow-down → arrow-up×2, asserting the focused label each step).
- Per-graduation focus/cycle tools (`cycleGraduationTimeFocus`) remain deferred — graduation rows are no longer rendered in this accordion per the revised UI requirements; would be added if/when graduation rows return.

**Deferred (out of this pass, per scope choice "Time accordion + pipeline only"):**

- `ProcessNode.computedCostPerUnit` / `costAudit` and `GraduationNode.computedProcessCost` / `processCostAudit` — cost-side caching not yet on the graph. The cost accordion still computes at render time.
- Unit tests for `computeProcessTime` and `computeGraduationProcessTotals`.

**Deviations from the original plan:**

- The plan referenced a `postGraphChangeComputationFinished` event as if it already existed and described extending its payload. It does not exist in the codebase. The existing pattern (per `cache-cost-computation.md`) is a single debounced listener middleware that dispatches `updateNode` directly. Implementation followed the actual pattern; no event was introduced.
- Shared audit types were already in `typings.ts` from the material-cost pass; the plan suggested moving them into `typings/audit.ts`. Left them where they are — moving would be churn without a current consumer outside `typings.ts`.
- `computeProcessTime`'s primary path is inverse-form (`units/time → time/unit` via simple time-unit conversion) rather than the plan's assumption of a direct compound-unit conversion. The conversion graph does not contain a compound-unit path from `un/h` (or `un/dia`) to `min/un`, so the direct form fails for all real costTime data; the inverse-form is what actually works.


## Context

`ProcessTimeAccordion` (webapp/src/system/modules/Composer/components/viewports/ProcessTimeAccordion/index.tsx) currently mixes two concerns: per-process time-per-unit and per-process money-per-unit. Both are displayed in the same list with a shared total row, and the conversion logic for each is interleaved inside one `useMemo`.

We want to:

1. Separate the two concerns into two distinct accordions so each can evolve independently (different units, different aggregation rules, different presentation).
2. Extend the time accordion so that, in addition to "minutes per unit per process" and "total minutes per unit", it also shows the **time requirGraduations are GraduationNodes in the graph (typings.ts:113) connected via HAS_GRADUATION / GRADUATION_OF edges and carry amount. Confirm at implementation that this is the only source of graduations consumed by the accordion (no parallel variation-level list).ed to produce each graduation's target amount** for the variation.
3. Focus iteration on the time accordion first; the cost accordion will be split out but left at parity with today's behavior until the time accordion is "good enough".

## Change

Split `ProcessTimeAccordion` into two sibling components inside `components/viewports/`, **and move all computation out of the React render path into the graph state**, following the pattern established by `cache-cost-computation.md` for `MaterialNode.computedCost`.

### Component split

- `ProcessTimeAccordion/` — time-only. Reads precomputed time fields off `ProcessNode` and the variation; renders:
  - Per-process row: `minutesPerUnit` (from `ProcessNode.computedTimePerUnit`).
  - Total row: `totalMinutesPerUnit` (from variation-level aggregate, see below).
  - **New:** per-graduation rows: `totalMinutesPerUnit * graduationAmount`, also read precomputed.
  - Aria labels and ids follow the existing `process-time-accordion-*` naming, with new ids for the graduation rows (e.g. `process-time-accordion-graduation-<graduationId>`).
- `ProcessCostAccordion/` — money-only. Same treatment: reads a precomputed `computedCostPerUnit` off `ProcessNode` and a variation-level total. Parity with today's behavior; revisited after the time accordion lands.

Call sites that today render `<ProcessTimeAccordion variationId=... />` will render both accordions (time first, then cost). Update the parent viewport(s) accordingly — likely one site under `components/viewports/` that composes the variation panel.

### Data model change

Extend `ProcessNode` with persisted computation fields:

```ts
computedTimePerUnit?: { amount: number; unit: string }; // e.g. { amount: 2.5, unit: "minutos249" }
computedCostPerUnit?: { amount: number; unit: string }; // e.g. { amount: 4.30, unit: "reais11" }
timeAudit?: ProcessTimeAudit;   // REQUIRED whenever computedTimePerUnit is set
costAudit?: ProcessCostAudit;   // analogous, for the cost accordion (later)
```

### Time audit log (required)

The time computation is auditable in the same spirit as `MaterialNode.costAudit` (see `cache-cost-computation.md`). `computeProcessTime` MUST return a fully populated `timeAudit` alongside `computedTimePerUnit`; both are written together by the `postGraphChangeComputationFinished` handler. The audit is the single source of truth for any future "auditoria de tempo" UI.

Captured layers per PROCESS node:

**1. Process context**

- Process label and id.
- Raw `costTime` as stored on the node (CompoundValue: quotient + dividend).
- Any attribute-style normalisations applied before conversion (flagged ⚠ as in the material audit).

**2. Conversion steps** — ordered list to reach the target unit (`minutos249` / `unitario18`):

- Source unit → target unit transition label.
- Symbolic expression applied (from the ConversionGraph).
- Concrete values substituted (quantity values, attribute values if any).
- Numeric result of the step.

**3. Fallback branch (if taken)**

- Records when the converter returned no result and the raw-dividend fallback was used (current `ProcessTimeAccordion/index.tsx:60-65` logic). Includes the raw values it consumed and the resulting `minutesPerUnit`. Flagged explicitly so auditors can distinguish converter output from fallback output.

**4. Final summary**

- `computedTimePerUnit` (amount + unit).
- ISO `computedAt` timestamp.

```ts
ProcessTimeAudit: {
  computedAt: string;
  processLabel: string;
  rawCostTime: CompoundValue | undefined;
  attributeNormalisations: AttributeNormalisationAudit[]; // reuse type from cache-cost-computation
  conversionSteps: ConversionStepAudit[];                 // reuse type
  fallback?: {
    reason: string;            // e.g. "converter returned undefined"
    rawDividendAmount: number;
    rawQuotientAmount: number;
    resultMinutesPerUnit: number;
  };
  result: { amount: number; unit: string };
}
```

### Per-graduation audit

`computeGraduationProcessTotals` produces a `processTimeAudit` per `GraduationNode`, capturing how that graduation's total was reached:

```ts
GraduationProcessTimeAudit: {
  computedAt: string;
  graduationLabel: string;
  graduationAmount: number;                  // GraduationNode.amount used in the multiplication
  perProcessContributions: {                 // snapshot of each PROCESS's contribution at compute time
    processId: string;
    processLabel: string;
    minutesPerUnit: number;
  }[];
  totalMinutesPerUnit: number;               // Σ of contributions
  result: { amount: number; unit: string };  // totalMinutesPerUnit * graduationAmount
}
```

Stored on each `GraduationNode` alongside `computedProcessTime`. Reuses the same `postGraphChangeComputationFinished` write.

Shared audit types (`AttributeNormalisationAudit`, `ConversionStepAudit`) live in a shared `Composer/typings/audit.ts` or similar so material and process audits don't duplicate them.

Aggregates are persisted on the existing **`GraduationNode`s** — one per graduation, each carrying the time/cost required to produce that graduation's `amount`. This matches the existing pattern for graduation-aware fields (see `consumptionPerGrade` on edges, `GraduationBreakdownEntry`, and the `GraduationNode { graduationId, amount }` already in `typings.ts:113`).

```ts
// extension to GraduationNode in typings.ts
computedProcessTime?: { amount: number; unit: string }; // totalMinutesPerUnit * graduation.amount
computedProcessCost?: { amount: number; unit: string };
processTimeAudit?: GraduationProcessTimeAudit;
processCostAudit?: GraduationProcessCostAudit;
```

The variation-wide `totalMinutesPerUnit` (the "Total" row in the accordion, independent of any graduation) is not itself per-graduation, but it is fully derivable from `Σ ProcessNode.computedTimePerUnit`. The accordion computes it on the fly from the PROCESS nodes — no extra storage needed for it.

### Pure compute functions

Extract the conversion logic into pure functions under `Composer/utils/`:

- `computeProcessTime({ processNodeId, graphState, conversionGraphState }): { time: UnitValue | undefined, audit: ProcessTimeAudit | undefined }`
- `computeProcessCost(...)` — analogous.
- `computeGraduationProcessTotals({ graphState }): { [graduationNodeId: string]: { computedProcessTime, computedProcessCost, audits } }` — runs after all per-process values are computed; for each `GraduationNode` it multiplies `Σ computedTimePerUnit` (and the cost counterpart) by `graduation.amount`, producing the values written back onto that GraduationNode.

These call `converterModule.utils.convert` directly (no hooks), per the existing prerequisite established for material cost.

### Propagation on change

Reuse the **same debounced graph-change pipeline and the same `postGraphChangeComputationFinished` event** that material cost already uses. There is one debounce and one event for all graph computation; process time, process cost, graduation totals, and existing material cost all ride it. The event payload is extended to carry the per-process and per-graduation results alongside the existing material results.

| Event                                           |
| ----------------------------------------------- |
| `graphLoaded`                                 |
| `nodeAdded`, `nodeUpdated`, `nodeRemoved` |
| `edgeAdded`, `edgeUpdated`, `edgeRemoved` |

When the debounce settles, the handler:

1. Runs `computeProcessTime` / `computeProcessCost` for **every** PROCESS node.
2. Runs `computeGraduationProcessTotals` using the freshly computed per-process values; produces one update payload per `GraduationNode`.
3. Emits `postGraphChangeComputationFinished` carrying material results, per-process results, and per-graduation results in a single payload. The event handler is the only writer; it calls `updateNode` for each MATERIAL, PROCESS, and `GraduationNode`.

### Accordion components after the refactor

Both accordions become thin readers:

- No `useMemo` over converter calls.
- No try/catch fallback branches.
- `useGraph(variationId)` → read `computedTimePerUnit` per PROCESS node, sum for the variation total, read `computedProcessTime` per `GraduationNode` for the per-graduation rows.
- Render. That's it.

The conversion-fallback branch currently in `ProcessTimeAccordion/index.tsx:60-65` (raw `costTime.dividend.amount` fallback when the converter returns nothing) moves into `computeProcessTime` so behavior is preserved.

### Shortcuts, MCP tools, and e2e tests

Per `CLAUDE.md` every shortcut ships with a visible `ShortcutHint`. Per the `mcp-puppeteer-tools` skill, every shortcut is paired with a click driver + shortcut driver + MCP click tool + MCP shortcut tool + e2e tests. Existing precedents to mirror: `process-shortcuts-mcp-tools.md`, `graduation-list-shortcuts-mcp-tools.md`, `elective-shortcuts-mcp-tools.md`.

Surfaces to expose (final chord choices land at implementation — pick chords that don't collide with existing process/graduation/material bindings):

| Action | MCP tools | Driver pair |
|---|---|---|
| Focus next process row in the **time** accordion | `cycleProcessTimeFocus`, `cycleProcessTimeFocusShortcut` | `ProcessTimeItem.{click,shortcut}.puppeteer.ts` |
| Focus next graduation row in the time accordion | `cycleGraduationTimeFocus`, `cycleGraduationTimeFocusShortcut` | `GraduationTimeItem.{click,shortcut}.puppeteer.ts` |
| Open the audit view for the focused row (reserve binding; UI itself deferred) | `openProcessTimeAudit`, `openProcessTimeAuditShortcut` | `ProcessTimeAuditButton.{click,shortcut}.puppeteer.ts` |

Conventions:

- MCP tool files live in `webapp/src/system/modules/Composer/mcpTools/`; shortcut variants follow the existing `<name>Shortcut.ts` convention (see `addProcessShortcut.ts`, `cycleProcessFocus.ts`).
- Each shortcut registers via `keyboardManager.functions.registerShortcuts` and wraps its actionable control in `ShortcutHint` (or renders the hint manually adjacent when wrapping breaks layout).
- Element ids on the new accordion already follow `process-time-accordion-*`; extend the convention for graduation rows (`process-time-accordion-graduation-<graduationId>`) so drivers can target them deterministically.
- MCP tools obey the "no `page.evaluate` callback in tool files" rule from auto-memory — all browser-evaluated logic stays in drivers.

E2e test files under `webapp/src/system/modules/Composer/mcpTools/tests/`:

- `processTimeAccordion.e2e.test.ts` — adding a process surfaces it in the time accordion with `computedTimePerUnit` populated; updating a process's `costTime` propagates through the debounced compute pipeline; adding a `GraduationNode` produces a per-graduation row with `computedProcessTime`; removing it removes the row; the variation-total row equals `Σ` of per-process rows.
- `cycleProcessTimeFocus.e2e.test.ts` — drives both click and shortcut MCP tools, asserts focus order.
- `cycleGraduationTimeFocus.e2e.test.ts` — same for graduation rows.
- Audit-view e2e tests deferred with the audit UI itself.

The graph-computation pipeline gets focused unit tests (not e2e) for `computeProcessTime`, `computeGraduationProcessTotals`, and their audit payloads — pure functions, no Electron required.

Out of scope:

- Changing the unit ids (`minutos249`, `unitario18`, `reais11`).
- Redesigning the cost accordion's visual layout beyond extracting it.
- Audit-log UI (analogous to material cost audit) and its shortcut/MCP/e2e wiring — data is captured and persisted; the rendering surface is a follow-up change. Reserved tool names above are placeholders, not commitments.

## Status notes

Draft. Open questions:

- Graduations are sourced **only** from `GraduationNode`s in the graph (`typings.ts:113`, connected via `HAS_GRADUATION` / `GRADUATION_OF`, carrying `amount`). No parallel variation-level graduation list is consulted.
- Should the graduation rows be inside the same `List` as per-process rows, or a separate sub-list under the total? Leaning toward a separate sub-list visually offset.
- Naming: `ProcessCostAccordion` vs `ProcessMoneyAccordion`. Defaulting to `ProcessCostAccordion` to match the existing `costMoney` field on `ProcessNode`.

Prerequisite: `Converter.utils.convert` (pure utility) — already in place per `cache-cost-computation.md`.

## Security

None. Pure client-side derivation from existing in-memory graph state; no new inputs, no new IO.

## Performance

Net win on render. Today the accordion runs `converter.convert` for every PROCESS node (up to twice — minutes and money) on every render of the variation panel. After this change render-time work is O(processes + graduations) reads of plain fields, with conversions running once per graph mutation behind the shared debounce. Same pattern that motivated `cache-cost-computation.md` for `MaterialNode`. New storage cost is small: two numeric fields per PROCESS node plus one aggregate per variation.
