/**
 * Keep the catalog's relation graph in the **Graph module's** store.
 *
 * Materials owns the catalog data; graphs are owned by the module built for
 * them. So the edge set that used to live in a `Materials.graph` slice is now
 * a graph instance (`CATALOG_GRAPH_ID`) maintained through the Graph module's
 * own command — one `loadGraph` per catalog answer, computed by the pure
 * merge rules in `catalogGraph.ts`.
 *
 * `loadGraph` rather than per-edge `addEdge` / `removeEdge`: a page carries
 * ~3 edges per row, so a hundred-row page would otherwise be 300 dispatches
 * and 300 store notifications for one answer.
 */
import { createListenerMiddleware } from "@reduxjs/toolkit";

import { loadGraph } from "@kernel/modules/Graphs/store/graphInstance/actions";
import { getGraphState } from "@kernel/modules/Graphs/store/graphsManager/selectors";
import type { GraphState, GraphsManagerState } from "@kernel/modules/Graphs/store/state";
import { workspaceSelected } from "@kernel/modules/Store/actions";

import {
  materialDeleted,
  materialsCatalogDeltaLoaded,
  materialsCatalogLoaded,
  materialsEvicted,
  materialsWindowLoaded,
} from "../materials/actions";
import {
  applyCatalogGraph,
  catalogSnapshotGraph,
  catalogWindowGraph,
  CATALOG_GRAPH_ID,
  emptyCatalogGraph,
  pruneCatalogGraph,
} from "./catalogGraph";

const middlewares = createListenerMiddleware();

const currentGraph = (getState: () => unknown): GraphState | undefined =>
  getGraphState(CATALOG_GRAPH_ID)(
    getState() as { Graph: GraphsManagerState },
  ) as GraphState | undefined;

/** Publish, unless the merge produced the graph we already had. */
const publish = (
  dispatch: (action: unknown) => unknown,
  previous: GraphState | undefined,
  next: GraphState | undefined,
) => {
  if (!next || next === previous) return;
  dispatch(loadGraph({ graphId: CATALOG_GRAPH_ID, graph: next }));
};

middlewares.startListening({
  actionCreator: materialsCatalogLoaded,
  effect: async ({ payload }, { dispatch, getState }) => {
    publish(dispatch, currentGraph(getState), catalogSnapshotGraph(payload));
  },
});

middlewares.startListening({
  actionCreator: materialsWindowLoaded,
  effect: async ({ payload }, { dispatch, getState }) => {
    const previous = currentGraph(getState);
    publish(dispatch, previous, catalogWindowGraph(previous, payload));
  },
});

middlewares.startListening({
  actionCreator: materialsCatalogDeltaLoaded,
  effect: async ({ payload }, { dispatch, getState }) => {
    const previous = currentGraph(getState);
    if (payload.full) {
      publish(dispatch, previous, catalogSnapshotGraph(payload.full));
      return;
    }
    const next = applyCatalogGraph(
      previous,
      {
        materials: payload.materials,
        edges: payload.edges,
        materialTypes: payload.materialTypes,
        industries: payload.industries,
        sellers: payload.sellers,
      },
      { removedEdges: payload.removedEdges },
    );
    const pruned = pruneCatalogGraph(next, payload.removedMaterials ?? []);
    publish(dispatch, previous, pruned);
  },
});

// The graph mirrors the mirror: a reclaimed or deleted material takes its
// relations with it. Without this the graph would be the one structure that
// still grew with everything the user scrolled past.
middlewares.startListening({
  actionCreator: materialsEvicted,
  effect: async ({ payload }, { dispatch, getState }) => {
    const previous = currentGraph(getState);
    publish(dispatch, previous, pruneCatalogGraph(previous, payload.ids));
  },
});

middlewares.startListening({
  actionCreator: materialDeleted,
  effect: async ({ payload }, { dispatch, getState }) => {
    const previous = currentGraph(getState);
    publish(dispatch, previous, pruneCatalogGraph(previous, [payload.id]));
  },
});

// A workspace switch invalidates every vertex. The window read that follows
// will refill it, but between the two the graph must not describe the
// workspace the user just left.
middlewares.startListening({
  actionCreator: workspaceSelected,
  effect: async (_action, { dispatch }) => {
    dispatch(loadGraph({ graphId: CATALOG_GRAPH_ID, graph: emptyCatalogGraph() }));
  },
});

export default middlewares;
