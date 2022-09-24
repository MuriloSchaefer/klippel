import { Edge } from "@kernel/modules/GraphsModule/interfaces/Edge";
import { Node } from "@kernel/modules/GraphsModule/interfaces/Node";
import { GraphState } from "@kernel/modules/GraphsModule/store/state";
import { useAppDispatch, useAppSelector } from "@kernel/store/hooks";

import {
  addNode,
  removeNode,
  updateNode,
  addEdge,
  removeEdge,
} from "@kernel/modules/GraphsModule/store/graphsManagerSlice";
import { createSelector } from "reselect";

export interface Graph<T = GraphState> {
  id: string;
  state: T | undefined;
  actions: {
    addNode(node: Node): void;
    removeNode(id: string): void;
    updateNode(node: Node): void;
    addEdge(edge: Edge): void;
    removeEdge(id: string): void;
  };
}

/**
 * Retrieves an existing graph.
 * @param id The graph id.
 * @returns {Graph | undefined} The graph object. Returns undefined if the graph does not exist.
 */
const useGraph = <G = GraphState, R = G>(
  graphId: string,
  graphSelector: (g: G) => R
): Graph<R> => {
  const dispatch = useAppDispatch();

  const selector = createSelector(
    (state: any) => state.graphsManager.graphs[graphId],
    (g) => (g ? graphSelector(g) : undefined)
  );
  const graphState = useAppSelector<R | undefined>(selector);

  return {
    id: graphId,
    state: graphState,
    actions: {
      addNode: (node) => {
        dispatch(addNode({ graphId, node }));
      },
      removeNode: (id) => {
        dispatch(removeNode({ graphId, nodeId: id }));
      },
      updateNode: (node) => {
        dispatch(updateNode({ graphId, node }));
      },
      addEdge: (edge) => {
        dispatch(addEdge({ graphId, edge }));
      },
      removeEdge: (id) => {
        dispatch(removeEdge({ graphId, edgeId: id }));
      },
    },
  };
};

export default useGraph;
