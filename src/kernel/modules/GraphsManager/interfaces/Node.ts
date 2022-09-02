import Edge from "./Edge";

export type NodeId = string;
export interface Node {
  id: NodeId;
  inputs: { [nodeId: string]: Edge };

  outputs: { [nodeId: string]: Edge };
}

export default Node;
