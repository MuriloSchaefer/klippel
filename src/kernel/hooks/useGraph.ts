import Edge from "@kernel/modules/GraphsManager/interfaces/Edge";
import Node from "@kernel/modules/GraphsManager/interfaces/Node";
import { GraphState } from "@kernel/modules/GraphsManager/store/state";
import { useAppDispatch, useAppSelector } from "@kernel/store/hooks";

import {
  addNode,
  removeNode,
  updateNode,
  addEdge,
  removeEdge,
} from "@kernel/modules/GraphsManager/store/graphsManagerSlice";

export interface Graph<T = GraphState> {
  id: string;
  instance: T;
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
const useGraph = <T = GraphState>(graphId: string): Graph<T> | undefined => {
  const dispatch = useAppDispatch();
  const graphsManager = useAppSelector((state) => state.graphsManager);

  if (!(graphId in graphsManager.graphs)) {
    return undefined;
  }

  return {
    id: graphId,
    instance: graphsManager.graphs[graphId],
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
