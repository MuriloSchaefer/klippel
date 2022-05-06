import Node from "@kernel/modules/GraphsManager/interfaces/Node";

export interface MannequinView extends Node {
  type: "MannequinView";
}
export interface MannequinLayer extends Node {
  type: "MannequinLayer";
  properties: MannequinProperties;
}

export interface MannequinProperties {
  skinColor: string;
}
