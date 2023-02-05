import { Node } from "../interfaces/Node";
import { Edge, EdgeId } from "../interfaces/Edge";

export interface NodeConnections {
  inputs: EdgeId[];
  outputs: EdgeId[];
}
export interface AdjacencyList {
  [id: string]: NodeConnections;
}

export interface EdgesHashMap {
  [id: string]: Edge;
}

export interface NodesHashMap<NT = Node> {
  [id: string]: NT;
}
export interface GraphState<NT = Node> {
  id: GraphId;
  nodes: NodesHashMap<NT>;
  edges: EdgesHashMap;
  adjacencyList: AdjacencyList;
}
export type GraphId = string;
export interface GraphsManagerState {
  graphs: { [graphId: string]: GraphState };
}

export const newGraphState: Pick<
  GraphState,
  "nodes" | "edges" | "adjacencyList"
> = {
  nodes: {},
  edges: {},
  adjacencyList: {},
};

export const graphsManagerInitialState: GraphsManagerState = {
  graphs: {},
};
