# Re-render Analysis — Elective Toggle (after perf-fix2 round 2)

**Traces analysed**
- `elective-toggle-switch-after-profiler-fix2-2.json` — React DevTools Profiler (component-level, hook indices, change reasons)
- `elective-toggle-switch-after-perf-fix2-2.json` — Chrome Performance trace (prop diff annotations from React DevTools extension)

---

## What happens when an elective is toggled

Two Redux commits reach React:

| Commit | Timestamp | Duration | Trigger |
|--------|-----------|----------|---------|
| 5 (elective toggle) | ~32 038 300 ms | 83 ms | `updateElective` dispatched — ELECTIVE node `value` flips |
| 7 (computation middleware) | ~32 038 570 ms | 45 ms | Listener middleware fires ~300 ms later — MATERIAL nodes get `computedCost`/`computedTotal`, PROCESS nodes get `computedTimePerUnit`/`timeAudit` |

---

## Commit 5 — Elective toggle (immediate)

### ✅ Needed re-renders

| Component | Reason |
|-----------|--------|
| `ElectiveListAccordion` | `electiveNodes` selector — ELECTIVE node reference changed |
| `ElectiveItem` | `node.value` changed: `true → false` |
| `ProcessElectiveButton` | Own `useAppSelector` for the linked ELECTIVE node detected the value flip (hooks changed) |
| `ProcessTimeAccordion` | `electiveMap` selector — ELECTIVE node reference changed, affects time calculation display |

### ❌ Unnecessary re-renders

| Component | Prop(s) changed | Root cause |
|-----------|----------------|------------|
| `ProcessEditButton` | `onClose` only | `ProcessItem` re-renders (for its `linkedElective` hook), creating a new `() => { refocusAfterEditRef.current = true }` closure |
| `ProcessMaterialUsageButton` | `onClose` only | Same — new closure from `ProcessItem` render |
| `ElectiveEditButton` | `onClose` | `ElectiveItem` re-renders (needed), but passes unstable `onClose` closure |
| `AddMaterialButton` | hook[42] fired | Selector has no equality comparator — returns a fresh `Object.keys()` array on every store update |
| `ViewportManagerContent` | hook[33] | Unknown; likely dirty-viewport subscription or layout state |

**Chrome trace confirms:**
```
[32038373ms] ProcessEditButton — onClose: "Referentially unequal function closure. Consider memoization."
[32038377ms] ProcessElectiveButton — onClose: "Referentially unequal function closure. Consider memoization."
[32038394ms] ProcessMaterialUsageButton — onClose: "Referentially unequal function closure. Consider memoization."
```

---

## Commit 7 — Computation middleware

### ✅ Needed re-renders

| Component | Reason |
|-----------|--------|
| `MaterialListAccordion` | `materialNodes` selector — MATERIAL node reference changed (computedCost added) |
| `MaterialItem` | `node.computedCost.quotient.amount`: `0.295 → 0`, `computedTotal.quotient.amount`: `0.7965 → 0` |
| `ShowMaterial` | Receives updated `node` — displays `MaterialCostInfo` which needs the new cost |
| `MaterialCostInfo` | `node.computedCost` changed — displays "Custo por unidade" |
| `ProcessTimeAccordion` | `processNodes` selector — PROCESS nodes got `computedTimePerUnit` (displayed) |
| `ProcessCostAccordion` | `processNodes` selector — same |

### ❌ Unnecessary re-renders

| Component | Prop(s) changed | Root cause |
|-----------|----------------|------------|
| `ProcessEditButton` | `processNode.computedTimePerUnit` + `onClose` | `ProcessItem` node selector fires (PROCESS node ref changed), creates new `processNode` and new `onClose` closure. `ProcessEditButton` does not display `computedTimePerUnit`. |
| `ProcessElectiveButton` | `processNode.computedTimePerUnit` + `onClose` | Same. `ProcessElectiveButton` only needs `processNode.electiveNodeId` and `processNode.label`. |
| `ProcessMaterialUsageButton` | `onClose` only | Unstable closure from `ProcessItem` re-render |
| `AddMaterialButton` | hook[42] | Same no-equality selector issue as in commit 5 |
| `AddVisualizationButton` | hook[42] | Same pattern |

**Chrome trace confirms:**
```
[32038647ms] ProcessEditButton — processNode.computedTimePerUnit went from {amount:1,unit:"minutos249"} → undefined
                                 onClose: "Referentially unequal function closure."
[32038650ms] ProcessElectiveButton — same processNode change + onClose unstable
[32038654ms] ProcessMaterialUsageButton — onClose only
```

---

## Cascade pattern from `ProcessItem`

Every time `ProcessItem` re-renders (for any reason), it creates three new `onClose` closures:

```tsx
// ProcessItem — current code
<ProcessEditButton
  onClose={() => { refocusAfterEditRef.current = true; }}  // new each render
/>
<ProcessElectiveButton
  onClose={() => { refocusAfterEditRef.current = true; }}  // new each render
/>
<ProcessMaterialUsageButton
  onClose={() => { refocusAfterEditRef.current = true; }}  // new each render
/>
```

In commit 5, `ProcessItem` re-renders because its `linkedElective` hook detected the elective value flip. This is correct. But the side effect is that all three child buttons receive new `onClose` refs and re-render despite displaying nothing different.

In commit 7, `ProcessItem` also re-renders because its `node` selector returns a new PROCESS node reference (computed fields were added). `ProcessItem` does NOT display `computedTimePerUnit` — it only shows `costTime` and `costMoney` (user-defined fields). So this re-render is also unnecessary.

---

## `ShowMaterial` cascade from `MaterialItem`

```tsx
// MaterialItem — current code
<ShowMaterial
  onEdit={() => setIsEditing(true)}    // new each render
  onDelete={() => actions.removeMaterialNode(node.id)}  // new each render
/>
```

When `MaterialItem` re-renders (correctly, in commit 7), it passes new `onEdit`/`onDelete` closures to `ShowMaterial`, which then also re-renders unnecessarily to reconcile those props despite using neither.

---

## Fixes required

### Fix A — Stable `onClose` in `ProcessItem`

```tsx
// ProcessItem.tsx
const handleClose = useCallback(() => {
  refocusAfterEditRef.current = true;
}, []);

// Then pass handleClose to all three buttons
<ProcessEditButton onClose={handleClose} … />
<ProcessElectiveButton onClose={handleClose} … />
<ProcessMaterialUsageButton onClose={handleClose} … />
```

This eliminates the unnecessary button re-renders in **both** commits 5 and 7.

### Fix B — Ignore computed fields in `ProcessItem`'s `node` selector

```tsx
// ProcessItem.tsx — current selector
const node = useAppSelector(
  (s: any) => s.Graph?.graphs?.[variationId]?.nodes?.[nodeId] as ProcessNode | undefined,
);
```

After computation middleware, `computedTimePerUnit` and `timeAudit` are added to the PROCESS node. `ProcessItem` only renders `costTime` and `costMoney`. Use a custom equality:

```tsx
const node = useAppSelector(
  (s: any) => s.Graph?.graphs?.[variationId]?.nodes?.[nodeId] as ProcessNode | undefined,
  (prev, next) => {
    if (prev === next) return true;
    if (!prev || !next) return false;
    return (
      prev.id === next.id &&
      prev.label === next.label &&
      prev.electiveNodeId === next.electiveNodeId &&
      prev.costTime === next.costTime &&
      prev.costMoney === next.costMoney
    );
  },
);
```

This makes `ProcessItem` immune to computation middleware writes (commit 7) while still updating when the user changes cost fields or links an elective.

**Important:** The `linkedElective` selector must remain unmodified — it correctly fires on elective value changes and drives the chip display.

### Fix C — `AddMaterialButton` selector needs `shallowEqual`

```tsx
// AddMaterialButton.tsx — current selector
const nodeKeys = useAppSelector(
  (s: any): string[] => {
    const nodes = s.Graph?.graphs?.[variationId]?.nodes;
    return nodes ? Object.keys(nodes) : [];
  },
  // missing equality comparator!
);
```

`Object.keys()` always returns a new array. Every Redux dispatch touching the graph causes `AddMaterialButton` to re-render. This is visible in the profiler as it fires in commits 1, 5, 7, and 9.

Fix: add `shallowEqual`:
```tsx
const nodeKeys = useAppSelector(
  (s: any): string[] => { … },
  shallowEqual,
);
```

Same issue likely exists in `AddVisualizationButton` (hooks=[42] in commit 7).

### Fix D — Stable `onEdit`/`onDelete` in `MaterialItem`

```tsx
// MaterialItem.tsx
const handleEdit = useCallback(() => setIsEditing(true), []);
const handleDelete = useCallback(() => actions.removeMaterialNode(node.id), [actions, node.id]);

<ShowMaterial onEdit={handleEdit} onDelete={handleDelete} … />
```

`ShowMaterial` is not `React.memo`-wrapped, so it will still re-render when `MaterialItem` re-renders. But once `MaterialItem` is made stable (if `ShowMaterial` is later memoised), the stable callbacks prevent unnecessary re-renders.

---

## Impact summary

| Fix | Eliminates unnecessary re-renders in |
|-----|--------------------------------------|
| A — stable `onClose` in ProcessItem | ProcessEditButton × 2 commits, ProcessElectiveButton × 1 commit (partially), ProcessMaterialUsageButton × 2 commits |
| B — ignore computed fields in ProcessItem node selector | ProcessItem × 1 commit (commit 7), cascades to all three buttons |
| C — shallowEqual in AddMaterialButton | AddMaterialButton × every commit |
| D — stable closures in MaterialItem | ShowMaterial cascade in commit 7 |

---

## What remains out of scope

- **Accordion wrapper cascade** (`MuiAccordionRoot`, `MuiCollapseRoot`, etc.): These re-render because their parent passes new inline `sx`/`children` objects. Fixing this requires either memoising the content passed to `Accordion` or restructuring the component tree. Not blocking correctness.
- **`MaterialCostInfo` using full `useGraph`**: This component subscribes to the entire graph. Since it genuinely needs to react to computation results, this is acceptable, but could be narrowed to CONSUMES edges + GRADUATION nodes in a future pass.
- **`ViewportManagerContent` hook[33]**: Unclear trigger. Likely related to `setViewportHasChanged` dirty-viewport tracking when actions dispatch `markChanged()`. Investigate after the above fixes land.
