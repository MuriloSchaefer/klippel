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
  addNode(node: Omit<Node, "position">, edges?: EdgeMap): void;
  removeNode(id: string): void;
  updateNode(node: any): void; // QUESTION: how to set the type here
  addEdge(edge: Edge): void;
  updateEdge(edgeId: string, changes: Partial<Edge>):void;
  removeEdge(id: string): void;
  nodeExists(id: string): boolean;

  search(
    strategy: "bfs" | "dfs",
    nodeStart: string,
    validate: (
      node: Node,
      graph: GraphSearch,
      currFindings: Node[],
      visitedNodes: Node[]
    ) => boolean,
    stopCriteria: (
      node: Node,
      graph: GraphSearch,
      currFindings: Node[],
      visitedNodes: Node[]
    ) => boolean,
    depth?: number,
    label?: string,
    id?: string,
  ): string;
}
export interface Graph<T = GraphState, A = GraphActions> {
  id: string;
  state: T | undefined;
  actions: A;
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
      state?.Graph && state.Graph.graphs[graphId],
    graphSelector
  );
  const graphState = useAppSelector<R | undefined>(selector);

  const innerState = useAppSelector(
    (state: { Graph: GraphsManagerState } | undefined) =>
      state?.Graph && state.Graph.graphs[graphId]
  );
  return {
    id: graphId,
    state: graphState,
    actions: {
      addNode: (node, edges) => {
        const positionedNode: Node = { ...node, position: { x: 0, y: 0 } };
        dispatch(
          addNode({
            graphId,
            node: positionedNode,
            edges: edges ?? DEFAULT_EDGES,
          })
        );
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
      updateEdge: (edgeId, changes) => {
        const currentEdge = innerState?.edges[edgeId]
        if (currentEdge){
          dispatch(removeEdge({ graphId, edgeId: edgeId }));
          const updatedEdge = {...currentEdge, ...changes}
          dispatch(addEdge({ graphId,  edge: updatedEdge}));
        }
      },
      removeEdge: (id) => {
        dispatch(removeEdge({ graphId, edgeId: id }));
      },
      nodeExists: (nodeId) =>
        innerState ? nodeId in innerState.nodes : false,

      search: (strategy, nodeStart, validate, stopCriteria, depth, label, id) => {
        const resultPath = id ?? _.uniqueId("search");
        dispatch(
          search({
            id: resultPath,
            graphId,
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
