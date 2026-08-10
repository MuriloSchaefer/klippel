# Materials catalog → Redux: why the app is laggy

**Date:** 2026-08-09 (analysis) · 2026-08-10 (fixes landed)
**Scope:** `system/modules/Materials` (store, hooks, selectors, main-process Jazz
layer) + its consumers in `Composer`, plus the kernel store setup
**Status:** F1–F8 fixed — see [Resolution](#resolution) for what landed and the
measured result. The findings below are kept as the diagnosis they were.

---

## Summary

The Materials module mirrors the **entire** Jazz catalog into Redux, and rebuilds
that mirror **from scratch on every catalog mutation**. Three things compound:

1. The catalog→state adapter is **O(materials × edges)**, i.e. quadratic in
   catalog size. Measured: **34 ms @ 1k materials, 1.1 s @ 5k, 3.4 s @ 10k** —
   run synchronously *inside a reducer*, on the renderer's main thread.
2. Every mutation (local edit **or** remote sync tick) triggers a **full reload**:
   whole-catalog IPC + structured clone + full slice replacement, not a delta.
3. The replacement produces a **new object identity for the whole map**, which
   every consumer subscribes to — so one material changing re-renders the stock
   grid, every `ProcessItem`, every material selector, and the variation editor.

On top of that, two development-only amplifiers (RTK's `immutableCheck` and the
Redux DevTools extension) walk that multi-megabyte state on *every* dispatch,
which is why the dev build can sit at 100% CPU while doing nothing.

The existing perf test already encodes the symptom — the 10k tier is commented
out with `// FREEZES`, and the render budgets grow super-linearly (100 rows →
1.5 s, 500 → 4.5 s, 1 000 → 10 s):

```ts
// system/modules/Materials/tests/standalone/performance/catalogRender.e2e.test.ts:66-71
{ count: 100,   renderBudgetMs: 1_500, … },
{ count: 500,   renderBudgetMs: 4_500, … },
{ count: 1_000, renderBudgetMs: 10_000, … },
// { count: 10_000, renderBudgetMs: 20_000, … }, // FREEZES
```

---

## The data path

```
main process                          renderer
────────────                          ────────
MaterialCatalogCoMap
  │ .subscribe(materialsCatalogResolve)   ← deep-resolves every material,
  │                                          its attributes, composition,
  │                                          caracteristics, all edges
  ├─ any change (local write or sync)
  │     → notifyCatalogChange()  [debounce 150 ms]
  │     → IPC "jazz-materials:changed"  ──────────►  kernelCalls.ts:48
  │                                                    dispatch(loadMaterialsCatalog())
  │                                                          │
  │   ipc "materials:load" ◄─────────────────────────────────┘
  ├─ loadMaterialsCatalog()      ← projects the WHOLE catalog to a DTO snapshot
  └─ structured-clone over IPC   ──────────►  materialsCatalogLoaded(snapshot)
                                                    │
                                                    ├─ materials slice: catalogToMaterialsState(snapshot)   ← O(M×E)
                                                    └─ graph slice:     edges + adjacency rebuild
                                                                │
                                                                ▼
                                          new identity for `state.Materials.materials`
                                                                │
                          ┌─────────────────┬───────────────────┼──────────────────────┐
                    TableView/SummaryBar  ProcessItem ×N   MaterialSelector ×N   useVariation
```

There is no delta path. `materialAdded` / `materialUpdated` / `materialDeleted`
reducers exist and do the right (cheap) thing — but the change subscription
fires anyway and throws the result away with a full rebuild.

---

## Findings

### F1 — `catalogToMaterialsState` is quadratic (primary cost)

`store/materials/catalogAdapter.ts:101-110` loops over every material and, for
each one, calls `suppliersFor` / `industryFor`, which each **scan the full edge
array**:

```ts
// catalogAdapter.ts:63-74
function suppliersFor(materialId, edges) {
  return edges.filter((e) => e.type === "suppliedBy" && e.sourceId === materialId)…
}
function industryFor(materialId, edges) {
  const edge = edges.find((e) => e.type === "manufacturedBy" && e.sourceId === materialId);
}
```

With ~3 edges per material (`conformsTo`, `manufacturedBy`, `suppliedBy`), that
is `M × 3M = 3M²` comparisons. Measured (Node 24, same algorithm, realistic DTO
shape — script kept in the session scratchpad):

| Materials | Edges  | current `catalogToMaterialsState` | with an edge index | snapshot size |
|-----------|--------|-----------------------------------|--------------------|---------------|
| 500       | 1 500  | 10.7 ms                           | 1.7 ms             | 0.34 MB       |
| 1 000     | 3 000  | 34.7 ms                           | 2.8 ms             | 0.68 MB       |
| 2 500     | 7 500  | 253.4 ms                          | 7.0 ms             | 1.72 MB       |
| 5 000     | 15 000 | **1 088.8 ms**                    | 18.3 ms            | 3.46 MB       |
| 10 000    | 30 000 | **3 408.0 ms**                    | 27.0 ms            | 6.93 MB       |

The 4× jump per doubling is the quadratic signature. **This runs inside the
reducer**, so it blocks the main thread completely — no paint, no input, and it
is not interruptible by React.

The irony: the sibling `graph` slice already builds exactly the index this needs
(`store/graph/slice.ts:6-14`, `adjacencyList: sourceId → edgeIds`) from the same
payload, in one pass. The materials adapter just doesn't use it.

### F2 — every mutation triggers a full reload, not a delta

`kernelCalls.ts:48-50` turns each `jazz-materials:changed` tick into
`loadMaterialsCatalog()`, and the middleware re-fetches and replaces everything:

```ts
// store/materials/middlewares.ts:43-51
effect: async (_action, { dispatch }) => {
  const snapshot = await api.load();          // whole catalog over IPC
  dispatch(materialsCatalogLoaded(snapshot)); // whole slice replaced
}
```

`materialsCatalogLoaded` in `store/materials/slice.ts:23-25` discards prior state
entirely. So the per-edit cost is:

`whole-catalog projection in main` + `structured clone of N MB` + `O(M²) adapter`
+ `full graph rebuild` + `global re-render` — for a one-field change.

Worse, a local edit pays this **twice**: once through the optimistic
`materialAdded`/`materialUpdated` reducer, once through the subscription tick it
provokes.

**During xlsx import this becomes a livelock.** The importer writes in chunks of
25 (`main/importer/index.ts:24`) and the main-process notifier debounces at
150 ms (`main/materials.ts:151-163`). Once the rebuild exceeds 150 ms — i.e. from
~2 000 materials on — every debounce window finds the renderer still busy from
the last one, so the queue never drains. That is the reported freeze.

### F3 — whole-map subscriptions fan the invalidation out to everything

`useMaterials()` with no argument returns the entire map
(`hooks/useMaterials.ts:26` → `selectors.ts:8-11`), so any consumer re-renders
whenever the map identity changes — which is on every tick, by construction.
Current subscribers to the *whole catalog*:

| Consumer | File | Instances |
|---|---|---|
| `useFilteredMaterials` → stock grid | `hooks/useFilteredMaterials.ts:54` | 1 per stock viewport |
| `ProcessItem` | `Composer/…/ProcessListAccordion/ProcessItem.tsx:105` | **one per process row** |
| `processMaterialUsageButton` | `…/processMaterialUsageButton.tsx:304` | one per usage button |
| `MaterialListAccordion` | `Composer/…/MaterialListAccordion/index.tsx:37` | 1 |
| `useVariation` | `Composer/hooks/useVariation.ts:54` | 1 per variation editor |
| `useVariationActions` | `Composer/hooks/useVariationActions.ts:222` | 1 per editor |
| `useVariationRehydration` | `Composer/hooks/useVariationRehydration.ts:68` | 1 |

None of these need more than a handful of materials by id.

### F4 — `useMaterials(ids)` doesn't actually narrow (bug)

The filtering branch is dead code:

```ts
// hooks/useMaterials.ts:16-23
return (state: MaterialsState) =>
  materials.reduce((acc, curr: string) => {
    if (!materials.includes(curr)) {   // iterating `materials`, so ALWAYS false
        delete acc[curr]               // never runs — and would mutate Redux state
        return acc
    }
    return acc
  }, state)                            // returns the full state object
```

It iterates the requested-id list and asks whether each id is in that same list —
always yes — so it returns the complete map unchanged. `VisualizationItem`
(`…/VisualizationListAccordion/VisualizationItem.tsx:38-41`) asks for a single id
and receives all of them. Two further problems in the same hook:

- the caller passes a **fresh array literal** each render, so the `useMemo` on
  `[materials]` never hits and a new selector is built every render;
- had the branch worked, `delete acc[curr]` would mutate the live Redux state
  object in place.

### F5 — `MaterialSelector` rebuilds two O(k²) structures per render

`components/selectors/Material.tsx:37-45` builds its selector with
`.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})` — a spread per item,
so O(k²) allocations — and then `groupedMaterials` (lines 60-105) does the same
with nested spreads. Measured on the type-0 subset of a 10k catalog (1 250 rows):
**147 ms** for the selector reduce alone. Its `useMemo` also depends on `filter`,
which callers typically pass as an inline lambda, so the memo rarely holds.

### F6 — dev-build amplifiers (why CPU sits at 100% when idle)

- `configureStore` disables `serializableCheck` but leaves **`immutableCheck`
  on** (`kernel/modules/Store/components/DynamicStore.tsx:32-39`). In
  development RTK deep-walks the *entire* store before and after every single
  dispatch. Against a multi-MB materials slice this dwarfs the reducer itself,
  and it runs for **every** action in the app — a keystroke, a hover, a viewport
  extra patch — not just materials ones.
- The Redux DevTools extension is installed unconditionally in dev
  (`electron/main/index.ts:216-218`) and serializes each action *plus a full
  state snapshot*. With a tick every 150 ms during sync or import, this alone
  saturates a core.

Both are dev-only, so they don't explain production slowness — but they do
explain the machine you're actually developing on.

### F7 — search re-scans and re-sorts the full catalog per keystroke

`useFilteredMaterials` (`hooks/useFilteredMaterials.ts:57-69`) scores and sorts
every material on each query change, and the query itself lives in Redux
(`MaterialStockViewport/index.tsx:65-68` dispatches `setExtrasViewport` per
keystroke), so each character also re-renders every viewport-extras subscriber.
There is a debounce change doc on record
(`Materials/docs/changes/2026-05-30-98dc78-debounce-stock-search.md`) — worth
confirming it still covers this path.

### F8 — the resolve set deep-loads the whole catalog in main

`materialsCatalogResolve` (`main/materials.ts:159-174`) deep-resolves every
material with all attribute/composition/caracteristics sub-maps, and the live
`subscribe` uses the same shape. Main therefore holds and re-validates the full
graph even when the renderer only needs 30 visible rows. This is the ceiling on
how cheap F2 can get.

---

## Why it feels "laggy" rather than "slow"

The expensive work is (a) synchronous, (b) inside a reducer, and (c) triggered by
events the user didn't initiate (sync ticks). So there is no spinner and no
correlation with what the user just did — typing stalls, a hover doesn't
highlight, a click lands 400 ms later. The 150 ms debounce guarantees the stalls
recur, rather than happening once.

---


## Resolution

All eight findings are fixed. Measured on the shipped code (`catalogAdapter`,
same generator as the table in F1, Node 24):

| Materials | full rebuild before | full rebuild after | one-row delta after |
|-----------|---------------------|--------------------|---------------------|
| 1 000     | 34.7 ms             | **3.2 ms**         | 0.97 ms             |
| 5 000     | 1 088.8 ms          | **18.5 ms**        | 1.32 ms             |
| 10 000    | 3 408.0 ms          | **40.9 ms**        | 2.91 ms             |

The full rebuild is now linear (83× faster at 10k), and it no longer runs on
every mutation — the steady-state cost of an edit is the one-row delta.

### F1 — edge index

`catalogToMaterialsState` builds a `sourceId → edges` map once
(`buildEdgeIndex`) and reads it O(1) per material. `materialDtoToState` accepts
either an array or a prebuilt index, so the existing array call sites are
unchanged.

### F2 — delta ticks

New path, end to end:

```
main                                              renderer
────                                              ────────
MaterialCatalogCoMap.subscribe(               ┌─ onChanged tick
  materialsCatalogChangeResolve)  ← shallow   │
  └─ notifyCatalogChange [150 ms] ────────────┘
                                    dispatch(loadMaterialsCatalogDelta())
                                                     │
  computeCatalogDelta(webContents.id) ◄──────────────┘
  ├─ diff vs this client's shadow (updatedAt / edge signature)
  └─ { materials: only what moved, edges: those materials' current edges,
       removedMaterials, removedEdges, materialTypes?, industries?, sellers? }
                                    materialsCatalogDeltaLoaded(delta)
                                      ├─ materials slice: applyCatalogDelta
                                      ├─ graph slice:     merge + rebuild adjacency
                                      └─ types/industries/sellers: merge
```

- The shadow is **per renderer** (`event.sender.id`), so one renderer consuming
  a delta cannot starve another. It holds only cheap signatures — `updatedAt`
  per material, `type|sourceId|targetId` per edge — never content.
- `{ full }` is returned when there is no usable "since" (first tick for a
  client, or a different catalog than the shadow was built against), and is
  applied exactly like a snapshot load. `dropCatalogSubscription` clears the
  shadows so a workspace switch can't diff two unrelated catalogs.
- `delta.edges` carries **every current edge** of each changed material, not
  just the edges that moved — `suppliers`/`industry` are derived from the whole
  set, so a partial one would silently drop relations.
- `applyCatalogDelta` returns the **same state reference** when the delta is
  empty, so a no-op tick costs nothing downstream.
- `updateMaterial` no longer re-fetches the whole catalog to re-read one row; it
  asks for a delta. Because computing one advances that renderer's shadow, the
  tick the write provokes now arrives empty instead of applying the same change
  twice.
- `loadMaterialsCatalog` (full) is retained where there is genuinely no "since":
  cold open, `workspaceSelected`, `peersRefreshed`, and import-finished.

### F3 / F4 — id-scoped subscriptions

`useMaterials(ids)` now genuinely projects (it previously asked whether each
requested id was in the requested-id list — always true — and returned
everything, mutating Redux state via `delete` on the way). Two new hooks:

- `useMaterial(id)` — O(1), re-renders only when *that* material changes.
- `useMaterialsGetter()` — reads the catalog at call time **without
  subscribing**, for action closures. Also more correct there: a subscription
  hands a closure whatever the catalog held at its last render.

Consumers moved off the whole map: `VisualizationItem` → `useMaterial`;
`ProcessItem`, `processMaterialUsageButton`, `MaterialListAccordion`,
`useVariationRehydration` → the ids their graph references; `useVariation`,
`useVariationActions` → the getter. `useFilteredMaterials` still reads the whole
map, which is correct — it backs the stock table.

Selector caches (`selectMaterial`, `selectMaterialsByType`,
`selectMaterialsByIds`) are keyed per argument, because a `createSelector`
rebuilt each render memoizes nothing. The ids cache is keyed on the NUL-joined
list (ids come verbatim from the imported spreadsheet and may contain spaces)
and is dropped wholesale past 512 entries rather than leaked.

### F5 — `MaterialSelector`

The type projection is now a Redux selector cached on `type`, with the caller's
`filter` applied in a separate memo — folding `filter` into the selector rebuilt
it every render and defeated the memo. Both spread-per-item reduces became
single passes over a local accumulator. The selected material is an O(1) lookup,
still gated on type + `filter` so a `value` outside the offered set clears the
picker as before.

### F6 — dev-build amplifiers

`immutableCheck` is off (`globalThis.__klippelImmutableCheck__ = true` before
boot brings it back), and the React/Redux DevTools extensions are now opt-in via
`KLIPPEL_DEV_EXTENSIONS=1` instead of installing on every dev launch.

### F7 — search

Per-keystroke dispatch was already handled by the debounce in
`MaterialStockToolbar` (change doc `2026-05-30-98dc78`). What remained was the
work per pass: the searchable text per material is now built once per catalog
change rather than re-derived and re-joined for every material on every
keystroke, and both sides of the compare are lower-cased once.

### F8 — subscription resolve set

The live change subscription uses a new shallow `materialsCatalogChangeResolve`
— it only has to answer "did anything move?", which every mutator signals by
bumping `updatedAt` on the material CoMap itself. Holding the attribute /
composition / caracteristics sub-CoMaps open re-validated the whole deep subtree
on every change for no added signal. The deep `materialsCatalogResolve` still
backs `requireCatalog`'s load (used by both `loadMaterialsCatalog` and
`computeCatalogDelta`) and the sync preload.

---

## Verification

- `store/materials/catalogAdapter.test.ts` (new, 9 cases) covers edge-derived
  relations, attribute decoding, and delta application: full replace, empty
  delta returning the same reference, re-deriving only the named row, removals,
  and recomputing relations from the delta's edge set. All pass.
- `tsc --noEmit` clean across renderer, main, and preload.
- **Perf suite: 32/32 passing** (`npm run test:e2e:perf:headless`). Two files
  cover this work:
  - `catalogRender.e2e.test.ts` — recalibrated, plus a new `apply` sub-surface
    (`render` minus the fixture write, i.e. catalog-load IPC + Redux + grid
    render). `render` is dominated by `seed-write`, which is fixture
    construction; `apply` is the number that tracks this module.
  - `catalogDelta.e2e.test.ts` — **new**, and the direct regression guard for
    F2. Every mutation is issued straight through the main-process IPC,
    bypassing the renderer's commands, so no optimistic reducer runs and the
    grid can only change once a delta lands. Each surface is decomposed into
    the Jazz write (recorded as context, unbudgeted) and the propagation that
    follows (budgeted). The observable is a pure `data-material-count` selector
    wait: park a live search on a token no row carries, then have the mutation
    set that token as a row's `externalId`, so 0 → 1 proves the *edited row*
    reached the renderer.

Reference-machine numbers:

| Surface | 103 rows | 503 rows | 1003 rows |
|---|---|---|---|
| `apply` | 272 ms | 454 ms | 609 ms |
| `search` | 582 ms | 574 ms | 572 ms |
| `delta-edit` | 244 ms | — | 442 ms |
| `delta-add` | 283 ms | — | 457 ms |
| `delta-delete` | 240 ms | — | 413 ms |
| `delta-burst-tail` (25 writes) | 108 ms | — | 524 ms |

Reading these: propagation clears the ~150 ms floor that main's fan-out debounce
imposes, and 10× the catalog costs ~1.8× the latency rather than 10×. `search`
is now flat across tiers (F7). `delta-burst-tail` — time from the last of 25
sequential writes to the grid having converged — is the livelock guard: the
renderer keeps up *during* the burst, so the tail is about one debounce plus one
delta, where the old path never drained.

Not covered: a Composer-side assertion that a catalog tick no longer re-renders
the editor tree (F3 is verified only by construction and by the numbers above),
and the collaborative suites, which were not re-run.

---

## Still open

- **The 10k/100k tiers are still unseedable.** They no longer freeze — that was
  F1/F2 — but `seedSyntheticMaterials` caps at `LIVE_SEED_MAX`, so those tiers
  need the materialize-once + `cpSync` base from e2e-tests.md §11.2, which does
  not exist yet. The tier stays commented out in `catalogRender`, with the
  reason updated from `// FREEZES`. Building that pipeline is the prerequisite
  for calibrating anything above 1k.
- **Redux does not need the whole catalog.** The stock grid is virtualized and
  shows ~30 rows; the selectors show one type's worth. The delta path removes
  the per-edit cost but the slice still holds every material, and cold open
  still pays a full projection + clone — visible as `apply` growing 272 → 609 ms
  from 103 to 1003 rows. A windowed / lazy read path through the existing by-id
  IPC is the real fix for the 10k/100k tiers, and would let
  `materialsCatalogResolve` shrink as well.
- **How many materials does the real workspace hold?** The Jazz store is
  encrypted at rest so it couldn't be counted offline; `demo/workspaces/pessoal`
  has 8 596 CoValues / 21 MB. Confirm from the running app via
  `data-material-count` on the stock viewport — it decides whether the windowed
  read above is urgent or theoretical.
