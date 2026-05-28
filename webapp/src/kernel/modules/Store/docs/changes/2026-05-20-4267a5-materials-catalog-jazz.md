---
id: 2026-05-20-4267a5
name: Materials catalog — Jazz-backed graph + stock viewport
description: Add the materials-catalog CoSchema to the Store Jazz layer so the Materials module can persist its graph as per-CoValue nodes, edges, and attributes.
status: in-progress
modules: [Materials, Store]
---

## Context

The Materials module is being built out with a `MaterialStock` viewport, schema-driven forms, and graph persistence (see the paired [Materials change doc](../../../../system/modules/Materials/docs/changes/2026-05-20-4267a5-materials-catalog-jazz.md)). It persists its catalog on the workspace's Jazz node, so the kernel Store layer — which owns the CoSchema and the Jazz IPC surface — gains the catalog schema.

Unlike Composer's models (one atomic `ModelCoMap.graphJson` gated by an `EditLease`), the materials catalog stores **every node, edge, and attribute as its own CoValue**. The catalog is long-lived shared state edited concurrently at attribute granularity; per-CoValue CRDTs let those edits merge with no lock.

## Change

In [`schema.ts`](../schema.ts), new CoSchema for the materials catalog:

- `AttributeCoMap` — one schema-driven attribute cell (`key`, `valueJson`, recursive `children` for object-typed attributes).
- `StockCoMap` — `{ amount, unit }`.
- `MaterialCoMap` — a material node: typed fields + `attributes` (`co.record` of `AttributeCoMap`) + `stock`.
- `MaterialTypeCoMap` — a material-type schema version; `schemaJson` stays atomic (type versions are immutable).
- `OrgNodeCoMap` — industry / seller node, plain typed fields.
- `EdgeCoMap` — one graph edge.
- `MaterialCatalogCoMap` — `co.record`s of the above (`materials`, `materialTypes`, `industries`, `sellers`, `edges`).
- `WorkspaceCoMap` gains `materials: co.optional(MaterialCatalogCoMap)` — optional for backward compatibility with workspaces created before Materials shipped; the main process backfills on first open.

The Materials module owns the main-process mutators (`Materials/main/materials.ts`) and the IPC handlers; this Store change is the schema surface only. No change to the existing `KlippelAccount` / `WorkspaceCoMap.models` / `ModelSummary` shapes.

## Status notes

Schema landed 2026-05-23 in [`schema.ts`](../schema.ts) — `AttributeCoMap`, `StockCoMap`, `MaterialCoMap`, `MaterialTypeCoMap`, `OrgNodeCoMap`, `EdgeCoMap`, `MaterialCatalogCoMap`, and the optional `WorkspaceCoMap.materials` ref are now part of the kernel surface. Reader/writer logic lives in `system/modules/Materials/main/materials.ts`; the receive-validator hardening called out in the Security section remains open.

## Security

- `MaterialCatalogCoMap` and its children are created under the workspace's existing Jazz group — access control matches `ModelCoMap` (same group, same readers/writers). The new schema adds no trust boundary.
- No receive-validator yet (foundation-doc Phase 6); the `co.optional` `materials` ref does not change that exposure.
- No credential or secrets handling in this change.

## Performance

- Adding the optional `materials` ref to `WorkspaceCoMap` is free for existing workspaces (absent until first written).
- Per-CoValue granularity is a deliberate divergence from `jazz-performance.md`'s atomic-graphJson guidance; the trade-off (more CoValues, more history vs. conflict-free parallel edits) is analysed in the Materials change doc and `graph-semantics.md`.
- No change to the models hot path or `requireActiveWorkspaceHandle` resolve set.
