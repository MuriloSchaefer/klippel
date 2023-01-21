import Node from "@kernel/modules/Graphs/interfaces/Node";
import { Properties } from "./Material";

export interface Garment extends Node {
  type: "Garment";
  properties: Properties;
  baseProperties: Properties;
}

export default Garment;
