
import { createListenerMiddleware } from "@reduxjs/toolkit";

import type { GraphState, GraphsManagerState } from "@kernel/modules/Graphs/store/state";
import { loadGraph } from "@kernel/modules/Graphs/store/graphInstance/actions";
import { saveSession, sessionSaved } from "../models/actions";
import { ComposerModuleState } from "@system/modules/Composer/typings";
import { modelOpened, openModel, partSelected, selectPart, uploadSVG, svgUploaded, saveModel, modelSaved, modelSaveFailed  } from "./actions";
import { persistVariation } from "./slice";
import { loadSVG } from "@kernel/modules/SVG/store/actions";
import { openDetails } from "@kernel/modules/Layout/store/panels/actions";
import { setViewportHasChanged } from "@kernel/modules/Layout/store/viewports/actions";

const jazz = globalThis.electron.jazz;
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
    const { dispatch } = listenerApi;

    const loaded = await jazz.loadModel(model.id);
    if (!loaded) {
      console.error(`[openModel] No CoValue for model id=${model.id}`);
      return;
    }
    const parsed = JSON.parse(loaded.graphJson) as GraphState;
    const graphState: GraphState = {
      ...parsed,
      id: variationId,
      adjacencyList: parsed.adjacencyList ?? {},
      searchResults: parsed.searchResults ?? {},
    };

    dispatch(loadGraph({ graphId: variationId, graph: graphState }));
    dispatch(selectPart({ variationId, partId: "garment" }));
    dispatch(openDetails());

    // The variations slice gates `SVGView` on `variation.svg` being truthy
    // (sentinel `${variationId}.svg`, kept for compat with the file-based
    // path field). Pre-set it here so the empty state doesn't flash when
    // the model is reopened with a previously-uploaded SVG.
    const svgSentinel = loaded.hasSvg ? `${variationId}.svg` : undefined;
    dispatch(
      modelOpened({
        model: {
          ...model,
          svg: svgSentinel,
          variationId,
          instanceId: variationId,
          selectedPart: "garment",
        },
      }),
    );

    if (loaded.hasSvg) {
      try {
        const svgContent = await jazz.loadModelSvg(model.id);
        if (svgContent) {
          dispatch(loadSVG({ content: svgContent, path: `${variationId}.svg`, instanceName: variationId }));
        }
      } catch (err) {
        console.error(`[openModel] failed to load SVG for ${model.id}`, err);
      }
    }
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
    // Mount in the SVG slice first so the editor shows the new SVG immediately;
    // the Jazz upload below is the persistence step.
    dispatch(loadSVG({ content: svgContent, path: `${variationId}.svg`, instanceName: variationId }));

    try {
      await jazz.uploadModelSvg(variation.id, svgContent);
    } catch (err) {
      console.error(`[uploadSVG] Jazz upload failed for ${variation.id}`, err);
    }

    dispatch(svgUploaded({ variationId, svgContent }));
  },
});


middlewares.startListening({
  actionCreator: saveModel,
  effect: async ({ payload: { variationId, message, viewportName } }, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const state = getState() as {
      Composer: ComposerModuleState;
      Graph: GraphsManagerState;
    };
    const variation = state.Composer.variations[variationId];
    if (!variation) {
      console.warn(`[saveModel] no variation for id=${variationId}`);
      return;
    }
    const graphState = state.Graph?.graphs?.[variationId];
    if (!graphState) {
      dispatch(
        modelSaveFailed({
          variationId,
          modelId: variation.id,
          error: "Graph state not found",
        }),
      );
      return;
    }

    // Strip transient search results before serializing — they are derived
    // and would bloat the CRDT history without semantic value.
    const { searchResults: _drop, ...persistable } = graphState;
    void _drop;
    const graphJson = JSON.stringify(persistable);

    try {
      // Lease lifecycle is best-effort here; Phase 2c will renew on focus
      // and surface the read-only banner on the non-holder.
      try {
        await jazz.acquireLease(variation.id);
      } catch (err) {
        // Already held by us → fine. Held by another peer → updateModelGraph
        // will reject below and we surface the error.
        console.debug("[saveModel] acquireLease threw", err);
      }
      await jazz.updateModelGraph(variation.id, graphJson);
      // commit message is not yet persisted as a CoValue — see Phase 9 audit.
      // For now we just echo it in the event for downstream listeners.
      if (viewportName) {
        dispatch(setViewportHasChanged({ name: viewportName, hasChanged: false }));
      }
      dispatch(modelSaved({ variationId, modelId: variation.id, message }));
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      dispatch(modelSaveFailed({ variationId, modelId: variation.id, error: reason }));
    }
  },
});

export default middlewares;
