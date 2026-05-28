---
id: 2026-05-26-cc9646
name: Main-process module hooks (Composer slice)
description: Move Composer's Models/lease/SVG IPC and modelSummaries backfill out of electron/main/jazz-hooks.ts and electron/main/jazz.ts into system/modules/Composer/main/, registered through the new MainModuleConfig surface.
status: draft
modules: [Store, Composer, Materials]
---

## Context

Composer's main-process logic is currently split between [`system/modules/Composer/main/models.ts`](../../main/models.ts) (correct location — Models / lease / SVG functions) and two kernel files that should not know about Composer:

- [`electron/main/jazz-hooks.ts:152-187`](../../../../../../electron/main/jazz-hooks.ts#L152-L187) — eleven `ipcMain.handle` calls for `jazz-list-models`, `jazz-load-model`, `jazz-create-model`, `jazz-update-model-graph`, `jazz-update-model-description`, `jazz-acquire-lease`, `jazz-renew-lease`, `jazz-release-lease`, `jazz-upload-model-svg`, `jazz-load-model-svg`.
- [`electron/main/jazz.ts:498-554`](../../../../../../electron/main/jazz.ts#L498-L554) — `backfillModelSummaries`, a one-time migration that walks `models.$each` to synthesize missing `ModelSummary` entries. Composer-specific.
- The `models` / `modelSummaries.$each` clauses inside `requireActiveWorkspaceHandle` ([jazz.ts:449-467](../../../../../../electron/main/jazz.ts#L449-L467)) and the `modelSummaries` preload inside `joinJazzWorkspace` / `enableJazzWorkspaceSync` ([jazz.ts:721-755](../../../../../../electron/main/jazz.ts#L721-L755), [jazz.ts:844-857](../../../../../../electron/main/jazz.ts#L844-L857)).

The kernel-side refactor is described in the [Store change doc](../../../../kernel/modules/Store/docs/changes/2026-05-26-cc9646-main-process-module-hooks.md). This document covers Composer's slice.

## Change

In this module:

- New file `system/modules/Composer/main/index.ts`: imports `registerMainModule` from `electron/main/modules.ts` and calls it at module top-level with Composer's `MainModuleConfig`. Side-effecting register-on-import; the electron bootstrap (`electron/main/index.ts`) side-effect-imports this file before `initJazzHooks()` runs.

  The config:
  - `name: "Composer"`
  - `registerIpc({ ipcMain })`: registers the eleven Models/lease/SVG handlers, moved verbatim from `electron/main/jazz-hooks.ts`. Importer / catalog handlers stay in the Materials module.
  - `workspaceResolve()`: returns
    ```ts
    {
      models: true,
      modelSummaries: { $each: { $onError: "catch" }, $onError: "catch" },
    }
    ```
    Merged into `requireActiveWorkspaceHandle`'s resolve.
  - `onWorkspaceLoaded(handle)`: calls `backfillModelSummaries(handle)` — moved into this module since it only mutates `modelSummaries`. Becomes an internal helper of Composer's main folder.
  - `syncPreloadResolve()`: returns `{ modelSummaries: { $each: { $onError: "catch" }, $onError: "catch" } }`. Used by `joinJazzWorkspace` and `enableJazzWorkspaceSync`.
  - No `onWorkspaceClose` — Composer's IPC handlers are stateless w.r.t. the workspace lifetime; they re-fetch via `requireActiveWorkspaceHandle` on each call.

- New file `system/modules/Composer/main/backfillModelSummaries.ts` (or inline in `index.ts`): moves the `backfillModelSummaries` body from `electron/main/jazz.ts`. The `ModelsMap` / `ModelSummariesMap` / `ModelSummary` imports relocate here; the kernel jazz file loses its dependency on those schemas.

- `system/modules/Composer/main/models.ts`: unchanged in behaviour. Continues to import `requireActiveWorkspaceHandle` from `electron/main/jazz.ts` (kernel API kept).

- The preload binding surface ([`webapp/electron/preload/jazz.ts`](../../../../../../electron/preload/jazz.ts)) doesn't change — the same eleven `jazz-*` channels exist, they're just registered from Composer's folder now.

## Status notes

Draft. Open questions:

- Should `models` itself stay shallow-resolved (current behaviour: container only, lazy per-id load via `loadModel`) or move to a Composer-owned method that takes an `id` and resolves on demand? Current proposal: keep shallow; `loadModel` already exists and the lazy-hydration invariant is documented in [`docs/jazz-performance.md`](../../../../../docs/jazz-performance.md). Worth re-checking once the registry is in place.
- `backfillModelSummaries` runs on every `onWorkspaceLoaded`. It short-circuits when summaries match models, so the cost stays a single `Object.keys` comparison post-migration. If we later add many modules with `onWorkspaceLoaded`, consider letting hooks opt into "only on first load per workspace".

Not yet implemented. No commits, no PR.

## Security

None. The IPC channels and their payload shapes are unchanged; only the file owning the `ipcMain.handle` registration moves. Composer's main folder already has filesystem and Jazz-node privileges via `requireActiveWorkspaceHandle`; the refactor doesn't broaden that surface.

## Performance

Neutral.

- The merged workspace resolve still asks for exactly `models` + `modelSummaries.$each` — same shape as today, same CoValues fetched.
- `backfillModelSummaries` keeps its idempotent fast path (early return when every model id has a summary). One extra `Object.keys` comparison per workspace open is negligible.
- `onWorkspaceLoaded` runs in parallel with the Materials hook; the slower of the two dictates the cached-handle ready time. Today both are sequential inside `requireActiveWorkspaceHandle`, so the change is a small win.
