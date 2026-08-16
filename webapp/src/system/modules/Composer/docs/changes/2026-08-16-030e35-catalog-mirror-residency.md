---
id: 2026-08-16-030e35
name: Catalog mirror residency + grid smoothness
description: Composer's material pins are now owned by the variation that made them and released when its editor unmounts.
status: implemented
modules: [Materials, Composer]
---

## Context

Composer is the only module that pins materials into the catalog mirror: an
open model's rows must stay resident whatever their rank or the active query.
Those pins had no owner, so nothing could release them — the mirror kept the
materials of every model opened this session, and the Materials module could
not implement eviction without silently dropping rows an open editor was
painting.

Full rationale and the mirror-side mechanism:
[Materials/docs/changes/2026-08-16-030e35-catalog-mirror-residency.md](../../../Materials/docs/changes/2026-08-16-030e35-catalog-mirror-residency.md).

## Change

Both pin sites now name their owner:

- `store/variations/middlewares.ts` — the `openModel` effect pins
  `materialIdsInGraph(graphState)` with `owner: variationId`.
- `hooks/useVariationRehydration.ts` — pins the variation's referenced
  materials with the same owner, and **releases** them
  (`unpinMaterials({ owner: variationId })`) in the effect's cleanup.

Release on unmount, not on tab close, is the deliberate choice: a viewport tab
is an independent component instance and unmounts on a tab switch (repo
`CLAUDE.md`). Switching away therefore hands the variation's materials to the
residency TTL rather than dropping them — switching back within the grace
period finds them resident, and later the rows are re-resolved by id, which is
now a supported path (`useMaterial` / `useMaterials` resolve what they do not
find).

## Status notes

Implemented alongside the Materials-side work; `tsc --noEmit` clean. No
Composer-level test asserts the release — it is covered indirectly by the
window slice's owner-pin tests in Materials.

## Security

None.

## Performance

Positive and indirect: the materials of a closed (or long-unvisited) model
become reclaimable, which is what bounds the renderer's catalog memory. Cost is
a possible re-resolve IPC when returning to a model after more than one TTL.

## Related

- [Materials — catalog mirror residency](../../../Materials/docs/changes/2026-08-16-030e35-catalog-mirror-residency.md)
- [Materials — catalog windowed reads](../../../Materials/docs/changes/2026-08-11-3b71c2-catalog-windowed-reads.md)
