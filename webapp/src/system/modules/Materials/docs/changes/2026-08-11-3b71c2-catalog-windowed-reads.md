---
id: 2026-08-11-3b71c2
name: Windowed catalog reads
description: The renderer mirrors a page of the materials catalog — open models' materials plus the 100 most-used — and extends it on search and scroll, instead of holding every material in Redux.
status: implemented
modules: [Materials, Composer, Store]
---

## Context

The delta work (`2026-08-10-f9e8d1`) made catalog *edits* cheap but left the
last item on its own list open:

> **Redux does not need the whole catalog.** The stock grid is virtualized and
> shows ~30 rows; the selectors show one type's worth. The delta path removes
> the per-edit cost but the slice still holds every material, and cold open
> still pays a full projection + clone — visible as `apply` growing 272 → 609 ms
> from 103 to 1003 rows.

Everything downstream of that inherited the same assumption. `useMaterials()`
returning the whole map was correct-by-accident because the map *was* the
catalog; the search hook could filter locally because every candidate was
resident; the pickers could list a type because every member was there. None of
those are true once the mirror is a page, so this change is not only a load-path
change — it is a change to what the renderer is allowed to assume.

## Change

The renderer mirrors a **window**: the materials open models reference, plus a
ranked page of the rest, extended as the user searches or scrolls.

```
main                                                renderer
────                                                ────────
                      loadMaterialsWindow  ◄───────  cold open / workspace switch
  requireCatalogIndex()                              (reset: true)
  ├─ haystack per material (cached, invalidated
  │   by any catalog change)
  ├─ usage counts ← Composer's provider
  └─ ranked = usage desc, then id asc
                                              ──────►  materialsWindowLoaded
                                                       ├─ materials: merge page
                                                       ├─ graph:     merge edges
                                                       ├─ types/orgs: whole
                                                       └─ window:    counts + cursor
  trackClientWindow(clientId, ids)
        │
        └─ scopes every later delta to what this client actually holds
```

### Ranking

The first page is the most-used materials, because that is the page most
likely to be the one wanted. Usage is *not* derivable from the catalog — a
material's edges say what it conforms to and who supplies it, never who
consumes it — so `Materials/main/usage.ts` is a provider registry and
Composer registers against it (`Composer/main/materialUsage.ts`), counting the
models whose `graphJson` carries a `MATERIAL` node for each id. Counts are per
*model*, not per node: breadth of use is what should decide a first page.

The order is total — usage descending, then **id ascending** — and that matters
more than the ranking itself. A page whose contents depend on Map iteration
order would make "load more" both skip and repeat rows. The tiebreak is `id`
rather than `updatedAt` because an xlsx import stamps thousands of rows with
the same millisecond.

Usage counts are cached and invalidated on a model-graph write and on workspace
close, so walking every model's graph happens once per change, never per page.

### Search

Search moved to the main process. It had to: a query has to be answered against
every material and the renderer only holds a page, so a local filter would
return a plausible, incomplete answer — the worst failure mode available. The
scorer and the searchable-text shape now live in `shared/materialSearch.ts`,
imported by both sides, because the two disagreeing about what matches would be
just as silent.

`useFilteredMaterials` survives for the case where the resident set genuinely
*is* the candidate set (filtering materials a model already references).

### Deltas are scoped per client

`computeCatalogDelta` now filters to the ids the client mirrors
(`clientWindows`). Sending a windowed renderer a row it never loaded would grow
its slice back toward the full catalog — precisely what this change prevents —
and a removal for a row it never held is noise. A windowed client is never sent
`{ full }`.

Two counts ride along instead: `total` (catalog size), because a client holding
a page cannot derive it, and — for the browse view only — `matched` follows it,
since with no query every material matches. Under an active query `matched`
cannot be maintained per tick without scoring the whole catalog, so the
middleware re-issues the search instead. That costs one search pass per debounce
window *while the search box is non-empty*, and it is what keeps a live query's
result set correct under a concurrent peer edit — the property
`catalogDelta.e2e.test.ts` asserts.

Rows added or removed **outside** the window are equally invisible in a scoped
delta, so a change in `total` triggers `refreshMaterialsView`: a re-read of the
span the user has already paged to. That is what makes an import or a peer's new
material appear without a workspace switch, at a cost bounded by scroll depth
rather than by catalog size.

### Pinning

A material an open model references must stay resident regardless of rank or
query, or a node the user is looking at renders with nothing behind it.
`ensureMaterialsLoaded(ids)` is dispatched from Composer's `openModel`
middleware and from `useVariationRehydration` (the `.session/` restore path,
which never goes through `openModel`). Pins are re-sent with every window
request and survive a `reset`.

### Pickers

`MaterialSelector` offers "every material of type X" and resolves its value by
id — both questions about the catalog, not about the page. It now asks for its
type on mount (`loadMaterialsOfType`), which main answers from the same ranked
order filtered to that type. De-duplicated per type in the middleware, because
a model with twenty nodes of one type mounts twenty pickers at once.

### UI

The stock viewport gained an explicit `Carregar mais` control alongside the
scroll trigger — scrolling is the discoverable gesture but not a reachable one
for a keyboard or screen-reader user — and the summary bar now states
`loaded / matched`, so a partial total cannot be read as a catalog-wide one.

Count mirrors (e2e-tests.md §11.4):

| Attribute | Meaning |
| --- | --- |
| `data-material-count` | rows matching the current view, catalog-wide. Unchanged meaning: empty query ⇒ catalog size. |
| `data-material-loaded` | rows resident and rendered. Caps at the window size. |
| `data-material-total` | catalog size regardless of query. |
| `data-material-has-more` / `data-material-loading` | paging state. |

`data-material-count` deliberately keeps its old semantics so the existing waits
in `catalogRender`, `catalogDelta`, `catalogInterference` and `searchMaterials`
still mean what they were written to mean.

## Security

None. No new data crosses a trust boundary; the window IPC returns a subset of
what `jazz-materials-load` already returned to the same renderer. The per-client
window set is keyed on `webContents.id`, the same key the delta shadows already
use, and is dropped on reload and workspace switch.

## Performance

The point of the change, but **not yet re-measured end to end** — see below.

By construction:

- Cold open projects and clones a page (100 rows) plus pins, not the catalog.
  The `apply` surface's growth with catalog size was the symptom this removes.
- The search / rank index is ~40 bytes per material (id, type, one lower-cased
  string) and is built on a *user action*, not on a sync tick.
- A tick still reads one signature per catalog entry to find what moved — an
  O(catalog) term that predates this change — but now projects only rows the
  client holds.

Costs added, all bounded and deliberate:

- one search pass per debounce window while a query is active;
- one page re-read when the catalog size changes;
- one whole-type read per distinct type a picker mounts for;
- walking every model's `graphJson` once per model-graph write, to re-rank.

## Verification

- `store/materials/catalogAdapter.test.ts` — 6 new cases for
  `applyCatalogWindow` (merge, reset, empty reset, same-reference no-op,
  relations from the page's edge set, pinned rows outside the page). 15/15 pass.
- `tests/standalone/integrity/catalogPagination.e2e.test.ts` — **new**. Pins
  the four invariants: the mirror is a proper subset; paging is a partition
  (every material exactly once, no gaps, no repeats); search reaches rows
  outside the window; a pin survives a reset. Built on the total order's
  guarantee that the generator's `__probe_*` rows sort last, so "outside the
  first page" is a property rather than a fixture coincidence.
- `tsc --noEmit` clean across renderer, main and preload.

Not done, and needed before this is called finished:

- **The perf suite has not been re-run or re-calibrated.** `catalogRender`'s
  `apply` budget measured getting *every* row on screen, which the grid no
  longer does; that budget is now measuring a different thing and needs a fresh
  reference run. `seedSyntheticMaterials`' `totalMs` has been redefined in the
  same way and its docstring says so.
- **No assertion that the first page is the most-used one.** The ranking is
  covered by construction and by the partition test's determinism, but nothing
  yet drives Composer to create usage and asserts the resulting page order —
  that needs a model built through the editor, which is a Composer test.
- The collaborative suites were not re-run. `catalogInterference` waits on
  `data-material-count`, whose meaning is preserved, but two windowed peers
  diffing against per-client windows is a path no test currently exercises.
