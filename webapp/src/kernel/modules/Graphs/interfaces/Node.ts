import { Edge } from "./Edge";

export type NodeId = string;
export interface Node {
  id: NodeId;
  type: string;
  position: {
    x: number;
    y: number;
  }
}

export default Node;
