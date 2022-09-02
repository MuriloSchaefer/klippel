import { Node } from "@kernel/modules/GraphsManager/interfaces/Node";

export interface CompositionProperties {
  details?: string;
}

export interface Composition extends Node {
  type: "Composition";
  properties: CompositionProperties;
}

export default Composition;
