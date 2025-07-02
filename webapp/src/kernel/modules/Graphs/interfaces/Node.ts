import { Edge } from "./Edge";

export type NodeId = string;
export type Node = {
  id: NodeId;
  type: string;
  label?: string;
  position: {
    x: number;
    y: number;
  }
}

export default Node;
