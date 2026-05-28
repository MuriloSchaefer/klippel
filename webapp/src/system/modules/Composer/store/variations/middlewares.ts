
import { createListenerMiddleware } from "@reduxjs/toolkit";

import type { GraphState, GraphsManagerState } from "@kernel/modules/Graphs/store/state";
import { loadGraph, updateNode as updateNodeAction } from "@kernel/modules/Graphs/store/graphInstance/actions";
import { saveSession, sessionSaved } from "../models/actions";
import { ComposerModuleState, MaterialNode } from "@system/modules/Composer/typings";
import { modelOpened, openModel, partSelected, selectPart, uploadSVG, svgUploaded, saveModel, modelSaved, modelSaveFailed, refreshMaterialSnapshots, materialSnapshotsRefreshed } from "./actions";
import type { MaterialsModuleState } from "@system/modules/Materials/store/state";
import { persistVariation } from "./slice";
import { loadSVG } from "@kernel/modules/SVG/store/actions";
import { sanitizeSvg } from "@kernel/modules/SVG/utils/sanitizeSvg";
import { selectSVGState } from "@kernel/modules/SVG/store/selectors";
import type { SVGModuleState } from "@kernel/modules/SVG/store/state";
import { openDetails } from "@kernel/modules/Layout/store/panels/actions";
import { setViewportHasChanged } from "@kernel/modules/Layout/store/viewports/actions";
import { selectActiveViewport } from "@kernel/modules/Layout/store/viewports/selectors";

const jazz = globalThis.electron.jazz;
const middlewares = createListenerMiddleware();

middlewares.startListening({
  actionCreator: saveSession,
  effect: async (_, listenerApi) => {
    const { dispatch, getState } = listenerApi;

    const { Composer: state } = getState() as { Composer: ComposerModuleState };
    await Promise.all(Object.values(state.variations).map(persistVariation));

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
    // Sanitize once at this boundary so the session and any later Jazz upload
    // both store the scrubbed bytes.
    const safe = sanitizeSvg(svgContent);
    dispatch(loadSVG({ content: safe, path: `${variationId}.svg`, instanceName: variationId }));

    // Mark the active viewport dirty so the Save button reflects the pending
    // SVG. Both session and Jazz persistence are deferred — session waits for
    // the next saveSession dispatch, Jazz waits for the explicit Save button.
    const activeViewport = selectActiveViewport(getState() as any);
    if (activeViewport) {
      dispatch(setViewportHasChanged({ name: activeViewport, hasChanged: true }));
    }

    dispatch(svgUploaded({ variationId, svgContent: safe }));
  },
});


middlewares.startListening({
  actionCreator: saveModel,
  effect: async ({ payload: { variationId, message, viewportName } }, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const state = getState() as {
      Composer: ComposerModuleState;
      Graph: GraphsManagerState;
      SVG: SVGModuleState;
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

      // Push the session SVG to Jazz only when there are unsaved upload
      // bytes — uploads are session-local until the user explicitly saves.
      if (variation.svgDirty) {
        const svgPath = `${variationId}.svg`;
        const svgContent = selectSVGState(svgPath)(state)
          ?.instances[variationId]?.content;
        if (svgContent) {
          await jazz.uploadModelSvg(variation.id, svgContent);
        }
      }

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

middlewares.startListening({
  actionCreator: refreshMaterialSnapshots,
  effect: async ({ payload: { variationId } }, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const state = getState() as {
      Graph: GraphsManagerState;
      Materials: MaterialsModuleState | undefined;
    };
    const graph = state.Graph?.graphs?.[variationId];
    const materials = state.Materials?.materials;
    if (!graph || !materials) {
      dispatch(materialSnapshotsRefreshed({ variationId, updated: 0 }));
      return;
    }
    let updated = 0;
    for (const node of Object.values(graph.nodes)) {
      if (node.type !== "MATERIAL") continue;
      const mNode = node as MaterialNode;
      const fresh = materials[mNode.materialId];
      if (!fresh || mNode.materialSnapshot === fresh) continue;
      dispatch(
        updateNodeAction({
          graphId: variationId,
          nodeId: mNode.id,
          changes: { ...mNode, materialSnapshot: fresh } as MaterialNode,
        }),
      );
      updated++;
    }
    const activeViewport = selectActiveViewport(getState() as any);
    if (updated > 0 && activeViewport) {
      dispatch(setViewportHasChanged({ name: activeViewport, hasChanged: true }));
    }
    dispatch(materialSnapshotsRefreshed({ variationId, updated }));
  },
});

export default middlewares;
