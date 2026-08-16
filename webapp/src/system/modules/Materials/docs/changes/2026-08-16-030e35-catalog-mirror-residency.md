---
id: 2026-08-16-030e35
name: Catalog mirror residency + grid smoothness
description: The materials mirror now gives rows back — TTL eviction, owner-scoped pins, lazy resolve on read — and the stock grid stops re-rendering on paging state.
status: implemented
modules: [Materials, Composer]
---

## Context

[Windowed reads](2026-08-11-3b71c2-catalog-windowed-reads.md) stopped the renderer
mirroring the whole catalog at once, but nothing ever shrank the mirror. Every
path only added to it:

- a scroll merges a page and keeps it forever;
- a search replaces the *view* (`window.resultIds`) while the previous view's
  rows stay in `materials`;
- a picker pulls a whole type (up to 1 000 rows);
- a graph node resolves one row by id;
- `ensureMaterialsLoaded` pinned rows with no owner, so nothing could ever
  release them — an open-then-closed model kept its materials for the session.

Browse a large catalog for a few minutes and the slice converges on holding all
of it, which is the outcome windowing exists to prevent.

Two consequences the user reported directly: memory that only grows, and a
stock grid that stutters while pages stream in during a scroll or a search.

## Change

**Residency (`store/residency`, new slice).** State, actions, selectors and
middleware of its own: a ref count per id, a last-read timestamp per id, and
`{ ttlMs, sweepIntervalMs }` (5 min / 1 min, clamped, retunable at runtime).
`selectEvictableIds` answers what may go; the middleware owns the sweep and its
timer.

It is written from render and scroll paths, so the cost of being store state
is managed rather than ignored: consumers go through **hooks**
(`useRetainedMaterials`, `useVisibleMaterials`, `useMaterialResidency`) which
pair retain/release, debounce until the scroll settles, and diff before
dispatching; the reducers return the same state when nothing moved; and nothing subscribes to
the slice — only the sweep reads it, through `getState`. Timestamps are taken
in the action creators, never in a reducer.

A material is kept when a mounted consumer is rendering it, a tab pins it, or
it was read within the TTL. Everything else is reclaimed.

**Eviction.** `sweepMaterialsResidency` (command) → `materialsEvicted` (event),
which the materials slice applies by dropping exactly those ids and keeping
every survivor's identity. The sweep runs on a timer started at
`workspaceSelected`, and additionally after each window read — so a long browse
sheds the pages it scrolled past without waiting a full interval. Arrival
counts as an access, or a freshly loaded row would be evictable in the instant
between the reducer and its consumer's retain.

**Owner-scoped pins.** `materialsPinned` takes an `owner`; the window slice
stores `pins: { [owner]: ids }` and derives `pinnedIds` from it.
`unpinMaterials({ owner })` releases one owner's claim — the rows stay resident
but unprotected, so the TTL decides. `ensureMaterialsLoaded` only pins when an
owner is named; an ownerless read is protected by retention and the TTL alone.

**Lazy resolve on read.** `useMaterial(id)` and `useMaterials(ids)` now dispatch
`ensureMaterialsLoaded` for what the mirror does not hold, and retain what they
render. Eviction is therefore invisible to callers apart from a frame of
`undefined`. The middleware de-duplicates in-flight and already-answered ids
(`resolvingIds`), so a grid of rows missing the same material costs one IPC and
an id no catalog row answers to is asked for exactly once.

**Deltas no longer re-admit evicted rows.** `applyCatalogDelta` skips rows the
mirror does not hold. Main scopes deltas to what it believes the client
mirrors, and eviction makes that a superset; without this the sweep would be
undone one tick later. Membership is decided by window reads and the sweep,
never by a tick.

**Grid smoothness.** `hasMore` / `loading` no longer reach `TableView` as
props — it pulls them through a stable `getPaging()` at scroll time. They flip
twice per page request, and DataGrid bundles its props into the context every
cell reads, so each flip re-rendered every header and cell *while the user was
scrolling through them*. `TableView` is memoized, the virtual-scroller element
is cached instead of `querySelector`-ed per scroll frame, and the `useMemo`
that builds the grid element no longer depends on paging state.

**Main process.** The window read built its `edges` answer by walking the whole
edge record per request (~30 000 edges per 100-row page at a 10k catalog). The
catalog index now carries `edgesBySource`, built in the pass it already made
over edges, so a page costs O(rows in the answer).

**Composer.** Both pin sites (`useVariationRehydration`, the `openModel`
effect in `store/variations/middlewares.ts`) pass `owner: variationId`, and the
rehydration effect releases on unmount. Leaving a model tab therefore hands its
materials to the TTL: returning within the grace period finds them resident,
later they are re-resolved by id.

**The view was protecting everything, so nothing was ever evictable.** The
first version of the sweep protected all of `window.resultIds` — but that list
grows with every page the user scrolls through, so a browse session ended up
protecting the entire catalog (a live app was found holding 437 of 437 rows,
with zero evictable). Protection is now what is *rendered*: `TableView`
subscribes to `renderedRowsIntervalChange` and retains its rendered range plus
a page of lead either side, releasing the rest as the user scrolls.

That only works if a reclaimed row can leave the mirror without the list
moving, so `selectWindowedMaterials` now emits a **placeholder row** for a view
id it has no data for — same position, same height, `placeholder: true`, no
data. The grid renders it blank and without row actions; the viewport resolves
the placeholders that are actually on screen (`onVisibleHoles` →
`ensureMaterialsLoaded`). Dropping them from the array instead — the previous
behaviour — would shorten the list under the scrollbar and shuffle every row
below it, which is the glitch this work is meant to remove.

Consequently the count mirrors split: `data-material-view` counts positions in
the view (what a page grows by), `data-material-loaded` keeps its meaning of
rows whose data is resident. `catalogPagination` and the seed helper now wait
on the former.

**The "load more" label says what a click does.** It read `Carregar mais (337
restantes)`, which parses as "this loads 337"; a click fetches exactly one
page, so it looked broken. It now reads `Carregar mais 100 de 337`. Paging
itself is unchanged — one page per click, plus the pre-existing scroll trigger.

Context for anyone tempted to make this an infinite scroller: `@mui/x-data-grid`
(MIT) forces `pagination` on — it is in `DataGridForcedPropsKey` — and
**throws** on a `pageSize` above 100. The list can therefore never scroll past
one page; extra rows appear as extra *pages*. That is also why loading 100 more
rows can look like nothing happened. Genuine infinite scrolling needs
`DataGridPro` (`onRowsScrollEnd`, licensed) or a virtualized list in place of
the grid body. An auto-fetch on `paginationModelChange` was tried and removed —
it papered over the paging model rather than changing it.

**A tick could hand a windowed client the whole catalog.** Found by probing
the live app during the first perf run: the view held 100 rows and the mirror
held all 1 003. `computeCatalogDelta` treats "no recorded window" as "this
client holds everything" and answers with a full snapshot — and a workspace
switch drops every recorded window (`dropCatalogShadows`), so any write
landing before the renderer's first window read fell into that gap. The
renderer then applied the snapshot wholesale, undoing windowing entirely.
Fixed on both sides:

- main tracks `fullCatalogClients` explicitly — only a client that called
  `load()` may be answered with a snapshot; an unknown client is *windowed,
  mirroring nothing yet*;
- `applyCatalogDelta` treats a `{ full }` payload as a **refresh of the
  mirror**, not a replacement: resident rows are re-derived from it, rows it
  no longer carries are dropped, rows the mirror never held are not admitted.
  The explicit whole-catalog load keeps its own action
  (`materialsCatalogLoaded`), which still replaces.

**A page is not authoritative about organizations.** The `industries` and
`sellers` slices *replaced* their whole contents on every `materialsWindowLoaded`
— so any window answer that came back without organizations emptied them, and
every material lost its industry / supplier label until a good load landed.
They now merge, and replace only on a `reset` read (where entries from the
previous workspace genuinely must not survive). Absence in a page means "not
sent", never "deleted" — the same rule the `materialTypes` slice already
followed. Found by the user against the running app during this work; covered
by `store/orgSlices.test.ts`.

**The catalog's relation graph moved to the Graph module.** `Materials.graph`
was a second, private graph implementation — an edge map plus a `sourceId →
edgeIds` adjacency of its own shape, which nothing read and no graph algorithm
could traverse. The slice key is gone. The catalog is now a graph instance
(`CATALOG_GRAPH_ID = "materials-catalog"`) maintained through the Graph
module's own `loadGraph` command:

- `store/graph/catalogGraph.ts` — pure payload → `GraphState` translation.
  Materials become `MATERIAL` nodes; edge targets become `MATERIAL_TYPE` /
  `INDUSTRY` / `SELLER` nodes, including endpoints whose DTO the payload did
  not carry (typed by the edge that reached them), so no edge dangles.
- `store/graph/middlewares.ts` — one `loadGraph` per catalog answer (a page
  carries ~3 edges per row; `addEdge` per edge would be 300 dispatches for one
  answer), plus a reset on `workspaceSelected`.
- The graph **mirrors the mirror**: `pruneCatalogGraph` drops a material's
  vertex and its edges when the residency sweep reclaims it, or when it is
  deleted. Types and organizations stay — bounded, shared, and re-sent with
  every page. Without this the graph would have been the one structure still
  growing with everything the user scrolled past.

Known cost, not addressed here: the Graph module persists every graph on a
session save and rehydrates them at boot, so this derived graph is written to
`.session/Graph/graphs/` too. Bounded by the mirror, and `workspaceSelected`
resets it before a stale copy can be read; an "ephemeral graph" flag in the
Graph module would be the clean fix.

**Documentation.** The contract this all implements is now written down:
[docs/architecture/catalog-mirror.md](../architecture/catalog-mirror.md) — the
invariant, the four read commands, the four protections, the grid rules, and a
list of invariants a future change must not break. A
[`materials-catalog-mirror` skill](../../../../../../.claude/skills/materials-catalog-mirror/SKILL.md)
points at it with the decision trees for "I need material data here" and "I
need rows to stay resident".

## Performance testing

The user-visible claim — *scroll and search stay smooth with thousands of
materials in the workspace* — is asserted by a new perf suite rather than left
to judgement.

**New:** `tests/standalone/performance/catalogWindowing.e2e.test.ts`, budgeted
per e2e-tests.md §11, one record per surface into `.tests-executions/`:

| Surface | Metric | What a regression there means |
| --- | --- | --- |
| `window-open` | ms | opening a big catalog costs more than opening a small one — the window stopped being a window |
| `search` | ms | the query stopped being answered from main's cached index |
| `page-in` (p50/p95) | ms | a scroll that outruns the resident rows stalls instead of streaming |
| `scroll-sweep` | ms | the grid is re-rendering on something it should not (the classic: a paging prop) |
| `mirror-bound` | **rows** | the mirror stopped giving rows back — the memory regression, caught as a count, not a feeling |

`mirror-bound` is the one that could not exist before this change: browse
deep, then search, then assert that what Redux still holds is bounded and does
**not** scale with the catalog. It shortens the TTL through
`configureMaterialsResidency` — the rule under test is TTL-independent, only
the waiting is not.

**Seeding.** Tiers past the single-call IPC (1k) use a new batched path:
`appendCatalogChunk` in main + `materials.seedChunk` in preload +
`seedSyntheticMaterialsChunked` in the helpers — §11.2's "10k → batched seed
(chunked)". It is fixture construction only; no product path calls it. It also
makes the seed itself a realistic load: chunks land while the viewport is open,
so every tier exercises delta ticks during a bulk import — which is exactly the
"thousands of materials are added to the workspace" case.

Tiers: 1k runs by default; 5k and 10k need `KLIPPEL_PERF_HEAVY=1`, because
their seed dominates the run until the materialize-once + `cpSync` base of
§11.2 exists.

## Status notes

Implemented. Verified by `tsc --noEmit` (renderer + main + preload) and 29 unit
tests in `store/materials/residency.test.ts` (new: eviction rules, ref
counting, TTL, owner pins) and `catalogAdapter.test.ts` (extended: a delta must
not admit a non-resident row).

**The perf budgets in `catalogWindowing` are not calibrated yet.** They are
first-guess numbers, and §11.1 says not to ship a threshold nobody has
measured. The reference run needs an app restart (the new `seedChunk` IPC lives
in main + preload, which a running dev instance does not pick up); the first
attempt failed for exactly that reason. Until that run happens, treat the
suite as structurally complete and numerically provisional, and re-baseline
from its first `.tests-executions/perf-results.jsonl` records.

`catalogRender`'s older budgets separately describe the pre-windowing surface
(see the "Still open" section of
`docs/analysis/materials-catalog-lag-analysis.md`) and need the same treatment.

Follow-ups deliberately left out of scope:

- Main still tracks evicted ids as part of the client's window, so a tick can
  carry DTOs the renderer will discard. Costs payload, not correctness; an
  untrack IPC would close it.
- `window.resultIds` is protected in full, so a very deep scroll still holds
  every row it passed. Trimming the view to the last N pages is a UX decision
  (scrolling back would refetch), not a mechanical one.

## Security

None. No new IPC surface, no change to what the renderer may request — the
window read already accepted arbitrary id lists — and no change to persistence
or permissions. Eviction only removes data from renderer memory.

## Performance

The point of the change.

- **Memory**: the mirror is now bounded by the current view plus what open tabs
  and mounted components reference, plus one TTL of history, instead of the
  union of everything ever loaded.
- **Scroll**: a page landing mid-scroll no longer re-renders the grid's cells;
  the scroll handler does no DOM query per frame.
- **Main**: per-page edge collection drops from O(all edges) to O(page).
- **Cost added**: one sweep per window read plus one per minute, each O(rows
  resident); a re-resolve IPC for anything read after its TTV expired.

Benchmarks: none run. `catalogRender` / `catalogDelta` budgets need
recalibrating against the windowed surface before they can measure this.
