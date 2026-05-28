import { ipcRenderer } from "electron";
import type {
  CreateModelInput,
  EditLeaseSnapshot,
  LoadedModel,
  ModelSummary,
} from "../../src/system/modules/Composer/typings";
import type {
  AddMaterialInput,
  CatalogSnapshot,
  MaterialDTO,
  MaterialTypeVersionDTO,
  SeedCatalogInput,
  UpdateMaterialInput,
  UpdateMaterialStockInput,
} from "../../src/system/modules/Materials/typings/catalog";

export type JazzWorkspaceHandle = { name: string; coId: string; dir: string };
export type JazzWorkspaceIndexEntry = {
  name: string;
  coId: string;
  syncOptIn: boolean;
  syncUrl?: string;
};
export type JazzJoinWorkspaceInput = { name: string; coId: string; syncUrl: string };

export interface JazzSyncStatus {
  workspaceName: string | null;
  workspaceCoId: string | null;
  syncUrl: string | null;
  syncOptIn: boolean;
  peers: string[];
  connected: boolean;
  accountId: string | null;
}

export interface SyncLogEntry {
  id: number;
  ts: number;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  attributes?: Record<string, unknown>;
}

export type SyncLogListener = (batch: SyncLogEntry[]) => void;

export const jazzApi = {
  // Workspaces
  syncStatus: (): Promise<JazzSyncStatus> => ipcRenderer.invoke("jazz-sync-status"),

  /**
   * Sync log streaming. `subscribe(listener)` returns an initial
   * snapshot synchronously (well, after the IPC round-trip) and
   * pushes subsequent batches via the listener. The returned
   * `unsubscribe` thunk both detaches the renderer-side listener and
   * tells the main process to stop emitting batches for this
   * `webContents`. Always call `unsubscribe()` on unmount.
   */
  syncLogs: {
    snapshot: (): Promise<SyncLogEntry[]> =>
      ipcRenderer.invoke("jazz-sync-logs:snapshot"),
    clear: (): Promise<{ success: true }> =>
      ipcRenderer.invoke("jazz-sync-logs:clear"),
    setEnabled: (enabled: boolean): Promise<{ success: true; enabled: boolean }> =>
      ipcRenderer.invoke("jazz-sync-logs:set-enabled", enabled),
    subscribe: async (
      listener: SyncLogListener,
    ): Promise<{ initial: SyncLogEntry[]; unsubscribe: () => void }> => {
      const handler = (_event: unknown, batch: SyncLogEntry[]) => listener(batch);
      ipcRenderer.on("jazz-sync-logs:batch", handler);
      const initial: SyncLogEntry[] = await ipcRenderer.invoke(
        "jazz-sync-logs:subscribe",
      );
      return {
        initial,
        unsubscribe: () => {
          ipcRenderer.removeListener("jazz-sync-logs:batch", handler);
          // Fire-and-forget — if the renderer is tearing down the
          // main-process subscription map will also clean up on
          // `webContents.destroyed`, so we don't need to await.
          void ipcRenderer.invoke("jazz-sync-logs:unsubscribe");
        },
      };
    },
  },
  getAccountId: (): Promise<string | null> => ipcRenderer.invoke("jazz-get-account-id"),
  createWorkspace: (name: string): Promise<JazzWorkspaceIndexEntry> =>
    ipcRenderer.invoke("jazz-create-workspace", name),
  ensureWorkspace: (name: string): Promise<JazzWorkspaceIndexEntry> =>
    ipcRenderer.invoke("jazz-ensure-workspace", name),
  refreshWorkspace: (name: string): Promise<JazzWorkspaceIndexEntry> =>
    ipcRenderer.invoke("jazz-refresh-workspace", name),
  joinWorkspace: (input: JazzJoinWorkspaceInput): Promise<JazzWorkspaceIndexEntry> =>
    ipcRenderer.invoke("jazz-join-workspace", input),
  enableSync: (syncUrl: string): Promise<JazzWorkspaceIndexEntry> =>
    ipcRenderer.invoke("jazz-enable-sync", syncUrl),
  listWorkspaces: (): Promise<JazzWorkspaceIndexEntry[]> =>
    ipcRenderer.invoke("jazz-list-workspaces"),
  openWorkspace: (name: string): Promise<JazzWorkspaceHandle> =>
    ipcRenderer.invoke("jazz-open-workspace", name),
  closeWorkspace: (): Promise<boolean> => ipcRenderer.invoke("jazz-close-workspace"),

  // Models
  listModels: (): Promise<ModelSummary[]> => ipcRenderer.invoke("jazz-list-models"),
  loadModel: (id: string): Promise<LoadedModel | null> =>
    ipcRenderer.invoke("jazz-load-model", id),
  createModel: (input: CreateModelInput): Promise<ModelSummary> =>
    ipcRenderer.invoke("jazz-create-model", input),
  updateModelGraph: (id: string, graphJson: string): Promise<void> =>
    ipcRenderer.invoke("jazz-update-model-graph", id, graphJson),
  updateModelDescription: (id: string, description: string): Promise<void> =>
    ipcRenderer.invoke("jazz-update-model-description", id, description),

  // Edit lease
  acquireLease: (id: string): Promise<EditLeaseSnapshot> =>
    ipcRenderer.invoke("jazz-acquire-lease", id),
  renewLease: (id: string): Promise<EditLeaseSnapshot> =>
    ipcRenderer.invoke("jazz-renew-lease", id),
  releaseLease: (id: string): Promise<void> => ipcRenderer.invoke("jazz-release-lease", id),

  // SVG (BinaryCoStream)
  uploadModelSvg: (id: string, svgContent: string): Promise<{ coId: string }> =>
    ipcRenderer.invoke("jazz-upload-model-svg", id, svgContent),
  loadModelSvg: (id: string): Promise<string | null> =>
    ipcRenderer.invoke("jazz-load-model-svg", id),

  // Materials catalog
  materials: {
    load: (): Promise<CatalogSnapshot> =>
      ipcRenderer.invoke("jazz-materials-load"),
    seed: (input: SeedCatalogInput): Promise<{ seeded: boolean }> =>
      ipcRenderer.invoke("jazz-materials-seed", input),
    addMaterial: (input: AddMaterialInput): Promise<MaterialDTO> =>
      ipcRenderer.invoke("jazz-materials-add", input),
    updateMaterial: (input: UpdateMaterialInput): Promise<void> =>
      ipcRenderer.invoke("jazz-materials-update", input),
    updateMaterialStock: (input: UpdateMaterialStockInput): Promise<void> =>
      ipcRenderer.invoke("jazz-materials-update-stock", input),
    deleteMaterial: (id: string): Promise<void> =>
      ipcRenderer.invoke("jazz-materials-delete", id),
    registerTypeVersion: (
      input: MaterialTypeVersionDTO & { predecessorId?: string },
    ): Promise<void> =>
      ipcRenderer.invoke("jazz-materials-register-type-version", input),
    /**
     * Subscribe to catalog mutations on the active workspace. Fires
     * whenever a local mutator or a remote peer changes the
     * `MaterialCatalogCoMap`; the listener is called with no
     * arguments and is expected to re-fetch via
     * `jazz.materials.load()`. Returns an unsubscribe thunk.
     */
    onChanged: (listener: () => void): (() => void) => {
      const handler = () => listener();
      ipcRenderer.on("jazz-materials:changed", handler);
      void ipcRenderer.invoke("jazz-materials:subscribe");
      return () => {
        ipcRenderer.removeListener("jazz-materials:changed", handler);
        void ipcRenderer.invoke("jazz-materials:unsubscribe");
      };
    },
    /**
     * Schedule an xlsx import job in the main process. Resolves as
     * soon as the job is queued (not when the import finishes); use
     * `onImportFinished` for the completion summary.
     */
    importXlsx: (buffer: ArrayBuffer): Promise<{ jobId: string }> =>
      ipcRenderer.invoke("materials:import-xlsx", buffer),
    /**
     * Subscribe to `materials:import-finished` push events. Listener
     * receives the per-job summary (added types/materials, skipped
     * rows, errors). Returns an unsubscribe thunk.
     */
    onImportFinished: (
      listener: (payload: ImportFinishedEvent) => void,
    ): (() => void) => {
      const handler = (
        _event: unknown,
        payload: ImportFinishedEvent,
      ): void => listener(payload);
      ipcRenderer.on("materials:import-finished", handler);
      void ipcRenderer.invoke("materials:import-finished:subscribe");
      return () => {
        ipcRenderer.removeListener("materials:import-finished", handler);
        void ipcRenderer.invoke("materials:import-finished:unsubscribe");
      };
    },
  },
};

export interface ImportFinishedEvent {
  jobId: string;
  ok: boolean;
  addedTypes: number;
  addedMaterials: number;
  skipped: Array<{ kind: "type" | "material"; id: string; reason: string }>;
  errors: Array<{ sheet: string; row: number; message: string }>;
  errorCode?: string;
  errorMessage?: string;
}

export default jazzApi;
