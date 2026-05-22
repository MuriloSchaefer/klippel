---
id: 2026-05-21-5e5caa
name: Narrow graph subscriptions across Composer components
description: Replace broad useGraph/useVariation subscriptions with dispatch-only hooks and node-type-scoped selectors so computation write-backs and unrelated graph mutations no longer trigger re-renders across the entire ModelViewport subtree.
status: implemented
modules: [Composer]
---

## Context

Profiling (`elective-toggle-switch-after-fix1A-2`, 2026-05-21) shows two render cycles after
every elective toggle, each re-rendering 700-900 fibers:

**Commit 3 (72ms):** `updateNode` changes graph state → every component subscribed to
`useGraph(variationId)` gets a new selector result → ModelViewport self-triggers a
re-render (hook 78) and cascades to its entire subtree.

**Commit 5 (105ms, ~300ms after toggle):** The computation middleware
(`store/computation/middlewares.ts`) debounces 300ms then dispatches multiple `updateNode`
write-backs — `computedCost` on MATERIAL nodes, `computedTimePerUnit` on PROCESS nodes,
`computedProcessTime` on GRADUATION nodes. Each write-back emits a new graph reference →
all 17 `useGraph(variationId)` subscribers re-render simultaneously.

The root cause is that **every** component calling `useVariation({ variationId })` inherits
an unconditional subscription to the full `state.Graph.graphs[variationId]` object, even
when it only needs to dispatch an action and never reads graph state during render.

A complete audit identified 35 call sites across 30 files. They fall into three tiers:

| Tier | Pattern | Count | Impact |
|------|---------|-------|--------|
| 1 | Calls `useVariation` for actions only — never reads state during render | 11 | Each eliminated subscription reduces the number of re-rendering components |
| 2 | Reads a specific node type or edge type from `graph.state` | 9 | Broad selector fires on every node type's write-back; scope should match the component's concern |
| 3 | Reads only a single field from `variation.state` (not graph state) | 4 | Full Composer state + full graph subscription for one string field |

---

## Change

### New hook: `useVariationActions`

**File:** `hooks/useVariationActions.ts` (new)

A dispatch-only counterpart to `useVariation` that provides the same `actions` object
but **subscribes to no graph or variation state**.

When an action body needs to read graph state (e.g. `updateElective` needs the current
node to merge changes), it calls `store.getState()` at dispatch time rather than holding
a subscribed selector reference. This is semantically identical — the value is always
read fresh at call time — but produces zero re-renders during React's render phase.

```typescript
export function useVariationActions({ variationId }: { variationId: string }) {
  // Only subscriptions: useActiveViewport (for markChanged) and useAppDispatch.
  // Both are stable across graph mutations.
  const dispatch = storeModule.hooks.useAppDispatch();
  const store    = storeModule.hooks.useStore();          // no subscription
  const vp       = layoutModule.hooks.useActiveViewport(); // selectActiveViewport only
  const vpMgr    = layoutModule.hooks.useViewportManager();

  const markChanged = useCallback(() => {
    if (vp) vpMgr.functions.setHasChanged(vp.name, true);
  }, [vp?.name]);

  // All action creators are stable useCallback refs.
  // State is read via store.getState() at call time, not at render time.
  return useMemo(() => ({ actions: { ...allActionCreators } }), [variationId, dispatch, markChanged]);
}
```

`useStore()` must be available on `storeModule.hooks`. If it is not yet exposed, add it
as part of this change (it is a standard React-Redux hook with no subscription cost).

All action creators that currently read `graph.state` (e.g. `updateElective`,
`addPart`, `removeGraduation`) are ported verbatim but replace `graph.state` with
`(store.getState() as RootState).Graph.graphs[variationId]`.

---

### Tier 1 — Replace `useVariation` with `useVariationActions` (11 components)

These components call `useVariation` exclusively for dispatching. They never read
`variation.state` or `graph.state` during render. Replacing the hook eliminates the
subscription entirely.

| File | Current usage | Change |
|------|---------------|--------|
| `ElectiveListAccordion/AddElectiveButton.tsx` | `variation.actions.addElective()` | `useVariationActions` |
| `ElectiveListAccordion/ElectiveItem.tsx` | `variation.actions.updateElective()`, `.removeElective()` | `useVariationActions` |
| `ElectiveListAccordion/ElectiveEditButton.tsx` | `variation.actions.updateElective()` | `useVariationActions` |
| `GraduationListAccordion/AddGraduationButton.tsx` | `variation.actions.addGraduations()` | `useVariationActions` |
| `GraduationListAccordion/GraduationItem.tsx` | `variation.actions.updateGraduation()`, `.removeGraduation()` | `useVariationActions` |
| `ProcessListAccordion/AddProcessButton.tsx` | `variation.actions.addProcess()` | `useVariationActions` |
| `ProcessListAccordion/ProcessEditButton.tsx` | `variation.actions.updateProcess()` | `useVariationActions` |
| `MaterialListAccordion/components/MaterialItem.tsx` | `variation.actions.removeMaterialNode()`, `.updateMaterial()` | `useVariationActions` |
| `CompositionTree/AddPartButton.tsx` | `variation.actions.addPart()` | `useVariationActions` |
| `CompositionTree/RemovePartButton.tsx` | `variation.actions.removePart()` | `useVariationActions` |
| `ProcessListAccordion/ProcessElectiveButton.tsx` | `variation.actions.updateProcess()` + reads ELECTIVE nodes | `useVariationActions` + scoped `useAppSelector` for ELECTIVE nodes only |

---

### Tier 2 — Narrow `useGraph` selectors (9 components)

These components read graph state during render but only need a specific node type or
edge type. Replace the full-graph subscription with a `createSelector`-based graphSelector
scoped to the relevant data. Use `shallowEqual` on array results so sibling item changes
do not trigger re-renders.

The pattern for all of these:

```typescript
const selectXxx = useMemo(
  () => createSelector(
    (g: VariationGraphState | undefined) => g,
    (g) => { /* filter to only what this component needs */ }
  ),
  [/* stable deps like garmentId */]
);
const data = graphModule.hooks.useGraph(variationId, selectXxx);
// or directly via useAppSelector with shallowEqual for list results
```

| Component | Currently reads | Narrow to |
|-----------|-----------------|-----------|
| `ElectiveListAccordion/index.tsx` | Full graph → filters HAS_ELECTIVE edges + ELECTIVE nodes for garmentId | `{ nodes: ElectiveNode[], edges: Edge[] }` scoped to garmentId; use `shallowEqual` |
| `MaterialListAccordion/index.tsx` | Full graph → filters HAS_MATERIAL edges + MATERIAL nodes | `{ nodes: MaterialNode[] }` scoped to garment node |
| `MaterialListAccordion/AddMaterialButton.tsx` | `graph.state.nodes` (all) for ID-uniqueness check | Node keys only: `(g) => Object.keys(g?.nodes ?? {})` with `shallowEqual` |
| `GraduationListAccordion/index.tsx` | Full graph → filters HAS_GRADUATION edges + GRADUATION nodes | `GraduationNode[]` ordered by `node.order`; use `shallowEqual` |
| `ProcessListAccordion/index.tsx` | All nodes → filters `type === "PROCESS"` | `ProcessNode[]`; use `shallowEqual` |
| `ProcessTimeAccordion/index.tsx` | All nodes → filters PROCESS + GRADUATION types | `{ processes: ProcessNode[], graduations: GraduationNode[] }` |
| `ProcessCostAccordion/index.tsx` | All nodes → filters `type === "PROCESS"` | `ProcessNode[]`; use `shallowEqual` |
| `VisualizationListAccordion/index.tsx` | Full graph → filters HAS_VISUALIZATION edges + VISUALIZATION nodes | `VisualizationNode[]` scoped to materialNodeId |
| `ProcessElectiveButton.tsx` | All nodes → filters `type === "ELECTIVE"` | `ElectiveNode[]`; use `shallowEqual` |
| `ProcessMaterialUsageButton.tsx` | All nodes + edges → filters MATERIAL + CONSUMES | `{ materialNodes: MaterialNode[], consumesEdges: ConsumesEdge[] }` |
| `AddVisualizationButton.tsx` | All nodes → filters `type === "MATERIAL"` | `MaterialNode[]`; use `shallowEqual` |
| `VisualizationItem.tsx` | `nodes[materialNodeId]` (single node) | `(g) => g?.nodes[materialNodeId] as MaterialNode` |
| `VisualizationEditButton.tsx` | All nodes → filters `type === "MATERIAL"` | `MaterialNode[]`; use `shallowEqual` |

**Note on `useGraph` internals:** `useGraph` contains a second unconditional
`useAppSelector` for `innerState` (used only by `graph.actions.updateEdge`). Components
that do not call `updateEdge` can bypass `useGraph` entirely and call `useAppSelector`
directly. For components that do call `updateEdge` (e.g. `ProcessMaterialUsageButton`),
keep using `useGraph` with a narrow `graphSelector`.

---

### Tier 3 — Remove full-graph subscription from ModelViewport and SVG components (4 sites)

These components call `useVariation` but only read a single field from `variation.state`
(the Composer slice, not graph state). Yet `useVariation` pulls in `useGraph` too.

| Component | Reads | Fix |
|-----------|-------|-----|
| `ModelViewport/index.tsx` (line 41) | `variation.state?.id` → passed to `useEditLease` | Replace `useVariation` with a targeted `useAppSelector` for `state.Composer.variations[variationId]?.id`. No graph subscription at all. |
| `ModelViewport/SVGView/index.tsx` | `variation.state?.svg` → existence check | Replace with `useAppSelector((s) => !!s.Composer.variations[variationId]?.svg)` |
| `ModelViewport/SVGView/SVGModelViewport.tsx` | `variation.state.svg` → passed to `useSVG` | Replace with `useAppSelector((s) => s.Composer.variations[variationId]?.svg)` |
| `CompositionTree/CompositionTree.tsx` (line 134) | `variation.state?.selectedPart` | Replace with `useAppSelector((s) => s.Composer.variations[variationId]?.selectedPart)` |

These changes remove the `useGraph(variationId)` subscription from the top-level
ModelViewport component and its immediate view children — the highest-value subscriptions
to eliminate because they sit at the top of the subtree.

---

### Tier 4 — Keep as-is (already narrowed or correctly broad)

| Component | Reason |
|-----------|--------|
| `Initializer.tsx` — `useGraph` | Only initialises the conversion graph; no re-render concern |
| `useNodeInfo.ts` — `useGraph` ×3 | Already narrowed to single node / single adjacency entry |
| `ConversionList.tsx` — `useGraph` | Already narrowed; different graph (Converter), not variationId |
| `GarmentDetails.tsx` — `useGraph` | Already narrowed to `g?.nodes[selectedPart]` |
| `useVariation.ts` itself | Source hook; narrowed internally by callers in Tiers 1-3 |
| `ProcessItem.tsx` — `useGraph` | Reads single process node + its CONSUMES edges; acceptable |

---

### Memoize list components (prerequisite for Tier 2 to be effective)

Narrowing the selector only prevents re-renders if the parent is also stable. Wrap all
accordion list components with `React.memo` so parent re-renders (e.g. from a sibling
accordion's open/close state) don't cascade to them:

`ElectiveListAccordion`, `MaterialListAccordion`, `GraduationListAccordion`,
`ProcessListAccordion`, `VisualizationListAccordion`, `ProcessTimeAccordion`,
`ProcessCostAccordion`, `CompositionTree`.

Also wrap the item-level components that receive stable node props:
`ElectiveItem`, `GraduationItem`, `ProcessItem`, `MaterialItem`, `VisualizationItem`.

---

## Implementation order

Each step is independently deployable and verifiable via the React profiler:

1. **`useVariationActions` hook** — create the hook; no component changes yet. Verifiable
   by unit test or type check only.

2. **Tier 3: ModelViewport and SVG view components** — highest impact; removes the
   broad subscription from the top of the viewport subtree. Rerun the elective-toggle
   profiler after this step; Commit 3 should shrink because ModelViewport itself no longer
   self-triggers on graph changes.

3. **Tier 1: dispatch-only components** — migrate all 11 components to
   `useVariationActions`. Commit 3 shrinks further; fewer updaters in the profiler.

4. **Tier 2: accordion selectors + `React.memo`** — narrowed selectors + memoization
   work together. The computation write-backs (MATERIAL/PROCESS/GRADUATION nodes) will
   no longer trigger ElectiveListAccordion, ProcessTimeAccordion, etc. Commit 5 should
   reduce to near-zero.

5. **Verify** using a fresh profiler recording of the elective toggle: target is one
   short commit affecting only ElectiveItem + its direct store subscription.

---

## Status notes

Draft. Open questions:

- `useStore()` must be exposed on `storeModule.hooks` for `useVariationActions`. Confirm
  it is available or add it to the Store module's hook registry before step 1.
- `ProcessItem.tsx` reads a single process node AND a subset of CONSUMES edges. The
  existing subscription is narrow but uses the full-graph `useGraph` which also subscribes
  via `innerState`. If `ProcessItem` never calls `updateEdge`, replace with a direct
  `useAppSelector` and `graph.actions` from dispatch-only pattern.
- `CompositionTree.tsx` calls `useVariation` for `reorderGraduations`-equivalent actions
  AND `useGraph` for part nodes/edges. Tier 3 only removes the Composer state read; the
  `useGraph` call for part structure (line 149) is left for Tier 2 follow-up.

## Security

None.

## Performance

Target outcome after all four tiers:

- **Elective toggle Commit 3**: Only `ElectiveItem` and `ElectiveListAccordion` re-render
  (triggered by graph state change). Self-time ~2ms total. ModelViewport, all other
  accordions, SVG view — all skipped.
- **Elective toggle Commit 5** (computation write-back): No re-renders. Write-backs touch
  MATERIAL/PROCESS/GRADUATION nodes only. With Tier 2 applied, none of the elective-path
  components subscribe to those node types. Write-backs become invisible to the UI render
  tree.
- **Cumulative**: From ~185ms (two commits, 800+ fibers each) to <5ms (one commit,
  <20 fibers).
