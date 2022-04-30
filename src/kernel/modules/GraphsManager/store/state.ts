import Node from "../interfaces/Node";
import Edge from "../interfaces/Edge";

export interface GraphState {
  nodes: { [id: string]: Node };
  edges: { [id: string]: Edge };
  adjacencyList: { [id: string]: { inputs: string[]; outputs: string[] } };
}
export interface GraphsManagerState {
  graphs: { [graphId: string]: GraphState };
}

export const newGraphState: GraphState = {
  nodes: {},
  edges: {},
  adjacencyList: {},
};

export const graphsManagerInitialState: GraphsManagerState = {
  graphs: {},
};
