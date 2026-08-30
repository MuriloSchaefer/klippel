import { registerMainModule } from "../../../../../electron/main/modules";
import {
  onCatalogChange,
  dropCatalogShadow,
  dropCatalogSubscription,
  materialsCatalogResolve,
  trackClientWindow,
} from "./materials";
// Reads are answered from SQLite and writes are mirrored into it; Jazz is
// still the store of record underneath. See `catalogService.ts` and
// `src/docs/jazz-is-dead.md`.
import {
  loadMaterialsCatalog,
  loadMaterialsWindow,
  computeCatalogDelta,
  getMaterial,
  appendCatalogChunk,
  seedCatalogIfEmpty,
  addMaterial,
  updateMaterial,
  updateMaterialStock,
  deleteMaterial,
  registerMaterialTypeVersion,
} from "./catalogService";
import { resetCatalogMigration } from "./catalogMigration";
import { resetCatalogClients, refreshCatalogRanking } from "./catalogService";
import { invalidateCatalogRanking } from "./materials";
import { registerMaterialUsageProvider } from "./usage";
import { closeWorkspaceDb } from "../../../../../electron/main/db";

/**
 * What other main-process modules may use.
 *
 * This file is the module's export surface: the tables, the SQL in
 * `queries/`, and the readers and writers over them are internal, so they can
 * change together without a caller elsewhere pinning one of them. A module
 * that reaches past this — importing `catalogService` or `materials` directly —
 * is coupling itself to an implementation that is mid-migration.
 */
export const materialsMain = {
  /**
   * Contribute usage counts ("in how many models does this material appear").
   * The catalog cannot answer it: usage lives in Composer's model graphs.
   */
  registerUsageProvider: registerMaterialUsageProvider,
  /**
   * A model's material references changed — drop the cached counts and
   * re-derive the ranking the first catalog page is ordered by.
   */
  invalidateRanking: invalidateCatalogRanking,
  refreshRanking: refreshCatalogRanking,
} as const;
import { runImportXlsx, onImportFinished } from "./importer";
import type {
  AddMaterialInput,
  CatalogWindowRequest,
  MaterialTypeVersionDTO,
  SeedCatalogInput,
  UpdateMaterialInput,
  UpdateMaterialStockInput,
} from "../typings/catalog";

registerMainModule({
  name: "Materials",

  workspaceResolve: () => ({
    materials: { $onError: "catch" },
  }),

  syncPreloadResolve: () => ({
    materials: materialsCatalogResolve,
  }),

  onWorkspaceClose: () => {
    // Detach the Jazz subscription before the node shuts down — the
    // per-renderer listeners stay registered and pick the new
    // workspace's catalog back up on the next `requireCatalog`.
    dropCatalogSubscription();
    // The SQLite store is per workspace too: close the handle and forget that
    // this one was projected, or the next workspace would read the last one's
    // catalog.
    resetCatalogMigration();
    resetCatalogClients();
    closeWorkspaceDb();
  },

  registerIpc: ({ ipcMain }) => {
    ipcMain.handle("jazz-materials-load", async (event) => {
      try {
        const snapshot = await loadMaterialsCatalog(String(event.sender.id));
        // Force a structured-clone round-trip in main so a non-cloneable
        // value (typically a leaked Jazz proxy) blows up here — with a
        // useful path — instead of in Electron's IPC layer where the
        // error is opaque "An object could not be cloned".
        try {
          structuredClone(snapshot);
        } catch (cloneErr) {
          console.error(
            "[jazz-materials-load] snapshot is not structured-cloneable",
            cloneErr,
            "\nsnapshot keys:",
            {
              materials: Object.keys(snapshot.materials),
              materialTypes: Object.keys(snapshot.materialTypes),
              industries: Object.keys(snapshot.industries),
              sellers: Object.keys(snapshot.sellers),
              edges: Object.keys(snapshot.edges),
            },
          );
          const sections: Array<[string, Record<string, unknown>]> = [
            ["materials", snapshot.materials],
            ["materialTypes", snapshot.materialTypes],
            ["industries", snapshot.industries],
            ["sellers", snapshot.sellers],
            ["edges", snapshot.edges],
          ];
          for (const [section, record] of sections) {
            for (const [id, entry] of Object.entries(record)) {
              try {
                structuredClone(entry);
              } catch (entryErr) {
                console.error(
                  `[jazz-materials-load] non-cloneable entry at ${section}.${id}`,
                  entryErr,
                  "entry:",
                  entry,
                );
              }
            }
          }
          throw new Error(
            `loadMaterialsCatalog snapshot contains non-cloneable value: ${
              cloneErr instanceof Error ? cloneErr.message : String(cloneErr)
            }`,
          );
        }
        return snapshot;
      } catch (err) {
        console.error("[jazz-materials-load] loadMaterialsCatalog threw", err);
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`loadMaterialsCatalog failed: ${message}`);
      }
    });
    // Windowed read — the production load path. Keyed on `event.sender.id`
    // because the answer defines what that renderer mirrors, which is what
    // scopes its subsequent deltas (see `loadMaterialsWindow`). The full
    // `jazz-materials-load` above is retained for the perf harness and for
    // any caller that genuinely wants the whole catalog; nothing in the app
    // dispatches it any more.
    ipcMain.handle(
      "jazz-materials-load-window",
      async (event, request: CatalogWindowRequest) => {
        try {
          return await loadMaterialsWindow(String(event.sender.id), request ?? {});
        } catch (err) {
          console.error("[jazz-materials-load-window] threw", err, request);
          const message = err instanceof Error ? err.message : String(err);
          throw new Error(`loadMaterialsWindow failed: ${message}`);
        }
      },
    );
    // Delta read — the normal answer to a `jazz-materials:changed` tick.
    // Keyed on `event.sender.id` so each renderer gets its own "since",
    // and one renderer consuming a delta can't starve another.
    ipcMain.handle("jazz-materials-load-delta", async (event) => {
      try {
        return await computeCatalogDelta(String(event.sender.id));
      } catch (err) {
        console.error("[jazz-materials-load-delta] threw", err);
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`computeCatalogDelta failed: ${message}`);
      }
    });
    ipcMain.handle(
      "jazz-materials-get",
      async (_event, id: string) => getMaterial(id),
    );
    ipcMain.handle(
      "jazz-materials-seed",
      async (_event, input: SeedCatalogInput) => seedCatalogIfEmpty(input),
    );
    // Batched fixture seeding for the 10k perf tier (e2e-tests.md §11.2).
    // Append-only and unconditional — see `appendCatalogChunk`.
    ipcMain.handle(
      "jazz-materials-seed-chunk",
      async (_event, input: SeedCatalogInput) => appendCatalogChunk(input),
    );
    ipcMain.handle(
      "jazz-materials-add",
      async (event, input: AddMaterialInput) =>
        addMaterial(input, String(event.sender.id)),
    );
    ipcMain.handle(
      "jazz-materials-update",
      async (_event, input: UpdateMaterialInput) => updateMaterial(input),
    );
    ipcMain.handle(
      "jazz-materials-update-stock",
      async (_event, input: UpdateMaterialStockInput) =>
        updateMaterialStock(input),
    );
    ipcMain.handle(
      "jazz-materials-delete",
      async (_event, id: string) => deleteMaterial(id),
    );
    ipcMain.handle(
      "jazz-materials-register-type-version",
      async (
        _event,
        input: MaterialTypeVersionDTO & { predecessorId?: string },
      ) => registerMaterialTypeVersion(input),
    );

    // Catalog change subscription — when the main-side Jazz node observes
    // a mutation to the active workspace's `MaterialCatalogCoMap` (local
    // edit or remote sync), `onCatalogChange` fires; we forward the tick
    // to every renderer that subscribed via `jazz-materials:subscribe`.
    const materialsListeners = new Map<number, () => void>();
    ipcMain.handle("jazz-materials:subscribe", (event) => {
      const wcId = event.sender.id;
      // A (re)subscribe means this renderer started over — a fresh boot, or a
      // reload, which keeps the same `webContents.id` but empties Redux. Drop
      // its delta shadow, so main stops believing it is up to date.
      dropCatalogShadow(String(wcId));
      // Then declare it windowed, holding nothing. Every app renderer is: it
      // loads pages, not the catalog. Saying so here rather than waiting for
      // its first window read closes the race in between — a tick landing in
      // that gap would otherwise find no window on record, read that as "this
      // client wants everything", and answer with a full snapshot, which is
      // exactly the whole-catalog load windowing replaces. An empty window is
      // the honest description of a renderer that has just started over.
      trackClientWindow(String(wcId), [], { reset: true });
      materialsListeners.get(wcId)?.();
      const off = onCatalogChange(() => {
        if (event.sender.isDestroyed()) return;
        event.sender.send("jazz-materials:changed");
      });
      materialsListeners.set(wcId, off);
      event.sender.once("destroyed", () => {
        materialsListeners.get(wcId)?.();
        materialsListeners.delete(wcId);
      });
      return { success: true } as const;
    });
    ipcMain.handle("jazz-materials:unsubscribe", (event) => {
      const wcId = event.sender.id;
      materialsListeners.get(wcId)?.();
      materialsListeners.delete(wcId);
      return { success: true } as const;
    });

    // Import job — renderer hands over the xlsx bytes; main parses and
    // writes off-thread. The handler returns the `jobId` immediately;
    // completion (or top-level failure) lands on `materials:import-finished`.
    ipcMain.handle(
      "materials:import-xlsx",
      async (_event, buffer: ArrayBuffer | Uint8Array) => {
        const arrayBuffer =
          buffer instanceof Uint8Array
            ? buffer.buffer.slice(
                buffer.byteOffset,
                buffer.byteOffset + buffer.byteLength,
              )
            : buffer;
        return runImportXlsx(arrayBuffer as ArrayBuffer);
      },
    );
    const importFinishedListeners = new Map<number, () => void>();
    ipcMain.handle("materials:import-finished:subscribe", (event) => {
      const wcId = event.sender.id;
      importFinishedListeners.get(wcId)?.();
      const off = onImportFinished((payload) => {
        if (event.sender.isDestroyed()) return;
        event.sender.send("materials:import-finished", payload);
      });
      importFinishedListeners.set(wcId, off);
      event.sender.once("destroyed", () => {
        importFinishedListeners.get(wcId)?.();
        importFinishedListeners.delete(wcId);
      });
      return { success: true } as const;
    });
    ipcMain.handle("materials:import-finished:unsubscribe", (event) => {
      const wcId = event.sender.id;
      importFinishedListeners.get(wcId)?.();
      importFinishedListeners.delete(wcId);
      return { success: true } as const;
    });
  },
});
