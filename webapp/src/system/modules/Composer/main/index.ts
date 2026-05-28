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
} from "./models";

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

  syncPreloadResolve: () => ({
    modelSummaries: { $each: { $onError: "catch" }, $onError: "catch" },
  }),

  registerIpc: ({ ipcMain }) => {
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
      async (_event, id: string, graphJson: string) =>
        updateModelGraph(id, graphJson),
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
  },
});
