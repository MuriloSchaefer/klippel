---
name: materials-catalog-mirror
description: Use when touching anything that puts material data into the renderer, keeps it there, or renders it at scale — the Materials window/materials/residency slices, `useMaterial`/`useMaterials`/`useCatalogWindow`, pins (`ensureMaterialsLoaded`, `unpinMaterials`), the residency sweep and its TTL, `loadMaterialsWindow`/`loadMoreMaterials`/`searchMaterialsCatalog`, the main-process catalog index, or the MaterialStock grid's scroll/search/selection path. Triggers include "material is undefined", "the catalog isn't loading", "why did my material disappear", "add a material picker", "search the catalog", "the stock table is slow / glitches when scrolling", "load more materials", "pin materials for this model", "memory grows with the catalog", "evicted too early", "add a data-material-* mirror".
---

# Materials catalog mirror

The renderer holds a **window** of the catalog and gives rows back when
nothing needs them. The canon is
[webapp/src/system/modules/Materials/docs/architecture/catalog-mirror.md](../../webapp/src/system/modules/Materials/docs/architecture/catalog-mirror.md).
**Read it before writing code in this area** — this skill is the pointer and
the decision aid, that file is the contract.

## The invariant, in one line

Redux holds what the UI is showing, plus what open tabs reference, plus a short
tail of what was recently read. Never the catalog.

## Decision tree — I need material data in a component

- **One row, by id** → `useMaterial(id)`. Resolves it if absent, retains it
  while mounted. Handle `undefined`: it is the frame before the row lands, and
  the permanent answer for a reference no row answers to.
- **A known set** (a model's references) → `useMaterials(ids)`. Same contract
  in bulk.
- **Every row of a type** (a picker) → `loadMaterialsOfType` on mount +
  `selectMaterialsByType`, and **retain the option ids while mounted** — a
  type's rows are in no view and no pin set, so nothing else protects them.
- **The stock grid's page + counts** → `useCatalogWindow()`.
- **Read once, in a handler** → `useMaterialsGetter()`. No subscription, no
  stale snapshot.
- **The whole map** → don't. `useMaterials()` with no ids re-renders on every
  catalog tick; it exists for one legacy filter path.

## Decision tree — I need rows to stay resident

- **An open tab / model references them** → `ensureMaterialsLoaded({ ids, owner })`
  with an owner, **and** `unpinMaterials({ owner })` in the same effect's
  cleanup. A pin with no release is the bug this design exists to prevent.
- **A component is rendering them** → `retainMaterials` / `releaseMaterials`,
  paired in one effect. Never one without the other.
- **They are on screen in the stock grid** → nothing to do; the grid retains
  its rendered range. Note that being *in the view* (`resultIds`) protects
  nothing — the view is a list of positions, and a reclaimed row renders as a
  placeholder until it is scrolled to.
- **"Just in case"** → no. That is how the mirror became the catalog.

## Hard rules

- **Search and rank happen in main**, over the cached index. A renderer-side
  filter searches only what is resident, i.e. what the user can already see.
- **A delta never adds a row to the mirror** (`applyCatalogDelta` skips
  non-resident ids). If you need a row, resolve it.
- **A page never deletes types / industries / sellers.** Those slices merge
  what an answer carries; only a `reset` read replaces. Replacing on every
  page makes one empty projection blank the labels app-wide.
- **Nothing that flips per page request may be a prop of the DataGrid**
  (`hasMore`, `loading`, selection). Pull it through a stable callback or
  `apiRef`; a changed prop re-renders every cell mid-scroll.
- **Residency bookkeeping stays out of Redux.** It is read per row per render;
  a dispatch per read would notify the store on the grid's hot path.
- **Per-instance UI state belongs in the viewport `extra` or in a ref**, never
  in module state — a viewport tab is an independent component instance
  (repo `CLAUDE.md`).

## When something disappears or never arrives

1. Is it in the mirror? `__klippelStore__.getState().Materials.materials[id]`.
2. If not — did anything ask for it? Only `useMaterial`/`useMaterials(ids)` and
   `ensureMaterialsLoaded` resolve; a raw `selectMaterial` in a component does
   not.
3. In the stock grid, a blank row is a **placeholder**, not a bug: its data
   was reclaimed and is re-resolved when it comes on screen. A placeholder
   that never fills in means the resolve is not firing (`onVisibleHoles`).
4. If it arrived and then vanished — it was swept. Something is missing a pin
   owner or a `retain`. Check the four protections in §3 of the doc before
   raising the TTL; a longer TTL hides the bug rather than fixing it.
5. `configureMaterialsResidency({ ttlMs, sweepIntervalMs })` retunes both knobs
   at runtime — useful to bisect, not a fix.

## Changing this area

- Update `catalog-mirror.md` in the same change — especially §7 (invariants)
  and §2 (the read commands table) if you add a path.
- Unit-test the rule you changed: `store/materials/residency.test.ts` and
  `catalogAdapter.test.ts` are the homes for eviction/pin/delta rules.
- Anything touching scroll, search or the resident bound gets a budget in
  `tests/standalone/performance/catalogWindowing.e2e.test.ts` — see the
  [performance-tests](../performance-tests/SKILL.md) skill for the tiering
  rules, and note that seeding past 1k uses the batched `seedChunk` fixture
  path.
- Write the change doc ([create-change-documents](../create-change-documents/SKILL.md)).

## Related

- [performance-tests](../performance-tests/SKILL.md) — budgets, tiers, seeding.
- [debug-traces](../debug-traces/SKILL.md) — when a budget fails and you need
  to know which component re-rendered.
- [session-persistence](../session-persistence/SKILL.md) — the `.session/`
  cache of material *types* follows those rules, not these.
