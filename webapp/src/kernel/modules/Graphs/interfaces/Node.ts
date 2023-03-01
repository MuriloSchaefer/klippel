import { Edge } from "./Edge";

export type NodeId = string;
export interface Node {
  id: NodeId;
  type: string;
}

export default Node;
