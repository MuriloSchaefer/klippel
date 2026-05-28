import { ipcMain } from "electron";
import {
  clearBuffer as clearSyncLogBuffer,
  installCojsonLogTap,
  setEmitEnabled as setSyncLogEmitEnabled,
  snapshot as snapshotSyncLogs,
  subscribe as subscribeSyncLogs,
  type SyncLogEntry,
} from "./jazzLogBuffer";
import {
  openWorkspaceJazzNode,
  closeActiveWorkspace,
  createJazzWorkspace,
  ensureJazzWorkspace,
  refreshJazzWorkspace,
  joinJazzWorkspace,
  enableJazzWorkspaceSync,
  listJazzWorkspaces,
  type JoinWorkspaceInput,
  getAccountId,
  getSyncStatus,
} from "./jazz";
import { getMainModules } from "./modules";

export function initJazzHooks() {
  ipcMain.handle("jazz-open-workspace", async (_event, name: string) => {
    await closeActiveWorkspace();
    const ws = await openWorkspaceJazzNode(name);
    return { name: ws.name, coId: ws.coId, dir: ws.dir };
  });

  ipcMain.handle("jazz-close-workspace", async () => {
    await closeActiveWorkspace();
    return true;
  });

  ipcMain.handle("jazz-sync-status", async () => getSyncStatus());

  // --- Sync log streaming -------------------------------------------------
  // The cojson `LogSystem` tap feeds a 500-entry ring buffer. Renderers
  // subscribe by calling `jazz-sync-logs:subscribe` (returns an
  // initial snapshot) and receive subsequent updates as
  // `jazz-sync-logs:batch` events. Subscriptions are keyed by
  // `webContents.id` so the unsubscribe handler can target the right
  // listener even after the renderer has been navigated away.
  installCojsonLogTap();

  const subscriptions = new Map<number, () => void>();

  ipcMain.handle("jazz-sync-logs:snapshot", async () => snapshotSyncLogs());

  ipcMain.handle("jazz-sync-logs:clear", async () => {
    clearSyncLogBuffer();
    return { success: true } as const;
  });

  ipcMain.handle("jazz-sync-logs:set-enabled", async (_event, enabled: boolean) => {
    setSyncLogEmitEnabled(enabled);
    return { success: true, enabled } as const;
  });

  ipcMain.handle("jazz-sync-logs:subscribe", async (event) => {
    const wcId = event.sender.id;
    subscriptions.get(wcId)?.();
    const unsubscribe = subscribeSyncLogs((batch: SyncLogEntry[]) => {
      if (event.sender.isDestroyed()) return;
      event.sender.send("jazz-sync-logs:batch", batch);
    });
    subscriptions.set(wcId, unsubscribe);
    event.sender.once("destroyed", () => {
      subscriptions.get(wcId)?.();
      subscriptions.delete(wcId);
    });
    return snapshotSyncLogs();
  });

  ipcMain.handle("jazz-sync-logs:unsubscribe", async (event) => {
    const wcId = event.sender.id;
    subscriptions.get(wcId)?.();
    subscriptions.delete(wcId);
    return { success: true } as const;
  });

  ipcMain.handle("jazz-get-account-id", async () => getAccountId());

  ipcMain.handle("jazz-create-workspace", async (_event, name: string) =>
    createJazzWorkspace(name),
  );

  ipcMain.handle("jazz-ensure-workspace", async (_event, name: string) =>
    ensureJazzWorkspace(name),
  );

  ipcMain.handle("jazz-refresh-workspace", async (_event, name: string) =>
    refreshJazzWorkspace(name),
  );

  ipcMain.handle("jazz-join-workspace", async (_event, input: JoinWorkspaceInput) =>
    joinJazzWorkspace(input),
  );

  ipcMain.handle("jazz-enable-sync", async (_event, syncUrl: string) =>
    enableJazzWorkspaceSync(syncUrl),
  );

  ipcMain.handle("jazz-list-workspaces", async () => listJazzWorkspaces());

  // Module-owned IPC. Each system module's `main/index.ts` registered a
  // `MainModuleConfig` via `registerMainModule`; the configs' `registerIpc`
  // hooks attach their own handlers (Composer: models/lease/SVG;
  // Materials: catalog + importer + change subscription).
  for (const m of getMainModules()) {
    m.registerIpc?.({ ipcMain });
  }
}
