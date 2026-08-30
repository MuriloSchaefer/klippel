---
id: 2026-08-30-ea4277
name: Catalog off the boot path
description: Boot no longer resolves the whole materials catalog — the shape is shallow, rows are loaded per answer, search text is derived lazily, and nothing reads the catalog until a surface asks for materials.
status: implemented
modules: [Materials, Store]
---

## Context

Cold open on the live `pessoal` workspace (2 110 materials, 6 340 edges, 90 MB
`jazz.sqlite`) took **24 s** from Electron start to an interactive window.

[materials-catalog-scale-analysis.md](../../../../../docs/analysis/materials-catalog-scale-analysis.md)
had already found the mechanism and left it unfixed: every materials IPC entry
point calls `requireCatalog()`, and `requireCatalog()` deep-resolved the entire
catalog — every material, its `stock`, `position`, and every key of
`attributes` / `composition` / `caracteristics`, ~19 CoValues per material —
before doing its own work. Measured here at **11.9 s per call**, against
**0.14 s** for the windowing it was in front of.

Boot paid that three times over:

1. the workspace switch dispatched `loadMaterialsWindow()` for a page nobody
   had asked to see yet;
2. the boot bootstrap called `ensureWorkspace` and then immediately
   `refreshFromPeers`, a full close and reopen of the cojson context, which
   threw away every CoValue the first open had read — so the next resolve was
   cold again;
3. the first change tick raced the window read, and both resolved separately.

Main is single-threaded, so while it resolved, every other boot IPC — session
reads, model loads — waited behind it.

## Change

**Two resolve shapes instead of one** (`main/materials.ts`):

- `catalogReadResolve` — containers plus the material nodes, what
  `requireCatalog` now loads. Carries `id`, `type`, `externalId`,
  `schemaVersion`, `updatedAt`: enough for ranking, type-scoping and delta
  change-detection.
- `materialRowResolve` — one row's subtree, applied by the new
  `loadMaterialRows(catalog, ids)` to the rows an answer actually carries.
  `loadMaterialsWindow`, `getMaterial`, `computeCatalogDelta` (affected rows
  only), `loadMaterialsCatalog` (all rows, the perf-harness path) and the two
  write paths that reach through `stock` all go through it.
- `materialsCatalogResolve` (the old deep shape) survives for the join /
  enable-sync preload, which genuinely has to pull every CoValue into the node.

**Search text is derived lazily.** `requireCatalogIndex` no longer builds
haystacks — that is the one part of the index needing the row subtree. A new
`ensureHaystacks` builds them in chunks with a yield between each, awaited only
by a search; a browse read schedules a background warm 2 s later. The cache is
keyed by row id + `updatedAt` + industry and **survives index invalidation**,
so a write re-derives one row rather than the catalog.

**Concurrent resolves share one load** — `requireCatalog` holds the in-flight
promise, so the boot pile-up costs one resolve and one subscription attach.

**Nothing loads the catalog at boot.** `workspaceSelected` now dispatches a new
`materialsCatalogReset` event — materials, window, industries and sellers empty
themselves locally — instead of fetching a page. The first fetch happens when
`MaterialStockViewport` mounts (it already owned the "what should this view
show" effect; it now dispatches `loadMaterialsWindow` for an empty query and
`searchMaterialsCatalog` otherwise). `peersRefreshed` refreshes only a window
that exists, and `loadMaterialsWindow` drops a request when a first page is
already in flight. A model that references materials still resolves them by id,
which is what "load it when a material is actually requested" means for
Composer.

**Boot stops reopening the Jazz node** (`Store/kernelcalls.ts`): the boot
`refreshFromPeers` now fires only when the workspace actually syncs
(`syncStatus().syncUrl`, which also covers the env-provided URL). For a
local-only workspace there are no peer deltas to pull, and the close/reopen was
purely a second cold read of everything.

## Status notes

Implemented and measured. Not addressed (and still the ceiling): the ~19
CoValues per material — §3 and Fix 4 of the scale analysis. The remaining 2.6 s
is the `materials` and `edges` record CoValues themselves, and no resolve shape
gets under it; that needs the schema change.

Import throughput is unchanged in shape (a per-row `requireCatalog`), though
each call is now much cheaper — Fix 3 of the analysis is still open.

## Security

None. No new IPC surface, no change to what a renderer may request, no change
to authorization or to what crosses the process boundary — the same DTOs, for
fewer rows.

## Performance

The point of the change. Same workspace (2 110 materials), built app, cold,
time from Electron start to an interactive window with the stock grid painted:

| | Before | After |
| --- | --- | --- |
| Boot to interactive | 24.2 s | **3.7 s** |
| Whole-catalog resolves at boot | 3 | 0 |
| Catalog resolves at boot | 3 × ~11.9 s | 1 × 2.6 s |
| First window read | 12.0 s (11.9 resolve + 0.14 window) | 3.3 s (2.8 + 0.55) |
| Subsequent reads | ~12 s cold / 0.15 s warm | 0.15 s |

Deferred, not removed: the haystack warm derives every row's searchable text
(8.8 s at this size) in chunks after boot, off the critical path. A search
issued before it finishes awaits it. Both are new costs *in the background*
where there used to be one big cost in the foreground.

The catalog is only read at all when a materials surface mounts; a boot into a
model tab reads none of it.
