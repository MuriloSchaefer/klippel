import Node from "@kernel/modules/GraphsManager/interfaces/Node";
import { Properties } from "./Material";

export interface Garment extends Node {
  type: "Garment";
  properties: Properties;
  baseProperties: Properties;
}

export default Garment;
