---
id: 2026-08-10-f9e8d1
name: Catalog delta sync and scale fixes
description: Move Composer's material consumers off whole-catalog subscriptions onto id-scoped hooks and a non-reactive getter.
status: implemented
modules: [Materials, Composer, Store]
---

## Context

Composer was the largest consumer of the problem described in
[docs/analysis/materials-catalog-lag-analysis.md](../../../../../docs/analysis/materials-catalog-lag-analysis.md)
(F3). Six call sites here subscribed to the **entire** materials map, which the
Materials module replaced wholesale on every catalog tick — so one peer editing
one material re-rendered the whole Composer tree. `ProcessItem` did it once per
process row, and `VisualizationItem` asked for a single material by id and, due
to a bug in `useMaterials`, received the whole catalog anyway.

## Change

Each consumer now subscribes only to what it renders:

- `VisualizationListAccordion/VisualizationItem.tsx` → `useMaterial(id)`, the
  new O(1) single-row hook.
- `ProcessListAccordion/ProcessItem.tsx` → `useMaterials(ids)` over the
  materials its own consumption edges reference.
- `ProcessListAccordion/processMaterialUsageButton.tsx` → `useMaterials(ids)`
  over the material ids this variation's graph references (the `useMaterials`
  call moved below the graph selectors it now depends on).
- `MaterialListAccordion/index.tsx` → the ids of its own material nodes. Its
  refresh button's disabled guard changed from `!materials` to "no material
  resolved", since the projection returns `{}` rather than `undefined`.
- `hooks/useVariationRehydration.ts` → the variation's referenced ids. This one
  stays *reactive* — it paints material colours onto the SVG and must re-run
  when catalog data lands — but is no longer woken by unrelated rows.
- `hooks/useVariation.ts` and `hooks/useVariationActions.ts` →
  `useMaterialsGetter()`. Every use in both was inside an action closure, so
  they now read the store at call time and do not subscribe at all. This also
  removes a correctness wrinkle: the previous `materialsRef` handed each closure
  whatever the catalog held at the last render.

No behaviour change is intended in any of these surfaces.

## Status notes

Implemented. Covered indirectly by the Materials perf suite (a catalog tick no
longer re-renders this tree); not covered by a Composer-specific assertion. If
a regression guard is wanted here, the natural one is a React Profiler
assertion on commit counts during a catalog tick — see
`docs/analysis/viewport-rerender.md` for the method.

## Security

None. No change to what data is read, only to how much of it a component
subscribes to.

## Performance

A catalog tick no longer invalidates the Composer tree. The per-row cost that
mattered most was `ProcessItem`, which held one whole-catalog subscription per
process in the list; that is now one id-scoped subscription over the handful of
materials the process consumes.

The two variation hooks dropped their subscriptions entirely, so an editor with
an open variation no longer re-renders on catalog activity it does not display.

No numbers were taken for Composer specifically — the measured surfaces are in
the Materials change doc for this same id.
