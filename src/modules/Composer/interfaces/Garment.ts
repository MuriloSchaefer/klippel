import Node from "@kernel/modules/GraphsManager/interfaces/Node";
import { PartProperties as MaterialProperties } from "./Part";

export interface GarmentProperties {
  details?: string;
}

export interface Garment extends Node {
  type: "Garment";
  properties: GarmentProperties;
  baseProperties: MaterialProperties;
}

export default Garment;
