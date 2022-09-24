import { Node } from "@kernel/modules/GraphsModule/interfaces/Node";
import { Properties } from "./Material";

export interface Composition extends Node {
  type: "Composition";
  properties: Properties;
}

export default Composition;
