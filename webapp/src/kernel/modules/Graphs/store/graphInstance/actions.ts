import { ACTION_TYPES } from "@kernel/contants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import Edge from "../../interfaces/Edge";
import Node from "../../interfaces/Node";
import { GraphState, SearchResult, GraphSearch } from "../state";

export interface SearchPayload {
  graphId: string;
  id: string;
  strategy: "bfs" | "dfs";
  nodeStart: string;
  validate: (node: Node, graph: GraphSearch, currFindings: Node[], visitedNodes: Node[]) => boolean;
  stopCriteria: (node: Node, graph: GraphSearch, currFindings: Node[], visitedNodes: Node[]) => boolean;
  label: string;
  depth?: number | undefined;
}

// Events
export const graphLoaded = createAction<{ graphId: string; graph: GraphState }>(
  `[${MODULE_NAME}:Instance:${ACTION_TYPES.EVENT}] Graph loaded`
);
export const nodeAdded = createAction<{
  graphId: string;
  node: Node;
  edges: {
    inputs: { [name: string]: Edge };
    outputs: { [name: string]: Edge };
  };
}>(`[${MODULE_NAME}:Instance:${ACTION_TYPES.EVENT}] Node added`);
export const nodeRemoved = createAction<{ graphId: string; nodeId: string }>(
  `[${MODULE_NAME}:Instance:${ACTION_TYPES.EVENT}] Node removed`
);
export const nodeUpdated = createAction<{
  graphId: string;
  nodeId: string;
  changes: Partial<Node>;
}>(`[${MODULE_NAME}:Instance:${ACTION_TYPES.EVENT}] Node updated`);

export const edgeAdded = createAction<{ graphId: string; edge: Edge }>(
  `[${MODULE_NAME}:Instance:${ACTION_TYPES.EVENT}] Edge added`
);
export const edgeRemoved = createAction<{ graphId: string; edgeId: string }>(
  `[${MODULE_NAME}:Instance:${ACTION_TYPES.EVENT}] Edge removed`
);

export const searchFinished = createAction<{
  graphId: string;
  searchId: string;
  results: SearchResult
}>(`[${MODULE_NAME}:Instance:${ACTION_TYPES.EVENT}] Search finished`);

export const searchInvalidated = createAction<{
  graphId: string;
  searchId: string;
}>(`[${MODULE_NAME}:Instance:${ACTION_TYPES.EVENT}] Search invalidated`);

// Commands
export const loadGraph = createAction<{ graphId: string; graph: GraphState }>(
  `[${MODULE_NAME}:Instance:${ACTION_TYPES.COMMAND}] Load Graph`
);

export const resetGraph = createAction<{ graphId: string }>(
  `[${MODULE_NAME}:Instance:${ACTION_TYPES.COMMAND}] Reset Graph`
);
export const addNode = createAction<{
  graphId: string;
  node: Node;
  edges: {
    inputs: { [name: string]: Edge };
    outputs: { [name: string]: Edge };
  };
}>(`[${MODULE_NAME}:Instance:${ACTION_TYPES.COMMAND}] Add node`);
export const removeNode = createAction<{ graphId: string; nodeId: string }>(
  `[${MODULE_NAME}:Instance:${ACTION_TYPES.COMMAND}] Remove node`
);
export const updateNode = createAction<{
  graphId: string;
  nodeId: string;
  changes: any;
}>(`[${MODULE_NAME}:Instance:${ACTION_TYPES.COMMAND}] Update node`);

export const addEdge = createAction<{ graphId: string; edge: Edge }>(
  `[${MODULE_NAME}:Instance:${ACTION_TYPES.COMMAND}] Add edge`
);
export const removeEdge = createAction<{ graphId: string; edgeId: string }>(
  `[${MODULE_NAME}:Instance:${ACTION_TYPES.COMMAND}] Remove edge`
);

export const search = createAction<SearchPayload>(`[${MODULE_NAME}:Instance:${ACTION_TYPES.COMMAND}] Search`);
export const invalidateSearch = createAction<{
  graphId: string;
  searchId: string;
}>(`[${MODULE_NAME}:Instance:${ACTION_TYPES.COMMAND}] Invalidate Search`);
