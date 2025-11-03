
import { createListenerMiddleware } from "@reduxjs/toolkit";

import { StoreState } from "@kernel/modules/Store/state";
import { getWorkspaceFolder } from "@kernel/modules/Store/middlewares";
import type { GraphState } from "@kernel/modules/Graphs/store/state";
import { loadGraph } from "@kernel/modules/Graphs/store/graphInstance/actions";
import { saveSession, sessionSaved } from "../models/actions";
import { ComposerModuleState } from "@system/modules/Composer/typings";
import { modelOpened, openModel, partSelected, selectPart, uploadSVG, svgUploaded  } from "./actions";
import { persistVariation } from "./slice";
import { LayoutState } from "@kernel/modules/Layout/store/state";
import { loadSVG } from "@kernel/modules/SVG/store/actions";
import { openDetails } from "@kernel/modules/Layout/store/panels/actions";

const storage = globalThis.electron.storage;
const middlewares = createListenerMiddleware();

middlewares.startListening({
  actionCreator: saveSession,
  effect: async (_, listenerApi) => {
    const { dispatch, getState } = listenerApi;

    const { Composer: state } = getState() as { Composer: ComposerModuleState };
    Object.values(state.variations).forEach(persistVariation);

    dispatch(sessionSaved());
  },
});


middlewares.startListening({
  actionCreator: openModel,
  effect: async ({ payload: { model, variationId } }, listenerApi) => {
    const { dispatch, } = listenerApi;
    const getState = listenerApi.getState as () => { Store: StoreState, Layout: LayoutState }
    const workspace = getWorkspaceFolder(getState);
    const rootFolder = `${workspace}/Models/${model.id}`;

    const graphState = JSON.parse(
      await storage.readFile(`${rootFolder}/graph.json`, {
        encoding: "utf-8",
      })
    ) as GraphState;

    dispatch(loadGraph({ graphId: variationId, graph: {...graphState, id: variationId} }));
    dispatch(selectPart({ variationId, partId: "garment" }));
    dispatch(openDetails());
    dispatch(modelOpened({ model: {...model, variationId, instanceId: variationId, selectedPart: 'garment'} }));
  },
});

middlewares.startListening({
  actionCreator: selectPart,
  effect: async ({ payload: { variationId, partId } }, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const { Composer: state } = getState() as { Composer: ComposerModuleState };
    const variation = state.variations[variationId];
    if (!variation) {
      console.warn(`Variation with id ${variationId} not found`);
      return;
    }
    dispatch(openDetails())
    dispatch(partSelected({ variationId, partId }));
  },
});

middlewares.startListening({
  actionCreator: uploadSVG,
  effect: async ({ payload: { variationId, svgContent } }, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const { Composer: state } = getState() as { Composer: ComposerModuleState };
    const variation = state.variations[variationId];
    if (!variation) {
      console.warn(`Variation with id ${variationId} not found`);
      return;
    }
    dispatch(loadSVG({ content: svgContent, path: `${variationId}.svg`, instanceName: variationId }));
    // Update SVG in variation and persist
    dispatch(svgUploaded({ variationId, svgContent }));
  },
});


export default middlewares;
