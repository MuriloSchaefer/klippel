import Node from "@kernel/modules/GraphsManager/interfaces/Node";

export interface Part extends Node {
  type: "Part";
  properties: PartProperties;
}
export interface PartsLayer extends Node {
  type: "PartsLayer";
  baseProperties: PartProperties;
}

export interface PartProperties {
  color: string;
  material?: string;
}

export default Part;
