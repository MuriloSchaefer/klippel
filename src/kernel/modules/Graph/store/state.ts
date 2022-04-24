import Node from "../interfaces/Node";
import Edge from "../interfaces/Edge";

interface GraphState {
  nodes: { [id: string]: Node };
  edges: { [id: string]: Edge };
  adjacencyList: { [id: string]: { inputs: string[]; outputs: string[] } };
}

export default GraphState;
