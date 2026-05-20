import { ipcRenderer } from "electron";
import type {
  CreateModelInput,
  EditLeaseSnapshot,
  LoadedModel,
  ModelSummary,
} from "../../src/system/modules/Composer/typings";

export type JazzWorkspaceHandle = { name: string; coId: string; dir: string };
export type JazzWorkspaceIndexEntry = {
  name: string;
  coId: string;
  syncOptIn: boolean;
  syncUrl?: string;
};
export type JazzJoinWorkspaceInput = { name: string; coId: string; syncUrl: string };

export const jazzApi = {
  // Workspaces
  getAccountId: (): Promise<string | null> => ipcRenderer.invoke("jazz-get-account-id"),
  createWorkspace: (name: string): Promise<JazzWorkspaceIndexEntry> =>
    ipcRenderer.invoke("jazz-create-workspace", name),
  ensureWorkspace: (name: string): Promise<JazzWorkspaceIndexEntry> =>
    ipcRenderer.invoke("jazz-ensure-workspace", name),
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
};

export default jazzApi;
