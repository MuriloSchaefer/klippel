# The catalog mirror — windowing and residency

How the renderer holds material data, and why it holds so little of it.

This is the contract every Materials consumer depends on, and the one that
breaks quietly: nothing crashes when the mirror grows without bound, the app
just gets slower and heavier until someone profiles it. Read this before
adding a read path, a pin, or anything that puts materials into Redux.

Related: [overview.md](./overview.md) (module layout),
[graph-semantics.md](./graph-semantics.md) (how the catalog is stored),
[../jazz.md](../jazz.md) (sync and write paths),
[../../../../docs/analysis/materials-catalog-lag-analysis.md](../../../../docs/analysis/materials-catalog-lag-analysis.md)
(the measurements that produced all of this).

---

## 1. The invariant

> **Redux holds what the UI is showing, plus what open tabs reference, plus a
> short tail of what was recently read. Never the catalog.**

The catalog lives in the workspace's Jazz store and is read through the main
process. The renderer keeps a *mirror* of a slice of it. Everything below is
machinery for keeping that sentence true while the UI behaves as if the whole
catalog were at hand.

Three numbers make the invariant concrete, and they are genuinely different —
confusing them is the most common bug in this area:

| Number | Where | Means |
| --- | --- | --- |
| `window.total` | `store/window` | materials in the catalog |
| `window.matched` | `store/window` | materials matching the current query (`= total` when browsing) |
| `window.resultIds.length` | `store/window` | ids of the **current view**, in server rank order — positions, not rows |
| `Object.keys(materials).length` | `store/materials` | rows the **mirror** holds — a superset of the view |

The grid renders `resultIds`; the mirror additionally holds pinned rows, rows
resolved by id, and a type's rows pulled in by a picker.

**The view is not a residency claim.** `resultIds` grows with every page the
user scrolls through, so protecting all of it would mean a long browse ends up
protecting the whole catalog — a live app was found holding 437 of 437 rows
with nothing evictable, which is how this rule was found. Only what is
*rendered* is protected. Ids in the view whose data has been reclaimed come
back from `selectWindowedMaterials` as **placeholder rows**: same position,
same height, `placeholder: true`, no data. The grid renders them blank and
without row actions, and asks the viewport to resolve the ones that are
actually on screen. Dropping them from the array instead would shorten the
list under the scrollbar and shuffle every row below it.

---

## 2. Getting rows in

Four commands, four different reasons. Adding a fifth means answering "which
of these is it like?" first.

| Command | Who dispatches it | Effect on the view |
| --- | --- | --- |
| `loadMaterialsWindow` | cold open, workspace switch, peer refresh | **replaces** it (`reset`) |
| `loadMoreMaterials` | the grid reaching the end of its rows | **extends** it by one page |
| `searchMaterialsCatalog` | the stock toolbar (debounced) | **re-aims** it at a query |
| `ensureMaterialsLoaded` | an open model, `useMaterial`/`useMaterials` | **none** — resolves rows beside the view |
| `loadMaterialsOfType` | the material pickers | **none** — resolves a type's rows |

Two rules follow, and both have been violated before:

- **Search runs in main, never in the renderer.** A renderer-side filter can
  only search the rows that happen to be resident, which are the rows the user
  can already see. Main scores every material against a cached haystack index
  (`main/materials.ts`, `requireCatalogIndex`); the scorer itself is shared
  (`shared/materialSearch.ts`) so both sides agree on what "matches" means.
- **A page is authoritative about materials, not about absence.** Types,
  industries and sellers ride along whole with every answer because they are
  bounded by how many exist — but they **merge**; only a `reset` read replaces
  them. A page that came back without organizations used to empty those
  slices, blanking every industry / supplier label in the UI.
- **A delta never adds a row.** `applyCatalogDelta` re-derives only rows the
  mirror already holds. Main scopes a delta to what it believes the client
  mirrors, and eviction makes that a superset — admitting the rows would undo
  the sweep one tick later. Membership is decided by the commands above and by
  the sweep, full stop.
- **A snapshot on a tick is a refresh, not a replacement.** Main answers
  `{ full }` when it has no usable "since"; the renderer re-derives its
  resident rows from it and drops what it no longer carries, but does not
  become it. Main, for its part, only sends one to a client that actually
  asked for everything (`fullCatalogClients`) — "has no recorded window" means
  *windowed, mirroring nothing yet*, which is the state every renderer is in
  between a workspace switch and its first window read. Both halves are
  needed: with either missing, one write during a workspace switch put the
  whole catalog back in Redux.

---

## 3. Getting rows out — residency

`store/residency` is the authority on what may be dropped — a slice like any
other: `state.ts` (ref counts, last-read times, the two knobs), `actions.ts`,
`slice.ts`, `selectors.ts`, `middlewares.ts`. A material stays resident if
**any** of these holds:

1. it is **retained** — a mounted component is rendering it
   (`retainMaterials` / `releaseMaterials`, paired in one effect). The stock
   grid retains its *rendered range* plus a page of lead either side, and
   releases the rest as the user scrolls: that is what "on screen" means here;
2. it is **pinned** by an owner (`window.pins[owner]`) — an open model
   references it;
3. it was read within the **TTL** (default 5 min) — the grace that makes a tab
   switch, or a scroll back up, hit a resident row instead of a refetch.

Anything else is swept — on a timer (default every 1 min) and after every
window read, so a long browse sheds pages as it goes instead of at the end.

Both knobs live in the slice and are retunable at runtime —
`useMaterialResidency().functions.configure({ ttlMs, sweepIntervalMs })`, or
the `configureMaterialsResidency` command. The reducer clamps both to
`MIN_RESIDENCY_MS`. The sweep *timer* is module state in the middleware: a
timer handle is not state, cannot be serialized, and must not survive a
reducer reload.

### Writing it without paying for it

Reads happen per row per render, and every write here is a dispatch — a store
notification, and a selector pass in every subscriber. Three things keep that
off the hot path, and all three matter:

- **Hooks, not raw dispatches.** `useRetainedMaterials(ids)` pairs retain and
  release in one effect keyed on the id list's *value*; `useVisibleMaterials()`
  returns a `report(ids)` that is **debounced until the scroll settles**
  (`SCROLL_SETTLE_MS`) and then diffed, so a fling writes the store once, when
  it stops, and a range that did not really change writes nothing. Nothing
  outside this module should import the slice's actions directly.
- **Reducers return the same state when nothing moved**, so a redundant touch
  costs no re-render anywhere.
- **Nobody subscribes to it.** It is read by the sweep middleware through
  `getState`, never by a component. If you find yourself selecting residency
  state in a component, something has gone wrong.

`selectEvictableIds(state, at)` is a plain function, not a memoized selector:
it is called once per sweep with a `now` that always differs, so a memo would
only ever miss.

### Pins have owners

`materialsPinned({ ids, owner })` files ids under an owner, and
`unpinMaterials({ owner })` releases exactly that owner's claim.
`window.pinnedIds` is the flattened union, which is what every window request
sends to main (main re-pins on each read, so a `reset` cannot evict a pinned
row).

Composer owns its pins by `variationId` and releases them when the editor
unmounts. A tab switch unmounts a viewport (see the repo `CLAUDE.md`), so
switching away hands a model's materials to the TTL rather than dropping
them — coming back within the grace period finds them resident, later they are
re-resolved by id.

**An ownerless `ensureMaterialsLoaded` does not pin.** It cannot: nothing
would ever release it, which is precisely how the mirror used to grow to the
whole catalog over a session.

---

## 4. Reading, from a component

| Hook | Use for | Resolves? | Retains? |
| --- | --- | --- | --- |
| `useMaterial(id)` | one row (row-level UI) | yes | yes |
| `useMaterials(ids)` | a known set (a model's references) | yes | yes |
| `useMaterials()` | *avoid* — the whole map | no | no |
| `useMaterialsGetter()` | imperative reads in handlers | no | no |
| `useRetainedMaterials(ids)` | keep a known list resident while mounted | no | yes |
| `useVisibleMaterials()` | a set that changes per scroll frame (coalesced) | no | yes |
| `useMaterialResidency()` | retain / release / touch / sweep / configure | no | n/a |
| `useCatalogWindow()` | the stock grid's page + counts | via the grid | the grid retains its rendered range |

"Resolves" means: if the mirror does not hold it, the hook asks for it and
re-renders when it lands. `undefined` is therefore an ordinary transient
state — and a permanent one for an id no catalog row answers to, which is why
every caller must handle it. The middleware de-duplicates concurrent and
already-answered ids, so a grid of rows all missing the same material costs
one IPC and a dangling reference is asked for exactly once.

`useMaterials()` with no arguments subscribes to the entire map and re-renders
on every catalog tick. It survives for the picker-filter path only; do not add
callers.

---

## 5. Keeping the grid smooth

The stock grid is the surface where a mistake here is visible as a stutter.
Two rules, both learned the hard way:

- **Nothing that changes per page request may be a prop of `TableView`.**
  DataGrid bundles its props into the context every cell reads, so one changed
  prop re-renders every header and cell — while the user is scrolling through
  them. `hasMore` / `loading` are *pulled* through a stable `getPaging()`
  callback at scroll time instead. Selection goes through `apiRef` for the
  same reason.
- **Per-instance state is keyed on the instance.** A viewport tab is an
  independent component instance; the grid's selection, the details pick and
  the scroll position are either in the viewport's `extra` (so they survive a
  tab switch) or in refs (so they never re-render anything).

The details panel is part of this contract too: it renders only when a row is
picked, and the picked id lives in the viewport `extra` — see
`components/viewports/MaterialStockViewport/`.

---

## 6. The relation graph lives in the Graph module

Materials, their type versions, and the organizations that make and sell them
form a graph — so it is stored as one, in the module built for graphs, under
`CATALOG_GRAPH_ID` (`materials-catalog`). **The Materials slice has no `graph`
key**, deliberately: two places to keep a graph is one too many, and the local
copy was an edge bag with its own adjacency format that nothing could search.

- `store/graph/catalogGraph.ts` — pure translation: catalog payload in,
  `GraphState` out. Materials become `MATERIAL` nodes, edge targets become
  `MATERIAL_TYPE` / `INDUSTRY` / `SELLER` nodes (an endpoint with no DTO in
  the payload still becomes a node, typed by the edge that reached it, so no
  edge dangles).
- `store/graph/middlewares.ts` — publishes it with the Graph module's own
  `loadGraph` command, once per catalog answer. One dispatch per answer rather
  than `addEdge` per edge: a page carries ~3 edges per row.
- **It mirrors the mirror.** A material reclaimed by the residency sweep, or
  deleted, takes its relations with it (`pruneCatalogGraph`). Types and orgs
  stay — they are bounded and shared, and the next page would only re-create
  them. Without this the graph would be the one structure that still grew with
  everything the user ever scrolled past.

Read it like any other graph: `useGraph(CATALOG_GRAPH_ID)` or
`getGraphState(CATALOG_GRAPH_ID)`. The id is re-exported as
`MaterialsModule.constants.CATALOG_GRAPH_ID`.

Known cost: the Graph module persists every graph on a session save and
rehydrates them at boot, so this one is written to `.session/Graph/graphs/`
too. It is bounded by the mirror, and `workspaceSelected` resets it before any
stale copy can be read — but a graph derived from Jazz does not really want
persisting, and an "ephemeral graph" flag in the Graph module would be the
clean fix.

## 7. Main-process side

- `requireCatalogIndex` builds, per catalog version, the haystack per material,
  the rank order (usage desc, id asc — a total order, so paging neither skips
  nor repeats), and `edgesBySource`. Invalidated by any catalog change.
- `loadMaterialsWindow` answers one page: it never walks the whole catalog per
  request. Edges for the answer come out of `edgesBySource`; a page costs
  O(rows in the answer).
- `trackClientWindow` / the delta shadow record what each renderer holds, which
  is what scopes its deltas. **Known gap:** eviction is not reported back, so
  main's idea of the client's window is a superset. Costs payload on a tick,
  not correctness — the renderer drops what it does not hold.
- `appendCatalogChunk` exists for perf fixtures only (batched seeding, §11.2)
  and is not part of any product path.

---

## 8. Invariants to preserve

Anything in this area is a regression if it breaks one of these:

1. No code path puts the whole catalog into Redux. `materialsCatalogLoaded`
   still exists for the whole-catalog load; it is the perf-harness / explicit
   refresh path and must not be wired to a user action.
2. A delta does not change mirror membership.
3. Every pin has an owner that eventually releases it.
4. Every retain has exactly one paired release — which is why callers use the
   hooks rather than dispatching retain/release themselves.
5. Search and rank are answered by main, from the index, not by the renderer.
6. Nothing that flips per page request is a prop of the grid.
7. The catalog's graph lives in the Graph module and mirrors the mirror. No
   `graph` key in the Materials slice.
8. The view (`resultIds`) is a list of positions, not a residency claim. Rows
   may be reclaimed while their id is still in it; they render as placeholders
   and resolve when scrolled to.
9. A page never deletes types, industries or sellers — only a `reset` read
   replaces them.
10. The counts (`total`, `matched`, resident) keep their distinct
   meanings — including in the `data-*` mirrors the e2e suite waits on
   (`data-material-count` = matched, `data-material-view` = positions in the
   view incl. placeholders, `data-material-loaded` = those whose data is
   resident, `data-material-total` = catalog size).

## 9. How this is tested

- Unit: `store/residency/residency.test.ts` (reducer bookkeeping + eviction
  rules: ref counting, TTL, config clamping), `store/materials/catalogAdapter.test.ts` (a delta must not
  admit a non-resident row), `store/window/selectors.test.ts` (placeholders),
  `store/graph/catalogGraph.test.ts` (graph merge / reset / prune).
- Perf: `tests/standalone/performance/catalogWindowing.e2e.test.ts` — paging,
  search and the resident-row bound at thousands of materials;
  `catalogRender.e2e.test.ts` — cold open at ≤ 1k; `catalogDelta.e2e.test.ts` —
  propagation latency. Budgets and their tiers follow
  [e2e-tests.md §11](../../../../docs/quality/e2e-tests.md).
