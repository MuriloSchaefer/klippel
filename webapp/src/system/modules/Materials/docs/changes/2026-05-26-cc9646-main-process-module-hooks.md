---
id: 2026-05-26-cc9646
name: Main-process module hooks (Materials slice)
description: Move Materials' catalog + importer IPC, the catalog deep-resolve, and the close-time subscription teardown out of electron/main/jazz-hooks.ts and electron/main/jazz.ts into system/modules/Materials/main/, registered through the new MainModuleConfig surface.
status: draft
modules: [Store, Composer, Materials]
---

## Context

Materials' main-process logic is currently split between [`system/modules/Materials/main/materials.ts`](../../main/materials.ts) + [`system/modules/Materials/main/importer/`](../../main/importer/) (correct location — catalog reads/writes, subscription source, importer worker) and three kernel files that should not know about Materials:

- [`electron/main/jazz-hooks.ts:190-342`](../../../../../../electron/main/jazz-hooks.ts#L190-L342) — the catalog IPC (`jazz-materials-load`, `jazz-materials-seed`, `jazz-materials-add`, `jazz-materials-update`, `jazz-materials-update-stock`, `jazz-materials-delete`, `jazz-materials-register-type-version`), the catalog change subscription fan-out (`jazz-materials:subscribe`/`unsubscribe`), and the importer IPC (`materials:import-xlsx`, `materials:import-finished:subscribe`/`unsubscribe`).
- [`electron/main/jazz-hooks.ts:343-348`](../../../../../../electron/main/jazz-hooks.ts#L343-L348) — `registerWorkspaceCloseHook(() => dropCatalogSubscription())`, which the file's own comment justifies as a workaround for the jazz ↔ Materials circular dep.
- [`electron/main/jazz.ts:454-466`](../../../../../../electron/main/jazz.ts#L454-L466) — the `materials: { $onError: "catch" }` clause inside `requireActiveWorkspaceHandle`.
- [`electron/main/jazz.ts:730-754`](../../../../../../electron/main/jazz.ts#L730-L754) and [`electron/main/jazz.ts:848-855`](../../../../../../electron/main/jazz.ts#L848-L855) — the large `materials: { materials: { $each: { stock, attributes, composition, caracteristics, position } }, materialTypes, industries, sellers, edges }` deep-resolve trees in `joinJazzWorkspace` and `enableJazzWorkspaceSync`. Both duplicate the resolve shape that `requireCatalog` already owns inside the Materials module.

The kernel-side refactor is described in the [Store change doc](../../../../kernel/modules/Store/docs/changes/2026-05-26-cc9646-main-process-module-hooks.md). This document covers Materials' slice.

## Change

In this module:

- New file `system/modules/Materials/main/index.ts`: imports `registerMainModule` from `electron/main/modules.ts` and calls it at module top-level with Materials' `MainModuleConfig`. Side-effecting register-on-import; the electron bootstrap (`electron/main/index.ts`) side-effect-imports this file before `initJazzHooks()` runs.

  The config:
  - `name: "Materials"`
  - `registerIpc({ ipcMain })`: registers all catalog handlers (with the existing `structuredClone` cloneability probe around `jazz-materials-load` preserved verbatim), the subscription fan-out (`jazz-materials:subscribe`/`unsubscribe` keyed by `webContents.id`), and the importer handlers + `materials:import-finished` fan-out. Code moves verbatim from `electron/main/jazz-hooks.ts`.
  - `workspaceResolve()`: returns `{ materials: { $onError: "catch" } }` — shallow ref-resolve, identical to today's clause in `requireActiveWorkspaceHandle`. The deep walk stays inside `requireCatalog` on first use.
  - `syncPreloadResolve()`: returns `{ materials: materialsCatalogResolve }` (see below).
  - `onWorkspaceClose()`: calls `dropCatalogSubscription()`. Replaces today's `registerWorkspaceCloseHook` call; the circular-dep escape hatch in `electron/main/jazz.ts` can be deleted.
  - No `onWorkspaceLoaded` — the catalog subscription is established lazily by `requireCatalog` on first IPC, so an eager hook would only duplicate work.

- New (or relocated) export `materialsCatalogResolve` in `system/modules/Materials/main/materials.ts`:
  ```ts
  export const materialsCatalogResolve = {
    materials: {
      $each: {
        stock: { $onError: "catch" },
        position: { $onError: "catch" },
        attributes: { $each: { $onError: "catch" }, $onError: "catch" },
        composition: { $each: { $onError: "catch" }, $onError: "catch" },
        caracteristics: { $each: { $onError: "catch" }, $onError: "catch" },
        $onError: "catch",
      },
      $onError: "catch",
    },
    materialTypes: { $each: { $onError: "catch" }, $onError: "catch" },
    industries: { $each: { $onError: "catch" }, $onError: "catch" },
    sellers: { $each: { $onError: "catch" }, $onError: "catch" },
    edges: { $each: { $onError: "catch" }, $onError: "catch" },
    $onError: "catch",
  } as const;
  ```
  Consumed by two callers, with no duplication:
  1. `requireCatalog` — passes it as the `resolve` for `MaterialCatalogCoMap.load`. Replaces the inline deep-resolve currently inside `requireCatalog`.
  2. `main/index.ts :: syncPreloadResolve()` — wraps it under `{ materials: … }` so the kernel's join / enable-sync preload uses the exact same shape.

  Single source of truth — the join-resolve, enable-sync-resolve, and on-demand catalog load can no longer drift.

- `system/modules/Materials/main/materials.ts`: unchanged in behaviour. Continues to import `requireActiveWorkspaceHandle` from `electron/main/jazz.ts` (kernel API kept) and to own `requireCatalog`'s deep-resolve / change-subscription state.

- The preload binding surface ([`webapp/electron/preload/jazz.ts`](../../../../../../electron/preload/jazz.ts)) doesn't change — the same channels exist, registered from Materials' folder now.

## Status notes

Draft. Decision locked: option (b) — `materialsCatalogResolve` is exported once and shared by `requireCatalog` and `syncPreloadResolve()`. No independent trees.

Still open:

- The `structuredClone` cloneability probe around `jazz-materials-load` is diagnostic scaffolding from the catalog-jazz integration. Worth flagging for removal in a follow-up once we trust the DTO converters — out of scope for this refactor.

Not yet implemented. No commits, no PR.

## Security

None. IPC channel names and payload shapes are unchanged. The `dropCatalogSubscription` close hook keeps running before the Jazz node shuts down, preserving the invariant that prevents unsubscribe-after-close errors against a closed storage adapter (the original reason `registerWorkspaceCloseHook` existed).

## Performance

Neutral, with one small win.

- Workspace open: `requireActiveWorkspaceHandle` still requests `materials` shallow; same CoValues fetched.
- Sync preload: deep resolve set is identical to today's inlined trees; same network traffic on first join / share-enable.
- Small win: the catalog change subscription's `onWorkspaceClose` callback runs in parallel with other modules' close hooks (via `Promise.all` in the new dispatcher) rather than sequentially through the legacy `workspaceCloseHooks` array. Saves a few ms on workspace switch in the common case where multiple hooks are registered.
- No change to the importer's off-thread worker behaviour.
