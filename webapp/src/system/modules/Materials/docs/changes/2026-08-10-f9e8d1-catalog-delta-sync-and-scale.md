---
id: 2026-08-10-f9e8d1
name: Catalog delta sync and scale fixes
description: Replace the quadratic catalog adapter and the reload-per-tick refresh with an edge-indexed adapter and a per-renderer delta channel, and move consumers off whole-map subscriptions.
status: implemented
modules: [Materials, Composer, Store]
---

## Context

The app was laggy in a way that did not correlate with user actions: typing
stalled, hovers did not highlight, clicks landed hundreds of ms late. The
diagnosis is
[docs/analysis/materials-catalog-lag-analysis.md](../../../../../docs/analysis/materials-catalog-lag-analysis.md)
(findings F1–F8). Three things compounded in this module:

1. `catalogToMaterialsState` rescanned the whole edge array once per material to
   derive `suppliers` / `industry` — O(M×E), i.e. quadratic. Measured **3.4 s
   for a 10k catalog**, run synchronously inside a reducer.
2. Every catalog mutation — local edit or remote sync tick — was answered with a
   *full reload*: whole-catalog projection in main, multi-MB structured clone,
   full slice replacement. For a one-field change. During an xlsx import, whose
   chunk writes tick faster than the rebuild completes, this never drained.
3. The replacement handed the whole map a new identity, and seven call sites
   subscribed to that map — including `ProcessItem`, once per process row.

The perf suite already recorded the symptom: the 10k tier was commented out with
`// FREEZES` and the render budgets grew super-linearly.

## Change

**Adapter (`store/materials/catalogAdapter.ts`).** `buildEdgeIndex` builds a
`sourceId → edges` map once; `materialDtoToState` reads it O(1) and accepts
either an array or a prebuilt index, so existing array call sites are unchanged.
New `applyCatalogDelta` applies a change delta, returning the *same state
reference* when the delta is empty.

**Delta channel (F2).** `CatalogDelta` added to `typings/catalog.ts`.
`main/materials.ts` gains `computeCatalogDelta(clientId)`, which diffs the live
catalog against a **per-renderer shadow** of cheap signatures (`updatedAt` per
material, `type|sourceId|targetId` per edge) and returns only the rows that
moved, plus every current edge of each changed material. It returns `{ full }`
when there is no usable "since" — first call for a client, or a different
catalog than the shadow was built against — and `dropCatalogSubscription` clears
the shadows so a workspace switch cannot diff two unrelated catalogs. Exposed as
`jazz-materials-load-delta` (keyed on `event.sender.id`) and
`jazz.materials.loadDelta()` in the preload. `kernelCalls.ts` answers each
`onChanged` tick with `loadMaterialsCatalogDelta`; the materials, graph,
materialTypes, industries and sellers slices each handle
`materialsCatalogDeltaLoaded`. `updateMaterial` no longer re-fetches the whole
catalog to re-read one row.

`loadMaterialsCatalog` (full) is retained where there genuinely is no "since":
cold open, `workspaceSelected`, `peersRefreshed`, import-finished.

**Subscription resolve (F8).** New shallow `materialsCatalogChangeResolve` backs
the live change subscription — it only has to answer "did anything move?", which
every mutator signals by bumping `updatedAt` on the material CoMap itself. The
deep `materialsCatalogResolve` still backs `requireCatalog`'s load and the sync
preload.

**Hooks and selectors (F3/F4).** `useMaterials(ids)` now genuinely projects; it
previously asked whether each requested id was in the requested-id list — always
true — and returned everything, mutating Redux state via `delete` on the way.
Added `useMaterial(id)` (O(1), single-row subscription) and
`useMaterialsGetter()` (reads at call time without subscribing, for action
closures). Selectors `selectMaterial` / `selectMaterialsByType` /
`selectMaterialsByIds` are cached per argument, because a `createSelector`
rebuilt each render memoizes nothing.

**`MaterialSelector` (F5).** Type projection is a selector cached on `type`,
with the caller's `filter` applied in a separate memo; both spread-per-item
reduces became single passes; selected material is an O(1) lookup.

**Search (F7).** `useFilteredMaterials` builds each material's searchable text
once per catalog change instead of re-deriving it for every material on every
keystroke.

**Tests.** New unit test `store/materials/catalogAdapter.test.ts` (9 cases) and
new perf e2e `tests/standalone/performance/catalogDelta.e2e.test.ts`;
`catalogRender.e2e.test.ts` recalibrated and given an `apply` sub-surface.

## Status notes

Implemented and verified on the reference machine. Not done, deliberately:

- The **10k/100k tiers remain unseedable**. They no longer freeze — that was
  F1/F2 — but the live `seed` IPC caps at `LIVE_SEED_MAX`, so those tiers need
  the materialize-once + `cpSync` base from e2e-tests.md §11.2, which does not
  exist yet. The tier stays commented out in `catalogRender`, with the reason
  updated from `// FREEZES`.
- Redux still mirrors the **whole** catalog. The delta path removes the per-edit
  cost, but cold open still projects and clones everything. A windowed / lazy
  read through the existing by-id IPC is the real fix at 10k+, and would let
  `materialsCatalogResolve` shrink too.

## Security

None. No new IPC input is trusted: `jazz-materials-load-delta` takes no
renderer-supplied arguments — its client key is `event.sender.id`, assigned by
Electron — and it reads through the same `requireCatalog` path as the existing
load. No change to auth, permissions, or what a renderer may reach.

One property worth stating: the per-renderer shadow is keyed on the webContents
id and cleared on workspace close, so a renderer cannot observe another
workspace's rows through a stale diff.

## Performance

This change is entirely about performance. Measured on the reference machine.

Adapter, unit-level (`catalogToMaterialsState`, same generator as the analysis):

| Materials | before | after | one-row delta |
|---|---|---|---|
| 1 000 | 34.7 ms | 3.2 ms | 0.97 ms |
| 5 000 | 1 088.8 ms | 18.5 ms | 1.32 ms |
| 10 000 | 3 408.0 ms | 40.9 ms | 2.91 ms |

End-to-end, from the perf suite (`.tests-executions/perf-results.jsonl`):

- `apply` (catalog-load IPC + Redux + grid render, seed write excluded):
  272 / 454 / 609 ms at 103 / 503 / 1003 rows.
- `delta-edit` / `delta-add` / `delta-delete` (write resolved → grid reflects
  it): ~240–283 ms at 103 rows, ~413–457 ms at 1003. Both clear the ~150 ms
  floor from main's fan-out debounce. 10× the catalog costs ~1.8× the latency,
  where the full-reload path was linear in catalog size.
- `delta-burst-tail` (25 sequential writes, time from last write to the grid
  having converged): 108 ms at 103 rows, 524 ms at 1003 — the livelock guard.
  The renderer now keeps up *during* the burst, so the tail is roughly one
  debounce plus one delta.
- `search` is flat across tiers (~575 ms) where it previously rebuilt every
  material's search text per keystroke.

Full perf suite: 32/32 passing. Unit tests: 9/9. `tsc --noEmit` clean across
renderer, main, and preload.
