import { Group } from "jazz-tools";
import { registerMainModule } from "../../../../../electron/main/modules";
import {
  ModelSummariesMap,
  ModelSummary,
  WorkspaceCoMap,
} from "../../../../kernel/modules/Store/schema";
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
  uploadModelDocument,
  loadModelDocument,
  deleteModelDocument,
  type UploadDocumentInput,
} from "./models";
import { saveDocumentAs, openDocumentExternally } from "./documents";
import { collectComposerMaterialUsage } from "./materialUsage";
// Through the Materials module's own export surface, not its internals — the
// catalog's storage is mid-migration and its files move.
import { materialsMain } from "../../Materials/main";

/**
 * One-time migration for pre-lazy-hydration workspaces. If
 * `modelSummaries` is absent or missing entries that exist in `models`,
 * synthesize them from the deep-resolved `ModelCoMap` bodies. Runs once
 * per process on first workspace load after upgrade; the cost (a single
 * `models.$each` deep-load) is paid only when the summary record is
 * incomplete.
 */
async function backfillModelSummaries(handle: unknown): Promise<void> {
  const w = handle as {
    $jazz: { id: string; owner: Group; set: (k: string, v: unknown) => void };
    models: Record<string, unknown>;
    modelSummaries?: Record<string, unknown> | null;
  };
  const modelIds = Object.keys(w.models ?? {});
  const summaryIds = new Set(Object.keys(w.modelSummaries ?? {}));
  if (modelIds.length > 0 && modelIds.every((id) => summaryIds.has(id))) return;

  const deep = await WorkspaceCoMap.load(w.$jazz.id, {
    resolve: { models: { $each: { $onError: "catch" } } },
  });
  if (!deep || ("$isLoaded" in deep && deep.$isLoaded === false)) return;
  const deepModels = (deep as unknown as { models: Record<string, unknown> }).models;

  const owner = w.$jazz.owner;
  let summariesRecord = w.modelSummaries as unknown as
    | (Record<string, unknown> & { $jazz: { set: (k: string, v: unknown) => void } })
    | null
    | undefined;
  if (!summariesRecord) {
    const created = ModelSummariesMap.create({}, owner);
    w.$jazz.set("modelSummaries", created);
    summariesRecord = created as unknown as typeof summariesRecord;
  }

  for (const id of modelIds) {
    if (summaryIds.has(id)) continue;
    const model = deepModels[id] as
      | undefined
      | {
          $isLoaded?: boolean;
          $jazz: { id: string; refs: { svg?: unknown } };
          id: string;
          name: string;
          description: string;
          updatedAt: number;
        };
    if (!model || model.$isLoaded === false) continue;
    const summary = ModelSummary.create(
      {
        id: model.id,
        modelCoId: model.$jazz.id,
        name: model.name,
        description: model.description,
        updatedAt: model.updatedAt,
        hasSvg: model.$jazz.refs.svg !== undefined,
      },
      owner,
    );
    summariesRecord!.$jazz.set(id, summary);
  }
}

registerMainModule({
  name: "Composer",

  workspaceResolve: () => ({
    models: true,
    modelSummaries: { $each: { $onError: "catch" }, $onError: "catch" },
  }),

  onWorkspaceLoaded: (handle) => backfillModelSummaries(handle),

  onWorkspaceClose: () => {
    // Usage counts are ids from *this* workspace's models. Carrying them into
    // the next one would rank a catalog by references that do not exist in it.
    materialsMain.invalidateRanking();
  },

  syncPreloadResolve: () => ({
    modelSummaries: { $each: { $onError: "catch" }, $onError: "catch" },
  }),

  registerIpc: ({ ipcMain }) => {
    // Tell Materials which materials its catalog page should favour. Composer
    // is the only module that knows — usage lives in model graphs, not in the
    // catalog's own edges.
    materialsMain.registerUsageProvider(collectComposerMaterialUsage);

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
      async (_event, id: string, graphJson: string) => {
        const result = await updateModelGraph(id, graphJson);
        // A save can add or drop `MATERIAL` nodes, which changes the usage
        // counts the catalog's first page is ranked by. The counts are a
        // projection in SQLite now, so re-derive them rather than only
        // dropping a cache — and do it without blocking the save.
        materialsMain.invalidateRanking();
        void materialsMain.refreshRanking().catch((err) =>
          console.error("[Composer] catalog re-rank failed", err),
        );
        return result;
      },
    );
    ipcMain.handle(
      "jazz-update-model-description",
      async (_event, id: string, description: string) =>
        updateModelDescription(id, description),
    );

    ipcMain.handle("jazz-acquire-lease", async (_event, id: string) =>
      acquireEditLease(id),
    );
    ipcMain.handle("jazz-renew-lease", async (_event, id: string) =>
      renewEditLease(id),
    );
    ipcMain.handle("jazz-release-lease", async (_event, id: string) =>
      releaseEditLease(id),
    );

    ipcMain.handle(
      "jazz-upload-model-svg",
      async (_event, id: string, svgContent: string) =>
        uploadModelSvg(id, svgContent),
    );
    ipcMain.handle("jazz-load-model-svg", async (_event, id: string) =>
      loadModelSvg(id),
    );

    // Attachments. Bytes cross the boundary as ArrayBuffer both ways — they are
    // structured-cloneable and, unlike base64, do not inflate by a third.
    ipcMain.handle(
      "jazz-upload-model-document",
      async (_event, id: string, input: UploadDocumentInput) =>
        uploadModelDocument(id, input),
    );
    ipcMain.handle(
      "jazz-load-model-document",
      async (_event, id: string, documentId: string) =>
        loadModelDocument(id, documentId),
    );
    ipcMain.handle(
      "jazz-delete-model-document",
      async (_event, id: string, documentId: string) =>
        deleteModelDocument(id, documentId),
    );
    ipcMain.handle(
      "documents:save-as",
      async (_event, input: { filename: string; bytes: ArrayBuffer }) =>
        saveDocumentAs(input),
    );
    ipcMain.handle(
      "documents:open",
      async (_event, input: { filename: string; bytes: ArrayBuffer }) =>
        openDocumentExternally(input),
    );
  },
});
