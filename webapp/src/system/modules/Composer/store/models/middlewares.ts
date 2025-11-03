import { createListenerMiddleware } from "@reduxjs/toolkit";
import {
  createModel,
  listModels,
  modelCreated,
  modelsListed,
  saveSession,
  sessionSaved,
} from "./actions";
import { StoreState } from "@kernel/modules/Store/state";
import { getWorkspaceFolder } from "@kernel/modules/Store/middlewares";
import type { GraphState } from "@kernel/modules/Graphs/store/state";
import { persistModelState } from "./slice";
import { uniqueId } from "lodash";
import { ComposerModuleState, Model } from "../../typings";

const storage = globalThis.electron.storage;
const middlewares = createListenerMiddleware();

middlewares.startListening({
  actionCreator: saveSession,
  effect: async (_, listenerApi) => {
    const { dispatch, getState } = listenerApi;

    const { Composer: state } = getState() as { Composer: ComposerModuleState };
    Object.values(state.models).forEach(persistModelState);

    dispatch(sessionSaved());
  },
});

middlewares.startListening({
  actionCreator: createModel,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch, getState } = listenerApi;

    const workspace = getWorkspaceFolder(
      getState as () => { Store: StoreState }
    );
    storage.ensureDir(`${workspace}/Models/${payload.id}`);

    const instanceId = uniqueId(payload.id + "-");
    const model: Model = {
      id: payload.id,
      name: payload.name,
      svg: undefined,
      graph: "./graph.json",
      description: "./description.md",
    };

    const graph: GraphState = {
      id: instanceId,
      nodes: {
        garment: {
          id: "garment",
          type: "GARMENT",
          position: { x: 0, y: 0 },
          label: model.name,
        },
      },
      edges: {},
      adjacencyList: {
        garment: {
          inputs: [],
          outputs: [],
        },
      },
      searchResults: {},
    };

    await storage.writeBlob(
      `${workspace}/Models/${payload.id}/graph.json`,
      new Blob([JSON.stringify(graph)]),
      { encoding: "utf-8" }
    );
    await storage.writeBlob(
      `${workspace}/Models/${payload.id}/model.json`,
      new Blob([JSON.stringify(model)]),
      { encoding: "utf-8" }
    );
    await storage.writeBlob(
      `${workspace}/Models/${payload.id}/description.md`,
      new Blob([""]),
      { encoding: "utf-8" }
    );

    dispatch(
      modelCreated({ model: { ...model, variationId: instanceId, instanceId, selectedPart: 'garment' } })
    );
    dispatch(listModels());
  },
});

middlewares.startListening({
  actionCreator: listModels,
  effect: async (_, listenerApi) => {
    const { dispatch, getState } = listenerApi;

    const workspace = getWorkspaceFolder(
      getState as () => { Store: StoreState }
    );
    const rootFolder = `${workspace}/Models`;
    const entries = await storage.searchDir<string[]>(
      rootFolder,
      ["**/model.json"],
      {}
    );

    const models = await Promise.all(
      entries.map(async (filePath) => {
        const folder = filePath.split("/").slice(0, -1).join("/");
        const state = JSON.parse(
          await storage.readFile(`${rootFolder}/${filePath}`, {
            encoding: "utf-8",
          })
        );
        return {
          ...state,
          description: `${rootFolder}/${folder}/${state.description}`,
          graph: `${rootFolder}/${folder}/${state.graph}`,
          svg: state.svg ? `${rootFolder}/${folder}/${state.svg}` : undefined,
        };
      })
    );

    dispatch(modelsListed(models));
  },
});

export default middlewares;
