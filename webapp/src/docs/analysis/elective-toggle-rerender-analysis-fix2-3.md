# Re-render Analysis — Elective Toggle (after perf-fix2 round 3)

**Traces analysed**
- `elective-toggle-switch-after-profiler-fix2-3.json` — React DevTools Profiler
- `elective-toggle-switch-after-perf-fix2-3.json` — Chrome Performance trace

---

## Commit timeline

| Commit | ts (ms) | dur (ms) | re-renders | Trigger |
|--------|---------|----------|------------|---------|
| 0–4 | 600–1083 | <2 | ≤9 | Ripple / pointer animations (unrelated) |
| **5** | **1160** | **65.3** | **584** | **`useEditLease` `setState` in `ModelViewport`** |
| 6 | 1174 | 1.0 | 9 | Ripple animation |
| **7** | **1269** | **85.1** | **615** | **`markChanged` → `setViewportHasChanged`; `updateElective` → `innerState` in `GarmentDetails`** |
| 8 | 1291 | 0.3 | 1 | Minor cascade |
| **9** | **1549** | **39.7** | **585** | **Computation middleware → `innerState` in `GarmentDetails` again** |
| 10 | 1726 | 0.2 | 3 | Tooltip close |

---

## Re-render Group 1 — `ModelViewport` (Commit 5, 65 ms, 584 components)

### What fires

`ModelViewport` holds `useEditLease(variationStateId)` directly. The hook's `useEffect` runs `jazz.acquireLease(modelId)` asynchronously. When the IPC call resolves ~78 ms after mount/focus, it calls `setStatus({ kind: "held", snapshot })` — a `useState` setter inside `ModelViewport`. This is a **self-initiated** state update; `React.memo` on `ModelViewport` does not block it.

Because `ModelViewport` re-renders, every JSX subtree it creates — `<Accordion icon={<AccountTreeSharpIcon />}>`, `<DetailsPanel>`, `<SVGEditorToolkit>`, etc. — gets new object references. None of the children are memoized, so all 584 re-render.

The Chrome trace confirms:
```
[ModelViewport] setState() fired
[Accordion]      Changed Props: icon (referentially unequal), summary (referentially unequal)
[DetailsPanel]   Changed Props: children (referentially unequal)
[SVGEditorToolkit] Changed Props: children
```

### Fix A — Extract `useEditLease` into a leaf component

Only `SaveModelButton` (disabled state) and `LeaseBanner` (banner text) need lease status. Extract them into a single memoized component so the lease state change doesn't touch the rest of the tree:

```tsx
// webapp/src/system/modules/Composer/components/viewports/ModelViewport/LeaseStatusRow.tsx
const LeaseStatusRow = React.memo(function LeaseStatusRow({
  variationId,
}: { variationId: string }) {
  const storeModule = useModule<Store>("Store");
  const variationStateId = storeModule.hooks.useAppSelector(
    (s: any) => s.Composer?.variations?.[variationId]?.id,
  );
  const leaseStatus = useEditLease(variationStateId);
  return (
    <>
      <SaveModelButton variationId={variationId} disabled={leaseStatus.kind === "held_by_other"} />
      <LeaseBanner status={leaseStatus} />
    </>
  );
});
```

In `ModelViewport/index.tsx`:
- Remove `useAppSelector(variationStateId)` and `useEditLease(variationStateId)`
- Replace `<SaveModelButton …/>` and `<LeaseBanner …/>` with `<LeaseStatusRow variationId={variationId} />`

This reduces the lease-state re-render to a single leaf component instead of 584.

---

## Re-render Group 2 — `ViewportManagerContent` (Commit 7, 85 ms, part of 615)

### What fires

Every mutation action in `useVariationActions` calls `markChanged()` (line 67):

```ts
const markChanged = useCallback(() => {
  if (vp) vpMgr.functions.setHasChanged(vp.name, true);
}, [vp?.name]);
```

`setHasChanged` dispatches `setViewportHasChanged`. The reducer in `Layout/store/viewports/slice.ts` line 124:

```ts
builder.addCase(setViewportHasChanged, (state, { payload: { name, hasChanged } }) => {
  return {
    ...state,
    dirtyViewports: { ...state.dirtyViewports, [name]: hasChanged },
  };
});
```

This **always** creates a new `dirtyViewports` object, even when `dirtyViewports[name]` is already `true`. On the second toggle in a session the viewport is already dirty (`true → true`), yet a new object reference is produced. Any `useAppSelector` that reads `dirtyViewports` sees a changed reference and re-renders. `ViewportManagerContent` has such a selector and re-renders with its full subtree.

### Fix B — No-op guard in the `setViewportHasChanged` reducer

```ts
builder.addCase(setViewportHasChanged, (state, { payload: { name, hasChanged } }) => {
  if (state.dirtyViewports[name] === hasChanged) return state; // ← add this line
  return {
    ...state,
    dirtyViewports: { ...state.dirtyViewports, [name]: hasChanged },
  };
});
```

One line. When the viewport is already dirty, the Redux state object is returned unchanged, so no subscriber re-renders.

---

## Re-render Group 3 — `GarmentDetails` (Commits 7 and 9)

### What fires — Commit 7 (immediate)

`GarmentDetails` calls:

```ts
const selectedNode = graphModule.hooks.useGraph(
  variationId,
  (g) => g?.nodes[selectedPart],
);
```

Inside `useGraph.ts` there are **two** `useAppSelector` subscriptions:

```ts
// 1. Memoized via createSelector — only fires when g?.nodes[selectedPart] reference changes
const graphState = useAppSelector<R | undefined>(selector);

// 2. Subscribes to the raw GraphState — fires on EVERY graph mutation
const innerState = useAppSelector(
  (state) => state?.Graph && state.Graph.graphs[graphId],
);
```

When `updateElective` dispatches `updateNode`, the graph reducer produces `{ ...state.graphs[graphId].nodes, [nodeId]: updatedNode }` — a new `nodes` object, which means a new `graphs[graphId]` object. `innerState` detects the reference change and re-renders every consumer of `useGraph`.

`useGraph` then returns `{ id, state: graphState, actions: { ... } }` where `actions` is a new inline object. `GarmentDetails` re-renders.

**Commit 9** (280 ms later, 39.7 ms): The computation middleware writes `computedTimePerUnit`/`timeAudit` back to PROCESS nodes via `updateNode`. Same pattern — new `graphs[graphId]` reference — `innerState` fires — `GarmentDetails` re-renders again.

### Fix C — Replace `innerState` subscription with store reads at call time

`innerState` is only used by two actions: `nodeExists` and `updateEdge`. Neither needs a live subscription — they should read the store at the moment they are called.

```ts
// useGraph.ts
import { useRef, useMemo } from "react";
import { useStore } from "react-redux";    // ← add

const useGraph = <G extends GraphState = GraphState, R = G>(
  graphId: string,
  graphSelector?: (g: G | undefined) => R | undefined,
): Graph<R> => {
  const storeModule = useModule<Store>("Store");
  const dispatch = storeModule.hooks.useAppDispatch();
  const useAppSelector = storeModule.hooks.useAppSelector;
  const store = useStore();               // ← add (read-only at call time)

  // ... selector + graphState unchanged ...
  const graphState = useAppSelector<R | undefined>(selector);

  // Remove: const innerState = useAppSelector(...)

  const getInnerState = useCallback(
    () => (store.getState() as any)?.Graph?.graphs?.[graphId] as GraphState | undefined,
    [graphId],
  );

  return {
    id: graphId,
    state: graphState,
    actions: {
      // ...
      updateEdge: (edgeId, changes) => {
        const currentEdge = getInnerState()?.edges[edgeId];  // ← was innerState?.edges
        if (!currentEdge) throw Error("edge do not exits");
        dispatch(updateEdge({ graphId, edgeId, changes }));
      },
      nodeExists: (nodeId) => {
        const g = getInnerState();                            // ← was innerState
        return g ? nodeId in g.nodes : false;
      },
      // ...
    },
  };
};
```

This removes the broadcast subscription entirely. Every component using `useGraph` stops re-rendering on graph mutations it doesn't care about.

### Fix D — Memoize `GarmentDetails`

After Fix C, `GarmentDetails`'s `useGraph` call will only re-render when `g?.nodes[selectedPart]` changes (the memoized `graphState` selector). Wrapping `GarmentDetails` in `React.memo` also prevents parent-triggered re-renders if its `variationId` and `selectedPart` props didn't change:

```tsx
// GarmentDetails.tsx — last line
export default React.memo(GarmentDetails);
```

---

## Impact summary

| Fix | Eliminates |
|-----|-----------|
| A — Extract `useEditLease` to leaf | Group 1: 584-component cascade on every lease IPC resolution |
| B — No-op guard in `setViewportHasChanged` | Group 2: `ViewportManagerContent` + subtree on repeated dirty dispatches |
| C — Remove `innerState` subscription from `useGraph` | Group 3: `GarmentDetails` + all `useGraph` consumers re-rendering on every graph mutation |
| D — `React.memo` on `GarmentDetails` | Group 3: residual parent-push re-renders of the full details panel |

---

## What remains out of scope

- **Inline JSX in `ModelViewport`**: Icons created inline (`icon={<AccountTreeSharpIcon />}`) produce new references on every parent render. Memoizing them would eliminate the accordion cascade inside Fix A's new stable `ModelViewport`. Lower priority than the three structural fixes above.
- **`useVariationActions` `vp` subscription**: `layoutModule.hooks.useActiveViewport()` on line 52 subscribes to viewport state. This causes `useVariationActions` to re-render when any viewport metadata changes. Could be replaced with a `store.getState()` read inside `markChanged`, but has no observed impact currently.
- **`MaterialCostInfo` using `useGraph`**: Will benefit automatically from Fix C without any change.
