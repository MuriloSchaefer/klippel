import Edge from "./Edge";

interface Node {
  id: string;
  inputs: { [nodeId: string]: Edge };

  outputs: { [nodeId: string]: Edge };
}

export default Node;
