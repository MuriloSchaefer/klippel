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
import { materialTypeVersionRegistered } from "@system/modules/Materials/store/materials/actions";
import { resolveTypeSchema } from "@system/modules/Materials/store/materialTypes/resolveTypeSchema";
import { computeMaterialCost } from "../../utils/computeMaterialCost";
import { computeLogoCost } from "../../utils/computeLogoCost";
import { computeProcessTime } from "../../utils/computeProcessTime";
import { computeGraduationProcessTotals } from "../../utils/computeGraduationProcessTotals";
import type { MaterialNode, ProcessNode, GraduationNode, LogoNode } from "../../typings";

const DEBOUNCE_MS = 300;

const COMPUTED_WRITE_BACK_KEYS = new Set([
  "computedCost",
  "computedTotal",
  "computedStockEquivalentCost",
  "computedStockEquivalentTotal",
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

/**
 * Recompute every derived value on one graph and dispatch the
 * write-backs in a single batch. Extracted so both triggers — a graph
 * mutation, and a material-type schema registration that can change
 * the consumption unit every material converts into — share one body.
 */
const recomputeGraph = (
  graphId: string,
  state: any,
  dispatch: (action: unknown) => void,
) => {
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

    // Target unit for usage math, read from the type's *latest* schema
    // rather than the version this material pins. The pinned version
    // governs the material's attribute data (provenance); the
    // consumption unit is a type-level preference about how usage is
    // reported, so setting it takes effect across the catalog at once
    // instead of requiring every row to be re-saved onto a new version.
    const materialType = state.Materials?.materialTypes?.[materialState.type];
    const schema = resolveTypeSchema(materialType, materialState.schemaVersion);

    const { cost, total, audit, stockEquivalentCost, stockEquivalentTotal } =
      computeMaterialCost({
        materialNodeId: materialNode.id,
        graphState,
        materialState,
        conversionGraphState,
        consumptionUnit: schema?.consumptionUnit,
      });

    materialUpdates.push({
      nodeId: materialNode.id,
      changes: {
        computedCost: cost,
        computedTotal: total,
        computedStockEquivalentCost: stockEquivalentCost,
        computedStockEquivalentTotal: stockEquivalentTotal,
        costAudit: audit,
      },
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

  // Third bulk loop: recompute every LOGO node's cost (summed across its
  // placements) on any non-conversion graph action. Cost recompute on logo
  // edits, elective toggles, and graduation/quantity changes all come for
  // free this way — exactly like materials/processes.
  const logoNodes = Object.values(graphState.nodes ?? {}).filter(
    (n): n is LogoNode => (n as any).type === "LOGO"
  );
  const logoUpdates: Array<{ nodeId: string; changes: object }> = [];
  for (const logoNode of logoNodes) {
    const { cost, total, audit } = computeLogoCost({
      logoNodeId: logoNode.id,
      graphState,
      conversionGraphState,
    });
    logoUpdates.push({
      nodeId: logoNode.id,
      changes: { computedCost: cost, computedTotal: total, costAudit: audit },
    });
  }

  // Dispatch all write-backs in a single React batch — one render commit instead of three.
  batch(() => {
    for (const { nodeId, changes } of materialUpdates) {
      dispatch(updateNode({ graphId, nodeId, changes }));
    }
    for (const { nodeId, changes } of processUpdates) {
      dispatch(updateNode({ graphId, nodeId, changes }));
    }
    for (const { nodeId, changes } of graduationUpdates) {
      dispatch(updateNode({ graphId, nodeId, changes }));
    }
    for (const { nodeId, changes } of logoUpdates) {
      dispatch(updateNode({ graphId, nodeId, changes }));
    }
  });
};

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

    recomputeGraph(graphId, listenerApi.getState(), listenerApi.dispatch);
  },
});

// A new material-type schema version can change `consumptionUnit` —
// the unit every CONSUMES edge is converted into. That action carries
// no `graphId`, and nothing else about the loaded graphs changes, so
// without this the stale per-unit figures would sit there until the
// next node/edge edit or model reopen.
computationMiddlewares.startListening({
  actionCreator: materialTypeVersionRegistered,
  effect: async (_action, listenerApi) => {
    listenerApi.cancelActiveListeners();
    await listenerApi.delay(DEBOUNCE_MS);

    const state = listenerApi.getState() as any;
    for (const graphId of Object.keys(state.Graph?.graphs ?? {})) {
      if (graphId === CONVERSION_GRAPH_NAME) continue;
      recomputeGraph(graphId, state, listenerApi.dispatch);
    }
  },
});

export default computationMiddlewares;
