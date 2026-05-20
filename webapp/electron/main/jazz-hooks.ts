import { ipcMain } from "electron";
import {
  openWorkspaceJazzNode,
  closeActiveWorkspace,
  createJazzWorkspace,
  ensureJazzWorkspace,
  joinJazzWorkspace,
  enableJazzWorkspaceSync,
  listJazzWorkspaces,
  type JoinWorkspaceInput,
  getAccountId,
} from "./jazz";
import {
  listModels,
  loadModel,
  createModel,
  updateModelGraph,
  updateModelDescription,
  acquireEditLease,
  renewEditLease,
  releaseEditLease,
  uploadModelSvg,
  loadModelSvg,
} from "../../src/system/modules/Composer/main/models";

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

  ipcMain.handle("jazz-get-account-id", async () => {
    return getAccountId();
  });

  ipcMain.handle("jazz-create-workspace", async (_event, name: string) => {
    return createJazzWorkspace(name);
  });

  ipcMain.handle("jazz-ensure-workspace", async (_event, name: string) => {
    return ensureJazzWorkspace(name);
  });

  ipcMain.handle("jazz-join-workspace", async (_event, input: JoinWorkspaceInput) => {
    return joinJazzWorkspace(input);
  });

  ipcMain.handle("jazz-enable-sync", async (_event, syncUrl: string) => {
    return enableJazzWorkspaceSync(syncUrl);
  });

  ipcMain.handle("jazz-list-workspaces", async () => {
    return listJazzWorkspaces();
  });

  // Phase 2a — Models
  ipcMain.handle("jazz-list-models", async () => listModels());
  ipcMain.handle("jazz-load-model", async (_event, id: string) => loadModel(id));
  ipcMain.handle(
    "jazz-create-model",
    async (
      _event,
      input: { id: string; name: string; graphJson: string; description?: string },
    ) => createModel(input),
  );
  ipcMain.handle(
    "jazz-update-model-graph",
    async (_event, id: string, graphJson: string) => updateModelGraph(id, graphJson),
  );
  ipcMain.handle(
    "jazz-update-model-description",
    async (_event, id: string, description: string) =>
      updateModelDescription(id, description),
  );

  // Phase 2a — Edit lease
  ipcMain.handle("jazz-acquire-lease", async (_event, id: string) =>
    acquireEditLease(id),
  );
  ipcMain.handle("jazz-renew-lease", async (_event, id: string) =>
    renewEditLease(id),
  );
  ipcMain.handle("jazz-release-lease", async (_event, id: string) =>
    releaseEditLease(id),
  );

  // Phase 2b-C — SVG via BinaryCoStream
  ipcMain.handle(
    "jazz-upload-model-svg",
    async (_event, id: string, svgContent: string) => uploadModelSvg(id, svgContent),
  );
  ipcMain.handle("jazz-load-model-svg", async (_event, id: string) => loadModelSvg(id));
}
