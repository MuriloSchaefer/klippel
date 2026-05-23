# Viewport Re-render Performance Analysis

**Profiling session:** elective-toggle-switch  
**Captured:** 2026-05-21  
**Symptom:** Toggling an `ElectiveItem` switch takes ~185 ms of React work, causing visible UI lag.

---

## Measured impact

| Commit | Duration | Fibers rendered | Root cause |
|--------|----------|-----------------|------------|
| 3 | **81.3 ms** | 854 | Graph state update (`updateNode`) |
| 4 | **103.9 ms** | 934 | Viewport `hasChanged` flag update |
| **Total** | **~185 ms** | — | Two separate React render cycles |

The Chrome trace confirms the same shape: a 275 ms `EventDispatch` → 163 ms `performWorkUntilDeadline` pipeline on the main thread, stalling it for well over 300 ms on a single toggle.

---

## Trigger chain

```
User clicks Switch (ElectiveItem.tsx:75)
  └─ variation.actions.updateElective(nodeId, { value })   (useVariation.ts:199-204)
       ├─ graph.actions.updateNode(node)                   ──► Redux dispatch #1
       │    └─ updateNode reducer mutates state.Graph.graphs[variationId].nodes[nodeId]
       │         └─ Immer emits new graph reference
       │              └─ useGraph(variationId) sees new state   ← triggers Commit 3
       │                   └─ useVariation() in ModelViewport sees new graph
       │                        └─ ModelViewport re-renders (1.6 ms self)
       │                             └─ entire subtree re-renders (81.3 ms actual)
       │
       └─ markChanged()                                    ──► Redux dispatch #2
            └─ setViewportHasChanged(name, true)
                 └─ reducer creates new viewports object
                      └─ selectViewportStates returns new reference  ← triggers Commit 4
                           └─ ViewportManagerContent re-renders
                                └─ ViewportLoader re-renders
                                     └─ ModelViewport re-renders again (103.9 ms)
```

Every toggle causes ModelViewport and its full subtree (~850 fibers) to render **twice**.

---

## Root cause 1 — double dispatch in `updateElective`

`useVariation.ts:199-204`:

```typescript
updateElective: (nodeId, changes) => {
  graph.actions.updateNode({ ...curr, ...changes });  // dispatch #1
  markChanged();                                       // dispatch #2
},
```

`markChanged` calls `viewportManager.functions.setHasChanged(vp.name, true)`, which dispatches `setViewportHasChanged`. Even under React 18 automatic batching these remain two separate render cycles because the Redux store notifies subscribers synchronously between `dispatch` calls when called outside of a React event (or through middleware that flushes between dispatches).

The second dispatch alone accounts for 103.9 ms — it is more expensive than the first because it re-renders the parent (`ViewportManagerContent`) which then re-renders everything below it, including ModelViewport for the second time.

---

## Root cause 2 — `selectViewportStates` invalidates on `hasChanged`

`viewports/slice.ts:106-112`:

```typescript
builder.addCase(setViewportHasChanged, (state, { payload: { name, hasChanged } }) => {
  const vp = { ...state.viewports[name], hasChanged };
  return {
    ...state,
    viewports: { ...state.viewports, [name]: vp },  // new object every call
  };
});
```

`ViewportManagerContent` subscribes to `selectViewportStates` (line 47), which returns `state.Layout.viewportManager.viewports`. Because `setViewportHasChanged` always spreads the viewports object, even a write of the same boolean value (e.g. `true → true`) produces a new reference. `createSelector` cannot memoize the result because its input (`viewportManager`) changed.

`ViewportManagerContent` is the **parent** of `ViewportLoader` which is the parent of `ModelViewport`. Its re-render cascades the entire viewport subtree for free — this is why Commit 4 re-renders 934 fibers instead of 854.

---

## Root cause 3 — broad graph subscription in `useGraph`

`useGraph.ts:97-99`:

```typescript
const innerState = useAppSelector(
  (state) => state?.Graph && state.Graph.graphs[graphId],
);
```

And the default selector path (line 88-93) also returns `state.Graph.graphs[graphId]` when no `graphSelector` is provided. Immer produces a new `graphs[graphId]` reference on every `updateNode`, `addNode`, or `removeNode` call, even when only one node field changed.

Every component that calls `useVariation({ variationId })` holds `useGraph(variationId)` inside it. When any node in the graph changes, all such components get a new graph reference and re-render. Inside ModelViewport this propagates to `GarmentDetails`, `ElectiveListAccordion`, all material/process/graduation accordions — the entire detail panel re-renders regardless of which node was modified.

---

## Root cause 4 — unmemoized accordion/item layer

`ElectiveListAccordion/index.tsx` and `ElectiveItem.tsx` are plain functional components with no `React.memo`. When ModelViewport re-renders (either of the two times), all `ElectiveItem` siblings re-render even though only one item's value changed. This compounds with the 850+ fiber count: many of those renders are wasted work on items whose props and state are identical.

---

## Why renders take long despite small self-times

ModelViewport's self-time is only **1.6 ms** — the component itself is cheap. The **81.3 ms actual duration** is entirely the subtree cost. The profiler flame graph shows the cost concentrated in Provider → Context.Provider → the deep Composition/Detail panel tree. There are no heavy computations inside individual components; the problem is pure **breadth**: each render cycle visits hundreds of nodes that produce identical output.

---

## How to fix

### Fix 1 — remove the second dispatch (highest impact)

The `hasChanged` flag is an editorial concern (dirty-state indicator for save buttons). It does not need to trigger a layout re-render. Move `markChanged()` to fire **after** the current React render cycle using a `useEffect` or debounce it separately, or — better — track dirty state outside the `viewports` map so `selectViewportStates` does not invalidate.

**Option A — separate dirty state slice:**  
Move `hasChanged` out of `viewports` into its own key (`state.Layout.dirtyViewports`). `selectViewportStates` no longer returns a new object when the dirty flag changes, so `ViewportManagerContent` stops re-rendering on toggle.

**Option B — batch the two dispatches explicitly:**  
```typescript
import { batch } from 'react-redux';

updateElective: (nodeId, changes) => {
  batch(() => {
    graph.actions.updateNode({ ...curr, ...changes });
    markChanged();
  });
},
```
`batch` forces both dispatches to produce a single re-render pass. This eliminates Commit 4 entirely.

### Fix 2 — narrow the graph selector in consumers

Pass a `graphSelector` to `useGraph` to select only the slice each component needs:

```typescript
// ElectiveListAccordion — only needs elective nodes and HAS_ELECTIVE edges
const graph = useGraph(variationId, (g) => ({
  electiveNodes: Object.values(g?.nodes ?? {}).filter(n => n.type === 'ELECTIVE'),
  edges: Object.values(g?.edges ?? {}).filter(e => e.type === 'HAS_ELECTIVE'),
}));
```

With a `createSelector`-based `graphSelector`, the component only re-renders when the derived slice actually changes. If a graduation node is updated, `ElectiveListAccordion` is skipped entirely.

For `ElectiveItem`, narrow further to just the single node:

```typescript
const node = useGraph(variationId, g => g?.nodes[nodeId]);
```

### Fix 3 — memoize the accordion and item layer

```typescript
// ElectiveListAccordion/index.tsx
export default React.memo(ElectiveListAccordion);

// ElectiveItem.tsx
export default React.memo(ElectiveItem);
```

This prevents sibling `ElectiveItem` components from re-rendering when one item's value changes. It also prevents the entire accordion from re-rendering when an unrelated node (e.g. a graduation) changes — assuming Fix 2 narrows the selector so the parent doesn't receive a new reference.

Memoization alone (without Fix 2) will not help because the parent `ModelViewport` still re-renders and passes new inline-object props down the tree. Memoization is only effective when combined with stable props.

### Fix 4 — stabilise the `updateElective` action reference

`useVariation` is called inside multiple components. The returned `actions` object is recreated on every render. Any child that receives `variation.actions.updateElective` as a prop will see a new reference every render, breaking `React.memo`. Stabilise with `useCallback`:

```typescript
const updateElective = useCallback((nodeId: string, changes: Partial<ElectiveNode>) => {
  if (!graph.state) return;
  const curr = graph.state.nodes[nodeId];
  if (!curr) return;
  graph.actions.updateNode({ ...curr, ...changes } as any);
  markChanged();
}, [graph.state?.nodes, graph.actions, markChanged]);
```

Or restructure `useVariation` to return stable dispatch-bound action creators rather than inline closures.

---

## Recommended priority

| Fix | Expected reduction | Effort |
|-----|--------------------|--------|
| Fix 1A (separate dirty state) | Eliminates Commit 4 entirely (~104 ms) | Medium |
| Fix 1B (batch dispatches) | Eliminates Commit 4 entirely (~104 ms) | Low |
| Fix 2 (narrow graph selector) | Reduces Commit 3 from ~81 ms to <10 ms | Medium |
| Fix 3 (memoize accordions) | Eliminates sibling re-renders | Low |
| Fix 4 (stable action refs) | Prerequisite for Fix 3 to work | Low |

**Start with Fix 1B** — it is a one-line change that immediately halves the total render time. Then apply Fix 2 to reduce the remaining 81 ms commit. Fixes 3 and 4 are correctness improvements that also reduce future re-render risk.
