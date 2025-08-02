import { uniqueId } from "lodash";
import { createListenerMiddleware } from "@reduxjs/toolkit";
import { getWorkspaceFolder } from "@kernel/modules/Store/middlewares";
import type { StoreState } from "@kernel/modules/Store/state";
import type { GraphsManagerState, GraphState } from "@kernel/modules/Graphs/store/state";
import type { SVGModuleState } from "@kernel/modules/SVG/store/state";
import type { MarkdownModuleState } from "@kernel/modules/Markdown/store/state";
import type { ComposerModuleState, Model, ModelVariation } from "../../typings";
import { persistModelState } from "./slice";
import {
  createModel,
  listModels,
  modelCreated,
  modelSaved,
  modelsListed,
  saveModel,
  saveSession,
  sessionSaved,
} from "./actions";

const storage = window.electron.storage;
const middlewares = createListenerMiddleware();

middlewares.startListening({
  actionCreator: saveSession,
  effect: async (_, listenerApi) => {
    const { dispatch, getState } = listenerApi;

      const {Composer: state} = getState() as { Composer: ComposerModuleState }
      Object.values(state.models).forEach(persistModelState)

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
      graphId: payload.id,
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


middlewares.startListening({
  actionCreator: saveModel,
  effect: async ({payload}, listenerApi) => {
    const { dispatch, getState } = listenerApi;

    const currState = getState() as { Store: StoreState, SVG: SVGModuleState, Graph: GraphsManagerState, Markdown: MarkdownModuleState }
    const workspace = getWorkspaceFolder(
      getState as () => typeof currState
    );
    const rootFolder = `${workspace}/Models/${payload.id}`;
    const state: Model = {id: payload.id, name: payload.name, graph:'./graph.json'}

    //save svg
    if (payload.svg){
      const svgPath = `${rootFolder}/view.svg`
      const svg = currState.SVG.svgs[payload.svg].instances[payload.variationId]
      if (svg.content){
        storage.writeBlob(svgPath, new Blob([svg.content]))
      }
      state.svg = './view.svg'
    }

    // save graph
    const graphPath = `${rootFolder}/graph.json`
    const {searchResults, ...graphState} = currState.Graph.graphs[payload.variationId]
    storage.writeBlob(graphPath, new Blob([JSON.stringify(graphState)]))

    //save description
    let descriptionPath = null
    if (payload.description){
      descriptionPath = `${rootFolder}/description.md`
      storage.writeBlob(descriptionPath, new Blob([payload.description]))
      state.description = './description.md'
    }

    //save state
    storage.writeBlob(`${rootFolder}/model.json`, new Blob([JSON.stringify(state)]))

    
    dispatch(modelSaved(payload));
  },
});

export default middlewares;
