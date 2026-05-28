---
id: 2026-05-26-cc9646
name: Main-process module hooks (per-module main/ folders)
description: Refactor electron/main/jazz.ts and jazz-hooks.ts so each module registers its own main-process logic through a module-config surface the main process loops over.
status: draft
modules: [Store, Composer, Materials]
---

## Context

[`electron/main/jazz.ts`](../../../../../electron/main/jazz.ts) and [`electron/main/jazz-hooks.ts`](../../../../../electron/main/jazz-hooks.ts) currently hold logic that belongs to specific renderer modules:

- `requireActiveWorkspaceHandle` ([jazz.ts:444](../../../../../electron/main/jazz.ts#L444)) hard-codes a resolve set referencing `models`, `modelSummaries.$each` (Composer) and `materials` (Materials).
- `backfillModelSummaries` ([jazz.ts:498](../../../../../electron/main/jazz.ts#L498)) is a Composer concern living in the kernel jazz file.
- `joinJazzWorkspace` ([jazz.ts:691](../../../../../electron/main/jazz.ts#L691)) and `enableJazzWorkspaceSync` ([jazz.ts:777](../../../../../electron/main/jazz.ts#L777)) carry inline deep-resolve trees for the materials catalog and for model summaries — every new module that needs eager preload would have to edit this file.
- `jazz-hooks.ts` ([jazz-hooks.ts:1](../../../../../electron/main/jazz-hooks.ts#L1)) registers IPC for `jazz-list-models`, `jazz-load-model`, `jazz-create-model`, `jazz-acquire-lease`, …, `jazz-materials-*`, `materials:import-xlsx`, plus the catalog subscription fan-out. None of that is kernel-Store responsibility — it's the IPC surface of the Composer and Materials modules.

The result is a kernel file that has to be edited by every system module that wants any main-process behaviour, with circular-import escape hatches (`registerWorkspaceCloseHook` exists explicitly "to avoid the jazz ↔ Materials/main circular dep", [jazz.ts:564](../../../../../electron/main/jazz.ts#L564)). The Store module already exposes a kernel call / middleware registration pattern on the renderer side; the main process should mirror it.

## Change

Introduce a `MainModuleConfig` contract owned by the Store module and a registry the electron entrypoint iterates on boot.

In this module (Store, kernel):

- New file `electron/main/modules.ts`: defines and exports
  ```ts
  export type MainModuleConfig = {
    name: string;
    registerIpc?: (ctx: { ipcMain: Electron.IpcMain }) => void;
    workspaceResolve?: () => Record<string, unknown>; // merged into requireActiveWorkspaceHandle resolve
    onWorkspaceLoaded?: (handle: LoadedWorkspaceHandle) => void | Promise<void>;
    onWorkspaceClose?: () => void | Promise<void>;
    syncPreloadResolve?: () => Record<string, unknown>; // merged into join/enableSync preload
  };
  export function registerMainModule(config: MainModuleConfig): void;
  export function getMainModules(): MainModuleConfig[];
  ```
  Each module's `main/index.ts` calls `registerMainModule(config)` at import time. Registration order = import order. `electron/main/index.ts` imports every module's `main/index.ts` once during bootstrap (one side-effecting import per module) before `initJazzHooks()` runs, so the registry is fully populated by the time the kernel reads it.

- `electron/main/jazz.ts` changes:
  - `requireActiveWorkspaceHandle`: build the resolve object with a **shallow merge** of `{ metadata: true }` (always) over every `workspaceResolve()` returned by `getMainModules()`. Each module owns disjoint top-level fields (Composer: `models`, `modelSummaries`; Materials: `materials`), so a single-level spread is sufficient. Drop the inlined module clauses.
  - After load completes, `await Promise.all(modules.map(m => m.onWorkspaceLoaded?.(settled)))`. Replaces the inlined `backfillModelSummaries` call.
  - `joinJazzWorkspace` and `enableJazzWorkspaceSync`: build the preload resolve from `{ metadata: true }` shallow-merged with every `syncPreloadResolve()`. The current `materials: { materials: { $each: { stock, attributes, … } } }` and `modelSummaries` trees move into Materials and Composer respectively.
  - `closeActiveWorkspace`: iterate `getMainModules()` calling `onWorkspaceClose?.()` instead of the bespoke `workspaceCloseHooks` array. Remove `registerWorkspaceCloseHook` export.
  - The file keeps only kernel concerns: workspace lifecycle, credentials, SQLite driver, sync URL validation, sync reconnector, account id, sync status.

- `electron/main/jazz-hooks.ts`:
  - Keeps only Store-owned IPC: `jazz-open-workspace`, `jazz-close-workspace`, `jazz-sync-status`, `jazz-sync-logs:*`, `jazz-get-account-id`, `jazz-create-workspace`, `jazz-ensure-workspace`, `jazz-refresh-workspace`, `jazz-join-workspace`, `jazz-enable-sync`, `jazz-list-workspaces`.
  - Loops `getMainModules()` calling `config.registerIpc?.({ ipcMain })` for each.

- `electron/main/index.ts`: add a side-effecting import block for every module's `main/index.ts` (Composer, Materials, future ones), placed before `initJazzHooks()`. Each import triggers that module's `registerMainModule` call, populating the registry before the kernel reads it.

In sibling modules (covered by their own change docs sharing this id):

- [Composer change doc](../../../../system/modules/Composer/docs/changes/2026-05-26-cc9646-main-process-module-hooks.md): moves Models / lease / SVG IPC and `backfillModelSummaries` into `system/modules/Composer/main/`.
- [Materials change doc](../../../../system/modules/Materials/docs/changes/2026-05-26-cc9646-main-process-module-hooks.md): moves catalog + importer IPC and the catalog deep-resolve into `system/modules/Materials/main/`.

## Status notes

Draft. Decisions locked:

- **Registry shape.** Side-effecting `registerMainModule(config)` call at the top of each module's `main/index.ts`. `electron/main/index.ts` side-effect-imports every module's `main/index.ts` during bootstrap, before `initJazzHooks()`. Mirrors how renderer modules wire themselves; adding a module = create its `main/index.ts` + one new import line in the electron entrypoint.
- **Resolve merging strategy.** Shallow merge only. Each module owns disjoint top-level fields (Composer: `models` / `modelSummaries`; Materials: `materials`). A future overlap would require a deeper merge and is out of scope for this change.
- **Materials' shared resolve constant.** Materials exports a single `materialsCatalogResolve` constant consumed by both `syncPreloadResolve()` and `requireCatalog`, preventing the two from drifting. Detailed in the [Materials change doc](../../../../system/modules/Materials/docs/changes/2026-05-26-cc9646-main-process-module-hooks.md).

Still open:

- **`requireActiveWorkspaceHandle` import.** Composer + Materials currently import this from `electron/main/jazz.ts`. After the refactor they can keep that import (kernel API) or receive the handle through `onWorkspaceLoaded`. Proposal: keep the direct import for the IPC handlers (they already cache the handle via the kernel), and use `onWorkspaceLoaded(handle)` only for the eager backfill / subscription init paths.
- **Naming.** `MainModuleConfig` mirrors the renderer-side module config terminology in the codebase. Confirm before implementation.

Not yet implemented. No commits, no PR.

## Security

None. The registry runs in-process at boot; no new IPC channels are introduced beyond those being moved between files. Sync-URL validation, credential handling, and the `disallowRelay`/`syncOptIn` gates stay in `electron/main/jazz.ts` unchanged. Module hooks run inside the main process with the same privilege as today's inlined code.

## Performance

Neutral by design.

- The merged resolve set in `requireActiveWorkspaceHandle` is the same shape as today (sum of fields the modules already need); no extra CoValues are pulled.
- `onWorkspaceLoaded` runs in parallel via `Promise.all` so a slow module hook doesn't serialize others. The current `backfillModelSummaries` is a single sequential step; behaviour is preserved as long as Composer's hook is the sole writer of `modelSummaries`.
- Risk to watch: if a module forgets to declare `workspaceResolve` for fields it later reads via the cached handle, the read returns shallow refs and the module re-loads on demand — visible as extra `*.load` calls in the jazz log buffer. Gate this with a smoke check in dev that logs unresolved access through the cached handle.
