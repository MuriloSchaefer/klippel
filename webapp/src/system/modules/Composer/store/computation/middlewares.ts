import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import {
  graphLoaded,
  nodeAdded,
  nodeRemoved,
  nodeUpdated,
  edgeAdded,
  edgeRemoved,
  edgeUpdated,
  updateNode,
} from "@kernel/modules/Graphs/store/graphInstance/actions";
import { CONVERSION_GRAPH_NAME } from "@system/modules/Converter/constants";
import { computeMaterialCost } from "../../utils/computeMaterialCost";
import type { MaterialNode } from "../../typings";

const DEBOUNCE_MS = 300;

const computationMiddlewares = createListenerMiddleware();

computationMiddlewares.startListening({
  matcher: isAnyOf(graphLoaded, nodeAdded, nodeRemoved, nodeUpdated, edgeAdded, edgeRemoved, edgeUpdated),
  effect: async (action, listenerApi) => {
    const { graphId } = (action as unknown as { payload: { graphId: string } }).payload;

    if (graphId === CONVERSION_GRAPH_NAME) return;

    // Skip write-backs from this same listener to break the cycle
    if (nodeUpdated.match(action)) {
      const keys = Object.keys(action.payload.changes ?? {});
      if (keys.length > 0 && keys.every((k) => k === "computedCost" || k === "costAudit")) return;
    }

    listenerApi.cancelActiveListeners();
    await listenerApi.delay(DEBOUNCE_MS);

    const state = listenerApi.getState() as any;
    const graphState = state.Graph?.graphs?.[graphId];
    const conversionGraphState = state.Graph?.graphs?.[CONVERSION_GRAPH_NAME];

    if (!graphState || !conversionGraphState) return;

    const materialNodes = Object.values(graphState.nodes ?? {}).filter(
      (n): n is MaterialNode => (n as any).type === "MATERIAL"
    );

    for (const materialNode of materialNodes) {
      const materialState = state.Materials?.materials[materialNode.materialId];
      if (!materialState) continue;

      const { cost, audit } = computeMaterialCost({
        materialNodeId: materialNode.id,
        graphState,
        materialState,
        conversionGraphState,
      });

      listenerApi.dispatch(
        updateNode({
          graphId,
          nodeId: materialNode.id,
          changes: { computedCost: cost, costAudit: audit },
        })
      );
    }
  },
});

export default computationMiddlewares;
