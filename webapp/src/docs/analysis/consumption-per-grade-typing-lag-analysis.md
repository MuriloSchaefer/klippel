# Performance Analysis — Typing Lag in Consumption-per-Grade Input

**Traces analysed**
- `updating-cost-graduation-rerender-profile.json` — React DevTools Profiler
- `updating-cost-graduation-rerender-perf.json` — Chrome Performance trace

---

## What happens when one character is typed

Each keystroke synchronously dispatches **two** Redux actions (`updateEdge` × 2 — forward CONSUMES edge + reverse CONSUMED_BY edge) inside `setProcessMaterialConsumptionForGraduation` (`useVariationActions.ts:616–641`). No debounce exists. This triggers the computation middleware (~300 ms later), which then dispatches more `updateNode` actions. Total: **3 React render commits, ~507 ms of blocked UI time per character**.

---

## Commit table

| # | ts (ms) | dur (ms) | components | trigger |
|---|---------|----------|------------|---------|
| 0 | +0 | 2.5 | 16 | MUI `FormControl` focus state |
| 1 | +9 | 2.7 | 26 | `LeaseStatusRow` activity tracking + focus |
| **2** | **+963** | **196** | **1 298** | **Computation middleware: `computedCost` on MATERIAL nodes** |
| **3** | **+1 238** | **160** | **1 298** | **Middleware: `computedTimePerUnit` on PROCESS nodes + `computedProcessTime` on GRADUATION nodes** |
| **4** | **+1 587** | **146** | **1 856** | **`ProcessTimeAccordion` / `ProcessCostAccordion` wake on new computed values** |

**Total blocked time per keystroke: ~507 ms.**

---

## Input component tree

```
processMaterialUsageButton (PointerContainer modal)
└── GraduationConsumptionRow  (per-grade override row)
    └── CompoundSelector
        └── UnitAmountSelector → MUI TextField → FormControl
                                                    ↑
                                            keystroke lands here
```

The `onChange` on the `CompoundSelector` inside each graduation row calls
`actions.setProcessMaterialConsumptionForGraduation(processNodeId, materialNodeId, graduationId, value)` directly — no debounce.

---

## Commit 2 in detail (196 ms, 1 298 components)

### ✅ Needed re-renders (4 components self-triggered)

| Component | Hook | Reason |
|---|---|---|
| `MaterialCostInfo` | hook[17] (`useGraph`) | `computedCost` added to MATERIAL node |
| `ProcessMaterialUsageButton` | hook[65] (`consumesEdges` selector) | CONSUMES edge object replaced — new reference |
| `ProcessItem` | hook[56] (`materialsConsumptions` selector) | Same edge replacement |
| `GraphView` | hook[10] (`useGraph` full graph) | Any node/edge mutation fires this |

### ❌ Unnecessary re-renders (1 294 cascade)

| Component | Count | Root cause |
|---|---|---|
| Entire `ProcessMaterialUsageButton` modal subtree | ~1 240 | `component={<Box>…</Box>}` passed inline to `PointerContainer` — new JSX reference on every render. `PointerContainer`/modal cannot bail out. |
| All 25 `CompoundSelector` graduation rows | 25 | `consumesEdges` selector returns a new filtered array when any edge object changes. All rows re-render even though only one graduation changed. |
| `Emotion Insertion6` (sx serialization) | 446 | Inline `sx={{ … }}` object literals regenerated every render. |

---

## Commit 3 (160 ms) and Commit 4 (146 ms)

The middleware fires `updateNode` for PROCESS nodes and GRADUATION nodes as **separate dispatches** — not batched with React. This produces two additional render cycles with the same ~1 300-component cascade. `ProcessTimeAccordion` and `ProcessCostAccordion` join commit 4 once their selectors see fresh `computedTimePerUnit` and `computedProcessTime` values.

---

## Chrome trace observations

React DevTools annotations at the 196 ms commit confirm:
```
MuiOutlinedInputInput.onChange — "Referentially unequal function closure" (×65)
CompoundSelector.onChange      — "Referentially unequal function closure" (×25)
PointerContainer.component     — "Referentially unequal JSX element"
```

---

## Fixes

### Fix 1 — Debounce the per-grade consumption dispatch (eliminates typing lag)

**File:** `processMaterialUsageButton.tsx`  
**Saves: 507 ms blocked per keystroke while typing.**

The graduation row `onChange` and the top-level amount `onChange` both dispatch synchronously. Add a debounce using the same `debounce` utility already used in `GraduationItem`:

```tsx
// For the per-grade override CompoundSelector onChange:
const debouncedSetGradeConsumption = useMemo(
  () =>
    debounce(
      (graduationId: string, value: CompoundValue) =>
        actions.setProcessMaterialConsumptionForGraduation(
          processNodeId, materialNodeId, graduationId, value,
        ),
      300,
    ),
  [processNodeId, materialNodeId],
);

// For the default amount CompoundSelector onChange:
const debouncedUpdateConsumption = useMemo(
  () =>
    debounce(
      (value: CompoundValue) =>
        actions.updateProcessMaterialConsumption(processNodeId, materialNodeId, value),
      300,
    ),
  [processNodeId, materialNodeId],
);
```

Keep the local input state uncontrolled (or controlled with local `useState`) so the input renders immediately on each keystroke — only the Redux dispatch is delayed.

**What debounce does NOT fix:** The ~500 ms settle-time after the last character. The final computation commits still run; Fixes 2–4 reduce that.

---

### Fix 2 — Batch middleware dispatches (eliminates commits 3 and 4)

**File:** `webapp/src/system/modules/Composer/store/computation/middlewares.ts`  
**Saves: ~310 ms (merges commits 3 and 4 into commit 2).**

The middleware currently dispatches `updateNode` sequentially for material cost, process time, and graduation totals — each dispatch triggers a separate React render cycle. Wrap all dispatches from a single listener invocation in RTK's `batch`:

```ts
import { batch } from "react-redux";

// Inside the listener:
batch(() => {
  for (const [nodeId, changes] of materialUpdates) {
    listenerApi.dispatch(updateNode({ graphId, nodeId, changes }));
  }
  for (const [nodeId, changes] of processUpdates) {
    listenerApi.dispatch(updateNode({ graphId, nodeId, changes }));
  }
  for (const [nodeId, changes] of graduationUpdates) {
    listenerApi.dispatch(updateNode({ graphId, nodeId, changes }));
  }
});
```

This collapses 3 React commits into 1.

---

### Fix 3 — Memoize `consumesEdges` selector in `ProcessMaterialUsageButton`

**File:** `processMaterialUsageButton.tsx`  
**Saves: ~160 ms (prevents the 1 298-component cascade on computation write-backs).**

The `consumesEdges` selector returns a freshly-filtered `ConsumesEdge[]` array whenever any edge changes. When computation middleware writes `computedCost` to a MATERIAL node (not an edge), the graph object still gets a new reference and the selector re-fires. Use `shallowEqual` to prevent re-renders when the edge list content is actually unchanged:

```tsx
const consumesEdges = useAppSelector(
  (s: any): ConsumesEdge[] => {
    const edges = s.Graph?.graphs?.[variationId]?.edges;
    if (!edges) return [];
    return (Object.values(edges) as any[]).filter(
      (e): e is ConsumesEdge => e.type === "CONSUMES" && e.sourceId === processNodeId,
    );
  },
  shallowEqual,
);
```

Additionally, guard the individual row selectors so only the row whose `consumptionPerGrade` actually changed re-renders.

---

### Fix 4 — Extract modal body into a memoized component

**File:** `processMaterialUsageButton.tsx`  
**Saves: ~140 ms cascade when `ProcessMaterialUsageButton` does re-render.**

Currently the entire modal content is passed as a JSX literal to `PointerContainer`'s `component` prop on every render:

```tsx
<PointerContainer
  component={
    <Box>           {/* ← new element reference every render */}
      {consumesEdges.map(...)}
    </Box>
  }
>
```

Extract into a `React.memo` component:

```tsx
const ProcessMaterialUsageModal = React.memo(function ProcessMaterialUsageModal({
  consumesEdges, graduations, graphMaterialNodes, units, processNodeId, variationId, onClose,
}: ...) {
  // all the modal JSX here
});

// In ProcessMaterialUsageButton:
<PointerContainer
  component={
    <ProcessMaterialUsageModal
      consumesEdges={consumesEdges}
      // ...
    />
  }
>
```

With Fix 3 in place, when computation writes back to PROCESS/GRADUATION nodes but the `consumesEdges` list is unchanged, the modal component will bail out entirely.

---

### Fix 5 — Scope `GraphView`'s `useGraph` subscription

**File:** `webapp/src/system/modules/Composer/components/viewports/ModelViewport/GraphView.tsx`  
**Saves: Eliminates GraphView D3 rebuilds on computation write-backs.**

`GraphView` subscribes to the entire graph via `useGraph<VariationGraphState>(variationId)`. It only renders GARMENT/PART nodes. Pass a selector that filters to only those:

```tsx
const { state: partialGraph } = useGraph(
  variationId,
  (g) => {
    if (!g) return undefined;
    const nodes: Record<string, Node> = {};
    const edges: Record<string, Edge> = {};
    for (const n of Object.values(g.nodes)) {
      if (n.type === "GARMENT" || n.type === "PART") nodes[n.id] = n;
    }
    for (const e of Object.values(g.edges)) {
      if (e.type === "HAS_PART") edges[e.id] = e;
    }
    return { ...g, nodes, edges };
  },
);
```

This makes GraphView immune to PROCESS/MATERIAL/GRADUATION/ELECTIVE node mutations.

---

## Impact summary

| Fix | Eliminates |
|-----|-----------|
| 1 — Debounce dispatch | 507 ms blocked per keystroke while typing |
| 2 — Batch middleware dispatches | Commits 3 + 4 (~310 ms settle-time) |
| 3 — `shallowEqual` on `consumesEdges` | 1 298-component cascade on computation write-backs |
| 4 — Memoize modal body | ~1 240-component modal cascade when button updates |
| 5 — Scope `GraphView` subscription | GraphView D3 rebuilds on every graph mutation |

### Settle-time estimate after last keystroke

| State | Settle-time |
|-------|-------------|
| Today | ~500 ms |
| Fix 1 alone | ~500 ms (typing unblocked; settle unchanged) |
| Fix 1 + 2 | ~196 ms |
| Fix 1 + 2 + 3 | ~50 ms |
| All fixes | ~20 ms |

---

## What debounce alone fixes vs. does not fix

**Fixes:** Typing feel. The user can type freely with no UI jank. Each character responds in ~3 ms (local state only). The Redux dispatch — and all three render commits — only fires once, after the user stops typing for 300 ms.

**Does not fix:** The visual latency after the last character. The user will still see a ~500 ms freeze after they stop typing before the computed totals update, unless Fixes 2 and 3 are also applied.

**Recommended approach:** Apply Fix 1 first (immediate user-visible improvement), then Fix 2 (batching — low risk, one-file change), then Fix 3 (selector guard).
