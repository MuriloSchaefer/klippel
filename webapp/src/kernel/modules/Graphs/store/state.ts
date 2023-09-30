import { Node } from "../interfaces/Node";
import { Edge, EdgeId } from "../interfaces/Edge";

export interface NodeConnections {
  inputs: EdgeId[];
  outputs: EdgeId[];
}
export interface AdjacencyList {
  [id: string]: NodeConnections;
}

export interface EdgesHashMap<ET=Edge> {
  [id: string]: ET;
}

export interface NodesHashMap<NT = Node> {
  [id: string]: NT;
}

export interface SearchResult<N=Node> {
    outdated: boolean
    findings: N[]
    visited: N[]
}
export interface SearchResults {
  [name: string]: SearchResult
}
export interface GraphState<NT = Node, ET = Edge> {
  id: GraphId;
  nodes: NodesHashMap<NT>;
  edges: EdgesHashMap<ET>;
  adjacencyList: AdjacencyList;
  searchResults: SearchResults
}
export type GraphSearch = Omit<GraphState, "searchResults">
export type GraphId = string;
export interface GraphsManagerState {
  graphs: { [graphId: string]: GraphState };
}

export const newGraphState: Pick<
  GraphState,
  "nodes" | "edges" | "adjacencyList" | 'searchResults'
> = {
  nodes: {},
  edges: {},
  adjacencyList: {},
  searchResults: {}
};

export const graphsManagerInitialState: GraphsManagerState = {
  graphs: {},
};
