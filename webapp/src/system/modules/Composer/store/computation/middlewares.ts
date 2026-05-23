import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { batch } from "react-redux";
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
import { computeProcessTime } from "../../utils/computeProcessTime";
import { computeGraduationProcessTotals } from "../../utils/computeGraduationProcessTotals";
import type { MaterialNode, ProcessNode, GraduationNode } from "../../typings";

const DEBOUNCE_MS = 300;

const COMPUTED_WRITE_BACK_KEYS = new Set([
  "computedCost",
  "computedTotal",
  "costAudit",
  "computedTimePerUnit",
  "timeAudit",
  "computedTimeFromCostTimeHash",
  "computedProcessTime",
  "processTimeAudit",
]);

const costTimeHash = (c: ProcessNode["costTime"]): string =>
  c ? JSON.stringify(c) : "";

const computationMiddlewares = createListenerMiddleware();

computationMiddlewares.startListening({
  matcher: isAnyOf(graphLoaded, nodeAdded, nodeRemoved, nodeUpdated, edgeAdded, edgeRemoved, edgeUpdated),
  effect: async (action, listenerApi) => {
    const { graphId } = (action as unknown as { payload: { graphId: string } }).payload;

    if (graphId === CONVERSION_GRAPH_NAME) return;

    // Skip write-backs from this same listener to break the cycle
    if (nodeUpdated.match(action)) {
      const keys = Object.keys(action.payload.changes ?? {});
      if (keys.length > 0 && keys.every((k) => COMPUTED_WRITE_BACK_KEYS.has(k))) return;
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

    const materialUpdates: Array<{ nodeId: string; changes: object }> = [];
    for (const materialNode of materialNodes) {
      const materialState = state.Materials?.materials[materialNode.materialId];
      if (!materialState) continue;

      const { cost, total, audit } = computeMaterialCost({
        materialNodeId: materialNode.id,
        graphState,
        materialState,
        conversionGraphState,
      });

      materialUpdates.push({
        nodeId: materialNode.id,
        changes: { computedCost: cost, computedTotal: total, costAudit: audit },
      });
    }

    const processNodes = Object.values(graphState.nodes ?? {}).filter(
      (n): n is ProcessNode => (n as any).type === "PROCESS"
    );

    const processTimeResults: { [processNodeId: string]: ProcessNode["computedTimePerUnit"] } = {};
    const processUpdates: Array<{ nodeId: string; changes: object }> = [];
    for (const processNode of processNodes) {
      const { time, audit } = computeProcessTime({
        processNodeId: processNode.id,
        graphState,
        conversionGraphState,
      });
      processTimeResults[processNode.id] = time;
      processUpdates.push({
        nodeId: processNode.id,
        changes: {
          computedTimePerUnit: time,
          timeAudit: audit,
          computedTimeFromCostTimeHash: costTimeHash(processNode.costTime),
        },
      });
    }

    // Build a graphState snapshot with the fresh per-process results so
    // graduation totals see the just-computed values without waiting for the
    // dispatched updates to settle.
    const graphStateForGraduations = {
      ...graphState,
      nodes: Object.fromEntries(
        Object.entries(graphState.nodes ?? {}).map(([id, node]) => {
          if ((node as any).type === "PROCESS") {
            return [id, { ...(node as ProcessNode), computedTimePerUnit: processTimeResults[id] }];
          }
          return [id, node];
        })
      ),
    };

    const graduationResults = computeGraduationProcessTotals({
      graphState: graphStateForGraduations as typeof graphState,
    });

    const graduationNodes = Object.values(graphState.nodes ?? {}).filter(
      (n): n is GraduationNode => (n as any).type === "GRADUATION"
    );
    const graduationUpdates: Array<{ nodeId: string; changes: object }> = [];
    for (const g of graduationNodes) {
      const r = graduationResults[g.id];
      if (!r) continue;
      graduationUpdates.push({
        nodeId: g.id,
        changes: {
          computedProcessTime: r.computedProcessTime,
          processTimeAudit: r.processTimeAudit,
        },
      });
    }

    // Dispatch all write-backs in a single React batch — one render commit instead of three.
    batch(() => {
      for (const { nodeId, changes } of materialUpdates) {
        listenerApi.dispatch(updateNode({ graphId, nodeId, changes }));
      }
      for (const { nodeId, changes } of processUpdates) {
        listenerApi.dispatch(updateNode({ graphId, nodeId, changes }));
      }
      for (const { nodeId, changes } of graduationUpdates) {
        listenerApi.dispatch(updateNode({ graphId, nodeId, changes }));
      }
    });
  },
});

export default computationMiddlewares;
