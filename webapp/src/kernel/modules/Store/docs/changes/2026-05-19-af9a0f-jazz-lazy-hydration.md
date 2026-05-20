---
id: 2026-05-19-af9a0f
name: jazz lazy hydration via ModelSummary + cached workspace handle
description: Land Phase 3 of the jazz performance plan — denormalized ModelSummary so listModels is O(summaries), cached WorkspaceCoMap handle so requireWorkspace doesn't re-load on every IPC, and lazy backfill for pre-existing workspaces.
status: draft
modules: [Store, Composer]
---

## Context

`jazz-performance.md` §2.2 and action item #1 call out the per-IPC workspace re-load as the next blocking bottleneck:

> `requireWorkspace()` re-loads the `WorkspaceCoMap` on every model IPC call. This is acceptable while we're below the plan's 500-model budget; we'll cache the loaded handle when we move to lazy hydration in plan Phase 3. (see [foundation change doc, Performance §2](2026-05-16-932980-jazz-foundation-and-models-migration.md#L77-L82))

At 1 000 models per workspace (the 12-month workload target) the existing `WorkspaceCoMap.load(coId, { resolve: { models: { $each: { editLease: { $onError: catch } } } } })` walks the full models record on **every** model-IPC. Two consequences:

1. The Jazz node materializes every `ModelCoMap` projection (including its `graphJson` and lease history) per call.
2. `listModels` does N field reads across 1 000 CoValues just to surface name + updatedAt.

Phase 3 splits the hot path: a denormalized `ModelSummary` CoMap per model carries the model-list projection, and the full `ModelCoMap` body is fetched on demand by `loadModel` via `ModelCoMap.load(modelCoId)`.

## Change

### Schema ([Store/schema.ts](webapp/src/kernel/modules/Store/schema.ts))

- **`ModelSummary`** — `{id, modelCoId, name, description, updatedAt, hasSvg}`. The renderer's model-list cares about exactly these fields; nothing in this projection touches `graphJson` or the SVG stream.
- **`ModelSummariesMap`** — `co.record(z.string(), ModelSummary)` keyed by the same `id` as `ModelsMap`.
- **`WorkspaceCoMap.modelSummaries`** — `co.optional(ModelSummariesMap)`. Optional so workspaces created before this change don't fail validation; the main process backfills on first open.

`modelCoId` lives on the summary so `loadModel` can call `ModelCoMap.load` directly without dragging the workspace's `models` record through.

### Cached workspace handle ([electron/main/jazz.ts](webapp/electron/main/jazz.ts))

- `ActiveWorkspace` gains `handle: LoadedWorkspaceHandle | null`. Populated lazily by `requireActiveWorkspaceHandle()` and cleared by `closeActiveWorkspace` and by `enableJazzWorkspaceSync` (metadata-mutating sites that change the resolved tree).
- The resolve set is intentionally narrow:
  - `metadata: true`
  - `modelSummaries: { $each: { $onError: "catch" }, $onError: "catch" }`
  - `models: true` (container only — entries are loaded on demand)
- Subsequent `requireActiveWorkspaceHandle()` calls return the cached handle (Jazz keeps the projection live as long as we hold the reference).

### Lazy backfill ([electron/main/jazz.ts](webapp/electron/main/jazz.ts))

`backfillModelSummaries(workspace)` runs inside `requireActiveWorkspaceHandle` on first call:

1. Compare `Object.keys(models)` against `Object.keys(modelSummaries ?? {})`.
2. If summaries cover every model, return — the steady-state path is no-op.
3. Otherwise, deep-load `models.$each` **once**, create `ModelSummariesMap` if absent, and write one `ModelSummary` per missing id.

This is the **only** code path that still walks `models.$each`, and it runs at most once per workspace per process. Workspaces that have always had summaries (`createJazzWorkspace` writes an empty `ModelSummariesMap` at creation) never hit it.

### Main-process models ([Composer/main/models.ts](webapp/src/system/modules/Composer/main/models.ts))

- `requireWorkspace` now returns the cached handle (no per-call `WorkspaceCoMap.load`).
- `listModels` reads `modelSummaries`; no `models.$each` walk.
- `loadModel(id)` resolves the summary, then calls `ModelCoMap.load(summary.modelCoId, { resolve: { editLease: { $onError: catch } } })` for the single model.
- `createModel` writes both the `ModelCoMap` (into `models`) and a paired `ModelSummary` (into `modelSummaries`). `updateModelGraph` / `updateModelDescription` / `uploadModelSvg` mirror their writes to the summary (`updatedAt`, `description`, `hasSvg`).
- Lease ops (`acquireEditLease` / `renewEditLease` / `releaseEditLease`) operate on the full `ModelCoMap` (loaded via summary→`modelCoId`); the lease is per-model and not surfaced in the summary, so no mirror is needed.

### Collaborative deep-loads ([electron/main/jazz.ts](webapp/electron/main/jazz.ts))

`joinJazzWorkspace` and `enableJazzWorkspaceSync` previously preloaded `models.$each.editLease` to warm the sync manager. Both now preload only `modelSummaries.$each`, matching the steady-state hot path. Full bodies stream on demand when a peer opens a model.

## Status notes

Draft.

Decisions:

- **Backfill: lazy on open.** Idempotent, one-time per process. Confirmed in design discussion 2026-05-19.
- **Cache handle on `ActiveWorkspace`.** Cleared on close + on metadata mutations that reopen the node (`enableJazzWorkspaceSync`).
- **`loadModel` resolves through `ModelCoMap.load(coId)`** rather than walking `workspace.models[id]`. Smaller blast radius and decouples model body fetch from the workspace handle's resolve set.

Open:

1. **Sync of summaries.** When a remote peer creates a model, both the new `ModelCoMap` and its `ModelSummary` need to reach this peer. Since both are children of the same workspace group, sync coverage is already there — but verify with a collaborative e2e that asserts `listModels` on peer B picks up a model peer A just created without B having to call `loadModel` first.
2. **Summary drift on direct `ModelCoMap` mutations.** Anything that bypasses the main-process mutators (e.g. future MCP tools that work the schema directly, or sync from a peer running an older build) would leave the summary stale. The next change after this should either close that gap with a renderer-side subscription that refreshes the summary on `ModelCoMap` change events, or stamp the summary `updatedAt` from a Jazz `onChange` watcher in main.
3. **`models: true` container resolve** — verify the container alone doesn't pull child histories. If the Jazz tools build does eager-load record values, fall back to using only `modelSummaries` from the handle and looking models up via fresh `ModelCoMap.load` calls on demand.

## Security

- No new IPC surface, no new credential exposure. `ModelSummary` carries only fields already visible in the model list.
- `backfillModelSummaries` writes new CoValues under the workspace's existing group, so access control matches the parent `ModelCoMap` (same group = same readers/writers).

## Performance

- **Steady state (`listModels`):** O(summaries). At 1 000 models, the summary record is ~80 KiB of projections vs. the previous full `ModelsMap` deep-load of ≥1 MiB of bodies. Per-IPC cost drops from "walk N CoMaps + their leases" to "iterate one record + read 6 fields per entry."
- **`loadModel`:** one `ModelCoMap.load(coId)` per call, scoped to the requested model. Cold-load is bounded by that model's history, not the workspace's.
- **First-open backfill:** O(models) one-time. Same cost the old hot path paid every call.
- **`createModel`:** one extra CoMap write per create (the summary). Negligible against the workflow-engine write budget in §3 of the perf doc.
- **`updateModelGraph` / `updateModelDescription` / `uploadModelSvg`:** one extra CoMap write per mutation (`updatedAt` mirror). Bounded by the human-edit cadence; well under any rate limit.
- **`joinJazzWorkspace` / `enableJazzWorkspaceSync`:** preload cost drops from N full-bodied loads to N summary loads. Multiplied across 30 peers per workspace this is the biggest win on the join path.
- Benchmark gate (F2 from the perf doc) lands in a follow-up change once a seed-1k-models harness exists.
