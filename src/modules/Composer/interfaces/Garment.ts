import Node from "@kernel/modules/GraphsManager/interfaces/Node";

export interface GarmentProperties {
  details?: string;
}

export interface Garment extends Node {
  type: "Garment";
  properties: GarmentProperties;
}

export default Garment;
