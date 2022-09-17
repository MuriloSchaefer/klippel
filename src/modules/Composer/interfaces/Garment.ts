import Node from "@kernel/modules/GraphsManager/interfaces/Node";
import { Properties } from "./Material";

export interface GarmentProperties {
  details?: string;
}

export interface Garment extends Node {
  type: "Garment";
  properties: GarmentProperties;
  baseProperties: Properties;
}

export default Garment;
