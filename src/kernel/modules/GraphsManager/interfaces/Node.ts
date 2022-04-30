import Edge from "./Edge";

interface Node {
  id: string;
  type: string;
  inputs: { [nodeId: string]: Edge };

  outputs: { [nodeId: string]: Edge };
}

export default Node;
