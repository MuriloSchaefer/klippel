import { createListenerMiddleware } from "@reduxjs/toolkit";
import {
  createModel,
  listModels,
  modelCreated,
  modelsListed,
  saveSession,
  sessionSaved,
} from "./actions";
import { workspaceSelected } from "@kernel/modules/Store/actions";
import type { GraphState } from "@kernel/modules/Graphs/store/state";
import { uniqueId } from "lodash";
import { ComposerModuleState, Model } from "../../typings";
import { persistModelState } from "./slice";

const jazz = globalThis.electron.jazz;
const middlewares = createListenerMiddleware();

/**
 * saveSession flushes the rendered model list to `.session/Composer/models`
 * as a fast-load cache. The Jazz CoValue tree in `jazz.sqlite` is the source
 * of truth for model content; this cache lets the slice rehydrate the list
 * before the first `jazz.listModels()` round-trip resolves.
 */
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
    const { dispatch } = listenerApi;

    const instanceId = uniqueId(payload.id + "-");
    const graph: GraphState = {
      id: instanceId,
      nodes: {
        garment: {
          id: "garment",
          type: "GARMENT",
          position: { x: 0, y: 0 },
          label: payload.name,
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

    try {
      await jazz.createModel({
        id: payload.id,
        name: payload.name,
        graphJson: JSON.stringify(graph),
        description: "",
      });
    } catch (err) {
      console.error("[Composer/createModel] Jazz create failed", err);
      return;
    }

    const model: Model = {
      id: payload.id,
      name: payload.name,
      svg: undefined,
      graph: "", // legacy field — paths are no longer used; CoValue is the source of truth
      description: "",
    };

    dispatch(
      modelCreated({
        model: { ...model, variationId: instanceId, instanceId, selectedPart: "garment" },
      }),
    );
    dispatch(listModels());
  },
});

// The per-workspace `.session/Composer/models` cache rehydrates the model
// list into state when a workspace is selected. For workspaces that have
// no local session cache yet — freshly joined collaborative ones — the
// rehydrate leaves state empty and the UI shows no models. Force a Jazz
// round-trip on every workspace switch so the rendered list matches the
// authoritative CoValue tree.
middlewares.startListening({
  actionCreator: workspaceSelected,
  effect: async (_, listenerApi) => {
    listenerApi.dispatch(listModels());
  },
});

middlewares.startListening({
  actionCreator: listModels,
  effect: async (_, listenerApi) => {
    const { dispatch } = listenerApi;
    let summaries;
    try {
      summaries = await jazz.listModels();
    } catch (err) {
      console.error("[Composer/listModels] Jazz list failed", err);
      dispatch(modelsListed([]));
      return;
    }
    const models: Model[] = summaries.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      // BinaryCoStream payload lands in 2b-C; until then there's no path-like
      // value the existing SVG loader can consume.
      svg: undefined,
      graph: "",
    }));
    dispatch(modelsListed(models));
  },
});

export default middlewares;
