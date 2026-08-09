---
id: 2026-05-24-a1f3c7
name: Materials — Jazz-only storage (remove `.session` cache)
description: Drop the per-workspace `.session/Materials/*` JSON cache and the `saveSession` plumbing from the Materials module; Jazz CoValues become the sole source of truth, so the renderer state is always derived from `materialsCatalogLoaded` and the per-event reducers.
status: in-progress
modules: [Materials]
---

## Context

When the [Materials catalog](./2026-05-20-4267a5-materials-catalog-jazz.md) was first cut over to Jazz we kept the legacy `.session/Materials/materials/*.json` and `.session/Materials/materialTypes/*.json` cache in place as a "renderer-side optimization so the grid renders before the first Jazz IPC round-trip completes." In practice that cache is now a liability:

- It produces **rehydration races**: the slice boots with `await loadFromWorkspace()` (cached JSON), then `materialsCatalogLoaded` overwrites it once Jazz returns. Edits made on another peer between the cache write and the next workspace open ghost briefly until the catalog reload catches up; deletes are even worse — the deleted row reappears for a frame.
- The cache and Jazz can disagree in subtler ways: an attribute edit that merges cleanly on the Jazz side can lose to a stale `persistMaterial` blob if a `saveSession` fires after the in-memory state had already drifted from the catalog (e.g. mid-flight optimistic update that the catalog round-trip then refines).
- The session writer also pulls a side-effect (`storage.ensureDir(".session/SVG/svgs")` at the top of [`store/slice.ts`](../../store/slice.ts), copy-pasted from SVG) which has nothing to do with this module.
- Composer keeps its own `.session` cache for now because its `ModelCoMap.graphJson` is gated by an `EditLease` and the renderer never mutates the model without first acquiring the lease — there is no concurrent-edit race for it to lose. **Composer is out of scope for this change.**

## Change

Materials becomes Jazz-only on the renderer:

- **Remove** [`store/actions.ts`](../../store/actions.ts) `saveSession` / `sessionSaved` action creators (file deleted; nothing else in the module imports them).
- **Remove** [`store/middlewares.ts`](../../store/middlewares.ts) `saveSession` listener (file deleted along with its `kernelCalls.ts` registration).
- **Rewrite** [`store/slice.ts`](../../store/slice.ts):
  - Drop `sessionSaver`, the `storage.ensureDir(".session/SVG/svgs")` line, and the `saveSession` import.
  - Keep the combined-reducer shape — only the session glue goes.
- **Rewrite** [`store/materials/slice.ts`](../../store/materials/slice.ts):
  - Drop `persistMaterial`, `loadFromWorkspace`, `materialsRehydrated`, and the top-level `storage.ensureDir(".session/Materials/materials")`.
  - `initialState` becomes the empty `{}` synchronously — no top-level `await`. The first paint shows an empty grid for the few ms until `loadMaterialsCatalog` resolves; we accept that as the price of consistency.
  - Reducer keeps `materialsLoaded`, `materialsCatalogLoaded`, `materialAdded`, `materialUpdated`, `materialStockUpdated`, `materialDeleted`. The `materialsRehydrated` case is removed.
- **Rewrite** [`store/materialTypes/slice.ts`](../../store/materialTypes/slice.ts):
  - Drop `persistMaterialTypes`, `restoreMaterialTypesSession`, `materialTypesRehydrated`, and the `.session/Materials/materialTypes` `ensureDir`.
  - `initialState` becomes `{}` synchronously. The existing `loadMaterialTypes` mock middleware that seeds the built-in types still runs at `startModule`, and `materialsCatalogLoaded` / `materialTypeVersionRegistered` continue to merge Jazz-sourced types on top.
- **Update** [`kernelCalls.ts`](../../kernelCalls.ts):
  - Remove `sessionSaver` import and the `storage.registerSessionSaveListener(...)` call. The Materials module stops contributing a session-save callback; everything it would have persisted is already written through the existing Jazz IPC calls (`window.electron.jazz.materials.*`).
- **Filesystem cleanup**: existing `.session/Materials/` directories in opened workspaces are left in place — read paths are gone, so they are inert. No migration step; if a user opens an old workspace, the catalog rebuilds from Jazz on `loadMaterialsCatalog` as it does today.

No CoSchema change, no IPC surface change, no UI change.

## Roadmap

Single-shot change, no phases. Validation checklist:

1. **Compile / typecheck.** Cross-module `saveSession` / `sessionSaved` references from `Materials` are only intra-module; verify no other module imports `@/system/modules/Materials/store/actions` (a grep before deletion).
2. **Unit: cold open.** Open a fresh workspace; confirm `MaterialStockViewport` renders empty for one tick and then populates from `loadMaterialsCatalog`.
3. **Unit: reload round-trip.** Add a material → reload window → row is present (proves Jazz is still authoritative; proves the cache wasn't load-bearing).
4. **Collaborative driver.** Re-run the existing two-peer drivers under `system/modules/Materials/tests/collaborative/` — the delete-ghost regression should disappear once the cache is gone.
5. **No-op for Composer.** Spot-check that `Composer/store/models/slice.ts` is untouched and its `.session` reads still work.

## Status notes

**Partly reversed 2026-08-08 — `materialTypes` caches to `.session/` again.** The
empty `initialState` left a window in which a material was in the slice with no
type to describe it: `materialTypes` had no rehydrator, so its only populators
were the async `materialsCatalogLoaded` and `materialTypeVersionRegistered`.
`MaterialSelector` resolves `materialTypes[material.type]` during render and
crashed on it (`Cannot read properties of undefined (reading 'schemas')`) on cold
open, on workspace switch (rehydrators run *before* `workspaceSelected` fires the
catalog load), and on peer refresh. Restored for **types only**:
`persistMaterialType` / `pruneMaterialTypeFiles` / `materialTypesRehydrated` in
[`store/materialTypes/slice.ts`](../../store/materialTypes/slice.ts), a single
reconciling writer in [`store/session.ts`](../../store/session.ts), and its
`registerSessionSaveListener` registration in
[`kernelCalls.ts`](../../kernelCalls.ts). Materials, industries and sellers stay
Jazz-only — the ghost-row races described above come from *rows* going stale,
whereas type schemas are additive (versions are appended, never deleted), so a
stale type is superseded by the catalog load rather than contradicting it. The
`materialTypesRehydrated` case merges instead of replacing, for the same reason
`materialsCatalogLoaded` does: replacing with an empty payload on a switch into
an uncached workspace would reopen the window. `MaterialSelector` also stops
asserting the type is present, since the first-ever open of a workspace has no
cache to rehydrate from. Full write-up:
[`2026-08-08-9f0048-material-types-session-cache.md`](./2026-08-08-9f0048-material-types-session-cache.md).

Implemented 2026-05-24. Deleted `store/actions.ts` and `store/middlewares.ts`; trimmed `store/slice.ts`, `store/materials/slice.ts`, `store/materialTypes/slice.ts`, and `kernelCalls.ts` per the Change section. `npx tsc --noEmit -p tsconfig.json` reports no new errors (only the pre-existing `cojson/crypto/WasmCrypto` moduleResolution warning in `electron/main/jazz.ts`). Manual verification of the cold-open and two-peer collaborative drivers still pending.

Out of scope and intentionally **not** removed in this change:

- Composer's `.session` cache (different concurrency model — see Context).
- Kernel-level `saveSession` infrastructure (`@kernel/modules/Store/actions`, `SessionAutoSaverIcon`). Other modules still depend on it.
- The `.session/Materials/*` files already on disk in user workspaces. They are simply orphaned.

Open questions:

- **First-paint flash.** If the empty-state flash becomes noticeable on slow Jazz cold-loads, we have two escape hatches: (a) render a skeleton row in `TableView` while `materials` is empty and `loadMaterialsCatalog` is pending, or (b) reintroduce a *read-only* in-memory mirror keyed off `materialsCatalogLoaded` (no disk writes). Decide after measuring; do not pre-optimize.
- **Catalog load cost.** Removing the cache means every workspace open pays the full `loadMaterials` walk. That's already the steady-state cost on the second-and-onwards open today (the cache only sped up the *first* paint), so no regression is expected — but worth confirming with the seeded-catalog benchmark called for in Phase 4 of the parent change doc.

## Security

- No new IPC, no new CoSchema, no new credential paths. Removing local-disk JSON copies of catalog state slightly *reduces* the on-disk attack surface (one less place where unencrypted material data sits outside Jazz's group-scoped storage).
- The receive-validator gap called out in [the parent doc](./2026-05-20-4267a5-materials-catalog-jazz.md#security) is unchanged by this work.

## Performance

- Removes one `Object.entries(...).forEach(writeBlob)` per `saveSession` tick (was running on every kernel save). Net positive on heavy-edit workspaces.
- Removes the top-level `await loadFromWorkspace()` in two slices, which means the Materials reducer module load is no longer async — small startup win, also closes a small footgun where two parallel imports of the slice could race the readdir.
- First-paint cost on cold workspace open shifts from "read N JSON files" to "wait for Jazz IPC + walk N CoValues". In practice the Jazz read is already happening on every open (it is the authoritative load), so the only real change is that the grid doesn't render the stale cache first.
