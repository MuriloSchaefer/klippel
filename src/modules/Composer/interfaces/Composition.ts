import Edge from "@kernel/modules/GraphsManager/interfaces/Edge";
import Node from "@kernel/modules/GraphsManager/interfaces/Node";

export interface CompositionProperties {
  details?: string;
}

export interface Composition extends Node {
  type: "Composition";
  properties: CompositionProperties;
  outputs: {
    [key: string]: Edge;
  };
}

export default Composition;
