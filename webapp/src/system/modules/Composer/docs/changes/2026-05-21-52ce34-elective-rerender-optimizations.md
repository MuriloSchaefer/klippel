---
id: 2026-05-21-52ce34
name: Elective list render optimizations
description: Narrow graph selectors in ElectiveListAccordion, memoize ElectiveListAccordion and ElectiveItem, and remove the full useVariation subscription from ElectiveItem to eliminate unnecessary re-renders on elective toggle.
status: draft
modules: [Composer]
---

## Context

Profiling (`elective-toggle-switch` session, 2026-05-21) measured the first of two expensive
render cycles: **81.3 ms / 854 fibers** triggered by a single elective toggle.

Three compounding problems cause this:

**A — Broad graph subscription in `ElectiveListAccordion`.**  
`useGraph<VariationGraphState>(variationId)` (index.tsx:16) subscribes to the entire
`state.Graph.graphs[variationId]` object.  Immer emits a new graph reference whenever any
node or edge is touched — toggling one elective invalidates every consumer of this graph,
including `ElectiveListAccordion`, all material accordions, all process accordions, etc.
Additionally, `useGraph` has a second broad `useAppSelector` inside it (`innerState`,
useGraph.ts:97-99) that always returns the full graph, so even a custom `graphSelector`
alone is not sufficient to narrow the subscription from within `useGraph`.

**B — `ElectiveItem` calls `useVariation` for display and action.**  
`useVariation` subscribes to: the full graph state (via `useGraph`), the active viewport,
all materials, all material types, the Composer variation state, and the SVG state.  None
of those subscriptions are needed to display or toggle a single elective.  The `node` is
already passed as a prop.

**C — Neither `ElectiveListAccordion` nor `ElectiveItem` is memoised.**  
When `ModelViewport` re-renders (which it does on every graph change via its own
`useVariation` call), it unconditionally re-renders the full detail panel including all
accordion items, even for sibling electives whose `node` did not change.

## Change

### Fix 2 — Narrow graph selector in `ElectiveListAccordion` (index.tsx)

Replace the `useGraph` call with a direct `useAppSelector` using a stable `createSelector`
that returns only the elective nodes relevant to this `garmentId`.

```typescript
import { createSelector } from 'reselect';
import { useSelector, shallowEqual } from 'react-redux';   // or via storeModule.hooks

// defined outside the component so createSelector instances are stable across renders
const makeSelectElectiveNodes = (variationId: string, garmentId: string) =>
  createSelector(
    (state: { Graph: GraphsManagerState }) => state.Graph.graphs[variationId],
    (graph) => {
      if (!graph) return [] as ElectiveNode[];
      const edges = Object.values(graph.edges).filter(
        (e) => e.sourceId === garmentId && e.type === 'HAS_ELECTIVE',
      );
      return edges
        .map((e) => graph.nodes[e.targetId])
        .filter((n): n is ElectiveNode => !!n && n.type === 'ELECTIVE');
    },
  );
```

Use `useMemo` to create the selector instance once per `(variationId, garmentId)` pair:

```typescript
const selectElectiveNodes = useMemo(
  () => makeSelectElectiveNodes(variationId, garmentId),
  [variationId, garmentId],
);
const electiveNodes = useAppSelector(selectElectiveNodes, shallowEqual);
```

`shallowEqual` compares the returned array element-by-element.  When a graduation or
material node changes, the elective node references in the array are unchanged →
`shallowEqual` returns `true` → `ElectiveListAccordion` skips re-rendering entirely.
When one elective's value changes, its node object gets a new reference from Immer →
`shallowEqual` returns `false` → `ElectiveListAccordion` re-renders, but only the
one `ElectiveItem` whose `node` prop changed will re-render (see Fix 3 below).

Remove the `useGraph` import and call from this file; it is no longer needed.

### Fix 2 — Remove `useVariation` from `ElectiveItem` (ElectiveItem.tsx)

`ElectiveItem` only needs two operations from `useVariation`: `updateElective` and
`removeElective`.  Both are thin wrappers around graph dispatch + `markChanged()`.
Replace the `useVariation` call with a minimal local dispatch pattern:

```typescript
// Replace:
const variation = useVariation({ variationId });

// With:
const storeModule = useModule<Store>('Store');
const graphModule = useModule<IGraphModule>('Graph');
const layoutModule = useModule<ILayoutModule>('Layout');

const dispatch = storeModule.hooks.useAppDispatch();
const vp = layoutModule.hooks.useActiveViewport();
const viewportManager = layoutModule.hooks.useViewportManager();

const markChanged = useCallback(() => {
  if (vp) viewportManager.functions.setHasChanged(vp.name, true);
}, [vp, viewportManager]);

const handleToggle = useCallback(
  (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    dispatch(updateNode({ graphId: variationId, nodeId: node.id, changes: { ...node, value: checked } }));
    markChanged();
  },
  [dispatch, variationId, node, markChanged],
);

const handleRemove = useCallback(() => {
  dispatch(removeNode({ graphId: variationId, nodeId: node.id }));
  markChanged();
  // focus logic unchanged
}, [dispatch, variationId, node.id, markChanged]);
```

Import `updateNode` and `removeNode` directly from
`@kernel/modules/Graphs/store/graphInstance/actions`.

After this change `ElectiveItem` has **zero Redux state subscriptions**.  It reads only
from props and dispatches.

### Fix 3 — Memoize `ElectiveListAccordion` and `ElectiveItem`

**`ElectiveListAccordion/index.tsx`:**

```typescript
export default React.memo(ElectiveListAccordion);
```

Props are `variationId: string` and `garmentId: string` — both primitives, always stable.
The component only re-renders when `electiveNodes` changes (via `useAppSelector`) or when
`variationId`/`garmentId` change.

**`ElectiveItem.tsx`:**

```typescript
export default React.memo(ElectiveItem);
```

Props are `node: ElectiveNode` and `variationId: string`.  After Fix 2, the `node` reference
only changes when that specific node is updated in the Redux store (Immer creates a new
object for the mutated node, existing nodes keep their identity).  Sibling `ElectiveItem`
components receive the same `node` reference, pass `React.memo`'s check, and skip
re-rendering.

### Fix 4 — Stable action refs in `useVariation` (hooks/useVariation.ts)

`useVariation` returns a new `actions` object on every render because every action creator
is an inline arrow function.  Components that destructure and pass these functions as props
or event handlers will see new references every time `useVariation` re-runs, defeating
memoisation downstream.

Wrap each action creator with `useCallback`.  The `updateElective` stabilisation as an
example:

```typescript
const updateElective = useCallback(
  (nodeId: string, changes: Partial<ElectiveNode>) => {
    if (!graph.state) return;
    const curr = graph.state.nodes[nodeId];
    if (!curr) return;
    graph.actions.updateNode({ ...curr, ...changes } as any);
    markChanged();
  },
  // depend only on graph.state.nodes and the stable dispatch refs
  [graph.state?.nodes, graph.actions.updateNode, markChanged],
);
```

Apply the same treatment to: `addElective`, `removeElective`, `updateElective`,
`updateMaterial`, `addGraduation`, `removeGraduation`, `updateGraduation`,
`reorderGraduations`, `addVisualization`, `removeVisualization`, `updateVisualization`,
`addProcess`, `removeProcess`, `updateProcess`, and the process-consumption family.

Return the memoised callbacks in the `actions` object.

Note: with Fix 2 applied to `ElectiveItem`, this hook is no longer called from that
component.  Fix 4 remains relevant for other consumers (`MaterialListAccordion`,
`ProcessListAccordion`, `ModelViewport` itself) that still call `useVariation`.

## Status notes

Draft.  Implementation order matters:

1. Fix 2 first (narrow selectors + remove `useVariation` from `ElectiveItem`) — this breaks
   the broad subscription and eliminates the 854-fiber render chain from the item layer.
2. Fix 3 after Fix 2 — memoisation has no effect until the subscriptions are narrowed;
   doing it in reverse order looks correct but doesn't improve performance.
3. Fix 4 last — it's a correctness/future-proofing improvement and does not affect
   component subscription topology.

Open questions:
- `useActiveViewport` is called inside `ElectiveItem` (via the new direct dispatch path)
  to obtain the viewport name for `markChanged`.  This adds a `selectActiveViewport`
  subscription to every `ElectiveItem`.  After Fix 1A (Layout module change doc), this
  subscription is cheap because `selectActiveViewport` changes only when the user switches
  tabs.  If Fix 1A is not applied, consider passing the viewport name as a prop instead
  to avoid even this subscription.
- Once Fix 2 is applied to `ElectiveListAccordion`, verify that other accordions
  (`MaterialListAccordion`, `ProcessListAccordion`, `GraduationListAccordion`) have the
  same broad-graph-subscription problem and apply the same pattern to them in follow-up
  changes.

## Security

None.

## Performance

Expected impact (relative to `elective-toggle-switch` baseline, commit 3 — 81.3 ms / 854
fibers):

| Change | Expected result |
|--------|----------------|
| Fix 2 — narrow selector in `ElectiveListAccordion` | Component skips re-render when non-elective nodes change |
| Fix 2 — remove `useVariation` from `ElectiveItem` | `ElectiveItem` has zero store subscriptions; never re-renders from store updates |
| Fix 3 — `React.memo` on both components | Sibling items skipped on single-elective toggle; parent skipped on unrelated graph changes |
| Fix 4 — stable action refs | Prevents callback churn in components downstream of `useVariation`; prerequisite for future memoisation of those components |

Combined with the Layout module change (Fix 1A), target is sub-5 ms per elective toggle
with only the affected `ElectiveItem` and its direct ancestors re-rendering.
