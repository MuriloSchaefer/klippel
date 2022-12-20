import { Edge } from "@kernel/modules/Graphs/interfaces/Edge";
import { Node } from "@kernel/modules/Graphs/interfaces/Node";
import { GraphState } from "@kernel/modules/Graphs/store/state";

import {
  addNode,
  removeNode,
  updateNode,
  addEdge,
  removeEdge,
} from "@kernel/modules/Graphs/store/graphInstance/actions";
import { createSelector } from "reselect";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";

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
  graphSelector: (g: G | undefined) => R | undefined
): Graph<R> => {
  const storeModule = useModule<Store>("Store")
  const dispatch = storeModule.hooks.useAppDispatch()
  const useAppSelector = storeModule.hooks.useAppSelector

  const selector = createSelector(
    (state: any) => state.graphsManager.graphs[graphId],
    graphSelector
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
        dispatch(updateNode({ graphId, nodeId: node.id, changes: node }));
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
