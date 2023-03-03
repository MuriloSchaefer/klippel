import { Edge } from "@kernel/modules/Graphs/interfaces/Edge";
import { Node } from "@kernel/modules/Graphs/interfaces/Node";
import {
  GraphSearch,
  GraphsManagerState,
  GraphState,
} from "@kernel/modules/Graphs/store/state";

import {
  addNode,
  removeNode,
  updateNode,
  addEdge,
  removeEdge,
  search,
} from "@kernel/modules/Graphs/store/graphInstance/actions";
import { createSelector } from "reselect";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import _ from "lodash";

export interface EdgeMap {
  inputs: { [name: string]: Edge };
  outputs: { [name: string]: Edge };
}

export interface GraphActions {
  addNode(node: Node, edges?: EdgeMap): void;
  removeNode(id: string): void;
  updateNode(node: any): void; // QUESTION: how to set the type here
  addEdge(edge: Edge): void;
  removeEdge(id: string): void;

  search(
    strategy: "bfs" | "dfs",
    nodeStart: string,
    validate: (node: Node,graph: GraphSearch, currFindings: Node[], visitedNodes: Node[]) => boolean,
    stopCriteria: (node: Node, graph: GraphSearch, currFindings: Node[], visitedNodes: Node[]) => boolean,
    depth?: number,
    label?: string
  ): string;
}
export interface Graph<T = GraphState> {
  id: string;
  state: T | undefined;
  actions: GraphActions;
}

export const DEFAULT_EDGES: EdgeMap = { inputs: {}, outputs: {} };

/**
 * Retrieves an existing graph.
 * @param id The graph id.
 * @returns {Graph | undefined} The graph object. Returns undefined if the graph does not exist.
 */
const useGraph = <G = GraphState, R = G>(
  graphId: string,
  graphSelector: (g: GraphState<any> | undefined) => R | undefined
): Graph<R> => {
  const storeModule = useModule<Store>("Store");
  const dispatch = storeModule.hooks.useAppDispatch();
  const useAppSelector = storeModule.hooks.useAppSelector;

  const selector = createSelector(
    (state: { Graph: GraphsManagerState } | undefined) =>
      state && state.Graph && state.Graph.graphs[graphId],
    graphSelector
  );
  const graphState = useAppSelector<R | undefined>(selector);

  return {
    id: graphId,
    state: graphState,
    actions: {
      addNode: (node, edges) => {
        dispatch(addNode({ graphId, node, edges: edges ?? DEFAULT_EDGES }));
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

      search: (strategy, nodeStart, validate, stopCriteria, depth, label) => {
        const resultPath = _.uniqueId("search");
        dispatch(
          search({
            graphId,
            id: resultPath,
            strategy,
            nodeStart,
            validate,
            stopCriteria,
            depth,
            label: label ?? resultPath,
          })
        );

        return resultPath;
      },

      // compareNodes: (nodeA: string, nodeB: string, attribute?: string) => {

      // }
    },
  };
};

export default useGraph;
